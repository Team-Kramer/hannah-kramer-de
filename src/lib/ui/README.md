# UI Effects — Reference

One file per effect, CSS-first (JS only where the effect requires it).
All effects are **reduced-motion safe** (global kill switch in `app.css` +
per-effect overrides) and **child-safe** (no flash > 3×/s, no red, pulses
≤ 300ms / ≤ 8px spread, no full-screen changes).

| Ania # | Effect | File | Where | Notes |
|---|---|---|---|---|
| 1 | Apple-style glass | `app.css` (`.glass`) | Hero card, SaaS strip | Cream glass; solid fallback + `prefers-reduced-transparency` |
| 2 | Improved frosted glass | `frosted-nav.css` | Sticky nav (Header) | Layered blur + inner highlight; `-webkit-` prefix |
| 3 | Metaball light-blobs | `+page.svelte` (`.fireflies`) | Hero background only | 6s cycle, static under reduced motion |
| 4 | Rotating glow | `rotating-glow.css` | Playable mission card | `@property --angle` conic, gold→cream; static glow fallback |
| 5 | Pulsing rainbow text | — | — | **Rejected** (off-brand, too stimulating) |
| 6 | Super-glow button | `glow-button.css` | Primary CTAs | Gold glow, `translateY(-4px)` hover, `scale(0.96)` active |
| 7 | Mirror/reflection | `+page.svelte` (`.hero-image`) | Hero illustration | `-webkit-box-reflect`; no Firefox (progressive) |
| 8 | Gradient text | `+page.svelte` (`.gradient-gold`) | Hero headline only | Gold→cream; solid fallback |
| 9 | Blend-mode overlay | `blend-overlay.css` | Hero section texture | `soft-light`, behind content, low opacity |
| 10 | Clip-path reveal | `clip-reveal.css` + `Reveal.svelte` | Mission + blog cards | 200ms; instant-visible without JS / reduced motion |
| 11 | Interactive 3D card | `tilt.ts` + `TiltCard.svelte` | Mission cards | Max 4°; fine-pointer only; rAF-throttled, interruptible |
| 12 | Typewriter | `+page.svelte` | Hero tagline | 40ms/char, no cursor flash; static under reduced motion |
| 13 | Grow animation | `grow.css` + `GrowBar.svelte` | Stats strip (world progress) | Gold fill on cream track; `role="progressbar"` |
| 14 | Pulsing button | `pulse-ring.css` | Hero CTA only | 2.4s soft gold ring ≈ 0.4 flashes/s |
| 15 | Scroll-driven parallax | `scroll-parallax.css` | Hero background | `animation-timeline: scroll()`; ≤20px; no-op fallback |
| 16 | Gliding pill | `gliding-pill.css` + `GlidingPill.svelte` | Decision-mode switcher (`/so-funktionierts`) | JS-measured left/width; resize-aware |
| 17 | Readable text color | `app.css` tokens | `--on-gold` / `--on-night` | Contrast ≥ 4.5:1 (verified in `tokens.test.ts`) |
| 18 | Aspect-ratio layout | `aspect-ratio.css` | Scene 16/9, mission 4/3, avatar 1/1 | `object-fit: cover` |
| 19 | Button hover animation | `aspect-ratio.css` (`.btn-lift`) | All secondary buttons | `translateY(-3px)` + soft glow; fine-pointer only |
| 20 | Animation property reference | this file | — | Longhand reference for the team |

## Apple motion rules (governing all effects)

- **Springs:** damping 1.0 (no overshoot) for UI transitions; ~0.8 only for
  momentum elements (confetti).
- **Interruptibility:** JS animations read the current presentation value on
  interrupt (tilt re-reads pointer position every move; no snap-to-start).
  CSS uses `transition` (not `animation`) where interruptible.
- **Velocity handoff:** N/A for v1 (no drag gestures — tap-to-place only).
- **Translucent materials:** `backdrop-filter: blur(16px) saturate(140%)`
  with cream tint; solid `#FFF9EF` fallback where unsupported or
  `prefers-reduced-transparency: reduce`.
- **Size-specific typography:** display headings (≥32px, ≥40rem viewport) get
  `letter-spacing: -0.01em`, `line-height: 1.05`; story text stays ≥ 1.25rem.
- **`prefers-contrast: more`** → stronger borders on glass surfaces.

## Reduced motion

Global kill switch in `app.css`:

```css
@media (prefers-reduced-motion: reduce) {
	*,
	*::before,
	*::after {
		animation-duration: 0.01ms !important;
		animation-iteration-count: 1 !important;
		transition-duration: 0.01ms !important;
		scroll-behavior: auto !important;
	}
}
```

JS-driven effects (tilt, typewriter, GrowBar, Reveal) additionally check
`matchMedia('(prefers-reduced-motion: reduce)')` and render their static
fallback. Verified in `tests/effects.test.ts`.
