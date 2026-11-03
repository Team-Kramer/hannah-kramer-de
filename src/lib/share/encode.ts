/**
 * Share-link encoding for "look how far I got".
 *
 * A share link is `/spiel/mission-01/?mission=mission-01#z=<snapshot>`.
 *
 * The `?mission=` part deep-links the engine straight into the mission
 * (already handled by the engine's `web_url_params.js`). The `#z=` part is an
 * optional URL-safe (base64url) snapshot of the engine's save JSON. When the
 * engine boots with `#z=` present it imports that snapshot as a new save file
 * (see game/native/js/web_url_params.js + save_file_picker.gd), so the same
 * world can be opened on another device/browser.
 *
 * The engine's `SaveFile.import_from_string` expects *standard* base64
 * (`Marshalls.base64_to_utf8`), so `encodeShareLink` emits base64url for the
 * URL and the engine-side importer converts base64url → standard base64 before
 * calling `import_from_string`.
 */

/** The playable mission id used for the share deep link. */
export const SHARE_MISSION_ID = 'mission-01';

/** Path of the playable mission page (trailing slash per static routing). */
export const SHARE_MISSION_PATH = '/spiel/mission-01/';

/**
 * Convert a UTF-8 string to URL-safe base64 (base64url, no padding).
 * Safe to embed in a URL fragment.
 */
export function toBase64Url(input: string): string {
	const bytes = new TextEncoder().encode(input);
	let binary = '';
	for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
	const b64 = btoa(binary);
	return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** Convert base64url (with or without padding) back to standard base64. */
export function base64UrlToBase64(input: string): string {
	let b64 = input.replace(/-/g, '+').replace(/_/g, '/');
	const pad = b64.length % 4;
	if (pad === 2) b64 += '==';
	else if (pad === 3) b64 += '=';
	return b64;
}

/** Decode a base64url snapshot back to the original save JSON string. */
export function fromBase64Url(input: string): string {
	const b64 = base64UrlToBase64(input);
	const binary = atob(b64);
	const bytes = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
	return new TextDecoder('utf-8').decode(bytes);
}

/**
 * Encode a save JSON string into a `#z=` snapshot value (base64url).
 * Returns '' when the input is empty (no snapshot to share).
 */
export function encodeSnapshot(rawJson: string): string {
	const trimmed = rawJson.trim();
	return trimmed ? toBase64Url(trimmed) : '';
}

/** Decode a `#z=` snapshot value back to the save JSON string ('' on failure). */
export function decodeSnapshot(snapshot: string): string {
	const trimmed = snapshot.trim();
	if (!trimmed) return '';
	try {
		return fromBase64Url(trimmed);
	} catch {
		return '';
	}
}

export interface ShareLinkOptions {
	/** Save JSON to embed as a `#z=` snapshot (omit for a mission-only link). */
	snapshotJson?: string;
	/** Mission id for the deep link (defaults to the playable mission). */
	missionId?: string;
}

/**
 * Build a share link. With `snapshotJson` it embeds the world state so the
 * receiver opens the same world; without it it simply deep-links the mission.
 */
export function encodeShareLink(options: ShareLinkOptions = {}): string {
	const missionId = options.missionId ?? SHARE_MISSION_ID;
	const base = `${SHARE_MISSION_PATH}?mission=${encodeURIComponent(missionId)}`;
	const snapshot = options.snapshotJson ? encodeSnapshot(options.snapshotJson) : '';
	return snapshot ? `${base}#z=${snapshot}` : base;
}

export interface ParsedShareLink {
	missionId: string;
	snapshot: string;
}

/** Parse a share link (or full URL) back into its mission + snapshot parts. */
export function decodeShareLink(link: string): ParsedShareLink | null {
	try {
		const url = new URL(link, 'https://hannah-kramer.de');
		const missionId = url.searchParams.get('mission') ?? SHARE_MISSION_ID;
		const snapshot = url.hash.startsWith('#z=') ? url.hash.slice(3) : '';
		return { missionId, snapshot };
	} catch {
		return null;
	}
}
