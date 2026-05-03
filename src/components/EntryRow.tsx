import { RowComponentProps } from 'react-window';
import { Entry } from '../stub/entries';
import './EntryRow.css';

export type EntryRowProps = { entries: Entry[]; onSelect: (entry: Entry) => void; isSelected?: boolean };

export function EntryRow({ ariaAttributes, index, style, entries, onSelect, isSelected }: RowComponentProps<EntryRowProps>) {
  const entry = entries[index];
  const { song, artist, hex, albumArt } = entry;
  return (
    <div {...ariaAttributes} style={style} className="entry-row" onClick={() => onSelect(entry)}>
      <div className="entry-avatar" style={{ backgroundColor: hex }} >
        {albumArt && <img src={`${process.env.PUBLIC_URL}/art/${albumArt}.png`}></img>}
      </div>
      <div className="entry-text">
        <span className={`entry-title${isSelected ? ' entry-title--selected' : ''}`}>{song}</span>
        <span className="entry-artist">{artist}</span>
      </div>
    </div>
  );
}
