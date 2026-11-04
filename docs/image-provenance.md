# Image provenance (B19)

Every image shipped in this repo is either a **generated placeholder** (no
third-party rights) or a **self-generated** asset. No original art from the
upstream [GodotProjectZero](https://github.com/TinyTakinTeller/GodotProjectZero)
is included — see [`game/docs/asset-strip.md`](../game/docs/asset-strip.md) for
the full strip log.

## Current state (2026-11-03)

All game images are **PIL-generated solid-color placeholders** created during
the Phase 2 asset strip. They exist so the engine compiles and runs; they carry
no artistic content and no third-party rights.

| Surface | Files | Generator | Date |
|---|---|---|---|
| Game icons / art / souls | `game/assets/image/**` | Python PIL (solid color + label) | 2026-10 (Phase 2) |
| Mission 01 scene | `game/assets/image/missions/spielplatz_01_start.png` | Python PIL placeholder | 2026-10 (Phase 2) |
| Character portraits | `game/assets/image/missions/char_portrait_placeholder.png` | Python PIL placeholder | 2026-10 (Phase 2) |
| Site favicon | `static/favicon.ico` | generated | 2026-10 (Phase 1) |
| Site placeholders | `static/images/placeholders/IMG-001..033.svg` | hand-written SVG (palette gradients) | 2026-10 (Phase 3) |

## Replacement plan (AI image batches)

### Game surface

The batch list with per-image generation prompts lives in
[`game/docs/asset-strip.md`](../game/docs/asset-strip.md) under **TODO-IMG**:

- **Batch A** — UI / icons (6 images)
- **Batch B** — Mission 01 scene (1 image)
- **Batch C** — Mission 01 character portraits (5 images)

### Site surface

The static site ships 33 SVG placeholders (`static/images/placeholders/IMG-0NN.svg`).
Each usage site carries a `TODO-IMG` HTML comment with the slot id, target
filename, aspect ratio, and a "what to show" description:

| Slot | Target | Ratio | Where |
|---|---|---|---|
| IMG-018 | `hero.webp` | 16:9 1600×900 | index hero — Hannah with lantern at the edge of the night forest, glowing path |
| IMG-024 | `profile.webp` | 1:1 512×512 | index profile — warm illustrated portrait, indigo bg, gold rim light |
| IMG-033 | (OG image) | 1200×630 | `<meta og:image>` — lantern in the night |
| feature slots | `feature-*.webp` | 4:3 800×600 | index feature cards |
| mission slots | `mission-NN.webp` | 4:3 800×600 | `/missionen/` cards |

When a batch is generated, record it in the table below.

When a batch is generated, record it here:

| Batch | Generator / model | Prompt source | Date | Files replaced |
|---|---|---|---|---|
| — | — | — | — | — |

## Style constraints (all generated images)

- Palette: indigo `#1E1B4B`, cream `#FFF9EF`, gold `#F5B942`
- Storybook illustration, soft light, rounded shapes
- **Never scary** — no dark horror cues, no sharp contrast, no menacing faces
- The "Schatten der Eile" is a tired grey mist with a clock face, not a monster

## Legal

- Placeholders: self-generated, no rights issues.
- Future AI-generated images: keep the generation prompts + model + date in the
  table above; verify the generator's terms allow commercial-free personal use.
- Upstream code remains MIT (see [`game/THIRD_PARTY.md`](../game/THIRD_PARTY.md));
  upstream **assets** are not used.
