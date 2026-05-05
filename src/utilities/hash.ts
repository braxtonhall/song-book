const VOCABULARY = ["Accuracy", "Album", "Alternative", "Amplifier", "Animation", "Avatar", "Axe", "Bandmate", "Bar", "Bass", "Beat", "Boy", "Calibration", "Campaign", "Challenge", "Chart", "Chords", "Classic", "Combo", "Concert", "Controller", "Crowd", "Cymbals", "Delay", "Difficulty", "Distortion", "Drummer", "Drums", "Dude", "Dynamics", "Effects", "Encore", "Energy", "Fans", "Feedback", "Fix", "Freestyle", "Frets", "Game", "Gamer", "Gem", "Genre", "Girl", "Good", "Groove", "Grunge", "Guitar", "Harmonic", "Harmony", "Headbang", "Headliner", "Highway", "Hit", "Improvisation", "Indie", "Input", "Jam", "Keys", "Kick", "Late", "Leaderboard", "Level", "Loop", "Melody", "Metal", "Metronome", "Microphone", "Miss", "Mode", "Multiplayer", "Multiplier", "Note", "Notes", "Overdrive", "Pedal", "Perfect", "Performance", "Playlist", "Practice", "Practice mode", "Pro", "Punk", "Ranking", "Recording", "Remix", "Reverb", "Rhythm", "Riff", "Rock", "Rocker", "Sampling", "Score", "Setlist", "Skill", "Snare", "Solo", "Spotlight", "Stage", "Star", "Streak", "Strings", "Strum", "Studio", "Sync", "Syncopation", "Tabs", "Tempo", "Timing", "Tone", "Tour", "Track", "Tracklist", "Unlock", "Visuals", "Vocals", "Volume", "Vox", "Wah", "Whammy"];

export function stringToColour(str: string): string {
	let hash = 0;

	// Simple string hash (similar to Java's)
	for (let i = 0; i < str.length; i++) {
		hash = str.charCodeAt(i) + ((hash << 5) - hash);
		hash |= 0; // Convert to 32bit integer
	}

	// Extract RGB components
	const r = (hash >> 16) & 0xff;
	const g = (hash >> 8) & 0xff;
	const b = hash & 0xff;

	// Convert to hex and pad
	const toHex = (c: number) => c.toString(16).padStart(2, "0");

	return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function hashString(str: string): number {
	let h = 2166136261;
	for (let i = 0; i < str.length; i++) {
		h ^= str.charCodeAt(i);
		h = Math.imul(h, 16777619);
		h >>>= 0;
	}
	return h;
}

function toHumanIdentifier(id: string, count: number, vocabulary: string[]): string {
	if (vocabulary.length < count) {
		throw new Error(`Vocabulary must contain at least ${count} items`);
	}

	function derive(salt: string): number {
		return hashString(id + ":" + salt);
	}

	const n = vocabulary.length;
	const chosen: string[] = [];

	for (let slot = 0; slot < count; slot++) {
		let attempt = 0;
		let word: string;
		do {
			word = vocabulary[derive(`w${slot}:${attempt}`) % n];
			attempt++;
		} while (chosen.includes(word));
		chosen.push(word);
	}

	const digits = String(derive("d1") % 10000).padStart(4, "0");

	return `${chosen.join('')}#${digits}`;
}

export const getRockerId = (id: string): string =>
	toHumanIdentifier(id, 3, VOCABULARY);
