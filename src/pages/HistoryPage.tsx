import React, { useState, useCallback, useMemo, useEffect } from "react";
import { List, useListRef } from "react-window";
import { Entry } from "../types";
import { HistoryEntry } from "../partyTypes";
import { ListRow } from "../components/ListRow";
import "./Page.css";
import "./HistoryPage.css";

const CLEAR_HEADER_HEIGHT = 44;

interface HistoryPageProps {
	history: HistoryEntry[];
	onRemove: (uuid: string) => void;
	onClear: () => void;
	onSelect: (entry: Entry) => void;
	selectedEntryId: number | null;
	panelOpen: boolean;
	onAddToPlaylist?: (entry: Entry) => void;
	onBack: () => void;
}

function computeRowHeight() {
	const rows = window.innerWidth > window.innerHeight ? 12 : 8;
	return Math.round(window.innerHeight / rows);
}

const garbageIcon = <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />;

export function HistoryPage({
	history,
	onRemove,
	onClear,
	onSelect,
	selectedEntryId,
	panelOpen,
	onAddToPlaylist,
	onBack,
}: HistoryPageProps) {
	const listRef = useListRef(null);
	const [rowHeight, setRowHeight] = useState(computeRowHeight);
	const [confirmVisible, setConfirmVisible] = useState(false);

	useEffect(() => {
		const handler = () => setRowHeight(computeRowHeight());
		window.addEventListener("resize", handler);
		return () => window.removeEventListener("resize", handler);
	}, []);

	const reversedHistory = useMemo(() => [...history].reverse(), [history]);
	const entries = useMemo(() => reversedHistory.map((he) => he.entry), [reversedHistory]);

	const handleSwipeChange = useCallback(
		(active: boolean) => {
			const el = listRef.current?.element;
			if (!el) return;
			el.style.overflow = active ? "hidden" : "auto";
		},
		[listRef],
	);

	const handleDismissSwipe = useCallback(
		(index: number) => {
			const entry = reversedHistory[index];
			if (entry) onRemove(entry.uuid);
		},
		[reversedHistory, onRemove],
	);

	const handleClearClick = useCallback(() => {
		setConfirmVisible(true);
	}, []);

	const handleClearConfirm = useCallback(() => {
		setConfirmVisible(false);
		onClear();
	}, [onClear]);

	const handleClearCancel = useCallback(() => {
		setConfirmVisible(false);
	}, []);

	const rowHeightFn = useCallback((index: number) => (index === 0 ? CLEAR_HEADER_HEIGHT : rowHeight), [rowHeight]);

	const renderHeader = () => (
		<div className="history-header">
			<button className="history-header__back-btn" onClick={onBack} aria-label="Back to queue">
				<svg viewBox="0 0 24 24">
					<path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
				</svg>
			</button>
			<span className="history-header__title">History</span>
		</div>
	);

	if (history.length === 0) {
		return (
			<div className="page">
				{renderHeader()}
				<div className="page--empty" style={{ flex: 1 }}>
					<p className="page__placeholder">No history</p>
				</div>
			</div>
		);
	}

	return (
		<div className="page">
			{renderHeader()}
			<div className="history-page">
				<List
					className="history-list"
					listRef={listRef}
					rowComponent={ListRow}
					rowCount={entries.length + 1}
					rowHeight={rowHeightFn}
					rowProps={{
						entries,
						onSelect,
						headerOffset: 1,
						selectedId: selectedEntryId,
						panelOpen,
						onDismissSwipe: handleDismissSwipe,
						onSwipeChange: handleSwipeChange,
						swipeIcon: garbageIcon,
						swipeBgColor: "#d32f2f",
						showClearHeader: true,
						onClearHistory: handleClearClick,
						onAddToPlaylist,
					}}
					style={{ height: "100%", width: "100%" }}
				/>
				{confirmVisible && (
					<div className="party-dialog" onClick={handleClearCancel}>
						<div className="party-dialog__box" onClick={(e) => e.stopPropagation()}>
							<div className="party-dialog__title">Clear all history?</div>
							<div className="party-dialog__buttons">
								<button className="party-dialog__button party-dialog__button--yes" onClick={handleClearConfirm}>
									Clear
								</button>
								<button className="party-dialog__button" onClick={handleClearCancel}>
									Cancel
								</button>
							</div>
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
