import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import './SortHeader.css';

export type SortBy = 'song' | 'artist';

const SORT_LABELS: Record<SortBy, string> = {
	song: 'Song Title',
	artist: 'Artist Name',
};

const SORT_OPTIONS: SortBy[] = ['song', 'artist'];

export function SortHeader({
	style,
	sortBy,
	onSortChange,
}: {
	style: React.CSSProperties;
	sortBy: SortBy;
	onSortChange: (s: SortBy) => void;
}) {
	const [menuOpen, setMenuOpen] = useState(false);
	const [menuPos, setMenuPos] = useState<{top: number; left: number} | null>(null);
	const containerRef = useRef<HTMLDivElement>(null);
	const menuRef = useRef<HTMLDivElement>(null);

	const handleButtonClick = (e: React.MouseEvent<HTMLButtonElement>) => {
		if (menuOpen) {
			setMenuOpen(false);
		} else {
			const rect = e.currentTarget.getBoundingClientRect();
			setMenuPos({top: rect.bottom + 4, left: rect.left});
			setMenuOpen(true);
		}
	};

	useEffect(() => {
		if (!menuOpen) return;
		const handler = (e: MouseEvent) => {
			if (!containerRef.current?.contains(e.target as Node) && !menuRef.current?.contains(e.target as Node)) {
				setMenuOpen(false);
			}
		};
		document.addEventListener('mousedown', handler);
		return () => document.removeEventListener('mousedown', handler);
	}, [menuOpen]);

	return (
		<div ref={containerRef} className="sort-header" style={style}>
			<button className="sort-button" onClick={handleButtonClick}>
				<svg className="sort-icon" viewBox="0 0 20 20" fill="none">
					<path d="M3 5h14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
					<path d="M3 10h9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
					<path d="M3 15h5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
				</svg>
				Sorted by {SORT_LABELS[sortBy]}
			</button>
			{menuOpen && menuPos && ReactDOM.createPortal(
				<div ref={menuRef} className="sort-menu" style={{top: menuPos.top, left: menuPos.left}}>
					{SORT_OPTIONS.map(option => (
						<button
							key={option}
							className={`sort-menu-item${option === sortBy ? ' sort-menu-item--active' : ''}`}
							onClick={() => {
								onSortChange(option);
								setMenuOpen(false);
							}}
						>
							{SORT_LABELS[option]}
						</button>
					))}
				</div>,
				document.body,
			)}
		</div>
	);
}
