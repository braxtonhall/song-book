import React, { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { List, ListImperativeAPI, useListRef } from "react-window";
import Fuse from "fuse.js";
import { Entry, FilterState, IndexEntry, AugmentedItem, InstrumentKey, DIFFICULTY_FIELD } from "../types";
import { filter } from "../utilities/filter";
import { SearchBar } from "../components/SearchBar";
import { AlphaIndex } from "../components/AlphaIndex";
import { ListRow } from "../components/ListRow";
import { DifficultyDots } from "../components/DetailPanel";
import { SortBy } from "../components/SortHeader";
import { useRowHeight } from "../hooks/useRowHeight";
import { useDebounce } from "../hooks/useDebounce";
import { sort } from "../utilities/sort";
import "./Page.css";
import "./LibraryPage.css";

const SORT_HEADER_HEIGHT = 44;
const SORT_STORAGE_KEY = "song-book:library-sort";
const DIFFICULTY_KEY_STORAGE = "song-book:library-difficulty-key";

function getStoredSort(): SortBy {
	try {
		const stored = localStorage.getItem(SORT_STORAGE_KEY);
		if (stored === "artist" || stored === "song" || stored === "difficulty") return stored;
	} catch {}
	return "song";
}

function getStoredDifficultyKey(): InstrumentKey {
	try {
		const stored = localStorage.getItem(DIFFICULTY_KEY_STORAGE);
		const allowed: InstrumentKey[] = [
			"band",
			"guitar",
			"bass",
			"drums",
			"keys",
			"vocals",
			"proGuitar",
			"proBass",
			"proKeys",
		];
		if (stored && (allowed as string[]).includes(stored)) return stored as InstrumentKey;
	} catch {}
	return "band";
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
	onAddToPlaylist?: (entry: Entry) => void;
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
	onAddToPlaylist,
	onToggleFilter,
	filterActive,
	filterState,
}: LibraryPageProps) {
	const commonRowHeight = useRowHeight();
	const listRef = useListRef(null);
	const [query, setQuery] = useState("");
	const debouncedQuery = useDebounce(query, 200);
	const [sortBy, setSortBy] = useState<SortBy>(getStoredSort);
	const [difficultyKey, setDifficultyKey] = useState<InstrumentKey>(getStoredDifficultyKey);
	const [alphaVisible, setAlphaVisible] = useState(false);
	const [visibleRange, setVisibleRange] = useState<{ start: number; end: number } | null>(null);
	const hideTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

	const filteredEntries = useMemo(() => {
		return entries.filter(filter(filterState));
	}, [filterState, entries]);

	const fuse = useMemo(() => new Fuse(filteredEntries, FUSE_OPTIONS), [filteredEntries]);

	const rowHeight = useCallback(
		(index: number) => (!debouncedQuery && index === 0 ? SORT_HEADER_HEIGHT : commonRowHeight),
		[debouncedQuery, commonRowHeight],
	);

	const handleRowsRendered = useCallback((visible: { startIndex: number; stopIndex: number }) => {
		setAlphaVisible(true);
		clearTimeout(hideTimer.current);
		hideTimer.current = setTimeout(() => setAlphaVisible(false), 1500);
		setVisibleRange({ start: visible.startIndex, end: visible.stopIndex });
	}, []);

	useEffect(() => () => clearTimeout(hideTimer.current), []);

	useEffect(() => {
		try {
			localStorage.setItem(SORT_STORAGE_KEY, sortBy);
		} catch {}
	}, [sortBy]);

	useEffect(() => {
		try {
			localStorage.setItem(DIFFICULTY_KEY_STORAGE, difficultyKey);
		} catch {}
	}, [difficultyKey]);

	const sortedEntries = useMemo(
		() => [...filteredEntries].sort(sort(sortBy, difficultyKey)),
		[filteredEntries, sortBy, difficultyKey],
	);

	const searchResults = useMemo(() => {
		if (!debouncedQuery) return sortedEntries;
		return fuse.search(debouncedQuery).map((r) => r.item);
	}, [debouncedQuery, sortedEntries, fuse]);

	const headerOffset = debouncedQuery ? 0 : 1;

	const augmentedItems = useMemo<AugmentedItem[] | null>(() => {
		if (sortBy !== "difficulty" || debouncedQuery) return null;
		const diffField = DIFFICULTY_FIELD[difficultyKey];
		const result: AugmentedItem[] = [];
		let prevDiff = -1;
		let flatIndex = 0;
		for (const entry of searchResults) {
			const diff = entry[diffField] as number;
			if (diff !== prevDiff) {
				prevDiff = diff;
				result.push({ _type: "difficulty-header", difficulty: prevDiff });
			}
			result.push({ _type: "item", entry, flatIndex: flatIndex++ });
		}
		return result;
	}, [searchResults, sortBy, debouncedQuery, difficultyKey]);

	const effectiveLength = augmentedItems ? augmentedItems.length : searchResults.length;
	const rowCount = effectiveLength + headerOffset;

	const handleSwipeChange = useCallback(
		(active: boolean) => {
			const el = listRef.current?.element;
			if (!el) return;
			el.style.overflow = active ? "hidden" : "auto";
		},
		[listRef],
	);

	const indexEntries = useMemo<IndexEntry[]>(() => {
		if (augmentedItems) {
			const diffMap: Record<number, number> = {};
			for (let i = 0; i < augmentedItems.length; i++) {
				const item: AugmentedItem = augmentedItems[i];
				if (item._type === "difficulty-header" && !(item.difficulty in diffMap)) {
					diffMap[item.difficulty] = i + headerOffset;
				}
			}
			const ALL_DIFFICULTIES = [0, 1, 2, 3, 4, 5, 6, 7];
			return ALL_DIFFICULTIES.map((d) => {
				const index = diffMap[d];
				return {
					bubble: <DifficultyDots value={d} compact />,
					label: String(d),
					index: index ?? -1,
					present: index !== undefined,
				};
			});
		}
		const letterMap: Record<string, number> = {};
		searchResults.forEach((e, i) => {
			const raw = (sortBy === "artist" ? e.sortArtist : e.sortSong)[0]?.toUpperCase() ?? "";
			const letter = /^[A-Z]$/.test(raw) ? raw : "/";
			if (letter && !(letter in letterMap)) letterMap[letter] = i + headerOffset;
		});
		const ALL_LETTERS = ["/", ..."ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("")];
		return ALL_LETTERS.map((letter) => {
			const index = letterMap[letter];
			return {
				bubble: <div>{letter}</div>,
				label: letter,
				index: index ?? -1,
				present: index !== undefined,
			};
		});
	}, [augmentedItems, searchResults, headerOffset, sortBy]);

	const currentLabels = useMemo(() => {
		if (!visibleRange || indexEntries.length === 0) return new Set<string>();
		const { start, end } = visibleRange;
		const sorted = [...indexEntries].sort((a, b) => a.index - b.index);
		const labels = new Set<string>();
		for (let i = 0; i < sorted.length; i++) {
			const entry = sorted[i];
			const nextIndex = i + 1 < sorted.length ? sorted[i + 1].index : rowCount;
			const sectionEnd = nextIndex - 1;
			if (entry.index <= end && sectionEnd >= start) {
				labels.add(entry.label);
			}
		}
		return labels;
	}, [visibleRange, indexEntries, rowCount]);

	useEffect(() => {
		if (searchResults.length > 0) {
			listRef.current?.scrollToRow({ index: 0, behavior: "instant" });
		}
	}, [debouncedQuery, listRef, searchResults]);

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
					rowCount={rowCount}
					rowHeight={rowHeight}
					rowProps={{
						entries: searchResults,
						onSelect,
						headerOffset,
						sortBy,
						onSortChange: setSortBy,
						selectedId: selectedEntryId,
						panelOpen,
						onAddToQueue,
						onAddToPlaylist,
						onSwipeChange: handleSwipeChange,
						filteredCount: filteredEntries.length,
						totalCount: entries.length,
						augmentedItems,
						difficultyKey,
						onDifficultyKeyChange: setDifficultyKey,
					}}
					onRowsRendered={handleRowsRendered}
					style={{ height: "100%", width: "100%" }}
				/>
			</div>
			{!query && (
				<AlphaIndex
					listRef={listRef as React.RefObject<ListImperativeAPI>}
					indexEntries={indexEntries}
					scrollVisible={alphaVisible}
					currentLabels={currentLabels}
				/>
			)}
		</div>
	);
}
