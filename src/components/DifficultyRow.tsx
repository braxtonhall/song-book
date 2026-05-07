import React from "react";
import { DifficultyDots } from "./DetailPanel";
import "./DifficultyRow.css";

const DIFFICULTY_LABELS = [
	"No Part",
	"Warmup",
	"Apprentice",
	"Solid",
	"Moderate",
	"Challenging",
	"Nightmare",
	"Impossible",
];

export function DifficultyRow({ value, style }: { value: number; style?: React.CSSProperties }) {
	return (
		<div className="difficulty-row" style={style}>
			<DifficultyDots value={value} />
			<span className="difficulty-row-label">{DIFFICULTY_LABELS[value] ?? value}</span>
		</div>
	);
}
