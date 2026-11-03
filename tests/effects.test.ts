import { render, screen } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import Page from '../src/routes/+page.svelte';
import SoFunktionierts from '../src/routes/so-funktionierts/+page.svelte';
import GrowBar from '../src/lib/ui/effects/GrowBar.svelte';
import Reveal from '../src/lib/ui/effects/Reveal.svelte';
import TiltCard from '../src/lib/ui/effects/TiltCard.svelte';
import { attachTilt, prefersReducedMotion } from '../src/lib/ui/effects/tilt';
import type { Snippet } from 'svelte';
import Header from '../src/lib/components/Header.svelte';

/** Re-stub matchMedia with a query-dependent implementation. */
function stubMatchMedia(impl: (query: string) => boolean) {
	vi.stubGlobal(
		'matchMedia',
		vi.fn().mockImplementation((query: string) => ({
			matches: impl(query),
			media: query,
			addEventListener: vi.fn(),
			removeEventListener: vi.fn(),
			addListener: vi.fn(),
			removeListener: vi.fn(),
			dispatchEvent: vi.fn()
		}))
	);
}

afterEach(() => {
	stubMatchMedia(() => false);
});

describe('effects — adopted (Section E)', () => {
	it('#1/#2: sticky nav uses glass + frosted-nav', () => {
		const { container } = render(Header);
		const header = container.querySelector('header');
		expect(header).toHaveClass('glass', 'frosted-nav', 'sticky');
	});

	it('#4: playable mission card carries the rotating glow', () => {
		const { container } = render(Page);
		const glow = container.querySelector('.rotating-glow');
		expect(glow).not.toBeNull();
		expect(container.querySelectorAll('.rotating-glow')).toHaveLength(1);
	});

	it('#6: hero CTA uses the glow button', () => {
		const { container } = render(Page);
		const cta = screen
			.getAllByRole('link', { name: /Spiel jetzt/i })
			.find((el) => el.className.includes('glow-gold'));
		expect(cta).toHaveClass('glow-button');
	});

	it('#8: hero headline uses gradient text', () => {
		const { container } = render(Page);
		expect(container.querySelector('.gradient-gold')).not.toBeNull();
	});

	it('#13: grow bar renders with correct progressbar semantics', () => {
		render(GrowBar, { percent: 14, label: 'Wald-Fortschritt' });
		const bar = screen.getByRole('progressbar', { name: 'Wald-Fortschritt' });
		expect(bar).toHaveAttribute('aria-valuenow', '14');
	});

	it('#14: hero CTA carries the pulse ring (single primary CTA)', () => {
		const { container } = render(Page);
		const rings = container.querySelectorAll('.pulse-ring');
		expect(rings).toHaveLength(1);
	});

	it('#16: gliding pill renders tabs with indicator on so-funktionierts', () => {
		const { container } = render(SoFunktionierts);
		expect(container.querySelector('.pill-tabs')).not.toBeNull();
		expect(container.querySelector('.pill-indicator')).not.toBeNull();
		expect(screen.getByRole('tab', { name: /Selbst entscheiden/i })).toBeInTheDocument();
	});

	it('#18: mission cards use the 4/3 aspect ratio', () => {
		const { container } = render(Page);
		const missionImg = container.querySelector('img[alt="Der kaputte Spielplatz"]');
		expect(missionImg).not.toBeNull();
		expect(missionImg!.className).toContain('aspect-[4/3]');
	});

	it('#19: secondary buttons use the non-touch hover lift', () => {
		const { container } = render(Page);
		expect(container.querySelector('.btn-lift')).not.toBeNull();
	});
});

