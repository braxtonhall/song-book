import {stringToColour, hashString} from "../utilities/hash";

const LETTERS = "0ABBBBBBCEDFGHIJKLMNOPQRSTUVWXYZ";
const DIFFICULTIES = [0, 1, 2, 3, 4, 5, 6, null];

const getDifficulty = (number: number) => DIFFICULTIES[number % DIFFICULTIES.length];

// Just for testing. Do not build anything using this
export const ENTRIES = Array.from({length: 10_000}).map((_, index) => ({
	albumArt: "",
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
	author: "",
}));

export const oldGetEntries = (): Promise<Entry[]> =>
	new Promise<Entry[]>((resolve) => setTimeout(resolve, Math.random() * 3_000, ENTRIES));

function doDifficulty(
	diff: number | null | undefined,
	t1: number,
	t2: number,
	t3: number,
	t4: number,
	t5: number,
	t6: number,
): number | null {
	if (diff === undefined || diff === null || diff <= 0) return null;
	if (diff < t1) return 0;
	if (diff < t2) return 1;
	if (diff < t3) return 2;
	if (diff < t4) return 3;
	if (diff < t5) return 4;
	if (diff < t6) return 5;
	return 6;
}

function drumDiff(rank: number | null): number | null {
	return doDifficulty(rank, 124, 151, 178, 242, 345, 448);
}
function guitarDiff(rank: number | null): number | null {
	return doDifficulty(rank, 139, 176, 221, 267, 333, 409);
}
function bassDiff(rank: number | null): number | null {
	return doDifficulty(rank, 135, 181, 228, 293, 364, 436);
}
function vocalsDiff(rank: number | null): number | null {
	return doDifficulty(rank, 132, 175, 218, 279, 353, 427);
}
function keysDiff(rank: number | null): number | null {
	return doDifficulty(rank, 153, 211, 269, 327, 385, 443);
}
function proKeysDiff(rank: number | null): number | null {
	return doDifficulty(rank, 153, 211, 269, 327, 385, 443);
}
function proGuitarDiff(rank: number | null): number | null {
	return doDifficulty(rank, 150, 208, 267, 325, 384, 442);
}
function proBassDiff(rank: number | null): number | null {
	return doDifficulty(rank, 150, 208, 267, 325, 384, 442);
}
function bandDiff(rank: number | null): number | null {
	return doDifficulty(rank, 165, 215, 243, 267, 292, 345);
}

export const getEntries = async (): Promise<Entry[]> => {
	const response = await fetch(`${process.env.PUBLIC_URL}/songs.json`);
	const result: any[] = await response.json();
	return result.map(
		({songPackage, c3Comments, albumArt}, index): Entry => ({
			albumArt,
			song: songPackage.name,
			sortSong: songPackage.name, // TODO
			artist: songPackage.artist,
			sortArtist: songPackage.artist, // TODO
			author: c3Comments.authoredBy ?? songPackage.author ?? "Harmonix",
			genre:
				songPackage.genre ??
				(() => {
					console.log("Unknown genre for ", songPackage);
					return "unknown"; // TODO
				})(),
			source:
				songPackage.gameOrigin ??
				(() => {
					// TODO looks like this doesn't work for new sources like GH imports
					console.log("Game origin missing for", songPackage);
					return "unknown"; // TODO
				})(),
			year: songPackage.yearReleased,
			albumName: songPackage.albumName,
			albumTrackIndex: index % 10, // TODO where did this go?
			id: songPackage.songId?.Left || songPackage.songId?.Right || index, // TODO fix this
			hex: stringToColour(String(hashString(String(index * 13)))),
			vocalsDifficulty: vocalsDiff(songPackage.rank.vocals),
			guitarDifficulty: guitarDiff(songPackage.rank.guitar),
			drumDifficulty: drumDiff(songPackage.rank.drum),
			bassDifficulty: bassDiff(songPackage.rank.bass),
			keysDifficulty: keysDiff(songPackage.rank.keys),
			proKeysDifficulty: proKeysDiff(songPackage.rank.real_keys),
			proGuitarDifficulty: proGuitarDiff(songPackage.rank.real_guitar),
			proBassDifficulty: proBassDiff(songPackage.rank.real_bass),
			bandDifficulty: bandDiff(songPackage.rank.band)!,
			vocalParts: songPackage.song.vocalParts ?? null, // TODO no... Probably not this. It can be 1 as default mauybe? also??
			multitracks: c3Comments.multitrack ?? true,
			cover: !songPackage.master,
			rating: songPackage.rating,
			duration: songPackage.songLength,
		}),
	);
};

export const LETTERS_ARRAY = Array.from(new Set(ENTRIES.map((entry) => entry.song[0])))
	.filter(Boolean)
	.sort();

export type Entry = (typeof ENTRIES)[number];
