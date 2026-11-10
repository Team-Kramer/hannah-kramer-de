# F9 — Legacy Branch → JSON Mapping

**Updated:** 2026-07-15
**Status:** Design decision (F9 step 1 — inventory + mapping)
**Source:** `game/scenes/controller/unlock_controller.gd` (448 lines) + plan §3.6 branch matrix
**Purpose:** F9 requires inventorying every content-specific ID branch in the legacy game and mapping each to either **(a)** an extracted JSON rule or **(b)** an intentionally retained mechanic. This document is that mapping. It is the foundation for the F9 parity test and for PE-04 (legacy branch deletion).

## Classification legend

| Tag | Meaning |
|---|---|
| **(a) JSON rule** | Content migrated to a declarative JSON rule (trigger + when + effects). The first story re-expresses this content in its own package. |
| **(b) Retained mechanic** | A genuine engine capability (combat, worker automation, prestige, offline, UI tabs, substance, timers). JSON *configures* it via `flag.set` / `event.record` / `unlock`; it never runs arbitrary code. |
| **(c) Deferred / removed** | Dark-forest-specific content (specific IDs, thresholds, the cat, soulstone, beacon, …) not part of the approved first story. Phase F removes it; the *pattern* it used is preserved as (a) where reusable. |

## Effect vocabulary decisions

Current allow-list (identical in `web/js/schema.js` and `tests/godot_f2/package_loader.gd`):
`resource.add`, `resource.spend`, `relationship.adjust`, `unlock`, `flag.set`, `event.record`, `combat.request`.

| Decision | Rationale |
|---|---|
| **Implement `event.record`** in both engines (Godot `event_engine.gd` + Node `f4-f6-runtime.test.cjs`). It is allow-listed but currently unimplemented (would fail at dispatch). Shape `{op:"event.record", eventId:"…"}`; appends to `state.events.recorded`. One-shot-ness comes from the rule's `once:true`. | Represents the legacy one-shot diary/story events (`_trigger_unique_unlock_event`). Generic, content-driven, no new entity type. |
| **Keep `unlock` targetTypes** = `recipe` / `producer` / `combatEncounter`. Legacy progress-button (resource-generator) unlocks map to `producer`. | Progress buttons *are* producers in the JSON model. No new targetType needed for core content. |
| **Worker roles, tabs, tab levels** → retained mechanics, signalled via `flag.set` (boolean) + `event.record` (progression marker). | The worker/manager and UI-tab systems are mechanics; JSON configures which are available, the mechanic reads the flag. Avoids new entity types. |
| **No new trigger types** for the first story. Core content uses `resource.totalAtLeast` + `conversation.choice`. | Mechanic-specific triggers (substance category, worker update, deaths-door, tab change, timer) are retained mechanics; their content consequences are expressed as (b), not as new JSON trigger types. |

## Branch mapping (by legacy handler)

### `_handle_on_main_ready`
| Legacy branch | Classification | JSON / mechanic representation |
|---|---|---|
| prestige > 0 → unlock "substance" tab | (b) | Prestige + UI-tab mechanic; `flag.set` `tab_substance`. |

### `_handle_on_substance_updated`
| Legacy branch | Classification | JSON / mechanic representation |
|---|---|---|
| first "essence" category → event `first_essence` | (b)+(a) | Substance mechanic emits marker; content = `event.record` `first_essence` (once). |
| first "spirit" category → event `first_spirit` | (b)+(a) | Substance mechanic; `event.record` `first_spirit` (once). |

### `_handle_on_resource_increased` (ID-keyed first-item unlocks)
Pattern: a resource reaching a threshold unlocks a producer / worker role / tab / event. The **pattern** is (a); the **specific dark-forest IDs** are (c).

| Legacy branch | Pattern (a) | Specific content (c) |
|---|---|---|
| `firepit`≥1 → unlock `brick` + world tab 2 + worker role | `resource.totalAtLeast` → `unlock` producer + `flag.set` tab + `flag.set` role | firepit/brick IDs |
| `axe`≥1 → `wood` + `lumberjack` | same pattern | axe/wood/lumberjack |
| `pickaxe`≥1 → `stone` + `stone_miner` | same | pickaxe/stone/stone_miner |
| `shovel`≥1 → `clay` + `clay_digger` | same | shovel/clay/clay_digger |
| `spear`≥1 → `WILD` + `hunter` + `tanner` | same | spear/WILD/hunter/tanner |
| `brick`≥1 → `house` | `resource.totalAtLeast` → `unlock` producer | brick/house |
| `WORKER_RESOURCE_ID` → event `firepit_worker` + manager tab + `smelter` | `event.record` + `flag.set` | worker IDs |
| `compass`≥1 → event `enemy_screen` + enemy tab + `sword` | `event.record` + `flag.set` + `unlock` | compass/sword |
| `sword`≥1 → `swordsman` + `swordsmith` | `unlock` producer + role flag | sword IDs |
| `swordsman`≥1 → roles `swordsman`/`sergeant`/`mason` | role flags | role IDs |
| `beacon`≥1 → `starway` tab + event `lore_beacon` | `flag.set` + `event.record` | beacon |
| `soulstone`≥1 → `soul` | `unlock` | soulstone |
| `soul`≥1 → `# TODO: game ending` | (c) ending hook | soul |

### `_handle_land_event` (land thresholds 1–20)
Land is a resource; thresholds use `resource.totalAtLeast` on `land`. **Pattern (a)**; specific dark-forest unlocks are **(c)**.

