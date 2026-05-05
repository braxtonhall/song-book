import React, { useState, useEffect, useRef, useCallback } from "react";
import { Entry } from "../types";

// TODO use audio player technology from aisia.ca. Manage multiple audio sources

const FADE_DURATION = 500;
const FADE_INTERVAL = 50;

async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
	const enc = new TextEncoder();
	const keyMaterial = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveKey"]);
	return crypto.subtle.deriveKey(
		{ name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" },
		keyMaterial,
		{ name: "AES-GCM", length: 256 },
		false,
		["decrypt"],
	);
}

export function AudioPlayer({ entry, dismissed }: { entry: Entry | null; dismissed: boolean }) {
	const [isPlaying, setIsPlaying] = useState(false);
	const audioRef = useRef<HTMLAudioElement | null>(null);
	const fadeIntervalRef = useRef<ReturnType<typeof setInterval>>(undefined);
	const monitorIntervalRef = useRef<ReturnType<typeof setInterval>>(undefined);
	const dismissedRef = useRef(dismissed);
	dismissedRef.current = dismissed;
	const togglePlayRef = useRef<() => void>(() => {});
	const isPlayingRef = useRef(false);
	const blobUrlRef = useRef<string>("");

	useEffect(() => {
		isPlayingRef.current = isPlaying;
	}, [isPlaying]);

	useEffect(() => {
		return () => {
			if (fadeIntervalRef.current) clearInterval(fadeIntervalRef.current);
			if (monitorIntervalRef.current) clearInterval(monitorIntervalRef.current);
			if (audioRef.current) {
				audioRef.current.pause();
				audioRef.current = null;
			}
			if (blobUrlRef.current) {
				URL.revokeObjectURL(blobUrlRef.current);
				blobUrlRef.current = "";
			}
			setIsPlaying(false);
		};
	}, []);

	const fadeOutAndStop = useCallback(() => {
		const audio = audioRef.current;
		if (!audio) return;
		if (fadeIntervalRef.current) clearInterval(fadeIntervalRef.current);
		if (monitorIntervalRef.current) clearInterval(monitorIntervalRef.current);
		const initialVolume = audio.volume;
		const steps = FADE_DURATION / FADE_INTERVAL;
		let step = 0;
		fadeIntervalRef.current = setInterval(() => {
			step++;
			audio.volume = Math.max(0, initialVolume * (1 - step / steps));
			if (audio.volume <= 0) {
				if (fadeIntervalRef.current) clearInterval(fadeIntervalRef.current);
				audio.pause();
				audioRef.current = null;
				if (blobUrlRef.current) {
					URL.revokeObjectURL(blobUrlRef.current);
					blobUrlRef.current = "";
				}
				setIsPlaying(false);
			}
		}, FADE_INTERVAL);
	}, []);

	const fadeOutAndStopRef = useRef(fadeOutAndStop);
	fadeOutAndStopRef.current = fadeOutAndStop;

	useEffect(() => {
		if (!dismissed) return;
		fadeOutAndStop();
	}, [dismissed, fadeOutAndStop]);

	useEffect(() => {
		const ms = navigator.mediaSession;
		if (entry && !dismissed) {
			ms.metadata = new MediaMetadata({ title: entry.song, artist: entry.artist, album: entry.albumName });
			ms.playbackState = isPlaying ? "playing" : "paused";
			ms.setActionHandler("play", () => {
				if (!dismissedRef.current && !audioRef.current) {
					togglePlayRef.current?.();
				}
			});
			ms.setActionHandler("pause", () => fadeOutAndStopRef.current?.());
			ms.setActionHandler("stop", () => fadeOutAndStopRef.current?.());
			return () => {
				ms.setActionHandler("play", null);
				ms.setActionHandler("pause", null);
				ms.setActionHandler("stop", null);
			};
		} else {
			ms.playbackState = "none";
			ms.metadata = null;
			ms.setActionHandler("play", null);
			ms.setActionHandler("pause", null);
			ms.setActionHandler("stop", null);
		}
	}, [entry, dismissed, isPlaying]);

	useEffect(() => {
		if (!entry || !isPlayingRef.current) return;
		if (fadeIntervalRef.current) clearInterval(fadeIntervalRef.current);
		if (monitorIntervalRef.current) clearInterval(monitorIntervalRef.current);
		if (audioRef.current) {
			audioRef.current.pause();
			audioRef.current = null;
		}
		if (blobUrlRef.current) {
			URL.revokeObjectURL(blobUrlRef.current);
			blobUrlRef.current = "";
		}
		setIsPlaying(false);
		togglePlayRef.current();
	}, [entry]);

	const togglePlay = useCallback(async () => {
		if (audioRef.current) {
			fadeOutAndStop();
			return;
		}

		const password = localStorage.getItem("SONG_PASSWORD");
		if (!password) return;

		const audio = new Audio();
		audio.volume = 0;
		audioRef.current = audio;

		try {
			const res = await fetch(`https://braxtonhall.ca/song-book-resources/previews/${entry?.ogg}.ogg.enc`);
			const fileBuffer = await res.arrayBuffer();
			const bytes = new Uint8Array(fileBuffer);

			const salt = bytes.slice(0, 16);
			const iv = bytes.slice(16, 28);
			const ciphertext = bytes.slice(28);

			const key = await deriveKey(password, salt);
			const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ciphertext);

			const blob = new Blob([decrypted], { type: "audio/ogg" });
			blobUrlRef.current = URL.createObjectURL(blob);
			audio.src = blobUrlRef.current;
		} catch (e) {
			audioRef.current = null;
			console.error(e);
			return;
		}

		let isFadingOut = false;

		const fadeIn = () => {
			const steps = FADE_DURATION / FADE_INTERVAL;
			let step = 0;
			fadeIntervalRef.current = setInterval(() => {
				step++;
				audio.volume = Math.min(1, step / steps);
				if (audio.volume >= 1 && fadeIntervalRef.current) {
					clearInterval(fadeIntervalRef.current);
				}
			}, FADE_INTERVAL);
		};

		const stop = () => {
			if (monitorIntervalRef.current) clearInterval(monitorIntervalRef.current);
			if (fadeIntervalRef.current) clearInterval(fadeIntervalRef.current);
			audio.pause();
			audioRef.current = null;
			if (blobUrlRef.current) {
				URL.revokeObjectURL(blobUrlRef.current);
				blobUrlRef.current = "";
			}
			setIsPlaying(false);
		};

		const fadeOut = () => {
			if (isFadingOut) return;
			isFadingOut = true;
			const initialVolume = audio.volume;
			const steps = FADE_DURATION / FADE_INTERVAL;
			let step = 0;
			if (fadeIntervalRef.current) clearInterval(fadeIntervalRef.current);
			fadeIntervalRef.current = setInterval(() => {
				step++;
				audio.volume = Math.max(0, initialVolume * (1 - step / steps));
				if (audio.volume <= 0) {
					clearInterval(fadeIntervalRef.current);
					stop();
				}
			}, FADE_INTERVAL);
		};

		const startMonitor = () => {
			monitorIntervalRef.current = setInterval(() => {
				if (!audioRef.current) {
					if (monitorIntervalRef.current) clearInterval(monitorIntervalRef.current);
					return;
				}
				if (!audio.duration || !isFinite(audio.duration)) return;
				if (audio.currentTime >= audio.duration - FADE_DURATION / 1000 - 0.5) {
					if (monitorIntervalRef.current) clearInterval(monitorIntervalRef.current);
					fadeOut();
				}
			}, 100);
		};

		if (audio.readyState >= HTMLMediaElement.HAVE_METADATA) {
			startMonitor();
		} else {
			audio.addEventListener("loadedmetadata", () => startMonitor());
		}

		audio.addEventListener("ended", stop);

		audio.play();
		fadeIn();
		setIsPlaying(true);
	}, [fadeOutAndStop, entry]);

	togglePlayRef.current = () => {
		togglePlay();
	};

	return (
		<button className="detail-panel__play-button" onClick={togglePlay}>
			{isPlaying ? "\u23F9" : "\u25B6"}
		</button>
	);
}
