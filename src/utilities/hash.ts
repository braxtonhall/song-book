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

export function toHumanIdentifier(id: string, count: number, vocabulary: string[]): string {
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
