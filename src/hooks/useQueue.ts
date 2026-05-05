import { useState, useEffect, useCallback } from "react";
import * as Y from "yjs";
import { Entry } from "../types";
import { QueueEntry } from "../partyTypes";
import { addHistoryEntry } from "./useHistory";

const SOLO_KEY = "song-book:queue-solo";
const PARTY_QUEUE_KEY = "song-book:queue-party";

// ── Module-level solo state ─────────────────────────────────────────────────
let soloQueue: QueueEntry[] = [];
try {
	const raw = localStorage.getItem(SOLO_KEY);
	if (raw) soloQueue = JSON.parse(raw);
} catch {
	soloQueue = [];
}

function persistSolo() {
	localStorage.setItem(SOLO_KEY, JSON.stringify(soloQueue));
}

// ── Cross-instance sync ─────────────────────────────────────────────────────
type QueueStateListener = () => void;
const queueStateListeners = new Set<QueueStateListener>();

function notifyQueueState() {
	queueStateListeners.forEach((fn) => fn());
}

// ── Module-level party state (lazily initialized) ───────────────────────────
let currentMode: "solo" | "party" = "solo";
let doc: Y.Doc | null = null;
let yQueue: Y.Array<QueueEntry> | null = null;
let yDismissed: Y.Map<boolean> | null = null;
let partySaveTimer: ReturnType<typeof setTimeout> | null = null;

type LocalUpdateCallback = (encoded: string) => void;
let onLocalUpdateCallback: LocalUpdateCallback | null = null;

function persistParty() {
	if (!doc) return;
	const state = Y.encodeStateAsUpdate(doc);
	const binary = String.fromCharCode(...state);
	sessionStorage.setItem(PARTY_QUEUE_KEY, btoa(binary));
}

function setupDocListeners() {
	if (!doc) return;

	doc.on("update", () => {
		if (partySaveTimer) clearTimeout(partySaveTimer);
		partySaveTimer = setTimeout(persistParty, 200);
	});

	doc.on("update", (update, origin) => {
		if (origin === "remote") return;
		if (!onLocalUpdateCallback) return;
		const binary = String.fromCharCode(...update);
		const encoded = btoa(binary);
		onLocalUpdateCallback(encoded);
	});
}

// ── Module init: if reconnecting (partyId in sessionStorage), enter party mode
try {
	const storedPartyId = sessionStorage.getItem("song-book:party-id");

	if (storedPartyId) {
		currentMode = "party";

		doc = new Y.Doc();
		yQueue = doc.getArray("queue");
		yDismissed = doc.getMap("dismissed");

		const raw = sessionStorage.getItem(PARTY_QUEUE_KEY);
		if (raw) {
			const update = new Uint8Array(
				atob(raw)
					.split("")
					.map((c) => c.charCodeAt(0)),
			);
			Y.applyUpdate(doc, update);
		}

		setupDocListeners();
	}
} catch {
	currentMode = "solo";
}

function enterPartyMode(partyId: string, copySolo: boolean) {
	if (currentMode === "party") return;

	persistSolo();

	doc = new Y.Doc();
	yQueue = doc.getArray("queue");
	yDismissed = doc.getMap("dismissed");

	if (copySolo && soloQueue.length > 0) {
		yQueue.push(
			soloQueue.map((qe) => ({
				uuid: crypto.randomUUID(),
				entry: qe.entry,
				peerId: qe.peerId ?? null,
			})),
		);
	}

	setupDocListeners();

	currentMode = "party";
	sessionStorage.setItem("song-book:party-id", partyId);
	notifyQueueState();
}

function leavePartyMode() {
	if (currentMode === "solo") return;

	persistParty();
	doc?.destroy();
	doc = null;
	yQueue = null;
	yDismissed = null;
	if (partySaveTimer) {
		clearTimeout(partySaveTimer);
		partySaveTimer = null;
	}

	sessionStorage.removeItem("song-book:party-id");
	sessionStorage.removeItem(PARTY_QUEUE_KEY);

	currentMode = "solo";
	notifyQueueState();
}

