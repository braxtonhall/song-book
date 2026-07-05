import React, { useState, useCallback, useRef } from "react";
import { useSongPassword, validSongPassword } from "../hooks/useSongPassword";
import { CopyButton } from "../components/CopyButton";
import { getPlaylists, importPlaylists } from "../hooks/usePlaylists";
import { Playlist } from "../partyTypes";
import "./Page.css";
import "./SettingsPage.css";

function validatePlaylistData(data: unknown): { valid: true; playlists: Playlist[] } | { valid: false; error: string } {
	let arr: unknown[];

	if (Array.isArray(data)) {
		arr = data;
	} else if (data && typeof data === "object" && Array.isArray((data as Record<string, unknown>).playlists)) {
		arr = (data as Record<string, unknown>).playlists as unknown[];
	} else {
		return { valid: false, error: "Expected a JSON array of playlists, or an object with a 'playlists' array." };
	}

	if (arr.length === 0) {
		return { valid: false, error: "No playlists found in the file." };
	}

	const playlists: Playlist[] = [];

	for (let i = 0; i < arr.length; i++) {
		const pl = arr[i];
		if (!pl || typeof pl !== "object") {
			return { valid: false, error: `Item ${i + 1} is not a valid playlist object.` };
		}

		const name = (pl as Record<string, unknown>).name;
		if (typeof name !== "string" || name.trim() === "") {
			return { valid: false, error: `Playlist ${i + 1} is missing a valid 'name' (required).` };
		}

		const entries = (pl as Record<string, unknown>).entries;
		if (!Array.isArray(entries)) {
			return { valid: false, error: `Playlist '${name}' (item ${i + 1}) is missing 'entries' (required array).` };
		}

		playlists.push({
			id:
				typeof (pl as Record<string, unknown>).id === "string"
					? (pl as Record<string, unknown>).id
					: crypto.randomUUID(),
			name: name.trim(),
			entries: entries,
			createdAt:
				typeof (pl as Record<string, unknown>).createdAt === "string"
					? (pl as Record<string, unknown>).createdAt
					: new Date().toISOString(),
		} as Playlist);
	}

	return { valid: true, playlists };
}

export function SettingsPage() {
	const { password, setPassword } = useSongPassword();
	const [inputValue, setInputValue] = useState(password ?? "");
	const isValid = !inputValue || validSongPassword(inputValue);
	const hasChanged = inputValue !== (password ?? "");

	const [error, setError] = useState<string | null>(null);
	const [importedPlaylists, setImportedPlaylists] = useState<Playlist[] | null>(null);
	const [importing, setImporting] = useState(false);
	const [successMessage, setSuccessMessage] = useState<string | null>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);

	const handleSave = () => {
		setPassword(inputValue || null);
	};

	const handleExport = useCallback(async () => {
		try {
			const allPlaylists = await getPlaylists();
			const blob = new Blob([JSON.stringify(allPlaylists, null, 2)], { type: "application/json" });
			const url = URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = "playlists.json";
			a.click();
			URL.revokeObjectURL(url);
		} catch {
			setError("Failed to export playlists.");
		}
	}, []);

	const handleImportClick = useCallback(() => {
		fileInputRef.current?.click();
	}, []);

	const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
		setError(null);
		setSuccessMessage(null);
		const file = e.target.files?.[0];
		if (!file) return;

		const reader = new FileReader();
		reader.onload = (event) => {
			try {
				const json = JSON.parse(event.target?.result as string);
				const result = validatePlaylistData(json);
				if (!result.valid) {
					setError(result.error);
					return;
				}
				setImportedPlaylists(result.playlists);
			} catch {
				setError("Failed to parse JSON file. Ensure the file contains valid JSON.");
			}
		};
		reader.readAsText(file);
		e.target.value = "";
	}, []);

	const handleCancelImport = useCallback(() => {
		setImportedPlaylists(null);
	}, []);

	const handleAddImport = useCallback(async () => {
		if (!importedPlaylists) return;
		setImporting(true);
		setError(null);
		try {
			await importPlaylists(importedPlaylists, "add");
			setSuccessMessage(`Added ${importedPlaylists.length} playlist${importedPlaylists.length !== 1 ? "s" : ""}.`);
			setImportedPlaylists(null);
		} catch {
			setError("Failed to import playlists. Please try again.");
		} finally {
			setImporting(false);
		}
	}, [importedPlaylists]);

	const handleReplaceImport = useCallback(async () => {
		if (!importedPlaylists) return;
		setImporting(true);
		setError(null);
		try {
			await importPlaylists(importedPlaylists, "replace");
			setSuccessMessage(
				`Replaced all playlists with ${importedPlaylists.length} playlist${importedPlaylists.length !== 1 ? "s" : ""} from file.`,
			);
			setImportedPlaylists(null);
		} catch {
			setError("Failed to import playlists. Please try again.");
		} finally {
			setImporting(false);
		}
	}, [importedPlaylists]);

	return (
		<div className="page page--settings">
			<h2 className="settings__title">Song Password</h2>
			<div className="settings__row">
				<input
					className={`settings__input${!isValid ? " settings__input--invalid" : ""}`}
					type="text"
					value={inputValue}
					onChange={(e) => setInputValue(e.target.value)}
					placeholder="Enter song password"
				/>
				<CopyButton size="md" text={password ?? ""} disabled={!password} />
			</div>
			<button className="settings__btn settings__btn--save" onClick={handleSave} disabled={!isValid || !hasChanged}>
				{inputValue ? "Save" : "Remove"}
			</button>

			<h2 className="settings__title settings__title--data">Data</h2>
			<div className="settings__data-row">
				<button className="settings__btn settings__btn--export" onClick={handleExport}>
					Export Playlists
				</button>
				<button className="settings__btn settings__btn--import" onClick={handleImportClick}>
					Import Playlists
				</button>
				<input
					ref={fileInputRef}
					type="file"
					accept=".json,application/json"
					className="settings__file-input"
					onChange={handleFileChange}
				/>
			</div>
			{error && <p className="settings__message settings__message--error">{error}</p>}
			{successMessage && <p className="settings__message settings__message--success">{successMessage}</p>}

			{importedPlaylists && (
				<div className="settings__overlay" onClick={handleCancelImport}>
					<div className="settings__dialog" onClick={(e) => e.stopPropagation()}>
						<h3 className="settings__dialog-title">Import Playlists</h3>
						<p className="settings__dialog-text">
							Found {importedPlaylists.length} playlist{importedPlaylists.length !== 1 ? "s" : ""}. Would you like to
							add them to your existing playlists, or replace all playlists?
						</p>
						<div className="settings__dialog-list">
							{importedPlaylists.map((pl, i) => (
								<div key={i} className="settings__dialog-item">
									<span className="settings__dialog-item-name">{pl.name}</span>
									<span className="settings__dialog-item-count">{pl.entries.length} songs</span>
								</div>
							))}
						</div>
						<div className="settings__dialog-actions">
							<button
								className="settings__dialog-btn settings__dialog-btn--add"
								onClick={handleAddImport}
								disabled={importing}
							>
								{importing ? "Importing..." : "Add"}
							</button>
							<button
								className="settings__dialog-btn settings__dialog-btn--replace"
								onClick={handleReplaceImport}
								disabled={importing}
							>
								{importing ? "Importing..." : "Replace All"}
							</button>
							<button
								className="settings__dialog-btn settings__dialog-btn--cancel"
								onClick={handleCancelImport}
								disabled={importing}
							>
								Cancel
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
