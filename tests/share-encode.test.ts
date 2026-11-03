import { describe, expect, it } from 'vitest';
import {
	base64UrlToBase64,
	decodeShareLink,
	decodeSnapshot,
	encodeShareLink,
	encodeSnapshot,
	fromBase64Url,
	toBase64Url
} from '$lib/share/encode';

describe('base64url helpers', () => {
	it('round-trips arbitrary UTF-8 (including emoji + umlauts)', () => {
		const input = 'Lichtwald — 🌲 Müller & Söhne';
		const encoded = toBase64Url(input);
		expect(encoded).not.toMatch(/[+/=]/); // URL-safe, no padding
		expect(fromBase64Url(encoded)).toBe(input);
	});

	it('base64UrlToBase64 restores standard base64 padding', () => {
		// "ab" -> "YWI=" ; "abc" -> "YWIj"
		expect(base64UrlToBase64('YWI')).toBe('YWI=');
		expect(base64UrlToBase64('YWIj')).toBe('YWIj');
		// already-padded input is left alone
		expect(base64UrlToBase64('YWI=')).toBe('YWI=');
	});
});

describe('snapshot encode/decode', () => {
	it('round-trips a save JSON string', () => {
		const json = JSON.stringify({ metadata: { save_file_name: 'unnamed' }, resources: { light: 5 } });
		expect(decodeSnapshot(encodeSnapshot(json))).toBe(json);
	});

	it('returns empty string for empty input', () => {
		expect(encodeSnapshot('')).toBe('');
		expect(encodeSnapshot('   ')).toBe('');
		expect(decodeSnapshot('')).toBe('');
	});

	it('decodes a corrupted snapshot to empty string (no throw)', () => {
		expect(decodeSnapshot('!!!not-base64!!!')).toBe('');
	});
});

describe('encodeShareLink / decodeShareLink', () => {
	it('builds a mission-only link when no snapshot is given', () => {
		const link = encodeShareLink();
		expect(link).toBe('/spiel/mission-01/?mission=mission-01');
		const parsed = decodeShareLink(link);
		expect(parsed).toEqual({ missionId: 'mission-01', snapshot: '' });
	});

	it('embeds the snapshot as a #z= fragment and round-trips it', () => {
		const json = JSON.stringify({ metadata: { save_file_name: 'wald' }, resources: { light: 42 } });
		const link = encodeShareLink({ snapshotJson: json });
		expect(link).toContain('/spiel/mission-01/?mission=mission-01#z=');
		const parsed = decodeShareLink(link);
		expect(parsed?.missionId).toBe('mission-01');
		expect(decodeSnapshot(parsed?.snapshot ?? '')).toBe(json);
	});

	it('handles a full absolute URL', () => {
		const json = JSON.stringify({ a: 1 });
		const link = `https://hannah-kramer.de${encodeShareLink({ snapshotJson: json })}`;
		const parsed = decodeShareLink(link);
		expect(parsed?.missionId).toBe('mission-01');
		expect(decodeSnapshot(parsed?.snapshot ?? '')).toBe(json);
	});

	it('defaults an empty link to the playable mission', () => {
		expect(decodeShareLink('')).toEqual({ missionId: 'mission-01', snapshot: '' });
	});

	it('returns null for a link that cannot be parsed', () => {
		// An incomplete IPv6 host makes the URL parser throw.
		expect(decodeShareLink('http://[::1')).toBeNull();
	});
});
