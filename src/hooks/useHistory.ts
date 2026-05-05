import { HistoryEntry } from "../partyTypes";
import { useState, useEffect } from "react";

const HISTORY_KEY = "song-book:history";

let history: HistoryEntry[] = [];
try {
	const raw = localStorage.getItem(HISTORY_KEY);
	if (raw) history = JSON.parse(raw);
} catch {
	history = [];
}

function persist() {
	localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}

type HistoryListener = () => void;
const listeners = new Set<HistoryListener>();

function notify() {
	listeners.forEach((fn) => fn());
}

export function addHistoryEntry(entry: Omit<HistoryEntry, "uuid"> & { uuid?: string }) {
	const withUuid: HistoryEntry = {
		...entry,
		uuid: entry.uuid || crypto.randomUUID(),
	};
	history = [...history, withUuid];
	persist();
	notify();
}

export function removeHistoryEntry(uuid: string) {
	history = history.filter((e) => e.uuid !== uuid);
	persist();
	notify();
}

export function clearHistory() {
	history = [];
	persist();
	notify();
}

export function getHistoryForParty(partyId: string): HistoryEntry[] {
	return history.filter((e) => e.partyId === partyId);
}

export function mergeHistoryEntries(entries: HistoryEntry[]) {
	const existingIds = new Set(history.map((e) => e.uuid));
	const newEntries = entries
		.filter((e) => !existingIds.has(e.uuid))
		.map((e) => (e.uuid ? e : { ...e, uuid: crypto.randomUUID() }));
	if (newEntries.length > 0) {
		history = [...history, ...newEntries];
		persist();
		notify();
	}
}

export function useHistory() {
	const [state, setState] = useState<HistoryEntry[]>(history);

	useEffect(() => {
		const listener = () => setState([...history]);
		listeners.add(listener);
		return () => {
			listeners.delete(listener);
		};
	}, []);

	return { history: state };
}
