import { useEffect, useCallback } from "react";
import { WireMessage, PeerStatus } from "../partyTypes";

const PEER_MISS_THRESHOLD_ABSENT = 3;
const PEER_MISS_THRESHOLD_REMOVED = 6;
const PING_INTERVAL_MS = 30 * 1000;

const missCounts = new Map<string, number>();
const peerStatuses = new Map<string, PeerStatus>();
let pingTimer: ReturnType<typeof setInterval> | null = null;

export function usePeerLiveness(
	send: (peerId: string, message: WireMessage) => void,
	disconnect: (peerId: string) => void,
	getConnectedPeerIds: () => string[],
	partyId: string | null,
) {
	const runPingCycle = useCallback(() => {
		const peerIds = getConnectedPeerIds();

		for (const id of peerIds) {
			const misses = (missCounts.get(id) || 0) + 1;
			missCounts.set(id, misses);

			if (misses >= PEER_MISS_THRESHOLD_REMOVED) {
				peerStatuses.set(id, "removed");
				disconnect(id);
				missCounts.delete(id);
				peerStatuses.delete(id);
			} else if (misses >= PEER_MISS_THRESHOLD_ABSENT) {
				peerStatuses.set(id, "absent");
			} else {
				peerStatuses.set(id, "active");
			}
		}

		if (partyId) {
			for (const id of peerIds) {
				send(id, { type: "PING", partyId });
			}
		}

		const staleIds: string[] = [];
		for (const id of missCounts.keys()) {
			if (!peerIds.includes(id)) {
				staleIds.push(id);
			}
		}
		for (const id of peerStatuses.keys()) {
			if (!peerIds.includes(id) && !staleIds.includes(id)) {
				staleIds.push(id);
			}
		}
		for (const id of staleIds) {
			missCounts.delete(id);
			peerStatuses.delete(id);
		}
	}, [send, disconnect, getConnectedPeerIds, partyId]);

	useEffect(() => {
		pingTimer = setInterval(runPingCycle, PING_INTERVAL_MS);
		return () => {
			if (pingTimer) {
				clearInterval(pingTimer);
				pingTimer = null;
			}
		};
	}, [runPingCycle]);

	const markAlive = useCallback((peerId: string) => {
		missCounts.set(peerId, 0);
		peerStatuses.set(peerId, "active");
	}, []);

	const getPeerStatuses = useCallback((): Map<string, PeerStatus> => {
		return peerStatuses;
	}, []);

	return { markAlive, getPeerStatuses };
}
