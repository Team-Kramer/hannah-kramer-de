# Retained Mechanic Capabilities (PE-03)

These are the genuinely novel mechanics that stay in the game code as small,
documented capabilities. JSON content packages **configure** them through the
rule engine's effect vocabulary (`flag.set`, `event.record`, `unlock`,
`resource.add`, `combat.request`) — they never run arbitrary code and never
carry content-specific ID branches.

Classification source: `lichtwald_content_inspector 2/F9_LEGACY_BRANCH_MAPPING.md`
(family (b) "retained mechanic").

## Capability inventory

| Capability | Where it lives | How JSON configures it | What it must not do |
|---|---|---|---|
| Worker role automation | `ScreenManager` (`manager_button_unlock`), `SaveFile.worker_role_unlocks` | `flag.set` whose `flagId` matches a registered `worker_role` ID | No per-role production formulas in JSON; production behavior stays in code |
| UI tabs | `TabManager` (`tab_unlock`), `SaveFile.tab_unlocks` | `flag.set` whose `flagId` matches a registered `tab_data` ID | No tab layout or navigation logic in JSON |
| Timers | `UnlockController` / scene timers (e.g. cat-watch timeout) | `event.record` to mark time-gated story points | No arbitrary schedule expressions in JSON |
| Gifts | `ResourceManager` (`resource_generated`) | `resource.add` effects with fixed amounts | No computed gift formulas (e.g. "double current total") in JSON |
| Combat / encounters | `EnemyController`, `combat.request` engine effect | `combat.request` referencing a registered enemy/encounter; `flag.set`/`event.record` for outcomes | No damage formulas or enemy stats in JSON; child-adapted opponents are authored content (DEC-Combat) |
| NPC conversation system | `npc_dialog` + `npc_event_interacted` signal | `conversation.choice` trigger; `relationship.adjust` effect | No dialogue text or branching in code; all dialogue is package data |
| Prestige / rebirth | `SaveFile` prestige fields, rebirth localization | `event.record` for rebirth milestones | No rebirth copy or reward tables in JSON |
| Offline progress | Offline computation in `SaveFile`/main loop | Not configurable in JSON (capability only) | — |

## Bridge mapping (SignalBus ↔ engine)

`global/engine/rule_bridge.gd` is the only translation layer:

- In: `resource_updated` (amount > 0) → `resource.totalAtLeast`;
  `npc_event_interacted` → `conversation.choice`.
- Out: `unlock` producer → `progress_button_unlock`; `flag.set` worker role →
  `manager_button_unlock`; `flag.set` tab → `tab_unlock`; `event.record` →
  `event_triggered`; `resource.add` → `resource_generated`.
- All output signals are guarded by production `.tres` catalog membership and
  by the same one-shot `SaveFile` latches the legacy managers use, so effects
  are idempotent.

## Rule

A capability is "small" when its JSON surface is limited to the effect
vocabulary above. Any request for a new JSON trigger type or effect must come
with a first-story use case and tests (see DEC-04).
