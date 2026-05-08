import React, { useState, useEffect, useRef, useCallback } from "react";
import { useGlobalPointerCancel } from "../hooks/useGlobalPointerCancel";
import { useVelocityTrace } from "../hooks/useVelocityTrace";
import "./Panel.css";

export function Panel({
	children,
	dismissed,
	onDismiss,
	onRestore,
	isLandscape,
	accent,
}: {
	children: React.ReactNode;
	dismissed: boolean;
	onDismiss: () => void;
	onRestore?: () => void;
	isLandscape: boolean;
	accent?: string;
}) {
	const panelRef = useRef<HTMLDivElement>(null);
	const dragStartY = useRef(0);
	const dragStartPanelY = useRef(0);
	const { resetPoints, observePoint } = useVelocityTrace(80);
	const swipeVelocity = useRef(0);
	const isDragging = useRef(false);
	const [dragging, setDragging] = useState(false);
	const dismissedRef = useRef(dismissed);
	dismissedRef.current = dismissed;
	const onRestoreRef = useRef(onRestore);
	onRestoreRef.current = onRestore;

	const MIN_TOP = 80;
	const DISMISS_THRESHOLD = 0.85;
	const defaultTop = () => window.innerHeight * (2 / 3);
	const dismissedTop = () => window.innerHeight + 20;

	useEffect(() => {
		if (isLandscape) return;
		if (panelRef.current) {
			panelRef.current.style.transition = "none";
			panelRef.current.style.top = dismissedTop() + "px";
		}
	}, []); // eslint-disable-line react-hooks/exhaustive-deps

	useEffect(() => {
		if (isLandscape) return;
		if (!panelRef.current) return;
		if (isDragging.current) return; // user caught the panel mid-animation — don't fight the drag
		if (dismissed) {
			const target = dismissedTop();
			const vel = swipeVelocity.current;
			swipeVelocity.current = 0;
			if (vel > 0) {
				const currentTop = parseFloat(panelRef.current.style.top) || defaultTop();
				const duration = Math.max(80, Math.min(400, Math.round((target - currentTop) / vel)));
				panelRef.current.style.transition = `top ${duration}ms linear, --panel-accent 0.4s ease`;
			} else {
				panelRef.current.style.transition = "top 0.35s cubic-bezier(0.4, 0, 0.2, 1), --panel-accent 0.4s ease";
			}
			panelRef.current.style.top = target + "px";
		} else {
			panelRef.current.style.transition = "top 0.35s cubic-bezier(0.34, 1.56, 0.64, 1), --panel-accent 0.4s ease";
			panelRef.current.style.top = defaultTop() + "px";
		}
	}, [dismissed, isLandscape]);

	useEffect(() => {
		const handler = () => {
			if (!panelRef.current) return;
			if (isLandscape) {
				panelRef.current.style.top = "";
				panelRef.current.style.transition = "";
				return;
			}
			if (dismissed) {
				panelRef.current.style.top = dismissedTop() + "px";
			} else {
				const current = parseFloat(panelRef.current.style.top) || defaultTop();
				const clamped = Math.min(Math.max(current, MIN_TOP), window.innerHeight * DISMISS_THRESHOLD - 1);
				panelRef.current.style.top = clamped + "px";
			}
		};
		window.addEventListener("resize", handler);
		return () => window.removeEventListener("resize", handler);
	}, [dismissed, isLandscape]); // eslint-disable-line react-hooks/exhaustive-deps

	useEffect(() => {
		if (!panelRef.current) return;
		if (isLandscape) {
			panelRef.current.style.top = "";
			panelRef.current.style.transition = "";
		} else {
			panelRef.current.style.transition = "none";
			panelRef.current.style.top = (dismissed ? dismissedTop() : defaultTop()) + "px";
			panelRef.current.getBoundingClientRect(); // force reflow so transition:none commits before next paint
		}
	}, [isLandscape]); // eslint-disable-line react-hooks/exhaustive-deps

	const handlePointerDown = useCallback(
		(e: React.PointerEvent<HTMLDivElement>) => {
			if ((e.target as HTMLElement).closest("button")) return;
			e.preventDefault();
			panelRef.current?.setPointerCapture(e.pointerId);
			isDragging.current = true;
			setDragging(true);
			dragStartY.current = e.clientY;
			resetPoints();
			observePoint(e);
			const currentTop = parseFloat(getComputedStyle(panelRef.current!).top);
			panelRef.current!.style.top = currentTop + "px";
			panelRef.current!.style.transition = "none";
			dragStartPanelY.current = currentTop;
			// If the panel was mid-dismiss, cancel it so the dismissed effect won't re-animate
			// away from where the user grabbed it. isDragging is already true above so the
			// effect will no-op if it fires due to this state change.
			if (dismissedRef.current) onRestoreRef.current?.();
		},
		[resetPoints, observePoint],
	);

	const handlePointerMove = useCallback(
		(e: React.PointerEvent<HTMLDivElement>) => {
			if (!isDragging.current) return;
			e.preventDefault();
			const newTop = Math.max(MIN_TOP, dragStartPanelY.current + (e.clientY - dragStartY.current));
			panelRef.current!.style.top = newTop + "px";
			observePoint(e);
		},
		[observePoint],
	);

	const handlePointerUp = useCallback(
		(e: { clientX: number; clientY: number; timeStamp: number }) => {
			if (!isDragging.current) return;
			isDragging.current = false;
			setDragging(false);
			const { vy: velocity } = observePoint(e);
			const finalTop = parseFloat(panelRef.current!.style.top);
			if (finalTop > window.innerHeight * DISMISS_THRESHOLD || velocity > 0.5) {
				swipeVelocity.current = Math.max(0, velocity);
				onDismiss();
			} else if (velocity < -0.5) {
				const target = MIN_TOP;
				const absVel = Math.abs(velocity);
				const duration = Math.max(80, Math.min(400, Math.round((finalTop - target) / absVel)));
				panelRef.current!.style.transition = `top ${duration}ms linear, --panel-accent 0.4s ease`;
				panelRef.current!.style.top = target + "px";
			} else {
				panelRef.current!.style.transition = "top 0.25s cubic-bezier(0.4, 0, 0.2, 1), --panel-accent 0.4s ease";
			}
		},
		[onDismiss, observePoint],
	);

	useGlobalPointerCancel(handlePointerUp);

	const isOpen = isLandscape && !dismissed;

	return (
		<div
			ref={panelRef}
			className={["panel", dragging ? "panel--dragging" : "", isOpen ? "panel--open" : ""].filter(Boolean).join(" ")}
			style={{ "--panel-accent": accent || "#1c1c1c" } as React.CSSProperties}
			onPointerDown={isLandscape ? undefined : handlePointerDown}
			onPointerMove={isLandscape ? undefined : handlePointerMove}
			onPointerUp={isLandscape ? undefined : handlePointerUp}
			onPointerCancel={isLandscape ? undefined : handlePointerUp}
		>
			{!isLandscape && (
				<div className="panel__grabber-zone">
					<div className="panel__grabber" />
				</div>
			)}
			<button className="panel__close" onClick={onDismiss} aria-label="Close">
				×
			</button>
			<div className="panel__content">{children}</div>
		</div>
	);
}
