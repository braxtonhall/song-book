import React, { useState, useRef, useMemo, useCallback, Dispatch, SetStateAction } from "react";
import { createPortal } from "react-dom";
import { Entry, FilterState, DEFAULT_FILTER_STATE, InstrumentKey, isFilterActive } from "../types";
import { Panel } from "./Panel";
import "./FilterPanel.css";
import { useGlobalPointerCancel } from "../hooks/useGlobalPointerCancel";
import { useSources } from "../hooks/useSources";
import { getGenre } from "../utilities/genre";

const MAX_DIFFICULTY = 8;

const INSTRUMENTS: { key: InstrumentKey; label: string; icon: string }[] = [
	{ key: "guitar", label: "Guitar", icon: "guitar.png" },
	{ key: "bass", label: "Bass", icon: "bass.png" },
	{ key: "drums", label: "Drums", icon: "drums.png" },
	{ key: "keys", label: "Keys", icon: "keys.png" },
	{ key: "vocals", label: "Vocals", icon: "vocals.png" },
	{ key: "proGuitar", label: "Pro Guitar", icon: "guitar-plus.png" },
	{ key: "proBass", label: "Pro Bass", icon: "bass-plus.png" },
	{ key: "proKeys", label: "Pro Keys", icon: "keys-plus.png" },
	{ key: "band", label: "Band", icon: "band.png" },
];

const VOCAL_PARTS = [
	{ count: 0, icon: null as string | null, label: "None" },
	{ count: 1, icon: "vocals.png", label: "1" },
	{ count: 2, icon: "vocals-2.png", label: "2" },
	{ count: 3, icon: "vocals-3.png", label: "3" },
];

const TAGS: (keyof Entry)[] = ["multitracks", "master", "2xBass"];

const TAG_LABELS: { [K in keyof Entry]?: string } = {
	multitracks: "Multitracks",
	master: "Master",
	"2xBass": "2x Bass",
};

