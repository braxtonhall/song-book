import { useCallback } from 'react';
import { GossipMessage, WireMessage } from '../partyTypes';

const seenMessageIds = new Set<string>();

function applyLocally(
	gossipMessage: GossipMessage,
	connect: (peerId: string) => void,
	peerId: string | null,
): boolean {
	if (gossipMessage.type === 'PEER_LIST') {
		const { peers } = gossipMessage.payload;
		for (const id of peers) {
			if (id !== peerId) {
				connect(id);
			}
		}
	}
	return false;
}

export function useGossip(
	send: (peerId: string, message: WireMessage) => void,
	connect: (peerId: string) => void,
	getPeerIds: () => string[],
	peerId: string | null,
	partyId: string | null,
) {
	const broadcast = useCallback((gossipMessage: GossipMessage) => {
		if (!partyId) return;
		seenMessageIds.add(gossipMessage.id);
		const wire: WireMessage = { type: 'GOSSIP', partyId, message: gossipMessage };
		for (const id of getPeerIds()) {
			send(id, wire);
		}
	}, [send, getPeerIds, partyId]);

	const receive = useCallback((gossipMessage: GossipMessage, senderId: string) => {
		if (seenMessageIds.has(gossipMessage.id)) return;
		seenMessageIds.add(gossipMessage.id);

		const shouldRebroadcast = applyLocally(
			gossipMessage,
			connect,
			peerId,
		);

		if (shouldRebroadcast && partyId) {
			const wire: WireMessage = { type: 'GOSSIP', partyId, message: gossipMessage };
			for (const id of getPeerIds()) {
				if (id !== senderId) {
					send(id, wire);
				}
			}
		}
	}, [send, connect, getPeerIds, peerId, partyId]);

	return { broadcast, receive };
}
