import React, { useRef, useState, useCallback, useMemo, useEffect } from "react";
import { List, useListRef } from "react-window";
import { Entry } from "../types";
import { QueueEntry } from "../partyTypes";
import { ListRow } from "../components/ListRow";
import { getRockerId } from "../utilities/hash";
import "./Page.css";
import "./QueuePage.css";

type DragState = {
	fromIndex: number;
	startY: number;
	rowHeight: number;
	initialScrollTop: number;
	grabOffsetY: number;
};

interface QueuePageProps {
	queue: QueueEntry[];
	onReorder: (fromIndex: number, toIndex: number) => void;
	onDismiss: (uuid: string) => void;
	onSelect: (entry: Entry) => void;
	selectedEntryId: number | null;
	panelOpen: boolean;
	onAddToPlaylist?: (entry: Entry) => void;
	onNavigateToHistory: () => void;
}

function computeRowHeight() {
	const rows = window.innerWidth > window.innerHeight ? 12 : 8;
	return Math.round(window.innerHeight / rows);
}

const EDGE_THRESHOLD = 60;
const MAX_SCROLL_SPEED = 12;

export function QueuePage({
	queue,
	onReorder,
	onDismiss,
	onSelect,
	selectedEntryId,
	panelOpen,
	onAddToPlaylist,
	onNavigateToHistory,
}: QueuePageProps) {
	const listRef = useListRef(null);
	const dragStateRef = useRef<DragState | null>(null);
	const dragCloneRef = useRef<HTMLDivElement | null>(null);
	const lastClientYRef = useRef(0);
	const autoScrollRef = useRef(0);
	const [hoverIndex, setHoverIndex] = useState<number | null>(null);
	const [dragIndex, setDragIndex] = useState<number | null>(null);
	const [rowHeight, setRowHeight] = useState(computeRowHeight);

	useEffect(() => {
		const handler = () => setRowHeight(computeRowHeight());
		window.addEventListener("resize", handler);
		return () => window.removeEventListener("resize", handler);
	}, []);

	const entries = useMemo(() => queue.map((qe) => qe.entry), [queue]);

	const subtitles = useMemo(
		() => queue.map((qe) => (qe.peerId ? `Added by ${getRockerId(qe.peerId)}` : null)),
		[queue],
	);

	const dropIndicatorTop: number | null = (() => {
		if (dragStateRef.current === null || hoverIndex === null) return null;
		const { fromIndex, rowHeight: rh } = dragStateRef.current;
		if (hoverIndex === fromIndex) return null;
		return hoverIndex < fromIndex ? hoverIndex * rh : (hoverIndex + 1) * rh;
	})();

	const stopAutoScroll = useCallback(() => {
		if (autoScrollRef.current) {
			cancelAnimationFrame(autoScrollRef.current);
			autoScrollRef.current = 0;
		}
	}, []);

	const runAutoScroll = useCallback(() => {
		const ds = dragStateRef.current;
		const el = listRef.current?.element;
		if (!ds || !el) {
			stopAutoScroll();
			return;
		}

		const rect = el.getBoundingClientRect();
		const pY = lastClientYRef.current;
		const distFromTop = pY - rect.top;
		const distFromBottom = rect.bottom - pY;

		let speed = 0;
		if (distFromTop < EDGE_THRESHOLD) {
			const closeness = Math.min(1, (EDGE_THRESHOLD - distFromTop) / EDGE_THRESHOLD);
			speed = -MAX_SCROLL_SPEED * closeness;
		} else if (distFromBottom < EDGE_THRESHOLD) {
			const closeness = Math.min(1, (EDGE_THRESHOLD - distFromBottom) / EDGE_THRESHOLD);
			speed = MAX_SCROLL_SPEED * closeness;
		}

		if (speed === 0) {
			autoScrollRef.current = 0;
			return;
		}

		el.scrollTop = Math.max(0, Math.min(el.scrollHeight - el.clientHeight, el.scrollTop + speed));

		const { fromIndex, startY, rowHeight: rh, initialScrollTop } = ds;
		const scrollDelta = el.scrollTop - initialScrollTop;
		const effectiveDelta = pY - startY + scrollDelta;
		const raw = fromIndex + Math.round(effectiveDelta / rh);
		setHoverIndex(Math.max(0, Math.min(queue.length - 1, raw)));

		autoScrollRef.current = requestAnimationFrame(runAutoScroll);
	}, [queue.length, stopAutoScroll, listRef]);

	const handleDragStart = useCallback(
		(index: number, e: React.PointerEvent) => {
			e.preventDefault();
			const el = listRef.current?.element;
			el?.setPointerCapture(e.pointerId);
			if (el) el.style.overflow = "hidden";

			const rowEl = (e.target as HTMLElement).closest(".entry-row") as HTMLDivElement | null;
			if (rowEl) {
				const rect = rowEl.getBoundingClientRect();
				const grabOffsetY = e.clientY - rect.top;
				const clone = rowEl.cloneNode(true) as HTMLDivElement;
				clone.style.position = "fixed";
				clone.style.top = `${rect.top}px`;
				clone.style.left = `${rect.left}px`;
				clone.style.width = `${rect.width}px`;
				clone.style.zIndex = "1000";
				clone.style.pointerEvents = "none";
				clone.style.transform = "";
				clone.style.background = "#1c1c1e";
				clone.style.opacity = "0.9";
				clone.style.boxShadow = "0 4px 20px rgba(0, 0, 0, 0.6)";
				document.body.appendChild(clone);
				dragCloneRef.current = clone;

				dragStateRef.current = {
					fromIndex: index,
					startY: e.clientY,
					rowHeight,
					initialScrollTop: el?.scrollTop ?? 0,
					grabOffsetY,
				};
			}

			lastClientYRef.current = e.clientY;
			setHoverIndex(index);
			setDragIndex(index);
		},
		[rowHeight, listRef],
	);

	const handlePointerMove = useCallback(
		(e: React.PointerEvent) => {
			if (!dragStateRef.current) return;
			e.preventDefault();
			const { fromIndex, startY, rowHeight: rh, grabOffsetY, initialScrollTop } = dragStateRef.current;
			const el = e.currentTarget as HTMLDivElement;
			const delta = e.clientY - startY;
			const scrollDelta = el.scrollTop - initialScrollTop;
			const raw = fromIndex + Math.round((delta + scrollDelta) / rh);
			setHoverIndex(Math.max(0, Math.min(queue.length - 1, raw)));

			if (dragCloneRef.current) {
				dragCloneRef.current.style.top = `${e.clientY - grabOffsetY}px`;
			}

			lastClientYRef.current = e.clientY;

			if (!autoScrollRef.current) {
				const rect = el.getBoundingClientRect();
				const distFromTop = e.clientY - rect.top;
				const distFromBottom = rect.bottom - e.clientY;
				if (distFromTop < EDGE_THRESHOLD || distFromBottom < EDGE_THRESHOLD) {
					autoScrollRef.current = requestAnimationFrame(runAutoScroll);
				}
			}
		},
		[queue.length, runAutoScroll],
	);

	const handlePointerUp = useCallback(
		(e: React.PointerEvent) => {
			if (!dragStateRef.current) return;
			stopAutoScroll();
			const { fromIndex, startY, rowHeight: rh, initialScrollTop } = dragStateRef.current;
			const el = e.currentTarget as HTMLDivElement;
			const delta = e.clientY - startY;
			const scrollDelta = el.scrollTop - initialScrollTop;
			const toIndex = Math.max(0, Math.min(queue.length - 1, fromIndex + Math.round((delta + scrollDelta) / rh)));

			if (dragCloneRef.current) {
				dragCloneRef.current.remove();
				dragCloneRef.current = null;
			}
			dragStateRef.current = null;
			el.style.overflow = "auto";
			setHoverIndex(null);
			setDragIndex(null);

			if (toIndex !== fromIndex) {
				onReorder(fromIndex, toIndex);
			}
		},
		[queue.length, onReorder, stopAutoScroll],
	);

	const handleDismissSwipe = useCallback(
		(index: number) => {
			const uuid = queue[index]?.uuid;
			if (uuid) onDismiss(uuid);
		},
		[queue, onDismiss],
	);

	const handleDismissButton = useCallback(
		(index: number) => {
			const uuid = queue[index]?.uuid;
			if (uuid) onDismiss(uuid);
		},
		[queue, onDismiss],
	);

	const renderHeader = () => (
		<div className="queue-header">
			<span className="queue-header__title">Queue</span>
			<button className="queue-header__history-btn" onClick={onNavigateToHistory} aria-label="View history">
				<svg viewBox="0 0 24 24">
					<path d="M13 3a9 9 0 0 0-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42A8.954 8.954 0 0 0 13 21a9 9 0 0 0 0-18zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z" />
				</svg>
			</button>
		</div>
	);

	if (queue.length === 0) {
		return (
			<div className="page">
				{renderHeader()}
				<div className="page--empty" style={{ flex: 1 }}>
					<p className="page__placeholder">No songs in queue</p>
				</div>
			</div>
		);
	}

	return (
		<div className={`page queue-page${dragStateRef.current !== null ? " queue-page--gesturing" : ""}`}>
			{renderHeader()}
			<List
				className="queue-list"
				listRef={listRef}
				rowComponent={ListRow}
				rowCount={entries.length}
				rowHeight={rowHeight}
				rowProps={{
					entries,
					subtitles,
					onSelect,
					headerOffset: 0,
					selectedId: selectedEntryId,
					panelOpen,
					showDragHandle: true,
					onDragStart: handleDragStart,
					showDismissButton: true,
					onDismiss: handleDismissButton,
					onDismissSwipe: handleDismissSwipe,
					dragIndex,
					onAddToPlaylist,
				}}
				style={{ height: "100%", width: "100%" }}
				onPointerMove={handlePointerMove}
				onPointerUp={handlePointerUp}
				onPointerCancel={handlePointerUp}
			>
				{dropIndicatorTop !== null && (
					<div
						className="queue-drop-indicator"
						style={{ position: "absolute", top: dropIndicatorTop, left: 0, right: 0 }}
					/>
				)}
			</List>
		</div>
	);
}
