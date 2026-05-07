import { Entry } from "../types";
import { SortBy } from "../components/SortHeader";

export const sort = (type: SortBy) => {
	switch (type) {
		case "song":
			return (a: Entry, b: Entry) => a.sortSong.localeCompare(b.sortSong) || a.sortArtist.localeCompare(b.sortArtist);
		case "artist":
			return (a: Entry, b: Entry) =>
				a.sortArtist.localeCompare(b.sortArtist) ||
				a.year - b.year ||
				(a.sortAlbumName || "").localeCompare(b.sortAlbumName || "") ||
				a.albumTrackIndex - b.albumTrackIndex;
		case "difficulty":
			return (a: Entry, b: Entry) =>
				a.bandDifficulty - b.bandDifficulty ||
				a.sortSong.localeCompare(b.sortSong) ||
				a.sortArtist.localeCompare(b.sortArtist);
		default:
			return type satisfies never;
	}
};
