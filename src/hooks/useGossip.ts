import { useCallback } from 'react';
import { GossipMessage, WireMessage } from '../partyTypes';

const seenMessageIds = new Set<string>();

function applyLocally(
	gossipMessage: GossipMessage,
	connect: (peerId: string) => void,
	peerId: string | null,
): boolean {
	switch (gossipMessage.type) {
		case 'JOIN': {
			const { peerId: newPeerId } = gossipMessage.payload;
			if (newPeerId !== peerId) {
				connect(newPeerId);
			}
			return true;
		}
		case 'PEER_LIST': {
			const { peers } = gossipMessage.payload;
			for (const id of peers) {
				if (id !== peerId) {
					connect(id);
				}
			}
			return false;
		}
		default:
			return !(gossipMessage satisfies never);
	}
}

export function useGossip(
	send: (peerId: string, message: WireMessage) => void,
	connect: (peerId: string) => void,
	getPeerIds: () => string[],
	peerId: string | null,
) {
	const broadcast = useCallback((gossipMessage: GossipMessage) => {
		seenMessageIds.add(gossipMessage.id);
		const wire: WireMessage = { type: 'GOSSIP', message: gossipMessage };
		for (const id of getPeerIds()) {
			send(id, wire);
		}
	}, [send, getPeerIds]);

	const receive = useCallback((gossipMessage: GossipMessage, senderId: string) => {
		if (seenMessageIds.has(gossipMessage.id)) return;
		seenMessageIds.add(gossipMessage.id);

		const shouldRebroadcast = applyLocally(
			gossipMessage,
			connect,
			peerId,
		);

		if (shouldRebroadcast) {
			const wire: WireMessage = { type: 'GOSSIP', message: gossipMessage };
			for (const id of getPeerIds()) {
				if (id !== senderId) {
					send(id, wire);
				}
			}
		}
	}, [send, connect, getPeerIds, peerId]);

	return { broadcast, receive };
}
