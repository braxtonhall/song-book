import { Entry } from "../types";
import { stringToColour, hashString } from "../utilities/hash";

function selectDifficulty(
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
	return selectDifficulty(rank, 124, 151, 178, 242, 345, 448);
}
function guitarDiff(rank: number | null): number | null {
	return selectDifficulty(rank, 139, 176, 221, 267, 333, 409);
}
function bassDiff(rank: number | null): number | null {
	return selectDifficulty(rank, 135, 181, 228, 293, 364, 436);
}
function vocalsDiff(rank: number | null): number | null {
	return selectDifficulty(rank, 132, 175, 218, 279, 353, 427);
}
function keysDiff(rank: number | null): number | null {
	return selectDifficulty(rank, 153, 211, 269, 327, 385, 443);
}
function proKeysDiff(rank: number | null): number | null {
	return selectDifficulty(rank, 153, 211, 269, 327, 385, 443);
}
function proGuitarDiff(rank: number | null): number | null {
	return selectDifficulty(rank, 150, 208, 267, 325, 384, 442);
}
function proBassDiff(rank: number | null): number | null {
	return selectDifficulty(rank, 150, 208, 267, 325, 384, 442);
}
function bandDiff(rank: number | null): number | null {
	return selectDifficulty(rank, 165, 215, 243, 267, 292, 345);
}

const articles = /^(a |an |the )/i;
const normalize = (str: string) => str.replace(articles, "").trim();

export const getEntries = async (): Promise<Entry[]> => {
	const response = await fetch("https://braxtonhall.ca/song-book-resources/songs.json");
	const result: any[] = await response.json();
	return result.map(({ songPackage, c3Comments, albumArt, ogg }, index): Entry => {
		const vocalsDifficulty = vocalsDiff(songPackage.rank.vocals);
		return {
			albumArt,
			song: songPackage.name,
			sortSong: normalize(songPackage.name),
			artist: songPackage.artist,
			sortArtist: normalize(songPackage.artist),
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
			albumTrackIndex: songPackage.albumTrackNumber,
			id: songPackage.songId,
			hex: stringToColour(String(hashString(String(index * 13)))),
			vocalsDifficulty,
			guitarDifficulty: guitarDiff(songPackage.rank.guitar),
			drumDifficulty: drumDiff(songPackage.rank.drum),
			bassDifficulty: bassDiff(songPackage.rank.bass),
			keysDifficulty: keysDiff(songPackage.rank.keys),
			proKeysDifficulty: proKeysDiff(songPackage.rank.real_keys),
			proGuitarDifficulty: proGuitarDiff(songPackage.rank.real_guitar),
			proBassDifficulty: proBassDiff(songPackage.rank.real_bass),
			bandDifficulty: bandDiff(songPackage.rank.band)!,
			vocalParts: songPackage.song.vocalParts ?? (vocalsDifficulty === null ? 0 : 1),
			multitracks: c3Comments.multitrack ?? true,
			master: songPackage.master,
			rating: songPackage.rating,
			duration: songPackage.songLength,
			ogg,
		};
	});
};
