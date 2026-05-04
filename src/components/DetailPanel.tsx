import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Entry } from '../types';
import { AudioPlayer } from './AudioPlayer';
import { useSongPassword } from '../hooks/useSongPassword';
import { useGlobalPointerCancel } from '../hooks/useGlobalPointerCancel';
import { useVelocityTrace } from '../hooks/useVelocityTrace';
import './DetailPanel.css';

const RATING_LABELS = ['Unrated', 'Family Friendly', 'Supervision Recommended'];
const DIFFICULTY_LABELS = ['Warmup', 'Apprentice', 'Solid', 'Moderate', 'Challenging', 'Nightmare', 'Impossible'];

function formatDuration(ms: number): string {
  const totalSeconds = Math.round(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function DifficultyDots({ value }: { value: number | null }) {
  if (value === null) return <span className="detail-panel__diff-none">No Part</span>;
  const diffDotFillClass = value === 6 ? ' detail-panel__diff-dot--red' : ' detail-panel__diff-dot--filled';
  return (
    <span className="detail-panel__diff-dots" aria-label={`Difficulty of ${DIFFICULTY_LABELS[value]}`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <span key={i} className={`detail-panel__diff-dot${i < value ? diffDotFillClass : ''}`} />
      ))}
    </span>
  );
}

function DifficultyRow({ icon, alt, value }: { icon: string; alt: string; value: number | null }) {
  return (
    <div className="detail-panel__diff-row">
      <img className="detail-panel__diff-label" src={`${process.env.PUBLIC_URL}/icons/${icon}`} alt={alt} />
      <DifficultyDots value={value} />
    </div>
  );
}

