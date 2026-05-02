import {useState, useEffect} from "react";

const SEARCH_BAR_HEIGHT = 52;

function computeRowHeight() {
	const listHeight = window.innerHeight - SEARCH_BAR_HEIGHT;
	const rows = window.innerWidth > window.innerHeight ? 12 : 8;
	return Math.round(listHeight / rows);
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
