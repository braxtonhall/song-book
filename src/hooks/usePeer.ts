import { useState, useEffect, useCallback } from "react";
import { Peer, DataConnection } from "peerjs";
import { WireMessage } from "../partyTypes";

const STORAGE_PEER_ID = "song-book:peer-id";
const STORAGE_PEERS = "song-book:peers";
const RECONNECT_DELAY_MS = 5000;

// ── Module-level singleton state ─────────────────────────────────────────────
let futurePeer: Promise<Peer> | null = null;
const connections = new Map<string, DataConnection>();
const stateListeners = new Set<() => void>();

let onMessageRef: ((from: string, message: WireMessage) => void) | null = null;
let onConnectRef: ((peerId: string) => void) | null = null;
let onRejoinFailedRef: (() => void) | null = null;
let partyIdRef: string | null = null;
let retryTimer: ReturnType<typeof setTimeout> | null = null;

function clearReconnectTimer() {
	if (retryTimer) {
		clearTimeout(retryTimer);
		retryTimer = null;
	}
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function persistConnectedPeers() {
	const peerIds = Array.from(connections.keys());
	if (peerIds.length > 0) {
		sessionStorage.setItem(STORAGE_PEERS, JSON.stringify(peerIds));
	} else {
		sessionStorage.removeItem(STORAGE_PEERS);
	}
}

function notifyConnectedPeersChange() {
	stateListeners.forEach((fn) => fn());
}

function removeConnection(remoteId: string) {
	connections.delete(remoteId);
	persistConnectedPeers();
	notifyConnectedPeersChange();
}

function sendPeerList(conn: DataConnection, remoteId: string) {
	if (!partyIdRef) return;
	const peers = Array.from(connections.keys()).filter((id) => id !== remoteId);
	conn.send(
		JSON.stringify({
			type: "GOSSIP",
			partyId: partyIdRef,
			message: {
				id: crypto.randomUUID(),
				type: "PEER_LIST",
				payload: { peers },
			},
		}),
	);
}

function connectToStoredPeers(peer: Peer): number {
	const savedPeers = sessionStorage.getItem(STORAGE_PEERS);
	if (!savedPeers) return 0;
	try {
		const peerIds: string[] = JSON.parse(savedPeers);
		let attempted = 0;
		for (const remoteId of peerIds) {
			if (remoteId !== peer.id && !connections.has(remoteId)) {
				const conn = peer.connect(remoteId, { reliable: true });
				setupDataConnection(conn);
				attempted++;
			}
		}
		return attempted;
	} catch {
		return 0;
	}
}

function setupDataConnection(conn: DataConnection) {
	const remoteId = conn.peer;

	conn.on("open", () => {
		persistConnectedPeers();
		notifyConnectedPeersChange();
		sendPeerList(conn, remoteId);
		onConnectRef?.(remoteId);
	});

	conn.on("data", (raw: unknown) => {
		if (!onMessageRef) return;
		let message: WireMessage;
		try {
			message = typeof raw === "string" ? JSON.parse(raw) : (raw as WireMessage);
		} catch {
			return;
		}
		if (message.partyId === partyIdRef) {
			connections.set(remoteId, conn);
			onMessageRef(remoteId, message);
		}
	});

	conn.on("close", () => removeConnection(remoteId));

	conn.on("error", (err) => {
		console.warn(`Connection error with ${remoteId}:`, err.message);
		removeConnection(remoteId);
	});
}

// ── Internal cleanup (no react state) ────────────────────────────────────────
function destroyPeer() {
	clearReconnectTimer();
	connections.forEach((conn) => conn.close());
	connections.clear();
	persistConnectedPeers();
	notifyConnectedPeersChange();
	sessionStorage.removeItem(STORAGE_PEER_ID);
	if (futurePeer) {
		futurePeer.then((peer) => peer.destroy()).catch(() => {});
	}
	futurePeer = null;
}

// ── Types ────────────────────────────────────────────────────────────────────
type UsePeerProps = {
	partyId: string | null;
	onMessage: (from: string, message: WireMessage) => void;
	onConnect: (peerId: string) => void;
	onRejoinFailed?: () => void;
};

export function usePeer({ partyId, onMessage, onConnect, onRejoinFailed }: UsePeerProps) {
	const [peerId, setPeerId] = useState<string | null>(null);
	const [connectedPeers, setConnectedPeers] = useState<string[]>(() => Array.from(connections.keys()));

	onMessageRef = onMessage;
	onConnectRef = onConnect;
	onRejoinFailedRef = onRejoinFailed ?? null;
	partyIdRef = partyId;

	const initPeer = useCallback(() => {
		if (futurePeer) return;

		const tryOpen = (useStoredId: boolean) => {
			const storedId = useStoredId ? sessionStorage.getItem(STORAGE_PEER_ID) : null;
			const peer = storedId ? new Peer(storedId) : new Peer();
			let opened = false;

			futurePeer = new Promise((resolve) => {
				peer.on("open", (id) => {
					if (opened) return;
					opened = true;
					resolve(peer);
					sessionStorage.setItem(STORAGE_PEER_ID, id);
					setPeerId(id);

					const attempted = connectToStoredPeers(peer);

					if (attempted > 0) {
						clearReconnectTimer();
						retryTimer = setTimeout(() => {
							if (connections.size > 0) return;
							// No stored peers connected — retry or give up
							peer.destroy();
							futurePeer = null;
							if (useStoredId) {
								tryOpen(false);
							} else {
								destroyPeer();
								setPeerId(null);
								onRejoinFailedRef?.();
							}
						}, RECONNECT_DELAY_MS);
					}
				});

				peer.on("connection", (conn) => {
					setupDataConnection(conn);
				});

				peer.on("error", (err) => {
					console.warn("PeerJS error:", err.message);
					if (!opened && useStoredId && storedId) {
						peer.destroy();
						futurePeer = null;
						tryOpen(false);
					}
				});

				peer.on("disconnected", () => {
					if (!peer.destroyed) {
						peer.reconnect();
					}
				});
			});
		};

		tryOpen(true);
	}, []);

	useEffect(initPeer, [initPeer]);

	useEffect(() => {
		const listener = () => {
			setConnectedPeers(Array.from(connections.keys()));
		};
		stateListeners.add(listener);
		listener();
		return () => {
			stateListeners.delete(listener);
		};
	}, []);

	const connect = useCallback((remotePeerId: string) => {
		if (!futurePeer) return;
		if (connections.has(remotePeerId)) return;
		futurePeer.then((peer) => {
			if (connections.has(remotePeerId)) return;
			const conn = peer.connect(remotePeerId, { reliable: true });
			setupDataConnection(conn);
		});
	}, []);

	const disconnect = useCallback((remotePeerId: string) => {
		const conn = connections.get(remotePeerId);
		if (conn) {
			conn.close();
		}
	}, []);

	const disconnectAll = useCallback(() => {
		destroyPeer();
		setPeerId(null);
		initPeer();
	}, [initPeer]);

	const send = useCallback((remotePeerId: string, message: WireMessage) => {
		const conn = connections.get(remotePeerId);
		if (!conn) return;
		conn.send(JSON.stringify(message));
	}, []);

	const getPeerIds = useCallback(() => Array.from(connections.keys()), []);

	return {
		peerId,
		connect,
		disconnect,
		disconnectAll,
		send,
		connectedPeers,
		getPeerIds,
	};
}
