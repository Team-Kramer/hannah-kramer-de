#!/usr/bin/env node
// Compares the design.md token table against src/app.css.
// Warn-only: prints drift, exits 0 (design.md is the source of truth in hannah-kramer-saas).
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(process.cwd());
const designPath =
	process.env.DESIGN_MD || resolve(root, '../hannah-kramer-saas/design.md');
const cssPath = resolve(root, 'src/app.css');

if (!existsSync(designPath)) {
	console.warn(`[sync-tokens] design.md not found at ${designPath} — skipping.`);
	process.exit(0);
}

const design = readFileSync(designPath, 'utf-8');
const css = readFileSync(cssPath, 'utf-8');

// Parse table rows: | `--token` | `#value` | use |
const rows = [...design.matchAll(/^\|\s*`(--[\w-]+)`\s*\|\s*`([^`]+)`/gm)];
if (rows.length === 0) {
	console.warn('[sync-tokens] no token rows parsed from design.md — check format.');
	process.exit(0);
}

const norm = (v) => v.trim().toLowerCase().replace(/\s+/g, '');
let drift = 0;

for (const [, name, value] of rows) {
	// app.css implements design.md tokens in Tailwind 4's --color-* namespace.
	const m = css.match(new RegExp(`(?:--color-${name.slice(2)}|${name}):\\s*([^;]+);`));
	if (!m) {
		console.warn(`[sync-tokens] MISSING in app.css: ${name} = ${value}`);
		drift++;
		continue;
	}
	if (norm(m[1]) !== norm(value)) {
		console.warn(`[sync-tokens] DRIFT: ${name} design.md=${value} app.css=${m[1].trim()}`);
		drift++;
	}
}

if (drift === 0) {
	console.log(`[sync-tokens] OK — ${rows.length} tokens in sync with design.md.`);
} else {
	console.warn(`[sync-tokens] ${drift} token(s) out of sync (warn-only, not failing).`);
}
