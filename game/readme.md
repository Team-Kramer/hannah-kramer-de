# Hannahs Lichtwald — Spiel

A gentle, storybook-style decision game for children, built with
[Godot 4.4](https://godotengine.org) (web export, runs in the browser).

This is a **reduced port** of the open-source project
[GodotProjectZero: A Dark Forest](https://github.com/TinyTakinTeller/GodotProjectZero)
(MIT). All original art and audio were stripped and replaced with generated
placeholders — see the docs below.

## Play

- Online: <https://hannah-kramer.de/spiel/>
- Deep link to Mission 01: <https://hannah-kramer.de/spiel/?mission=mission-01>

## Run locally

```bash
godot --path game            # run in editor
godot --headless --path game --quit-after 60   # boot test
```

Web export (Godot 4.4 templates required):

```bash
godot --headless --path game --export-release "The Best Game Ever" /absolute/path/to/game/.export/web/index.html
```

Note: the export path must be **absolute** on macOS.

## Content

- **Mission 01 — Der kaputte Spielplatz** (`resources/missions/mission_01_spielplatz.tres`):
  the first Lichtwald mission. Players choose how to fix the broken
  playground — by themselves, by vote, or by moderating a compromise.
  Outcomes affect the world (Mut-Sterne, Freundschaft, Licht-Rat).

## Docs

- [`THIRD_PARTY.md`](THIRD_PARTY.md) — attribution and license register
- [`docs/asset-strip.md`](docs/asset-strip.md) — what was stripped, and the
  TODO-IMG / TODO-AUDIO batch list for generating real content
