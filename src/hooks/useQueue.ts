import { useState, useEffect, useCallback } from 'react';
import { Entry } from '../types';
import { QueueEntry, HistoryEntry } from '../partyTypes';

const QUEUE_KEY = 'song-book:queue';

function loadQueue(): QueueEntry[] {
	try {
		const raw = localStorage.getItem(QUEUE_KEY);
		return raw ? (JSON.parse(raw) as QueueEntry[]) : [];
	} catch {
		return [];
	}
}

export function useQueue() {
	const [queue, setQueue] = useState<QueueEntry[]>(loadQueue);
	// history is tracked in-memory only; T10 replaces this with useHistory + localStorage
	const [, setHistory] = useState<HistoryEntry[]>([]);

	useEffect(() => {
		localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
	}, [queue]);

	const addToQueue = useCallback((entry: Entry) => {
		setQueue(q => [...q, { uuid: crypto.randomUUID(), entry }]);
	}, []);

	const reorderQueue = useCallback((fromIndex: number, toIndex: number) => {
		setQueue(q => {
			const next = [...q];
			const [item] = next.splice(fromIndex, 1);
			next.splice(toIndex, 0, item);
			return next;
		});
	}, []);

	const dismissFromQueue = useCallback((uuid: string) => {
		setQueue(q => {
			const item = q.find(e => e.uuid === uuid);
			if (item) {
				setHistory(h => [
					...h,
					{ entry: item.entry, partyId: null, dismissedAt: new Date().toISOString() },
				]);
			}
			return q.filter(e => e.uuid !== uuid);
		});
	}, []);

	return { queue, addToQueue, reorderQueue, dismissFromQueue };
}
