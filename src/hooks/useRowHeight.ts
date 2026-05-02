import {useState, useEffect} from "react";

function computeRowHeight() {
	return window.innerWidth > window.innerHeight ? "8.33%" : "12.5%";
}

export function useRowHeight(): string {
	const [rowHeight, setRowHeight] = useState(computeRowHeight);
	useEffect(() => {
		const handler = () => setRowHeight(computeRowHeight());
		window.addEventListener("resize", handler);
		return () => window.removeEventListener("resize", handler);
	}, []);
	return rowHeight;
}
