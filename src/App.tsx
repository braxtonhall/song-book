import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { List, ListImperativeAPI, useListRef } from 'react-window';
import Fuse from 'fuse.js';
import { ENTRIES, Entry } from './stub/entries';
import { SearchBar } from './components/SearchBar';
import { DetailPanel } from './components/DetailPanel';
import { AlphaIndex } from './components/AlphaIndex';
import { EntryRow } from './components/EntryRow';
import { useRowHeight } from './hooks/useRowHeight';
import { useLandscape } from './hooks/useLandscape';
import { useDebounce } from './hooks/useDebounce';
import './App.css';

const FUSE = new Fuse(ENTRIES, {
  keys: [
    { name: 'song', weight: 2 },
    { name: 'artist', weight: 1 },
  ],
  threshold: 0.3,
});

function App() {
  const rowHeight = useRowHeight();
  const landscape = useLandscape();
  const listRef = useListRef(null);
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 200);
  const [alphaVisible, setAlphaVisible] = useState(false);
  const [visibleStart, setVisibleStart] = useState(0);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [selectedEntry, setSelectedEntry] = useState<Entry | null>(null);
  const [sheetDismissed, setSheetDismissed] = useState(true);

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

  const filteredEntries = useMemo(() => {
    if (!debouncedQuery) return ENTRIES;
    return FUSE.search(debouncedQuery).map(r => r.item);
  }, [debouncedQuery]);

  const letterFirstIndex = useMemo(() => {
    const map: Record<string, number> = {};
    filteredEntries.forEach((e, i) => {
      const letter = e.song[0];
      if (!(letter in map)) map[letter] = i;
    });
    return map;
  }, [filteredEntries]);

  useEffect(() => {
    if (filteredEntries.length > 0) {
      listRef.current?.scrollToRow({ index: 0, behavior: 'instant' });
    }
  }, [debouncedQuery, listRef, filteredEntries]);

  return (
    <div className={`App${landscape && !sheetDismissed ? ' App--panel-open' : ''}`}>
      <SearchBar query={query} onChange={setQuery} />
      <div className="list-wrapper">
        <List
          listRef={listRef}
          className={undefined}
          rowComponent={EntryRow}
          rowCount={filteredEntries.length}
          rowHeight={rowHeight}
          rowProps={{ entries: filteredEntries, onSelect: handleSelect }}
          onRowsRendered={handleRowsRendered}
          style={{ height: '100%', width: '100%' }}
        />
      </div>
      {!query && (
        <AlphaIndex
          listRef={listRef as React.RefObject<ListImperativeAPI>}
          letterFirstIndex={letterFirstIndex}
          scrollVisible={alphaVisible}
          currentLetter={filteredEntries[visibleStart]?.song[0] ?? null}
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
