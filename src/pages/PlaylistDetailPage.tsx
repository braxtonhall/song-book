import React, { useRef, useState, useCallback, useEffect } from "react";
import { List, useListRef } from "react-window";
import { Entry } from "../types";
import { ListRow } from "../components/ListRow";
import "./Page.css";
import "./PlaylistDetailPage.css";

type DragState = {
	fromIndex: number;
	startY: number;
	rowHeight: number;
	initialScrollTop: number;
	grabOffsetY: number;
};

interface PlaylistDetailPageProps {
	playlistName: string;
	entries: Entry[];
	onBack: () => void;
	onAddAllToQueue: () => void;
	onReorder: (fromIndex: number, toIndex: number) => void;
	onRemove: (entryId: number) => void;
	onRename: (name: string) => void;
	onDelete: () => void;
	onSelect: (entry: Entry) => void;
	selectedEntryId: number | null;
	panelOpen: boolean;
	onAddToPlaylist?: (entry: Entry) => void;
}

function computeRowHeight() {
	const rows = window.innerWidth > window.innerHeight ? 12 : 8;
	return Math.round(window.innerHeight / rows);
}

const EDGE_THRESHOLD = 60;
const MAX_SCROLL_SPEED = 12;

export function PlaylistDetailPage({
	playlistName,
	entries,
	onBack,
	onAddAllToQueue,
	onReorder,
	onRemove,
	onRename,
	onDelete,
	onSelect,
	selectedEntryId,
	panelOpen,
	onAddToPlaylist,
}: PlaylistDetailPageProps) {
	const listRef = useListRef(null);
	const dragStateRef = useRef<DragState | null>(null);
	const dragCloneRef = useRef<HTMLDivElement | null>(null);
	const lastClientYRef = useRef(0);
	const autoScrollRef = useRef(0);
	const [hoverIndex, setHoverIndex] = useState<number | null>(null);
	const [dragIndex, setDragIndex] = useState<number | null>(null);
	const [rowHeight, setRowHeight] = useState(computeRowHeight);
	const [isRenaming, setIsRenaming] = useState(false);
	const [renameValue, setRenameValue] = useState("");
	const renameInputRef = useRef<HTMLInputElement>(null);
	const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
	const [removeConfirmEntry, setRemoveConfirmEntry] = useState<Entry | null>(null);

	useEffect(() => {
		const handler = () => setRowHeight(computeRowHeight());
		window.addEventListener("resize", handler);
		return () => window.removeEventListener("resize", handler);
	}, []);

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
		setHoverIndex(Math.max(0, Math.min(entries.length - 1, raw)));

		autoScrollRef.current = requestAnimationFrame(runAutoScroll);
	}, [entries.length, stopAutoScroll, listRef]);

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
			setHoverIndex(Math.max(0, Math.min(entries.length - 1, raw)));

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
		[entries.length, runAutoScroll],
	);

	const handlePointerUp = useCallback(
		(e: React.PointerEvent) => {
			if (!dragStateRef.current) return;
			stopAutoScroll();
			const { fromIndex, startY, rowHeight: rh, initialScrollTop } = dragStateRef.current;
			const el = e.currentTarget as HTMLDivElement;
			const delta = e.clientY - startY;
			const scrollDelta = el.scrollTop - initialScrollTop;
			const toIndex = Math.max(0, Math.min(entries.length - 1, fromIndex + Math.round((delta + scrollDelta) / rh)));

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
		[entries.length, onReorder, stopAutoScroll],
	);

	const handleDismissSwipe = useCallback(
		(index: number) => {
			const entry = entries[index];
			if (entry) setRemoveConfirmEntry(entry);
		},
		[entries],
	);

	const handleRemoveConfirm = useCallback(() => {
		if (removeConfirmEntry) {
			onRemove(removeConfirmEntry.id);
			setRemoveConfirmEntry(null);
		}
	}, [removeConfirmEntry, onRemove]);

	const handleRemoveCancel = useCallback(() => {
		setRemoveConfirmEntry(null);
	}, []);

	const dropIndicatorTop: number | null = (() => {
		if (dragStateRef.current === null || hoverIndex === null) return null;
		const { fromIndex, rowHeight: rh } = dragStateRef.current;
		if (hoverIndex === fromIndex) return null;
		return hoverIndex < fromIndex ? hoverIndex * rh : (hoverIndex + 1) * rh;
	})();

	const garbageIcon = <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />;

	const handleStartRename = useCallback(() => {
		setRenameValue(playlistName);
		setIsRenaming(true);
		setTimeout(() => renameInputRef.current?.focus(), 50);
	}, [playlistName]);

	const handleRenameConfirm = useCallback(() => {
		const trimmed = renameValue.trim();
		if (trimmed && trimmed !== playlistName) {
			onRename(trimmed);
		}
		setIsRenaming(false);
	}, [renameValue, playlistName, onRename]);

	const handleRenameKeyDown = useCallback(
		(e: React.KeyboardEvent) => {
			if (e.key === "Enter") handleRenameConfirm();
			if (e.key === "Escape") setIsRenaming(false);
		},
		[handleRenameConfirm],
	);

	const handleDeleteClick = useCallback(() => {
		setDeleteConfirmVisible(true);
	}, []);

	const handleDeleteConfirm = useCallback(() => {
		setDeleteConfirmVisible(false);
		onDelete();
	}, [onDelete]);

	const handleDeleteCancel = useCallback(() => {
		setDeleteConfirmVisible(false);
	}, []);

	const renderHeader = () => (
		<div className="playlist-detail__header">
			<button className="playlist-detail__back-btn" onClick={onBack} aria-label="Back to playlists">
				<svg viewBox="0 0 24 24">
					<path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
				</svg>
			</button>

			{isRenaming ? (
				<input
					ref={renameInputRef}
					className="playlist-detail__rename-input"
					value={renameValue}
					onChange={(e) => setRenameValue(e.target.value)}
					onKeyDown={handleRenameKeyDown}
				/>
			) : (
				<span className="playlist-detail__title" onClick={handleStartRename}>
					{playlistName}
				</span>
			)}

			{isRenaming ? (
				<button
					className="playlist-detail__icon-btn playlist-detail__icon-btn--save"
					onClick={handleRenameConfirm}
					aria-label="Save name"
				>
					<svg viewBox="0 0 24 24">
						<path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
					</svg>
				</button>
			) : (
				<button className="playlist-detail__icon-btn" onClick={handleStartRename} aria-label="Rename playlist">
					<svg viewBox="0 0 24 24">
						<path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
					</svg>
				</button>
			)}

			<button
				className="playlist-detail__icon-btn playlist-detail__icon-btn--danger"
				onClick={handleDeleteClick}
				aria-label="Delete playlist"
			>
				<svg viewBox="0 0 24 24">
					<path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
				</svg>
			</button>

			<button className="playlist-detail__add-all-btn" onClick={onAddAllToQueue}>
				<svg viewBox="0 0 24 24">
					<path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z" />
				</svg>
				Add all to queue
			</button>
		</div>
	);

	if (entries.length === 0) {
		return (
			<div className="page">
				{renderHeader()}
				<div className="page--empty" style={{ flex: 1 }}>
					<p className="page__placeholder">No songs in playlist</p>
				</div>
				{deleteConfirmVisible && (
					<div className="party-dialog" onClick={handleDeleteCancel}>
						<div className="party-dialog__box" onClick={(e) => e.stopPropagation()}>
							<div className="party-dialog__title">Delete &ldquo;{playlistName}&rdquo;?</div>
							<div className="party-dialog__buttons">
								<button className="party-dialog__button party-dialog__button--yes" onClick={handleDeleteConfirm}>
									Delete
								</button>
								<button className="party-dialog__button" onClick={handleDeleteCancel}>
									Cancel
								</button>
							</div>
						</div>
					</div>
				)}
			</div>
		);
	}

	return (
		<div className="page">
			{renderHeader()}
			<List
				className="playlist-detail-list"
				listRef={listRef}
				rowComponent={ListRow}
				rowCount={entries.length}
				rowHeight={rowHeight}
				rowProps={{
					entries,
					onSelect,
					headerOffset: 0,
					selectedId: selectedEntryId,
					panelOpen,
					showDragHandle: true,
					onDragStart: handleDragStart,
					onDismissSwipe: handleDismissSwipe,
					dragIndex,
					swipeIcon: garbageIcon,
					swipeBgColor: "#d32f2f",
					onAddToPlaylist,
				}}
				style={{ height: "100%", width: "100%" }}
				onPointerMove={handlePointerMove}
				onPointerUp={handlePointerUp}
				onPointerCancel={handlePointerUp}
			>
				{dropIndicatorTop !== null && (
					<div
						className="playlist-detail__drop-indicator"
						style={{ position: "absolute", top: dropIndicatorTop, left: 0, right: 0 }}
					/>
				)}
			</List>
			{deleteConfirmVisible && (
				<div className="party-dialog" onClick={handleDeleteCancel}>
					<div className="party-dialog__box" onClick={(e) => e.stopPropagation()}>
						<div className="party-dialog__title">Delete &ldquo;{playlistName}&rdquo;?</div>
						<div className="party-dialog__buttons">
							<button className="party-dialog__button party-dialog__button--yes" onClick={handleDeleteConfirm}>
								Delete
							</button>
							<button className="party-dialog__button" onClick={handleDeleteCancel}>
								Cancel
							</button>
						</div>
					</div>
				</div>
			)}
			{removeConfirmEntry && (
				<div className="party-dialog" onClick={handleRemoveCancel}>
					<div className="party-dialog__box" onClick={(e) => e.stopPropagation()}>
						<div className="party-dialog__title">Remove &ldquo;{removeConfirmEntry.song}&rdquo; from playlist?</div>
						<div className="party-dialog__buttons">
							<button className="party-dialog__button party-dialog__button--yes" onClick={handleRemoveConfirm}>
								Remove
							</button>
							<button className="party-dialog__button" onClick={handleRemoveCancel}>
								Cancel
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
