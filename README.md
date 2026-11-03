# hannah-kramer.de

Hannah's public Visitenkarte + honeypot for child-education game lovers.
Zero hosting cost: a static SvelteKit site on **GitHub Pages** wrapping the
ported **Godot 4.4** game *Hannahs Lichtwald* (served at `/spiel/engine/`).

## Structure

| Path | What |
|---|---|
| `src/` | SvelteKit app (hero → profile → blog → game showcase) |
| `game/` | Ported GodotProjectZero (code kept, assets stripped to placeholders) |
| `static/` | CNAME, favicon |
| `tests/` | vitest + Testing Library (tokens, smoke) |
| `scripts/sync-tokens.mjs` | Warn-only diff of `src/app.css` vs `design.md` |

## Develop

```bash
pnpm install
pnpm dev        # SvelteKit dev server
pnpm check      # svelte-check
pnpm test       # vitest
pnpm build      # prerender → build/
pnpm sync-tokens
```

## Deploy

Push to `main`. The `pages.yml` workflow: pnpm install → check → test → build →
Godot headless Web export (Docker, only when `game/` changed) → stage the export
at `build/spiel/engine/` → deploy to GitHub Pages.

Pages source must be **GitHub Actions** (build type: workflow).

## Plans

- `PLAN_STATIC_HOMEPAGE.md` + `PLAN_GODOT_ASSET_STRIP.md` live in
  `hannah-kramer-saas` (source of truth).
- Execution plan: `family-orga/hannah-kramer-de/PLAN.md`.
