# Hannahs Lichtwald — Integrated Game Rebuild Plan v2 (updated with V3 decisions)

**Updated:** 2026-11-06  
**Status:** Planning baseline complete; no production game code/content has been changed. Phase B changes remain isolated to the feasibility fixture and harness.
**Authority:** This is the working plan and now incorporates the accepted standalone-workbench decision from [PLAN_LICHTWALD_REBUILD_v3.md](./game/docs/lichtwald_content_inspector%202/PLAN_LICHTWALD_REBUILD_v3.md). It reopens the implementation decisions in [PLAN_GODOT_REBUILD.md](./PLAN_GODOT_REBUILD.md). Keep earlier plans, code, tests, assets, and commits as historical evidence; do not treat their unchecked or checked tasks as current direction.  
**Goal:** Preserve the well-designed core game and event-driven runtime while moving authored entities and content-specific rules into simple, versioned JSON that humans and AI can create. The graphical authoring workbench is a standalone tool outside Godot. The Lichtwald story grows inside the shared game; it is not a separate mission game layered over it.

## Progress tracker

Use the stable IDs below when reporting progress or changing scope. A task is complete only when its listed evidence exists and its acceptance check passes. Do not mark a phase complete until its gate is met.

**Status convention:** `[ ]` not started · `[/]` in progress · `[x]` complete. If blocked, leave it unchecked and add `**Blocked:** reason` beneath the task. Record evidence as a repository path, test output, commit, or reviewed decision in the task's evidence line.

**Change-chunk convention:** Each PB/PC/etc. task is an independently verifiable, commit-sized change; include its focused tests and update its evidence line with the same change. Do not mix unrelated existing worktree changes into a chunk. A checked planning item is not a request to create a commit.

| Phase | Status | Depends on | Exit evidence |
|---|---|---|---|
| A — Baseline map | [x] | None | Source inventory, F0 trace, and explicit family/exception dispositions |
| B — JSON/flow feasibility | [x] | A | F1–F6 automated results pass and PB-02a–g schema/flow decisions recorded; F1 unfamiliar-human edit gate remains open in §5.7/PC-01b |
| C — Standalone graphical workbench | [/] | B | F7–F8 results and standalone workbench gate |
| D — JSON runtime loader | [x] | C | Same valid package accepted by workbench and loaded by game |
| E — Rule migration | [ ] | D | F9 parity evidence; migrated branches removed safely |
| F — Lichtwald package | [ ] | E | Legacy-content disposition and shared-state migration |
| G — Integrated story slice | [ ] | F | Verified child-story playthrough through core loop |
| H — AI authoring | [ ] | G | Reviewed AI edit is valid, inspectable, and playable |

