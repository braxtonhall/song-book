import React, { useState, useCallback, useRef } from "react";
import { Entry } from "../types";
import { Playlist } from "../partyTypes";
import "./PlaylistPicker.css";

interface PlaylistPickerProps {
	playlists: Playlist[];
	entry: Entry;
	onPick: (playlistId: string) => void;
	onCreate: (name: string) => void;
	onClose: () => void;
}

export function PlaylistPicker({ playlists, entry, onPick, onCreate, onClose }: PlaylistPickerProps) {
	const [createName, setCreateName] = useState("");
	const inputRef = useRef<HTMLInputElement>(null);

	const handleCreate = useCallback(() => {
		const name = createName.trim();
		if (name) {
			onCreate(name);
			setCreateName("");
		}
	}, [createName, onCreate]);

	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent) => {
			if (e.key === "Enter") handleCreate();
		},
		[handleCreate],
	);

	return (
		<div className="playlist-picker__overlay" onClick={onClose}>
			<div className="playlist-picker__box" onClick={(e) => e.stopPropagation()}>
				<h3 className="playlist-picker__title">Save to Playlist</h3>
				<div className="playlist-picker__song-info">
					{entry.albumArt && (
						<img
							className="playlist-picker__song-art"
							src={`https://braxtonhall.ca/song-book-resources/art/${entry.albumArt}.png`}
							alt=""
						/>
					)}
					<div className="playlist-picker__song-name">{entry.song}</div>
				</div>
				<div className="playlist-picker__list">
					{playlists.map((pl) => {
						const alreadyIn = pl.entries.some((e) => e.id === entry.id);
						return (
							<button key={pl.id} className="playlist-picker__item" onClick={() => onPick(pl.id)}>
								<div className="playlist-picker__item-icon">
									<svg viewBox="0 0 24 24">
										<path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z" />
									</svg>
								</div>
								<span className="playlist-picker__item-name">{pl.name}</span>
								{alreadyIn && (
									<span className="playlist-picker__item-check" title="Already in this playlist">
										<svg viewBox="0 0 24 24">
											<path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
										</svg>
									</span>
								)}
								<span className="playlist-picker__item-count">{pl.entries.length}</span>
							</button>
						);
					})}
					{playlists.length === 0 && (
						<p
							style={{
								color: "rgba(255,255,255,0.35)",
								textAlign: "center",
								padding: "16px 0",
								fontSize: 14,
								margin: 0,
							}}
						>
							No playlists yet
						</p>
					)}
				</div>
				<div className="playlist-picker__create">
					<input
						ref={inputRef}
						className="playlist-picker__create-input"
						placeholder="New playlist name"
						value={createName}
						onChange={(e) => setCreateName(e.target.value)}
						onKeyDown={handleKeyDown}
					/>
					<button className="playlist-picker__create-btn" onClick={handleCreate}>
						Create
					</button>
				</div>
				<button className="playlist-picker__cancel" onClick={onClose}>
					Cancel
				</button>
			</div>
		</div>
	);
}
