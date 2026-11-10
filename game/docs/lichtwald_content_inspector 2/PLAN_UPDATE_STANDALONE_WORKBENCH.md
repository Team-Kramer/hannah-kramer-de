# Plan Update – Standalone Workbench Decision

**Date:** 2026-11-06  
**Status:** Accepted  
**Affects:** Phase C (Graphical Editor), Phase D (Runtime Loader), Phase H (AI Authoring)

---

## Decision

**The graphical JSON authoring workbench is a standalone tool outside the Godot engine.**

It produces versioned JSON content packages that Godot can import and load at runtime.  
It is **not** implemented as a Godot Editor Plugin.

### Rationale

1. **AI workflow independence** – Future AI agents must be able to generate, validate and test new stories/elements without launching the Godot Editor.
2. **CI & headless use** – Validation and package checks must run in pipelines and scripts.
3. **Clear separation of concerns** – Authoring tool ≠ Runtime. Godot only consumes the finished, validated package.
4. **Lower coupling risk** – Content tooling changes do not risk breaking the game binary or editor state.
5. **Accessibility** – Writers and non-engine developers can use a browser-based tool.

### Consequences for the Rebuild Plan

| Original assumption | New direction |
|---------------------|---------------|
| Godot Editor Plugin / Dock / Main Screen | Standalone Web Workbench (current) + later optional CLI/API |
| Workbench runs inside Godot | Workbench runs outside; Godot only has a JSON package loader |
| F7/F8 evaluated inside Editor | F7/F8 evaluated in the standalone tool |
| Phase C gate = “human can edit inside Godot Editor” | Phase C gate = “human can create/edit/validate/export a package in the standalone tool that Godot can later load” |
| AI authoring talks to Godot | AI authoring talks to the JSON files + validator (+ optional simulation) |

### Updated Phase C Gate (revised)

A human (or AI) can:

1. Create or load a content package in the **standalone workbench**.
2. Add/edit a small story, one resource/producer and one NPC conversation.
3. See cross-links and basic graphs.
4. Validate the package.
5. Export a clean package in the agreed folder/JSON layout.
6. The exported package is structurally ready for the future Godot JSON loader (Phase D).

Only after this gate is met do we migrate hard-coded content rules out of controllers.

### Updated DEC entries

| ID | Decision | Status | Notes |
|----|----------|--------|-------|
| DEC-Workbench | Workbench lives outside Godot | **Accepted** 2026-11-06 | Standalone web tool (this repo). Godot only consumes packages. |
| DEC-01 | Core entities & views in MVP | Open → now scoped to standalone UI | Stories, Resources, NPCs, Rules + Inspector / Graph / Raw / Validation |
| DEC-07 | Preview / Reload | Still open | Preview stays in workbench; hot-reload into running Godot is a later Phase D concern |

### Files

- Tool: `web/` (open `index.html` via local server)
- Decision & usage: `STANDALONE_WORKBENCH.md`
- Reference package: `fixtures/spielplatz_demo/`
- This update record: `PLAN_UPDATE_STANDALONE_WORKBENCH.md`

---

**Next recommended action:**  
Finish the remaining Phase A items (F0 runtime replay), then use the standalone workbench + fixture to drive F1–F8 tests without touching Godot game code.
