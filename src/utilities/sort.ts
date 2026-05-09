import { Entry, InstrumentKey, DIFFICULTY_FIELD, RANK_FIELD } from "../types";
import { SortBy } from "../components/SortHeader";

export const sort = (type: SortBy, difficultyKey?: InstrumentKey) => {
	switch (type) {
		case "song":
			return (a: Entry, b: Entry) => a.sortSong.localeCompare(b.sortSong) || a.sortArtist.localeCompare(b.sortArtist);
		case "artist":
			return (a: Entry, b: Entry) =>
				a.sortArtist.localeCompare(b.sortArtist) ||
				a.year - b.year ||
				(a.sortAlbumName || "").localeCompare(b.sortAlbumName || "") ||
				a.albumTrackIndex - b.albumTrackIndex;
		case "difficulty": {
			const difficulty = DIFFICULTY_FIELD[difficultyKey ?? "band"];
			const rank = RANK_FIELD[difficultyKey ?? "band"];
			return (a: Entry, b: Entry) =>
				(a[difficulty] as number) - (b[difficulty] as number) ||
				(a[rank] as number) - (b[rank] as number) ||
				a.sortSong.localeCompare(b.sortSong) ||
				a.sortArtist.localeCompare(b.sortArtist);
		}
		default:
			return type satisfies never;
	}
};
