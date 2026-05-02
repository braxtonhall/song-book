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
  artist: `${LETTERS[(Math.floor(((10_000 - index) / 10_000 * LETTERS.length)))]} Artist Name ${10_000 - index}`,
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
type RowProps = { entries: Entry[]; onSelect: (entry: Entry) => void };

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

function darkenHex(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgb(${Math.round(r * 0.4)}, ${Math.round(g * 0.4)}, ${Math.round(b * 0.4)})`;
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

function EntryRow({ ariaAttributes, index, style, entries, onSelect }: RowComponentProps<RowProps>) {
  const entry = entries[index];
  const { song, artist, hex } = entry;
  return (
    <div {...ariaAttributes} style={style} className="entry-row" onClick={() => onSelect(entry)}>
      <div className="entry-avatar" style={{ backgroundColor: hex }} />
      <div className="entry-text">
        <span className="entry-title">{song}</span>
        <span className="entry-artist">{artist}</span>
      </div>
      <span className="entry-index">{index + 1}</span>
    </div>
  );
}

function DetailPanel({
  entry,
  dismissed,
  onDismiss,
}: {
  entry: Entry | null;
  dismissed: boolean;
  onDismiss: () => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const dragStartY = useRef(0);
  const dragStartPanelY = useRef(0);
  const moveHistory = useRef<{ y: number; t: number }[]>([]);
  const swipeVelocity = useRef(0);
  const [dragging, setDragging] = useState(false);

  const MIN_TOP = 80;
  const DISMISS_THRESHOLD = 0.85;
  const defaultTop = () => window.innerHeight * (2 / 3);
  const dismissedTop = () => window.innerHeight + 20;

  useEffect(() => {
    if (panelRef.current) {
      panelRef.current.style.transition = 'none';
      panelRef.current.style.top = dismissedTop() + 'px';
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!panelRef.current) return;
    if (dismissed) {
      const target = dismissedTop();
      const vel = swipeVelocity.current;
      swipeVelocity.current = 0;
      if (vel > 0) {
        const currentTop = parseFloat(panelRef.current.style.top) || defaultTop();
        const duration = Math.max(80, Math.min(400, Math.round((target - currentTop) / vel)));
        panelRef.current.style.transition = `top ${duration}ms linear`;
      } else {
        panelRef.current.style.transition = 'top 0.35s cubic-bezier(0.4, 0, 0.2, 1)';
      }
      panelRef.current.style.top = target + 'px';
    } else {
      panelRef.current.style.transition = 'top 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)';
      panelRef.current.style.top = defaultTop() + 'px';
    }
  }, [dismissed]); // entry and selectKey intentionally absent — only reposition on dismissed state change

  useEffect(() => {
    const handler = () => {
      if (!panelRef.current) return;
      if (dismissed) {
        panelRef.current.style.top = dismissedTop() + 'px';
      } else {
        const current = parseFloat(panelRef.current.style.top) || defaultTop();
        const clamped = Math.min(Math.max(current, MIN_TOP), window.innerHeight * DISMISS_THRESHOLD - 1);
        panelRef.current.style.top = clamped + 'px';
      }
    };
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, [dismissed]); // eslint-disable-line react-hooks/exhaustive-deps

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    panelRef.current?.setPointerCapture(e.pointerId);
    setDragging(true);
    dragStartY.current = e.clientY;
    moveHistory.current = [{ y: e.clientY, t: e.timeStamp }];
    const currentTop = parseFloat(getComputedStyle(panelRef.current!).top);
    panelRef.current!.style.top = currentTop + 'px';
    panelRef.current!.style.transition = 'none';
    dragStartPanelY.current = currentTop;
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!panelRef.current?.hasPointerCapture(e.pointerId)) return;
    const newTop = Math.max(MIN_TOP, dragStartPanelY.current + (e.clientY - dragStartY.current));
    panelRef.current!.style.top = newTop + 'px';
    const history = moveHistory.current;
    history.push({ y: e.clientY, t: e.timeStamp });
    // Keep only the last 80ms
    const cutoff = e.timeStamp - 80;
    moveHistory.current = history.filter(p => p.t >= cutoff);
  }, []);

  const handlePointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!panelRef.current?.hasPointerCapture(e.pointerId)) return;
    setDragging(false);
    const history = moveHistory.current;
    const oldest = history[0];
    const newest = history[history.length - 1];
    const elapsed = oldest && newest ? newest.t - oldest.t : 0;
    const velocity = elapsed > 0 ? (newest.y - oldest.y) / elapsed : 0; // px/ms, positive = downward
    const finalTop = parseFloat(panelRef.current!.style.top);
    if (finalTop > window.innerHeight * DISMISS_THRESHOLD || velocity > 0.5) {
      swipeVelocity.current = Math.max(0, velocity);
      onDismiss();
    } else {
      panelRef.current!.style.transition = 'top 0.25s cubic-bezier(0.4, 0, 0.2, 1)';
    }
  }, [onDismiss]);

  return (
    <div
      ref={panelRef}
      className={`detail-panel${dragging ? ' detail-panel--dragging' : ''}`}
      style={{ '--panel-accent': entry ? darkenHex(entry.hex) : '#1c1c1c' } as React.CSSProperties}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      <div className="detail-panel__grabber-zone">
        <div className="detail-panel__grabber" />
      </div>
      <div className="detail-panel__content">
        {entry && (
          <>
            <div className="detail-panel__avatar" style={{ backgroundColor: entry.hex }} />
            <h2 className="detail-panel__title">{entry.song}</h2>
            <p className="detail-panel__artist">{entry.artist}</p>
            <p className="detail-panel__details">{entry.details}</p>
          </>
        )}
      </div>
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
    <div className="App">
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
      />
    </div>
  );
}

export default App;
