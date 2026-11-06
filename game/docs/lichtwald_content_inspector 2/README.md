# Lichtwald Content Inspector

Standalone graphical workbench for authoring, inspecting and validating versioned JSON content packages used by the Lichtwald game.

**Important architectural decision (2026-11-06):**  
This tool lives **outside the Godot engine**. It produces clean JSON packages that Godot will later load. It is **not** a Godot Editor Plugin.

See:

- [`STANDALONE_WORKBENCH.md`](./STANDALONE_WORKBENCH.md) – why standalone + how to use
- [`PLAN_UPDATE_STANDALONE_WORKBENCH.md`](./PLAN_UPDATE_STANDALONE_WORKBENCH.md) – formal plan change

---

## Quick start

```bash
cd web
python -m http.server 8080
# open http://localhost:8080
```

The browser UI is still v0.2. It loads every manifest-listed JSON domain, supports browsing, a cross-domain entity table, and raw-JSON editing, and validates and graphs the F1 cross-domain references. Richer authoring views remain in progress. Run the package, loader, entity-editor, graph, runtime-feasibility, and Godot round-trip checks with:

```bash
node --test "tests/*.test.cjs"
godot --headless --path "tests/godot_f2" --script res://f2_round_trip.gd
```

The loader test proves package files are parsed and retained. The entity-editor test verifies raw edits write back through the original manifest-listed document paths and reject stable-ID changes.

Use **Open Bundle** to reopen an exported bundle. **Export Bundle** is the portable single-file format; **Export Folder** writes `manifest.json` and each listed document under a new timestamped directory, without overwriting an earlier export. Folder export requires a browser with the File System Access API and is blocked when package validation reports errors.

---

## Package layout (Godot-importable)

```
package/
  manifest.json
  combat.json
  locations.json
  resources.json
  rules.json
  assets.json
  stories/<id>.json
  npcs/<id>.json
  locales/<lang>.json
```

The [F1 fixture](./fixtures/spielplatz_demo/) demonstrates the current planning contract: stable IDs, canonical locale `textKey`s, explicit location/resource/story/NPC/encounter references, and asset-catalogued placeholders with art briefs. Placeholder assets intentionally have no file path. JSON contract examples and editor conformance are feasibility work, not a finished production schema.

---

## Current capabilities

- Load package folder
- Entity lists for stories, locations, resources/producers/recipes, NPCs/conversations, combat enemies/encounters, assets, locales, and rules
- Dynamic entity table for every listed domain; selecting a row synchronizes the inspector and Raw JSON selection
- Read-only form inspector + Raw JSON editing across all listed entity domains
- Manifest-path-preserving write-back for raw edits; unsupported entity creation stays disabled
- Manifest-backed creation templates for stories, resources, NPCs, and rules; new file-based content is added to the package manifest
- Structural and F1 cross-domain reference validation
- Story graph + cross-domain dependency graph with source paths on edge hover
- Read-only comic/story preview with localized panel text, illustration briefs, dialogue choices, locked conditions, and projected direct/triggered effects
- Export and reopen validated package bundles
- Export validated multi-file packages into new, non-overwriting folders (File System Access API browsers)
- Exercise a workbench-exported package folder through the Godot F2 loader and round-trip boundary when Godot is installed

The validator and graphs cover the F1 fixture contract; broader schema coverage and richer editing surfaces remain Phase C work.

---

## Roadmap (aligned with Rebuild Plan)

- Phase C: polish workbench, condition/effect builders, better export
- Phase D: Godot JSON runtime loader consumes the same packages
- Phase H: AI workflow (generate → validate → human review in this UI)

---

*Content tooling stays outside the engine so AI and humans can move fast without dragging Godot into every edit.*
