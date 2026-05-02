import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { List, ListImperativeAPI, useListRef } from 'react-window';
import Fuse from 'fuse.js';
import { getEntries, Entry } from './stub/entries';
import { SearchBar } from './components/SearchBar';
import { DetailPanel } from './components/DetailPanel';
import { AlphaIndex } from './components/AlphaIndex';
import { ListRow } from './components/ListRow';
import { SortBy } from './components/SortHeader';
import { useRowHeight } from './hooks/useRowHeight';
import { useLandscape } from './hooks/useLandscape';
import { useDebounce } from './hooks/useDebounce';
import './App.css';

const SORT_HEADER_HEIGHT = 44;

const FUSE_OPTIONS = {
  keys: [
    { name: 'song', weight: 2 },
    { name: 'artist', weight: 1 },
  ],
  threshold: 0.3,
};

function App() {
  const commonRowHeight = useRowHeight();
  const landscape = useLandscape();
  const listRef = useListRef(null);
  const [entries, setEntries] = useState<Entry[] | null>(null);
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 200);
  const rowHeight = useCallback((index: number) => (!debouncedQuery && index === 0 ? SORT_HEADER_HEIGHT : commonRowHeight), [debouncedQuery, commonRowHeight]);
  const [alphaVisible, setAlphaVisible] = useState(false);
  const [visibleStart, setVisibleStart] = useState(0);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [selectedEntry, setSelectedEntry] = useState<Entry | null>(null);
  const [sheetDismissed, setSheetDismissed] = useState(true);
  const [sortBy, setSortBy] = useState<SortBy>('song');

  useEffect(() => {
    getEntries().then(setEntries);
  }, []);

  const fuse = useMemo(() => (entries ? new Fuse(entries, FUSE_OPTIONS) : null), [entries]);

  const handleSelect = useCallback((entry: Entry) => {
    setSelectedEntry(entry);
    setSheetDismissed(false);
  }, []);

  const handleRowsRendered = useCallback((visible: { startIndex: number; stopIndex: number }) => {
    setAlphaVisible(true);
    clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setAlphaVisible(false), 1500);
    setVisibleStart(visible.startIndex);
  }, []);

  useEffect(() => () => clearTimeout(hideTimer.current), []);

  const sortedEntries = useMemo(
    () =>
      entries
        ? [...entries].sort((a, b) =>
          sortBy === 'artist' ? a.sortArtist.localeCompare(b.sortArtist) : a.sortSong.localeCompare(b.sortSong),
        )
        : [],
    [entries, sortBy],
  );

  const filteredEntries = useMemo(() => {
    if (!debouncedQuery) return sortedEntries;
    return fuse?.search(debouncedQuery).map(r => r.item) ?? [];
  }, [debouncedQuery, sortedEntries, fuse]);

  const headerOffset = debouncedQuery ? 0 : 1;

  const letterFirstIndex = useMemo(() => {
    const map: Record<string, number> = {};
    filteredEntries.forEach((e, i) => {
      const letter = (sortBy === 'artist' ? e.sortArtist : e.sortSong)[0]?.toUpperCase();
      if (letter && !(letter in map)) map[letter] = i + headerOffset;
    });
    return map;
  }, [filteredEntries, headerOffset, sortBy]);

  useEffect(() => {
    if (filteredEntries.length > 0) {
      listRef.current?.scrollToRow({ index: 0, behavior: 'instant' });
    }
  }, [debouncedQuery, listRef, filteredEntries]);

  const visibleEntry = filteredEntries[visibleStart - headerOffset];
  const currentLetter =
    visibleEntry ? ((sortBy === 'artist' ? visibleEntry.sortArtist : visibleEntry.song)[0]?.toUpperCase() ?? null) : null;

  if (entries === null) {
    return (
      <div className="App App--loading">
        <div className="loading-spinner" />
      </div>
    );
  }

  return (
    <div className={`App${landscape && !sheetDismissed ? ' App--panel-open' : ''}`}>
      <SearchBar query={query} onChange={setQuery} />
      <div className="list-wrapper">
        <List
          listRef={listRef}
          className={undefined}
          rowComponent={ListRow}
          rowCount={filteredEntries.length + headerOffset}
          rowHeight={rowHeight}
          rowProps={{ entries: filteredEntries, onSelect: handleSelect, headerOffset, sortBy, onSortChange: setSortBy, selectedId: selectedEntry?.id ?? null, panelOpen: !sheetDismissed }}
          onRowsRendered={handleRowsRendered}
          style={{ height: '100%', width: '100%' }}
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
      <DetailPanel
        entry={selectedEntry}
        dismissed={sheetDismissed}
        onDismiss={() => setSheetDismissed(true)}
        isLandscape={landscape}
      />
    </div>
  );
}

export default App;
