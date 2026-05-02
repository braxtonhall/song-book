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
	let hash = 0;

	for (let i = 0; i < str.length; i++) {
		const char = str.charCodeAt(i);
		hash = (hash << 5) - hash + char;
		hash |= 0; // Convert to 32-bit integer
	}

	return hash;
}
