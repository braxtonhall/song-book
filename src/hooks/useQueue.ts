import { useState, useEffect, useCallback } from 'react';
import * as Y from 'yjs';
import { Entry } from '../types';
import { QueueEntry, HistoryEntry } from '../partyTypes';

const CRDT_KEY = 'song-book:queue-crdt';

const doc = new Y.Doc();
const yQueue: Y.Array<QueueEntry> = doc.getArray('queue');
const yDismissed: Y.Map<boolean> = doc.getMap('dismissed');

// Restore previous CRDT state if it exists
try {
	const raw = localStorage.getItem(CRDT_KEY);
	if (raw) {
		const update = new Uint8Array(atob(raw).split('').map(c => c.charCodeAt(0)));
		Y.applyUpdate(doc, update);
	}
} catch {
	// corrupted data — start fresh
}

// Persist on every update, debounced
let saveTimer: ReturnType<typeof setTimeout> | null = null;
doc.on('update', () => {
	if (saveTimer) clearTimeout(saveTimer);
	saveTimer = setTimeout(() => {
		const state = Y.encodeStateAsUpdate(doc);
		const binary = String.fromCharCode(...state);
		localStorage.setItem(CRDT_KEY, btoa(binary));
	}, 200);
});

export function useQueue() {
	const [queue, setQueue] = useState<QueueEntry[]>(() => yQueue.toArray());
	const [, setHistory] = useState<HistoryEntry[]>([]);

	// ── Sync yjs array changes to React state ───────────────────────────────
	useEffect(() => {
		const handler = () => {
			setQueue(yQueue.toArray());
		};
		yQueue.observe(handler);
		return () => yQueue.unobserve(handler);
	}, []);

	// ── Dismissed-map observer → history + array cleanup ────────────────────
	useEffect(() => {
		const handler = (event: Y.YMapEvent<boolean>) => {
			for (const key of event.keysChanged) {
				if (event.target.get(key) !== true) continue;

				const array = yQueue.toArray();
				const idx = array.findIndex(e => e.uuid === key);
				if (idx === -1) continue;

				const entry = yQueue.get(idx).entry;

				setHistory(h => [
					...h,
					{
						entry,
						partyId: null,
						dismissedAt: new Date().toISOString(),
					},
				]);

				yQueue.delete(idx, 1);
			}
		};
		yDismissed.observe(handler);
		return () => yDismissed.unobserve(handler);
	}, []);

	// ── GC: clear dismissed map when queue is empty ─────────────────────────
	useEffect(() => {
		// TODO BJH this NEEDS to be guarded behind local only mode. if there is a party, no clearing allowed.
		if (queue.length === 0) {
			yDismissed.clear();
		}
	}, [queue]);

	// ── Queue operations ────────────────────────────────────────────────────
	const addToQueue = useCallback((entry: Entry) => {
		yQueue.push([{ uuid: crypto.randomUUID(), entry }]);
	}, []);

	const reorderQueue = useCallback((fromIndex: number, toIndex: number) => {
		const entry = yQueue.get(fromIndex);
		yQueue.delete(fromIndex, 1);
		yQueue.insert(toIndex, [entry]);
	}, []);

	const dismissFromQueue = useCallback((uuid: string) => {
		yDismissed.set(uuid, true);
	}, []);

	return { queue, addToQueue, reorderQueue, dismissFromQueue };
}
