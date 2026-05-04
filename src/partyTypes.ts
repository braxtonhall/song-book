import { Entry } from './types';

export type QueueEntry = {
	uuid: string;
	entry: Entry;
};

export type HistoryEntry = {
	entry: Entry;
	partyId: string | null;
	dismissedAt: string;
};

export type PeerStatus = 'active' | 'absent' | 'removed';

export type GossipMessage =
	| { id: string; type: 'JOIN'; payload: { peerId: string; partyId: string } }
	| { id: string; type: 'PEER_LIST'; payload: { peers: string[] } };

export type WireMessage =
	| { type: 'GOSSIP'; message: GossipMessage }
	| { type: 'PEER_LIST_REQUEST' }
	| { type: 'CRDT_SYNC'; update: string }
	| { type: 'CRDT_UPDATE'; update: string }
	| { type: 'PING' }
	| { type: 'PONG' }
	| { type: 'HISTORY_REQUEST'; partyId: string }
	| { type: 'HISTORY_RESPONSE'; entries: HistoryEntry[] };
