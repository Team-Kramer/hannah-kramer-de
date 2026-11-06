# Lichtwald Content Inspector – Standalone Workbench

**Status:** Phase C prototype (v0.2)  
**Decision:** The graphical authoring tool lives **outside** the Godot engine.

---

## Why standalone (not a Godot Editor Plugin)

| Requirement | Godot Plugin | Standalone Web Tool |
|-------------|--------------|---------------------|
| AI can generate & test stories independently | Hard (needs running Editor) | Easy – files + optional API |
| CI / headless validation | Possible but heavy | Trivial |
| Non-programmers / writers can open it | Needs Godot installed | Browser only |
| Same JSON package for Editor **and** Runtime | Yes | Yes (identical contract) |
| Later AI agent workflow (generate → validate → simulate) | Constrained | Natural fit |
| No risk of accidental game-code coupling | Higher | Lower |

**Conclusion (DEC-Workbench):**  
The authoring workbench is a **standalone tool**.  
It produces versioned JSON packages that the Godot runtime (and a future headless validator) can load.  
Godot never becomes the editor of the content – it only consumes the validated package.

---

## Location

```
lichtwald_content_inspector/
├── STANDALONE_WORKBENCH.md          ← this file
├── README.md
├── web/                             ← the actual tool
│   ├── index.html
│   ├── css/app.css
│   └── js/
│       ├── package_loader.js
│       ├── app.js
│       ├── schema.js
│       ├── validator.js
│       └── graph.js
├── fixtures/spielplatz_demo/        ← F1 package-contract fixture
└── tests/
    ├── f1-package-contract.test.cjs
    ├── package-loader.test.cjs
    └── app-entity-edit.test.cjs
```

---

## How to run

```bash
cd web
# any static server, e.g.:
python -m http.server 8080
# then open http://localhost:8080
```

Or just open `index.html` directly in a Chromium-based browser (Folder load works best with a local server because of browser security).

---

## What the tool does today

1. **Load** every JSON file named by a package manifest.
2. **Browse** stories, locations, resources/producers/recipes, NPCs/conversations, combat enemies/encounters, assets, locales, and rules.
3. **Compare** entities in a dynamic table for the selected domain; selecting a row synchronizes the entity list, inspector, and Raw JSON selection.
4. **Inspect** with a read-only form view and edit through **Raw JSON**; edits write back into the original manifest-listed document.
5. **Preview** localized story/comic panels, illustration briefs, linked dialogue, choices, conditions, and projected effects. Preview-only resource values can be adjusted to see when a gated option becomes available; this never edits package or game data.
6. **Validate** structurally (IDs, required fields, cross-domain references, and allow-listed effects).
7. **Graph** views: Story graph (nodes + transitions/choices) and cross-domain dependency graph with source paths.
8. **Create** stories, resources, NPCs, and rules from templates; new story/NPC files are registered in the manifest, while NPCs are added to an existing NPC document when available. Unsupported tabs keep creation disabled.
9. **Export** a validated JSON bundle and reopen it in the workbench, or write each manifest-listed JSON into a new package folder without overwriting an existing export.

Folder export uses the File System Access API. It creates a new timestamped subfolder inside a user-selected destination, writes the manifest plus every listed JSON document, and does not clear the modified indicator unless every file is written successfully. Browsers without that API can still use the validated bundle export/import.

---

## JSON Package Contract (Godot import side)

The planned package contract, demonstrated by the F1 fixture, is:

```
my_package/
  manifest.json          # packId, schemaVersion, file list
  combat.json            # registered enemy and encounter content
  locations.json         # locations and their available interactions
  resources.json         # resources[], producers[], recipes[], workerRoles[]
  rules.json             # rules[] with trigger / when / effects
  assets.json
  stories/
    <story_id>.json
  npcs/
    <npc_id>.json
  locales/
    de.json
    en.json
```

Player-facing entity fields reference localized `textKey`s in locale files; visible resources, locations, story/dialogue panels, NPCs, and opponents reference assets declared in `assets.json`. Placeholder assets have an art brief and no image path. Godot will later load a validated package via the Phase D JSON loader.

The browser UI (v0.2) now browses and raw-edits every fixture domain, including `combat.json`, `locations.json`, locale strings, and asset entries. Its dynamic table lists all entities in the selected domain and synchronizes row selection with the inspector and Raw JSON views. Raw editing retains the source manifest path and stable IDs. Stories, resources, NPCs, and rules can be created from templates and persist through the manifest-backed package. The read-only preview shows localized illustrated story/dialogue panels, choices, condition availability against sample resource values, and projected effects. Bundle import/export and validated, non-overwriting folder export are available. Validation and the dependency graph cover the F1 cross-domain references, and graph edges retain source paths for inspection. Run `node --test "tests/*.test.cjs"` from this workbench directory to check the fixture, loader, editing, validation, graph, runtime feasibility, and exported-package Godot boundary. The Godot integration test skips when Godot is unavailable. Passing those tests does not mean the Godot runtime already supports the full contract.

---

## AI Workflow readiness (Phase H direction)

Because the tool is standalone:

- An AI can write/edit the JSON files directly.
- The same validator used in the browser can be extracted and run headlessly.
- A future small API (or CLI) can:
  1. Accept a generated package
  2. Validate
  3. Optionally run a headless simulation against a fixture save
  4. Return a report + semantic diff
- The graphical UI stays the human review surface.

No Godot process is required for generation or basic testing.

---

## Relation to the main Rebuild Plan

This decision is now recorded in the planning document:

- **Workbench is external.**
- Godot receives only validated JSON packages.
- Phase C gate changes from “Godot Editor Plugin” to “Standalone graphical workbench that can create/edit/validate a package and export it in the agreed format”.
- Phase D (Runtime Loader) remains inside Godot and simply consumes the package the workbench (or AI) produced.

---

## Next concrete steps for the workbench

1. Atomic multi-file export (real folder download / File System Access write).
2. Proper typed condition & effect builders (no more pure string fields).
3. Semantic diff view (human vs AI edit).
4. Headless Node/CLI validator for CI and AI agents.
5. Optional lightweight simulation runner (story playthrough without Godot).

---

*Built outside Godot on purpose – so the content system can grow without dragging the engine into every authoring decision.*