// ── Hook ────────────────────────────────────────────────────────────────────
export function useQueue() {
	const [queue, setQueue] = useState<QueueEntry[]>(() => {
		if (currentMode === "party" && yQueue) return yQueue.toArray();
		return soloQueue;
	});
	const [partyVersion, setPartyVersion] = useState(0);
	const [mode, setMode] = useState<"solo" | "party">(currentMode);

	// ── Cross-instance sync: update this hook's state when mode changes ────────
	useEffect(() => {
		const listener = () => {
			if (currentMode === "party" && yQueue) {
				setQueue(yQueue.toArray());
			} else {
				setQueue(soloQueue);
			}
			setMode(currentMode);
			setPartyVersion((v) => v + 1);
		};
		queueStateListeners.add(listener);
		return () => {
			queueStateListeners.delete(listener);
		};
	}, []);

	// ── Solo: react to storage events (cross-tab sync, unlikely but correct) ─
	useEffect(() => {
		if (currentMode !== "solo") return;
		const handler = () => {
			const raw = localStorage.getItem(SOLO_KEY);
			if (raw) {
				try {
					soloQueue = JSON.parse(raw);
					setQueue(soloQueue);
				} catch {
					/* ignore */
				}
			}
		};
		window.addEventListener("storage", handler);
		return () => window.removeEventListener("storage", handler);
	}, []);

	// ── Party: sync yjs array to React state ─────────────────────────────────
	useEffect(() => {
		if (currentMode !== "party" || !yQueue) return;
		const yq = yQueue;
		const handler = () => setQueue(yq.toArray());
		yq.observe(handler);
		setQueue(yq.toArray());
		return () => {
			yq.unobserve(handler);
		};
	}, [partyVersion]);

	// ── Party: dismissed-map observer → history + array cleanup ──────────────
	useEffect(() => {
		if (currentMode !== "party" || !yDismissed) return;
		const yd = yDismissed;
		const yq = yQueue;
		const handler = (event: Y.YMapEvent<boolean>) => {
			for (const key of event.keysChanged) {
				if (event.target.get(key) !== true) continue;
				const array = yq!.toArray();
				const idx = array.findIndex((e) => e.uuid === key);
				if (idx === -1) continue;
				const entry = yq!.get(idx).entry;
				addHistoryEntry({
					entry,
					partyId: sessionStorage.getItem("song-book:party-id"),
					dismissedAt: new Date().toISOString(),
				});
				yq!.delete(idx, 1);
			}
		};
		yd.observe(handler);
		return () => {
			yd.unobserve(handler);
		};
	}, [partyVersion]);

	// ── Operations ───────────────────────────────────────────────────────────
	const addToQueue = useCallback((entry: Entry, peerId: string | null) => {
		if (currentMode === "party" && yQueue) {
			yQueue.push([{ uuid: crypto.randomUUID(), entry, peerId }]);
		} else {
			soloQueue = [...soloQueue, { uuid: crypto.randomUUID(), entry, peerId: null }];
			persistSolo();
			setQueue(soloQueue);
		}
	}, []);

	const reorderQueue = useCallback((fromIndex: number, toIndex: number) => {
		if (currentMode === "party" && yQueue) {
			const entry = yQueue.get(fromIndex);
			yQueue.delete(fromIndex, 1);
			yQueue.insert(toIndex, [entry]);
		} else {
			const copy = [...soloQueue];
			const [item] = copy.splice(fromIndex, 1);
			copy.splice(toIndex, 0, item);
			soloQueue = copy;
			persistSolo();
			setQueue(soloQueue);
		}
	}, []);

	const dismissFromQueue = useCallback((uuid: string) => {
		if (currentMode === "party" && yDismissed) {
			yDismissed.set(uuid, true);
		} else {
			const entry = soloQueue.find((e) => e.uuid === uuid);
			if (!entry) return;
			soloQueue = soloQueue.filter((e) => e.uuid !== uuid);
			persistSolo();
			setQueue(soloQueue);
			addHistoryEntry({
				entry: entry.entry,
				partyId: null,
				dismissedAt: new Date().toISOString(),
			});
		}
	}, []);

	const enterParty = useCallback((partyId: string, copySolo: boolean) => {
		enterPartyMode(partyId, copySolo);
	}, []);

	const leaveParty = useCallback(() => {
		leavePartyMode();
	}, []);

	const getSyncUpdate = useCallback((): string | null => {
		if (!doc) return null;
		const state = Y.encodeStateAsUpdate(doc);
		const binary = String.fromCharCode(...state);
		return btoa(binary);
	}, []);

	const applyRemoteUpdate = useCallback((encoded: string) => {
		if (!doc) return;
		const update = new Uint8Array(
			atob(encoded)
				.split("")
				.map((c) => c.charCodeAt(0)),
		);
		Y.applyUpdate(doc, update, "remote");
	}, []);

	const setOnLocalUpdate = useCallback((callback: LocalUpdateCallback | null) => {
		onLocalUpdateCallback = callback;
	}, []);

	const getDiff = useCallback((encoded: string) => {
		if (!doc) return "";
		const sv = Uint8Array.from(atob(encoded), (c) => c.charCodeAt(0));
		const missingUpdate = Y.encodeStateAsUpdate(doc, sv);
		return btoa(String.fromCharCode(...missingUpdate));
	}, []);

	const getStateVector = useCallback(() => {
		if (!doc) return "";
		const vector = Y.encodeStateVector(doc);
		const binary = String.fromCharCode(...vector);
		return btoa(binary);
	}, []);

	return {
		queue,
		addToQueue,
		reorderQueue,
		dismissFromQueue,
		enterParty,
		leaveParty,
		currentMode: mode,
		getSyncUpdate,
		applyRemoteUpdate,
		setOnLocalUpdate,
		getDiff,
		getStateVector,
	};
}
