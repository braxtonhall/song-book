import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { List, ListImperativeAPI, RowComponentProps, useListRef } from 'react-window';
import Fuse from 'fuse.js';
import { stringToColour } from './utilities/hex';
import './App.css';

// Just for testing. Do not build anything using this
const LETTERS = '0ABBBBBBCEDFGHIJKLMNOPQRSTUVWXYZ';

// Just for testing. Do not build anything using this
const ENTRIES = Array.from({ length: 10_000 }).map((_, index) => ({
  song: `${LETTERS[(Math.floor((index / 10_000) * LETTERS.length))]} Song Name ${index}`,
  artist: `${LETTERS[(Math.floor(((10_000 - index) / 10_000) * LETTERS.length))]} Artist Name ${10_000 - index}`,
  details: `${stringToColour(LETTERS[index % LETTERS.length])} details ${LETTERS[index * LETTERS.length]}`,
  id: index,
  hex: stringToColour('colour' + index),
}));

const LETTERS_ARRAY = Array.from(new Set(ENTRIES.map((entry) => entry.song[0]))).filter((entry) => entry).sort();


const FUSE = new Fuse(ENTRIES, {
  keys: [
    { name: 'song', weight: 2 },
    { name: 'artist', weight: 1 },
  ],
  threshold: 0.3,
});

type Entry = (typeof ENTRIES)[number];
type RowProps = { entries: Entry[] };

function computeRowHeight() {
  return window.innerWidth > window.innerHeight ? '8.33%' : '12.5%';
}

function useRowHeight(): string {
  const [rowHeight, setRowHeight] = useState(computeRowHeight);
  useEffect(() => {
    const handler = () => setRowHeight(computeRowHeight());
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);
  return rowHeight;
}

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

function useLandscape(): boolean {
  const [landscape, setLandscape] = useState(() => window.innerWidth > window.innerHeight);
  useEffect(() => {
    const handler = () => setLandscape(window.innerWidth > window.innerHeight);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);
  return landscape;
}

function EntryRow({ ariaAttributes, index, style, entries }: RowComponentProps<RowProps>) {
  const { song, artist, hex } = entries[index];
  return (
    <div {...ariaAttributes} style={style} className="entry-row">
      <div className="entry-avatar" style={{ backgroundColor: hex }} />
      <div className="entry-text">
        <span className="entry-title">{song}</span>
        <span className="entry-artist">{artist}</span>
      </div>
      <span className="entry-index">{index + 1}</span>
    </div>
  );
}

function SearchBar({ query, onChange }: { query: string; onChange: (q: string) => void }) {
  return (
    <div className="search-bar">
      <svg className="search-icon" viewBox="0 0 20 20" fill="none">
        <circle cx="8.5" cy="8.5" r="5.5" stroke="currentColor" strokeWidth="1.6" />
        <path d="M13 13l3.5 3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
      <input
        className="search-input"
        type="search"
        placeholder="Search…"
        value={query}
        onChange={e => onChange(e.target.value)}
      />
      {query && (
        <button className="search-clear" onClick={() => onChange('')} aria-label="Clear search">
          ✕
        </button>
      )}
    </div>
  );
}


function AlphaIndex({
  listRef,
  letterFirstIndex,
  scrollVisible,
  currentLetter,
}: {
  listRef: React.RefObject<ListImperativeAPI>;
  letterFirstIndex: Record<string, number>;
  scrollVisible: boolean;
  currentLetter: string | null;
}) {
  const [active, setActive] = useState<{ letter: string; y: number } | null>(null);
  const [hovered, setHovered] = useState(false);
  const landscape = useLandscape();
  const zoneRef = useRef<HTMLDivElement>(null);
  const stripRef = useRef<HTMLDivElement>(null);
  const visible = landscape || scrollVisible || hovered || !!active;

  const letterAtY = useCallback((clientY: number) => {
    const rect = stripRef.current?.getBoundingClientRect();
    if (!rect) return;
    const PADDING = 8;
    const contentH = rect.height - PADDING * 2;
    const contentY = Math.max(0, Math.min(contentH, clientY - rect.top - PADDING));
    const clampedIdx = Math.min(
      Math.floor(contentY / contentH * LETTERS_ARRAY.length),
      LETTERS_ARRAY.length - 1,
    );
    const letter = LETTERS_ARRAY[clampedIdx];
    const index = letterFirstIndex[letter];
    if (index !== undefined) {
      listRef.current?.scrollToRow({ index, align: 'start', behavior: 'instant' });
    }
    setActive({ letter, y: clientY });
  }, [listRef, letterFirstIndex]);

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    zoneRef.current?.setPointerCapture(e.pointerId);
    letterAtY(e.clientY);
  }, [letterAtY]);

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!zoneRef.current?.hasPointerCapture(e.pointerId)) return;
    letterAtY(e.clientY);
  }, [letterAtY]);

  const handlePointerUp = useCallback(() => setActive(null), []);

  return (
    <div className="alpha-wrapper">
      {active && (
        <div className="alpha-bubble" style={{ top: active.y, transform: 'translateY(-50%)' }}>
          {active.letter}
        </div>
      )}
      <div
        ref={zoneRef}
        className="alpha-zone"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <div
          ref={stripRef}
          className={`alpha-strip${visible ? ' alpha-strip--visible' : ''}${active ? ' alpha-strip--active' : ''}`}
        >
          {LETTERS_ARRAY.map(letter => (
            <span
              key={letter}
              className={`alpha-letter${active?.letter === letter ? ' alpha-letter--active' : letter === currentLetter ? ' alpha-letter--current' : ''}${!(letter in letterFirstIndex) ? ' alpha-letter--missing' : ''}`}
            >
              {letter}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function App() {
  const rowHeight = useRowHeight();
  const listRef = useListRef(null);
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 200);
  const [alphaVisible, setAlphaVisible] = useState(false);
  const [visibleStart, setVisibleStart] = useState(0);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

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
    <div className="App">
      <SearchBar query={query} onChange={setQuery} />
      <div className="list-wrapper">
        <List
          listRef={listRef}
          className={undefined}
          rowComponent={EntryRow}
          rowCount={filteredEntries.length}
          rowHeight={rowHeight}
          rowProps={{ entries: filteredEntries }}
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
    </div>
  );
}

export default App;
