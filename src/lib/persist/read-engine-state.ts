/**
 * Read-only parser for the Godot engine's Web save state.
 *
 * IMPORTANT — storage backend correction (verified against the actual export):
 * Godot 4.4 Web does NOT use localStorage. It persists `user://` files to
 * IndexedDB via Emscripten IDBFS. The exported `index.js` (game/.export/web)
 * confirms the exact contract:
 *
 *   - DB name      = the persistent mount point = `/userfs`
 *                    (from `persistentPaths: ['/userfs']` -> `GodotFS.init` ->
 *                     `FS.mount(IDBFS, {}, '/userfs')` -> `IDBFS.getDB('/userfs')`)
 *   - Object store = `FILE_DATA`
 *   - Key          = absolute in-FS path = `/userfs/<save_file_name>.json`
 *                    (IDBFS `storeRemoteEntry` does `store.put(entry, path)`)
 *   - Value        = `{ timestamp: <mtime>, mode: <number>, contents: <Uint8Array> }`
 *
 * The file content is `JSON.stringify(save_data) + "$$$"` (SIGNATURE). The
 * engine strips everything from the first `$$$` onward before `JSON.parse`.
 *
 * The save file name is NOT fixed: a new game defaults to `unnamed` and the
 * player can rename it, so we scan every `/userfs/*.json` key and pick the
 * most recently played save.
 *
 * This module is strictly read-only and defensive: any missing DB / store /
 * key, corrupt JSON, or unexpected shape resolves to `NO_ENGINE_STATE` — it
 * never throws. It is only ever called from `onMount` (client-side), because
 * IndexedDB is unavailable during SSR/prerender.
 */

/** Current engine version (game/global/const/game.gd). */
export const CURRENT_ENGINE_VERSION = { major: 'DEMO', minor: '1.4.6' } as const;

/** The Godot Web user-data dir, which is the IDBFS mount point and DB name. */
const DB_NAME = '/userfs';
const STORE_NAME = 'FILE_DATA';
const SAVE_DIR = '/userfs/';
const SAVE_EXT = '.json';
const SIGNATURE = '$$$';

export interface EngineSave {
	/** False when no valid save could be read. */
	hasSave: boolean;
	/** Player-visible save name (metadata.save_file_name), if present. */
	saveFileName?: string;
	/** Most recent play time (metadata.last_utc_time), if present. */
	lastPlayed?: Date;
	/** Engine version recorded in the save (metadata.last_version_major). */
	versionMajor?: string;
	/** Engine version recorded in the save (metadata.last_version_minor). */
	versionMinor?: string;
	/** True when the recorded version matches the current engine. */
	versionOk?: boolean;
	/** World resources (save_data.resources). */
	resources?: Record<string, number>;
	/** Unlocked tabs (save_data.tab_unlocks). */
	tabUnlocks?: string[];
	/** Tab levels (save_data.tab_levels). */
	tabLevels?: Record<string, number>;
	/** Raw event log (save_data.event_log) — story records. */
	eventLog?: Record<string, unknown>;
	/** Active locale (save_data.LOCALE). */
	locale?: string;
	/**
	 * The raw save JSON (pre-signature), kept so the share encoder can produce
	 * a `#z=` snapshot the engine can import. Omitted when there is no save.
	 */
	rawJson?: string;
}

export const NO_ENGINE_STATE: EngineSave = { hasSave: false };

