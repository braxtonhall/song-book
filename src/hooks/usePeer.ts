import { useState, useEffect, useCallback, useRef } from "react";
import { Peer, DataConnection } from "peerjs";
import { WireMessage } from "../partyTypes";

const STORAGE_PEER_ID = "song-book:peer-id";
const STORAGE_PEERS = "song-book:peers";

let futurePeer: Promise<Peer> | null = null;
const connections = new Map<string, DataConnection>();
// TODO these should be a set of listeners
let onMessageRef: ((from: string, message: WireMessage) => void) | null = null;
let onConnectRef: ((peerId: string) => void) | null = null;
let partyIdRef: string | null = null;

type Listener = () => void;
const stateListeners = new Set<Listener>();

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

function setupDataConnection(conn: DataConnection) {
	const remoteId = conn.peer;

	conn.on("open", () => {
		connections.set(remoteId, conn);
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
		onMessageRef(remoteId, message);
	});

	conn.on("close", () => {
		connections.delete(remoteId);
		persistConnectedPeers();
		notifyConnectedPeersChange();
	});

	conn.on("error", (err) => {
		console.warn(`Connection error with ${remoteId}:`, err.message);
		connections.delete(remoteId);
		persistConnectedPeers();
		notifyConnectedPeersChange();
	});
}

type UsePeerProps = {
	partyId: string | null;
	onMessage: (from: string, message: WireMessage) => void;
	onConnect: (peerId: string) => void;
};

export function usePeer({ partyId, onMessage, onConnect }: UsePeerProps) {
	const [peerId, setPeerId] = useState<string | null>(null);
	const [connectedPeers, setConnectedPeers] = useState<string[]>(() => Array.from(connections.keys()));

	const onMessageSavedRef = useRef(onMessage);
	onMessageSavedRef.current = onMessage;
	onMessageRef = onMessage;
	onConnectRef = onConnect;
	partyIdRef = partyId;

	const initPeer = useCallback(() => {
		if (futurePeer) {
			return;
		}
		futurePeer = new Promise((resolve) => {
			const storedId = sessionStorage.getItem(STORAGE_PEER_ID);
			const peer = storedId ? new Peer(storedId) : new Peer();

			peer.on("open", (id) => {
				resolve(peer);
				sessionStorage.setItem(STORAGE_PEER_ID, id);
				setPeerId(id);

				const savedPeers = sessionStorage.getItem(STORAGE_PEERS);
				if (savedPeers) {
					try {
						const peerIds: string[] = JSON.parse(savedPeers);
						peerIds.forEach((remoteId) => {
							if (remoteId !== id && !connections.has(remoteId)) {
								const conn = peer!.connect(remoteId, { reliable: true });
								setupDataConnection(conn);

								// TODO if re-connecting, we don't get the history
							}
						});
					} catch {
						/* corrupted data — ignore */
					}
				}
			});

			peer.on("connection", (conn) => {
				setupDataConnection(conn);
			});

			peer.on("error", (err) => {
				console.warn("PeerJS error:", err.message);
			});

			peer.on("disconnected", () => {
				if (!peer?.destroyed) {
					peer?.reconnect();
				}
			});
		});
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
			const conn = peer.connect(remotePeerId, {
				reliable: true,
			});
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
		connections.forEach((conn) => conn.close());
		connections.clear();
		sessionStorage.removeItem(STORAGE_PEERS);
		sessionStorage.removeItem(STORAGE_PEER_ID);
		if (futurePeer) {
			futurePeer.then((peer) => peer.destroy());
		}
		futurePeer = null;
		initPeer();
		setPeerId(null);
		notifyConnectedPeersChange();
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