function darkenHex(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgb(${Math.round(r * 0.4)}, ${Math.round(g * 0.4)}, ${Math.round(b * 0.4)})`;
}

export function DetailPanel({
  entry,
  dismissed,
  onDismiss,
  isLandscape,
  onAddToQueue,
}: {
  entry: Entry | null;
  dismissed: boolean;
  onDismiss: () => void;
  isLandscape: boolean;
  onAddToQueue?: (entry: Entry) => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const dragStartY = useRef(0);
  const dragStartPanelY = useRef(0);
  const { resetPoints, observePoint } = useVelocityTrace(80);
  const swipeVelocity = useRef(0);
  const isDragging = useRef(false);
  const [dragging, setDragging] = useState(false);
  const { password: songPassword } = useSongPassword();

  const MIN_TOP = 80;
  const DISMISS_THRESHOLD = 0.85;
  const defaultTop = () => window.innerHeight * (2 / 3);
  const dismissedTop = () => window.innerHeight + 20;

  useEffect(() => {
    if (isLandscape) return;
    if (panelRef.current) {
      panelRef.current.style.transition = 'none';
      panelRef.current.style.top = dismissedTop() + 'px';
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (isLandscape) return;
    if (!panelRef.current) return;
    if (dismissed) {
      const target = dismissedTop();
      const vel = swipeVelocity.current;
      swipeVelocity.current = 0;
      if (vel > 0) {
        const currentTop = parseFloat(panelRef.current.style.top) || defaultTop();
        const duration = Math.max(80, Math.min(400, Math.round((target - currentTop) / vel)));
        panelRef.current.style.transition = `top ${duration}ms linear, --panel-accent 0.4s ease`;
      } else {
        panelRef.current.style.transition = 'top 0.35s cubic-bezier(0.4, 0, 0.2, 1), --panel-accent 0.4s ease';
      }
      panelRef.current.style.top = target + 'px';
    } else {
      panelRef.current.style.transition = 'top 0.35s cubic-bezier(0.34, 1.56, 0.64, 1), --panel-accent 0.4s ease';
      panelRef.current.style.top = defaultTop() + 'px';
    }
  }, [dismissed, isLandscape]); // entry intentionally absent — only reposition on dismissed/orientation change

  useEffect(() => {
    const handler = () => {
      if (!panelRef.current) return;
      if (isLandscape) {
        panelRef.current.style.top = '';
        panelRef.current.style.transition = '';
        return;
      }
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
  }, [dismissed, isLandscape]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!panelRef.current) return;
    if (isLandscape) {
      panelRef.current.style.top = '';
      panelRef.current.style.transition = '';
    } else {
      panelRef.current.style.transition = 'none';
      panelRef.current.style.top = (dismissed ? dismissedTop() : defaultTop()) + 'px';
      panelRef.current.getBoundingClientRect(); // force reflow so transition:none commits before next paint
    }
  }, [isLandscape]); // eslint-disable-line react-hooks/exhaustive-deps

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('button')) return;
    e.preventDefault();
    panelRef.current?.setPointerCapture(e.pointerId);
    isDragging.current = true;
    setDragging(true);
    dragStartY.current = e.clientY;
    resetPoints()
    observePoint(e);
    const currentTop = parseFloat(getComputedStyle(panelRef.current!).top);
    panelRef.current!.style.top = currentTop + 'px';
    panelRef.current!.style.transition = 'none';
    dragStartPanelY.current = currentTop;
  }, [resetPoints, observePoint]);

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging.current) return;
    e.preventDefault();
    const newTop = Math.max(MIN_TOP, dragStartPanelY.current + (e.clientY - dragStartY.current));
    panelRef.current!.style.top = newTop + 'px';
    observePoint(e);
  }, [observePoint]);

  const handlePointerUp = useCallback((e: { clientX: number, clientY: number, timeStamp: number }) => {
    if (!isDragging.current) return;
    isDragging.current = false;
    setDragging(false);
    const { vy: velocity } = observePoint(e);
    const finalTop = parseFloat(panelRef.current!.style.top);
    if (finalTop > window.innerHeight * DISMISS_THRESHOLD || velocity > 0.5) {
      swipeVelocity.current = Math.max(0, velocity);
      onDismiss();
    } else if (velocity < -0.5) {
      const target = MIN_TOP;
      const absVel = Math.abs(velocity);
      const duration = Math.max(80, Math.min(400, Math.round((finalTop - target) / absVel)));
      panelRef.current!.style.transition = `top ${duration}ms linear, --panel-accent 0.4s ease`;
      panelRef.current!.style.top = target + 'px';
    } else {
      panelRef.current!.style.transition = 'top 0.25s cubic-bezier(0.4, 0, 0.2, 1), --panel-accent 0.4s ease';
    }
  }, [onDismiss, observePoint]);

  useGlobalPointerCancel(handlePointerUp);

  const isOpen = isLandscape && !dismissed;

  return (
    <div
      ref={panelRef}
      className={[
        'detail-panel',
        dragging ? 'detail-panel--dragging' : '',
        isOpen ? 'detail-panel--open' : '',
      ].filter(Boolean).join(' ')}
      style={{ '--panel-accent': entry ? darkenHex(entry.hex) : '#1c1c1c' } as React.CSSProperties}
      onPointerDown={isLandscape ? undefined : handlePointerDown}
      onPointerMove={isLandscape ? undefined : handlePointerMove}
      onPointerUp={isLandscape ? undefined : handlePointerUp}
      onPointerCancel={isLandscape ? undefined : handlePointerUp}
    >
      {!isLandscape && (
        <div className="detail-panel__grabber-zone">
          <div className="detail-panel__grabber" />
        </div>
      )}
      <button className="detail-panel__close" onClick={onDismiss} aria-label="Close">×</button>
      <div className="detail-panel__content">
        {entry && (
          <>
            <div className="detail-panel__top-row">
              <div className="detail-panel__art-column">
                <div className="detail-panel__avatar" style={{ backgroundColor: entry.hex }} >
                  {entry.albumArt && <img src={`https://braxtonhall.ca/song-book-resources/art/${entry.albumArt}.png`} alt={`${entry.albumName} album art`} />}
                </div>
                {songPassword && entry.ogg && <AudioPlayer entry={entry} dismissed={dismissed} />}
              </div>
              <div className="detail-panel__diff-columns">
                <div className="detail-panel__diff-col">
                  <DifficultyRow icon="guitar.png" alt="Guitar" value={entry.guitarDifficulty} />
                  <DifficultyRow icon="bass.png" alt="Bass" value={entry.bassDifficulty} />
                  <DifficultyRow icon="drums.png" alt="Drums" value={entry.drumDifficulty} />
                  <DifficultyRow icon="keys.png" alt="Keys" value={entry.keysDifficulty} />
                  <DifficultyRow
                    icon={entry.vocalParts && entry.vocalParts > 2 ? 'vocals-3.png' : entry.vocalParts && entry.vocalParts > 1 ? 'vocals-2.png' : 'vocals.png'}
                    alt="Vocals"
                    value={entry.vocalsDifficulty}
                  />

                </div>
                <div className="detail-panel__diff-col">
                  <DifficultyRow icon="guitar-plus.png" alt="Pro Guitar" value={entry.proGuitarDifficulty} />
                  <DifficultyRow icon="bass-plus.png" alt="Pro Bass" value={entry.proBassDifficulty} />
                  <DifficultyRow icon="drums-plus.png" alt="Pro Drums" value={entry.drumDifficulty} />
                  <DifficultyRow icon="keys-plus.png" alt="Pro Keys" value={entry.proKeysDifficulty} />
                  <DifficultyRow
                    icon="band.png"
                    alt="Band"
                    value={entry.bandDifficulty}
                  />
                </div>
              </div>
            </div>

            <div className="detail-panel__song-info">
              <h2 className="detail-panel__title">{entry.song}</h2>
              <p className="detail-panel__artist">{entry.artist}</p>
              <p className="detail-panel__album">
                {entry.albumName}{entry.year ? ` · ${entry.year}` : ''}
              </p>
            </div>

            <div className="detail-panel__meta">
              {entry.genre && <span>{entry.genre}</span>}
              {entry.source && <span>{entry.source}</span>}
            </div>

            <div className="detail-panel__badges">
              <span className="detail-panel__badge detail-panel__badge--duration">{formatDuration(entry.duration)}</span>
              {/* TODO figure out what all the rating labels are */}
              {entry.rating > 0 && <span className="detail-panel__badge">{RATING_LABELS[entry.rating] || "Unrated"}</span>}
              {entry.multitracks && <span className="detail-panel__badge">Multitracks</span>}
              {entry.cover && <span className="detail-panel__badge">Cover</span>}
            </div>
            {/* TODO I don't know if I like this.... */}
            {onAddToQueue && (
              <button
                className="detail-panel__add-queue-btn"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={() => onAddToQueue(entry)}
              >
                Add to Queue
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
