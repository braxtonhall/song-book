import { RowComponentProps } from 'react-window';
import { Entry } from '../stub/entries';
import { EntryRow } from './EntryRow';
import { SortHeader, SortBy } from './SortHeader';

export type ListRowProps = {
	entries: Entry[];
	onSelect: (entry: Entry) => void;
	headerOffset: number;
	sortBy: SortBy;
	onSortChange: (s: SortBy) => void;
	selectedId: number | null;
	panelOpen: boolean;
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
}: RowComponentProps<ListRowProps>) {
	if (headerOffset === 1 && index === 0) {
		return <SortHeader style={style} sortBy={sortBy} onSortChange={onSortChange} />;
	}
	const adjustedIndex = index - headerOffset;
	const isSelected = panelOpen && entries[adjustedIndex]?.id === selectedId;
	return (
		<EntryRow ariaAttributes={ariaAttributes} index={adjustedIndex} style={style} entries={entries} onSelect={onSelect} isSelected={isSelected} />
	);
}
