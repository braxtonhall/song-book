import React, { useState, useRef, useCallback } from 'react';
import { ListImperativeAPI } from 'react-window';
import { useGlobalPointerCancel } from '../hooks/useGlobalPointerCancel';
import { useLandscape } from '../hooks/useLandscape';
import './AlphaIndex.css';

const LETTERS_ARRAY = '0ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

export function AlphaIndex({
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
  const stripRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
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
    stripRef.current?.setPointerCapture(e.pointerId);
    isDragging.current = true;
    letterAtY(e.clientY);
  }, [letterAtY]);

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging.current) return;
    letterAtY(e.clientY);
  }, [letterAtY]);

  const handlePointerUp = useCallback(() => {
    if (!isDragging.current) {
      return;
    }
    isDragging.current = false;
    setActive(null);
  }, []);

  useGlobalPointerCancel(handlePointerUp);

  return (
    <div className="alpha-wrapper">
      {active && (
        <div className="alpha-bubble" style={{ top: active.y, transform: 'translateY(-50%)' }}>
          {active.letter}
        </div>
      )}
      <div
        ref={stripRef}
        className={`alpha-strip${visible ? ' alpha-strip--visible' : ''}${active ? ' alpha-strip--active' : ''}`}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
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
  );
}