function DualRangeSlider({
	value,
	onChange,
}: {
	value: [number, number];
	onChange: (value: [number, number]) => void;
}) {
	const [parentLo, parentHi] = value;
	const [drag, setDrag] = useState<{ which: "lo" | "hi"; value: number; fromTrack: boolean } | null>(null);
	const containerRef = useRef<HTMLDivElement>(null);
	const dragRef = useRef(drag);
	dragRef.current = drag;

	const lo = drag?.which === "lo" ? drag.value : parentLo;
	const hi = drag?.which === "hi" ? drag.value : parentHi;

	const getValueAt = useCallback((clientX: number): number => {
		const rect = containerRef.current!.getBoundingClientRect();
		const trackWidth = rect.width - 14;
		return (Math.max(0, Math.min(clientX - rect.left - 7, trackWidth)) / trackWidth) * MAX_DIFFICULTY;
	}, []);

	const onUp = useCallback(() => {
		const d = dragRef.current;
		if (!d) return;
		dragRef.current = null; // prevent double-commit if both container and global listener fire
		const rounded = Math.round(d.value);
		if (d.which === "lo") {
			onChange([Math.max(0, Math.min(rounded, parentHi - 1)), parentHi]);
		} else {
			onChange([parentLo, Math.max(parentLo + 1, Math.min(rounded, MAX_DIFFICULTY))]);
		}
		setDrag(null);
	}, [parentLo, parentHi, onChange]);

	useGlobalPointerCancel(onUp);

	// Fires when pointer lands on the track (visual overlays are pointer-events:none, so events
	// fall through to this container). Snaps the nearest thumb to the tap position.
	const handlePointerDown = useCallback(
		(e: React.PointerEvent<HTMLDivElement>) => {
			e.stopPropagation();
			const tapValue = getValueAt(e.clientX);
			const which: "lo" | "hi" = Math.abs(tapValue - parentLo) <= Math.abs(tapValue - parentHi) ? "lo" : "hi";
			const clamped =
				which === "lo"
					? Math.max(0, Math.min(tapValue, parentHi - 0.01))
					: Math.max(parentLo + 0.01, Math.min(tapValue, MAX_DIFFICULTY));
			setDrag({ which, value: clamped, fromTrack: true });
			containerRef.current!.setPointerCapture(e.pointerId);
		},
		[parentLo, parentHi, getValueAt],
	);

	const handlePointerMove = useCallback(
		(e: React.PointerEvent<HTMLDivElement>) => {
			const d = dragRef.current;
			if (!d?.fromTrack) return;
			const newValue = getValueAt(e.clientX);
			const clamped =
				d.which === "lo"
					? Math.max(0, Math.min(newValue, parentHi - 0.01))
					: Math.max(parentLo + 0.01, Math.min(newValue, MAX_DIFFICULTY));
			setDrag({ which: d.which, value: clamped, fromTrack: true });
		},
		[parentLo, parentHi, getValueAt],
	);

	// Native input onChange drives drag updates when the user grabs a thumb directly
	const handleChange = (which: "lo" | "hi") => (e: React.ChangeEvent<HTMLInputElement>) => {
		const raw = +e.target.value;
		const clamped =
			which === "lo"
				? Math.max(0, Math.min(raw, parentHi - 0.01))
				: Math.max(parentLo + 0.01, Math.min(raw, MAX_DIFFICULTY));
		setDrag({ which, value: clamped, fromTrack: false });
	};

	const popupDifficulty = drag
		? drag.which === "lo"
			? Math.max(0, Math.min(Math.round(drag.value), parentHi - 1))
			: Math.max(Math.round(parentLo), Math.round(drag.value) - 1)
		: null;

	const popupPortal = (() => {
		if (!drag || popupDifficulty == null || !containerRef.current) return null;
		const rect = containerRef.current.getBoundingClientRect();
		const trackWidth = rect.width - 14;
		const style: React.CSSProperties = {
			position: "fixed",
			left: rect.left + 7 + (drag.value / MAX_DIFFICULTY) * trackWidth,
			bottom: window.innerHeight - rect.top + 7,
			transform: "translateX(-50%)",
			zIndex: 300,
		};
		return createPortal(
			<div className="dual-range__popup" style={style}>
				{popupDifficulty === 0 ? (
					<span className="dual-range__popup-none">No Part</span>
				) : (
					<span className="dual-range__popup-dots">
						{Array.from({ length: 5 }).map((_, i) => (
							<span
								key={i}
								className={`dual-range__popup-dot${i < popupDifficulty - 1 ? (popupDifficulty === 7 ? " dual-range__popup-dot--red" : " dual-range__popup-dot--filled") : ""}`}
							/>
						))}
					</span>
				)}
			</div>,
			document.body,
		);
	})();

	return (
		<>
			<div
				className="dual-range"
				ref={containerRef}
				onPointerDown={handlePointerDown}
				onPointerMove={handlePointerMove}
				onPointerUp={onUp}
				onPointerCancel={onUp}
			>
				<div className="dual-range__track" aria-hidden />
				<div
					className="dual-range__fill"
					style={{
						left: `calc(7px + (100% - 14px) * ${lo} / ${MAX_DIFFICULTY})`,
						width: `calc((100% - 14px) * ${hi - lo} / ${MAX_DIFFICULTY})`,
					}}
				/>
				<div className="dual-range__segments" aria-hidden>
					{Array.from({ length: MAX_DIFFICULTY }, (_, i) => (
						<div key={i} className="dual-range__segment" />
					))}
				</div>
				<input
					type="range"
					className="dual-range__input dual-range__input--lo"
					style={{ zIndex: drag?.which === "lo" ? 2 : undefined }}
					min={0}
					max={MAX_DIFFICULTY}
					step="any"
					value={lo}
					onChange={handleChange("lo")}
					onPointerDown={(e) => {
						e.stopPropagation();
						setDrag({ which: "lo", value: lo, fromTrack: false });
					}}
				/>
				<input
					type="range"
					className="dual-range__input dual-range__input--hi"
					style={{ zIndex: drag?.which === "hi" ? 2 : undefined }}
					min={0}
					max={MAX_DIFFICULTY}
					step="any"
					value={hi}
					onChange={handleChange("hi")}
					onPointerDown={(e) => {
						e.stopPropagation();
						setDrag({ which: "hi", value: hi, fromTrack: false });
					}}
				/>
			</div>
			{popupPortal}
		</>
	);
}