**Decision tracker:** DEC-01 through DEC-08, DEC-Workbench, and DEC-Combat are recorded with their current defaults and revisit conditions under [Decisions and revisit conditions](#11-decisions-and-revisit-conditions). These are planning decisions, not claims that unrun feasibility tests or implementation gates have passed.

**Phase sequencing note:** Phase C implementation has started at the user's direction while the Phase B gate remains open. This work is limited to the standalone workbench and does not authorize production game-content migration or gameplay-code changes.

## 1. Reset in one sentence

The game's core loop is the starting point, not something to redesign from scratch. The diary is the evolving story record inside that game. Its scenes, conversations, choices, and outcomes use the same locations, resource economy, NPC relationships, progression rules, and save state as the rest of play. A separate Mission 01 screen or route is not the target architecture.

The broad diary idea remains: story imagery and captions unfold over time; the player encounters characters and makes consequential choices; resources and relationships change; the world remembers. The intended integrated layout is a broad comic/diary flow on the left, the current location and its gathering/actions/decisions/dialogue in the center, and resources plus community status on the right. Story panels append to the ongoing diary; they do not open a separate mission screen. On narrow screens the same surfaces may stack or collapse, but they continue to operate on the same game state.

The child-facing presentation must not regress to text-only content: each visible resource needs an explicit icon/art reference, and every player-facing story, dialogue, decision, outcome, or enemy/encounter entity needs an illustration reference. The referenced asset record must contain a generated image or a clearly marked placeholder with its art brief; never leave an unexplained missing image or silently reuse an unrelated asset. A reused character portrait or scene image must still be referenced explicitly by the entity/node.

**Direction clarified:** this is primarily a content-source and authoring-tool redesign, not a rejection of the current game's mechanics or event-driven architecture. Preserve the existing game behavior as the baseline unless the inventory proves an element is content-specific, unsafe, or explicitly unwanted. Keep event-driven runtime coordination; move authored content decisions, triggers, conditions, and effects out of scattered content-specific branches.

## 2. Why a second reset is needed

The previous "strip" and "rebuild" plans did not remove the original game's content systems:

- The asset-strip plan was primarily about asset/legal triage. It explicitly kept the `.gd`, `.tscn`, and `.tres` engine and content files, with the save picker leading into the original main scene. The remaining project still has a functioning resource economy, workers, crafting, NPC dialogue, event progression, unlocks, enemies, and prestige progression. See [PLAN_GODOT_ASSET_STRIP.md](./PLAN_GODOT_ASSET_STRIP.md).
- The current project starts at the save picker and loads the original integrated main game. Its main scene instantiates the world, resource, worker, event, unlock, NPC, enemy, substance, and tab systems together. See [project.godot](./game/project.godot) and [main.tscn](./game/scenes/autostart/main/main.tscn).
- The new Mission 01 screen is a separate route and scene. It loads a fixed `MissionData` resource, uses a separate `mission_state` save field, and does not advance through the original world/resource/NPC loop. The deep link selects it directly in [save_file_picker.gd](./game/scenes/autostart/save_file_picker/save_file_picker.gd); its behavior is in [mission_screen.gd](./game/scenes/ui/screen/mission_screen/mission_screen.gd).
- The initial strip was not deep enough: playable legacy progression is still reachable, and the story/resource rules are split between `.tres` files, localization rows, and hard-coded controller branches.

Therefore the next implementation must begin with a dependency and behavior inventory and a graphical way to inspect/edit the core entities—not with another child-facing mission screen. Do not delete or broadly redesign the existing game. Preserve its current state in Git, make its entities inspectable, and replace only legacy content and content-specific rules after their behavior is represented and tested.

## 3. Evidence-based model of the current game

### 3.1 Runtime and state flow

The current runtime is an integrated signal-driven game:

1. The save picker selects or creates a save and loads the main scene.
2. The `Resources` autoload loads typed game-data resources; `SaveFile` owns the current play state; `Locale` resolves UI, event, and NPC text; `SignalBus` connects UI, controllers, and managers.
3. The world screen creates progress buttons from `SaveFile.resource_generator_unlocks`.
4. A progress-button action checks resource and worker costs in `ProgressButtonController`. On success it emits resource changes; `ResourceManager` updates `SaveFile.resources` and emits resource-updated signals.
5. `UnlockController` listens to resource, worker, substance, NPC, tab, and other events. It may add resources, unlock generators/workers/tabs, trigger diary events, or trigger NPC events.
6. Workers produce and consume resources on a cycle. Crafting a substance consumes resources and can activate additional behaviors implemented in controllers.
7. NPC dialogue reads saved active events, presents localized text/options, records the chosen option, follows the selected next-event edge, and can trigger additional code-defined effects.
8. `SaveFile` serializes the shared dictionaries. The newer `mission_state` is an additional, separate field; it is not the original game's canonical progression model.

**GodotProjectZero mechanic comparison (2026-11-06):** [GodotProjectZero](../GodotProjectZero) is at `master` commit `1ea0458cbe1b4f1bee9981491d7be6401adc3ac7`; the target game is at `feature/godot-mission-rebuild` commit `6cdff8f266fcf5ffa86e9ede4a2f714061698532`. Direct file comparisons found matching resource loading, progress-button, unlock, resource-generator, worker, substance, enemy/combat, world-screen, and NPC-dialog implementations. `project.godot` and `SaveFile` differ. This is a targeted comparison, not a claim that the repositories are identical: use GodotProjectZero as the mechanic reference and the Hannah branch as the integration target, preserving its actual entry/save contracts and reconciling differences through F0/F9 parity tests rather than copying the repository wholesale.

**Static path-closure check (2026-11-06):** starting from `project.godot`'s save-picker main scene and all seven autoloads, a literal `res://` traversal found 223 script/scene/resource files (104 `.tscn`, 115 `.gd`, and 4 `.tres`) with no missing literal paths. The `Scene` autoload map includes the normal main game, picker, soul, end, and separate mission scenes; the mission scene is reachable through the save-picker's mission route but is not the default main scene. The scan does not expand directory-based `.tres` loaders or runtime-composed paths and is not proof every statically referenced scene is used in a normal playthrough.

This is the integration seam the new story must use. A story action should change the shared state and then let the same runtime update resources, unlocks, relationships, and the diary. It must not maintain a second economy inside a mission scene. Preserve the signal/event flow; the problem is that content-specific meanings and effects are split across handlers, not that event-driven design is wrong.

### 3.2 Where progression and story live today

There is no single current story graph or `current_story_node` value. Progression is distributed across:

| Concern | Current representation | What the extractor must connect |
|---|---|---|
| Current world economy | `SaveFile.resources`, `workers`, and `substances` | Producers, consumers, conversions, caps, generated/spent counts, and code-driven modifiers |
| Available interactions | `resource_generator_unlocks`, `worker_role_unlocks`, `tab_unlocks`, `tab_levels` | Unlock conditions and the UI interactions each unlock makes reachable |
| Story/event history | `events` counters and ordered `event_log` entries | Which triggers fire each event, which values are interpolated, and what later logic depends on it |
| NPC conversation progress | `npc_events[npc_id][event_id]` values | Entry conditions, line text, option text, selected-option edges, completion state, and choice effects |
| Enemy/prestige progression | `enemy`, prestige metadata, and reset/retention code | Trigger conditions, state reset/retention, and any story consequences |
| New Mission 01 experiment | `mission_state` (`completed`, `unlocks`, resource counters, friendship map) | Its independent lifecycle and the mismatch with the shared game state |

`UnlockController` contains important progression rules in code. For example, land totals unlock forest/creek/firepit and later tools; acquiring an axe, pickaxe, shovel, spear, compass, brick, or worker unlocks other generators, roles, tabs, or events. These are not all represented as references in the data resources.

**Save contract observed in `_export_save_data()` / `_import_save_data()`:** the exported save contains `resources`, `mission_state`, `workers`, `substances`, `events`, `event_log`, `resource_generator_unlocks`, `worker_role_unlocks`, `tab_unlocks`, `tab_levels`, `settings`, `audio_settings`, `effect_settings`, `npc_events`, `enemy`, `metadata`, and `LOCALE`. There is no general top-level story-progress or character-relationship store yet. `mission_state` currently has mission completion/unlocks, separate counters, and `character_freundschaft`; it is not the canonical shared relationship model and must not silently shadow it. Prestige deliberately resets most progression fields but keeps selected resources, substances, settings, and metadata, so save migration must account for reset/retention semantics as well as ordinary load/save. See [save_file.gd](./game/global/autoload/save_file/save_file.gd#L550) and [save_file.gd](./game/global/autoload/save_file/save_file.gd#L326).

### 3.3 Content inventory found in the current `game/resources/game_data`

The seven gameplay-content families below contain **208 `.tres` instances**. The folder also contains 3 `CostFunction` resources, for **211 `.tres` files total**. The localization CSV has 676 data rows, excluding its header, with columns `key`, `description`, `en`, and `de`. These are counts, not proof that every row/resource is active or referenced; the extractor must resolve those relationships. Counts were checked from the current tree on 2026-11-06.

The `Resources` autoload loads the seven typed families from their dedicated `game_data/*/tres` directories and separately loads theme, particle, and image resources. Therefore, the `.tres` totals are not the complete asset inventory.

| Type | Instances | Current responsibility and dependencies | Initial disposition to test |
|---|---:|---|---|
| [ResourceGenerator](./game/resources/game_data/resource_generator/resource_generator.gd#L4) | 37 | Clickable production actions: output amount, cooldown, resource costs/scaling, worker costs, random drops, caps, and dynamic-efficiency identifier. There is no separate, complete `ResourceData` catalogue; resource identities are largely implicit in these generator IDs and state dictionaries. | Move authored generator values/IDs to JSON; preserve generic production/cost handling; replace legacy identities/values for Lichtwald. |
| [WorkerRole](./game/resources/game_data/worker_role/worker_role.gd#L4) | 21 | Automatic production/consumption: `produce`, resource `consume`, and `worker_consume` dictionaries. Runtime efficiency depends on available resources and workers. | Move role definitions/rates to JSON; preserve generic worker simulation; classify each role's content and balance. |
| [SubstanceData](./game/resources/game_data/substance_data/substance_data.gd#L4) | 39 | Craftable/unlockable substances: resource costs, category, hidden state, image ID, and a single `unlocked_by` substance gate. Some resulting gameplay effects are hard-coded elsewhere rather than declared on the substance. | Move authored definitions/prerequisites to JSON; preserve generic crafting; migrate or replace content-specific effects. |
| [NpcEvent](./game/resources/game_data/npc_event/npc_event.gd#L4) | 22 | NPC event identifiers and `next_npc_event_id` arrays. Text/options are looked up separately; trigger conditions and many consequences are outside the resource. | Move conversation topology/content to JSON; preserve generic conversation state/input handling; replace legacy NPCs and branches. |
| [EventData](./game/resources/game_data/event_data/event_data.gd#L4) | 70 | Event identifier, formatting variables, and color. Event text and localized display live in `localization.csv`; trigger rules live in controllers. | Move authored event/story-log definitions to JSON; preserve event dispatch/logging; replace legacy event copy. |
| [TabData](./game/resources/game_data/tab_data/tab_data.gd#L4) | 9 | Tab identifiers/order, while unlocks and tab levels live in save state and managers. | Preserve only registered UI capabilities; package rules may control availability/order of known capabilities, not define arbitrary new screens. |
| [EnemyData](./game/resources/game_data/enemy_data/enemy_data.gd#L4) | 10 | Enemy order, health, image references, and next-enemy progression; runtime triggers/effects are elsewhere. | Preserve fighting/encounter capability and the good-vs-evil conflict; move enemy definitions to JSON and replace/adapt legacy identities, art, stats, lore, and consequences for a child audience. Exact combat rules remain to be reviewed. |

`CostFunction` (3; defined under `game_data/cost_function/`) and individual asset/localization rows need their own reference checks. See [resources.gd](./game/global/autoload/resources.gd#L3) for the loaded directories. The table defines the default disposition for every listed instance in each family; specific exceptions are stated in the ID census and PA-04 checklist. "Move to JSON" applies to authored definitions; it does not mean moving generic runtime mechanisms out of code.

**Loaded ID census (Godot `ResourceLoader`, 2026-11-06):** the following are dictionary keys from the active `Resources` catalog, not inferred names from raw `.tres` parsing. For families exposing an authored `id` property, all entries except the explicitly noted duplicate `explorer` role had filename keys matching their authored `id`. The lists establish inventory scope, not that every entry is reachable or approved for Lichtwald.

| Family | Loaded IDs / keys | Initial disposition |
|---|---|---|
| [`ResourceGenerator` IDs](./game/resources/game_data/resource_generator/tres/) (37) | `CAVE`, `CREEK`, `FOREST`, `WILD`, `axe`, `beacon`, `brick`, `clay`, `coal`, `common`, `compass`, `experience`, `fiber`, `firepit`, `flint`, `food`, `fur`, `house`, `iron`, `iron_ore`, `land`, `leather`, `null`, `pickaxe`, `power`, `rare`, `shovel`, `singularity`, `soul`, `soulstone`, `spear`, `stone`, `sword`, `swordsman`, `torch`, `wood`, `worker` | Move generator definitions/values to JSON and replace legacy identities/values; preserve generic production/cost mechanics. |
| [`WorkerRole` IDs](./game/resources/game_data/worker_role/tres/) (21) | `clay_digger`, `coal_miner`, `experience`, `explorer`, `explorerer` (**authored id `explorer`**), `hunter`, `iron_miner`, `iron_smelter`, `lumberjack`, `mason`, `recruiter`, `sergeant`, `smelter`, `stone_miner`, `swordsman`, `swordsmith`, `tailor`, `tanner`, `torch_man`, `wanderer`, `worker` | Move role definitions/rates to JSON; preserve generic worker simulation. Resolve duplicate `explorer` identity before disposition of the duplicate record. |
| [`SubstanceData` IDs](./game/resources/game_data/substance_data/tres/) (39) | `bone`, `death`, `essence_angel`, `essence_bird`, `essence_dino`, `essence_dragon`, `essence_rabbit`, `essence_skeleton`, `essence_slime`, `essence_spider`, `essence_void`, `essence_wolf`, `eye`, `flesh`, `heart`, `judgement`, `spirit_angel`, `spirit_bird`, `spirit_dino`, `spirit_dragon`, `spirit_rabbit`, `spirit_skeleton`, `spirit_slime`, `spirit_spider`, `spirit_void`, `spirit_wolf`, `strength`, `temperance`, `the_chariot`, `the_emperor`, `the_empress`, `the_hanged_man`, `the_hermit`, `the_hierophant`, `the_high_priestess`, `the_magician`, `the_tower`, `the_world`, `wheel_of_fortune` | Move authored definitions/prerequisites to JSON; preserve generic crafting; replace legacy identities, art, and effects as approved. |
| [`NpcEvent` IDs](./game/resources/game_data/npc_event/tres/) (22) | `cat_intro`, `cat_intro_0`, `cat_intro_1`, `cat_intro_1_1`, `cat_intro_1_2`, `cat_peek`, `cat_soul_crafted`, `cat_soul_crafted_1`, `cat_talk_A1`, `cat_talk_A2`, `cat_talk_A3`, `cat_talk_A4`, `cat_talk_A4_1`, `cat_talk_A4_2`, `cat_talk_B1`, `cat_talk_B2`, `cat_talk_B3`, `cat_talk_B4`, `cat_talk_B4_1`, `cat_talk_B4_1_2`, `cat_talk_B4_2`, `cat_talk_C0` | Move conversation topology to JSON and replace legacy character/dialogue content; preserve generic conversation state/input handling. |
| [`EventData` IDs](./game/resources/game_data/event_data/tres/) (70) | `absolve_1`–`absolve_9`, `automation`, `cat_gift`, `cat_intro_no`, `cat_intro_yes`, `cat_no_gift`, `cat_scam`, `cat_watching`, `darkness_1`–`darkness_10`, `enemy_screen`, `execute_1`–`execute_9`, `firepit_worker`, `first_essence`, `first_spirit`, `gift_flint_fiber`, `heart_reveal`, `house_1`, `house_4`, `house_25`, `house_100`, `house_town`, `house_city`, `house_metropolis`, `house_megalopolis`, `house_capital`, `house_kingdom`, `house_empire`, `house_imperium`, `land_1`–`land_11`, `land_debug`, `land_spelunk`, `lore_beacon`, `resource_generated`, `soul_crafted`, `zero` | Move authored event/log definitions to JSON; preserve event dispatch/logging; replace legacy event text and rule-specific IDs. |
| [`TabData` IDs](./game/resources/game_data/tab_data/tres/) (9) | `enemy`, `manager`, `offline`, `settings`, `soul`, `starway`, `substance`, `unknown`, `world` | Treat registered tab IDs as fixed UI capabilities. Data may configure a known tab's availability/order; it cannot create a new screen. `unknown` remains a fallback identifier, not a feature to author. |
| [`EnemyData` IDs](./game/resources/game_data/enemy_data/tres/) (10) | `angel`, `bird`, `dino`, `dragon`, `rabbit`, `skeleton`, `slime`, `spider`, `void`, `wolf` | Preserve fighting and good-vs-evil conflict (DEC-Combat); author child-adapted opponents in JSON. Legacy identities, art, stats, and lore are not automatically retained. |
| [`CostFunction` IDs](./game/resources/game_data/cost_function/) (3) | `exponential`, `identity`, `linear` | Preserve as generic calculation capabilities; represent selection/parameters as validated package configuration if needed. |

`EventData` ranges above are shorthand for contiguous IDs present in the loaded catalog. Exact canonical file keys are also in each linked family folder; the census report additionally checked the single filename/authored-ID mismatch.

**Typed-ID localization join:** the key convention is `category:id` via `Locale.get_key()`. This complete join compares each typed content ID with the categories read by its resource getters; a present row can still be blank, deprecated, or unused.

| Category | Census result |
|---|---|
| Resource generator label/title/flavor | 35/37 IDs have rows in each category; `singularity` and `soulstone` are missing. Both language cells are blank for 14 labels, one title (`null`), and 13 flavor rows; treat optional/empty values separately from missing keys. |
| Resource generator display name/max flavor | Display names are missing for `CAVE` and `beacon`; max flavor is missing for `CAVE`, `singularity`, and `soulstone`. |
| Worker role title/flavor | All 21 filename IDs have title/flavor rows. Four flavor rows are blank (`experience`, `explorerer`, `recruiter`, `wanderer`); `explorerer` is also an orphan localization key for the duplicate authored `explorer` role. |
| Event/NPC strings | All 70 `EventData` IDs have nonblank text rows. All 22 `NpcEvent` IDs have text and options rows; `cat_peek` has blank text and an empty options array. All 22 English option values parse as JSON arrays (24 choices total). |
| Tab strings | 8/9 tabs have title arrays; `offline` is missing. `tab_info_substance` is missing, and all eight present `tab_info_*` values are empty. |
| Enemy strings | All 10 `EnemyData` IDs have title/info rows; `ambassador` has extra title/info rows outside the enemy catalog. The option-title category has keys for each enemy plus the special `null` key, with option suffixes `1` and `2`. |
| Substance strings | All 39 substances have both expected `<id>_title` and `<id>_info` rows (78/78); all four categories (`charm`, `essence`, `shadow`, `spirit`) have category text. Another 38 `substance_text` IDs are outside that expected set: 22 `*_craft_icon` rows, 14 `[DEPRECATED]` title/info rows for `justice`, `the_devil`, `the_fool`, `the_lovers`, `the_moon`, `the_star`, and `the_sun`, plus `essence_ambassador_info` and `spirit_ambassador_info`. Of the craft-icon rows, 15 correspond to current charm IDs and seven to legacy IDs without a current `SubstanceData`. |
| Other locale categories | 95 distinct literal `ui_label` call IDs were checked; 6 actually used keys are missing (`absolve_button`, `absolve_button_info`, `execute_button`, `execute_button_info`, `manual_button`, `manual_button_info`). The `tab_info_*` and rebirth prefixes are assembled dynamically. All 19 `scale_settings_info` values match the scale values used by the manager settings; the `cat` NPC hover/click keys and all 6 role-label IDs have rows. Eighteen credit IDs are called; `ukrainian` is an extra credit row with no literal call found. |

Across all 676 CSV rows there are 675 unique keys: `ui_label:heart` occurs twice with identical translations but different descriptions; 27 rows are marked deprecated; 80 are marked `[EMPTY]`; one deprecated row is blank. The CSV has 81 blank cells in each language column, including intentional `[EMPTY]` rows. Empty/deprecated markers are not automatically missing-content defects; the full scene-use and disposition join remains open. See [locale.gd](./game/global/autoload/locale/locale.gd#L13) and [localization.csv](./game/assets/i18n/localization.csv).

The prestige rebirth UI constructs 22 keys (`reborn_1_line_1` through `reborn_11_line_2`) from the heart count. All 11 `line_1` rows are intentionally `[EMPTY]`; the 11 `line_2` rows contain legacy power/domination/violence copy and are not child-ready story content. Replace that narrative while separately reviewing whether the prestige/rebirth mechanic belongs in Lichtwald. This is another dynamic localization family, not a missing typed-entity key.

**Current asset footprint and joins:** `Resources.image` recursively loads eight PNG keys from `assets/image`: `cat`, `heart`, `rabbit`, `godot_boot_cover`, `project_icon`, `char_portrait_placeholder`, `spielplatz_01_start`, and `soul`. Those are all eight PNG files currently in that directory, and all eight literal image paths found in project scenes/configuration exist. A repeatable Godot project-scene check found that only **5 of 59** nonblank `SubstanceData.image_id` and `EnemyData` image/icon references resolve (`heart`, `rabbit` occurrences); **54 do not**. This corrects the earlier 8/59 count. The missing references are 36 enemy/spirit/essence occurrences and 18 charm/shadow occurrences; exact IDs are enumerated by the source data. `ResourceGenerator` has no image field, so current resource definitions have no image slot or resource-icon coverage. The isolated Mission screen directly references the two mission images; project settings reference the boot cover and icon. There are also two flag PNGs under `assets/flag/`, but no code/config path reference was found in the static scan; confirm dynamic use before any removal. The `assets/font/` directory contains one font payload, `noto_sans.woff`, accompanied by its OFL text file.

The 54 unresolved references use these missing image keys: creature keys `angel`, `spider`, `void`, `bird`, `skeleton`, `slime`, `dino`, `wolf`, and `dragon` (each occurs in both image/icon fields for its enemy and as spirit/essence imagery: 36 references total); charm keys `the_emperor`, `the_chariot`, `the_high_priestess`, `the_empress`, `the_world`, `temperance`, `the_hermit`, `death`, `judgement`, `the_magician`, `the_tower`, `wheel_of_fortune`, `strength`, `the_hanged_man`, and `the_hierophant`; and shadow keys `flesh`, `eye`, and `bone`. The resolved references are the `rabbit` enemy image/icon plus rabbit spirit/essence, and shadow `heart`. This list is a reference-coverage inventory, not an instruction to preserve or generate legacy creature/card imagery; item disposition remains in PA-04b.

The source asset catalog contains 50 audio files (42 WAV, 8 MP3); 49 have static file-path references and all those paths resolve. The only unreferenced audio file is `magical_interface_3_2.wav`; the SFX map instead points to `magical_interface_3_2_cut.wav`. A PCM check found 41 of the 42 WAV files contain all-zero samples; `magical_interface_3_2.wav` is non-silent. MP3 audio was not decoded, so its silent-placeholder status is unverified.

The per-file caller check disproves several “unused” claims in [asset-strip.md](./game/docs/asset-strip.md#L64): `criminal_district.mp3` and `corpse_rot.mp3` are the Universfield idle/combat streams in the [Audio scene](./game/global/autoload/audio/audio.tscn#L26); the heartbeat stream is the active Starway ambience; `fart` is called by [version_container.gd](./game/scenes/ui/version_container/version_container.gd#L50); and `arrow_hit_1_1_cut.wav` is mapped to `manager_button_zero` and played by [manager_button.gd](./game/scenes/ui/screen/managment_screen/manager_button/manager_button.gd#L283). All seven files in the combat directory are mapped to hit/stab/whoosh SFX and played by the darkness/soul combat UI. `blood_&_gore_2_1.wav` is one of the `_resource` files, mapped as `flesh` and called by [progress_button.gd](./game/scenes/ui/screen/world_screen/progress_button/progress_button.gd#L329). These are current runtime references, not approval of the source license or child-facing presentation. In contrast, `magic_chimes_1_7.wav` is only preloaded: the unlock SFX map entry is `null`, so it is not played through that mapping. The uncut `magical_interface_3_2.wav` has no static caller, unlike its `_cut` variant. The remaining 12 `_resource` WAVs have no static caller found; dynamic directory-based loading was not covered. The mapped combat WAVs are silent placeholders today, not evidence that combat should be removed.

Asset/license records also conflict: [THIRD_PARTY.md](./game/THIRD_PARTY.md) and [asset-strip.md](./game/docs/asset-strip.md) describe all audio as placeholders, but one WAV is non-silent and `assets/audio/indie_friendly_sounds_survival/license.txt` says the official license has not been received. `asset-strip.md` says there are 42 audio files; the current catalog has 50. The older [PLAN_GODOT_ASSET_STRIP.md](./PLAN_GODOT_ASSET_STRIP.md#L108) describes 119 audio files and proposes removing all combat/resource SFX, which conflicts both with the current catalog and accepted DEC-Combat. The existing in-game credits still attribute art, music, writing, and localization under CC-BY-NC-SA 4.0, while the strip says original art/audio were removed. The [image provenance record](./docs/image-provenance.md) and [image license notice](./game/assets/image/license.txt) say game images are generated placeholders; [Noto Sans OFL](./game/assets/font/noto_sans/OFL.txt) is present. These are repository records, not independent legal verification. Resolve per-file provenance, license, scene use, child appropriateness, and final disposition before packaging; do not infer rights or usability from a filename or the broad placeholder claims. Sources include [resources.gd](./game/global/autoload/resources.gd#L23), [audio.tscn](./game/global/autoload/audio/audio.tscn#L8), [sfx_map.gd](./game/global/autoload/audio/sfx_map/sfx_map.gd#L96), [darkness_screen.gd](./game/scenes/ui/screen/darkness_screen/darkness_screen.gd#L273), and [settings_screen.gd](./game/scenes/ui/screen/settings_screen/settings_screen.gd#L350).

Other related content includes cost-function resources, art/audio assets, the localization table, scenes, controllers, and managers. The inventory tool must report these cross-references, not just list the seven `.tres` classes.

### 3.4 NPC conversations are not yet self-contained data

The current NPC example is the cat. Its event resources define node IDs and next-node arrays; the line and response strings are in `localization.csv`; `NpcDialog` displays an active event from the save; `NpcController` maps the selected option index to a next event; and `UnlockController` hard-codes selected choice outcomes (including event triggers and resource gifts). Main-scene code also contains an NPC-event-specific transition.

The current static join has 22 nodes, 24 localized response options, and 16 typed next-node edges; all 16 edges resolve and their indices fit the corresponding option arrays. Eight nodes offer options without a next-node edge, so those choices can only be understood by following controller effects and terminal behavior. `cat_peek` has no text or options, and is not interactable according to `NpcEvent.is_interactable()`. The editor must distinguish graph edges from terminal/effect-only options rather than treating every missing next-node edge as a broken reference.

**Static entry/reachability map:** the `land` ≥3 rule queues `cat_peek`, but that node has no text/options and is not interactable. If `cat_watching` remains set, the timer queues `cat_intro`, `cat_intro_1`, or `cat_intro_0` according to prestige count; `cat_intro` branches to `cat_talk_A1`/`cat_talk_B1`, whose linear branches reach the A1–A4 and B1–B4 chains and their terminal nodes. The soul signal queues `cat_soul_crafted`, which advances to `cat_soul_crafted_1`; interaction there also triggers a main-scene visual transition. Of the 22 nodes, `cat_talk_C0` has no incoming typed edge and no literal trigger callsite found, so it is statically unreachable/dormant in this source scan. This is a static conclusion from loaded `.tres` edges and literal callsites, not a dynamic proof against runtime-composed IDs or save-specific behavior.

Thus, a graph built from `.tres` alone would be incomplete. It must join resource IDs, localization keys, controller rules, and save-state semantics. It must also distinguish a confirmed data edge from a code-inferred or runtime-observed edge.

### 3.5 Resource dependencies are not one simple recipe graph

The current economy includes at least four distinct edge families:

1. Manual generator output, costs, cooldowns, random drops, and caps.
2. Worker-role input/output and worker upkeep over time.
3. Substance crafting costs and substance-to-substance unlock prerequisites.
4. Progression rules that unlock a generator, role, tab, event, or NPC conversation after state changes.

Some modifiers (for example substance- or state-dependent efficiency, cooldown, rewards, and progression effects) are implemented in controller code. The resource inspector therefore needs both a dependency graph and a condition/effect rule list. An edge such as "axe unlocks wood" must show its actual condition and source, not merely infer it from labels or file names.

The typed reference check counted 150 edges: `ResourceGenerator.costs` 33, `random_drops` 13, `worker_costs` 1, `WorkerRole.produce` 19, `consume` 32, `worker_consume` 1, `SubstanceData.resource_costs` 15, `unlocked_by` 10, `NpcEvent.next_npc_event_id` 16, and `EnemyData.next_enemy_id` 10. **149 resolve; the only dangling edge is `tailor` → `rope`.** No `ResourceGenerator.cost_scales` entries were populated in this loaded catalog. This check covers declared typed-resource edges, not code branches, scene reachability, localization, or assets.

### 3.6 Hard-coded progression and story-rule inventory (source review)

The active main scene wires `UnlockController`; its current rule families are listed here so the eventual extractor can be checked against known gaps. This is a source inventory, not approval of any legacy story rule:

| Source rule family | Current behavior/dependencies | Initial disposition |
|---|---|---|
| Resource thresholds | `land` totals drive `land_1`–`land_11`, `cat_watching`, `gift_flint_fiber`, and `land_spelunk`; unlocks include generators, worker roles, a tab level, and the cat intro timer. `house` totals drive `house_1`, `house_4`, `house_25`, then scale through `house_imperium`, with world tab levels and worker-role unlocks. | Move content-specific thresholds, event IDs, and effects to JSON rules; preserve generic resource-delta, total-generated, unlock, and tab-level mechanisms. |
| Direct resource-to-unlock mappings | First `firepit`, `axe`, `pickaxe`, `shovel`, `spear`, `brick`, `compass`, `sword`, `swordsman`, `beacon`, `soulstone`, and `soul` changes unlock further content or events. | Move mappings/conditions/effects to JSON; preserve generic unlock handlers. |
| Worker/substance progression | Any updated worker can unlock its own role; a mason enables `automation`; first `essence`/`spirit` category items trigger events; worker-resource production unlocks the manager tab, smelter, and `firepit_worker`. | Move content-specific category and role conditions to JSON; keep production and event mechanics generic. |
| Cat conversation choices | `cat_intro`, `cat_talk_A4`, and `cat_talk_B4` choice indices trigger legacy event IDs or a one-time bulk resource gift. The gift code excludes some resources and uses save totals as gift amounts. | Replace legacy branch/effect content and represent approved child-story outcomes in JSON; preserve generic choice and typed-effect handling. |
| Delayed cat introduction and main-scene reveal | `cat_watching` plus a timer selects different cat intro IDs by prestige count; `cat_soul_crafted_1` reveals the cat sprite and transitions into soul content. | Replace the cat-specific sequence; retain generic delayed-event/UI transition capability only if the new story needs it. |
| Fighting capability and good-vs-evil conflict | Enemy resolution and progression use the existing combat path; opponents and their identities/stats/art are authored content. | **Preserve fighting and the good-vs-evil conflict (DEC-Combat).** Move opponent definitions to JSON and adapt identities, art, stakes, damage/consequences, and presentation for children. |
| Death's-door lore and prestige progression | Enemy resolution also unlocks the substance tab and conditionally beacon/soul; death's-door options generate `execute_N`/`absolve_N`; opening levels emits `darkness_N`; entering Starway levels the tab and emits `heart_reveal`. Save prestige resets/retains selected resources and substances. Rebirth copy is generated from `reborn_<heart>_line_<index>` localization keys. | Unresolved: review the death's-door/afterlife premise, options, legacy IDs/rewards, and prestige narrative separately from the accepted combat capability. Replace the legacy rebirth copy for children; do not treat narrative removal as removal of fighting. |
| Development-only rewards and placeholders | `debug_gift` can emit a bundle of resources; reaching `soul` contains a game-ending TODO. | Keep test/debug helpers out of shipped authored story content; inventory the TODO as unresolved rather than silently treating it as a valid ending. |

**Exact `UnlockController` branch matrix (static source mapping):** `land` thresholds use `ResourceManager.get_total_generated()` (owned plus spent); `house` and first-item rules use the observed current total from `resource_updated`. Events are one-shot, while unlocks are guarded against duplicates. Event names are authored IDs, not generated from the threshold number.

| Trigger | Event/state effects |
|---|---|
| `land` ≥1 | `land_1`; unlock `FOREST`; world tab level 1 |
| `land` ≥2 | `land_2`; unlock `CREEK` |
| `land` ≥3 | `cat_watching`; queue `cat_peek`; start cat-intro timer only if `cat_peek` was newly queued |
| `land` ≥4, ≥5, ≥6, ≥7, ≥8 | Respectively `land_3` + unlock `firepit`; `land_4` + unlock `axe` + optional debug gift; `land_5` + unlock `pickaxe`; `land_6` + unlock `shovel`; `land_7` + unlock `spear` |
| `land` ≥9 | First-time `gift_flint_fiber` event with values `["4","6","5","3"]`; then gift `fiber` 4, `flint` 6, `wood` 5, `stone` 3 |
| `land` ≥10, ≥11, ≥12, ≥13, ≥20 | Respectively `land_8` + unlock `compass`; `land_9` + unlock `explorer` and `torch`; `land_10` + unlock `coal_miner` and `torch_man`; `land_11` + unlock `iron_miner` and `iron_smelter`; `land_spelunk` + unlock `CAVE` |
| `house` ≥1 | `house_1`; unlock `clay_digger`, `lumberjack`, `stone_miner` |
| `house` ≥4 | `house_4` |
| `house` ≥25 | `house_25`; world tab level 3; unlock `mason` |
| `house` ≥100, ≥1k, ≥10k, ≥100k, ≥1m, ≥10m, ≥100m, ≥1b, ≥10b | Respectively `house_100`/world 4; `house_town`/world 5; `house_city`/world 6; `house_capital`/world 7; `house_metropolis`/world 8; `house_megalopolis`/world 9; `house_kingdom`/world 10; `house_empire`/world 11; `house_imperium`/world 12 |
| First positive `firepit`, `axe`, `pickaxe`, `shovel`, `spear`, `brick` | Respectively unlock `brick` + world 2 + `Game.WORKER_RESOURCE_ID`; `wood` + `lumberjack`; `stone` + `stone_miner`; `clay` + `clay_digger`; `WILD` + `hunter`/`tanner`; `house` |
| First generated worker resource | `firepit_worker`; unlock manager tab and `smelter` |
| First `compass`, `sword`, `swordsman`, `beacon`, `soulstone` | Respectively `enemy_screen` + enemy tab + `sword`; unlock `swordsman` + `swordsmith`; unlock worker roles `swordsman`, `sergeant`, `mason`; Starway tab + `lore_beacon`; unlock `soul` |
| Worker update | If any `mason` exists, trigger `automation`; if the observed role total is positive, unlock that role |
| First substance by category | First `essence`-category item triggers `first_essence`; first `spirit`-category item triggers `first_spirit` |
| `cat` choice | `cat_intro` option 0/1 triggers `cat_intro_yes`/`cat_intro_no`; `cat_talk_A4` or `cat_talk_B4` option 0 invokes the one-time bulk gift, otherwise triggers `cat_no_gift` |
| Cat timer | While `cat_watching` is set, prestige 0 queues `cat_intro`, prestige 1 queues `cat_intro_1`, and prestige ≥2 queues `cat_intro_0` |
| Death's-door resolution/open | Always unlock substance tab; beacon unlocks on first prestige or last enemy, and `soul` also unlocks on a last enemy after the first prestige. Nonzero options emit `execute_<order>` for option 1 and `absolve_<order>` otherwise, only for order ≤9; opening orders ≤10 emits `darkness_<order>` |
| Starway tab change / soul signal | Starway raises its tab to level 1 and triggers `heart_reveal`; unless `soul_disabled`, soul clears active NPC events, triggers `soul_crafted`, and queues `cat_soul_crafted` |

This exact source mapping exposes a notable ID/threshold mismatch: events `land_3`–`land_7` correspond to totals 4–8, and `land_8`–`land_11` correspond to totals 10–13; do not reconstruct threshold numbers from event suffixes. It is not a playthrough proof: debug flags, prestige, last-enemy state, save contents, and signals determine which conditional branches actually run. Source: [unlock_controller.gd](./game/scenes/controller/unlock_controller/unlock_controller.gd#L27).

Sources: [unlock_controller.gd](./game/scenes/controller/unlock_controller/unlock_controller.gd#L27), [main.gd](./game/scenes/autostart/main/main.gd#L265), [main.tscn](./game/scenes/autostart/main/main.tscn), and [save_file.gd](./game/global/autoload/save_file/save_file.gd#L17). The NPC-specific visual sequence and the separate mission route are also in `main.gd`; neither should be mistaken for the core event-driven runtime.

#### Controller-specific rules beyond `UnlockController`

The unlock table is not the full content-coupling inventory. These additional ID-based branches were found in runtime controllers; generic loops and event handlers should be separated from their authored conditions, effects, and legacy identifiers:

| Rule family | Current hard-coded behavior/dependencies | Initial disposition |
|---|---|---|
| Resource generation and cooldown | [ResourceGenerator](./game/resources/game_data/resource_generator/resource_generator.gd#L98) supports authored costs, drops, cooldowns, and dynamic efficiency; `temperance` overrides generator cooldown to one second. [SubstanceController](./game/scenes/controller/substance_controller/substance_controller.gd#L75) gates random `flesh`/`eye`/`bone` generation on `the_world`, boosts the probabilities with `wheel_of_fortune`, and excludes `soul`; `death` periodically generates `heart` and `singularity` ([same file](./game/scenes/controller/substance_controller/substance_controller.gd#L93)). | Keep generic generation/cooldown mechanics; move approved modifiers and outcomes to declarative rules. Replace legacy substance IDs/effects as authored content, not as a reason to discard generic generation. |
| Worker capacity and timing | [WorkerController](./game/scenes/controller/worker_controller/worker_controller.gd#L59) derives worker capacity from `house`, `firepit`, and the configured house-worker count; `the_empress` resets the worker timer ([same file](./game/scenes/controller/worker_controller/worker_controller.gd#L167)). | Preserve generic worker simulation; express approved capacity sources and timer modifiers as data/rules rather than resource-ID branches. |
| Combat and encounter choices | [EnemyController](./game/scenes/controller/enemy_controller/enemy_controller.gd#L35) calculates damage from `swordsman` workers and spirit count; a deaths-door choice generates `essence_<enemy>` or `spirit_<enemy>` and advances through the encounter ([same file](./game/scenes/controller/enemy_controller/enemy_controller.gd#L62)). `the_chariot` resets the enemy timer ([same file](./game/scenes/controller/enemy_controller/enemy_controller.gd#L77)). | **Preserve fighting and the good-vs-evil conflict (DEC-Combat).** Keep the generic encounter/damage/choice capability, but make opponent definitions, rewards, consequences, and approved modifiers JSON-authored and child-adapted. |
| Offline progression | [OfflineController](./game/scenes/controller/offline_controller/offline_controller.gd#L64) applies `the_hierophant` only in manager mode 2, with `the_hanged_man` adding `swordsman` after maxed automation cycles ([same file](./game/scenes/controller/offline_controller/offline_controller.gd#L88)). Combat catch-up reads the current enemy plus `swordsman` storage/efficiency; `the_high_priestess` multiplies `soulstone`, and `death` produces `heart`/`singularity` ([same file](./game/scenes/controller/offline_controller/offline_controller.gd#L122), [#L151](./game/scenes/controller/offline_controller/offline_controller.gd#L151), [#L162](./game/scenes/controller/offline_controller/offline_controller.gd#L162)). | Preserve offline catch-up and combat parity; migrate approved modifiers/effects into the same validated rule model as online play. Review each legacy modifier and reward separately; do not silently drop or duplicate effects. |
| Manual progress-button effects | [ProgressButtonController](./game/scenes/controller/progress_button_controller/progress_button_controller.gd#L88) handles the `soul_disabled` special case; a fixed “charm” resource list gates `strength`, `the_hermit` multiplies output by experience, and strength adds output ([same file](./game/scenes/controller/progress_button_controller/progress_button_controller.gd#L101)). `swordsman` also has a food-efficiency guard and house/experience workaround ([same file](./game/scenes/controller/progress_button_controller/progress_button_controller.gd#L112)). | Preserve generic payment, generation, and feedback; represent approved output modifiers and restrictions as data-driven effects. Revisit legacy IDs and workarounds during behavior-parity tests. |

The exact `UnlockController` branches and NPC graph are enumerated above and in §3.4; other controllers are grouped by modifier family. This is a static source/reachability inventory, not exhaustive runtime branch execution: F0 is the only controlled gameplay trace.

#### Prior asset-strip and removal claims checked against the current tree

| Prior proposal | Current evidence | Status for this rebuild |
|---|---|---|
| Remove `template/` as unused scaffolding | Active [world](./game/scenes/ui/screen/world_screen/progress_button/progress_button.tscn#L9), [management](./game/scenes/ui/screen/managment_screen/manager_button/manager_button.tscn#L7), [darkness](./game/scenes/ui/screen/darkness_screen/darkness_screen.tscn#L10), and [Starway](./game/scenes/ui/screen/starway_screen/starway_screen.tscn#L6) scenes reference particle/tween/spawner scenes beneath `template/`; these are part of the current UI/game feedback path. | **Disproved.** Keep as an active dependency until an explicit replacement is implemented and verified. |
| Remove `scenes/bullet_up_hell/` as outside the demo | [soul_screen.tscn](./game/scenes/autostart/soul_screen/soul_screen.tscn#L7) references both `pattern_master.tscn` and `vignette.tscn`; combat/soul flow remains accepted. | **Disproved as unused.** Any future replacement/removal must preserve approved encounter/combat presentation behavior. |
| Reduce seven typed `.tres` catalogs to a few representative records | The active [Resources autoload](./game/global/autoload/resources.gd#L4) loads the seven full catalogs; all loaded records remain available to the original progression/save model. | **Not authorized.** Keep the complete catalog as behavioral evidence until JSON parity and save migration are validated; assign per-ID dispositions before cutover. |
| Remove combat/resource audio and old music as unused | Active paths and callers are recorded in §3.3; combat remains an accepted capability. | **Disproved as unused; content suitability/license unresolved.** Do not remove the mapped assets without replacing or redirecting their callers and checking attribution. |
| Remove `fart` because it is off-tone | [version_container.gd](./game/scenes/ui/version_container/version_container.gd#L50) calls the sound directly. | **Active but likely unsuitable for the child-facing build.** Replace/disable only together with the caller and an explicit content decision. |
| Remove the old language picker and dropped locale assets | `scenes/language_selection/` is absent, `Locale.LOCALES` is `en`/`de`, and only `de.png`/`us.png` flags remain. | **Already reduced.** Do not recreate the picker; the remaining flags still need caller confirmation before any removal. |
| Add a standalone Mission 01 as the child-game screen | The [save-file picker](./game/scenes/autostart/save_file_picker/save_file_picker.gd#L48) and URL parameter can route into the separate mission scene, but the user's accepted concept is the original integrated resource/story loop, not a second playable mission mode. | **Superseded by direction.** Retain as migration/reference evidence only; integrate approved story content into the main loop, then retire the separate route at cutover. |
| Delete temporary `*.tmp` files and BulletUpHell examples | No `*.tmp` files or `addons/BulletUpHell/Examples/` directory exist in the current tree. | **Already absent.** No cleanup action is needed. |

This is a targeted check of prior high-impact removal claims, not a blanket sign-off of every file listed in the older asset-strip plan. The full removal gate still requires save compatibility, per-file rights/content decisions, and verification of any remaining candidate before deletion.

**Inventory discrepancies to resolve before migration:**

- Two loaded `WorkerRole` records declare `id="explorer"`: `explorer.tres` produces land and consumes food/torch; `explorerer.tres` produces rare and consumes common. `FileSystemUtils.get_resources()` keys both by filename; some systems iterate those keys while save/gameplay state uses role IDs. The land threshold's `explorer` lookup matches the correctly named file, so a failed unlock is **not** established; the duplicate identity and its effect on requirement/UI enumeration are unresolved. The localization CSV still contains deprecated `explorerer` title/flavor keys. Decide whether this is an obsolete duplicate, an alias, or a distinct role with a wrong ID.
- The `tailor` role produces `rope`, but there is no corresponding `ResourceGenerator` definition among the loaded resource IDs. The worker simulation can write that value to shared resource state, while `ResourceTracker` skips IDs without a generator definition. Determine whether `rope` is intentionally hidden, incomplete content, or a missing resource definition.

These are precisely the kinds of gaps the extractor/validator must report rather than silently normalize. Sources: [file_system_utils.gd](./game/global/utils/file_system_utils.gd#L45), [explorer.tres](./game/resources/game_data/worker_role/tres/explorer.tres), [explorerer.tres](./game/resources/game_data/worker_role/tres/explorerer.tres), [manager_button_controller.gd](./game/scenes/controller/manager_button_controller/manager_button_controller.gd#L34), [unlock_controller.gd](./game/scenes/controller/unlock_controller/unlock_controller.gd#L163), [tailor.tres](./game/resources/game_data/worker_role/tres/tailor.tres), [resource_tracker.gd](./game/scenes/ui/resource_tracker/resource_tracker.gd#L44), and [localization.csv](./game/assets/i18n/localization.csv#L358).

## 4. Target experience and architecture constraints

### 4.1 Experience direction

- The ongoing diary/story record belongs to the normal game experience.
- A story beat can appear in the established world flow, and its choices operate on the shared game state.
- NPCs and child characters are persistent participants in that same state. Track friendship/relationship separately per character so conversations and choices can affect that character's later availability, responses, and outcomes.
- Gathering resources should contribute to growing and sustaining a community of children in the forest. The first integrated story should use a deliberately small, understandable subset of resource types and mechanics; introduce additional resources and systems only as later stories need them. The exact starting subset and balance remain open until the inventory and story slice are reviewed.
- Comic/diary story beats need an illustration brief or asset plus a child-readable caption. Keep the text usable as the source for optional future narration/text-to-speech; do not make audio a prerequisite for the first playable slice or author the same narration independently in multiple places.
- Keep fighting as a game capability and retain a clear good-versus-evil conflict. Adapt combat presentation, stakes, consequences, and authored opponents for children; replacing legacy enemy content must not be interpreted as removing fighting functionality or the conflict premise.
- Resources matter because they enable actions and change what is possible; they are not a decorative counter or a one-screen mission budget.
- Legacy dark-forest narrative, character identities, text, art/audio, and content-specific values/rules must not remain as a second playable game after cutover. The resource, worker, recipe, event, unlock, NPC, enemy, and prestige mechanics are not blanket-rejected: preserve the well-designed core by default, then decide entity-by-entity which data to keep, adapt, or replace for the Lichtwald stories.
- Child-safety, calm pacing, legible controls, and recoverable progress remain design guardrails. Exact art, layout, resource set, story length, and decision mechanics remain open until the dependency inventory is reviewed.

### 4.2 Preserve the game; decouple its authored content

The existing game is the foundation. The purpose of classification is to find content-specific coupling and safe migration points, not to justify a wholesale mechanics rewrite:

| Classification | Meaning |
|---|---|
| **Preserve as game capability by default** | The established resource loop, event/signal flow, worker production, crafting, NPC interaction, fighting/encounters, progression, save/load, and UI capabilities. Change these only to support data-driven configuration, child-appropriate adaptation, correctness, or an explicitly approved design change. |
| **Move to JSON** | Authored entity definitions and content-specific values/rules: resource types, producers, recipes, NPCs, dialogue, story nodes, unlock conditions, and their effects. |
| **Replace as Lichtwald content** | Legacy names, text, characters, art/audio, economy values, event copy, and story-specific conditions/effects that should not ship in the child game. |
| **Remove** | A capability or content item only when it has no approved role and its callers, save implications, and dependencies have been checked. |
| **Unresolved** | A dependency that cannot yet be classified. It blocks removal or a claim that the behavior has been migrated. |

This replaces both extremes: retaining every old content instance is not a finished strip, but removing well-designed mechanics is not the goal either. Keep the current implementation available as the behavioral reference while building the JSON-backed path.

## 5. Repeatable content extraction and inspection tool

### 5.1 Working name and purpose

Build a developer-only **Lichtwald Content Inspector** as a standalone graphical authoring and analysis tool, not another child-facing game screen or a Godot Editor Plugin. The current prototype lives in [`game/docs/lichtwald_content_inspector 2/web/`](./game/docs/lichtwald_content_inspector%202/web/) and documents itself as v0.2. The tool should make the currently scattered story, resource, NPC, trigger, and effect relationships visible and produce versioned JSON that can later be reviewed, edited, validated, imported, and generated by AI.

**Accepted DEC-Workbench (2026-11-06):** the graphical workbench lives outside Godot. A standalone web tool makes authoring independent of the engine, accessible to writers without Godot, easier to validate in CI/headless workflows, and less likely to couple content edits to game code. AI can create or revise the same JSON files without launching Godot. The shared package is the contract: the workbench creates/validates it, and Godot later consumes it through a runtime loader.

The workbench may inspect existing Godot resources read-only as a migration/reference view, but it writes only a separate JSON package. Do not rewrite live gameplay data or controllers until the workbench can display, edit, validate, and export the core entity types reliably.

### 5.2 Inputs and extraction method

The extractor must combine:

1. Typed Godot content resources under `game/resources/game_data/` (load with Godot's resource loader rather than parsing `.tres` as ad hoc text).
2. Localization keys and values from `game/assets/i18n/localization.csv`.
3. Runtime/save definitions in `SaveFile`.
4. Trigger and effect behavior in controllers/managers, especially `UnlockController`, `NpcController`, `NpcManager`, `EventController`, `EventManager`, `ResourceManager`, `ProgressButtonController`, `WorkerController`, and `SubstanceController`.
5. Scene/autoload wiring that proves which controllers and screens are actually active.
6. Optional reproducible runtime traces from known save snapshots for behavior that static data alone cannot resolve.

Every extracted record/edge needs provenance: source path, source kind (`resource`, `localization`, `code`, or `runtime trace`), and the property/function/rule that supplied it. Do not invent conditions, story order, dialogue, or resource effects.

### 5.3 Required views

| View | Must show |
|---|---|
| **Story/progression graph** | Start/re-entry points, triggers, event/story beats, NPC conversations, choices, conditions, outcomes/effects, and downstream unlocks. Show each beat's caption, illustration brief, asset/placeholder status, and location. Filter by chapter, location, character, and reachability. |
| **Location catalogue** | Every location ID, localized name, scene/background asset, entry/availability conditions, and the story/actions/NPC interactions connected to it. |
| **Resource catalogue and dependency graph** | Every resource ID, icon/art reference, or explicit placeholder brief; generators, recipes, worker production/consumption, costs, caps, unlock conditions, and all producers/consumers. Provide a table as well as a graph so exact values are inspectable. |
| **Encounter catalogue** | Registered enemy/encounter IDs, child-adapted presentation/art, conditions, generic combat capability inputs, rewards/effects, and the story/rules that make an encounter reachable. |
| **NPC/conversation catalogue and graph** | Every NPC, portrait reference, conversation entry trigger, line, input/choice, condition, next node, effect, localized text, and saved completion/choice state. Show unreachable or dangling nodes. |
| **Cross-domain trace** | From a player action or dialogue choice, follow state changes through resource updates, rules, unlocks, later dialogue/story nodes, and saved fields. |
| **Coverage/validation report** | Missing references, missing translations/assets, duplicate IDs, unreachable nodes, cycles, impossible conditions, unrepresented hard-coded effects, and code behavior not yet modeled in JSON. |

The graph should label edge types distinctly (for example `trigger`, `choice`, `requires`, `produces`, `consumes`, `unlocks`, and `changes-state`). A plain connected graph that hides the meaning of its edges is not sufficient.

### 5.4 Recommended implementation shape

- Extend the existing standalone web workbench rather than building a Godot Editor Plugin. Keep future CLI/API validation and AI authoring able to operate on package files without starting Godot.
- Provide graph, table, entity-inspector, and raw-JSON views. Every GUI edit must serialize to the same readable JSON that a human or AI can edit; no hidden editor-only source format.
- Use the same package shape and validation rules in the workbench and eventual Godot runtime. A future shared validator may be reused or ported, but equivalence must be demonstrated by tests rather than assumed across JavaScript and GDScript.
- Keep headless validation/export available for CI and repeatable content review. The graphical workbench remains the human review surface; the runtime loader is not an authoring UI.
- Initially show legacy hard-coded rules with source anchors and an `unmodeled` marker. After the workbench and schema are approved, migrate those rules to declarative JSON and compare runtime behavior before removing the old code.
- The reader/writer must be stable: sort deterministically, preserve case-sensitive IDs and unknown fields, separate definition data from save data, and never write partial/invalid JSON over the last valid package.

The standalone prototype and its usage/decision records are available in [`game/docs/lichtwald_content_inspector 2/`](./game/docs/lichtwald_content_inspector%202/). Its reference fixture is [`fixtures/spielplatz_demo/`](./game/docs/lichtwald_content_inspector%202/fixtures/spielplatz_demo/). The existence of these artifacts does not itself mean F1–F8 or the workbench gate have passed.

### 5.5 Graphical workbench is a prerequisite, not a later convenience

The first useful editor should make these core entities visible and editable without changing gameplay code:

- Resource definition, producer/gather action, recipe/conversion, worker role, and resource dependencies.
- Location, its visual asset, availability, and the actions/story content presented there.
- Registered enemy/encounter definitions and safe configuration of the preserved combat capability.
- Story/adventure, beat, decision, transition, condition, outcome, and typed effect.
- NPC, conversation, dialogue line, player input, branch, relationship, and trigger.
- Rule/event, unlock, location, localization, and asset reference.

Minimum authoring flow:

1. Select or create a JSON content package in the standalone web tool and see its entities in type-specific lists.
2. Select an entity and edit its fields in a form; add, duplicate, delete, and connect entities through a graph where appropriate.
3. See condition/effect dependencies and the affected resource/story/NPC entities; navigate both directions.
4. Preview the generated JSON and edit the same document as raw JSON when desired.
5. Validate live with clear errors/warnings and clickable source/entity references.
6. Save atomically only after schema and reference checks pass; keep the previous valid version recoverable.
7. Preview the JSON package in the workbench. A development game reload is a separate, later Phase D concern and must load only a fully validated package without rebuilding or hand-editing GDScript.

**Workbench gate (Phase C, standalone):** a human or AI can create/edit a location, small story, one resource action, one NPC conversation, and a registered encounter definition in the standalone workbench or its JSON package; inspect cross-links and basic graphs; validate locale, asset, and encounter references; export it in the agreed folder layout; and reopen it without loss. The exported package must be structurally ready for the future Godot JSON loader. This gate does not require the game to load it—that is Phase D. Only after this gate passes should hard-coded content behavior be moved out of existing controllers.

### 5.6 Flow architecture: graph + event rules, not a general workflow engine by default

These are related but different models; the editor should make their boundaries visible:

| Model | Responsibility | Recommendation |
|---|---|---|
| **Story/conversation graph** | Authored narrative topology: beats, dialogue, player choices, conditional branches, and outcomes. | Use this as the human/AI-facing way to plan and inspect story flow. Nodes and edges are JSON entities with stable IDs. |
| **Event-driven rule set** | Reacts to game facts such as a resource threshold reached, an item crafted, a conversation choice made, or a location entered. It evaluates conditions and dispatches typed effects. | Keep the event-driven architecture. Move content-specific subscriptions/conditions/effects into declarative JSON rules; keep a small generic event dispatcher and effect handlers in code. |
| **State machine** | Governs the lifecycle of one active interaction or story instance: available → active → waiting for input/event → completed; handles pause/resume and prevents illegal transitions. | Use where it clarifies a real lifecycle, not as the representation for every resource or every global game state. Story progress may use an explicit current node plus visited/choice history. |
| **Workflow/BPMN engine** | General-purpose orchestration of long-running jobs, retries, timers, compensation, and external services. | Do not add one for the first implementation. It risks duplicating the game save/event system and imposing job semantics on authored story. Reconsider only if concrete requirements need durable parallel processes, scheduled waits, retries, or external orchestration beyond the graph + rules + save model. |

The story graph is not the whole game-state graph. Resource values, relationships, and unlocks are state; story transitions and rule/event/effect links explain how interactions change that state. The editor should offer:

- **Authoring graph:** readable story/conversation paths with explicit choice/condition labels and outcome links.
- **Dependency graph:** cross-domain links such as choice → emitted event → matching rule → resource/relationship effect → newly available story or NPC node.
- **State/lifecycle inspector:** current node, pending input, visited nodes, fired rule/effect keys, and relevant state snapshot for a test run.
- **Event/rule matrix:** event type → matching rules → conditions → effects, including event payload fields and provenance.
- **Filtered views:** let a writer focus on one story/NPC/resource while showing connected entities and hiding unrelated global systems.

At runtime, player actions and generic mechanics emit typed events. The rule evaluator processes matching rules against authoritative state, applies validated/idempotent effects, and signals the story runtime/UI to refresh availability. A story choice can also explicitly transition to another node. Avoid turning every runtime event into an implicit story transition: the authoring graph should show the connection when a rule makes a story node available or advances it.

For an active story run, prefer a small explicit state record (story ID, current node ID, visited nodes, selected choices, pending input, and applied effect keys) with guarded transitions. The story graph is static authored content; the run state is the saved player's progress through it. Global resources and relationships remain ordinary shared game state, not states in one giant machine. The existing event bus remains responsible for notifying systems that state has changed.

### 5.7 Ordered feasibility tests before committing to the tool or runtime architecture

These are small, throwaway prototypes and tests, not production implementation. Run them in order, retain evidence, and stop to revise the schema if a gate fails. Use one deliberately small fixture: two resources, one producer, one recipe/conversion, one NPC with a branching conversation, one story with a choice and two outcomes, and rules connecting a resource event and a conversation choice to state changes.

For each test, record the result, evidence path, decision/change required, and reviewer in the plan or a linked test report. Keep each result unchecked until its pass evidence exists.

#### F0 — Baseline behavior and trace

- [x] Choose representative paths: gather/pay a resource, cross an unlock threshold, trigger an NPC line, make a branch choice, apply its consequence, save/reload.
- [x] Map the source-level event order, known payloads, state fields, and source anchors below.
- [x] Replay the path against a controlled save in the running game and record actual before/after values and signal order.
- [x] Verify save/reload preserves the selected path's state after the replay.
- **Evidence:** source-level trace below; runtime trace assertions passed under Godot 4.4 using a temporary project-scene harness (`godot --headless --path . res://tests/phase_a_trace.tscn`, harness removed after the run to keep Phase A free of game/test code changes); baseline commit `6cdff8f266fcf5ffa86e9ede4a2f714061698532`, branch `feature/godot-mission-rebuild`. Exit code 0; shutdown reports existing ObjectDB/resource leak warnings. Run this harness as the project's main scene, not with standalone `--script`: the isolated runner produced `Locale`/resource-type compile errors before exercising gameplay.

**Source-level resource trace (starting generator `land`):**

| Step | Event/state transition | Source evidence |
|---|---|---|
| 1 | The initial save exposes `land`; the world screen creates progress buttons from `SaveFile.resource_generator_unlocks`. `land` has amount 1, no costs, and no cap. | [save_file.gd](./game/global/autoload/save_file/save_file.gd#L30), [world_screen.gd](./game/scenes/ui/screen/world_screen/world_screen.gd#L48), [land.tres](./game/resources/game_data/resource_generator/tres/land.tres) |
| 2 | A successful progress-button action emits `progress_button_paid`, then `resource_generated("land", amount, "land")`. | [progress_button_controller.gd](./game/scenes/controller/progress_button_controller/progress_button_controller.gd#L84) |
| 3 | `ResourceManager` changes `SaveFile.resources.land`, then emits `resource_updated(id, total, amount, source_id)`. | [resource_manager.gd](./game/scenes/manager/resource_manager/resource_manager.gd#L18) |
| 4 | `UnlockController` reacts only to positive resource deltas and checks `ResourceManager.get_total_generated("land")` (current + spent). At total ≥1 it records the unique `land_1` event, unlocks `FOREST`, and raises world tab level to 1; at ≥2 it unlocks `CREEK`; at ≥3 it triggers cat-watching and schedules the cat introduction path. Later thresholds unlock more tools/resources. | [unlock_controller.gd](./game/scenes/controller/unlock_controller/unlock_controller.gd#L37), [unlock_controller.gd](./game/scenes/controller/unlock_controller/unlock_controller.gd#L126) |
| 5 | The event manager increments `SaveFile.events[event_id]` and appends the event ID plus values to `SaveFile.event_log`; the unlock manager appends newly unlocked generators to save state and signals the world screen to add them. | [event_manager.gd](./game/scenes/manager/event_manager/event_manager.gd#L18), [screen_manager.gd](./game/scenes/manager/screen_manager/screen_manager.gd#L17) |
| 6 | Save export includes resources, event counters/log, and unlocked generators. Save import restores those dictionaries. | [save_file.gd](./game/global/autoload/save_file/save_file.gd#L550), [save_file.gd](./game/global/autoload/save_file/save_file.gd#L572) |

**Source-level NPC trace (cat introduction branch):**

| Step | Event/state transition | Source evidence |
|---|---|---|
| 1 | Unlock progression triggers a `NpcEvent`; `NpcManager` stores the event under `npc_events["cat"][event_id]` as `-1` when it has choices, otherwise `0`. | [unlock_controller.gd](./game/scenes/controller/unlock_controller/unlock_controller.gd#L294), [npc_manager.gd](./game/scenes/manager/npc_manager/npc_manager.gd#L18) |
| 2 | `NpcDialog` finds the active `-1` event and loads the line and options from `NpcEvent`/`Locale`; text/options are in localization data rather than the `.tres` node. | [npc_dialog.gd](./game/scenes/ui/screen/world_screen/npc_dialog/npc_dialog.gd#L96), [npc_event.gd](./game/resources/game_data/npc_event/npc_event.gd#L22), [localization.csv](./game/assets/i18n/localization.csv#L474) |
| 3 | Choosing option 0 or 1 emits `npc_event_interacted`. `NpcController` follows the corresponding `next_npc_event_id` edge, then requests the manager to record the selected option. | [npc_dialog.gd](./game/scenes/ui/screen/world_screen/npc_dialog/npc_dialog.gd#L182), [npc_controller.gd](./game/scenes/controller/npc_controller/npc_controller.gd#L22), [npc_manager.gd](./game/scenes/manager/npc_manager/npc_manager.gd#L27), [cat_intro.tres](./game/resources/game_data/npc_event/tres/cat_intro.tres) |
| 4 | Separately, `UnlockController` has a cat/event-ID-specific branch: `cat_intro` option 0/1 triggers `cat_intro_yes`/`cat_intro_no`. These event IDs are persisted in event counts/logs. | [unlock_controller.gd](./game/scenes/controller/unlock_controller/unlock_controller.gd#L107), [event_manager.gd](./game/scenes/manager/event_manager/event_manager.gd#L18) |

**Runtime-observed resource trace (controlled save):**

| Action | Signal order observed | State after action |
|---|---|---|
| 1st `land` | `progress_button_paid` → `event_saved:land_1` → `event_triggered:land_1` → `progress_button_unlocked:FOREST` → `resource_updated:land:1` → `resource_generated:land:1:land` → `progress_button_pressed` | `land=1`; `land_1=1`; `FOREST` unlocked |
| 2nd `land` | `progress_button_paid` → `event_saved:land_2` → `event_triggered:land_2` → `progress_button_unlocked:CREEK` → `resource_updated:land:2` → `resource_generated:land:1:land` → `progress_button_pressed` | `land=2`; `land_2=1`; `CREEK` unlocked |
| 3rd `land` | `progress_button_paid` → `event_saved:cat_watching` → `event_triggered:cat_watching` → `npc_event_saved:cat_peek` → `npc_event_triggered:cat_peek` → `resource_updated:land:3` → `resource_generated:land:1:land` → `progress_button_pressed` | `land=3`; `cat_watching=1`; `cat_peek` pending |

**Runtime-observed NPC choice and persistence:**

| Operation | Signal order observed | State verified |
|---|---|---|
| Trigger `cat_intro` | `npc_event_saved:cat_intro` → `npc_event_triggered:cat_intro` | `npc_events.cat.cat_intro=-1` (awaiting input) |
| Choose option 0 | `npc_event_saved:cat_talk_A1` → `npc_event_triggered:cat_talk_A1` → `npc_event_updated:cat:cat_intro:0` → `npc_event_update:cat:cat_intro:0` → `event_saved:cat_intro_yes` → `event_triggered:cat_intro_yes` → `npc_event_interacted:cat:cat_intro:0` | choice `0` recorded; `cat_talk_A1=-1`; `cat_intro_yes=1` |
| Save, clear selected in-memory fields, import the file | No gameplay signals asserted | `land=3`, `FOREST` unlocked, `cat_intro=0`, `cat_talk_A1=-1`, and `cat_intro_yes=1` restored |

The scratch save was removed and the original in-memory save state restored. This trace exercises signals directly in the running project rather than the visible UI; it verifies runtime handlers and persistence, not visual layout or input-device behavior.

**Trace limits found:** resource and conversation content is spread across resources, localization, signal handlers, and code. `UnlockController` owns threshold rules and choice effects; main-scene code has additional event-specific cat behavior. The controlled replay now verifies one resource path, one NPC branch, exact observed signal order, and relevant save fields; it does not cover every content item or every branch.

#### F1 — JSON file boundaries and readability

- [x] Hand-author the fixture as domain-sized JSON files (`manifest`, `combat`, `locations`, `resources`, `rules`, one story, one NPC/conversation, locale/assets).
- [x] Give each fixture resource an icon asset reference; give every player-facing story/dialogue/decision/outcome node a text key and illustration reference. Each referenced placeholder asset must have its art brief in the asset catalog.
- [x] Keep locale text only in locale files and confirm every content `textKey` resolves; confirm every asset reference resolves to a registered ready or placeholder asset.
- [ ] Ask a human unfamiliar with the schema to make a small edit.
- [x] Ask an independent AI to make a small edit from the same package and instructions.
- [ ] Confirm both can locate/edit the intended entity without unrelated edits; revise file granularity if edits require broad cross-file surgery.
- **Evidence:** [`fixtures/spielplatz_demo/`](./game/docs/lichtwald_content_inspector%202/fixtures/spielplatz_demo/) now has two resource types, one gathering action, one conversion recipe, a location, a branching illustrated story, one NPC conversation, one child-adapted encounter, shared rules, de/en locale files, and asset-catalogued placeholders. `node --test "tests/f1-package-contract.test.cjs"` from the workbench root passes 6/6 checks for file inventory, IDs, locale and asset references, graph/domain links, and art references. An independent AI used the package README/manifest and changed only `resources.json` → `lichttropfen.initialAmount` (`0` to `1`) in a scratch copy; all 10 JSON files parsed and the diff contained only that field. A separate two-browser UI smoke edited one locale value and one resource value on shared-base branches, then merged them with one semantic path per branch. This does not constitute unfamiliar-human review; do not mark F1 complete until that review and the combined edit-scope review are recorded.

#### F2 — Parse, typed model, and round-trip

- [x] Load fixture JSON in Godot, validate into typed runtime entities (including enemy/encounter definitions), serialize it back, and reload it.
- [x] Include Unicode text, optional fields, empty arrays, numeric boundaries, and an unknown extension field.
- [x] Confirm supported fields round-trip without loss, unknown fields are preserved or explicitly rejected by schema version, output is deterministic, and diagnostics identify the entity/field.
- **Evidence:** [`tests/godot_f2/f2_round_trip.gd`](./game/docs/lichtwald_content_inspector%202/tests/godot_f2/f2_round_trip.gd) in an isolated Godot 4.4 project passes via `godot --headless --path "tests/godot_f2" --script res://f2_round_trip.gd`. The fixture loads all nine manifest files, wraps 39 stable-ID records as typed entities (with a field-typed resource definition), preserves the unknown `x-authoring` field, rejects a bad field with a path-specific diagnostic, preserves Unicode/optional/null/empty-array and 0/999 integer bounds, and passes typed serialization → reload → deterministic reserialization. The experiment also found that integral JSON numbers can become floats after Godot parse/serialize; the prototype canonicalizes safe integral floats to integers and rejects non-integral values for integer fields. This is a feasibility harness, not a production loader or full field schema; package schema and combat profile registration remain to be finalized.

#### F3 — References and cross-domain graph

- [x] Resolve IDs for locations, story nodes (including the start node), NPCs, dialogue targets, enemies/encounters, resources, producers, recipes, rules, effects, localization, and assets.
- [x] Generate provenance-backed graph edges from explicit references and rule effects; test dangling IDs, duplicate entity/story-node IDs, and missing story start nodes.
- [x] Confirm the fixture's tested edges are exact and deterministic; invalid references fail with a source path. Do not infer links from similar names.
- **Evidence:** [`tests/f3-reference-graph.test.cjs`](./game/docs/lichtwald_content_inspector%202/tests/f3-reference-graph.test.cjs) passes 3/3 graph/reference checks. The validator checks the complete fixture, including nested resource-map keys, condition paths, local dialogue links, locale keys, and assets; negative cases confirm source diagnostics for dangling story links, missing start nodes, and duplicate IDs.

#### F4 — Conditions and effects

- [x] Evaluate the condition vocabulary and allow-listed effects on a small in-memory state.
- [x] Test conjunction/disjunction/negation, missing fields, wrong types, unavailable choices, resource spend/add, relationship changes, and unlocks.
- [x] Test a registered encounter request through the typed `combat.request` capability; arbitrary script fields and unregistered enemy/encounter/profile IDs are rejected.
- [x] Confirm deterministic bounded conditions; validate all effects against a draft state before committing mutation; reject unknown operations/operators.
- **Evidence:** The first 6 checks in [`tests/f4-f6-runtime.test.cjs`](./game/docs/lichtwald_content_inspector%202/tests/f4-f6-runtime.test.cjs) cover condition/effect behavior. The feasibility DSL supports bounded `all`/`any`/`not` expressions and typed `eq`/`ne`/`gt`/`gte`/`lt`/`lte` comparisons over registered resource, relationship, flag, story-visit, and unlock paths. Effects allow resource spend/add, relationship adjustment, flag set, recipe/producer/encounter unlock, and registered encounter requests; batches validate against a draft state before commit. This is test evidence, not yet a production runtime contract.

#### F5 — Event-driven connection and parity

- [x] Connect a typed game event to JSON rule selection and capture payload, matched rules, condition results, ordered effects, and resulting state.
- [x] Replay the F0 resource-threshold and NPC-choice outcomes against the recorded baseline; test duplicate/replayed event delivery.
- [x] Confirm selected saved-state outcomes match, effects apply once using a stable event ID, unrelated rules do not fire, and ordering assumptions are explicit.
- **Evidence:** The 5 event checks in [`tests/f4-f6-runtime.test.cjs`](./game/docs/lichtwald_content_inspector%202/tests/f4-f6-runtime.test.cjs) pass event selection, full trace capture, F0 outcome replay (land 1/2/3 unlocks and cat branch choice), same-ID deduplication through JSON save/reload, conflicting-ID rejection, unrelated-rule isolation, and ordered rule evaluation. Prototype ordering is explicit: resource state is updated before rule evaluation, rules and their effects run in JSON array order, and later rules observe earlier effects. Legacy F0 emitted unlock/event signals before its `resource_updated` observation; this experiment matches the selected persisted outcomes, not that signal sequence. Reconcile this adapter/UI ordering difference before production migration.

#### F6 — Story graph execution and resume

- [x] Run the fixture through story beat → conversation → player choice → conditional branch → outcome.
- [x] Save at a waiting-input point and after an effect; reload and continue. Include a loop/revisit and a blocked choice.
- [x] Confirm deterministic resume, intentional/visible loops, explanation for blocked choices, and no duplicate effects after repeated input/reload.
- [x] Record whether a small per-story state machine is sufficient; do not introduce a workflow engine without a demonstrated unmet requirement.
- **Evidence:** The story test in [`tests/f4-f6-runtime.test.cjs`](./game/docs/lichtwald_content_inspector%202/tests/f4-f6-runtime.test.cjs) runs the fixture through the Juan conversation, a resource-gated choice, the `waited → repair_choice` revisit, and the repaired-path outcome. It saves/reloads at waiting input and after relationship/resource effects; replayed inputs do not repeat effects, unavailable choices return `condition_not_met`, and visit history makes the loop visible. The compact state (current story/dialogue node, pending input, visits, applied outcome IDs, and input IDs) is sufficient for this slice; no separate workflow engine is justified by the evidence.

#### F7 — Standalone graphical editor and graph comprehension

- [x] Evaluate and extend the standalone workbench's graph, entity inspector, and event/rule views on the same fixture. **Evidence:** entity tables/inspector, story/dependency graphs, event-rule matrix, and preview are present; Chromium confirmed rule filtering/selection and the gated choice/effect presentation.
- [ ] Ask a writer and developer to answer "What can happen next?", "Why is this locked?", and "What changes if I choose this?" using only the standalone tool.
- [x] Confirm links, conditions, and state preview expose the answers; if the graph becomes a hairball, split authoring and dependency views. **Evidence:** story graph shows reachable nodes/choices; Preview shows blocked-choice condition explanations and projected direct/triggered effects; dependency graph and event-rule matrix expose cross-domain links. This is AI/tool inspection only, not a substitute for writer/developer comprehension review.
- **Evidence:** [`web/`](./game/docs/lichtwald_content_inspector%202/web/) and [`fixtures/spielplatz_demo/`](./game/docs/lichtwald_content_inspector%202/fixtures/spielplatz_demo/) are evaluated inputs; automated browser evidence is recorded above. Writer/developer answers and friction notes remain pending.

#### F8 — Human/AI co-edit and merge safety

- [ ] Have a human edit dialogue while AI edits an unrelated resource/rule; then simulate same-entity edits and a referenced-ID rename. **Blocked:** the two-branch browser smoke used automated UI edits, not an actual human participant.
- [x] Validate, diff, and merge outputs; confirm separate-entity changes merge, same-entity conflicts are explicit, and renames update references or provide a complete block report. **Evidence:** `tests/coedit-merge.test.cjs` and app tests cover non-overlapping merge, same-field conflict blocking, entity/story ID rename reports, and manifest structure blocks; two-browser Chromium smoke exported both branches, merged locale/resource edits, and verified the merged package validates.
- **Evidence:** automated outcomes are recorded above; human co-edit review remains pending.

#### F9 — Legacy migration boundary

- [x] Inventory code branches keyed to content IDs and map each to an extracted rule or intentionally retained mechanic capability.
- [x] Run the same fixture and selected legacy traces through old/new paths.
- [ ] Confirm every migrated branch has a JSON representation and parity evidence; classify remaining ID-specific code as an intentional mechanic, not hidden content authoring.
- **Evidence:** Step 1 — `game/docs/lichtwald_content_inspector 2/F9_LEGACY_BRANCH_MAPPING.md` maps every `unlock_controller.gd` branch to (a) extracted JSON rule / (b) retained mechanic / (c) deferred. Vocabulary decision: `event.record` implemented in both engines (Godot `event_engine.gd` + Node `f4-f6-runtime.test.cjs`), tested (Node 73/73, F2 PASS 0 script errors). No new trigger types or `unlock` targetTypes needed for the first story. Step 2 — `tests/godot_f2/f9_parity.gd` runs identical recorded inputs (resource-threshold + conversation-choice, the two (a) patterns) through a legacy-semantics reference model and the new JSON engine, asserting identical observable state (producers, flags, recorded) and idempotent replay: **F9 PARITY PASS (14 checks)**. Step 3 (per-branch confirmation + PE-04 deletion) pending.

**Feasibility exit:** F0–F9 results support the JSON file boundaries, reference model, condition/effect vocabulary, graph/event separation, and minimum editor flow. Only then commit to the production schema and workbench design. A failed gate is useful evidence and should change the design before scaling up.

### 5.8 Human/AI authoring workflow

The editor should be the shared review surface, not a second source of truth:

1. A human edits entities in the standalone workbench or edits the package JSON directly; an AI can work directly against those same JSON files. Both use the same schema and stable IDs.
2. The workbench/validator parses the change and shows validation, a semantic diff, affected references, and the updated story/dependency graphs.
3. The editor explains changes in flow terms, for example: "This choice now spends 2 Lichttropfen, raises Juan's relationship by 1, and unlocks conversation X when condition Y passes."
4. The author inspects the affected path and can simulate it against a selected state snapshot; the event/rule trace shows which rules fired and why.
5. A human approves and exports the valid package. Invalid or conflicting output never replaces the last valid package.

AI may propose complete story graphs or focused edits, but it should not directly mutate save files, execute scripts, or silently change unrelated entities. The same validator, simulation, and review flow applies whether the edit came from a person, an AI, or the graphical controls. Package generation and basic validation should not require a Godot process; a future CLI/API or simulation runner can extend the standalone workflow.

## 6. Proposed versioned JSON content contract

### 6.1 Shared rules for the three exports

Recommended package shape: a small folder of focused JSON files, rather than one enormous document or one file per trivial field:

```text
game/content/lichtwald/
  manifest.json
  combat.json
  locations.json
  resources.json
  rules.json
  stories/
    story_spielplatz.json
  npcs/
    juan.json
    lichtkatze.json
  locales/
    de.json
    en.json
  assets.json
```

`manifest.json` lists the package version and files. Location/resource catalogs and story/NPC documents share one schema version and are validated/loaded as a package so references cannot drift. Exact file granularity can change after the editor prototype; the requirement is readable domain-sized files with stable references.

Shared contract:

- Every entity has a stable, case-sensitive `id`; display names are text, never identifiers.
- Player-facing strings have one canonical source in `locales/<language>.json`; entities refer to stable `textKey` values. The workbench resolves those keys for editing/preview, and validation fails on missing keys. Do not duplicate authored strings inside entity JSON or retain a competing localization CSV after a domain is migrated.
- `assets.json` is authoritative for each visual asset's `status`, path, provenance/license metadata, and `artBrief`. A placeholder must have a useful brief and no ready-file path; a ready asset must resolve to a file and have provenance/license metadata.
- Every resource icon, location background, story/dialogue panel, NPC portrait, and visible enemy/encounter image must resolve to an asset record. The JSON snippets below are partial illustrations, not complete packages or proof that those references already exist.
- Conditions are structured JSON expressions, not human-readable strings that the runtime cannot validate.
- Effects are typed, allow-listed operations, not script snippets or arbitrary GDScript.
- References point to resource/NPC/story IDs; references to missing IDs fail validation.
- `source`/provenance is export metadata, not game state.
- Locale files contain a `locale` and a `strings` map, for example `locales/de.json`; an entity stores only the key. A missing referenced key is a validation error, not a blank-text fallback.

```json
{
  "schemaVersion": 1,
  "packId": "lichtwald",
  "locale": "de",
  "strings": {
    "story_spielplatz.title": "Der Spielplatz",
    "story_spielplatz.opening.caption": "Am Rand des Waldes liegt ein alter Spielplatz."
  }
}
```

```json
{
  "schemaVersion": 1,
  "packId": "lichtwald",
  "assets": [
    {
      "id": "resource_lichttropfen",
      "type": "image",
      "status": "placeholder",
      "artBrief": "A small warm drop of light, clear silhouette at icon size."
    }
  ]
}
```

- Import first performs schema validation, reference validation, semantic diff, and dry run. Applying changes requires an explicit action and a recoverable backup.
- JSON is the intended canonical authoring source. Godot may construct typed in-memory objects from it, but `.tres` and JSON must not remain competing editable sources for the same content.
- The legacy `.tres` catalog is a migration input/reference. Once a JSON domain is cut over, the runtime must load that domain from its JSON package and old content instances must not silently override it.

Illustrative condition and effect forms:

```json
{
  "all": [
    { "path": "resources.lichttropfen", "op": "gte", "value": 5 },
    { "path": "flags.cat_intro_seen", "op": "eq", "value": true }
  ]
}
```

```json
[
  { "op": "resource.add", "resourceId": "lichttropfen", "amount": 2 },
  { "op": "relationship.adjust", "characterId": "juan", "amount": 1 },
  { "op": "unlock", "targetType": "storyNode", "targetId": "after_playground" }
]
```

The exact operation vocabulary and numeric bounds are design decisions for the schema phase. The importer/runtime must reject unknown operations; AI must not emit executable code.

### 6.2 Story and progression JSON

The story is a graph, not a fixed `MissionData` record with a separate screen. Nodes represent presentation or interaction; transitions define how play advances. A story may span locations and sessions, and a story node may call a conversation or world action.

`locations.json` owns the stable location identity, localized name key, and scene/background asset reference. Story nodes point to a location ID; the referenced asset catalog entry owns the illustration brief/status and the location may later hold child-safe interaction/presentation metadata.

```json
{
  "schemaVersion": 1,
  "packId": "lichtwald",
  "locations": [
    {
      "id": "lichtwald_spielplatz",
      "nameKey": "location.lichtwald_spielplatz.name",
      "backgroundAssetId": "location_spielplatz_background"
    }
  ]
}
```

```json
{
  "schemaVersion": 1,
  "packId": "lichtwald",
  "story": {
    "id": "story_spielplatz",
    "titleKey": "story_spielplatz.title",
    "startNodeId": "opening",
    "nodes": [
      {
        "id": "opening",
        "type": "storyBeat",
        "locationId": "lichtwald_spielplatz",
        "captionKey": "story_spielplatz.opening.caption",
        "illustration": { "assetId": "story_spielplatz_opening" },
        "transitions": [{ "id": "continue", "to": "talk_to_juan" }]
      },
      {
        "id": "talk_to_juan",
        "type": "conversation",
        "conversationId": "juan_playground",
        "illustration": { "assetId": "story_spielplatz_talk_to_juan" },
        "transitions": [{ "id": "after_conversation", "to": "repair_choice" }]
      },
      {
        "id": "repair_choice",
        "type": "decision",
        "promptKey": "story_spielplatz.repair_choice.prompt",
        "illustration": { "assetId": "story_spielplatz_repair_choice" },
        "choices": [
          {
            "id": "build_ramp",
            "labelKey": "story_spielplatz.repair_choice.build_ramp.label",
            "when": {
              "all": [
                { "path": "resources.lichttropfen", "op": "gte", "value": 5 }
              ]
            },
            "effects": [
              { "op": "resource.spend", "resourceId": "lichttropfen", "amount": 5 }
            ],
            "to": "inclusive_outcome"
          }
        ]
      },
      {
        "id": "inclusive_outcome",
        "type": "outcome",
        "captionKey": "story_spielplatz.inclusive_outcome.caption",
        "illustration": { "assetId": "story_spielplatz_inclusive_outcome" },
        "effects": [
          { "op": "relationship.adjust", "characterId": "juan", "amount": 1 }
        ],
        "transitions": []
      }
    ]
  }
}
```

The sample is a shape illustration, not approved story text, resource balance, relationship math, or node count. The schema must support explicit triggers, conditional branches, multiple outcomes, reusable locations/conversations, and resumable progress without embedding the rules in a scene script.

### 6.3 Resource catalogue and dependency JSON

Model resource definitions separately from actions that produce/consume them. This avoids confusing "a resource type" with "a button/generator that produces it."

```json
{
  "schemaVersion": 1,
  "packId": "lichtwald",
  "resources": [
    {
      "id": "lichttropfen",
      "kind": "stock",
      "displayNameKey": "resource.lichttropfen.name",
      "iconAssetId": "resource_lichttropfen",
      "initialAmount": 0,
      "bounds": { "min": 0 }
    }
  ],
  "producers": [
    {
      "id": "gather_lichttropfen",
      "kind": "playerAction",
      "outputs": { "lichttropfen": 1 },
      "costs": {},
      "cooldownSeconds": 0,
      "maxUses": null,
      "availableWhen": { "all": [] }
    }
  ],
  "recipes": [],
  "workerRoles": [],
  "workerRoles": []
}
```

Rules stay in the shared `rules.json`, with their resource and producer references checked against the package:

```json
{
  "schemaVersion": 1,
  "packId": "lichtwald",
  "rules": [
    {
      "id": "unlock_forest_path",
      "trigger": { "event": "resource.totalAtLeast", "resourceId": "lichttropfen", "value": 3 },
      "when": { "all": [] },
      "effects": [
        { "op": "unlock", "targetType": "producer", "targetId": "gather_forest" }
      ]
    }
  ]
}
```

The final schema should express all observed production methods, costs, recipes/conversions, worker upkeep, random output, caps, scaling, and prerequisites. A resource report should answer, for every ID: where it comes from, what consumes it, which rule gates it, what it unlocks, and whether it is reachable. These JSON entities configure the existing mechanics; they do not imply replacing the resource/worker loop.

### 6.4 NPC and conversation JSON

Keep character identity/relationships, conversation graphs, triggers, inputs, and consequences explicit. Conversations are reusable from the story graph or triggered by world-state rules.

```json
{
  "schemaVersion": 1,
  "packId": "lichtwald",
  "npcs": [
    {
      "id": "juan",
      "displayNameKey": "npc.juan.name",
      "portraitAssetId": "portrait_juan",
      "initialRelationship": 0
    }
  ],
  "conversations": [
    {
      "id": "juan_playground",
      "npcId": "juan",
      "entryCondition": {
        "all": [
          { "path": "story.visited.opening", "op": "eq", "value": true }
        ]
      },
      "startNodeId": "wish",
      "nodes": [
        {
          "id": "wish",
          "type": "line",
          "speakerId": "juan",
          "textKey": "conversation.juan_playground.wish.text",
          "illustration": { "assetId": "juan_playground_wish" },
          "choices": [
            {
              "id": "listen",
              "labelKey": "conversation.juan_playground.wish.listen.label",
              "effects": [
                { "op": "relationship.adjust", "characterId": "juan", "amount": 1 }
              ],
              "to": "thanks"
            }
          ]
        },
        {
          "id": "thanks",
          "type": "line",
          "speakerId": "juan",
          "textKey": "conversation.juan_playground.thanks.text",
          "illustration": { "assetId": "juan_playground_thanks" },
          "choices": []
        }
      ]
    }
  ]
}
```

The final schema must support non-interactive lines, any agreed number of choices, conditional availability, repeated/re-entered conversations, remembered input, effects, and follow-up story transitions. NPC effects must use the same shared condition/effect vocabulary as the main story and resource rules.

### 6.5 Combat content and encounter contract

Fighting and the good-versus-evil conflict remain part of the game. Keep combat resolution and feedback in the registered generic game capability; `combat.json` authors the enemy/encounter identity, presentation, entry condition, allowed combat profile, and resulting typed effects. An encounter can reference only registered enemies and supported combat profiles. It cannot provide scripts or arbitrary runtime parameters.

Enemy and encounter content must be child-adapted: clear readable stakes, non-graphic art, understandable feedback, and recoverable outcomes. Every visible opponent has an image reference whose asset record includes a child-appropriate art brief or completed approved asset. The first story need not contain a fight, but the JSON model and later parity work must not remove or bypass the existing fighting path.

## 7. Shared game state and effect contract

Before creating more story content, define one versioned runtime state contract. It should distinguish:

- **Content definitions:** story, locations, NPCs, dialogue, resources, producers, recipes, rules, assets, and localization.
- **Per-save state:** resource amounts, completed/current story nodes, flags, unlocked content, relationships, seen dialogue, prior choices, and the encounter/combat progression needed by the preserved fighting capability.
- **Derived state:** controls/entries that are currently available because conditions pass; derive or cache them consistently rather than treating UI visibility as the source of truth.

Every choice/action resolves in one ordered transaction:

1. Check the node/choice condition against the same authoritative state.
2. Apply validated, typed effects once.
3. Record the choice/event and resulting story position.
4. Recompute newly available NPC conversations/actions/unlocks.
5. Save through the shared save contract.
6. Render the new diary/world state from saved state.

Effects need stable action/event keys so reloads, retries, or duplicate input cannot apply a resource or relationship effect twice. Do not carry `mission_state` forward as a second parallel state model by default; map its useful content into the agreed shared state or retire it during a deliberate migration.

## 8. Removal and preservation policy

1. Preserve the current branch/history, old plans, mission implementation, tests, data resources, translations, and source story material. They are evidence and recovery points, not approval to keep legacy content in the final game.
2. Keep the established gameplay loop and event-driven integration as the default. Do not rewrite generic mechanisms merely to make them look more data-driven.
3. Replace dark-forest content definitions and move content-specific branches/effects into JSON rules after the editor can represent them and tests show equivalent behavior.
4. Remove legacy content from the shipped package only after a reference check, save migration decision, and a clean Lichtwald path through the existing game.
5. Do not leave both the old dark-forest content and new story as independently playable modes unless the user explicitly chooses that.
6. Preserve attribution and licensing records for any code or assets retained.
7. Do not ship an asset whose provenance, license, or child-appropriateness is unverified. Keep it as migration evidence until it is cleared or replaced; this is a release hold, not a claim that rights have been resolved.

## 9. Implementation phases and stop gates

This plan does not itself execute later phases. Each phase starts only after the preceding gate has recorded its exit evidence and the applicable decisions are current.

### Phase A — Freeze and map the current implementation

- [x] **PA-01** Make no game code/data changes during the baseline.
- [x] **PA-02** Confirm source revision and commits; record runtime entry paths and save behavior.
- [x] **PA-03** Produce a repeatable, read-only inventory of content resources, localization rows, scene references, controller rules, and save fields; record static-analysis limits and unresolved evidence rather than inferring behavior.
- [x] **PA-04** Classify each item: preserve-capability, move-to-JSON, replace-content, remove, or explicitly held pending evidence.
- [x] **PA-05** Complete F0: representative resource, unlock, NPC-choice, and save/reload trace.

**PA-03/04 work breakdown**

- [x] **PA-03a** Count and characterize the seven primary content families, the additional `CostFunction` resources, and localization rows. **Evidence:** §3.3.
- [x] **PA-03b1** Enumerate the IDs in all seven typed families plus `CostFunction`, and compare filename keys with authored IDs. **Evidence:** loaded ID census in §3.3; duplicate `WorkerRole.id="explorer"` is separately recorded.
- [x] **PA-03b2** Check typed resource costs, random drops, worker costs/outputs/consumption, substance prerequisites, NPC next-node edges, and enemy next IDs. **Evidence:** 150 loaded reference edges were checked; 149 resolve, and the sole unresolved edge is `tailor` producing the undeclared resource `rope` (§§3.5–3.6).
- [x] **PA-03b3** Map source-defined unlock/event/NPC effects to exact IDs and classify static story-node reachability. **Evidence:** exact `UnlockController` threshold/effect matrix in §3.6 and NPC entry/reachability map in §3.4; runtime-composed IDs and per-branch playthrough execution are explicitly outside this static classification.
- [x] **PA-03b3a** Check static literal resource-path closure from the configured main scene and autoloads. **Evidence:** 223 scene/script/resource files and no missing literal paths; static scan limits are documented in §3.1.
- [x] **PA-03b3b** Map directory-loaded entities, dynamic paths, code effects, and runtime conditions to active reachability. **Evidence:** `Resources` directory-scans all seven typed families and recursively loads image keys; runtime IDs are enumerated in §3.3, dynamic locale families are joined there, and composed `user://` paths are save data rather than game-content loads. The remaining full-playthrough limits are explicit in §§3.1, 3.4, and 3.6.
- [x] **PA-03b** Complete the cross-domain inventory across typed entities, localization/assets, code rules, and active scene/save reachability. **Evidence:** completed PA-03b1/b2/b3/b3a/b3b; runtime-execution limits remain identified and do not obscure the static source map.
- [x] **PA-03c1** Audit the CSV shape, duplicate/deprecated/empty markers, typed-ID joins, and direct locale callsites for resource, worker, substance, event, NPC, tab, enemy, and UI categories. **Evidence:** full typed-ID and literal caller join in §3.3; missing and orphan keys are recorded.
- [x] **PA-03c1a** Validate dynamic locale families for tabs, NPC hover/click, settings scales, and rebirth copy. **Evidence:** tab keys, `cat` hover/click, all 19 scale values, and 22 rebirth keys are enumerated in §3.3; the 11 empty rebirth first-line rows are identified.
- [x] **PA-03c2** Check explicit `SubstanceData` and `EnemyData` image/icon IDs against the runtime image catalog. **Evidence:** Godot project-scene check resolves 5/59; 54 references do not resolve (§3.3), correcting the earlier count.
- [x] **PA-03c3** Inventory the asset catalog and scene-bound art/audio references; classify missing, unused, placeholder, and repository-recorded license/attribution states. **Evidence:** §3.3 records eight image PNGs/keys, two flags, one font payload, 50 audio files, 49/50 static audio references, the unreferenced audio file, the non-silent WAV, and specific provenance/license conflicts; unresolved source/legal approval is not presented as verified.
- [x] **PA-03c3a** Count source image/audio/font/flag files and compare literal scene/config paths with the source catalog. **Evidence:** eight image PNGs and all eight literal image paths resolve; two flag PNGs have no static reference; one Noto Sans font payload plus OFL text is present; 50 audio files include 49 resolving static references; see §3.3.
- [x] **PA-03c3b** Reconcile repository provenance/license records and record conflicts or unverified claims without implying legal approval. **Evidence:** image placeholder provenance, Noto Sans OFL, the unreceived Indie Friendly Sounds official license, non-silent WAV, broad third-party/asset-strip claims, and legacy credit text are cross-referenced in §3.3; actual per-file rights clearance remains a later release/disposition gate.
- [x] **PA-03c3c** Check the asset-strip's audio “unused” claims against active scene wiring, maps, and callers. **Evidence:** contradicted, active, preload-only, and no-static-caller cases are separated in §3.3; no audio assets were changed.
- [x] **PA-03c** Complete the static localization/asset join across loaded content and active scenes. **Evidence:** typed-ID and direct-literal locale joins, dynamic locale families, and directory-loaded image/audio catalogs are recorded in §3.3; missing/orphan keys, missing image refs, unreferenced media, and unresolved license/disposition questions are explicit.
- [x] **PA-03d** Record the active project entry, major shared save-state domains, and source-level families of hard-coded rules. **Evidence:** §§3.1–3.2 and §3.6.
- [x] **PA-03d1** Review controller-specific content coupling outside `UnlockController`, separating generic runtime capability from ID-based modifiers and effects. **Evidence:** source-backed family table in §3.6; exact per-branch reachability remains tracked by PA-03b3.
- [x] **PA-04a** Record family-level dispositions without conflating authored content with runtime capability. **Evidence:** §3.3 and §3.6.
- [x] **PA-04b1** Apply each family disposition to every explicitly enumerated typed ID and record known exceptions. **Evidence:** the §3.3 census assigns the family default to every listed ID; duplicate `explorer`, dangling `tailor` → `rope`, fixed-tab capabilities, inactive NPC nodes, and replacement/adaptation of enemy content are explicit exceptions.
- [x] **PA-04b** Assign a disposition to every individual legacy entity/content instance and its referenced localization/assets. **Evidence:** PA-04b1 applies a documented family default to each enumerated ID; PA-04b2 records its static locale/asset joins; PA-04b3 records exceptions and hold rules. No legacy content is approved for the new package merely by being inventoried.
- [x] **PA-04b2** Join each enumerated entity ID to its localization and image/audio references; classify known references as present, missing, extra, placeholder, unreferenced, or unverified. **Evidence:** typed-key, direct-caller, and image/audio joins, including the 27 missing image keys, are recorded in §3.3.
- [x] **PA-04b3** Assign final per-instance dispositions and resolve or explicitly hold the duplicate `explorer` role, dangling `tailor` → `rope`, tab classification, NPC terminal/effect-only choices, and legacy enemy/NPC content. **Evidence:** family defaults and exceptions are source-anchored in §§3.3–3.6. The duplicate role and dangling output are held out of JSON until corrected with evidence; tabs remain registered UI capabilities; inactive/empty NPC nodes are not migrated without an observed intended path; legacy characters/opponents are replaced or child-adapted while generic combat is preserved.
- [x] **PA-04c1** Check the asset-strip's explicit audio removal/unused claims against the present project. **Evidence:** §3.3 records active consumers, preload-only status, and files with no static caller. Static evidence does not establish rights or all dynamic uses, so no audio removal is approved by this check.
- [x] **PA-04c2** Check prior scene/template/language-picker removal claims against the active project tree. **Evidence:** `template/` and `scenes/bullet_up_hell/` are live dependencies; language-selection scenes, BulletUpHell examples, and temporary files are absent; the separate mission route is tracked for integration/retirement in §3.6.
- [x] **PA-04c3** Check proposed typed-data reductions against active lookups and legacy save fields before any catalog removal. **Evidence:** all seven catalogs remain loaded and data-to-data references are inventoried; the legacy save fields are recorded in §3.2. No catalog reduction is authorized before JSON parity; existing legacy saves remain preserved and are not silently imported into the restarted game.
- [x] **PA-04c4** Classify remaining image, font, locale, flag, and non-audio asset removal proposals from available static evidence; hold unresolved dynamic-use, attribution, licensing, or suitability cases. **Evidence:** §3.3 records counts, static path closure, image-reference gaps, and provenance conflicts. Assets without verified provenance/license or child-suitability are excluded from the new package; this inventory does not constitute legal clearance.
- [x] **PA-04c** Review and classify proposed removals against active scene reachability, callers, save policy, and recorded attribution/licensing; list unresolved exceptions explicitly as holds. **Evidence:** PA-04c1–c4 and §§3.3–3.6; static or legal uncertainties block removal, and no physical content or code removal is authorized by this baseline.  

**Gate:** every inventoried entity family, content rule family, and hard-coded branch has a source reference and default disposition; exceptions and evidence holds are explicit. No broad game redesign is proposed.  
**Evidence:** baseline identity, startup, controlled F0 runtime replay, typed-ID census, 150-edge dependency check, source-anchored controller map, static NPC reachability, localization joins, and asset/provenance census are recorded above. The inventory gate is complete; runtime parity, legal clearance, and actual migration/removal remain later gates.

### Phase B — Run JSON, graph, event, and state feasibility tests

- [x] **PB-01** Complete F1–F6 in order using only the small fixture and throwaway prototypes. **Evidence:** F1 package-contract checks, F2 Godot round-trip, F3 reference graph, F4 event rules, F5 trace/parity, and F6 story-resume all pass (see §5.7). The F1 *unfamiliar-human* editor-usability review remains an open human gate in §5.7 (and Phase C PC-01b) and does not block the automated F1–F6 gate.
- [x] **PB-02** Record and resolve design changes to file boundaries, references, condition/effect DSL, event ordering, and story-run state exposed by tests. **Evidence:** decisions PB-02a–g recorded below (2026-11-06).
- [ ] **PB-03** Keep tests isolated: do not migrate production content or delete existing code.

#### PB-02 decisions (recorded 2026-11-06)

- **PB-02a — File boundaries (confirmed).** The 9-file manifest layout is the package contract: `locations.json`, `resources.json`, `rules.json`, `combat.json`, `assets.json`, `stories/*.json`, `npcs/*.json`, `locales/*.json`. Each domain file is the single editable source for its domain; after migration there is no parallel `.tres` source for the same domain.
- **PB-02b — Condition DSL (canonical op set).** `eq, ne, gt, gte, lt, lte, exists, not`. The canonical spelling is **`ne`** (matches the F4 runtime and §6); the workbench `schema.js` allow-list currently lists `neq`, which is a bug to reconcile to `ne`. `exists` and `not` are structural ops present in the workbench/contract; the F4 prototype exercised the six comparison ops and the loader must accept all eight.
- **PB-02c — Effect DSL (canonical op set).** `resource.add, resource.spend, relationship.adjust, unlock, flag.set, event.record, combat.request`. Both `event.record` (workbench/§6) and `combat.request` (F4 runtime) are valid; the canonical allow-list is their union of seven ops. The workbench `schema.js` `ALLOWED_EFFECTS` is missing `combat.request` and must add it.
- **PB-02d — Float→int canonicalization (F2 rule).** Godot JSON parse/serialize can turn integral numbers into floats. Loader rule: safe integral floats (e.g. `2.0`) canonicalize to integers (`2`); non-integral values for integer-typed fields are rejected with a path-specific diagnostic.
- **PB-02e — Event ordering / signal reconciliation.** The F5 prototype ordering is explicit: resource state is updated before rule evaluation, rules run in JSON array order, and later rules observe earlier effects. Legacy F0 emitted unlock/event signals *before* its `resource_updated` observation. This ordering difference is a **required reconciliation item before production migration (Phase E)**; it does not block the Phase D loader.
- **PB-02f — Story-run state (F6).** A compact per-story state machine is sufficient: current story/dialogue node, pending input, visit history, applied outcome IDs, and input IDs. No workflow engine is justified by the evidence.
- **PB-02g — Text-key + asset convention.** Canonical entity fields use locale text keys (`nameKey`, `displayNameKey`, `captionKey`, `titleKey`) resolved through `locales/*.json`, plus explicit asset references (`iconAssetId`, `portraitAssetId`, `illustration.assetId`). The workbench `createEmptyEntity` templates currently emit inline `displayName: {de,en}` objects, which is a mismatch to reconcile to the text-key convention (PD-01).

**Gate:** JSON round-trips safely; references build the intended cross-domain graph; event rules reproduce the selected legacy trace; a branched story resumes and applies effects once.  
**Evidence:** F1–F6 fixture and test results in §5.7 (all automated checks pass); PB-02a–g decisions recorded above. PB-03 (test isolation) is standing policy; the F1 unfamiliar-human edit gate remains open in §5.7, and F7/F8 human gates are tracked in Phase C (PC-01b).

### Phase C — Complete and evaluate the standalone graphical JSON authoring workbench

- [/] **PC-01** Run F7 and F8 against the existing standalone prototype and `fixtures/spielplatz_demo/`.
  - [x] **PC-01a** Exercise graph, preview, event-rule, and co-edit surfaces in the browser against the fixture. Evidence: Chromium confirmed the gated `build_path` choice at 0/1 Light Drops, direct/triggered effect display, event-rule filtering/selection, and a validated two-branch merge; all browser runs reported no page errors.
  - [ ] **PC-01b** Have an unfamiliar writer and developer independently answer the F7 comprehension questions and complete the F8 co-edit walkthrough; record their answers and friction. **Blocked:** actual human review cannot be inferred from automated browser interaction; use the walkthrough in `STANDALONE_WORKBENCH.md`.
- [ ] **PC-02** Record decisions for the entity model and human editing flow based on test evidence; DEC-Workbench is already accepted.
- [x] **PC-03** Complete the standalone graph, table, inspector, and raw-JSON views for locations, stories, resources, NPCs, encounters, assets/locales, and shared rules; build on the current prototype rather than restarting it.
  - [x] **PC-03a** Load every manifest-listed JSON file atomically and retain all fixture domains for editing/export. Evidence: `node --test "tests/package-loader.test.cjs"` passes 3/3 loader checks; browser smoke loaded all 9 manifest documents and reported the story/resource/NPC counts.
  - [x] **PC-03b** Browse and raw-edit location, combat, asset, and locale entities without losing their original file paths. Evidence: `node --test "tests/app-entity-edit.test.cjs"` passes 18/18 checks for raw-edit write-back, stable IDs, and entity table coverage; browser smoke loaded the F1 fixture and listed 1 location, 4 resource/producer/recipe entries, 2 NPC/conversation entries, 2 combat entities, 13 assets, and 46 locale strings. A location edit applied in the UI, and the original document paths remained in `manifest.files`.
  - [x] **PC-03c** Extend graphs and package validation to cover the same cross-domain references as the F1 fixture. Evidence: `node --test "tests/workbench-validation-graph.test.cjs"` passes 4/4 checks for a valid F1 package, dangling/duplicate references, dialogue targets, deterministic graph edges, and provenance; browser validation displays the full domain summary with 0 errors.
  - [x] **PC-03d** Add dynamic entity tables for every domain, with row selection synchronized to the inspector and Raw JSON views. Evidence: Chromium verified all 4 resource/producer/recipe rows, all 46 locale strings, and table-row selection updating the inspector without browser errors.
  - [x] **PC-03e** Add a readable event-rule matrix showing each rule's trigger, condition, and effects; support filtering and inspector selection. Evidence: `node --test "tests/app-entity-edit.test.cjs"` covers fixture rule summaries/filtering; Chromium verified both rules, filtered Juan's rule, and opened the selected rule in the inspector without browser errors.
- [x] **PC-04** Load/create packages, support graph/entity edits, validation, safe multi-file export, workbench preview, and co-edit review.
  - [x] **PC-04a** Export and reopen manifest-backed JSON bundles; reject incomplete/unsafe bundles before replacing the current package. Evidence: `node --test "tests/package-loader.test.cjs" "tests/app-entity-edit.test.cjs"` verifies lossless round-trip, bad-bundle rejection, and no partial replacement.
  - [x] **PC-04b** Export all package files into a newly created folder without overwriting existing output; block invalid packages and retain dirty state on failure. Evidence: `node --test "tests/app-entity-edit.test.cjs"` verifies nested file layout, unique folder selection, and validation blocking using a File System Access API test double.
  - [x] **PC-04c** Add a workbench content preview for story/dialogue panels, choices, conditions, and effects; use it to answer F7 review questions. Evidence: headless Chromium rendered localized comic text/art briefs, linked Juan dialogue and triggered relationship effects, then showed `build_path` locked at 0 Light Drops and available at 1 without mutating package data.
  - [x] **PC-04d** Verify browser bundle and folder export/reopen behavior against the browser surface and record evidence. Evidence: headless Chromium loaded the F1 folder, verified location/combat/asset/locale tabs, validated the package, reopened a bundle through the file input, and exercised folder export through a File System Access API handle double. The native OS directory picker/permission prompt remains an environment-specific manual check.
  - [x] **PC-04e** Add lineage-aware three-way co-edit review; merge separate stable-ID entity edits, block same-field conflicts and possible ID renames with known reference paths, and validate before explicit apply. Evidence: `tests/coedit-merge.test.cjs`, package fingerprint tests, app-level branch merge/conflict tests, and Chromium merge/rename-conflict smoke all pass.
- [ ] **PC-05** Provide a read-only legacy-source adapter for comparison with current `.tres`/CSV/code behavior, if needed to pass the workbench gate.
- [x] **PC-06** Verify the exported package layout and validation contract against the future Godot loader boundary; do not require Phase D gameplay loading to pass Phase C. **Evidence:** `tests/workbench-godot-export.test.cjs` creates/reopens a workbench bundle, writes its manifest-listed documents to a temporary package folder, and runs the F2 Godot loader/round-trip contract against that exported folder; Godot reports `F2 PASS`.

**Gate:** a human or AI can create/edit a location, small story, resource action, and NPC conversation in the standalone tool or JSON; cross-links and basic graphs are visible; locale/asset references validate; the package exports and reopens without loss; exported files are structurally ready for Phase D. No legacy gameplay rule has been removed yet.  
**Evidence:** [`web/js/package_loader.js`](./game/docs/lichtwald_content_inspector%202/web/js/package_loader.js) loads and retains all manifest-listed JSON domains and supports validated bundle round-trip; [`tests/package-loader.test.cjs`](./game/docs/lichtwald_content_inspector%202/tests/package-loader.test.cjs) covers missing/unsafe files, export/reopen, and shared-base fingerprints. [`web/js/app.js`](./game/docs/lichtwald_content_inspector%202/web/js/app.js) exposes every fixture domain through entity lists, dynamic tables, event-rule matrix, read-only inspector, raw editing, manifest-backed creation, preview, and co-edit review; [`tests/app-entity-edit.test.cjs`](./game/docs/lichtwald_content_inspector%202/tests/app-entity-edit.test.cjs) verifies write-back, stable IDs, create/reopen, table/event-rule views, validation-gated import/export, preview conditions, and merge preparation/blocking. [`web/js/merge.js`](./game/docs/lichtwald_content_inspector%202/web/js/merge.js) and [`tests/coedit-merge.test.cjs`](./game/docs/lichtwald_content_inspector%202/tests/coedit-merge.test.cjs) cover three-way non-overlapping merge, same-field conflicts, package-structure changes, and ID rename/reference reports. [`tests/workbench-godot-export.test.cjs`](./game/docs/lichtwald_content_inspector%202/tests/workbench-godot-export.test.cjs) verifies that a reopened workbench bundle's folder layout passes the Godot F2 loader and round-trip. Headless Chromium confirms fixture domain counts, package validation, bundle/folder workflows, localized story/dialogue rendering, gated choice behavior, event-rule filtering, 4 resource table rows, 46 locale table rows, inspector selection, two-browser co-edit merge, and ID-rename blocking. The complete workbench test suite passes 71/71 (as of PD-01b), and `git diff --check` passes. [`web/js/validator.js`](./game/docs/lichtwald_content_inspector%202/web/js/validator.js) and [`web/js/graph.js`](./game/docs/lichtwald_content_inspector%202/web/js/graph.js) cover the F1 cross-domain references; [`tests/workbench-validation-graph.test.cjs`](./game/docs/lichtwald_content_inspector%202/tests/workbench-validation-graph.test.cjs) passes 4/4 checks. Human F7/F8 review, native directory-picker permissions, and the standalone workbench gate remain open.

### Phase D — Finalize JSON as the content source and load it generically

- [x] **PD-01** Finalize schema versioning, IDs, localization/assets, shared condition/effect DSL, state references, migrations, and package validation.
  - [x] **PD-01a** Reconcile workbench vocabulary drift with the canonical PB-02 decisions: `ALLOWED_OPS` now uses `ne` (no `neq`), `ALLOWED_EFFECTS` covers all 7 PB-02c ops including `combat.request`, and `createEmptyEntity` templates emit text keys + asset references (never inline locale objects). `onNewEntity` registers the template's locale strings and placeholder assets via `entityTemplateRequirements` so new entities validate immediately. Evidence: `node --test tests/` passes 68/68, including new `tests/schema-vocabulary.test.cjs` (allow-lists equal the canonical PB-02b/PB-02c sets; all four entity templates validate in a minimal package) and `app-entity-edit.test.cjs` end-to-end checks that created story/NPC/resource entities register de/en strings and placeholder assets and stay validation-clean.
  - [x] **PD-01b** Reconcile the state-reference / condition-DSL contract between the workbench preview and the F4 runtime prototype. New shared module `web/js/condition_dsl.js` (UMD: `window.ConditionDsl` / `module.exports`) is the single source of truth for the canonical operator set (`eq, ne, gt, gte, lt, lte, exists`), the allow-listed state-path grammar (`resources.*`, `relationships.*`, `flags.*`, `story.visited.*`, `unlocks.{recipes|producers|combatEncounters}.*`), and the comparison semantics. `exists` is a structural operator: it validates the path (allow-list + registration) without requiring the field to be present and takes no `value`. The F4 runtime test now consumes the shared module (`readConditionPath`, `compareConditionValue`, `CONDITION_OPERATORS`, `validateConditionPath`, `conditionPathExists`) instead of local copies, so the two consumers cannot drift. The workbench preview gains the `unlocks.*` scope (registered via `state.resources.recipes`/`producers` and `state.combat.encounters`) and an `exists` case in `evaluatePreviewCondition`/`describePreviewCondition`, backed by a new `state.previewUnlocks` Set. Evidence: `node --test tests/` passes 71/71, including new `f4-f6-runtime.test.cjs` checks (`exists` on missing/present fields, `exists` leaf shape and allow-list/registration enforcement, `unlocks.recipes.make_lichttropfen` resolving false→true) and a new `app-entity-edit.test.cjs` preview check (registered/unregistered `unlocks.*` paths, `exists` known/unknown, `unlocks.unknownScope` rejected as unknown).
- [x] **PD-02** Make the Godot runtime load the same JSON package contract exported by the standalone workbench; JSON is the editable source of truth.
  - [x] **PD-02a** Add a Godot-side package-contract loader that mirrors the standalone workbench validator so the same JSON package is accepted by both. New `tests/godot_f2/package_loader.gd` is a faithful GDScript port of `web/js/validator.js`: it reads `manifest.json` + every manifest-listed file, assembles the package with the same story/NPC/locale keying as `web/js/package_loader.js`, builds the cross-domain ID catalogs, and runs the same structural + cross-domain reference checks (generic recursive `visitReferences` walk, text-key presence in every locale, unique authored IDs, allow-listed effect/condition ops). It exposes `load_package(dir) -> {ok, messages, catalog, documents}` and `canonicalize_numeric_types` for the PB-02d Godot float-widening round-trip. Evidence: `godot --headless --path tests/godot_f2 --script res://f2_round_trip.gd` passes F2 with 14 new assertions — the canonical `spielplatz_demo` fixture validates and registers the story `story_spielplatz`, NPC `juan`, conversation `juan_playground`, resources `holz`/`lichttropfen`, and combat `knotted_shadow`/`playground_shadow`; a deliberately broken temp package (recipe referencing unregistered resource `lichttropfen`, locale missing `resource.holz.name`) is rejected with both expected messages; integral floats (`initialAmount`, `bounds.min/max`) canonicalize to int while a non-integral float is preserved. Node suite still 71/71.
- [x] **PD-03** Keep generic event-driven mechanics intact; configure content-defined behavior from JSON.
  - [x] **PD-03a** Port the shared condition DSL to Godot so the runtime can evaluate JSON `when` conditions without a Node dependency. New `tests/godot_f2/condition_dsl.gd` is a faithful GDScript port of `web/js/condition_dsl.js` (PD-01b): canonical operator set (`eq, ne, gt, gte, lt, lte, exists`), the allow-listed state-path grammar (`resources.*`, `relationships.*`, `flags.*`, `story.visited.*`, `unlocks.{recipes|producers|combatEncounters}.*`), strict `read_condition_path`, structural `condition_path_exists`, and `compare_condition_value` with JS `===` number/boolean semantics. `package_loader.gd` gains a `storyNode` catalog set (all `story.nodes[].id`) so `story.visited.<nodeId>` validates against registered nodes, mirroring the Node `catalogFor().storyNodes`. Evidence: `godot --headless --path tests/godot_f2 --script res://f2_round_trip.gd` passes F2 (67 assertions), including 25 new DSL checks — allow-list/registration acceptance and rejection (unknown scope, unregistered ID, unknown unlock scope, non-string path), strict reads (present value, missing field, present-but-false unlock, absent unlock entry), `exists` presence semantics, all six comparison operators, numeric `2.0 == 2`, strict cross-type `eq`, and rejection of the non-canonical `neq` spelling. Node suite still 71/71.
  - [x] **PD-03b** Add the generic event-rule engine to Godot so JSON rules drive gameplay state without any content-specific code. New `tests/godot_f2/event_engine.gd` is a faithful GDScript port of the Node F4 runtime prototype (`f4-f6-runtime.test.cjs`): `initial_state` builds the runtime state data-driven from the package (resources from `initialAmount`, relationships from `initialRelationship`, flags derived from every `flag.set` effect, `story.visited` from registered story nodes, `unlocks` from registered recipes/producers/encounters); `dispatch_event` enforces the allow-listed event types (`resource.totalAtLeast` with the `state+delta === total` invariant, `conversation.choice`), deduplicates by stable `eventId` + canonicalized JSON fingerprint (same payload idempotent, reused ID with different payload rejected), evaluates rule triggers + `when` conditions via the PD-03a DSL, applies PB-02c effects in rule order with `once` semantics, and returns a full trace (`evaluations`, `firedRuleIds`, `orderedEffects`, `resultingState`). `package_loader.gd` now canonicalizes integral floats to ints at parse time (PB-02d root-cause fix, so strict `is int` effect checks work) and `load_package` returns the assembled package as `assembled`. Evidence: `godot --headless --path tests/godot_f2 --script res://f2_round_trip.gd` passes F2 (91 assertions), including 24 new engine checks — data-driven initial state, `resource.totalAtLeast` firing `unlock_playground_options` (recipe + combatEncounter unlock, flag set, delta applied, trace state), idempotent duplicate eventId, eventId reuse with different payload rejected, total/delta mismatch rejected, `conversation.choice` firing `juan_listened` (relationship +1, flag set, choice recorded), and a no-match event that applies its delta without firing rules. Node suite still 71/71.
- [x] **PD-04** Add development reload only after whole-package validation; invalid reload keeps the last valid package active.
  - Evidence (2026-07-21): `package_reloader.gd` — stateful dev reloader: `load(dir)` (initial) and `reload(dir)` (dev) both run the full `PackageLoader.load_package` validation gate; on success the new package/catalog becomes active (`reloaded: true`), on failure the last valid package stays active (`keptLastValid: true`, validation errors surfaced, active package untouched). F2 harness `_test_package_reloader()` (10 assertions): initial load activates, valid reload accepted, broken reload (recipe referencing unknown resource) rejected with `keptLastValid` and the error text surfaced, last valid package still served, recovery on next valid reload. F2 PASS (101 assertions, 0 script errors), Node 71/71.

**Gate:** the same package is accepted by the standalone workbench and loaded by the game; JSON values, visible entities, and gameplay behavior agree; no duplicate editable `.tres` source exists for migrated domains.  
**Evidence:** schema/version path + loader tests + workbench/game comparison: `tests/workbench-godot-compare.test.cjs` (new) runs the workbench validator (`web/js/validator.js` over `web/js/package_loader.js`) and the Godot F2 loader (`tests/godot_f2/package_loader.gd` via the new `--compare` mode of `f2_round_trip.gd`) against the same `spielplatz_demo` fixture and asserts both pass with zero errors and that the 7 summary `ok` messages (manifest, story/resource/NPC/location/combat/asset counts, structural pass) are textually identical — the two validators cannot drift on the shared contract. `tests/workbench-godot-export.test.cjs` already proves a workbench-exported folder loads through the Godot F2 round-trip. The Godot manifest is now canonicalized at parse time (PB-02d) so `schemaVersion` prints as int and matches the workbench. No `.tres`/`.tscn` files exist in `fixtures/` or `tests/godot_f2/` — JSON is the only editable content source for the migrated domains. F2 PASS (101 assertions, 0 script errors), Node suite 72/72.

### Phase E — Migrate scattered content-specific rules

- [ ] **PE-01** Move approved content-specific triggers, unlocks, dialogue consequences, resource effects, and encounter content from ID-specific branches into declarative JSON/capability data.
  - [x] **PE-01a** Port the validated JSON rule engine into the production project so the game runtime can load content packages. `game/global/engine/` now holds `condition_dsl.gd`, `event_engine.gd`, and `package_loader.gd` (byte-identical to the F2-validated versions except the one internal preload repointed to `res://global/engine/condition_dsl.gd`). Evidence: headless smoke script in the production project (`godot --headless --path . --script`) loads all three scripts, builds `initial_state` from a minimal package, and dispatches a `resource.totalAtLeast` event that fires a rule and sets a flag — `ENGINE SMOKE PASS`, 0 script errors.
- [ ] **PE-02** Keep the event bus and generic handlers; dispatch typed events to generic condition/effect handlers.
  - [x] **PE-02a** Bridge production SignalBus signals into the JSON rule engine. `game/global/engine/rule_bridge.gd` (new) connects `resource_updated` (amount > 0) and `npc_event_interacted` to the engine as `resource.totalAtLeast` / `conversation.choice` events, and translates engine effects back into production signals (`progress_button_unlock`, `manager_button_unlock`, `tab_unlock`, `event_triggered`, `resource_generated`) with the same one-shot SaveFile guards as `unlock_controller.gd`. Wired into `main.tscn` under `Controllers` (`rule_bridge.tscn`); it loads `res://content/active` in `_ready` when present, so current behavior is unchanged until a package is deployed. Evidence: `tests/test_rule_bridge.gd` (new, headless SceneTree test with the `tests/fixtures/bridge_test` package) — rule firing, engine state mutation, all four output signals, one-shot guards, and dedupe on re-emitted events: `RuleBridge tests passed`, 0 script errors; full project `--headless --quit` clean.
- [ ] **PE-03** Keep genuinely novel mechanics as small documented capabilities; JSON may configure them but may not run arbitrary code.
- [ ] **PE-04** Complete F9; compare old/new behavior on identical recorded inputs and save snapshots before deleting a legacy branch.

**Gate:** migrated content paths have behavior-parity evidence, idempotent effects, and no remaining content-specific code branch for those paths.  
**Evidence:** rule mapping + parity report + removed-branch references: `TBD`.

### Phase F — Replace legacy content and unify progression

- [ ] **PF-01** Create the Lichtwald JSON package with the workbench; author locations, resources, producers, NPCs, conversations, story, combat/encounter content, assets, locale strings, and effects for the existing game loop. Keep the first story's resource set intentionally small; add further resource types only when later story needs justify them.
- [ ] **PF-02** Decide and implement save migration or intentional reset; never reinterpret legacy IDs as new entities silently.
- [ ] **PF-03** Remove unapproved dark-forest content from the shipped package while preserving approved game capabilities.
- [ ] **PF-04** Keep the normal game entry path; remove the standalone Mission 01 route only after useful content is integrated.
- [ ] **PF-05** Preserve fighting and the good-vs-evil conflict; replace/adapt enemy content and define child-appropriate combat stakes, presentation, and consequences.

**Gate:** the normal game loads JSON-authored Lichtwald content through the existing core loop; no unapproved legacy content remains reachable; fighting and good-vs-evil conflict remain available with child-adapted content; every visible resource and player-facing narrative node references a valid image or explicit placeholder whose asset record has an art brief; state and save contracts are documented and validated.  
**Evidence:** content package path + migration report + reachability check: `TBD`.

### Phase G — Build one integrated story slice

- [ ] **PG-01** Prove the target local browser path (Godot web export in the VS Code browser) with a minimal build; document a native-runner fallback if export/browser constraints make that path unsuitable.
- [ ] **PG-02** Create a dev-only, repeatable playtest harness: one-command/one-click launch, deterministic fixture save, reset/restart control, and fast return to the integrated play screen. It must not alter production saves or add a second gameplay mode.
- [ ] **PG-03** Verify the normal load/new-game entry remains the player path; keep harness shortcuts gated to development mode.
- [ ] **PG-04** Render an illustrated story beat within the evolving diary/world experience.
- [ ] **PG-05** Make a character conversation offer an input with shared-contract conditions/effects.
- [ ] **PG-06** Make gathering/consumption and progression meaningfully affect available choices.
- [ ] **PG-07** Resume from saved state and verify effects remain idempotent.
- [ ] **PG-08** Play the integrated slice in the target browser with child-perspective review; record observed friction and iterate before expanding story content.
- [ ] **PG-09** Persist relationships independently per child/character and verify a choice can change a later response or outcome for that same character without unintentionally changing another's relationship.
- [ ] **PG-10** Make community growth in the forest an observable shared-game outcome of gathering/progression, not a separate mission counter.
- [ ] **PG-11** Verify the adapted fighting path retains meaningful good-vs-evil stakes, readable feedback, and recoverable outcomes; include combat in the first story only if its reviewed scope calls for it.

**Gate:** one end-to-end child story works through the real game loop without a second mission game or parallel resource/state systems; it uses the deliberately limited initial resource set, shows community growth, preserves per-character relationship effects across save/resume, and has been played in the target local browser/dev harness (or the documented fallback).  
**Evidence:** repeatable harness/launch instructions + playthrough checklist + save/resume and child-perspective review: `TBD`.

### Phase H — AI-assisted story authoring and expansion

- [ ] **PH-01** Generate/revise the same JSON entities a human edits: story arc/beats, locations, NPCs, conversations/choices, conditions/effects, resources, and outcomes; generation and basic validation operate directly on package files without Godot.
- [ ] **PH-02** Validate output deterministically; show dependency graphs and semantic diff; require human approval before applying.
- [ ] **PH-03** Expand resources/mechanics only when needed by the story and understandable to the child.

**Gate:** generated content opens in the standalone workbench, is inspectable/editable by a human, valid, reachable, localization-ready, and safe; ordinary narrative/resource/NPC changes need no game-script edits or Godot process for authoring/basic validation.  
**Evidence:** reviewed AI-authored package + validation and playthrough results: `TBD`.

## 10. Decisions to reopen in the old plan

These are preserved as prior work or candidate ideas, not approved V2 requirements:

- A stand-alone Mission 01 scene, its deep-link as the primary game flow, and the linear intro/listening/decision/outcome state machine.
- `MissionData` as the top-level story contract and `mission_state` as a parallel progression state.
- The fixed Mission 01 budget/options, Self/Vote/Moderate modes, exact outcome tiers, vote weighting/tie-break behavior, and outcome reward rules.
- The initial assumption that the dark game's progress/resource/NPC systems were stripped or safely reduced.
- The exact three-panel percentages, a separate gather button, exact resource inventory, dormant resources, and the assumed NPC/guide mechanics.

Keep the child-friendly story, comic/diary direction, friendship and consequential relationships, gathering, and the original source material available for review. Reuse an idea only when it fits the integrated game model and is approved during schema/story design.

The established core game design and event-driven architecture are not being discarded by this reset. The change is to make the current and future content entities visible, editable, and loadable from JSON, then remove only legacy content coupling that the workbench and tests have replaced.

## 11. Decisions and revisit conditions

These are planning defaults that make the next feasibility work actionable; they do not imply that a test or implementation gate has passed. A later phase may change a default only by recording the evidence, affected phase, and migration impact here. User-approved direction is identified separately from defaults chosen to unblock investigation.

| ID | Decision | Current default | Status | Rationale, evidence, and revisit condition |
|---|---|---|---|---|
| DEC-01 | Core entities and editor views | First-class package entities: resource definitions, producers/actions, recipes, worker roles, locations, stories/nodes/choices, NPCs/conversations, enemies/encounters, shared rules/effects, assets, and locale strings. MVP views: entity lists/tables, inspector, raw JSON, story/conversation graph, encounter catalogue, cross-domain dependency graph, event-rule matrix, and validation. | **Accepted default 2026-11-06** | Matches the source inventory in §§3.3–3.6 and required views in §5.3. Revisit only if F1–F8 show an entity boundary or view is unusable or redundant. |
| DEC-02 | JSON package and file boundaries | A versioned package has `manifest.json`, `combat.json`, `locations.json`, shared `resources.json` and `rules.json`, `assets.json`, one file per story, one file per NPC with its conversations, and one locale file per language. Content refers to stable IDs and locale keys; player-facing strings have one canonical source in locale files. | **Accepted default 2026-11-06** | Domain-sized files are AI/human editable while keeping package validation cross-domain. F1 must test editing effort and revise this boundary if it causes broad unrelated edits. |
| DEC-03 | Story graph, event rules, and runtime state | Keep three explicit models: authored story/conversation graphs for narrative topology; typed event rules for cross-system reactions; a small resumable state machine for each active story/conversation run. No general workflow/BPMN engine for the first implementation. | **Accepted default 2026-11-06** | Fits the current signal-driven runtime (§3.1) without making global state or every event a workflow. Revisit only if F5–F6 demonstrate a concrete need for durable parallel jobs, timers, retries, or orchestration that the save + graph + event model cannot meet. |
| DEC-04 | Conditions and effects | Conditions are a bounded JSON AST (`all`, `any`, `not`, and typed comparisons against allow-listed state paths). Initial effects are validated, transactional, and idempotent: resource add/spend, relationship adjustment, flag set, and unlock of a registered content/capability ID. Unknown paths/operators/effects, wrong types, out-of-range values, and executable code are rejected before mutation. Combat remains a generic capability; a story may request a registered encounter, but combat payload/effects require their own feasibility coverage. | **Accepted default 2026-11-06** | Initial operation set supports the integrated story/resource/NPC loop in §§6–7 and can be evaluated by F4–F6. F4 results may narrow or clarify operations; additions require a use case and tests, not arbitrary script escape hatches. |
| DEC-05 | Preserve mechanics and disposition of legacy content | Preserve the integrated resource loop, workers/crafting, signal/event coordination, registered UI capabilities, save/load, and fighting/good-versus-evil. Replace legacy dark-forest text, characters, identities, and unverified art; migrate authored content/rules by parity-tested slices. Preserve mechanics in code; make their content parameters data-driven. | **Accepted default 2026-11-06** | Matches the explicit combat direction and inventory in §§3.3–3.6. No content or code is removed before reference, save, and parity gates. The duplicate `explorer` and `tailor` → `rope` remain held; empty/unreachable NPC records are not ported without evidence. |
| DEC-06 | Shared state and save compatibility | Keep package `schemaVersion` separate from a versioned per-save format. Shared save state owns resources, per-character relationships, flags/unlocks, story/conversation run state (current node, pending input, visited nodes, choices, completion), encounter/combat progression, and applied-effect/idempotency keys. New Lichtwald starts a fresh save; preserve existing legacy save files but do not silently import or reinterpret them. Any later migration must be explicit, backed up, and tested against legacy reset/retention semantics. | **Accepted default 2026-11-06** | The current `mission_state` is parallel to canonical state and legacy saves have different progression semantics (§3.2). This conservative restart policy avoids accidental data loss or false equivalence; revisit only if carrying existing player progress becomes an explicit requirement. |
| DEC-07 | Preview and package reload | The standalone workbench previews content without Godot. Runtime initially loads a complete, validated immutable package at startup or through an explicit development reload/restart; invalid packages leave the last valid package active. No automatic hot reload while a story/effect transaction is in progress. | **Accepted default 2026-11-06** | Safer for stateful choices and idempotent effects (§7), while keeping the local dev loop repeatable. Revisit hot reload only after Phase D has atomic package swap and state-safety tests. |
| DEC-08 | Diary placement and interaction | Keep the diary/comic broad on the left as a chronological flow of illustrated panels and captions; show the current location and its gathering/actions/decisions/dialogue in the center; show resources and community status on the right. Story and location actions share the same state and surface—no separate child mission screen. Text-to-speech is a later optional presentation layer, not a Phase B–G dependency. | **Accepted default 2026-11-06** | Directly records the requested layout and comic-over-text direction. Exact pixel ratios and narrow-screen composition remain responsive design details to validate in the integrated playtest, not blockers to content architecture. |
| DEC-Workbench | Where does the graphical JSON authoring workbench live? | Standalone web tool; Godot only consumes validated packages. | **Accepted 2026-11-06** | See [PLAN_UPDATE_STANDALONE_WORKBENCH.md](./game/docs/lichtwald_content_inspector%202/PLAN_UPDATE_STANDALONE_WORKBENCH.md) and [STANDALONE_WORKBENCH.md](./game/docs/lichtwald_content_inspector%202/STANDALONE_WORKBENCH.md). |
| DEC-Combat | Should the rebuilt game retain fighting and good-vs-evil conflict? | Yes. Preserve fighting capability and conflict premise; adapt opponents, presentation, stakes, and consequences for children. | **Accepted 2026-11-06 — user direction** | Overrides prior proposals to remove fighting. It does not require combat in the first story; the first-story use case is decided during story design. |

## 12. Source map

- Prior implementation checklist: [PLAN_GODOT_REBUILD.md](./PLAN_GODOT_REBUILD.md)
- Consolidated standalone-workbench decision and implementation update: [PLAN_LICHTWALD_REBUILD_v3.md](./game/docs/lichtwald_content_inspector%202/PLAN_LICHTWALD_REBUILD_v3.md)
- Earlier asset/code strip intent: [PLAN_GODOT_ASSET_STRIP.md](./PLAN_GODOT_ASSET_STRIP.md)
- Runtime entry and integrated scene: [project.godot](./game/project.godot), [main.tscn](./game/scenes/autostart/main/main.tscn), [main.gd](./game/scenes/autostart/main/main.gd)
- Shared state and persistence: [save_file.gd](./game/global/autoload/save_file/save_file.gd)
- Resource catalog loading: [resources.gd](./game/global/autoload/resources.gd)
- Resource/worker/substance/NPC/event schemas: [resource_generator.gd](./game/resources/game_data/resource_generator/resource_generator.gd), [worker_role.gd](./game/resources/game_data/worker_role/worker_role.gd), [substance_data.gd](./game/resources/game_data/substance_data/substance_data.gd), [npc_event.gd](./game/resources/game_data/npc_event/npc_event.gd), [event_data.gd](./game/resources/game_data/event_data/event_data.gd)
- Progression and triggers: [unlock_controller.gd](./game/scenes/controller/unlock_controller/unlock_controller.gd), [npc_controller.gd](./game/scenes/controller/npc_controller/npc_controller.gd), [npc_manager.gd](./game/scenes/manager/npc_manager/npc_manager.gd), [event_manager.gd](./game/scenes/manager/event_manager/event_manager.gd)
- Player-facing mechanics: [world_screen.gd](./game/scenes/ui/screen/world_screen/world_screen.gd), [npc_dialog.gd](./game/scenes/ui/screen/world_screen/npc_dialog/npc_dialog.gd), [progress_button_controller.gd](./game/scenes/controller/progress_button_controller/progress_button_controller.gd), [worker_controller.gd](./game/scenes/controller/worker_controller/worker_controller.gd), [substance_controller.gd](./game/scenes/controller/substance_controller/substance_controller.gd)
- Localized authored content: [localization.csv](./game/assets/i18n/localization.csv)
- Existing separate mission experiment: [mission_data.gd](./game/resources/missions/mission_data.gd), [mission_01_spielplatz.tres](./game/resources/missions/mission_01_spielplatz.tres), [mission_screen.gd](./game/scenes/ui/screen/mission_screen/mission_screen.gd)
- Diary concept and source story: [concept-diary-comic.md](./docs/concept-diary-comic.md), [mission-01-der-kaputte-spielplatz.md](./content/blog/mission-01-der-kaputte-spielplatz.md)

## 13. Standalone workbench artifacts and current state

The standalone workbench architecture is accepted; its feasibility and completion gates are not yet accepted as passed.

| Artifact | Path | Purpose/status |
|---|---|---|
| Standalone workbench | [`web/`](./game/docs/lichtwald_content_inspector%202/web/) | Browser-based graphical JSON authoring prototype; README identifies the current prototype as v0.2. |
| Usage and architecture decision | [`STANDALONE_WORKBENCH.md`](./game/docs/lichtwald_content_inspector%202/STANDALONE_WORKBENCH.md) | Rationale, launch instructions, current documented capabilities, and roadmap. |
| Formal decision record | [`PLAN_UPDATE_STANDALONE_WORKBENCH.md`](./game/docs/lichtwald_content_inspector%202/PLAN_UPDATE_STANDALONE_WORKBENCH.md) | Accepted DEC-Workbench and revised Phase C/D/H consequences. |
| Reference fixture | [`fixtures/spielplatz_demo/`](./game/docs/lichtwald_content_inspector%202/fixtures/spielplatz_demo/) | F1 feasibility fixture with locations, combat, canonical locale strings, and art-catalogued placeholders; unfamiliar-human readability review remains pending. |
| V3 source plan | [`PLAN_LICHTWALD_REBUILD_v3.md`](./game/docs/lichtwald_content_inspector%202/PLAN_LICHTWALD_REBUILD_v3.md) | Source of the standalone-tool decision integrated into this working plan. |

The workbench's manifest-driven loader parses and retains every JSON document listed in the F1 package manifest. Verified Phase C surfaces include domain lists/tables, the inspector and raw JSON editor, story and dependency graphs, the event-rule matrix, package validation, story preview, bundle/folder import/export, and conservative three-way co-edit review. F7 graph comprehension, an unfamiliar-human editing review, and final human approval of the editor flow remain open.

The F1 fixture now includes location and combat catalogs, canonical locale strings, and registered placeholder art briefs for visible resources and narrative/dialogue nodes. Fixture contract tests cover those joins; human readability and co-edit review are still required before advancing Phase C.

The existence of a prototype and fixture is not evidence that the F1–F8 tests or Phase C workbench gate have passed. Record automated results separately from human review evidence before advancing the phase tracker.

**Next planned work:** complete F1's unfamiliar-human and independent-AI edit review, then decide whether the documented F5 signal-order difference is acceptable for the production adapter or requires another experiment. Revisit the Phase B gate only after those holds have evidence and disposition. Keep the existing F0 runtime replay complete and do not repeat it unless new code or evidence makes that necessary. Do not edit the live game catalog or remove legacy code during Phase B.
