import { Entry } from "../types";

export const sort = (type: "song" | "artist") => {
	switch (type) {
		case "song":
			return (a: Entry, b: Entry) => a.sortSong.localeCompare(b.sortSong) || a.sortArtist.localeCompare(b.sortArtist);
		case "artist":
			return (a: Entry, b: Entry) =>
				a.sortArtist.localeCompare(b.sortArtist) ||
				a.year - b.year ||
				(a.sortAlbumName || "").localeCompare(b.sortAlbumName || "") ||
				a.albumTrackIndex - b.albumTrackIndex;

		default:
			return type satisfies never;
	}
};