function InstrumentRow({
	instrument,
	value,
	onChange,
}: {
	instrument: { key: InstrumentKey; label: string; icon: string };
	value: [number, number];
	onChange: (value: [number, number]) => void;
}) {
	const [lo, hi] = value;
	const isFiltered = lo !== 0 || hi !== MAX_DIFFICULTY;

	const toggleDifficulty = () => {
		if (isFiltered) {
			onChange([0, MAX_DIFFICULTY]);
		} else {
			onChange([1, MAX_DIFFICULTY]);
		}
	};

	return (
		<div className={`instrument-row${isFiltered ? " instrument-row--active" : ""}`}>
			<button
				className="instrument-row__label"
				onPointerDown={(e) => e.stopPropagation()}
				onClick={toggleDifficulty}
				type="button"
			>
				<img className="instrument-row__icon" src={`${process.env.PUBLIC_URL}/icons/${instrument.icon}`} alt="" />
				<span className="instrument-row__name">{instrument.label}</span>
			</button>
			<DualRangeSlider value={value} onChange={onChange} />
		</div>
	);
}

function FilterChip({
	active,
	onClick,
	children,
}: {
	active: boolean;
	onClick: () => void;
	children: React.ReactNode;
}) {
	return (
		<button
			className={`filter-chip${active ? " filter-chip--active" : ""}`}
			onClick={onClick}
			type="button"
			onPointerDown={(e) => e.stopPropagation()}
		>
			{children}
		</button>
	);
}

type SectionId = "vocalParts" | "difficulty" | "genre" | "source" | "decades" | "tags";

function FilterSection({
	id,
	label,
	hasActiveFilters,
	onClear,
	open,
	onToggle,
	children,
}: {
	id: SectionId;
	label: string;
	hasActiveFilters: boolean;
	onClear: () => void;
	open: boolean;
	onToggle: (id: SectionId) => void;
	children: React.ReactNode;
}) {
	return (
		<div className={`filter-section${open ? " filter-section--open" : ""}`}>
			<div
				className="filter-section__header-row"
				onClick={() => onToggle(id)}
				onPointerDown={(e) => e.stopPropagation()}
				role="button"
				tabIndex={0}
				onKeyDown={(e) => {
					if (e.key === "Enter" || e.key === " ") onToggle(id);
				}}
			>
				<span className="filter-section__label">
					{label}
					{hasActiveFilters && !open && <span className="filter-section__dot" />}
				</span>
				<span className="filter-section__header-right">
					{hasActiveFilters && (
						<button
							className="filter-section__clear-link"
							onClick={(e) => {
								e.stopPropagation();
								onClear();
							}}
							type="button"
						>
							Clear
						</button>
					)}
					<svg
						className={`filter-section__chevron${open ? " filter-section__chevron--open" : ""}`}
						viewBox="0 0 16 16"
						fill="none"
					>
						<path
							d="M4 6l4 4 4-4"
							stroke="currentColor"
							strokeWidth="1.5"
							strokeLinecap="round"
							strokeLinejoin="round"
						/>
					</svg>
				</span>
			</div>
			<div className="filter-section__body">{children}</div>
		</div>
	);
}

