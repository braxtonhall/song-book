import React from "react";
import { Entry } from "../types";
import { AudioPlayer } from "./AudioPlayer";
import { Panel } from "./Panel";
import { useSongPassword } from "../hooks/useSongPassword";
import "./DetailPanel.css";

const RATING_LABELS = ["Unrated", "Family Friendly", "Supervision Recommended"];
const DIFFICULTY_LABELS = ["Warmup", "Apprentice", "Solid", "Moderate", "Challenging", "Nightmare", "Impossible"];

function formatDuration(ms: number): string {
	const totalSeconds = Math.round(ms / 1000);
	const minutes = Math.floor(totalSeconds / 60);
	const seconds = totalSeconds % 60;
	return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function DifficultyDots({ value }: { value: number | null }) {
	if (value === null) return <span className="detail-panel__diff-none">No Part</span>;
	const diffDotFillClass = value === 6 ? " detail-panel__diff-dot--red" : " detail-panel__diff-dot--filled";
	return (
		<span className="detail-panel__diff-dots" aria-label={`Difficulty of ${DIFFICULTY_LABELS[value]}`}>
			{Array.from({ length: 5 }).map((_, i) => (
				<span key={i} className={`detail-panel__diff-dot${i < value ? diffDotFillClass : ""}`} />
			))}
		</span>
	);
}

function DifficultyRow({ icon, alt, value }: { icon: string; alt: string; value: number | null }) {
	return (
		<div className="detail-panel__diff-row">
			<img className="detail-panel__diff-label" src={`${process.env.PUBLIC_URL}/icons/${icon}`} alt={alt} />
			<DifficultyDots value={value} />
		</div>
	);
}

function darkenHex(hex: string): string {
	const r = parseInt(hex.slice(1, 3), 16);
	const g = parseInt(hex.slice(3, 5), 16);
	const b = parseInt(hex.slice(5, 7), 16);
	return `rgb(${Math.round(r * 0.4)}, ${Math.round(g * 0.4)}, ${Math.round(b * 0.4)})`;
}

export function DetailPanel({
	entry,
	dismissed,
	onDismiss,
	isLandscape,
	onAddToQueue,
}: {
	entry: Entry | null;
	dismissed: boolean;
	onDismiss: () => void;
	isLandscape: boolean;
	onAddToQueue?: (entry: Entry) => void;
}) {
	const { password: songPassword } = useSongPassword();

	return (
		<Panel
			dismissed={dismissed}
			onDismiss={onDismiss}
			isLandscape={isLandscape}
			accent={entry ? darkenHex(entry.hex) : undefined}
		>
			{entry && (
				<>
					<div className="detail-panel__top-row">
						<div className="detail-panel__art-column">
							<div className="detail-panel__avatar" style={{ backgroundColor: entry.hex }}>
								{entry.albumArt && (
									<img
										src={`https://braxtonhall.ca/song-book-resources/art/${entry.albumArt}.png`}
										alt={`${entry.albumName} album art`}
									/>
								)}
							</div>
							{songPassword && entry.ogg && <AudioPlayer entry={entry} dismissed={dismissed} />}
						</div>
						<div className="detail-panel__diff-columns">
							<div className="detail-panel__diff-col">
								<DifficultyRow icon="guitar.png" alt="Guitar" value={entry.guitarDifficulty} />
								<DifficultyRow icon="bass.png" alt="Bass" value={entry.bassDifficulty} />
								<DifficultyRow icon="drums.png" alt="Drums" value={entry.drumDifficulty} />
								<DifficultyRow icon="keys.png" alt="Keys" value={entry.keysDifficulty} />
								<DifficultyRow
									icon={
										entry.vocalParts && entry.vocalParts > 2
											? "vocals-3.png"
											: entry.vocalParts && entry.vocalParts > 1
												? "vocals-2.png"
												: "vocals.png"
									}
									alt="Vocals"
									value={entry.vocalsDifficulty}
								/>
							</div>
							<div className="detail-panel__diff-col">
								<DifficultyRow icon="guitar-plus.png" alt="Pro Guitar" value={entry.proGuitarDifficulty} />
								<DifficultyRow icon="bass-plus.png" alt="Pro Bass" value={entry.proBassDifficulty} />
								<DifficultyRow icon="drums-plus.png" alt="Pro Drums" value={entry.drumDifficulty} />
								<DifficultyRow icon="keys-plus.png" alt="Pro Keys" value={entry.proKeysDifficulty} />
								<DifficultyRow icon="band.png" alt="Band" value={entry.bandDifficulty} />
							</div>
						</div>
					</div>

					<div className="detail-panel__song-info">
						<h2 className="detail-panel__title">{entry.song}</h2>
						<p className="detail-panel__artist">{entry.artist}</p>
						<p className="detail-panel__album">
							{entry.albumName}
							{entry.year ? ` · ${entry.year}` : ""}
						</p>
					</div>

					<div className="detail-panel__meta">
						{entry.genre && <span>{entry.genre}</span>}
						{entry.source && <span>{entry.source}</span>}
					</div>

					<div className="detail-panel__badges">
						<span className="detail-panel__badge detail-panel__badge--duration">{formatDuration(entry.duration)}</span>
						{entry.rating > 0 && (
							<span className="detail-panel__badge">{RATING_LABELS[entry.rating] || "Unrated"}</span>
						)}
						{entry.multitracks && <span className="detail-panel__badge">Multitracks</span>}
						{entry.cover && <span className="detail-panel__badge">Cover</span>}
					</div>
					{onAddToQueue && (
						<button
							className="detail-panel__add-queue-btn"
							onPointerDown={(e) => e.stopPropagation()}
							onPointerUp={(e) => {
								if (e.button === 0) onAddToQueue(entry);
							}}
						>
							Add to Queue
						</button>
					)}
				</>
			)}
		</Panel>
	);
}