interface IdbEntry {
	timestamp?: number;
	mode?: number;
	contents?: Uint8Array;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Open the IDBFS database read-only (no version -> no upgrade side effects). */
function openDb(): Promise<IDBDatabase> {
	return new Promise((resolve, reject) => {
		if (typeof indexedDB === 'undefined') {
			reject(new Error('indexedDB unavailable'));
			return;
		}
		const req = indexedDB.open(DB_NAME);
		req.onsuccess = () => resolve(req.result);
		req.onerror = () => reject(req.error ?? new Error('open failed'));
		req.onblocked = () => reject(new Error('open blocked'));
	});
}

/** Read every entry in the FILE_DATA store, keyed by its in-FS path. */
function readAllEntries(db: IDBDatabase): Promise<Record<string, IdbEntry>> {
	return new Promise((resolve, reject) => {
		const tx = db.transaction(STORE_NAME, 'readonly');
		const store = tx.objectStore(STORE_NAME);
		const result: Record<string, IdbEntry> = {};
		const req = store.openCursor();
		req.onsuccess = () => {
			const cursor = req.result;
			if (cursor) {
				result[String(cursor.key)] = cursor.value as IdbEntry;
				cursor.continue();
			} else {
				resolve(result);
			}
		};
		req.onerror = () => reject(req.error ?? new Error('cursor failed'));
	});
}

interface DecodedSave {
	data: Record<string, unknown>;
	rawJson: string;
}

/** Decode one IDBFS file entry into a parsed save object (or null). */
function decodeSave(entry: IdbEntry): DecodedSave | null {
	if (!entry || !entry.contents) return null;
	let text: string;
	try {
		text = new TextDecoder('utf-8').decode(entry.contents);
	} catch {
		return null;
	}
	// The engine keeps everything up to (and including) the first "$$$", then
	// strips it — so the JSON is everything before the first signature.
	const idx = text.indexOf(SIGNATURE);
	if (idx !== -1) text = text.slice(0, idx);
	text = text.trim();
	if (!text) return null;
	try {
		const parsed: unknown = JSON.parse(text);
		return isRecord(parsed) ? { data: parsed, rawJson: text } : null;
	} catch {
		return null;
	}
}

function toEngineSave(saveData: Record<string, unknown>, rawJson: string): EngineSave {
	const meta = isRecord(saveData.metadata) ? saveData.metadata : {};
	const lastUtc = isRecord(meta.last_utc_time) ? meta.last_utc_time : undefined;

	let lastPlayed: Date | undefined;
	if (lastUtc) {
		const d = new Date(
			num(lastUtc.year, 1970),
			num(lastUtc.month, 1) - 1,
			num(lastUtc.day, 1),
			num(lastUtc.hour, 0),
			num(lastUtc.minute, 0),
			num(lastUtc.second, 0)
		);
		if (!Number.isNaN(d.getTime())) lastPlayed = d;
	}

	const versionMajor = str(meta.last_version_major);
	const versionMinor = str(meta.last_version_minor);

	return {
		hasSave: true,
		saveFileName: str(meta.save_file_name),
		lastPlayed,
		versionMajor,
		versionMinor,
		versionOk:
			versionMajor === CURRENT_ENGINE_VERSION.major &&
			versionMinor === CURRENT_ENGINE_VERSION.minor,
		resources: isRecord(saveData.resources)
			? (saveData.resources as Record<string, number>)
			: undefined,
		tabUnlocks: Array.isArray(saveData.tab_unlocks)
			? (saveData.tab_unlocks as string[])
			: undefined,
		tabLevels: isRecord(saveData.tab_levels)
			? (saveData.tab_levels as Record<string, number>)
			: undefined,
		eventLog: isRecord(saveData.event_log)
			? (saveData.event_log as Record<string, unknown>)
			: undefined,
		locale: str(saveData.LOCALE),
		rawJson
	};
}

function num(value: unknown, fallback: number): number {
	return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function str(value: unknown): string | undefined {
	return typeof value === 'string' && value.length > 0 ? value : undefined;
}

/**
 * Read the most recently played engine save from IndexedDB.
 * Resolves to `NO_ENGINE_STATE` on any failure — never rejects.
 */
export async function readEngineState(): Promise<EngineSave> {
	if (typeof indexedDB === 'undefined') return NO_ENGINE_STATE;

	let db: IDBDatabase;
	try {
		db = await openDb();
	} catch {
		return NO_ENGINE_STATE;
	}

	try {
		const entries = await readAllEntries(db);
		let best: EngineSave = NO_ENGINE_STATE;
		let bestTime = -Infinity;
		for (const [key, entry] of Object.entries(entries)) {
			if (!key.startsWith(SAVE_DIR) || !key.endsWith(SAVE_EXT)) continue;
			const decoded = decodeSave(entry);
			if (!decoded) continue;
			const save = toEngineSave(decoded.data, decoded.rawJson);
			const time = save.lastPlayed?.getTime() ?? entry.timestamp ?? 0;
			if (time > bestTime) {
				bestTime = time;
				best = save;
			}
		}
		return best;
	} catch {
		return NO_ENGINE_STATE;
	} finally {
		db.close();
	}
}