export function FilterPanel({
	dismissed,
	onDismiss,
	onRestore,
	isLandscape,
	entries,
	filterState,
	onFilterChange,
}: {
	dismissed: boolean;
	onDismiss: () => void;
	onRestore?: () => void;
	isLandscape: boolean;
	entries: Entry[];
	filterState: FilterState;
	onFilterChange: Dispatch<SetStateAction<FilterState>>;
}) {
	const { get: getSource } = useSources();
	const genres = useMemo(
		() =>
			[...new Set(entries.map((e) => e.genre))]
				.map((id) => ({ id, name: getGenre(id) }))
				.sort((a, b) => a.name.localeCompare(b.name)),
		[entries],
	);
	const sources = useMemo(
		() =>
			[...new Set(entries.map((e) => e.source))]
				.map((source) => getSource(source))
				.sort((a, b) => a.name.localeCompare(b.name)),
		[entries, getSource],
	);
	console.log(sources);
	const decades = useMemo(
		() => [...new Set(entries.map((e) => Math.floor(e.year / 10) * 10).filter((d) => d >= 1950))].sort(),
		[entries],
	);

	const active = isFilterActive(filterState);

	const isDifficultyFiltered = (Object.keys(filterState.difficulty) as InstrumentKey[]).some(
		(key) => filterState.difficulty[key][0] !== 0 || filterState.difficulty[key][1] !== MAX_DIFFICULTY,
	);

	const setDifficulty = useCallback(
		(key: InstrumentKey, value: [number, number]) => {
			onFilterChange((prev) => ({
				...prev,
				difficulty: { ...prev.difficulty, [key]: value },
			}));
		},
		[onFilterChange],
	);

	const toggleVocalPart = useCallback(
		(count: number) => {
			onFilterChange((prev) => {
				const parts = prev.vocalParts.includes(count)
					? prev.vocalParts.filter((p) => p !== count)
					: [...prev.vocalParts, count];
				return { ...prev, vocalParts: parts };
			});
		},
		[onFilterChange],
	);

	const toggleTag = useCallback(
		(tag: keyof Entry) => {
			onFilterChange((prev) => {
				const current = prev.tags[tag] ?? null;
				const next: boolean | null = current === null ? true : current === true ? false : null;
				return { ...prev, tags: { ...prev.tags, [tag]: next } };
			});
		},
		[onFilterChange],
	);

	const isTagFiltered = Object.values(filterState.tags).some((v) => v !== null);

	const [openSection, setOpenSection] = useState<SectionId | null>(null);

	const toggleSection = useCallback((id: SectionId) => {
		setOpenSection((prev) => (prev === id ? null : id));
	}, []);

	return (
		<Panel dismissed={dismissed} onDismiss={onDismiss} onRestore={onRestore} isLandscape={isLandscape}>
			<div className="filter-panel">
				<div className="filter-panel__header">
					<h2 className="filter-panel__title">Filters</h2>
					{active && (
						<button
							className="filter-panel__clear-all"
							onClick={() => onFilterChange(DEFAULT_FILTER_STATE)}
							type="button"
							onPointerDown={(e) => e.stopPropagation()}
						>
							Clear all
						</button>
					)}
				</div>

				<FilterSection
					id="vocalParts"
					label="Vocal Parts"
					hasActiveFilters={filterState.vocalParts.length > 0}
					onClear={() => onFilterChange((prev) => ({ ...prev, vocalParts: [] }))}
					open={openSection === "vocalParts"}
					onToggle={toggleSection}
				>
					<div className="filter-chip-row" onPointerDown={(e) => e.stopPropagation()}>
						{VOCAL_PARTS.map(({ count, icon, label }) => (
							<FilterChip
								key={count}
								active={filterState.vocalParts.includes(count)}
								onClick={() => toggleVocalPart(count)}
							>
								{icon && <img className="filter-chip__icon" src={`${process.env.PUBLIC_URL}/icons/${icon}`} alt="" />}
								{label}
							</FilterChip>
						))}
					</div>
				</FilterSection>

				<FilterSection
					id="difficulty"
					label="Difficulty"
					hasActiveFilters={isDifficultyFiltered}
					onClear={() => onFilterChange((prev) => ({ ...prev, difficulty: DEFAULT_FILTER_STATE.difficulty }))}
					open={openSection === "difficulty"}
					onToggle={toggleSection}
				>
					<div className="instrument-list" onPointerDown={(e) => e.stopPropagation()}>
						{INSTRUMENTS.map((inst) => (
							<InstrumentRow
								key={inst.key}
								instrument={inst}
								value={filterState.difficulty[inst.key]}
								onChange={(v) => setDifficulty(inst.key, v)}
							/>
						))}
					</div>
				</FilterSection>

				<FilterSection
					id="genre"
					label="Genre"
					hasActiveFilters={filterState.genres.length > 0}
					onClear={() => onFilterChange((prev) => ({ ...prev, genres: [] }))}
					open={openSection === "genre"}
					onToggle={toggleSection}
				>
					<div className="checklist" onPointerDown={(e) => e.stopPropagation()}>
						{genres.map((item) => (
							<label key={item.id} className="checklist__item">
								<input
									type="checkbox"
									className="checklist__checkbox"
									checked={filterState.genres.includes(item.id)}
									onChange={() => {
										onFilterChange((prev) => ({
											...prev,
											genres: prev.genres.includes(item.id)
												? prev.genres.filter((s) => s !== item.id)
												: [...prev.genres, item.id],
										}));
									}}
								/>
								<span className="checklist__text">{item.name}</span>
							</label>
						))}
					</div>
				</FilterSection>

				<FilterSection
					id="source"
					label="Source"
					hasActiveFilters={filterState.sources.length > 0}
					onClear={() => onFilterChange((prev) => ({ ...prev, sources: [] }))}
					open={openSection === "source"}
					onToggle={toggleSection}
				>
					<div className="checklist" onPointerDown={(e) => e.stopPropagation()}>
						{sources.map((source) => (
							<label key={source.id} className="checklist__item">
								<input
									type="checkbox"
									className="checklist__checkbox"
									checked={filterState.sources.includes(source.id)}
									onChange={() => {
										onFilterChange((prev) => ({
											...prev,
											sources: prev.sources.includes(source.id)
												? prev.sources.filter((s) => s !== source.id)
												: [...prev.sources, source.id],
										}));
									}}
								/>
								<span className="checklist__text">{source.name}</span>
							</label>
						))}
					</div>
				</FilterSection>

				<FilterSection
					id="decades"
					label="Decade"
					hasActiveFilters={filterState.decades.length > 0}
					onClear={() => onFilterChange((prev) => ({ ...prev, decades: [] }))}
					open={openSection === "decades"}
					onToggle={toggleSection}
				>
					<div className="checklist" onPointerDown={(e) => e.stopPropagation()}>
						{decades.map((decade) => (
							<label key={decade} className="checklist__item">
								<input
									type="checkbox"
									className="checklist__checkbox"
									checked={filterState.decades.includes(decade)}
									onChange={() => {
										onFilterChange((prev) => ({
											...prev,
											decades: prev.decades.includes(decade)
												? prev.decades.filter((d) => d !== decade)
												: [...prev.decades, decade],
										}));
									}}
								/>
								<span className="checklist__text">{decade}s</span>
							</label>
						))}
					</div>
				</FilterSection>

				<FilterSection
					id="tags"
					label="Tags"
					hasActiveFilters={isTagFiltered}
					onClear={() => onFilterChange((prev) => ({ ...prev, tags: {} }))}
					open={openSection === "tags"}
					onToggle={toggleSection}
				>
					<div className="filter-chip-row" onPointerDown={(e) => e.stopPropagation()}>
						{TAGS.map((tag) => {
							const val = filterState.tags[tag] ?? null;
							return (
								<button
									key={tag}
									className={`filter-chip tag-chip${val !== null ? " filter-chip--active" : ""}${val === true ? " tag-chip--on" : ""}${val === false ? " tag-chip--off" : ""}`}
									onClick={() => toggleTag(tag)}
									type="button"
									onPointerDown={(e) => e.stopPropagation()}
								>
									{val === true && (
										<svg className="tag-chip__icon" viewBox="0 0 16 16" fill="none">
											<path
												d="M3 8l3 3 7-7"
												stroke="currentColor"
												strokeWidth="2"
												strokeLinecap="round"
												strokeLinejoin="round"
											/>
										</svg>
									)}
									{val === false && (
										<svg className="tag-chip__icon" viewBox="0 0 16 16" fill="none">
											<path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
										</svg>
									)}
									{val === null && (
										<svg className="tag-chip__icon" viewBox="0 0 16 16" fill="none">
											<circle cx="4" cy="8" r="1.5" fill="currentColor" />
											<circle cx="8" cy="8" r="1.5" fill="currentColor" />
											<circle cx="12" cy="8" r="1.5" fill="currentColor" />
										</svg>
									)}
									{TAG_LABELS[tag]}
								</button>
							);
						})}
					</div>
				</FilterSection>
			</div>
		</Panel>
	);
}
