# PE-04 — Legacy Branch Removal Snapshots

**Updated:** 2026-11-06
**Purpose:** PE-04 requires that, before any legacy content-specific code branch
is deleted, we record (1) the branch's exact behavior, (2) a parity argument or
snapshot proving old/new observable behavior is identical, and (3) the
verification that the deletion is clean. This document is the running
"removed-branch references" evidence for the Phase E gate.

Deletions are ordered safest-first: dead branches (provably no behavior change)
before live branches (which need a JSON rule + parity test first).

---

## 1. `_gift_debug` (debug gift) — DELETED

**Legacy location:** `game/scenes/controller/unlock_controller/unlock_controller.gd`
- Caller: `_handle_land_event`, land ≥ 5 → `_gift_debug()`.
- Definition (before deletion):

```gdscript
func _gift_debug() -> void:
	if Game.PARAMS["debug_gift"]:
		if _trigger_unique_unlock_event("land_debug"):
			_gift_resource("food", 1000, name)
			_gift_resource("wood", 1000, name)
			_gift_resource("stone", 1000, name)
			_gift_resource("clay", 1000, name)
			_gift_resource("brick", 1000, name)
			_gift_resource("fiber", 1000, name)
			_gift_resource("flint", 1000, name)
			_gift_resource("fur", 1000, name)
			_gift_resource("leather", 1000, name)
```

**F9 classification:** (a) JSON-rule pattern (`event.record` + 9× `resource.add`),
debug-only, "likely removed."

**Parity argument (why old == new for all inputs):**
- The branch body is gated by `Game.PARAMS["debug_gift"]`.
- `game/global/const/game.gd:11` sets `const PARAMS: Dictionary = PARAMS_PROD`.
- `PARAMS_PROD["debug_gift"]` is `false`.
- Therefore, under the active configuration, the `if` is always false and the
  branch is a **no-op for every input**. Removing it cannot change any
  observable state (resources, events, flags, unlocks) in the shipped game.
- The only side effects the branch could ever have had (under the inactive
  `PARAMS_DEBUG`, where `debug_gift: true`) were: record the one-shot event
  `land_debug` and gift 1000×9 resources — a developer showcase gift, not
  gameplay content.

**Config keys removed (dead after this branch):** `debug_gift` in both
`PARAMS_DEBUG` and `PARAMS_PROD` in `game/global/const/game.gd` — the sole
reader was `_gift_debug`.

**Orphaned data (deferred to Phase F content removal):** `land_debug.tres`
(EventData) and the `event_data_text:land_debug` localization row become
unreferenced by code. They are data assets, not code branches, so their
removal is tracked under PF-03 (remove unapproved dark-forest content), not
here.

**Verification:**
- `godot --headless --path . --quit` → clean, 0 script errors.
- F9 parity (`tests/godot_f2/f9_parity.gd`) → still `F9 PARITY PASS (14 checks)`.
- No remaining references to `_gift_debug` or `debug_gift` in `game/**/*.gd`.
