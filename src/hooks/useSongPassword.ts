import {useEffect} from "react";

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

function validSongPassword(password: string | null): boolean {
	if (!password) {
		return false;
	}
	if (!process.env.REACT_APP_SONG_PASSWORD_CHECKSUM) {
		return false;
	}
	return checksum(password) === process.env.REACT_APP_SONG_PASSWORD_CHECKSUM;
}

export function useSongPassword(): string | null {
	useEffect(() => {
		if (!validSongPassword(localStorage.getItem("SONG_PASSWORD"))) {
			localStorage.removeItem("SONG_PASSWORD");
		}
		const params = new URLSearchParams(window.location.search);
		const pw = params.get("pw");
		if (pw && validSongPassword(pw)) {
			localStorage.setItem("SONG_PASSWORD", pw);
			params.delete("pw");
			const search = params.toString();
			const newUrl = search ? `${window.location.pathname}?${search}` : window.location.pathname;
			window.history.replaceState(null, "", newUrl);
		}
	}, []);

	return localStorage.getItem("SONG_PASSWORD");
}
