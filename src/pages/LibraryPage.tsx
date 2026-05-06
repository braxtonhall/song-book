import React, { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { List, ListImperativeAPI, useListRef } from "react-window";
import Fuse from "fuse.js";
import { Entry, FilterState } from "../types";
import { SearchBar } from "../components/SearchBar";
import { AlphaIndex } from "../components/AlphaIndex";
import { ListRow } from "../components/ListRow";
import { SortBy } from "../components/SortHeader";
import { useRowHeight } from "../hooks/useRowHeight";
import { useDebounce } from "../hooks/useDebounce";
import "./Page.css";
import "./LibraryPage.css";

const SORT_HEADER_HEIGHT = 44;
const SORT_STORAGE_KEY = "song-book:library-sort";

function getStoredSort(): SortBy {
	try {
		const stored = localStorage.getItem(SORT_STORAGE_KEY);
		if (stored === "artist" || stored === "song") return stored;
	} catch {}
	return "song";
}

const FUSE_OPTIONS = {
	keys: [
		{ name: "song", weight: 4 },
		{ name: "artist", weight: 2 },
		{ name: "albumName", weight: 1 },
	],
	threshold: 0.3,
};

interface LibraryPageProps {
	entries: Entry[];
	onSelect: (entry: Entry) => void;
	selectedEntryId: number | null;
	panelOpen: boolean;
	onAddToQueue?: (entry: Entry) => void;
	onToggleFilter: () => void;
	filterActive: boolean;
	filterState: FilterState;
}

export function LibraryPage({
	entries,
	onSelect,
	selectedEntryId,
	panelOpen,
	onAddToQueue,
	onToggleFilter,
	filterActive,
	filterState,
}: LibraryPageProps) {
	const commonRowHeight = useRowHeight();
	const listRef = useListRef(null);
	const [query, setQuery] = useState("");
	const debouncedQuery = useDebounce(query, 200);
	const [sortBy, setSortBy] = useState<SortBy>(getStoredSort);
	const [alphaVisible, setAlphaVisible] = useState(false);
	const [visibleStart, setVisibleStart] = useState(0);
	const hideTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

	const fuse = useMemo(() => new Fuse(entries, FUSE_OPTIONS), [entries]);

	const rowHeight = useCallback(
		(index: number) => (!debouncedQuery && index === 0 ? SORT_HEADER_HEIGHT : commonRowHeight),
		[debouncedQuery, commonRowHeight],
	);

	const handleRowsRendered = useCallback((visible: { startIndex: number; stopIndex: number }) => {
		setAlphaVisible(true);
		clearTimeout(hideTimer.current);
		hideTimer.current = setTimeout(() => setAlphaVisible(false), 1500);
		setVisibleStart(visible.startIndex);
	}, []);

	useEffect(() => () => clearTimeout(hideTimer.current), []);

	useEffect(() => {
		try {
			localStorage.setItem(SORT_STORAGE_KEY, sortBy);
		} catch {}
	}, [sortBy]);

	const sortedEntries = useMemo(
		() =>
			[...entries].sort((a, b) =>
				sortBy === "artist" ? a.sortArtist.localeCompare(b.sortArtist) : a.sortSong.localeCompare(b.sortSong),
			),
		[entries, sortBy],
	);

	const filteredEntries = useMemo(() => {
		if (!debouncedQuery) return sortedEntries;
		return fuse.search(debouncedQuery).map((r) => r.item);
	}, [debouncedQuery, sortedEntries, fuse]);

	const headerOffset = debouncedQuery ? 0 : 1;

	const handleSwipeChange = useCallback(
		(active: boolean) => {
			const el = listRef.current?.element;
			if (!el) return;
			el.style.overflow = active ? "hidden" : "auto";
		},
		[listRef],
	);

	const letterFirstIndex = useMemo(() => {
		const map: Record<string, number> = {};
		filteredEntries.forEach((e, i) => {
			const letter = (sortBy === "artist" ? e.sortArtist : e.sortSong)[0]?.toUpperCase();
			if (letter && !(letter in map)) map[letter] = i + headerOffset;
		});
		return map;
	}, [filteredEntries, headerOffset, sortBy]);

	useEffect(() => {
		if (filteredEntries.length > 0) {
			listRef.current?.scrollToRow({ index: 0, behavior: "instant" });
		}
	}, [debouncedQuery, listRef, filteredEntries]);

	const visibleEntry = filteredEntries[visibleStart - headerOffset];
	const currentLetter = visibleEntry
		? ((sortBy === "artist" ? visibleEntry.sortArtist : visibleEntry.sortSong)[0]?.toUpperCase() ?? null)
		: null;

	return (
		<div className="page page--library">
			<div className="library-toolbar">
				<SearchBar query={query} onChange={setQuery} />
				<button className="library-filters-btn" onClick={onToggleFilter} aria-label="Filters">
					<svg
						viewBox="0 0 20 20"
						fill="none"
						stroke="currentColor"
						strokeWidth="1.6"
						strokeLinecap="round"
						strokeLinejoin="round"
					>
						<polygon points="2,4 8,12 8,16 12,14 12,12 18,4" />
					</svg>
					{filterActive && <span className="library-filters-dot" />}
				</button>
			</div>
			<div className="list-wrapper">
				<List
					listRef={listRef}
					className={undefined}
					rowComponent={ListRow}
					rowCount={filteredEntries.length + headerOffset}
					rowHeight={rowHeight}
					rowProps={{
						entries: filteredEntries,
						onSelect,
						headerOffset,
						sortBy,
						onSortChange: setSortBy,
						selectedId: selectedEntryId,
						panelOpen,
						onAddToQueue,
						onSwipeChange: handleSwipeChange,
					}}
					onRowsRendered={handleRowsRendered}
					style={{ height: "100%", width: "100%" }}
				/>
			</div>
			{!query && (
				<AlphaIndex
					listRef={listRef as React.RefObject<ListImperativeAPI>}
					letterFirstIndex={letterFirstIndex}
					scrollVisible={alphaVisible}
					currentLetter={currentLetter}
				/>
			)}
		</div>
	);
}
