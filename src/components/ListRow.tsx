import { RowComponentProps } from "react-window";
import { Entry, AugmentedItem, InstrumentKey } from "../types";
import { EntryRow } from "./EntryRow";
import { SortHeader, SortBy } from "./SortHeader";
import { DifficultyRow } from "./DifficultyRow";

export type ListRowProps = {
	entries: Entry[];
	onSelect: (entry: Entry) => void;
	headerOffset: number;
	sortBy?: SortBy;
	onSortChange?: (s: SortBy) => void;
	selectedId: number | null;
	panelOpen: boolean;
	onAddToQueue?: (entry: Entry) => void;
	onSwipeChange?: (active: boolean) => void;
	showDragHandle?: boolean;
	onDragStart?: (index: number, e: React.PointerEvent) => void;
	showDismissButton?: boolean;
	onDismiss?: (index: number) => void;
	onDismissSwipe?: (index: number) => void;
	dragIndex?: number | null;
	swipeIcon?: React.ReactNode;
	swipeBgColor?: string;
	showClearHeader?: boolean;
	onClearHistory?: () => void;
	subtitles?: (string | null)[];
	filteredCount?: number;
	totalCount?: number;
	augmentedItems?: AugmentedItem[] | null;
	difficultyKey?: InstrumentKey;
	onDifficultyKeyChange?: (k: InstrumentKey) => void;
};

export function ListRow({
	ariaAttributes,
	index,
	style,
	entries,
	onSelect,
	headerOffset,
	sortBy,
	onSortChange,
	selectedId,
	panelOpen,
	onAddToQueue,
	onSwipeChange,
	showDragHandle,
	onDragStart,
	showDismissButton,
	onDismiss,
	onDismissSwipe,
	dragIndex,
	swipeIcon,
	swipeBgColor,
	showClearHeader,
	onClearHistory,
	subtitles,
	filteredCount,
	totalCount,
	augmentedItems,
	difficultyKey,
	onDifficultyKeyChange,
}: RowComponentProps<ListRowProps>) {
	if (headerOffset === 1 && index === 0 && sortBy && onSortChange) {
		return (
			<SortHeader
				style={style}
				sortBy={sortBy}
				onSortChange={onSortChange}
				filteredCount={filteredCount ?? 0}
				totalCount={totalCount ?? 0}
				difficultyKey={difficultyKey}
				onDifficultyKeyChange={onDifficultyKeyChange}
			/>
		);
	}
	if (headerOffset === 1 && index === 0 && showClearHeader && onClearHistory) {
		return (
			<div className="history-clear-header" style={style}>
				<button className="history-clear-button" onClick={onClearHistory}>
					<svg className="history-clear-icon" viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
						<path
							d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"
							fill="currentColor"
						/>
					</svg>
					Clear History
				</button>
			</div>
		);
	}
	if (augmentedItems) {
		const item = augmentedItems[index - headerOffset];
		if (!item) return null;
		if (item._type === "difficulty-header") {
			return <DifficultyRow value={item.difficulty} style={style} />;
		}
		const entry = item.entry;
		const isSelected = panelOpen && entry.id === selectedId;
		return (
			<EntryRow
				ariaAttributes={ariaAttributes}
				index={index - headerOffset}
				style={style}
				entries={entries}
				onSelect={onSelect}
				isSelected={isSelected}
				onAddToQueue={onAddToQueue}
				onSwipeChange={onSwipeChange}
				showDragHandle={showDragHandle}
				onDragStart={onDragStart}
				showDismissButton={showDismissButton}
				onDismiss={onDismiss}
				onDismissSwipe={onDismissSwipe}
				isDragging={dragIndex === index - headerOffset}
				swipeIcon={swipeIcon}
				swipeBgColor={swipeBgColor}
				subtitles={subtitles}
			/>
		);
	}
	const adjustedIndex = index - headerOffset;
	const entry = entries[adjustedIndex];
	if (!entry) return null;
	const isSelected = panelOpen && entry.id === selectedId;
	return (
		<EntryRow
			ariaAttributes={ariaAttributes}
			index={adjustedIndex}
			style={style}
			entries={entries}
			onSelect={onSelect}
			isSelected={isSelected}
			onAddToQueue={onAddToQueue}
			onSwipeChange={onSwipeChange}
			showDragHandle={showDragHandle}
			onDragStart={onDragStart}
			showDismissButton={showDismissButton}
			onDismiss={onDismiss}
			onDismissSwipe={onDismissSwipe}
			isDragging={dragIndex === adjustedIndex}
			swipeIcon={swipeIcon}
			swipeBgColor={swipeBgColor}
			subtitles={subtitles}
		/>
	);
}