| Threshold | Unlocks (dark-forest content, c) | Pattern (a) |
|---|---|---|
| ≥1 | `land_1` + `FOREST` + world 1 | `resource.totalAtLeast`(land,1) → `event.record` + `unlock` + `flag.set` |
| ≥2 | `land_2` + `CREEK` | same |
| ≥3 | `cat_watching` + NPC `cat_peek` + timer | (b) NPC/timer mechanic + `event.record` |
| ≥4 | `land_3` + `firepit` | `unlock` producer |
| ≥5 | `land_4` + `axe` + `_gift_debug()` | `unlock` + `resource.add` (gift) |
| ≥6…≥13 | `land_5..11` + tools/miners | `unlock` producer + role flags |
| ≥9 | event `gift_flint_fiber` + gift fiber 4/flint 6/wood 5/stone 3 | `event.record` + 4× `resource.add` |
| ≥10 | `land_8` + `compass` | `unlock` |
| ≥11…≥12 | `land_9/10` + `explorer`/`coal_miner`/`torch_man` | `unlock` + role flags |
| ≥13 | `land_11` + `iron_miner`/`iron_smelter` | `unlock` + role flags |
| ≥20 | `land_spelunk` + `CAVE` | `unlock` + `event.record` |

### `_handle_house_event` (house thresholds 1…10^10)
House is a resource; thresholds use `resource.totalAtLeast` on `house`. **Pattern (a)**; specific dark-forest world-level unlocks are **(c)**.

| Threshold | Unlocks (c) | Pattern (a) |
|---|---|---|
| ≥1 | `house_1` + `clay_digger`/`lumberjack`/`stone_miner` | `event.record` + role flags |
| ≥4 | `house_4` | `event.record` |
| ≥25 | `house_25` + world 3 + `mason` | `event.record` + `flag.set` |
| ≥100…≥10^10 | `house_100…imperium` + world 4–12 | `event.record` + `flag.set` (tab level) |

### `_handle_worker_updated`
| Legacy branch | Classification | Representation |
|---|---|---|
| any `mason`≥1 → event `automation` | (b)+(a) | Worker mechanic; `event.record` `automation` (once). |
| observed role total≥1 → unlock that role | (b) | Worker/manager mechanic; role `flag.set`. |

### `_handle_npc_event_interacted` (cat dialogue)
| Legacy branch | Classification | Representation |
|---|---|---|
| `cat_intro` opt0 → `cat_intro_yes` / opt1 → `cat_intro_no` | (a) | `conversation.choice` trigger → `event.record` / next conversation. Pattern reusable; cat content (c). |
| `cat_talk_A4`/`B4` opt0 → `_gift_double()` else → `cat_no_gift` | (a)+(c) | `conversation.choice` → `resource.add` (gift) / `event.record`. Cat content (c). |

### `_handle_on_deaths_door_resolved` / `_handle_on_deaths_door_open`
| Legacy branch | Classification | Representation |
|---|---|---|
| always unlock `substance` tab | (b) | UI-tab mechanic; `flag.set`. |
| prestige 0 → unlock `beacon`; last enemy → `beacon`+`soul` | (b)+(c) | Combat/deaths-door mechanic; `unlock` + `flag.set`. |
| option 1 → `execute_<order>` else `absolve_<order>` (order≤9) | (a) | `conversation.choice`-like combat outcome → `event.record`. Good-vs-evil outcome pattern (kept, child-adapted). |
| order≤10 → event `darkness_<order>` | (a)+(c) | Combat outcome → `event.record`. |

### `_handle_on_tab_changed` / `_on_timer_cat_timeout` / `_on_soul`
| Legacy branch | Classification | Representation |
|---|---|---|
| Starway tab → level 1 + event `heart_reveal` | (b)+(a) | UI-tab mechanic; `event.record` `heart_reveal` (once). |
| timer while `cat_watching` → NPC `cat_intro`/`cat_intro_1`/`cat_intro_0` by prestige | (b)+(c) | Timer + NPC mechanic; prestige-gated. Cat content (c). |
| `_on_soul` → clear NPC events + `soul_crafted` + NPC `cat_soul_crafted` | (b)+(c) | Soul mechanic; `event.record`. |

### `_gift_debug` / `_gift_double`
| Legacy branch | Classification | Representation |
|---|---|---|
| `_gift_debug` → event `land_debug` + 1000×9 resources | (a) | `event.record` + 9× `resource.add`. (Debug-only; likely removed.) |
| `_gift_double` → event `cat_gift` + gift = current save total of 14 resources | (a)+(c) | `event.record` + 14× `resource.add`. "Double current total" is a mechanic helper; JSON expresses fixed `resource.add` amounts. |

## Summary

- **Vocabulary change required:** implement `event.record` in both engines (the only gap). No new trigger types, no new entity types, no new `unlock` targetTypes for the first story.
- **(a) JSON-rule patterns** (reusable by the first story): resource-threshold → unlock/event/flag; conversation-choice → event/gift/next-conversation; combat-outcome → event (good-vs-evil, child-adapted).
- **(b) Retained mechanics:** combat, worker/manager automation, prestige, offline progress, UI tabs, substance, timers, NPC conversation system.
- **(c) Deferred/removed (Phase F):** all dark-forest-specific IDs, the cat NPC, soulstone/beacon/soul, the land/house threshold ladders, debug gifts.

## Parity test scope (F9 step 2)

The parity test runs identical recorded inputs through (old) legacy semantics and (new) JSON rules + `event_engine.gd`, asserting identical resulting state/effects, **for the (a) patterns only** (resource-threshold and conversation-choice rules). (b) mechanics are verified by their existing behaviour; (c) content is out of scope (removed in Phase F). Snapshots are captured before any legacy branch is deleted (PE-04).
