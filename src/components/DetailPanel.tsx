import { useState, useEffect, useMemo } from "react";
import { Entry } from "../types";
import { AudioPlayer } from "./AudioPlayer";
import { Panel } from "./Panel";
import { useSongPassword } from "../hooks/useSongPassword";
import "./DetailPanel.css";
import { useSources } from "../hooks/useSources";
import { getGenre } from "../utilities/genre";

const RATING_LABELS = ["Unrated", "Family Friendly", "Supervision Recommended"];
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

function formatDuration(ms: number): string {
	const totalSeconds = Math.round(ms / 1000);
	const minutes = Math.floor(totalSeconds / 60);
	const seconds = totalSeconds % 60;
	return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function DifficultyDots({ value, compact }: { value: number; compact?: boolean }) {
	if (!value)
		return (
			<span className={`detail-panel__diff-none${compact ? " detail-panel__diff-none--compact" : ""}`}>No Part</span>
		);
	const diffDotFillClass = value === 7 ? " detail-panel__diff-dot--red" : " detail-panel__diff-dot--filled";
	return (
		<span
			className={`detail-panel__diff-dots${compact ? " detail-panel__diff-dots--compact" : ""}`}
			aria-label={`Difficulty of ${DIFFICULTY_LABELS[value]}`}
		>
			{Array.from({ length: 5 }).map((_, i) => (
				<span key={i} className={`detail-panel__diff-dot${i < value - 1 ? diffDotFillClass : ""}`} />
			))}
		</span>
	);
}

function DifficultyRow({ icon, alt, value }: { icon: string; alt: string; value: number }) {
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
	onRestore,
	isLandscape,
	onAddToQueue,
	onAddToPlaylist,
}: {
	entry: Entry | null;
	dismissed: boolean;
	onDismiss: () => void;
	onRestore?: () => void;
	isLandscape: boolean;
	onAddToQueue?: (entry: Entry) => void;
	onAddToPlaylist?: (entry: Entry) => void;
}) {
	const { password: songPassword } = useSongPassword();
	const [lyrics, setLyrics] = useState<string | null>(null);
	const [addedToQueue, setAddedToQueue] = useState(false);
	const sources = useSources();

	useEffect(() => {
		setLyrics(null);
		if (!entry || !entry.vocalParts || !entry.lyrics) {
			return;
		}
		let cancelled = false;
		fetch(`https://braxtonhall.ca/song-book-resources/lyrics/${entry.lyrics}.txt`)
			.then((res) => {
				if (!res.ok) throw new Error("Failed to load lyrics");
				return res.text();
			})
			.then((text) => {
				if (!cancelled) setLyrics(text.trim());
			})
			.catch(() => {
				if (!cancelled) setLyrics(null);
			});
		return () => {
			cancelled = true;
		};
	}, [entry]);

	const source = useMemo(() => sources.get(entry?.source ?? ""), [entry, sources]);

	return (
		<Panel
			dismissed={dismissed}
			onDismiss={onDismiss}
			onRestore={onRestore}
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
							{entry.year && entry.albumName ? " · " : ""}
							{entry.year}
						</p>
					</div>

					<div className="detail-panel__meta">
						{entry.genre && <span>{getGenre(entry.genre)}</span>}
						{entry.source && <span>{source.name}</span>}
						{entry.author && <span>{entry.author}</span>}
					</div>

					<div className="detail-panel__badges">
						<span className="detail-panel__badge detail-panel__badge--duration">{formatDuration(entry.duration)}</span>
						{entry.rating > 0 && (
							<span className="detail-panel__badge">{RATING_LABELS[entry.rating] || "Unrated"}</span>
						)}
						{entry.multitracks && <span className="detail-panel__badge">Multitracks</span>}
						{entry.master && <span className="detail-panel__badge">Master</span>}
					</div>
					<div className="detail-panel__actions">
						{onAddToQueue && (
							<button
								className={
									"detail-panel__add-queue-btn" + (addedToQueue ? " detail-panel__add-queue-btn--success" : "")
								}
								onPointerDown={(e) => e.stopPropagation()}
								onClick={() => {
									onAddToQueue(entry);
									setAddedToQueue(true);
									setTimeout(() => setAddedToQueue(false), 1200);
								}}
							>
								{addedToQueue ? "Added to queue" : "Add to Queue"}
							</button>
						)}
						{onAddToPlaylist && (
							<button
								className="detail-panel__add-playlist-btn"
								onPointerDown={(e) => e.stopPropagation()}
								onClick={() => onAddToPlaylist(entry)}
							>
								Save to Playlist
							</button>
						)}
					</div>
					{entry.vocalParts > 0 && entry.lyrics && lyrics && (
						<div className="detail-panel__lyrics" onPointerDown={(e) => e.stopPropagation()}>
							<pre className="detail-panel__lyrics-text">{lyrics}</pre>
						</div>
					)}
				</>
			)}
		</Panel>
	);
}
