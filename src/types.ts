export type InstrumentKey =
	| "guitar"
	| "bass"
	| "drums"
	| "keys"
	| "vocals"
	| "proGuitar"
	| "proBass"
	| "proKeys"
	| "band";

export type FilterState = {
	genres: string[];
	sources: string[];
	vocalParts: number[];
	difficulty: Record<InstrumentKey, [number, number]>;
	decades: number[];
	tags: { [K in keyof Entry]?: boolean | null };
};

const defaultDifficulty: Record<InstrumentKey, [number, number]> = {
	guitar: [0, 8],
	bass: [0, 8],
	drums: [0, 8],
	keys: [0, 8],
	vocals: [0, 8],
	proGuitar: [0, 8],
	proBass: [0, 8],
	proKeys: [0, 8],
	band: [0, 8],
};

export const DEFAULT_FILTER_STATE: FilterState = {
	genres: [],
	sources: [],
	vocalParts: [],
	difficulty: defaultDifficulty,
	decades: [],
	tags: {},
};

export function isFilterActive(state: FilterState): boolean {
	return (
		state.genres.length > 0 ||
		state.sources.length > 0 ||
		state.vocalParts.length > 0 ||
		state.decades.length > 0 ||
		(Object.keys(state.difficulty) as InstrumentKey[]).some(
			(key) => state.difficulty[key][0] !== 0 || state.difficulty[key][1] !== 8,
		) ||
		Object.values(state.tags).some((v) => v !== null)
	);
}

export type Entry = {
	albumArt: string;
	song: string;
	sortSong: string;
	artist: string;
	sortArtist: string;
	genre: string;
	source: string;
	year: number;
	albumName: string;
	sortAlbumName: string;
	albumTrackIndex: number;
	id: number;
	hex: string;
	vocalsDifficulty: number;
	guitarDifficulty: number;
	drumDifficulty: number;
	bassDifficulty: number;
	keysDifficulty: number;
	proKeysDifficulty: number;
	proGuitarDifficulty: number;
	proBassDifficulty: number;
	bandDifficulty: number;
	vocalParts: number;
	multitracks: boolean;
	master: boolean;
	rating: number;
	duration: number;
	author: string;
	ogg: string;
	lyrics: string;
	"2xBass": boolean;
};

export type IndexEntry = {
	bubble: React.ReactNode;
	label: string;
	index: number;
	present?: boolean;
};

export type DifficultyHeaderItem = { _type: "difficulty-header"; difficulty: number };

export type ItemEntryRow = { _type: "item"; entry: Entry };

export type AugmentedItem = DifficultyHeaderItem | ItemEntryRow;
