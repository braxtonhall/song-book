import { useEffect, useState, useCallback } from "react";

function checksum(str: string): string {
	let crc = 0 ^ -1;

	for (let i = 0; i < str.length; i++) {
		let byte = str.charCodeAt(i);
		crc = crc ^ byte;
		for (let j = 0; j < 8; j++) {
			let mask = -(crc & 1);
			crc = (crc >>> 1) ^ (0xedb88320 & mask);
		}
	}

	return String((crc ^ -1) >>> 0);
}

export function validSongPassword(password: string | null): boolean {
	if (!password) {
		return false;
	}
	if (!process.env.REACT_APP_SONG_PASSWORD_CHECKSUM) {
		return false;
	}
	return checksum(password) === process.env.REACT_APP_SONG_PASSWORD_CHECKSUM;
}

export function useSongPassword(): { password: string | null; setPassword: (pw: string | null) => void } {
	const [password, setPasswordState] = useState<string | null>(() => {
		const stored = localStorage.getItem("SONG_PASSWORD");
		return stored && validSongPassword(stored) ? stored : null;
	});

	useEffect(() => {
		if (!validSongPassword(localStorage.getItem("SONG_PASSWORD"))) {
			localStorage.removeItem("SONG_PASSWORD");
		}
		const params = new URLSearchParams(window.location.search);
		const pw = params.get("pw");
		if (pw && validSongPassword(pw)) {
			localStorage.setItem("SONG_PASSWORD", pw);
			setPasswordState(pw);
			params.delete("pw");
			const search = params.toString();
			const newUrl = search ? `${window.location.pathname}?${search}` : window.location.pathname;
			window.history.replaceState(null, "", newUrl);
		}

		const handleStorageChange = () => {
			const stored = localStorage.getItem("SONG_PASSWORD");
			setPasswordState(stored && validSongPassword(stored) ? stored : null);
		};
		window.addEventListener("songPasswordChange", handleStorageChange);
		window.addEventListener("storage", handleStorageChange);
		return () => {
			window.removeEventListener("songPasswordChange", handleStorageChange);
			window.removeEventListener("storage", handleStorageChange);
		};
	}, []);

	const setPassword = useCallback((pw: string | null) => {
		if (pw === null) {
			localStorage.removeItem("SONG_PASSWORD");
			setPasswordState(null);
		} else if (validSongPassword(pw)) {
			localStorage.setItem("SONG_PASSWORD", pw);
			setPasswordState(pw);
		}
		window.dispatchEvent(new Event("songPasswordChange"));
	}, []);

	return { password, setPassword };
}
