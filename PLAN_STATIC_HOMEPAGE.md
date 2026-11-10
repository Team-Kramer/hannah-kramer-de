# Hannah Kramer — Static Homepage Implementation Plan (hannah-kramer.de)

**Updated:** 2026-11-04
**Owner:** Martin Kramer (operator) + AI agent
**Overall status:** Restarting at Phase 1 — verify the existing repo baseline before advancing
**Companion reference:** `hannah-kramer-saas/PLAN_DESIGN_INTEGRATION.md` (SaaS app design system — **separate scope**, this plan does not touch the SaaS frontend)

## Objective

Build the **public static homepage** for **hannah-kramer.de** — a zero-hosting-cost "Visitenkarte" (business card) and **honeypot for child-education game lovers** — as a fully static site on **GitHub Pages**: a SvelteKit (`adapter-static`) wrapper (profile, blog, showcase) around the **ported Godot 4.4 game** (Web export at `/spiel/`).

**The game is the full Godot 4.4 game, ported — not an HTML re-implementation.** The warm incremental decision game "Hannahs Lichtwald" — a magical world where children experience **Mitbestimmung, Fairness, Zivilcourage und Verantwortung** — is based on **`GodotProjectZero`** ("A Dark Forest", the code base the Lichtwald plan names in `00` §2 / `01` §2, MIT-licensed code). The project is already copied into this repository as `game/`; the assets have been reduced to a demo set so the repo and license surface stay small while the Lichtwald art direction (Section F, `TODO-IMG` placeholders) is applied. The game is **exported to Web** (Godot 4.4 Web preset, `thread_support=false` — GitHub Pages compatible, no SharedArrayBuffer/COOP-COEP) and hosted at `/spiel/` on the same GitHub Pages site. Mission 01 "Der kaputte Spielplatz" (content from `02`) is the first Lichtwald content layer on top of the ported engine; Missions 02–07 ship as unlock-chain teasers.

**Licensing (binding):** `GodotProjectZero` code is **MIT** — the copy into this public repo is permitted **with attribution** (`game/LICENSE` + `game/THIRD_PARTY.md` kept). Assets are **licensed per file**; the asset strip keeps only what the demo set needs, and every kept third-party asset keeps its license record and attribution (Phase 2b).

**Site structure (sokker.org reference, no signup/login):** the index page is a **sokker.org-style landing page** (hero with big headline + hero image, **no signup/login** — not needed for a frontend-only site). The index leads with **Hannah's personal profile** and a **blog section** (static markdown posts), followed by **alternating image/text feature sections** that showcase the game. **The game itself lives on subpages** (`/missionen`, `/spiel/[missionId]`, `/so-funktionierts`), not on the index — the index only *shows* it (feature sections + mission previews) and funnels into it via "Spiel jetzt".

**Hard constraints:**
1. **GitHub Pages only** — no server, no database, no API calls at runtime. Everything ships as static HTML/JS/CSS. (Web Speech API TTS is browser-native — no service.)
2. **Zero hosting cost** — public repo, free GitHub Pages tier.
3. **Static hosting only** — the site is SvelteKit + `adapter-static` (frontend/TypeScript only); the game is the **Godot Web export** (static HTML/JS/WASM, `thread_support=false`) — together everything ships as static files, no server logic.
4. **"Never scary" (design.md v0.1, binding):** ages 4–6 — no red except gentle try-again, ≥56px touch targets, audio-on-tap only, transcripts for all narration, 200ms cross-fade, 300ms gold pulse, no hover-dependent state, no drag-and-drop (tap-to-place).
5. **Honeypot goal** — a parent/educator who lands here can start Mission 01 within 15 seconds (landing → engine first frame → first in-game tap), and every page funnels toward Hannah (profile) + the Hannah SaaS ("brave, imaginative, warm, never scary — as a product").

## Three-source discipline

| Source | Role |
|---|---|
| `docs/non-commercial-blog/hannah-lichtwald/00–03` (96+172+180+71 lines) | **Feature source of truth** — the Lichtwald game: core loop, 4 resources, mission data structure, Mission 01 in full detail, missions 02–07 roadmap, design principles. Section B maps every feature to a verdict (Godot port / static site / deferred). |
| `GodotProjectZero` (`/Users/kram030/git/GodotProjectZero`, origin `TinyTakinTeller/GodotProjectZero`) | **The game engine to port** — "A Dark Forest" (Godot 4.4, GL Compatibility), the base named in `00` §2 / `01` §2. All code copied into `game/` (MIT, attribution kept); assets stripped to a reduced demo set (Phase 2). Web export preset already configured (`thread_support=false`, `extensions_support=true`). |
| `hannah-kramer-saas/design.md` v0.1 + `hannah-kramer-saas/PLAN_DESIGN_INTEGRATION.md` | **Visual values** — "brave, imaginative, warm, never scary": deep indigo night + warm cream + soft gold, Nunito, ≥56px targets, 200ms cross-fade, 300ms gold pulse. The homepage is the public face of the same brand. |
| **Apple Design** (WWDC *Designing Fluid Interfaces* + *Principles of Great Design*, via the `apple-design` skill) | **Motion & interaction system** — how everything moves and responds: springs (damping 1.0 default, bounce only for momentum), interruptibility, velocity handoff, translucent materials, size-specific typography, reduced-motion equivalents. Governs *how* the Ania effects and all UI motion are implemented. |
| `ania-kubow-css-effects.md` (858 lines, 20 effects) | **Effects & motion techniques** (a menu, not a spec). Adopted useful-only (Section E), re-implemented with Lichtwald tokens **and** Apple motion rules, reduced-motion-safe, and **child-safe** (no flashing, no sudden full-screen changes). |
| `sokker.org/en/` | **Index page structure reference** — hero (big headline + hero image) → alternating feature sections (image left/right, headline + 2–3 sentence pitch) → stats strip → single "Play now" CTA, **without** signup/login (frontend-only site needs no accounts). |

**Precedence:** GitHub Pages constraint > "never scary" constraint > honeypot product goal > design.md values > Apple motion rules > Ania effects. An effect is adopted **only** if it fits the picture-book language, follows the Apple motion rules (interruptible, velocity-aware, reduced-motion-safe), and passes the a11y + child-safety invariants (Section E verdicts).

## Status

| Phase | Status | Notes |
|---|---|---|
| 0. Decisions | Reference | Carry forward the documented defaults; Phase 1 is the restart point, not a new sign-off phase |
| 1. Repo, CI, static adapter, tokens | In progress | Local checks and live Pages deploy pass; GDScript lint repair is local and awaits a CI run after push |
| 2. Godot engine & new content | In progress | Mission 01 intro/data validation and headless tests started; full playable flow remains in [PLAN_GODOT_REBUILD.md](./PLAN_GODOT_REBUILD.md) |
| 3. UI components (static site) | Verify after Phase 1 | Ported SaaS components + showcase components |
| 4. Pages | Verify after Phase 1 | Index, mission pages, game host, blog, guide, legal |
| 5. Effects (Ania/Apple) | Verify after Phase 1 | Adopted/conditional/rejected effects — static wrapper only |
| 6. Persistence & sharing | Implemented; re-test after game changes | Site reads engine saves; resume/share links |
| 7. Quality (a11y, SEO, Lighthouse, PWA) | In progress | Deploy exists; audits and measurable acceptance checks remain |

## Current state

