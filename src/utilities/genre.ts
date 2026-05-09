// copy-pasted from here: https://github.com/trojannemo/Nautilus/blob/e42ae16deb9ed8a48e142996f85bf08939511c65/Nautilus/DTAParser.cs#L1558
export const getGenre = (genre: string) => {
	switch (genre) {
		case "alternative": {
			return "Alternative";
		}
		case "blues": {
			return "Blues";
		}
		case "classical": {
			return "Classical";
		}
		case "classicrock": {
			return "Classic Rock";
		}
		case "country": {
			return "Country";
		}
		case "emo": {
			return "Emo";
		}
		case "fusion": {
			return "Fusion";
		}
		case "glam": {
			return "Glam";
		}
		case "grunge": {
			return "Grunge";
		}
		case "hiphoprap": {
			return "Hip-Hop/Rap";
		}
		case "indierock": {
			return "Indie Rock";
		}
		case "jazz": {
			return "Jazz";
		}
		case "jrock": {
			return "J-Rock";
		}
		case "latin": {
			return "Latin";
		}
		case "metal": {
			return "Metal";
		}
		case "new_wave": {
			return "New Wave";
		}
		case "novelty": {
			return "Novelty";
		}
		case "numetal": {
			return "Nu-Metal";
		}
		case "other": {
			return "Other";
		}
		case "poprock": {
			return "Pop-Rock";
		}
		case "popdanceelectronic": {
			return "Pop/Dance/Electronic";
		}
		case "prog": {
			return "Prog";
		}
		case "punk": {
			return "Punk";
		}
		case "rbsoulfunk": {
			return "R&B/Soul/Funk";
		}
		case "reggaeska": {
			return "Reggae/Ska";
		}
		case "inspirational": {
			return "Inspirational";
		}
		case "rock": {
			return "Rock";
		}
		case "southernrock": {
			return "Southern Rock";
		}
		case "urban": {
			return "Urban";
		}
		case "world": {
			return "World";
		}
		default: {
			return genre;
		}
	}
};
