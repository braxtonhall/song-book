import { useState, useEffect, useCallback } from "react";
import { Entry } from "../types";
import { Playlist } from "../partyTypes";
import { getAll, put, remove } from "../utilities/indexeddb";

const STORE = "playlists";

let playlists: Playlist[] = [];
let loaded = false;

type PlaylistsListener = () => void;
const listeners = new Set<PlaylistsListener>();

function notify() {
	listeners.forEach((fn) => fn());
}

async function persist(pl: Playlist) {
	await put(STORE, pl);
}

async function load(): Promise<Playlist[]> {
	if (loaded) return playlists;
	const data = await getAll<Playlist>(STORE);
	playlists = data;
	loaded = true;
	return playlists;
}

export function createPlaylist(name: string) {
	const pl: Playlist = {
		id: crypto.randomUUID(),
		name,
		entries: [],
		createdAt: new Date().toISOString(),
	};
	playlists = [...playlists, pl];
	persist(pl);
	notify();
	return pl;
}

export async function deletePlaylist(id: string) {
	playlists = playlists.filter((p) => p.id !== id);
	await remove(STORE, id);
	notify();
}

export function renamePlaylist(id: string, name: string) {
	const pl = playlists.find((p) => p.id === id);
	if (!pl) return;
	pl.name = name;
	persist(pl);
	notify();
}

export function addToPlaylist(playlistId: string, entry: Entry) {
	const pl = playlists.find((p) => p.id === playlistId);
	if (!pl) return;
	if (pl.entries.some((e) => e.id === entry.id)) return;
	pl.entries = [...pl.entries, entry];
	persist(pl);
	notify();
}

export function removeFromPlaylist(playlistId: string, entryId: number) {
	const pl = playlists.find((p) => p.id === playlistId);
	if (!pl) return;
	pl.entries = pl.entries.filter((e) => e.id !== entryId);
	persist(pl);
	notify();
}

export function reorderPlaylistSongs(playlistId: string, fromIndex: number, toIndex: number) {
	const pl = playlists.find((p) => p.id === playlistId);
	if (!pl) return;
	const copy = [...pl.entries];
	const [item] = copy.splice(fromIndex, 1);
	copy.splice(toIndex, 0, item);
	pl.entries = copy;
	persist(pl);
	notify();
}

export function getPlaylist(playlistId: string): Playlist | undefined {
	return playlists.find((p) => p.id === playlistId);
}

export function usePlaylists() {
	const [state, setState] = useState<Playlist[]>([]);
	const [ready, setReady] = useState(loaded);

	useEffect(() => {
		load().then((data) => {
			setState(data);
			setReady(true);
		});

		const listener = () => setState([...playlists]);
		listeners.add(listener);
		return () => {
			listeners.delete(listener);
		};
	}, []);

	const create = useCallback((name: string) => {
		createPlaylist(name);
	}, []);

	const delete_ = useCallback((id: string) => {
		deletePlaylist(id);
	}, []);

	const rename = useCallback((id: string, name: string) => {
		renamePlaylist(id, name);
	}, []);

	const addEntry = useCallback((playlistId: string, entry: Entry) => {
		addToPlaylist(playlistId, entry);
	}, []);

	const removeEntry = useCallback((playlistId: string, entryId: number) => {
		removeFromPlaylist(playlistId, entryId);
	}, []);

	const reorderEntries = useCallback((playlistId: string, fromIndex: number, toIndex: number) => {
		reorderPlaylistSongs(playlistId, fromIndex, toIndex);
	}, []);

	return { playlists: state, ready, create, delete: delete_, rename, addEntry, removeEntry, reorderEntries };
}
