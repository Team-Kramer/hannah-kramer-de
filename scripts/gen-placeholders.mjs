#!/usr/bin/env node
/**
 * gen-placeholders.mjs — deterministic SVG placeholders for every image slot
 * in content/images.json (PLAN_STATIC_HOMEPAGE.md Section F).
 *
 * Emits: static/images/placeholders/IMG-xxx.svg
 *   - indigo-night gradient + gold lantern motif + slot label
 *   - palette locked to design.md (indigo #1E1B4B / cream #FFF9EF / gold #F5B942)
 *
 * Usage: node scripts/gen-placeholders.mjs
 * Re-run after editing content/images.json; output is deterministic (no timestamps).
 */
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const manifest = JSON.parse(readFileSync(join(root, 'content/images.json'), 'utf8'));
const outDir = join(root, 'static/images/placeholders');
mkdirSync(outDir, { recursive: true });

const AR = {
	'1:1': [512, 512],
	'4:3': [640, 480],
	'16:9': [1280, 720],
	'1200×630': [1200, 630]
};

/** Lantern motif: small gold lantern with a soft glow, centered. */
function lantern(w, h) {
	const cx = w / 2;
	const cy = h * 0.42;
	const s = Math.min(w, h) * 0.16; // lantern scale
	return `
	<circle cx="${cx}" cy="${cy}" r="${s * 2.2}" fill="url(#glow)" opacity="0.55"/>
	<g stroke="#F5B942" stroke-width="${s * 0.08}" fill="none" opacity="0.9">
		<rect x="${cx - s * 0.55}" y="${cy - s * 0.45}" width="${s * 1.1}" height="${s * 1.1}" rx="${s * 0.22}" fill="rgba(245,185,66,0.18)"/>
		<line x1="${cx}" y1="${cy - s * 0.45}" x2="${cx}" y2="${cy - s * 0.75}"/>
		<circle cx="${cx}" cy="${cy - s * 0.85}" r="${s * 0.14}"/>
	</g>
	<circle cx="${cx}" cy="${cy + s * 0.1}" r="${s * 0.3}" fill="#F5B942" opacity="0.9"/>`;
}

/** A few deterministic fireflies (positions derived from the slot id). */
function fireflies(id, w, h) {
	let seed = 0;
	for (const ch of id) seed = (seed * 31 + ch.charCodeAt(0)) % 9973;
	const dots = [];
	for (let i = 0; i < 7; i++) {
		seed = (seed * 137 + 71) % 9973;
		const x = ((seed * 13) % 100) / 100 * w;
		const y = ((seed * 29 + 31) % 100) / 100 * h * 0.75 + h * 0.05;
		const r = 1.5 + ((seed * 3) % 10) / 4;
		dots.push(`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(1)}" fill="#F5B942" opacity="${(0.25 + (i % 4) * 0.12).toFixed(2)}"/>`);
	}
	return dots.join('\n');
}

function svg(slot) {
	const [w, h] = AR[slot.ar] ?? [1280, 720];
	const label = slot.label.replace(/&/g, '&amp;').replace(/</g, '&lt;');
	const id = slot.id;
	return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${label} — Platzhalter">
	<defs>
		<linearGradient id="night" x1="0" y1="0" x2="0" y2="1">
			<stop offset="0" stop-color="#1E1B4B"/>
			<stop offset="1" stop-color="#274438"/>
		</linearGradient>
		<radialGradient id="glow" cx="0.5" cy="0.5" r="0.5">
			<stop offset="0" stop-color="#F5B942" stop-opacity="0.5"/>
			<stop offset="1" stop-color="#F5B942" stop-opacity="0"/>
		</radialGradient>
	</defs>
	<rect width="${w}" height="${h}" fill="url(#night)"/>
	${fireflies(id, w, h)}
	${lantern(w, h)}
	<g font-family="Nunito, sans-serif" text-anchor="middle" fill="#FFF9EF">
		<text x="${w / 2}" y="${h * 0.78}" font-size="${Math.min(w, h) * 0.055}" font-weight="700" opacity="0.92">${label}</text>
		<text x="${w / 2}" y="${h * 0.78 + Math.min(w, h) * 0.07}" font-size="${Math.min(w, h) * 0.034}" opacity="0.55">${id} · ${slot.ar} · ${slot.size} · batch ${slot.batch} — TODO-IMG placeholder</text>
	</g>
</svg>
`;
}

let count = 0;
for (const slot of manifest.slots) {
	writeFileSync(join(outDir, `${slot.id}.svg`), svg(slot));
	count++;
}
console.log(`gen-placeholders: wrote ${count} SVGs to static/images/placeholders/`);
