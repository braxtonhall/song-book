import { useRef, useCallback } from "react";

export const useVelocityTrace = (duration: number) => {
	const moveHistory = useRef<{ x: number; y: number; t: number }[]>([]);
	const observePoint = useCallback(
		(e: { clientY: number; clientX: number; timeStamp: number }): { vx: number; vy: number } => {
			const history = moveHistory.current;
			history.push({ y: e.clientY, x: e.clientX, t: e.timeStamp });
			const cutoff = e.timeStamp - duration;
			moveHistory.current = history.filter((p) => p.t >= cutoff);

			const oldest = history[0];
			const newest = history[history.length - 1];

			const elapsed = oldest && newest ? newest.t - oldest.t : 0;
			const vy = elapsed > 0 ? (newest.y - oldest.y) / elapsed : 0;
			const vx = elapsed > 0 ? (newest.x - oldest.x) / elapsed : 0;
			return { vx, vy };
		},
		[duration],
	);

	const resetPoints = useCallback(() => void (moveHistory.current = []), []);
	return { observePoint, resetPoints };
};
