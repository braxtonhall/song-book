import { RowComponentProps } from 'react-window';
import { Entry } from '../types';
import { EntryRow } from './EntryRow';
import { SortHeader, SortBy } from './SortHeader';

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
};

export function ListRow({
	ariaAttributes, index, style,
	entries, onSelect, headerOffset,
	sortBy, onSortChange,
	selectedId, panelOpen,
	onAddToQueue, onSwipeChange,
	showDragHandle, onDragStart,
	showDismissButton, onDismiss, onDismissSwipe,
	dragIndex,
}: RowComponentProps<ListRowProps>) {
	if (headerOffset === 1 && index === 0 && sortBy && onSortChange) {
		return <SortHeader style={style} sortBy={sortBy} onSortChange={onSortChange} />;
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
		/>
	);
}