- **Target repo:** `Team-Kramer/hannah-kramer-de`. It already contains the SvelteKit app, `adapter-static`, GitHub Pages workflow, CNAME, tests, tokens, and a Godot project. Phase 1 is a verify-and-gate restart; do not scaffold over or delete the current implementation.
- **Static adapter and deployment:** `svelte.config.js` configures `adapter-static` with `build/` output and a `404.html` fallback. `.github/workflows/pages.yml` runs checks, tests, prerendering, Godot Web export, staging at `build/spiel/engine/`, and Pages deployment. Confirm the repository Pages source/domain settings during Phase 1 rather than assuming the workflow file proves remote configuration.
- **Tokens and project scripts:** `src/app.css` contains the indigo/cream/gold design tokens and self-hosted fonts; `package.json` provides `check`, `test`, `build`, and `sync-tokens`.
- **Godot baseline:** `game/` already contains the copied project and stripped assets. `game/resources/missions/mission_data.gd`, `mission_01_spielplatz.tres`, `game/global/mission/decision.gd`, `outcomes.gd`, and the Mission 01 scene are present. This is a partial rebuild baseline, not a reason to repeat the copy/strip work.
- **Game plan split:** use [PLAN_GODOT_ASSET_STRIP.md](./PLAN_GODOT_ASSET_STRIP.md) to verify the keep/replace/remove decisions and [PLAN_GODOT_REBUILD.md](./PLAN_GODOT_REBUILD.md) for the post-strip content and game-flow rebuild.
- **Existing SaaS frontend** (`hannah-kramer-saas/frontend/`): SvelteKit 2.20 + Svelte 5 (runes) + Tailwind 4 + vitest 5 + jsdom, `@sveltejs/adapter-node` (server adapter — **not** GitHub Pages compatible). Its component library and `effects.ts` are reference material only; the SaaS frontend stays untouched.
- **The public homepage already exists in this repo** as a separate SvelteKit project using `adapter-static`, prerendering, and a Pages deploy pipeline; it is not a mode of the SaaS frontend.
- **Reusable assets:** the `design.md` v0.1 token set (copy, don't import — the homepage must not depend on the private repo), the SaaS `src/lib/ui/` components (port, token-driven), `effects.ts` gliding-pill logic, vitest setup.
- **Godot rebuild baseline:** the MIT-licensed GodotProjectZero project is already copied to `game/`; its assets have been reduced, and the Mission 01 schema/data, decision/outcome helpers, and mission scene are present. Verify their behavior with [PLAN_GODOT_ASSET_STRIP.md](./PLAN_GODOT_ASSET_STRIP.md) and rebuild from that baseline using [PLAN_GODOT_REBUILD.md](./PLAN_GODOT_REBUILD.md).

## Feature inventory

### A. Tokens & foundations (Phase 1)

`hannah-kramer-saas/design.md` v0.1 values (the "never scary" picture-book language):

| Token group | Values |
|---|---|
| Night stage | `--bg: #1E1B4B` (deep indigo night — the "night" the lantern lights up; calm, not threatening) |
| Surfaces | `--surface: #FFF9EF` (warm cream), `--surface-elevated: #FFFFFF`, `--border: #E5D9C5` |
| Text | `#2A2440` primary on cream, `#5C5670` secondary, `#F5F1FF` on night |
| Accent | `--accent: #F5B942` soft gold (primary action / active choice / lantern glow), hover `#E0A52E`, light `#FDF3DC` — **gold is used for ONE thing per screen** |
| Status | `--success: #3E9B5F`, `--warning: #C97B2D` (gentle try-again only), `--danger: #C2554F` (admin/destructive only — **never on the game pages**) |
| Type | Nunito (self-hosted via `@fontsource`) — rounded, friendly; story text always ≥ 1.25rem (parents read aloud) |
| Spacing | 8px grid: 4/8/16/24/32/48/64/80 |
| Radius | 4/8/16/24/9999 (pill) — picture-book cards use 16–24px |
| Elevation | Soft shadows (8px/32px black 8% glass; 4px/16px black 10% md) — warm, not harsh |
| Motion | 150–300ms; scene transitions 200ms cross-fade; puzzle success 300ms gold pulse; `prefers-reduced-motion` global override |
| Touch | **≥56px targets on all game-page interactive elements** (design.md invariant) |
| Icons | `@fontsource/material-symbols-outlined` (self-hosted) + emoji for section titles/celebration |

**Homepage additions (public face):**

| Token | Value | Purpose |
|---|---|---|
| `--color-forest` | `#274438` (derived deep forest green) | Landing hero gradient companion (night → forest) |
| `--color-glow-gold` | `0 0 24px rgba(245,185,66,0.45)` | CTA glow, lantern glow, mission-unlock celebration |
| `--glass-bg` | `rgba(255,249,239,0.65)` | Glass cards over night gradients (Ania #1/#2, light variant) |
| `--glass-blur` | `blur(16px) saturate(140%)` | Glass panels (Safari: `-webkit-` prefix) |
| `--on-gold` | `#2A2440` (contrast-verified ≥4.5:1 on `#F5B942`) | Text on gold fills (Ania #17) |
| `--on-night` | `#F5F1FF` | Text on indigo stage |

### B. Game features — Godot port + Lichtwald content layer (Phase 2) + static site

Derived from the Lichtwald plan (00–03). The game is the **ported GodotProjectZero** (all code copied into `game/`, assets stripped to a demo set); the **Lichtwald content layer** (Mission 01 etc.) is added on top as data; the **static site** (SvelteKit) wraps the game with profile/blog/showcase. **Verdicts: ✅ in scope (Godot port / content layer / static site), ⚠️ in scope but scoped down, ❌ out of scope.**

| # | Feature (source doc) | Verdict | Implementation |
|---|---|---|---|
| B1 | Core loop: Situation → Zuhören & Verstehen → Entscheiden/Abstimmen/Moderieren → Welt reagiert → Geschichte wächst (00 §1) | ✅ | **Delivered by the ported engine** — A Dark Forest is a data-driven incremental/decision game (events, choices, consequences, resource generation). The Lichtwald content layer (B5) maps the 4-step loop onto the engine's event/choice system; the 3 decision modes (B6–B8) are the Lichtwald-specific choice structure |
| B2 | Resource system: Lichttropfen, Mut-Sterne, Freundschaft, Rhythmus (01 §4, 00 Phase 1) | ⚠️ | **Engine has a resource system** (`resources/game_data/resource_generator.tres` + worker roles + cost functions). **Scoped:** keep the base resource system working for the demo; renaming/swapping to the 4 Lichtwald resources is a **content-layer task** (Phase 2c) — the demo set runs on the base resources first, Lichtwald resources are the first content change. HUD display already in the engine UI |
| B3 | Save system (00 Phase 1) | ✅ | **Already in the engine** — `SaveFile` autoload + main scene `save_file_picker.tscn` (save-file picker at boot). Web export persists via IndexedDB (Emscripten IDBFS, DB `/userfs`). Static-site "Continue" banner reads the same saves (Phase 6) |
| B4 | Mission data structure `MissionData` (01 §5: id, title, intro, characters, resource_pool, options, outcomes) | ✅ | **Content layer:** GDScript `Resource` (or `.tres`/spreadsheet via the ported `resources_spreadsheet_view` addon) mirroring `01` §5 1:1; missions as data files under `game/resources/missions/`; a `validate_missions.gd` script (headless, CI-run) checks every mission file |
| B5 | Mission 01 "Der kaputte Spielplatz" complete (00 Phase 2, 02 full): intro, 5 characters with dialogues, resource distribution, 3 decision paths, 3 outcomes with consequences | ✅ | **Content layer (Phase 2c):** verbatim content from `02-Mission-01-Kaputter-Spielplatz.md` (Juan/Lina/Tobi/Oma Linde/Schatten der Eile; options barrierefrei 50 / rutsche 40 / fussball 35 / ruhebereich 30 / alles_halb 120; outcomes good/medium/weak) as mission data + dialogue events in the engine |
| B6 | Weg A – Selbst entscheiden (02 §5) | ✅ | Choice scene: direct 1–2 option selection (tap-to-place, budget bar ≤ 120) — engine UI, ≥56px touch targets, no drag-drop |
| B7 | Weg B – Abstimmung (02 §5): residents vote, Freundschafts-Funken weight votes | ✅ | Engine logic (GDScript, unit-testable scene/script): per-character vote intent derived from dialogue state (listened-to characters vote for their wish; weight = 1 + 0.1 × freundschaft); deterministic tie-break (fewest listened-to first — the quiet voice wins ties) |
| B8 | Weg C – Moderieren (02 §5): compromise proposal, costs Mut-Sterne, best social outcome | ✅ | Engine logic: compromise = union of selected options that fits budget; costs 5 Mut-Sterne; unlocks the "fair & mutig" outcome track |
| B9 | Outcomes & consequences (02 §6): good (barrierefrei + ≥1 more → Licht-Rat unlocked, +15 Mut-Sterne, +20 Freundschaft), medium (loudest idea only → Schatten der Eile stronger), weak (alles_halb / Juan forgotten → mission repeatable) | ✅ | Engine outcome conditions over final state (testable pure functions in GDScript); effects applied to world state; outcome text shown as picture-book scene |
| B10 | Schatten der Eile (antagonist, appears when Hannah hesitates too long; grows on medium outcomes) (02 §3/§6) | ⚠️ | **Scoped:** presence as a gentle timer-voice (appears after 45s idle in deciding phase, soft text, never a countdown pressure) + world-state meter that grows on medium outcomes and shrinks on good ones. No dark visuals, no scary audio — "never scary" |
| B11 | Missions 02–07 (03 roadmap): neuer Mitbewohner, Lagerfeuer-Streit, laute/stille Gruppe, ausgegrenzt, Licht-Rat, große Entscheidung | ⚠️ | **v1: unlock-chain teasers** — the static-site `/missionen` page shows all 7 with lock states + one-line descriptions (from `03`); only Mission 01 playable in the game. The engine is content-driven, so 02–07 are data-only additions later (Phase 4b) |
| B12 | Licht-Rat as recurring element (00 Phase 4, unlocked by Mission 01 good outcome) | ⚠️ | **v1: unlock state + teaser card** on `/missionen` ("Der Licht-Rat ist erwacht — Mission 06 folgt"). Full council mechanic deferred (later content phase) |
| B13 | Relationship values per resident (00 Phase 4) | ⚠️ | **v1: per-mission freundschaft delta only** (listening to a character raises their vote weight + final freundschaft). Persistent per-character relationship graph deferred |
| B14 | World reactions: visual + narrative impact on the forest (00 Phase 4) | ⚠️ | **v1: narrative only** — outcome text + a "Wald-Status" card on the static `/missionen` page (which ideas are built, shown as chips). Visual forest changes deferred (needs the art pipeline, Section F) |
| B15 | Web export + GitHub Pages + hannah-kramer.de (00 Phase 5, 01 §8) | ✅ | **This plan, core deliverable** — Godot 4.4 Web export (preset already configured: `thread_support=false`, `extensions_support=true`) built in CI, served at `/spiel/` on the same Pages site as the SvelteKit static wrapper (Phase 1b/2e) |
| B16 | Hannah-fähig: clear data structure for new missions + kind-friendly guide "Eigene Mission bauen" (00 Phase 6) | ✅ | `docs/mission-authoring.md` (German, step-by-step, example mission) + the mission `Resource` schema + `validate_missions.gd` (CI-checked) + the ported spreadsheet addon for data editing. No builder UI in v1 (D6) |
| B17 | Story-Generation-API connection (00 §2, 03 §Verbindung) | ⚠️ | **v1: structured data out** — every completed mission emits a structured record (voices heard, decision, consequences) stored in the engine world state, documented as the future API contract (`docs/story-api-contract.md`). No runtime API calls |
| B18 | Narration (design.md: audio-on-tap, transcripts) | ⚠️ | **Split:** in-game audio via the engine's `Audio` autoload (demo set: 1–2 gentle ambient loops + soft UI blips, audio-on-tap where the engine allows, "never scary"); **static-site narration** (blog/feature text) via Web Speech API (`speechSynthesis`), **tap-to-play only**, German voice preference, transcript always visible, graceful no-op where unsupported |
| B19 | Images for missions (00 Phase 2 "Bilder generieren", 02 §8 style lock) | ⚠️ | **Full image plan (Section F) — now covers BOTH surfaces:** (a) Godot game images in `game/assets/image/` (avatars, scenes, option cards — replace the stripped base art), (b) static-site images in `static/images/` (hero, features, teasers, OG). Every image place gets a **simple generated placeholder** first, with a detailed `TODO-IMG` comment (GDScript `# TODO-IMG:` in game code, HTML comment in Svelte) describing exactly what the final AI-generated image must show. Placeholders generated by `scripts/gen-placeholders.mjs` (deterministic SVGs in the design.md palette). Finals: `.webp` (16:9 scenes, 1:1 avatars, 4:3 cards), style lock from `02` §8, provenance in `docs/image-provenance.md`. Fallback: the placeholder itself (never a broken image) |
| B20 | Itch.io parallel hosting (01 §8) | ❌ | Out of scope for v1 (separate deploy of the same Web export — trivial fast-follow once `/spiel/` works) |
| B21 | Godot 4 game (00 Phases 0–6, GodotProjectZero base) | ✅ | **In scope — this IS the game** (Phase 2): full code copy of `GodotProjectZero` into `game/` (MIT, attribution kept), assets stripped to a reduced demo set, Web export at `/spiel/`. The old "web re-implementation" approach is **replaced** by this port |
| B22 | Accounts, leaderboards, online co-play | ❌ | Against the product ("no account, ever" for the public site) → SaaS if ever needed |

**Totals: 10 ✅, 9 ⚠️ (scoped), 3 ❌ (out of scope).**

### C. UI components (Phase 3)

**Two surfaces:** (1) the **Godot game** — its in-game UI (scene/dialogue panels, resource HUD, decision/vote/allocator/outcome screens) is the **ported engine's own UI**, styled via the engine's `theme` resource + the design.md palette (Phase 2c); no Svelte components for in-game UI. (2) the **static site** — SvelteKit components below.

Port from `hannah-kramer-saas/frontend/src/lib/ui/` (token-driven; re-tokenized to the design.md set). Homepage-specific components marked ★.

| Component | Source | Notes |
|---|---|---|
| Button, Card, Tabs (gliding pill), List item, Chip, Badge, Progress, Skeleton, Toast, Modal, Banner, Empty state, Icon, Section title, Logo | existing `src/lib/ui/` | Port as-is, re-tokenized; all CTAs ≥56px touch targets (design.md) |
| ★ Godot game embed | new | `<iframe>`-free embed of the Godot Web export at `/spiel/` (full-bleed section or dedicated route): loads `game/index.html` (Godot boot), shows the lantern boot splash while loading, "Laden…" progress, fallback message if the engine fails to boot; passes `missionId` via URL query (`/spiel/?mission=mission-01`) which the engine's `save_file_picker`/`autostart` reads (small GDScript change, Phase 2d) |
| ★ Mission map | new | Unlock chain (7 missions) as a lantern-lit path: completed (lit), current (glowing), locked (dim + lock icon + teaser line) |
| ★ World status card | new | "Wald-Status": built ideas as chips, Schatten-der-Eile meter (gentle, amber, never red) — reads the engine's world state from IndexedDB (Phase 6) |
| ★ Continue banner | new | Shown on index when the engine's save state exists in IndexedDB: "Weiter spielen — Mission 01" → `/spiel/?load=last` |

### D. Pages (Phase 4)

All routes **prerendered** (SEO) with client-side interactivity. Base path `''` (custom domain live).

**Index page structure (sokker.org reference — hero + profile + blog + alternating feature sections + stats strip, **no signup/login**):**

sokker's index is: big hero (headline + hero image + one "Play now" CTA) → 5 alternating image/text feature sections (each: illustration left/right, headline, 2–3 sentence pitch) → a "Play now for free" CTA → a second block of 4 icon/text value props → a stats strip (17 years · 50 languages · 5,000+ leagues · …). We adopt that exact rhythm, **minus the signup/login/register CTA** (a frontend-only site has no accounts — the CTA goes straight to the game), and insert the **profile + blog before the game showcase**, as required.

| # | Section | Content |
|---|---|---|
| 1 | **Hero** (sokker hero) | Big headline "Entdeck den Lichtwald" + subline "und triff mutige Entscheidungen mit Hannah" (gradient text #8, glass card #1, lantern glow #4, pulsing CTA #14); hero image (Hannah + lantern in the night, 16/9, B19-style illustration); primary CTA **"Spiel jetzt"** → `/spiel/mission-01` (sokker's "Play now for free" — **no register step**), secondary "Wer ist Hannah?" → `#profile` |
| 2 | **Profile** (`#profile`, **before the game**) | Hannah Kramer personal profile: photo, short bio (who Hannah is, why she builds games about brave democratic situations), links (GitHub, SaaS, contact) — the Visitenkarte |
| 3 | **Blog** (**before the game**) | Latest 3 posts (static markdown, `/blog` index + `/blog/[slug]`), each card: title, date, excerpt, read time; "Alle Beiträge" → `/blog` |
| 4 | **Feature sections** (alternating image/text, sokker-style, 5 sections) | "Zuhören & Verstehen" (dialogue with 5 characters), "Echte Entscheidungen" (3 Wege: selbst/abstimmen/moderieren), "Stimmen, die zählen" (leise Stimmen sichtbar machen, weighted voting), "Die Welt reagiert" (3 outcomes with consequences, Licht-Rat unlock), "Von Hannah, für Hannah" (Hannah-fähig: eigene Mission bauen) — each: illustration left/right alternating, headline, 2–3 sentence pitch, deep link to `/spiel/mission-01` or `/so-funktionierts` |
| 5 | **Mission previews** | Mission map (★) — all 7 missions from `03` as cards (3D tilt #11 conditional, locked ones dimmed with teaser line) → `/missionen`; "Continue" banner if IndexedDB save state exists (B3) |
| 6 | **Stats strip** (sokker-style) | "7 Missionen · 15+ Charaktere · 4 Ressourcen · 3 Entscheidungswege · 0 Accounts · 0 € Hosting" |
| 7 | **Final CTA + SaaS strip + footer** | "Bereit für den Lichtwald?" + "Spiel jetzt" (sokker's closing CTA) → `/spiel/mission-01`; "Brave, imaginative, warm, never scary — als Produkt" → Hannah SaaS; footer: nav, contact, legal (Impressum/Datenschutz) |

**No signup, no login, no account of any kind** — sokker's "Play now for free → register" CTA is replaced by "Spiel jetzt" (direct to the game).

| Route | Content | Honeypot CTA |
|---|---|---|
| `/` (index) | Structure above (hero → profile → blog → feature sections → missions → stats → CTA/SaaS) | "Spiel jetzt" → `/spiel/mission-01`; SaaS strip |
| `/missionen` | Mission map (★) full: 7 missions, unlock states, Wald-Status card (B14), world resources (B2) | "Mission 01 spielen" / continue |
| `/spiel` + `/spiel/[missionId]` | **The Godot game** (★ Godot game embed): the Web export of the ported engine, full-bleed; `missionId` passed as `?mission=` (default `mission-01`); in-game flow is the engine's: save picker → Mission 01 (B5) → dialogue → allocator → decision mode → outcome (B6–B9); boot splash + loading state + boot-failure fallback; share link (Phase 6) | "Noch mal spielen" / "Zur Übersicht" (in-engine UI) |
| `/so-funktionierts` | For parents & educators: what the game teaches (Mitbestimmung, Fairness, Zivilcourage, Verantwortung — mapped to the 6 design principles from `03`), how decisions work (the 3 modes, weighted voting), the "never scary" promise, data privacy (nothing leaves the browser), "Eigene Mission bauen" (B16 → `docs/mission-authoring.md` summary + link) | SaaS strip + GitHub link |
| `/blog` + `/blog/[slug]` | Blog index (all posts, prerendered, sorted by date desc) + post pages (markdown → Svelte, prose styling, frontmatter meta/OG) | Footer SaaS strip |
| `/impressum`, `/datenschutz` | Legal (required for .de) | — |

**Blog:** static markdown in `content/blog/*.md` (frontmatter: title, date, description, slug), prerendered at build time, no CMS, no comments. First post: "Warum ich Spiele über mutige Entscheidungen baue" (placeholder content, Hannah/Martin edit later).

**Copy language:** German (target audience: German parents/educators). All UI strings in `src/lib/i18n/de.ts` (en as fast-follow, D5). Blog posts in German.

### E. Effects (from `ania-kubow-css-effects.md`) — verdicts for the public homepage

The homepage is the **playful public face** of the brand, but the **"never scary" constraint is binding**: no flashing, no sudden full-screen changes, no high-contrast strobing, no red glows. All re-implemented with design.md tokens; all reduced-motion-safe; browser notes from the source file respected.

| # | Effect | Verdict | Where | Rationale |
|---|---|---|---|---|
| 1 | Apple-style glass | ✅ Adopted | Hero card, SaaS strip, vote panel | Frosted glass over night/forest gradient = the signature look (light variant: cream glass, not white-on-dark) |
| 2 | Improved frosted glass | ✅ Adopted | Sticky nav bar | Layered blur + inner highlight; `-webkit-` prefix for Safari |
| 3 | Metaball | ⚠️ Conditional | Hero background only | **Soft glowing light-blobs** (gold/indigo, slow 6s cycle — "fireflies in the night"); **disabled under reduced-motion**; static gradient fallback; low contrast delta (never flashing) |
| 4 | Rotating glow | ✅ Adopted | "Lantern" motif: current-mission card, CTA ring | `@property --angle` + conic-gradient (**gold → cream**, not neon); static glow fallback where `@property` unsupported |
| 5 | Pulsing rainbow text | ❌ Rejected | — | Rainbow + pulsing = off-brand and too stimulating for ages 4–6 |
| 6 | Super-glow icon button | ✅ Adopted | Primary CTAs ("Spiel jetzt", "Weiter") | **Gold glow** on hover (not neon green/white), `translateY(-4px)` + `scale(0.96)` active |
| 7 | Mirror/reflection | ⚠️ Conditional | Hero illustration only | `-webkit-box-reflect` — **no Firefox support**; progressive enhancement, no layout dependency |
| 8 | Gradient text | ✅ Adopted | Hero headline only | Gold → cream on night; solid `#F5F1FF` fallback |
| 9 | Blend-mode overlays | ⚠️ Conditional | Section background textures | Subtle `soft-light` on night gradients; must not reduce text contrast (tested in `tokens.test.ts`) |
| 10 | Clip-path reveal | ✅ Adopted | Scene transitions (picture-book page turn) | `clip-path: inset()` reveal, 200ms (design.md cross-fade duration); instant-visible fallback |
| 11 | Interactive 3D card | ⚠️ Conditional | Mission preview cards on landing | Tilt on hover, **max 4°** (gentler than Felix's 8°); **disabled under reduced-motion and on touch** (design.md: no hover-dependent state) |
| 12 | Typewriter | ⚠️ Conditional | Hero tagline only | Types "Zuhören. Entscheiden. Miteinander."; **slow (40ms/char), no cursor flash**; static text fallback + reduced-motion |
| 13 | Grow animation | ✅ Adopted | Budget bar, vote tally, resource progress | Gold fill on cream track |
| 14 | Pulsing button | ✅ Adopted | Single primary CTA per page | **Soft gold pulse ring (300ms, design.md)**; disabled under reduced-motion |
| 15 | Scroll-driven animation | ⚠️ Conditional | Hero parallax (background shift, ≤20px) | `animation-timeline: scroll()` — modern browsers only; no-op fallback elsewhere; **no parallax on game pages** (design.md) |
| 16 | Gliding pill | ✅ Adopted | Tabs (decision-mode switcher), nav active indicator | Port `effects.ts` (anchor positioning + JS-measured fallback) |
| 17 | Readable text color | ✅ Adopted | `--on-gold` / `--on-night` tokens | Contrast-verified in `tokens.test.ts` (≥4.5:1) |
| 18 | Aspect-ratio layout | ✅ Adopted | Scene cards (16/9), mission cards (4/3), character avatars (1/1) | `aspect-ratio` + `object-fit` |
| 19 | Button hover animation | ✅ Adopted | All buttons (non-touch) | `translateY(-3px)` + soft glow; **no hover-dependent state on game pages** (tap targets only) |
| 20 | Animation property reference | ✅ Adopted | `src/lib/ui/README.md` | Longhand reference table for the team |

**Totals: 11 adopted, 6 conditional, 3 rejected.**

**Browser support guardrails (from source file):** `backdrop-filter` → `-webkit-` prefix (Safari); `-webkit-box-reflect` → no Firefox (progressive enhancement only); `@property` + `animation-timeline: scroll()` → modern browsers, feature-detected with static fallbacks; CSS Anchor Positioning → feature-detected, JS-measured transform fallback (already in `effects.ts`).

**Child-safety guardrails (this plan, binding):** no effect may flash > 3 times/second (photosensitivity); no full-screen effect changes; no red/danger colors in any effect; all pulses ≤ 300ms and ≤ 8px spread (design.md gold pulse); every effect has a `prefers-reduced-motion` off-switch.

### F. Image plan — placeholders first, AI-generated finals in batches (B19)

**Strategy:** every image place in the game and on the index (scenes/rooms, action & option cards, character avatars, backgrounds, mission cards, hero) gets a **simple generated placeholder** in code from day one, plus a **`TODO-IMG` comment** that describes in detail what the final image must show. Later, the finals are produced with an AI image generator **in batches** by reading the `TODO-IMG` comments; each final simply replaces the placeholder (same slot, same aspect ratio, no layout change).

**Two surfaces:** the manifest below is the **static-site** surface (`static/images/`). The **Godot game** surface (Phase 2b) reuses the same slot descriptions for its image slots in `game/assets/image/` — Batches A (characters), B (Mission-01 scenes) and C (option cards) are exactly the game's avatars/scenes/cards; Batches D–F are static-site only. `scripts/gen-placeholders.mjs` emits both: `static/images/placeholders/` for the site and `game/assets/image/placeholders/` for the game (Godot loads the SVG→PNG-converted placeholders; finals are `.png`/`.webp` in the same slots).

**Global style lock (prefix for every prompt, from `02` §8):**
`children's book illustration, soft warm lighting, magical forest, brave young girl, inclusive, gentle atmosphere, no horror, consistent character design, democratic everyday situations in a magical setting`
Plus per-image aspect: scenes/backgrounds `--ar 16:9`, cards `--ar 4:3`, avatars `--ar 1:1`. Palette must stay in the design.md set (indigo night `#1E1B4B`, cream `#FFF9EF`, soft gold `#F5B942`) so finals and placeholders look like one world.

**Placeholder rules (binding):**
1. Placeholders are **generated, not hand-drawn**: `scripts/gen-placeholders.mjs` reads `content/images.json` (the slot manifest below) and emits one deterministic SVG per slot into `static/images/placeholders/IMG-xxx.svg` — indigo-night gradient + gold lantern motif + slot label. Committed to the repo; the site always renders, never a broken image.
2. Every `<img>` in code references the placeholder and carries this exact comment shape (ID + size + batch + **detailed what-to-show description** — this text *is* the future AI prompt body):

```svelte
<!-- TODO-IMG: IMG-007 | scene-01-broken.webp | 16:9 1280×720 | batch B
     What to show: the broken playground in the magical forest at night — torn
     slide, cracked seesaw, a few children standing around looking sad, one
     warm lantern glowing in the center, indigo night sky, fireflies.
     Style lock: children's book illustration, soft warm lighting, no horror.
-->
<img src="/images/placeholders/IMG-007.svg" alt="Der kaputte Spielplatz"
     class="aspect-video w-full object-cover" loading="lazy" />
```

3. **Replacement workflow (later, in batches):** for each batch → run the AI image generator with `style lock + TODO-IMG description` → save the final `.webp` (site) / `.png` (game) to the target path from the manifest → swap the `src` → delete the `TODO-IMG` comment → record the row in `docs/image-provenance.md` (ID, final file, generator, prompt, date). `grep -rn "TODO-IMG" src/ game/` always shows what is still a placeholder.
4. **Never scary applies to finals too:** no dark horror elements, no sharp/angry faces; the Schatten-der-Eile avatar is a soft misty silhouette with a gentle clock motif — curious, not frightening.

**Slot manifest (single source of truth: `content/images.json` — 33 slots, 6 generation batches):**

| Batch | ID | Slot (component / page) | File | Size | What to show (detailed description) |
|---|---|---|---|---|---|
| **A — Characters** (avatars, 1:1 512×512, `static/images/characters/`) | IMG-001 | Dialogue panel, scene cards, vote panel | `hannah.webp` | 1:1 | Hannah, ~10-year-old girl, warm confident smile, holding a small glowing gold lantern, indigo night background, soft rim light |
| | IMG-002 | same | `juan.webp` | 1:1 | Juan, boy in a wheelchair, kind hopeful eyes, looking slightly up, soft warm light on his face |
| | IMG-003 | same | `lina.webp` | 1:1 | Lina, girl with a red backpack, excited open-mouthed smile, one hand raised (she wants the slide) |
| | IMG-004 | same | `tobi.webp` | 1:1 | Tobi, boy with a soccer ball under one arm, energetic grin, motion energy |
| | IMG-005 | same | `oma-linde.webp` | 1:1 | Oma Linde, elderly woman with a white headscarf, gentle calm smile, holding a small teacup (she wants the quiet area) |
| | IMG-006 | same, world-status card | `schatten-der-eile.webp` | 1:1 | Schatten der Eile — soft misty shadow silhouette with a subtle clock motif, amber-tinted, curious and gentle, **never scary/horror** |
| **B — Mission 01 scenes** (16:9 1280×720, `static/images/mission-01/`) | IMG-007 | Scene card — intro | `scene-01-broken.webp` | 16:9 | The broken playground in the magical forest at night: torn slide, cracked seesaw, children standing around looking sad, one warm lantern glowing, fireflies |
| | IMG-008 | Scene card — listening setup | `scene-02-juan.webp` | 16:9 | Juan in his wheelchair at the edge of the playground, looking at the broken equipment, soft gold light on his face, gentle melancholy |
| | IMG-009 | Scene card — listening | `scene-03-listening.webp` | 16:9 | Hannah sitting in a circle with the residents (Juan, Lina, Tobi, Oma Linde), listening with head tilted, lantern light in the center of the circle |
| | IMG-010 | Scene card — decision | `scene-04-moderating.webp` | 16:9 | Hannah standing in the center of the clearing, gesturing calmly, the four residents around her, a soft ring of light marking the decision space |
| | IMG-011 | Outcome card — good | `scene-05-joy.webp` | 16:9 | Joy moment: Juan laughing on the newly built barrier-free playground (ramp), the others cheering, warm gold light, confetti of light |
| | IMG-012 | Outcome card — good (unlock) | `scene-06-licht-rat.webp` | 16:9 | The Licht-Rat being founded: the residents gathered around a glowing table of light, lanterns floating, hopeful future mood |
| **C — Option/action cards** (4:3 640×480, `static/images/mission-01/options/`) | IMG-013 | Resource allocator — option card | `option-barrierefrei.webp` | 4:3 | A barrier-free playground: gentle ramp, wheelchair-accessible equipment, a child in a wheelchair smiling, warm light |
| | IMG-014 | same | `option-rutsche.webp` | 4:3 | A brand-new big slide, sparkling, a child at the top about to go down, excited |
| | IMG-015 | same | `option-fussball.webp` | 4:3 | A small soccer field with a goal, a ball in mid-air, grass glowing softly at night |
| | IMG-016 | same | `option-ruhebereich.webp` | 4:3 | A cozy quiet corner: wooden bench under a big tree, a small lamp, steam from a teacup, peaceful |
| | IMG-017 | same | `option-alles-halb.webp` | 4:3 | "Everything half-built": a bit of every idea at once — half a slide, half a goal, slightly messy, gentle irony, no mockery |
| **D — Index** (hero 16:9 1600×900; features 4:3 800×600; profile 1:1 512×512) | IMG-018 | Index hero | `static/images/index/hero.webp` | 16:9 | Hannah with her lantern standing at the edge of the magical night forest, a glowing path leading into the light, fireflies, indigo sky, sense of beginning |
| | IMG-019 | Feature section 1 (Zuhören & Verstehen) | `static/images/index/feature-zuhoren.webp` | 4:3 | Close-up: Hannah leaning in, listening to a small child character who is speaking, a soft glowing speech bubble, warm and intimate |
| | IMG-020 | Feature section 2 (Echte Entscheidungen) | `static/images/index/feature-entscheiden.webp` | 4:3 | A lantern standing on a crossroads with three glowing paths, each path a different color-glow (gold/cream/soft blue), choice without pressure |
| | IMG-021 | Feature section 3 (Stimmen, die zählen) | `static/images/index/feature-stimmen.webp` | 4:3 | A small quiet glowing voice-bubble (a little light) being lifted up and seen by a group, a gentle scale of light balancing loud and quiet |
| | IMG-022 | Feature section 4 (Die Welt reagiert) | `static/images/index/feature-welt.webp` | 4:3 | The forest reacting to a good decision: flowers of light blooming, trees glowing softly, the playground in the background |
| | IMG-023 | Feature section 5 (Von Hannah, für Hannah) | `static/images/index/feature-hannah.webp` | 4:3 | Hannah at a crafting table of light, arranging glowing blocks (mission pieces: character, option, outcome), creative and proud |
| | IMG-024 | Profile section | `static/images/index/profile.webp` | 1:1 | Hannah's portrait — **real photo if available, otherwise** a warm illustrated portrait (same style lock, indigo background, gold rim light) |
| **E — Mission teasers 02–07** (4:3 640×480, `static/images/missions/`) | IMG-025 | Mission map card 02 | `mission-02.webp` | 4:3 | A new small neighbor (a tiny forest creature with a backpack) arriving at the forest edge, curious |
| | IMG-026 | Mission map card 03 | `mission-03.webp` | 4:3 | A campfire at night, two small groups of children on either side, a gentle disagreement in the air, warm firelight |
| | IMG-027 | Mission map card 04 | `mission-04.webp` | 4:3 | A loud group of children (big glowing sound waves) next to one quiet child (small soft light), contrast made gentle |
| | IMG-028 | Mission map card 05 | `mission-05.webp` | 4:3 | A child standing just outside a circle of light, the circle has a gap inviting them in, gentle, not sad |
| | IMG-029 | Mission map card 06 | `mission-06.webp` | 4:3 | The Licht-Rat chamber: a round table of light, floating lanterns, the residents' silhouettes gathered, wise and warm |
| | IMG-030 | Mission map card 07 | `mission-07.webp` | 4:3 | The big decision: a wide clearing with all residents, a very large lantern in the center, a path branching into the bright forest |
| **F — Backgrounds & meta** | IMG-031 | Game page scene background (behind scene cards, subtle) | `static/images/backgrounds/night-forest.webp` | 16:9 | The Lichtwald at night as a soft backdrop: indigo sky, silhouetted trees, faint gold lantern glows, fireflies — **low detail, low contrast** (text must stay readable on top) |
| | IMG-032 | Decision phase background | `static/images/backgrounds/decision-clearing.webp` | 16:9 | A calm clearing with a soft ring of light on the ground, minimal, dreamy, low contrast |
| | IMG-033 | OG image (all pages) | `static/images/og.webp` | 1200×630 | A single glowing lantern in the night forest, "Hannahs Lichtwald" composition, indigo + gold, space for title text on the left |

**Totals: 33 slots — 6 characters, 6 scenes, 5 options, 7 index, 6 teasers, 3 backgrounds/meta.**

**Animation note (images in motion):** scene transitions cross-fade images over 200ms (design.md) with the clip-path reveal (#10) as the page-turn; the hero image gets the mirror effect (#7, progressive) + ≤20px scroll parallax (#15); outcome images fade in with the confetti. All image animation is **opacity/transform only** (compositor-friendly, child-safe).

---

## Phase 0 — Decisions (reference; Phase 1 is the restart point)

The recommendations below are retained as working defaults. Do not block Phase 1 on a separate decision sign-off. Re-open a decision only when a concrete implementation conflict or product change requires it.

### D1 (OPEN, leaning (b))

**Palette: design.md indigo-night + gold vs. SaaS CreateSpace rose vs. derive?**

| Option | Description | Pros | Cons |
|---|---|---|---|
| (a) CreateSpace rose/blue/yellow (SaaS `app.css` current) | Matches the SaaS as it is today | One brand across SaaS + homepage | **`#E11D48` rose/red conflicts with "no red except gentle try-again"**; the SaaS D1 is still open — building on an unresolved palette is risky |
| (b) design.md v0.1 indigo-night + gold (`#1E1B4B` / `#FFF9EF` / `#F5B942`) | The "never scary" picture-book language, already specified + binding | Matches the Lichtwald world (night the lantern lights up); zero open dependencies; tokens already documented in `design.md` | SaaS may end up on a different palette (its D1) — brand divergence between SaaS and public site |
| (c) Derive a new public palette | Fresh | — | Double design work; no source of truth |

**Recommendation: (b)** — `design.md` v0.1 is the only *resolved* Hannah visual spec, and the Lichtwald story is literally about light in the night. If the SaaS D1 later resolves to a different palette, the homepage tokens are a single-file change (Phase 1 blast radius). **Owner:** Product (Martin). **Status:** ⬜ leaning (b).

### D2 (RESOLVED ✅)

**Repo & domain.** → **Existing public repo `Team-Kramer/hannah-kramer-de`**, custom domain `hannah-kramer.de`, SvelteKit build and Pages workflow in the repository. Confirm the live Pages source/domain settings during Phase 1. `base: ''`. **Owner:** Product (Martin). **Status:** ✅ RESOLVED — repository and domain selected.

### D3 (depends on D1)

**Font.** design.md specifies Nunito (rounded, friendly, ages 4–6).

**Recommendation: Nunito** (self-hosted via `@fontsource/nunito`, weights 400/600/700/800) — consistent with D1 (b). **Owner:** Design. **Status:** ⬜ leaning Nunito.

### D4

**Mission content scope for v1.**

| Option | Description | Pros | Cons |
|---|---|---|---|
| (a) Mission 01 fully playable + 02–07 as unlock-chain teasers | Matches 00 Phase 2 (MVP) exactly | Small content surface, high quality; engine proves the data model | Site shows "coming soon" for 6/7 missions |
| (b) Missions 01–03 playable | More content | 3× content writing/curation | 02/03 are only sketched in `03` — would require writing full dialogues/options/outcomes now |

**Recommendation: (a)** — `02` is the only fully specified mission; 02–07 are one-paragraph sketches. The engine is content-driven, so (b) is a data-only fast-follow. **Owner:** Product (Martin). **Status:** ⬜ leaning (a).

### D5

**Language: German only vs. de + en?**

**Recommendation: German only for v1** (target audience: German parents/educators; all source content is German), i18n structure in place (`src/lib/i18n/de.ts`) so en is a fast-follow. **Owner:** Product (Martin). **Status:** ⬜ leaning de-only.

### D6

**"Eigene Mission bauen" (B16): guide + schema vs. in-browser builder UI?**

| Option | Description | Pros | Cons |
|---|---|---|---|
| (a) German guide (`docs/mission-authoring.md`) + JSON Schema + validation script | Hannah (or anyone) can add a mission by editing one JSON file + pushing | Simple, robust, CI-validated | No visual builder |
| (b) In-browser builder UI (form → JSON download) | Kind-friendly, no git needed | Big UI surface for v1 | Builder ≠ publishing (still needs a push); doubles the a11y surface |

**Recommendation: (a) for v1, (b) as fast-follow.** **Owner:** Product (Martin). **Status:** ⬜ leaning (a).

### D7

**TTS engine: Web Speech API vs. pre-recorded audio?**

| Option | Description | Pros | Cons |
|---|---|---|---|
| (a) Web Speech API (`speechSynthesis`) | Zero assets, zero cost, zero network | Voice quality varies by device; German voice not guaranteed on all devices |
| (b) Pre-recorded audio per scene (MP3/OGG) | Consistent warm voice | ~40 scenes × audio = large repo, generation cost, licensing |

**Recommendation: (a)** with graceful degradation (speaker button hidden where unsupported, transcript always visible — design.md already requires transcripts). **Owner:** Frontend. **Status:** ⬜ leaning (a).

### D8 (NEW — Godot port)

**Web-export location in repo/site & how the two builds combine for one Pages deploy.**

| Option | Description | Pros | Cons |
|---|---|---|---|
| (a) `game/` dir in repo; Godot export gitignored (exported in CI); Pages deploy = SvelteKit `build/` + copied `game/` export into `build/spiel/engine/` | One Pages deploy, one workflow builds both; game served at `/spiel/` (engine files under `/spiel/engine/`) | Single source of truth for the deploy; no subdomain; `thread_support=false` export works on plain Pages | CI must run headless Godot 4.4 (docker image, ~1–2 GB) or we commit the export |
| (b) Commit the Godot Web export into the repo (`game/web/`, ~5–15 MB after asset strip) | No Godot in CI; fastest iteration | Repo bloats with binary artifacts; export drifts from code unless re-exported on every game change |
| (c) Game on a separate subdomain/repo (`spiel.hannah-kramer.de`) | Isolation | Extra DNS + deploy; breaks the "one visitenkarte" simplicity |

**Recommendation: (a)** with a CI step that runs `godot --headless --path game --export-release "The Best Game Ever" game/.export/web/` (Godot 4.4 in a docker container or GitHub Actions runner with Godot installed) — the export is **never committed**; the SvelteKit workflow then copies the export into `build/spiel/engine/` before `adapter-static` upload (the SvelteKit route shell owns `/spiel/index.html`). Fallback if CI Godot proves flaky: (b) for the first demo, (a) as fast-follow. **Owner:** Frontend (Martin). **Status:** ⬜ leaning (a).

### D9 (NEW — Godot port)

**Asset strip depth for the demo set ("start again").**

| Option | Description | Pros | Cons |
|---|---|---|---|
| (a) Minimal demo set: keep code 100%; assets → 1 font (Nunito or the existing noto_sans), 1–2 ambient audio loops + 2–3 UI blips (CC0/CC-BY, license files kept), 6–10 placeholder images (Section F `TODO-IMG`), i18n → en + de only | Smallest repo (~2–5 MB game), smallest license surface, clean canvas for Lichtwald art | Base game art/audio gone — the demo looks placeholder-y until Section F batches run |
| (b) Keep all base assets, add Lichtwald on top | Base game fully playable as-is | 60 MB repo, 11 CC license files to track, Lichtwald art direction clashes with A-Dark-Forest art |

**Recommendation: (a)** — the user's explicit "strip down assets to a simple reduced demo set to start again". Every stripped asset slot becomes a `TODO-IMG`/`TODO-AUDIO` placeholder (Section F). Kept assets keep their license `.txt` + attribution in `game/THIRD_PARTY.md`. **Owner:** Product (Martin). **Status:** ⬜ leaning (a).

---

## Phase 1 — Repo, CI, static adapter, tokens (restart point)
*Verify and stabilize the existing `hannah-kramer-de` implementation before starting or resuming later phases. Treat current files as the baseline; do not recreate or delete them.*

### 1a. Repo and static adapter

- [x] Confirm the root is the existing `hannah-kramer-de` project and review its current worktree before changing files.
- [x] Confirm `package.json` uses SvelteKit 2, Svelte 5, Tailwind 4, Vite 6, and pnpm; keep the existing lockfile and dependency choices unless a verified blocker requires a change.
- [x] Verify `svelte.config.js` uses `@sveltejs/adapter-static`, outputs to `build/`, and emits the `404.html` fallback.
- [x] Verify every public route is prerendered and `vite.config.ts` uses the custom-domain base path (`base: ''`).
- [x] Confirm `static/CNAME` and the favicon are preserved and no obsolete Solo export is being served from the repo root.
- [x] Verify `src/app.html` metadata, Open Graph/Twitter fields, theme color, and structured data against the current public pages; record any missing metadata for the quality phase.

### 1b. GitHub Pages CI (static site + Godot export, per D8)

- [x] Verify `.github/workflows/pages.yml` runs `pnpm install --frozen-lockfile`, `pnpm check`, `pnpm test`, and `pnpm build` before uploading `build/`.
- [x] Verify the Godot 4.4 Web export is built from `game/` and staged at `build/spiel/engine/` without replacing the prerendered `/spiel/` route shell.
- [x] Verify the workflow deploys with `actions/upload-pages-artifact` and `actions/deploy-pages`; confirm repository Pages source is **GitHub Actions** and the `hannah-kramer.de` custom domain remains configured. Pages was switched from legacy to workflow; run `41906198295` and live routes succeeded.
- [x] Confirm GDScript linting is run in CI (add or repair a dedicated workflow if it is absent) and targets the intended kept game folders. The unsupported CLI flags were removed; local gdtoolkit 4.5 lint passes. **Remote rerun is pending push.**
- [x] Build and preview locally; verify the generated `404.html`, static routes, `/spiel/` shell, and `/spiel/engine/` export paths. Live planned routes and engine export returned HTTP 200.

### 1c. Test infrastructure

- [x] Verify the existing Vitest/jsdom/Testing Library/axe setup and retain the current tests.
- [x] Verify token tests cover the design.md values, contrast, glass/forest tokens, reduced motion/transparency, and the no-red game-page invariant.
- [x] Run `pnpm check`, `pnpm test`, `pnpm build`, and `pnpm sync-tokens`; resolve failures that block the baseline before moving on. Results: check clean, 54 tests pass, build succeeds, 13 tokens in sync.

**Done when:** all Phase 1 checks are recorded, local check/test/build/token-sync pass, and a Pages workflow run successfully deploys the current site. Site baseline and remote deploy are verified; the local lint-workflow repair still needs its first GitHub Actions run after push.

---

## Phase 2 — Godot engine baseline, strip audit & new content
*Depends on Phase 1. The Godot project is already present in `game/`; verify rather than re-copy it. Use [PLAN_GODOT_ASSET_STRIP.md](./PLAN_GODOT_ASSET_STRIP.md) for strip verification and [PLAN_GODOT_REBUILD.md](./PLAN_GODOT_REBUILD.md) as the execution checklist for rebuilding the game with Lichtwald content.*

### 2a. Copy the full Godot project into `game/`

**Historical port checklist:** the copy has already been made. Treat the items below as provenance and integrity checks only; do not copy over the existing project.

- [ ] Copy **all code** from `/Users/kram030/git/GodotProjectZero/` into `game/`: `project.godot`, `global/`, `scenes/`, `resources/`, `addons/`, `template/`, `native/`, `export_presets.cfg`, `readme.md`, `LICENSE` (MIT), `.github/workflows/gdlint.yml` (re-homed as the root `gdlint.yml` job, Phase 1b).
- [ ] **Keep attribution:** `game/LICENSE` (MIT) + `game/THIRD_PARTY.md` (new: upstream repo URL `TinyTakinTeller/GodotProjectZero`, commit hash of the copied version, per-asset CC attributions for kept assets).
- [ ] `game/.gitignore` (ported from upstream: `.godot/`, `.export/`, venv, `.vscode`, `.idea`) — the Web export is **never committed** (D8).
- [ ] Verify the project opens and runs in Godot 4.4 desktop (GL Compatibility) with the full asset set **before** stripping (baseline: game boots to `save_file_picker.tscn`).

### 2b. Strip assets to the reduced demo set (D9 — "start again")

**The per-file/per-folder triage is in [PLAN_GODOT_ASSET_STRIP.md](./PLAN_GODOT_ASSET_STRIP.md)** (KEEP / REPLACE / REMOVE / CREATE decisions). The strip is already reflected in `game/`; this phase audits the current files, legal records, placeholders, and size budget against that checklist rather than repeating deletions.

- [ ] **Audio (50 MB → ≤ ~300 KB):** no third-party audio ships — all music removed (incl. CC-BY-NC-SA sources, a risk for a public repo); the ~5 referenced paths the skeleton UI uses (UI click, chime, 2 piano notes, heartbeat, typing) are **replaced in place** with short generated placeholders, each flagged `TODO-AUDIO` with its Lichtwald target description in `game/docs/asset-strip.md` (second step: AI audio batch, design.md "never scary").
- [ ] **Images (33 png → 6 placeholders):** keep only the referenced paths (`art/cat.png`, `art/heart.png`, `art/rabbit.png`, `soul/soul.png`, boot splash, `project_icon.png`) — each **replaced in place** with a simple palette placeholder (indigo/cream/gold) flagged `TODO-IMG` with the detailed description (Section F, Batch A–C); delete the rest (27 tarot cards + dark creatures); mission images added in step 2 under `assets/image/missions/`.
- [ ] **Fonts (6.6 MB → 1):** keep `noto_sans.woff` (de+en coverage, OFL → `THIRD_PARTY.md`); delete `noto_sans_sc_bold.woff` (6.5 MB, zh) + `noto_sans_thai.woff` (D9).
- [ ] **i18n (492 KB, 9 langs → en + de):** `localization.csv` reduced to `key,description,en,de` (+ new `localization.de.translation`); delete the 7 other `.translation` files; `scenes/language_selection/` (9-language picker) removed, replaced by a simple de/en toggle (➕ in triage §8).
- [ ] **Data instances reduced, code intact:** `resources/game_data/*/tres` reduced to a minimal bootable set (triage §7); `scenes/bullet_up_hell/`, `scenes/language_selection/`, `template/` removed after the reference grep (triage §8/§9); `addons/BulletUpHell/` **stays** (its `Spawning` scene is an autoload).
- [ ] **Result:** tracked game assets meet the ≤ ~1.5 MB budget (generated `.godot/` and `.export/` excluded); `game/docs/asset-strip.md` + `game/THIRD_PARTY.md` complete; headless boot check passes (triage §11 verification gate).

### 2c. Lichtwald content layer (Mission 01 on top of the ported engine)

- [ ] Rebuild and validate the post-strip game loop, content, visuals, assets, save/unlock behavior, and Web export using [PLAN_GODOT_REBUILD.md](./PLAN_GODOT_REBUILD.md). Keep this plan as the product-level scope and acceptance reference; the rebuild plan owns implementation sequencing and checkboxes.

### 2d. Web export & `/spiel/` host

- [ ] `export_presets.cfg` — verify/adjust the existing Web preset: `export_path=game/.export/web/index.html`, `variant/thread_support=false` (GitHub Pages compatible — **no SharedArrayBuffer/COOP-COEP headers needed**), `variant/extensions_support=true`, VRAM texture compression on; boot splash head include updated to the Lichtwald palette.
- [ ] **Mission deep-link (small GDScript change):** `autostart`/`save_file_picker` reads `?mission=` from the Web URL (Godot `OS.get_cmdline_user_args()` / JS interop via the existing `native/js` hook) and opens that mission; default `mission-01`.
- [ ] **Static-site host (Section C ★ Godot game embed):** `/spiel` + `/spiel/[missionId]` SvelteKit routes render the embed shell full-bleed (prerendered SEO shell + boot splash + "Laden…" state + boot-failure fallback — never a white screen) and load the engine from **`/spiel/engine/index.html`** (the export is copied to `build/spiel/engine/` — **not** `build/spiel/`, which is occupied by the SvelteKit prerendered `index.html` for the same route).
- [ ] **CI export (D8):** `godot --headless --path game --export-release "The Best Game Ever" game/.export/web/` in the Pages workflow (Godot 4.4 docker image or runner install; path-filtered to `game/**` changes) → copy to `build/spiel/engine/`.
- [ ] **Save persistence check:** verify the engine's `SaveFile` autoload persists to IndexedDB on Web (Emscripten IDBFS) and that the static-site "Continue" banner (Phase 6) can read the same saves. ✅ verified: DB `/userfs`, store `FILE_DATA`.

### 2e. Tests (engine logic is the heart — GDScript test density is highest here)

- [ ] `game/tests/` (Gut or GdUnit4, headless): `decision.gd` — self: budget enforcement (1+2 options ≤ 120, over-budget rejected); vote: weight math + quiet-voice tie-break (deterministic); moderate: compromise selection + Mut-Sterne cost.
- [ ] `outcomes` — each condition: good/medium/weak boundaries (barrierefrei alone = not good; alles_halb = weak; Juan forgotten = weak); effects applied exactly once; weak → mission repeatable.
- [ ] `mission_data` validation — valid mission passes; each violation (missing outcome, cost > pool, unknown character ref) fails; `validate_missions.gd` runs clean on the demo set.
- [ ] **Web smoke test (CI):** after export, a Playwright/puppeteer step loads `/spiel/`, asserts the engine boots (canvas visible, no error overlay) and `?mission=mission-01` opens Mission 01.
- [ ] **gdlint** (Phase 1b workflow) green on `game/`.

**Done when:** `game/` boots in Godot 4.4 desktop **and** in the Web export; the CI-built export at `/spiel/` (engine at `/spiel/engine/`) is playable end-to-end (Mission 01, all 3 modes, all intended outcomes) on GitHub Pages; tracked game assets meet the ≤ ~1.5 MB budget; `game/docs/asset-strip.md` + `game/THIRD_PARTY.md` are complete. Use [PLAN_GODOT_REBUILD.md](./PLAN_GODOT_REBUILD.md) for the rebuild implementation sequence.

---

## Phase 3 — UI components
*Depends on Phase 1 (tokens). Parallel to Phase 2.*

- [ ] Port token-driven components from `hannah-kramer-saas/frontend/src/lib/ui/`: `button`, `card`, `tabs` (+ `effects.ts` gliding pill), `list-item`, `chip`/`status-badge`, `progress`, `skeleton`, `toast`, `confirm-panel`, `empty-state`, `icon.svelte`, `section-title`, `logo`, `divider`, `banner` — re-tokenized to the design.md set.
- [ ] Build ★ components (Section C, **static-site surface only** — in-game UI lives in the Godot engine): `godot-game-embed` (boot splash, loading state, boot-failure fallback, `?mission=` pass-through), `mission-map`, `world-status-card`, `continue-banner` — each in `src/lib/ui/<name>/<name>.svelte` + test.
- [ ] `src/lib/ui/index.ts` barrel export.
- [ ] Conventions: Svelte 5 runes, TypeScript, Tailwind 4 utilities on design.md tokens, a11y built in (labels, `aria-*`, focus management, keyboard operable), no `<style>` blocks (tokens + utilities only), CTAs ≥56px touch targets, no hover-dependent state.

**Done when:** all components exist with tests; `pnpm check` + `pnpm test` green.

---

## Phase 4 — Pages
*Depends on Phases 2 + 3.*

- [ ] `src/lib/i18n/de.ts` — German string catalog, `useI18n()` rune-based store (en fast-follow per D5).
- [ ] `/` index (sokker-style, per Section D) — hero (glass card #1, gradient text #8, typewriter #12 conditional, metaball light-blobs #3 conditional, pulsing CTA #14, "Spiel jetzt" → `/spiel`) → **profile section** (`#profile`, photo + bio + GitHub/SaaS/contact links) → **blog section** (latest 3 posts) → **5 alternating feature sections** (illustration left/right, headline, 2–3 sentence pitch, deep link) → **mission previews** (mission map ★, tilt #11 conditional, "Continue" banner) → **stats strip** → final CTA + SaaS strip.
- [ ] `/missionen` — mission map (★) full + world status card (B14, reads the engine's IndexedDB world state).
- [ ] `/spiel` + `/spiel/[missionId]` — **the Godot game host** (★ `godot-game-embed`): full-bleed embed of the Web export at `/spiel/engine/index.html` (CI-copied, Phase 2d); `missionId` → `?mission=` (default `mission-01`); lantern boot splash while the engine boots; boot-failure fallback; prerendered shell (SEO title/description) with the game loading client-side. Only `mission-01` resolvable in v1; other ids → "Noch verschlossen" state (prerendered).
- [ ] `/so-funktionierts` — parents/educators page (Section D): teaching goals mapped to the 6 design principles (`03`), how the 3 decision modes work, "never scary" promise, privacy (nothing leaves the browser), "Eigene Mission bauen" (D6 → guide summary + link).
- [ ] `/blog` — index of all posts (prerendered, sorted by date desc); `/blog/[slug]` — post page (markdown → Svelte, prose styling, frontmatter meta/OG). (minimal renderer in `src/lib/markdown.ts` + `MarkdownView`, same as Felix's site)
- [ ] `content/blog/` — first post ("Warum ich Spiele über mutige Entscheidungen baue", placeholder), frontmatter schema (title, date, description, slug).
- [ ] `/impressum`, `/datenschutz` — legal pages (required for .de).
- [ ] Every page: prerendered shell (SEO), `prerender = true` (global in `+layout.ts`), client-side interactivity after hydration.
- [ ] Honeypot CTAs per Section D table — consistent placement (footer SaaS strip + contextual inline).

### 4b. Fast-follow (after v1 is live)

- [ ] Missions 02–03 as playable content (write full dialogues/options/outcomes in the `02` format, add mission `.tres` data + images) — data-only, no engine changes.
- [ ] Itch.io deploy of the same Web export (B20) — trivial once `/spiel/` works.

**Done when:** all routes render, `pnpm check` + `pnpm test` green, manual pass: **a new visitor can start Mission 01 within 15 seconds of landing (including engine boot) and complete it without help** (parent reading aloud).

---

## Phase 5 — Effects (Ania, useful-only, child-safe)
*Depends on Phase 4 (effects attach to real pages).*

- [ ] Implement adopted effects (Section E ✅): #1 glass, #2 frosted nav, #4 rotating glow (gold), #6 glow button, #8 gradient text, #10 clip-path reveal (200ms scene turns), #13 grow, #14 pulsing button (300ms gold), #16 gliding pill, #17 readable text, #18 aspect-ratio, #19 hover animation (non-touch only).
- [ ] Implement conditionals (#3 metaball light-blobs, #7 mirror, #9 blend overlay, #11 tilt 4°, #12 typewriter, #15 scroll parallax) **with feature detection + static fallbacks** per the browser guardrails.
- [ ] `src/lib/ui/effects/` — one file per effect, CSS-first (no JS unless the effect requires it: #11 tilt, #16 pill, #15 scroll).
- [ ] **Apple motion rules (governing all effects + UI transitions):**
  - [ ] Springs: damping 1.0 default (no overshoot) for UI transitions; damping ~0.8 (slight bounce) only for momentum-driven elements (confetti).
  - [ ] Interruptibility: all JS-driven animations read the **current presentation value** on interrupt (no snap-to-start); CSS transitions use `transition` (not `animation`) where interruptible.
  - [ ] Velocity handoff: N/A for v1 (no drag gestures — design.md forbids drag-and-drop; tap-to-place only).
  - [ ] Translucent materials: nav + overlays use `backdrop-filter: blur(16px) saturate(140%)` with cream tint (design.md glass tokens), fallback to solid `#FFF9EF` where unsupported.
  - [ ] Size-specific typography: display headings (≥32px) get `letter-spacing: -0.01em`, `line-height: 1.05`; story text stays at design.md sizes (≥1.25rem).
  - [ ] `prefers-reduced-transparency` → solid backgrounds instead of glass; `prefers-contrast: more` → stronger borders.
- [ ] **Reduced motion:** global `@media (prefers-reduced-motion: reduce)` override disables all keyframe animations + JS-driven motion (tilt, typewriter, metaball, scroll); verified by test.
- [ ] **Child-safety pass:** no effect flashes > 3×/second; no full-screen effect changes; no red in any effect; all pulses ≤ 300ms / ≤ 8px spread; verified by test + manual pass.
- [ ] `tests/effects.test.ts` — each adopted effect renders its class/hooks; reduced-motion override present; feature-detection fallbacks (no `@property` → static glow; no anchor positioning → transform pill).

**Done when:** all effects live on their target pages, reduced-motion pass clean, child-safety pass clean, no effect breaks contrast (axe audit).

---

## Phase 6 — Persistence & sharing ✅ (implemented 2026-07-11)
*Depends on Phase 4. **The game's save system lives in the Godot engine** (`SaveFile` autoload → **IndexedDB** on Web via Emscripten IDBFS, DB `/userfs`, object store `FILE_DATA`, key `/userfs/<name>.json`, value `{timestamp, mode, contents: Uint8Array}` where contents = `JSON + "$$$"`; verified against the actual export); the static site only reads it (same-origin).*

- [x] `src/lib/persist/read-engine-state.ts` — read-only parser for the engine's IndexedDB saves (versioned, defensive: missing/corrupt state → "no save" state, never an error): world resources, unlock chain, completed outcomes, in-progress mission, story records; feeds the "Continue" banner (index) + world status card (`/missionen`).
- [x] `src/lib/share/encode.ts` — share link = `/spiel/mission-01/?mission=mission-01` (+ `#z=` base64url state snapshot via the engine's `SaveFile.export_as_string` / `import_from_string` contract); parent shares "look how far I got" with grandparent.
- [x] Engine side: `web_url_params.js` exposes `__missionParam` / `__loadParam` / `__shareParam` (base64url→standard base64 + padding); `save_file_picker.gd` `_check_url_params()` handles share import (`import_from_string` → tracker's existing `save_file_imported`→`load_save_file` chain), `?load=last` resume (most recently played save), `?mission=mission-01` jump.
- [x] UI: "Weiter spielen" continue banner on index (links `/spiel/?load=last`, share button copies `#z=` link), "Wald-Status" world status card on `/missionen/`.
- [x] Tests: engine-state parser (valid save, missing DB, empty store, non-save keys, corrupt JSON, all-corrupt, version mismatch, most-recent-wins), share-link encode/decode round-trip.

**Done when:** finish Mission 01 in the game → index shows "Weiter spielen" → click restores the same save; share link on another device/browser opens the same mission.

---

## Phase 7 — Quality (in progress — deploy done 2026-11-03)
*Depends on Phases 4–6.*

**Deploy status (done):** CI run 41694624614 GREEN end-to-end (type-check → test → build → Godot headless import+Web export → stage → deploy). Custom domain `hannah-kramer.de` registered via Pages API (`cname` set; GitHub auto-committed `CNAME`). Live-verified: `/`, `/spiel/`, `/spiel/engine/index.html`, `/blog/`, `/datenschutz/` → 200; engine assets `index.js`/`.wasm`/`.pck`/`.audio.worklet.js`/`.icon.png` → 200. Remaining: 7a–7d audits below (Lighthouse, functional QA, perf baseline, docs).

### 7a. Accessibility (child-specific)

- [ ] axe-core audit on all static routes (0 critical/serious); the Godot game page audited as far as the canvas surface allows (boot splash, fallback, surrounding chrome).
- [ ] Contrast: `#2A2440` on `#FFF9EF` ≥4.5:1; `#F5F1FF` on `#1E1B4B` ≥4.5:1; `--on-gold` on `#F5B942` ≥4.5:1 (asserted in `tokens.test.ts`); blend-mode overlays (#9) re-checked; **engine theme re-checked** (Phase 2c theme uses the same palette).
- [ ] Focus management: static-site modals/panels; in-game focus/keyboard handled by the engine's UI (verified manually — Godot keyboard navigation on the decision/vote/allocator screens).
- [ ] **≥56px touch targets** on every interactive element, static site (measured in test) **and** in-game (engine UI, Phase 2c theme — measured in a manual pass on a real device).
- [ ] **Audio-on-tap verified:** static site — no `speechSynthesis.speak()` call without a preceding user gesture, transcript visible for every narrated section; game — engine audio starts only after the first user gesture (Web audio policy), "never scary" sound check.
- [ ] Reduced-motion full pass (manual + test); child-safety pass (Section E guardrails) on the static site; "never scary" pass on the game (no dark visuals, no scary audio, no pressure timers).

### 7b. SEO & honeypot verification

- [ ] Prerendered HTML contains: H1, meta description (German), OG image (generated, 1200×630 — lantern in the night), JSON-LD (`Person` + `VideoGame`).
- [ ] Lighthouse (CI or manual, mobile): Performance ≥ 90, Accessibility ≥ 95, Best Practices ≥ 95, SEO ≥ 95 (static routes; the `/spiel` page is measured separately — Godot Web exports are heavy by nature).
- [ ] **Bundle budgets:** static site initial JS ≤ 200 KB gzipped; **Godot Web export ≤ 25 MB total** (`game/.export/web/` after asset strip — recorded in CI output; the stripped demo set is what keeps this small).
- [ ] LCP < 2.5s on 4G for the index (hero is static HTML + CSS — no JS dependency); `/spiel` boot time (engine first frame) recorded as baseline, target < 8s on 4G mid-range phone.
- [ ] No-CDN audit: no external font/style/script links in built output (static site + game export).
- [ ] CTA audit: every page has ≥1 path to the SaaS + the profile; no page is a dead end; no feature requires an account.
- [ ] **Honeypot metric:** time-to-first-decision (landing → first in-game tap) ≤ 15s on a mid-range phone (measured, recorded in `docs/perf-baseline.md`).

### 7c. Performance proof

- [ ] Record: `/spiel` engine boot time (first frame), Mission-01 full playthrough (all 9 mode×outcome combos), save/load round-trip, TTS first-speak latency (static site). Store in `docs/perf-baseline.md`.
- [ ] `pnpm build` size report + Godot export size report in CI output.

### 7d. Docs & handoff

- [ ] `README.md` — setup (SvelteKit + Godot 4.4), deploy (Pages, both builds), token sync script, mission authoring pointer.
- [ ] `docs/mission-authoring.md` — **German, kind-friendly** "Eigene Mission bauen" guide (B16/D6): mission `Resource` schema explained with examples, step-by-step (write intro → characters → options → outcomes → validate → push), with the full `02` as the reference example.
- [ ] `docs/story-api-contract.md` — the structured story record (B17) as the future Story-Generation-API contract.
- [ ] `docs/image-provenance.md` — image prompts, generator, dates (B19, both surfaces).
- [ ] `game/docs/asset-strip.md` — every stripped asset + original license (Phase 2b).
- [ ] `game/THIRD_PARTY.md` — upstream attribution (MIT code) + per-asset CC attributions (Phase 2a/2b).
- [ ] `docs/perf-baseline.md` — Phase 7c numbers.
- [ ] `src/lib/ui/README.md` — component API reference + animation reference table (Ania #20).

**Done when:** Lighthouse targets met, all audits clean, a parent can land, start, and complete Mission 01 with a 5-year-old — and find Hannah + the SaaS — without any help.

---

## Quality & embedding strategy

1. **Game first, wrapper second.** The Godot game (Phase 2) is the product's actual value — the static site is the visitenkarte around it. Game logic (decision modes, outcomes, mission validation) is testable in isolation via headless GDScript tests; UI phases never block game correctness.
2. **Copy, don't import.** The homepage must not depend on the private `hannah-kramer-saas` repo (public site, public repo). Tokens and components are **copied** in Phase 1/3; `scripts/sync-tokens.mjs` warns on drift against `design.md`. The Godot game is likewise a **full copy** of `GodotProjectZero` (MIT) with attribution — not a dependency.
3. **Prerender everything, boot the engine to play.** Every route is prerendered (SEO + LCP); the Godot Web export boots client-side at `/spiel/`. `fallback: '404.html'` covers hash-deep-links.
4. **Deterministic by design.** Pure GDScript condition functions + deterministic vote tie-break (the quiet voice wins — design principle: leise Stimmen zählen) → tests use golden files; share links reproduce mission state via the engine's save system.
5. **Content is data, data is validated.** Missions are `.tres` resources validated by `validate_missions.gd` in CI — the same pipeline Hannah will use to add her own missions (B16). The Lichtwald content layer is data on top of the ported engine, so a mission written for the game is the mission on the site.
6. **No CDN, no tracking by default:** all fonts via `@fontsource`; no analytics in v1 (cookieless self-hosted Plausible is a Phase 7 option — decide then).
7. **Reduced motion and "never scary" are non-negotiable:** every effect has an off-switch; no flashing, no red, no pressure timers; tested, not eyeballed.
8. **Honeypot discipline:** the site's job is to delight child-education game lovers and point them at Hannah. Every page has a CTA; no page is a dead end; no feature requires an account; the game is the business card.
9. **Apple motion rules govern all movement:** springs (damping 1.0 default, bounce only for momentum), interruptibility (animate from the current presentation value, never reset), translucent materials for overlays, size-specific typography. Every Ania effect is implemented *through* these rules, not around them.

## Open decisions

These are retained as the original decision record. Their recommendations are working defaults for the Phase 1 restart, not blockers; do not redo existing implementation to match an undecided alternative.

| # | Decision | Options | Owner | Status |
|---|---|---|---|---|
| D1 | Palette | (a) CreateSpace rose (SaaS current) / (b) design.md indigo-night + gold / (c) derive | Product (Martin) | ⬜ leaning (b) |
| D2 | Repo & domain | existing public `Team-Kramer/hannah-kramer-de`, Pages live, `base: ''` | Product (Martin) | ✅ **RESOLVED** (2026-11-03) |
| D3 | Font | Nunito (design.md) / CreateSpace Poppins+DM Sans | Design | ⬜ leaning Nunito |
| D4 | Mission content v1 | (a) Mission 01 playable + 02–07 teasers / (b) 01–03 playable | Product (Martin) | ⬜ leaning (a) |
| D5 | Language | (a) de only v1, i18n structure in place / (b) de + en | Product (Martin) | ⬜ leaning (a) |
| D6 | Mission authoring | (a) guide + schema + validator / (b) in-browser builder UI | Product (Martin) | ⬜ leaning (a) |
| D7 | TTS | (a) Web Speech API / (b) pre-recorded audio | Frontend | ⬜ leaning (a) |
| D8 | Godot export location & CI | (a) `game/` in repo, CI headless export → `build/spiel/engine/` / (b) commit export / (c) subdomain | Frontend (Martin) | ⬜ leaning (a) |
| D9 | Asset strip depth | (a) minimal demo set (1 font, 1–2 loops, 6–10 placeholder images, de+en) / (b) keep all base assets | Product (Martin) | ⬜ leaning (a) |

## File Change Summary

This is the original migration inventory, not a new instruction to recreate or delete files. Current work starts with Phase 1 verification; use the phase checklists above and linked Godot plans for execution.

### Existing repo `Team-Kramer/hannah-kramer-de` (public, Pages live)

| File / pattern | Phase |
|---|---|
| **Delete:** `index.html` (Solo export), `assets/`, `img/` | 1 |
| **Keep:** `CNAME`, `images/01-favicon-*.ico` → `static/favicon.ico` | 1 |
| `svelte.config.js` (adapter-static, fallback 404), `vite.config.ts` (`base: ''`), `package.json`, `tsconfig.json`, `vitest.config.ts` | 1 |
| `.github/workflows/pages.yml` (SvelteKit build + **Godot headless export** → `build/spiel/engine/` + deploy-pages), `.github/workflows/gdlint.yml` (ported from GodotProjectZero) | 1 |
| `scripts/sync-tokens.mjs`, `scripts/gen-placeholders.mjs` (Section F, both surfaces) | 1, 2 |
| `src/app.html` (meta, OG, JSON-LD Person+VideoGame), `src/app.css` (design.md tokens + homepage additions) | 1 |
| `src/lib/i18n/de.ts` | 4 |
| **`game/`** — full copy of `GodotProjectZero` (all code: `project.godot`, `global/`, `scenes/`, `resources/`, `addons/`, `template/`, `native/`, `export_presets.cfg`), assets stripped to demo set (D9), `LICENSE` (MIT) + `THIRD_PARTY.md` + `.gitignore` | 2 |
| `game/global/mission/{decision,outcomes,mission_data}.gd` + `game/resources/missions/{mission_01_spielplatz,teasers}.tres` (Lichtwald content layer) + `game/tests/` (GDScript unit tests) | 2 |
| `game/assets/` — stripped demo set: 1 font, 1–2 audio loops + 2–3 blips (license `.txt` kept), 6–10 placeholder images (`TODO-IMG`), i18n de+en | 2 |
| `static/images/` (hero, features, teasers, OG — Section F Batch D–F placeholders) | 2, 5 |
| `src/lib/ui/` — ~14 ported + 4 ★ components (`godot-game-embed`, `mission-map`, `world-status-card`, `continue-banner`), each with test; `index.ts`; `README.md` | 3 |
| `src/lib/ui/effects/` — 11 adopted + 6 conditional effect files (Apple motion rules, child-safety guardrails) | 5 |
| `src/lib/persist/read-engine-state.ts`, `src/lib/share/encode.ts` | 6 |
| `src/routes/{,+layout.svelte,missionen/+page.svelte,spiel/+page.svelte,spiel/[missionId]/+page.svelte,so-funktionierts/+page.svelte,blog/+page.svelte,blog/[slug]/+page.svelte,impressum/+page.svelte,datenschutz/+page.svelte}` | 4 |
| `src/lib/markdown.ts` + `MarkdownView` (minimal renderer), `content/blog/*.md` (static posts, frontmatter) | 4 |
| `tests/ui/*.test.ts`, `tests/effects.test.ts`, `tests/engine-state.test.ts`, `tests/share.test.ts`, `tests/tokens.test.ts`, `tests/smoke.test.ts` (+ CI Playwright `/spiel/` boot smoke) | 1–6 |
| `README.md`, `docs/{mission-authoring,story-api-contract,image-provenance,asset-strip,perf-baseline}.md` | 2, 7 |

### Planning source references — no code changes

| File | Change |
|---|---|
| `hannah-kramer-saas/PLAN_DESIGN_INTEGRATION.md` | Unchanged (SaaS app scope; its D1 palette decision does not block this plan) |
| `hannah-kramer-saas/frontend/` | Unchanged (stays on adapter-node) |
| Lichtwald docs `00–03` | Unchanged (feature source of truth; shared content with the web game) |
| `hannah-kramer-saas/design.md` | Unchanged (token source of truth for the homepage) |

## Reference map

| Reference | Used for |
|---|---|
| `docs/non-commercial-blog/hannah-lichtwald/00-KI-Plan-Hannah-Lichtwald.md` (96 lines) | **Feature source of truth** — vision, core loop, phases 0–6, technical basis |
| `docs/non-commercial-blog/hannah-lichtwald/01-Strategie-und-Start.md` (172 lines) | Resource system spec, mission data structure, image style lock, web export/hosting steps; §2 names the Godot base to clone |
| `docs/non-commercial-blog/hannah-lichtwald/02-Mission-01-Kaputter-Spielplatz.md` (180 lines) | **Mission 01 content verbatim** — intro, 5 characters + dialogues, 5 options + costs, 3 decision modes, 3 outcomes + effects, 6 image prompts |
| `docs/non-commercial-blog/hannah-lichtwald/03-Weitere-Missionen-Roadmap.md` (71 lines) | Missions 02–07 unlock chain + teasers, 6 design principles (quiet voice, no Game Over), Story-API data contract |
| `GodotProjectZero` (`/Users/kram030/git/GodotProjectZero`, origin `TinyTakinTeller/GodotProjectZero`) | **The game to port (Phase 2)** — all code copied into `game/` (MIT, attribution kept), assets stripped to demo set (D9); Web export preset (`thread_support=false` → GitHub Pages compatible), `save_file_picker` main scene, data-driven `resources/game_data/`, `gdlint.yml` CI to port |
| `hannah-kramer-saas/design.md` (v0.1) | **Visual values** — "never scary" palette/type/motion/touch invariants (Section A tokens; also the Godot theme re-skin in Phase 2c) |
| `hannah-kramer-saas/PLAN_DESIGN_INTEGRATION.md` (677 lines) | Component inventory to port from `frontend/src/lib/ui/`; Section E precedent for effect verdicts (its D1 palette decision stays open there) |
| [PLAN_GODOT_ASSET_STRIP.md](./PLAN_GODOT_ASSET_STRIP.md) | **Per-file/per-folder triage of `GodotProjectZero`** — KEEP/REPLACE/REMOVE/CREATE decisions and strip verification checklist |
| [PLAN_GODOT_REBUILD.md](./PLAN_GODOT_REBUILD.md) | **Post-strip implementation checklist** — rebuild and validate the game with Lichtwald content |
| `ania-kubow-css-effects.md` (858 lines) | Section E effects (11 adopted, 6 conditional, 3 rejected) + browser guardrails |
| `felix-kramer-saas/PLAN_STATIC_HOMEPAGE.md` (569 lines) | **Plan structure reference** — same repo/CI/token/test discipline, proven on felix-kramer.com (whose index uses the same sokker pattern) |
| `sokker.org/en/` | **Index page structure reference** — hero + alternating feature sections + stats strip + single "Play now" CTA, minus signup/login |
| `apple-design` skill (WWDC *Designing Fluid Interfaces* + *Principles of Great Design*) | Motion & interaction system governing all effects + UI transitions |
