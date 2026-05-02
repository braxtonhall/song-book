import {stringToColour, hashString} from "../utilities/hash";

const LETTERS = "0ABBBBBBCEDFGHIJKLMNOPQRSTUVWXYZ";
const DIFFICULTIES = [0, 1, 2, 3, 4, 5, 6, null];

const getDifficulty = (number: number) => DIFFICULTIES[number % DIFFICULTIES.length];

// Just for testing. Do not build anything using this
export const ENTRIES = Array.from({length: 10_000}).map((_, index) => ({
	song: `${LETTERS[Math.floor((index / 10_000) * LETTERS.length)]} Song Name ${index}`,
	sortSong: `${LETTERS[Math.floor((index / 10_000) * LETTERS.length)]} Song Name ${index}`,
	artist: `${LETTERS[Math.floor(((10_000 - 1 - index) / 10_000) * LETTERS.length)]} Artist Name ${10_000 - index}`,
	sortArtist: `${LETTERS[Math.floor(((10_000 - 1 - index) / 10_000) * LETTERS.length)]} Artist Name ${10_000 - index}`,
	genre: `Genre ${String(hashString(String(index * 13)))[0]}`,
	source: `Source ${String(hashString(String(index * 19)))[0]}`,
	year: 2012,
	albumName: `Album ${String(hashString(String(index * 7)))[0]}`,
	albumTrackIndex: index % 10,
	id: index,
	hex: stringToColour(String(hashString(String(index * 13)))),
	vocalsDifficulty: getDifficulty(index * 3),
	guitarDifficulty: getDifficulty(index * 5),
	drumDifficulty: getDifficulty(index * 7),
	bassDifficulty: getDifficulty(index * 11),
	keysDifficulty: getDifficulty(index * 13),
	proKeysDifficulty: getDifficulty(index * 17),
	proGuitarDifficulty: getDifficulty(index * 19),
	proBassDifficulty: getDifficulty(index * 23),
	bandDifficulty: getDifficulty(index * 27) || 0,
	vocalParts: getDifficulty(index * 3) === null ? null : (index % 3) + 1,
	multitracks: index % 2 === 0,
	cover: index % 100 === 0,
	rating: index % 3,
	duration: 60000 + ((index * 13 * 7) % (60_000 * 5)),
}));

export const getEntries = (): Promise<Entry[]> =>
	new Promise<Entry[]>((resolve) => setTimeout(resolve, Math.random() * 3_000, ENTRIES));

export const LETTERS_ARRAY = Array.from(new Set(ENTRIES.map((entry) => entry.song[0])))
	.filter(Boolean)
	.sort();

export type Entry = (typeof ENTRIES)[number];
