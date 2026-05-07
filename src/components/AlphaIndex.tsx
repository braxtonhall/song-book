import React, { useState, useRef, useCallback, useMemo } from "react";
import { ListImperativeAPI } from "react-window";
import { useGlobalPointerCancel } from "../hooks/useGlobalPointerCancel";
import { useLandscape } from "../hooks/useLandscape";
import { IndexEntry } from "../types";
import "./AlphaIndex.css";

function findNearestPresent(entries: IndexEntry[], idx: number): IndexEntry | null {
	for (let d = 0; d < entries.length; d++) {
		const up = idx + d;
		const down = idx - d;
		if (up < entries.length && entries[up].present !== false) return entries[up];
		if (down >= 0 && entries[down].present !== false) return entries[down];
	}
	return null;
}

export function AlphaIndex({
	listRef,
	indexEntries,
	scrollVisible,
	currentLabels,
}: {
	listRef: React.RefObject<ListImperativeAPI>;
	indexEntries: IndexEntry[];
	scrollVisible: boolean;
	currentLabels: Set<string>;
}) {
	const [active, setActive] = useState<{ entry: IndexEntry; y: number } | null>(null);
	const [hovered, setHovered] = useState(false);
	const landscape = useLandscape();
	const stripRef = useRef<HTMLDivElement>(null);
	const isDragging = useRef(false);
	const visible = landscape || scrollVisible || hovered || !!active;
	const entries = useMemo(() => (indexEntries.length > 0 ? indexEntries : []), [indexEntries]);

	const entryAtY = useCallback(
		(clientY: number) => {
			const rect = stripRef.current?.getBoundingClientRect();
			if (!rect || entries.length === 0) return;
			const PADDING = 8;
			const contentH = rect.height - PADDING * 2;
			const contentY = Math.max(0, Math.min(contentH, clientY - rect.top - PADDING));
			const clampedIdx = Math.min(Math.floor((contentY / contentH) * entries.length), entries.length - 1);
			const entry = entries[clampedIdx];
			const scrollEntry = entry.present === false ? findNearestPresent(entries, clampedIdx) : entry;
			if (scrollEntry) {
				listRef.current?.scrollToRow({ index: scrollEntry.index, align: "start", behavior: "instant" });
			}
			setActive({ entry, y: clientY });
		},
		[listRef, entries],
	);

	const handlePointerDown = useCallback(
		(e: React.PointerEvent<HTMLDivElement>) => {
			e.preventDefault();
			stripRef.current?.setPointerCapture(e.pointerId);
			isDragging.current = true;
			entryAtY(e.clientY);
		},
		[entryAtY],
	);

	const handlePointerMove = useCallback(
		(e: React.PointerEvent<HTMLDivElement>) => {
			if (!isDragging.current) return;
			entryAtY(e.clientY);
		},
		[entryAtY],
	);

	const handlePointerUp = useCallback(() => {
		if (!isDragging.current) {
			return;
		}
		isDragging.current = false;
		setActive(null);
	}, []);

	useGlobalPointerCancel(handlePointerUp);

	return (
		<div className="alpha-wrapper">
			{active && (
				<div className="alpha-bubble" style={{ top: active.y, transform: "translateY(-50%) rotate(45deg)" }}>
					<div className="alpha-bubble__content">{active.entry.bubble}</div>
				</div>
			)}
			<div
				ref={stripRef}
				className={`alpha-strip${visible ? " alpha-strip--visible" : ""}${active ? " alpha-strip--active" : ""}`}
				onMouseEnter={() => setHovered(true)}
				onMouseLeave={() => setHovered(false)}
				onPointerDown={handlePointerDown}
				onPointerMove={handlePointerMove}
				onPointerUp={handlePointerUp}
				onPointerCancel={handlePointerUp}
			>
				{entries.map((entry) => (
					<span
						key={entry.label}
						className={`alpha-letter${active?.entry.label === entry.label ? " alpha-letter--active" : currentLabels.has(entry.label) ? " alpha-letter--current" : ""}${entry.present === false ? " alpha-letter--missing" : ""}`}
					>
						{entry.label}
					</span>
				))}
			</div>
		</div>
	);
}
