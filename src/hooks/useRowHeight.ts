import { useState, useEffect } from "react";

function computeRowHeight() {
	return window.innerWidth > window.innerHeight ? 84 : 96;
}

export function useRowHeight(): number {
	const [rowHeight, setRowHeight] = useState(computeRowHeight);
	useEffect(() => {
		const handler = () => setRowHeight(computeRowHeight());
		window.addEventListener("resize", handler);
		return () => window.removeEventListener("resize", handler);
	}, []);
	return rowHeight;
}
