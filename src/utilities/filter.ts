import { Entry, FilterState, InstrumentKey } from "../types";

export const filter = ({ genres, sources, vocalParts, difficulty, tags }: FilterState) => {
	const tests: ((entry: Entry) => boolean)[] = [];
	if (genres.length) {
		tests.push((entry) => genres.includes(entry.genre));
	}
	if (sources.length) {
		tests.push((entry) => sources.includes(entry.source));
	}
	if (vocalParts.length) {
		tests.push((entry) => vocalParts.includes(entry.vocalParts));
	}
	for (const [key, state] of Object.entries(tags)) {
		if (typeof state === "boolean") {
			tests.push((entry) => entry[key as keyof Entry] === state);
		}
	}
	for (const [key, [low, high]] of Object.entries(difficulty)) {
		if (low !== 0 || high !== 8) {
			const instrumentKey = key as InstrumentKey;
			if (instrumentKey === "drums") {
				tests.push((entry) => entry.drumDifficulty >= low && entry.drumDifficulty < high);
			} else {
				const difficultyKey = `${instrumentKey}Difficulty` as const;
				tests.push((entry) => entry[difficultyKey] >= low && entry[difficultyKey] < high);
			}
		}
	}
	if (tests.length) {
		return (entry: Entry) => tests.every((test) => test(entry));
	} else {
		return () => true;
	}
};
