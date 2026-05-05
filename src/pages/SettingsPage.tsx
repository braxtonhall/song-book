import React, { useState } from "react";
import { useSongPassword, validSongPassword } from "../hooks/useSongPassword";
import { CopyButton } from "../components/CopyButton";
import "./Page.css";
import "./SettingsPage.css";

export function SettingsPage() {
	const { password, setPassword } = useSongPassword();
	const [inputValue, setInputValue] = useState(password ?? "");
	const isValid = !inputValue || validSongPassword(inputValue);
	const hasChanged = inputValue !== (password ?? "");

	const handleSave = () => {
		setPassword(inputValue || null);
	};

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
		</div>
	);
}
