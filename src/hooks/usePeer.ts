import { useState, useEffect, useCallback, useRef } from 'react';
import { Peer, DataConnection } from 'peerjs';
import { WireMessage } from '../partyTypes';

const STORAGE_PEER_ID = 'song-book:peer-id';
const STORAGE_PEERS = 'song-book:peers';

let futurePeer: Promise<Peer> | null = null;
const connections = new Map<string, DataConnection>();
let onMessageRef: ((from: string, message: WireMessage) => void) | null = null;

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

function setupDataConnection(conn: DataConnection) {
	const remoteId = conn.peer;

	conn.on('open', () => {
		connections.set(remoteId, conn);
		persistConnectedPeers();
		notifyConnectedPeersChange();
	});

	conn.on('data', (raw: unknown) => {
		if (!onMessageRef) return;
		let message: WireMessage;
		try {
			message = typeof raw === 'string' ? JSON.parse(raw) : (raw as WireMessage);
		} catch {
			return;
		}
		onMessageRef(remoteId, message);
	});

	conn.on('close', () => {
		connections.delete(remoteId);
		persistConnectedPeers();
		notifyConnectedPeersChange();
	});

	conn.on('error', (err) => {
		console.warn(`Connection error with ${remoteId}:`, err.message);
		connections.delete(remoteId);
		persistConnectedPeers();
		notifyConnectedPeersChange();
	});
}

export function usePeer(onMessage?: (from: string, message: WireMessage) => void) {
	const [peerId, setPeerId] = useState<string | null>(null);
	const [connectedPeers, setConnectedPeers] = useState<string[]>(() =>
		Array.from(connections.keys())
	);

	const onMessageSavedRef = useRef(onMessage);
	onMessageSavedRef.current = onMessage;
	onMessageRef = onMessage ?? null;

	useEffect(() => {
		if (futurePeer) {
			return;
		}
		futurePeer = new Promise((resolve) => {
			const storedId = sessionStorage.getItem(STORAGE_PEER_ID);
			const peer = storedId ? new Peer(storedId) : new Peer();

			peer.on('open', (id) => {
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
							}
						});
					} catch { /* corrupted data — ignore */ }
				}
			});

			peer.on('connection', (conn) => {
				setupDataConnection(conn);
			});

			peer.on('error', (err) => {
				console.warn('PeerJS error:', err.message);
			});

			peer.on('disconnected', () => {
				if (!peer?.destroyed) {
					peer?.reconnect();
				}
			});
		});

	}, []);

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
		})

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
		notifyConnectedPeersChange();
	}, []);

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
