const DB_NAME = "song-book";
const DB_VERSION = 1;

let db: IDBDatabase | null = null;
let dbReady: Promise<IDBDatabase> | null = null;

function openDatabase(): Promise<IDBDatabase> {
	if (db) return Promise.resolve(db);
	if (dbReady) return dbReady;

	dbReady = new Promise<IDBDatabase>((resolve, reject) => {
		const request = indexedDB.open(DB_NAME, DB_VERSION);

		request.onupgradeneeded = (event) => {
			const database = (event.target as IDBOpenDBRequest).result;
			if (!database.objectStoreNames.contains("playlists")) {
				database.createObjectStore("playlists", { keyPath: "id" });
			}
			if (!database.objectStoreNames.contains("queue")) {
				database.createObjectStore("queue", { keyPath: "uuid" });
			}
			if (!database.objectStoreNames.contains("history")) {
				database.createObjectStore("history", { keyPath: "uuid" });
			}
		};

		request.onsuccess = (event) => {
			db = (event.target as IDBOpenDBRequest).result;
			resolve(db);
		};

		request.onerror = () => {
			dbReady = null;
			reject(request.error);
		};
	});

	return dbReady;
}

async function getStore(storeName: string, mode: IDBTransactionMode = "readonly") {
	const database = await openDatabase();
	const transaction = database.transaction(storeName, mode);
	return transaction.objectStore(storeName);
}

export async function getAll<T>(storeName: string): Promise<T[]> {
	try {
		const store = await getStore(storeName);
		return new Promise((resolve) => {
			const request = store.getAll();
			request.onsuccess = () => resolve(request.result);
			request.onerror = () => resolve([]);
		});
	} catch {
		return [];
	}
}

export async function put<T>(storeName: string, value: T): Promise<void> {
	try {
		const store = await getStore(storeName, "readwrite");
		return new Promise((resolve) => {
			const request = store.put(value);
			request.onsuccess = () => resolve();
			request.onerror = () => resolve();
		});
	} catch {}
}

export async function putAll<T>(storeName: string, values: T[]): Promise<void> {
	try {
		const store = await getStore(storeName, "readwrite");
		return new Promise((resolve) => {
			store.clear();
			for (const value of values) {
				store.put(value);
			}
			store.transaction.oncomplete = () => resolve();
			store.transaction.onerror = () => resolve();
		});
	} catch {}
}

export async function remove(storeName: string, key: string): Promise<void> {
	try {
		const store = await getStore(storeName, "readwrite");
		return new Promise((resolve) => {
			const request = store.delete(key);
			request.onsuccess = () => resolve();
			request.onerror = () => resolve();
		});
	} catch {}
}

export async function clear(storeName: string): Promise<void> {
	try {
		const store = await getStore(storeName, "readwrite");
		return new Promise((resolve) => {
			const request = store.clear();
			request.onsuccess = () => resolve();
			request.onerror = () => resolve();
		});
	} catch {}
}
