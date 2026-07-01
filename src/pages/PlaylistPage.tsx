import React, { useState, useCallback, useRef, useEffect } from "react";
import { List, ListImperativeAPI, RowComponentProps } from "react-window";
import { Playlist } from "../partyTypes";
import "./Page.css";
import "./PlaylistPage.css";

function computeRowHeight() {
	const rows = window.innerWidth > window.innerHeight ? 12 : 8;
	return Math.round(window.innerHeight / rows);
}

const CREATE_HEADER_HEIGHT = 48;

type PlaylistRowData = {
	playlists: Playlist[];
	onSelectPlaylist: (id: string) => void;
	showCreateInput: boolean;
	onCreateConfirm: () => void;
	onCreateCancel: () => void;
	onCreateKeyDown: (e: React.KeyboardEvent) => void;
	onShowCreate: () => void;
	inputRef: React.RefObject<HTMLInputElement | null>;
};

const PlaylistRowRenderer: React.FC<RowComponentProps<PlaylistRowData>> = (props) => {
	const { index, style } = props;
	const playlists = props.playlists;
	const onSelectPlaylist = props.onSelectPlaylist;
	const showCreateInput = props.showCreateInput;
	const onCreateConfirm = props.onCreateConfirm;
	const onCreateCancel = props.onCreateCancel;
	const onCreateKeyDown = props.onCreateKeyDown;
	const onShowCreate = props.onShowCreate;
	const inputRef = props.inputRef;

	if (index === 0) {
		if (showCreateInput) {
			return (
				<div style={style} className="playlist-name-input">
					<input
						ref={inputRef}
						className="playlist-name-input__field"
						placeholder="Playlist name"
						autoFocus
						onKeyDown={onCreateKeyDown}
					/>
					<button className="playlist-name-input__confirm" onClick={onCreateConfirm}>
						Create
					</button>
					<button className="playlist-name-input__cancel" onClick={onCreateCancel}>
						Cancel
					</button>
				</div>
			);
		}
		return (
			<button style={style} className="create-playlist-btn" onClick={onShowCreate}>
				<svg viewBox="0 0 24 24">
					<path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
				</svg>
				Create Playlist
			</button>
		);
	}
	const pl = playlists[index - 1];
	if (!pl) return null;
	return (
		<div style={style} className="playlist-row" onClick={() => onSelectPlaylist(pl.id)}>
			<div className="playlist-row__icon">
				<svg viewBox="0 0 24 24">
					<path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z" />
				</svg>
			</div>
			<div className="playlist-row__info">
				<span className="playlist-row__name">{pl.name}</span>
				<span className="playlist-row__meta">
					{pl.entries.length} {pl.entries.length === 1 ? "song" : "songs"}
				</span>
			</div>
			<div className="playlist-row__chevron">
				<svg viewBox="0 0 24 24">
					<path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" />
				</svg>
			</div>
		</div>
	);
};

interface PlaylistPageProps {
	playlists: Playlist[];
	onSelectPlaylist: (id: string) => void;
	onCreatePlaylist: (name: string) => void;
	onDeletePlaylist: (id: string) => void;
}

export function PlaylistPage({ playlists, onSelectPlaylist, onCreatePlaylist, onDeletePlaylist }: PlaylistPageProps) {
	const listRef = useRef<ListImperativeAPI>(null);
	const inputRef = useRef<HTMLInputElement>(null);
	const [rowHeight, setRowHeight] = useState(computeRowHeight);
	const [showCreateInput, setShowCreateInput] = useState(false);

	useEffect(() => {
		const handler = () => setRowHeight(computeRowHeight());
		window.addEventListener("resize", handler);
		return () => window.removeEventListener("resize", handler);
	}, []);

	const handleCreateConfirm = useCallback(() => {
		const name = inputRef.current?.value.trim();
		if (name) {
			onCreatePlaylist(name);
			setShowCreateInput(false);
		}
	}, [onCreatePlaylist]);

	const handleCreateCancel = useCallback(() => {
		setShowCreateInput(false);
	}, []);

	const handleCreateKeyDown = useCallback(
		(e: React.KeyboardEvent) => {
			if (e.key === "Enter") handleCreateConfirm();
			if (e.key === "Escape") handleCreateCancel();
		},
		[handleCreateConfirm, handleCreateCancel],
	);

	const handleShowCreate = useCallback(() => {
		setShowCreateInput(true);
		setTimeout(() => inputRef.current?.focus(), 50);
	}, []);

	const handleRowHeight = useCallback((index: number) => (index === 0 ? CREATE_HEADER_HEIGHT : rowHeight), [rowHeight]);

	const rowData = useCallback(
		(): PlaylistRowData => ({
			playlists,
			onSelectPlaylist,
			showCreateInput,
			onCreateConfirm: handleCreateConfirm,
			onCreateCancel: handleCreateCancel,
			onCreateKeyDown: handleCreateKeyDown,
			onShowCreate: handleShowCreate,
			inputRef,
		}),
		[
			playlists,
			onSelectPlaylist,
			showCreateInput,
			handleCreateConfirm,
			handleCreateCancel,
			handleCreateKeyDown,
			handleShowCreate,
		],
	);

	if (playlists.length === 0 && !showCreateInput) {
		return (
			<div className="page page--empty">
				<div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
					<p className="page__placeholder">No playlists</p>
					<button
						className="create-playlist-btn"
						style={{ width: "auto", padding: "10px 20px", borderRadius: 8, border: "none" }}
						onClick={handleShowCreate}
					>
						<svg viewBox="0 0 24 24">
							<path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
						</svg>
						Create Playlist
					</button>
				</div>
			</div>
		);
	}

	return (
		<div className="page">
			<List
				className="playlists-list"
				listRef={listRef}
				rowComponent={PlaylistRowRenderer}
				rowProps={rowData()}
				rowCount={playlists.length + 1}
				rowHeight={handleRowHeight}
				style={{ height: "100%", width: "100%" }}
			/>
		</div>
	);
}
