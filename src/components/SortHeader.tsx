import React, { useState, useEffect, useRef } from "react";
import ReactDOM from "react-dom";
import { InstrumentKey, INSTRUMENT_LABELS } from "../types";
import "./SortHeader.css";

export type SortBy = "song" | "artist" | "difficulty";

const SORT_LABELS: Record<SortBy, string> = {
	song: "Song Title",
	artist: "Artist Name",
	difficulty: "Difficulty",
};

const SORT_OPTIONS: SortBy[] = ["song", "artist", "difficulty"];

const DIFFICULTY_INSTRUMENTS: InstrumentKey[] = [
	"band",
	"guitar",
	"bass",
	"drums",
	"keys",
	"vocals",
	"proGuitar",
	"proBass",
	"proKeys",
];

function pluralize(n: number) {
	return n === 1 ? "song" : "songs";
}

export function SortHeader({
	style,
	sortBy,
	onSortChange,
	filteredCount,
	totalCount,
	difficultyKey,
	onDifficultyKeyChange,
}: {
	style: React.CSSProperties;
	sortBy: SortBy;
	onSortChange: (s: SortBy) => void;
	filteredCount: number;
	totalCount: number;
	difficultyKey?: InstrumentKey;
	onDifficultyKeyChange?: (k: InstrumentKey) => void;
}) {
	const [menuOpen, setMenuOpen] = useState(false);
	const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null);
	const [instMenuOpen, setInstMenuOpen] = useState(false);
	const [instMenuPos, setInstMenuPos] = useState<{ top: number; left: number } | null>(null);
	const containerRef = useRef<HTMLDivElement>(null);
	const menuRef = useRef<HTMLDivElement>(null);
	const instMenuRef = useRef<HTMLDivElement>(null);
	const instBtnRef = useRef<HTMLButtonElement>(null);

	const instrument = difficultyKey ?? "band";

	const countText =
		filteredCount === totalCount
			? `${filteredCount} ${pluralize(filteredCount)} sorted by `
			: `${filteredCount} of ${totalCount} ${pluralize(totalCount)} sorted by `;

	const handleButtonClick = (e: React.MouseEvent<HTMLButtonElement>) => {
		if (menuOpen) {
			setMenuOpen(false);
		} else {
			const rect = e.currentTarget.getBoundingClientRect();
			setMenuPos({ top: rect.bottom + 4, left: rect.left });
			setMenuOpen(true);
		}
	};

	const handleInstButtonClick = (e: React.MouseEvent<HTMLButtonElement>) => {
		e.stopPropagation();
		if (instMenuOpen) {
			setInstMenuOpen(false);
		} else {
			const rect = e.currentTarget.getBoundingClientRect();
			setInstMenuPos({ top: rect.bottom + 4, left: rect.left });
			setInstMenuOpen(true);
		}
	};

	useEffect(() => {
		if (!menuOpen && !instMenuOpen) return;
		const handler = (e: MouseEvent | TouchEvent) => {
			const target = "touches" in e ? (e as TouchEvent).touches[0]?.target : (e as MouseEvent).target;
			if (!menuRef.current?.contains(target as Node) && !instMenuRef.current?.contains(target as Node)) {
				setMenuOpen(false);
				setInstMenuOpen(false);
			}
		};
		document.addEventListener("mousedown", handler);
		document.addEventListener("touchstart", handler);
		return () => {
			document.removeEventListener("mousedown", handler);
			document.removeEventListener("touchstart", handler);
		};
	}, [menuOpen, instMenuOpen]);

	return (
		<div ref={containerRef} className="sort-header" style={style}>
			<svg className="sort-icon" viewBox="0 0 20 20" fill="none">
				<path d="M3 5h14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
				<path d="M3 10h9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
				<path d="M3 15h5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
			</svg>
			<span className="sort-count">{countText}</span>
			<button className="sort-inst-button" onClick={handleButtonClick}>
				{SORT_LABELS[sortBy]}
			</button>
			{sortBy === "difficulty" && onDifficultyKeyChange && (
				<>
					<span className="sort-header-sep">·</span>
					<button ref={instBtnRef} className="sort-inst-button" onClick={handleInstButtonClick}>
						{INSTRUMENT_LABELS[instrument]}
					</button>
				</>
			)}
			{menuOpen &&
				menuPos &&
				ReactDOM.createPortal(
					<div ref={menuRef} className="sort-menu" style={{ top: menuPos.top, left: menuPos.left }}>
						{SORT_OPTIONS.map((option) => (
							<button
								key={option}
								className={`sort-menu-item${option === sortBy ? " sort-menu-item--active" : ""}`}
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
			{instMenuOpen &&
				instMenuPos &&
				onDifficultyKeyChange &&
				ReactDOM.createPortal(
					<div ref={instMenuRef} className="sort-menu" style={{ top: instMenuPos.top, left: instMenuPos.left }}>
						{DIFFICULTY_INSTRUMENTS.map((inst) => (
							<button
								key={inst}
								className={`sort-menu-item${inst === instrument ? " sort-menu-item--active" : ""}`}
								onClick={() => {
									onDifficultyKeyChange(inst);
									setInstMenuOpen(false);
								}}
							>
								{INSTRUMENT_LABELS[inst]}
							</button>
						))}
					</div>,
					document.body,
				)}
		</div>
	);
}
