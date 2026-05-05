import React, { useState, useRef, useCallback } from "react";
import { RowComponentProps } from "react-window";
import { useGlobalPointerCancel } from "../hooks/useGlobalPointerCancel";
import { useVelocityTrace } from "../hooks/useVelocityTrace";
import { Entry } from "../types";
import "./EntryRow.css";

export type EntryRowProps = {
	entries: Entry[];
	onSelect: (entry: Entry) => void;
	isSelected?: boolean;
	onAddToQueue?: (entry: Entry) => void;
	onSwipeChange?: (active: boolean) => void;
	showDragHandle?: boolean;
	onDragStart?: (index: number, e: React.PointerEvent) => void;
	showDismissButton?: boolean;
	onDismiss?: (index: number) => void;
	onDismissSwipe?: (index: number) => void;
	isDragging?: boolean;
	swipeIcon?: React.ReactNode;
	swipeBgColor?: string;
	subtitles?: (string | null)[];
};

const SWIPE_THRESHOLD = 80;

export function EntryRow({
	ariaAttributes,
	index,
	style,
	entries,
	onSelect,
	isSelected,
	onAddToQueue,
	onSwipeChange,
	showDragHandle,
	onDragStart,
	showDismissButton,
	onDismiss,
	onDismissSwipe,
	isDragging,
	swipeIcon: customSwipeIcon,
	swipeBgColor: customSwipeBgColor,
	subtitles,
}: RowComponentProps<EntryRowProps>) {
	const entry = entries[index];

	const [swipeOffset, setSwipeOffset] = useState(0);
	const [isSnapping, setIsSnapping] = useState(false);
	const [crossedThreshold, setCrossedThreshold] = useState(false);
	const swipeStartRef = useRef<{ x: number; y: number } | null>(null);
	const isSwipingRef = useRef(false);
	const suppressNextClickRef = useRef(false);
	const { observePoint, resetPoints } = useVelocityTrace(SWIPE_THRESHOLD);

	const snapBack = useCallback(() => {
		setIsSnapping(true);
		requestAnimationFrame(() => {
			setSwipeOffset(0);
			setTimeout(() => {
				setIsSnapping(false);
				setCrossedThreshold(false);
			}, 250);
		});
	}, []);

	const swipeEnabled = !!(onAddToQueue || onDismissSwipe);
	const isDismiss = !!onDismissSwipe;

	const handlePointerDown = useCallback(
		(e: React.PointerEvent) => {
			swipeStartRef.current = { x: e.clientX, y: e.clientY };
			isSwipingRef.current = false;
			resetPoints();
			observePoint(e);
		},
		[observePoint, resetPoints],
	);

	const handlePointerMove = useCallback(
		(e: React.PointerEvent) => {
			if (!swipeStartRef.current) return;
			const dx = e.clientX - swipeStartRef.current.x;
			const dy = e.clientY - swipeStartRef.current.y;
			if (!isSwipingRef.current) {
				if (Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy)) {
					isSwipingRef.current = true;
					e.currentTarget.setPointerCapture(e.pointerId);
					onSwipeChange?.(true);
				} else {
					return;
				}
			}
			e.preventDefault();
			setIsSnapping(false);
			setSwipeOffset(dx);
			setCrossedThreshold(Math.abs(dx) > SWIPE_THRESHOLD);
			observePoint(e);
		},
		[onSwipeChange, observePoint],
	);

	const handlePointerUp = useCallback(
		(e: { clientX: number; clientY: number; timeStamp: number }) => {
			if (!swipeStartRef.current) return;
			const startX = swipeStartRef.current.x;
			swipeStartRef.current = null;
			if (isSwipingRef.current) {
				isSwipingRef.current = false;
				suppressNextClickRef.current = true;
				onSwipeChange?.(false);
				const dx = e.clientX - startX;
				const { vx: velocity } = observePoint(e);
				if (Math.abs(dx) > SWIPE_THRESHOLD || Math.abs(velocity) > 0.5) {
					setCrossedThreshold(true);
					if (onDismissSwipe) {
						setIsSnapping(true);
						requestAnimationFrame(() => {
							setSwipeOffset(dx > 0 ? window.innerWidth : -window.innerWidth);
							setTimeout(() => {
								onDismissSwipe(index);
								setSwipeOffset(0);
								setIsSnapping(false);
								setCrossedThreshold(false);
							}, 250);
						});
					} else if (onAddToQueue) {
						onAddToQueue(entry);
						snapBack();
					}
				} else {
					setCrossedThreshold(false);
					snapBack();
				}
			}
		},
		[entry, index, onAddToQueue, onSwipeChange, onDismissSwipe, snapBack, observePoint],
	);

	useGlobalPointerCancel(handlePointerUp);

	const handlePointerCancel = useCallback(() => {
		swipeStartRef.current = null;
		if (isSwipingRef.current) {
			isSwipingRef.current = false;
			onSwipeChange?.(false);
			setCrossedThreshold(false);
			snapBack();
		}
	}, [snapBack, onSwipeChange]);

	const handleClick = useCallback(() => {
		if (suppressNextClickRef.current) {
			suppressNextClickRef.current = false;
			return;
		}
		onSelect(entry);
	}, [entry, onSelect]);

	if (!entry) return null;

	const { song, artist, hex, albumArt, albumName } = entry;

	const leftIconOpacity = Math.min(1, Math.max(0, swipeOffset) / SWIPE_THRESHOLD);
	const rightIconOpacity = Math.min(1, Math.max(0, -swipeOffset) / SWIPE_THRESHOLD);

	const contentTransform = swipeOffset !== 0 || isSnapping ? `translateX(${swipeOffset}px)` : undefined;

	const swipeIcon =
		customSwipeIcon ||
		(isDismiss ? (
			<path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
		) : (
			<path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
		));

	const swipeBgColor = customSwipeBgColor ?? "#ffb300";
	const swipeBgIconColor = customSwipeBgColor ? "#fff" : crossedThreshold ? "#1a1100" : "#fff";

	return (
		<div
			{...ariaAttributes}
			style={style}
			className={["entry-row", isDragging ? "entry-row--dragging" : ""].filter(Boolean).join(" ")}
			onClick={handleClick}
		>
			<div
				className="entry-row__swipe-bg"
				style={{
					backgroundColor: crossedThreshold ? swipeBgColor : "transparent",
				}}
			>
				<svg
					className="entry-row__swipe-icon"
					style={{ opacity: leftIconOpacity, color: swipeBgIconColor }}
					viewBox="0 0 24 24"
					width="24"
					height="24"
					fill="currentColor"
					aria-hidden="true"
				>
					{swipeIcon}
				</svg>
				<svg
					className="entry-row__swipe-icon"
					style={{ opacity: rightIconOpacity, color: swipeBgIconColor }}
					viewBox="0 0 24 24"
					width="24"
					height="24"
					fill="currentColor"
					aria-hidden="true"
				>
					{swipeIcon}
				</svg>
			</div>
			<div
				className={["entry-row__content", isSnapping ? "entry-row__content--swiping" : ""].filter(Boolean).join(" ")}
				style={contentTransform ? { transform: contentTransform } : undefined}
				onPointerDown={swipeEnabled ? handlePointerDown : undefined}
				onPointerMove={swipeEnabled ? handlePointerMove : undefined}
				onPointerUp={swipeEnabled ? handlePointerUp : undefined}
				onPointerCancel={swipeEnabled ? handlePointerCancel : undefined}
			>
				{showDragHandle && (
					<div
						className="entry-row__drag-handle"
						onPointerDown={(e) => {
							e.stopPropagation();
							onDragStart?.(index, e);
						}}
					>
						<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">
							<path d="M3 15h18v-2H3v2zm0 4h18v-2H3v2zm0-8h18V9H3v2zm0-6v2h18V5H3z" />
						</svg>
					</div>
				)}
				<div className="entry-avatar" style={{ backgroundColor: hex }}>
					{albumArt && (
						<img
							src={`https://braxtonhall.ca/song-book-resources/art/${albumArt}.png`}
							alt={`${albumName} album art`}
							draggable={false}
						/>
					)}
				</div>
				<div className="entry-text">
					<span className={`entry-title${isSelected ? " entry-title--selected" : ""}`}>{song}</span>
					<span className="entry-artist">{artist}</span>
					{subtitles?.[index] && <span className="entry-subtitle">{subtitles[index]}</span>}
				</div>
				{showDismissButton && (
					<button
						className="entry-row__dismiss-btn"
						onClick={(e) => {
							e.stopPropagation();
							onDismiss?.(index);
						}}
						aria-label={`Remove ${song} from queue`}
					>
						×
					</button>
				)}
			</div>
		</div>
	);
}
