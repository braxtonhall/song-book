import { Entry } from "./types";

export type QueueEntry = {
	uuid: string;
	entry: Entry;
	peerId: string | null;
};

export type HistoryEntry = {
	uuid: string;
	entry: Entry;
	partyId: string | null;
	dismissedAt: string;
};

export type PeerStatus = "active" | "absent" | "removed";

export type GossipMessage = { id: string; type: "PEER_LIST"; payload: { peers: string[] } };

export type WireMessage =
	| { type: "GOSSIP"; partyId: string; message: GossipMessage }
	| { type: "PEER_LIST_REQUEST"; partyId: string }
	| { type: "CRDT_UPDATE"; partyId: string; update: string }
	| { type: "CRDT_SYNC_REQUEST"; partyId: string; state: string }
	| { type: "PING"; partyId: string }
	| { type: "PONG"; partyId: string }
	| { type: "HISTORY_REQUEST"; partyId: string }
	| { type: "HISTORY_RESPONSE"; partyId: string; entries: HistoryEntry[] };

export type Playlist = {
	id: string;
	name: string;
	entries: Entry[];
	createdAt: string;
};
