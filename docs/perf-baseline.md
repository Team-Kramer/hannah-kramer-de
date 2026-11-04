# Performance baseline (Phase 7c)

Measured against the live site `https://hannah-kramer.de` (GitHub Pages, brotli)
and the local `game/.export/web/` build. Re-measure after any engine or asset change.

**Last measured:** 2026-11-03 (CI run 41696718301, commit `f7dab98`)

## Static site

| Metric | Target | Measured | Status |
|---|---|---|---|
| Initial JS (gzipped, all `_app` modules) | ≤ 200 KB | 77.9 KB | ✅ |
| Prerendered index HTML | H1, meta desc, OG, JSON-LD | all present | ✅ |
| No-CDN audit (external font/style/script) | none | none (only a `github.com` text link) | ✅ |

## Godot Web export (what visitors download)

| File | Size (live, transfer) |
|---|---|
| `index.js` | 2.9 MB |
| `index.wasm` | 1.6 MB |
| `index.pck` | 8.2 MB |
| `index.audio.worklet.js` + position worklet | ~11 KB |
| `index.html` / icons | ~25 KB |
| **Total** | **~12.8 MB** |

- Budget: ≤ 25 MB total. ✅
- `index.side.wasm` (48 MB of debug symbols, loaded only by a debugger) is
  **excluded** in the CI staging step — without that exclusion the live engine
  was 60 MB. Release behavior is unaffected.
- Local uncompressed export is 59 MB (includes the side file); the staged
  `build/spiel/engine/` is what ships.

## Boot / playthrough (to be measured on a real device)

These need a mid-range phone on 4G; record here when done:

- [ ] `/spiel` engine first-frame boot time (target < 8 s on 4G mid-range)
- [ ] Mission 01 full playthrough, all 9 mode×outcome combos
- [ ] Save/load round-trip (`?load=last` resume)
- [ ] Honeypot metric: landing → first in-game tap (target ≤ 15 s)
- [ ] TTS first-speak latency (static site)

## Lighthouse (to be measured)

No local Chrome available in the build environment; run via CI or a desktop
with Chrome. Targets (static routes): Performance ≥ 90, Accessibility ≥ 95,
Best Practices ≥ 95, SEO ≥ 95. `/spiel` is measured separately (Godot Web
exports are heavy by nature).

- [ ] Lighthouse scores recorded here
