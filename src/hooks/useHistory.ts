import { HistoryEntry } from "../partyTypes";
import { useState, useEffect } from "react";
import { getAll, put, remove, clear } from "../utilities/indexeddb";

const STORE = "history";

let history: HistoryEntry[] = [];
let loaded = false;

async function load(): Promise<HistoryEntry[]> {
	if (loaded) return history;
	const data = await getAll<HistoryEntry>(STORE);
	history = data;
	loaded = true;
	return history;
}

async function persist(entry: HistoryEntry) {
	await put(STORE, entry);
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
	persist(withUuid);
	notify();
}

export function removeHistoryEntry(uuid: string) {
	history = history.filter((e) => e.uuid !== uuid);
	remove(STORE, uuid);
	notify();
}

export function clearHistory() {
	history = [];
	clear(STORE);
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
		for (const entry of newEntries) {
			persist(entry);
		}
		notify();
	}
}

export function useHistory() {
	const [state, setState] = useState<HistoryEntry[]>([]);

	useEffect(() => {
		load().then((data) => setState(data));

		const listener = () => setState([...history]);
		listeners.add(listener);
		return () => {
			listeners.delete(listener);
		};
	}, []);

	return { history: state };
}