describe('effects — conditionals with feature detection + fallbacks', () => {
	it('#3: metaball fireflies present in hero', () => {
		const { container } = render(Page);
		expect(container.querySelector('.fireflies')).not.toBeNull();
	});

	it('#7: hero image uses the mirror/reflection class (progressive enhancement)', () => {
		const { container } = render(Page);
		expect(container.querySelector('.hero-image')).not.toBeNull();
	});

	it('#9: blend-mode overlay present in hero', () => {
		const { container } = render(Page);
		expect(container.querySelector('.blend-texture')).not.toBeNull();
	});

	it('#10: Reveal starts hidden and observes with IntersectionObserver', () => {
		const ioSpy = vi.fn();
		vi.stubGlobal(
			'IntersectionObserver',
			class {
				constructor(_cb: IntersectionObserverCallback, _opts?: IntersectionObserverInit) {
					ioSpy();
				}
				observe = vi.fn();
				disconnect = vi.fn();
				unobserve = vi.fn();
				takeRecords = () => [];
			}
		);
		const { container } = render(Reveal, { children: (() => 'Hallo') as unknown as Snippet });
		expect(container.querySelector('.reveal-hidden')).not.toBeNull();
		expect(ioSpy).toHaveBeenCalled();
		vi.unstubAllGlobals();
	});

	it('#10: Reveal is instantly visible under reduced motion (no hidden content)', () => {
		stubMatchMedia((q) => q === '(prefers-reduced-motion: reduce)');
		const { container } = render(Reveal, { children: (() => 'Hallo') as unknown as Snippet });
		expect(container.querySelector('.reveal-hidden')).toBeNull();
		expect(container.querySelector('.reveal-shown')).not.toBeNull();
	});

	it('#11: tilt is a no-op under reduced motion', () => {
		stubMatchMedia((q) => q === '(prefers-reduced-motion: reduce)');
		expect(prefersReducedMotion()).toBe(true);
		const el = document.createElement('div');
		const detach = attachTilt(el);
		expect(el.style.transform).toBe('');
		detach();
	});

	it('#11: tilt applies a transform on pointer move and resets on detach', async () => {
		// fine pointer + no reduced motion → tilt is active
		stubMatchMedia((q) => q.includes('pointer: fine'));
		const el = document.createElement('div');
		el.getBoundingClientRect = () =>
			({
				left: 0,
				top: 0,
				width: 100,
				height: 100,
				right: 100,
				bottom: 100,
				x: 0,
				y: 0,
				toJSON: () => ({})
			}) as DOMRect;
		const detach = attachTilt(el);
		const move = new Event('pointermove');
		Object.defineProperty(move, 'clientX', { value: 100 });
		Object.defineProperty(move, 'clientY', { value: 0 });
		el.dispatchEvent(move);
		// transform is applied on the next animation frame
		await new Promise((r) => requestAnimationFrame(r));
		expect(el.style.transform).toContain('rotateY');
		detach();
		expect(el.style.transform).toBe('');
	});

	it('#12: typewriter is static under reduced motion', () => {
		stubMatchMedia((q) => q === '(prefers-reduced-motion: reduce)');
		const { container } = render(Page);
		const tw = container.querySelector<HTMLElement>('.typewriter');
		expect(tw).not.toBeNull();
		expect(tw!.textContent).toBe(tw!.dataset.text);
	});

	it('#15: hero parallax class present (CSS @supports no-ops in old browsers)', () => {
		const { container } = render(Page);
		expect(container.querySelector('.hero-parallax')).not.toBeNull();
	});
});

describe('effects — child-safety + reduced-motion guardrails', () => {
	it('app.css contains the global reduced-motion kill switch', async () => {
		const fs = await import('node:fs');
		const path = await import('node:path');
		const css = fs.readFileSync(
			path.join(__dirname, '..', 'src', 'app.css'),
			'utf8'
		);
		expect(css).toContain('prefers-reduced-motion: reduce');
		expect(css).toContain('animation-duration: 0.01ms !important');
	});

	it('no effect file uses red or danger colors', async () => {
		const fs = await import('node:fs');
		const path = await import('node:path');
		const dir = path.join(__dirname, '..', 'src', 'lib', 'ui', 'effects');
		for (const file of fs.readdirSync(dir)) {
			if (!file.endsWith('.css')) continue;
			const content = fs.readFileSync(path.join(dir, file), 'utf8').toLowerCase();
			// \bred\b — bare word "red" as a color; "prefers-reduced-motion" must not match
			expect(content, `${file} must not use red`).not.toMatch(/#f00|\bred\b|rgb\(\s*255\s*,\s*0/);
		}
	});

	it('pulses are slow enough (no flash > 3×/second)', async () => {
		const fs = await import('node:fs');
		const path = await import('node:path');
		const css = fs.readFileSync(
			path.join(__dirname, '..', 'src', 'lib', 'ui', 'effects', 'pulse-ring.css'),
			'utf8'
		);
		// 2.4s cycle ≈ 0.4 flashes/second — far below the 3×/second photosensitivity limit
		expect(css).toMatch(/2\.4s/);
	});
});
