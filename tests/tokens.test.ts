import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const css = readFileSync(resolve(process.cwd(), 'src/app.css'), 'utf-8');

// design.md uses semantic names (--bg, --surface); app.css implements them in
// Tailwind 4's --color-* namespace. Try the color namespace first, then raw.
function token(name: string, scope = '@theme'): string {
	const scopeIdx = css.indexOf(scope);
	expect(scopeIdx, `scope ${scope} not found`).toBeGreaterThanOrEqual(0);
	const rest = css.slice(scopeIdx);
	for (const candidate of [`--color-${name}`, `--${name}`]) {
		const match = rest.match(new RegExp(`${candidate}:\\s*([^;]+);`));
		if (match) return match[1].trim();
	}
	throw new Error(`token --${name} not found in ${scope}`);
}

function hexToRgb(hex: string): [number, number, number] {
	const h = hex.replace('#', '');
	const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
	return [
		parseInt(full.slice(0, 2), 16),
		parseInt(full.slice(2, 4), 16),
		parseInt(full.slice(4, 6), 16)
	];
}

function luminance([r, g, b]: [number, number, number]): number {
	const f = (c: number) => {
		const s = c / 255;
		return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
	};
	return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

function contrast(a: string, b: string): number {
	const la = luminance(hexToRgb(a));
	const lb = luminance(hexToRgb(b));
	const [hi, lo] = la > lb ? [la, lb] : [lb, la];
	return (hi + 0.05) / (lo + 0.05);
}

describe('design.md v0.1 token block', () => {
	it('night stage + surfaces', () => {
		expect(token('bg')).toBe('#1e1b4b');
		expect(token('surface')).toBe('#fff9ef');
		expect(token('surface-elevated')).toBe('#ffffff');
		expect(token('border')).toBe('#e5d9c5');
	});

	it('text tokens', () => {
		expect(token('text')).toBe('#2a2440');
		expect(token('text-secondary')).toBe('#5c5670');
		expect(token('text-on-night')).toBe('#f5f1ff');
	});

	it('accent (soft gold)', () => {
		expect(token('accent')).toBe('#f5b942');
		expect(token('accent-hover')).toBe('#e0a52e');
		expect(token('accent-light')).toBe('#fdf3dc');
	});

	it('status tokens', () => {
		expect(token('success')).toBe('#3e9b5f');
		expect(token('warning')).toBe('#c97b2d');
		expect(token('danger')).toBe('#c2554f');
	});

	it('homepage additions (public face)', () => {
		expect(token('forest')).toBe('#274438');
		expect(token('glow-gold')).toBe('rgba(245, 185, 66, 0.45)');
		expect(token('glass-bg')).toBe('rgba(255, 249, 239, 0.65)');
		expect(token('on-gold')).toBe('#2a2440');
		expect(token('on-night')).toBe('#f5f1ff');
	});

	it('Apple motion tokens + keyframes', () => {
		expect(css).toContain('--ease-out-soft');
		expect(css).toContain('--duration-fast');
		expect(css).toContain('--duration-base');
		expect(css).toContain('--duration-slow');
		expect(css).toContain('@keyframes pulse-gold');
		expect(css).toContain('@keyframes cross-fade');
		expect(css).toContain('@keyframes confetti-fall');
	});

	it('glass blur token (Safari -webkit- prefix present)', () => {
		expect(css).toContain('--glass-blur');
		expect(css).toContain('-webkit-backdrop-filter');
	});

	it('prefers-reduced-motion global override', () => {
		expect(css).toContain('prefers-reduced-motion: reduce');
	});

	it('self-hosted fonts (no CDN)', () => {
		expect(css).toContain("@import '@fontsource/nunito/400.css'");
		expect(css).toContain("@import '@fontsource/material-symbols-outlined/400.css'");
		expect(css).not.toMatch(/https:\/\/fonts\.(googleapis|gstatic)/);
	});
});

describe('WCAG AA contrast (invariant)', () => {
	it('on-gold ≥ 4.5:1 on accent', () => {
		expect(contrast(token('on-gold'), token('accent'))).toBeGreaterThanOrEqual(4.5);
	});

	it('on-night ≥ 4.5:1 on bg', () => {
		expect(contrast(token('on-night'), token('bg'))).toBeGreaterThanOrEqual(4.5);
	});

	it('text ≥ 4.5:1 on surface', () => {
		expect(contrast(token('text'), token('surface'))).toBeGreaterThanOrEqual(4.5);
	});
});

describe('child-safety: no red/danger on game pages', () => {
	// The game pages (spiel + mission routes) must never reference the danger token.
	it('spiel route does not reference --danger / danger classes', () => {
		const spiel = readFileSync(
			resolve(process.cwd(), 'src/routes/spiel/+page.svelte'),
			'utf-8'
		);
		expect(spiel).not.toMatch(/danger/i);
	});
});
