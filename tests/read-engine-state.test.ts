import { afterEach, describe, expect, it, vi } from 'vitest';
import {
	CURRENT_ENGINE_VERSION,
	NO_ENGINE_STATE,
	readEngineState
} from '$lib/persist/read-engine-state';

// ---------------------------------------------------------------------------
// Hand-rolled IndexedDB mock (jsdom has no indexedDB).
//
// It implements just enough of the IDBFS contract for read-engine-state.ts:
//   indexedDB.open(name) -> IDBDatabase
//   db.transaction(store, 'readonly') -> tx
//   tx.objectStore(store) -> store
//   store.openCursor() -> request whose result walks the entries in order
//   db.close()
// `entries` is a map of in-FS path -> { timestamp, mode, contents }.
// Pass `undefined` to simulate a missing database (open fails).
// ---------------------------------------------------------------------------

interface MockEntry {
	timestamp?: number;
	mode?: number;
	contents?: Uint8Array;
}

function makeIdb(entries: Record<string, MockEntry> | undefined) {
	const openCalls: string[] = [];

	function makeRequest() {
		const req: {
			result: unknown;
			error: unknown;
			onsuccess: ((this: unknown, a: unknown, b: unknown) => void) | null;
			onerror: ((this: unknown, a: unknown, b: unknown) => void) | null;
			onblocked: ((this: unknown, a: unknown, b: unknown) => void) | null;
		} = { result: undefined, error: undefined, onsuccess: null, onerror: null, onblocked: null };
		return req;
	}

	const db = {
		close: vi.fn(),
		transaction: vi.fn((_store: string, _mode: string) => ({
			objectStore: vi.fn((_store: string) => ({
				openCursor: vi.fn(() => {
					const req = makeRequest();
					const keys = Object.keys(entries ?? {});
					let i = 0;
					const step = () => {
						if (i >= keys.length) {
							req.result = null;
							req.onsuccess?.(req, {});
							return;
						}
						const key = keys[i++];
						req.result = { key, value: entries![key], continue: step };
						req.onsuccess?.(req, {});
					};
					// Async, like a real IDB request.
					queueMicrotask(step);
					return req;
				})
			}))
		}))
	};

	const indexedDB = {
		open: vi.fn((name: string) => {
			openCalls.push(name);
			const req = makeRequest();
			queueMicrotask(() => {
				if (entries === undefined) {
					req.error = new Error('NotFoundError');
					req.onerror?.(req, {});
				} else {
					req.result = db;
					req.onsuccess?.(req, {});
				}
			});
			return req;
		})
	};

	return { indexedDB, openCalls };
}

function stubIdb(entries: Record<string, MockEntry> | undefined) {
	const { indexedDB } = makeIdb(entries);
	vi.stubGlobal('indexedDB', indexedDB);
}

function utf8(text: string): Uint8Array {
	return new TextEncoder().encode(text);
}

function saveJson(saveFileName: string, lastUtc: Record<string, number>, extra: Record<string, unknown> = {}) {
	return JSON.stringify({
		metadata: {
			save_file_name: saveFileName,
			last_utc_time: lastUtc,
			last_version_major: CURRENT_ENGINE_VERSION.major,
			last_version_minor: CURRENT_ENGINE_VERSION.minor
		},
		resources: { light: 12 },
		tab_unlocks: ['main', 'forest'],
		...extra
	});
}

const T1 = { year: 2026, month: 1, day: 15, hour: 10, minute: 0, second: 0 };
const T2 = { year: 2026, month: 2, day: 3, hour: 8, minute: 30, second: 0 };

afterEach(() => {
	vi.unstubAllGlobals();
});

describe('readEngineState', () => {
	it('reads a valid save (with $$$ signature) from the IDBFS store', async () => {
		stubIdb({
			'/userfs/unnamed.json': {
				timestamp: 1_700_000_000_000,
				mode: 33188,
				contents: utf8(saveJson('unnamed', T1) + '$$$')
			}
		});

		const state = await readEngineState();
		expect(state.hasSave).toBe(true);
		expect(state.saveFileName).toBe('unnamed');
		expect(state.versionOk).toBe(true);
		expect(state.resources).toEqual({ light: 12 });
		expect(state.tabUnlocks).toEqual(['main', 'forest']);
		expect(state.lastPlayed?.getFullYear()).toBe(2026);
		expect(state.lastPlayed?.getMonth()).toBe(0); // January
		expect(state.rawJson).toBe(saveJson('unnamed', T1));
	});

	it('resolves to NO_ENGINE_STATE when the database does not exist', async () => {
		stubIdb(undefined);
		const state = await readEngineState();
		expect(state).toEqual(NO_ENGINE_STATE);
	});

	it('resolves to NO_ENGINE_STATE when the store is empty', async () => {
		stubIdb({});
		const state = await readEngineState();
		expect(state.hasSave).toBe(false);
	});

	it('ignores non-save keys (e.g. other IDBFS files)', async () => {
		stubIdb({
			'/userfs/some_other_file.bin': { contents: utf8('not a save') },
			'/userfs/unnamed.json': { contents: utf8(saveJson('unnamed', T1)) }
		});
		const state = await readEngineState();
		expect(state.hasSave).toBe(true);
		expect(state.saveFileName).toBe('unnamed');
	});

	it('skips corrupt JSON and falls back to a valid save', async () => {
		stubIdb({
			'/userfs/broken.json': { contents: utf8('{ not valid json $$$') },
			'/userfs/good.json': { contents: utf8(saveJson('good', T1)) }
		});
		const state = await readEngineState();
		expect(state.hasSave).toBe(true);
		expect(state.saveFileName).toBe('good');
	});

	it('resolves to NO_ENGINE_STATE when all saves are corrupt', async () => {
		stubIdb({
			'/userfs/broken.json': { contents: utf8('garbage $$$') }
		});
		const state = await readEngineState();
		expect(state.hasSave).toBe(false);
	});

	it('flags a version mismatch', async () => {
		const json = saveJson('old', T1);
		const withOldVersion = JSON.stringify({
			...JSON.parse(json),
			metadata: { ...JSON.parse(json).metadata, last_version_minor: '1.4.0' }
		});
		stubIdb({ '/userfs/old.json': { contents: utf8(withOldVersion) } });
		const state = await readEngineState();
		expect(state.hasSave).toBe(true);
		expect(state.versionOk).toBe(false);
		expect(state.versionMinor).toBe('1.4.0');
	});

	it('picks the most recently played save when multiple exist', async () => {
		stubIdb({
			'/userfs/older.json': { contents: utf8(saveJson('older', T1)) },
			'/userfs/newer.json': { contents: utf8(saveJson('newer', T2)) }
		});
		const state = await readEngineState();
		expect(state.saveFileName).toBe('newer');
	});
});
