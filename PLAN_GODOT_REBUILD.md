# Hannahs Lichtwald — Post-Strip Godot Rebuild Checklist

**Updated:** 2026-11-04
**Overall status:** In progress — Mission 01 intro/listening/decision/outcome flow, vote behavior, and save-state scaffolding are implemented; world resources, applied effects, moderation cost, art, and release QA remain.
**Scope:** Rebuild the stripped Godot engine into a warm incremental-and-decision game: a playable Mission 01 first, with a growing world, meaningful resource changes, and later missions.
**Prerequisites:** [PLAN_STATIC_HOMEPAGE.md](./PLAN_STATIC_HOMEPAGE.md) Phase 1 baseline; [PLAN_GODOT_ASSET_STRIP.md](./PLAN_GODOT_ASSET_STRIP.md) strip audit.
**Content sources:** supplied Lichtwald docs `00–04`, [docs/mission-authoring.md](./docs/mission-authoring.md), and [docs/story-api-contract.md](./docs/story-api-contract.md). The vision reinforces the loop: situation → listen → decide/vote/moderate → world reacts → story grows.

## Goal

Turn the reduced GodotProjectZero project in `game/` into a complete, child-safe *Hannahs Lichtwald* game. Keep the existing engine and replace its old game content and presentation with the Lichtwald story, decision loop, visual/audio assets, and progression. The game must remain a Godot Web export served at `/spiel/engine/` by the existing static GitHub Pages build.

This is the implementation checklist for the post-strip rebuild. The asset-strip plan owns source attribution and KEEP/REPLACE/REMOVE decisions; the static homepage plan owns the wrapper, routes, and site-wide quality requirements. Avoid re-copying the upstream project or repeating asset deletions.

## Starting point in this repository

The following implementation files are present, but their behavior and completeness still need to pass the checks below:

- `game/resources/missions/mission_data.gd` and `mission_01_spielplatz.tres`
- `game/global/mission/decision.gd` and `game/global/mission/outcomes.gd`
- `game/scenes/ui/screen/mission_screen/mission_screen.tscn` and `.gd`
- `game/docs/mission-authoring.md` and `docs/story-api-contract.md`
- `.github/workflows/pages.yml` builds the Godot Web export and stages it under `build/spiel/engine/`

The existence of a file is not proof that its behavior is complete. Confirm each existing implementation against this checklist before extending or replacing it.

**Baseline measured 2026-11-04:** `game/assets/` is approximately 1.5 MB; generated `game/.godot/` is approximately 6 MB and `game/.export/` approximately 100 MB (both ignored). Godot 4.4 headless import/boot succeeds, but editor shutdown reports invalid/duplicate resource UIDs and retained audio/addon resources; clean these during the strip/baseline phase before calling startup diagnostics clean.

**Additional vision decisions:** Mission 01 is the first playable loop; Missions 02–07 stay locked teasers until their content exists. The four named resources (Lichttropfen, Mut-Sterne, Freundschafts-Funken, Rhythmus-Noten), visible world effects, save/resume, and kid-friendly mission authoring are part of the destination—not a second engine rewrite. A timed Schatten der Eile mechanic proposed in the detailed source plan conflicts with the no-timer/no-pressure invariant below, so the Shadow remains a non-timed story voice.

## Non-negotiable invariants

- [ ] Follow the "never scary" brief: no horror imagery/audio, punishment, fail state, countdown, or pressure timer.
- [ ] Keep touch targets at least 56 px on game interactions; support keyboard navigation and readable focus.
- [ ] Make audio opt-in after a user gesture; keep the narration transcript available even without audio.
- [ ] Preserve the design tokens and tone: indigo night `#1E1B4B`, warm cream `#FFF9EF`, soft gold `#F5B942`, Nunito, calm 200 ms scene transitions, and restrained 300 ms gold feedback.
- [ ] Keep mission content data-driven and deterministic. No network service or runtime API is required.
- [ ] Keep imported/generated engine caches and Web exports out of source control; retain required attribution for every shipped asset.

## Phase 0 — Baseline and content contract

**Gate:** establish what already works and resolve content/schema mismatches before changing the game flow.

- [x] Run the project in Godot 4.4: import resources, boot the current main scene, and record errors/warnings above. Shutdown diagnostics remain noisy.
- [x] Compare the current MissionData resource, Mission 01 `.tres`, mission scene, decision logic, and outcome logic with the available Lichtwald content contract; record the source-level outcome precedence in the authoring guide.
- [x] Document the identifier mapping: internal resource id `mission_spielplatz`; public route/deep-link slug `mission-01` (explicit alias in the URL handler and authoring/API docs).
- [x] Freeze the currently implemented Mission 01 reference data: five characters, 120 Lichttropfen pool, five options and costs, the three decision modes, and the good/middle/weak outcomes.
- [x] Reconcile the current intro, character dialogue, options/costs, and outcomes against the supplied `02-Mission-01-Kaputter-Spielplatz.md`; preserve source wording and character intent.
- [x] Resolve internal mismatches between the mission-authoring guide, story API contract, game data, and homepage plan; document outcome precedence and correct the intro resource format.
- [x] Record the baseline asset/cache/export sizes above for comparison.

**Exit check:** there is one documented data contract and the existing project boots without missing-resource errors. Current content matches the supplied Mission 01 source; noisy Godot shutdown diagnostics remain open.

## Phase 1 — Mission data and world state

**Depends on:** Phase 0.

- [x] Add a headless validator for required MissionData fields, unique IDs, character wishes, options/costs, modes, outcome requirements, and Mission 01's child-safety invariants.
- [x] Add headless tests for Mission 01 reference data, affordability, outcome boundaries, validator rejection cases, weighted votes, and deterministic tie-breaks (`Godot --headless --path game --script res://tests/test_missions.gd` passes).
- [x] Aggregate eligible-character votes by friendship weight; break equal totals by least-heard supporting voice and exclude the Shadow of Haste from voting.
- [x] Add and test a version-tolerant `SaveFile.mission_state` schema for outcomes, unlocks, Shadow strength, and per-character friendship.
- [x] Complete the MissionData schema for the agreed fields: id, title, intro, characters/dialogue, resource pool, options/costs/effects, available modes, and outcome predicates/effects. Field contract documented in `game/resources/missions/mission_data.gd`; every field is enforced by `MissionValidator.validate`.
- [x] Reconcile the current resource text and Mission 01 content against the canonical source document `02-Mission-01-Kaputter-Spielplatz.md` when it is available in the project workspace; preserve source wording and character intent. Verified 2026-11-04: intro, five characters, five options/costs (50/40/35/30/120), and all three outcomes in `mission_01_spielplatz.tres` match the canonical doc.
- [ ] Define how the four Lichtwald resources—Lichttropfen, Mut-Sterne, Freundschaft, Rhythmus—map to game state, mission decisions, outcomes, and the HUD.
- [ ] Define and implement mission/world state transitions: start, current scene/dialogue, listened-to voices, selected options, final outcome, unlocked content, and retry.
- [ ] Ensure a weak outcome is recoverable and repeatable; do not erase prior progress or present a game-over state.
- [x] Wire the mission test/validator into the Pages CI job after Godot import and before Web export; invalid mission data exits non-zero with explicit diagnostics. Local run passes; remote execution awaits push.

**Exit check:** Mission 01 loads as validated data and state changes can be tested independently of the scene tree.

## Phase 2 — Playable story and decision flow

**Depends on:** Phase 1.

- [x] Connect the mission screen to MissionData; implement the intro → listening → decision → outcome state sequence and render each character's dialogue.
- [x] Track which voices have been heard and make listening visible; replaying a line does not increase its vote weight, and listening is optional.
- [ ] Implement **Self**: allow one or two options, reject choices whose total cost exceeds the pool, and explain an unavailable choice in child-friendly language.
- [ ] Implement **Vote**: collect character wishes, calculate the documented vote weights, and apply the documented quiet-voice tie-break deterministically.
- [ ] Implement **Moderate**: apply the documented compromise rule and Mut-Sterne cost; show the child how the result reflects more than one wish.
- [ ] Keep all modes keyboard-operable and usable by touch; prevent double-submit and invalid/empty selections.
- [ ] Evaluate the final built options against the documented outcomes: good (barrier-free option plus another), middle (partial/loudest-only result as defined by the source), and weak (including `alles_halb` or Juan being forgotten).
- [ ] Apply outcome text and effects exactly once; verify resource changes and unlock state after completion.
- [ ] Add a clear, gentle route from each outcome to continue, revisit, or retry without implying failure or blame.

**Exit check:** a player can complete the Mission 01 loop from intro to outcome using each supported decision mode.

## Phase 3 — Game presentation and interaction

**Depends on:** Phase 2. Run in parallel with Phase 4 where paths do not conflict.

- [ ] Replace the old game's presentation with Lichtwald names, story framing, labels, and visual hierarchy; retain only engine UI that supports this flow.
- [ ] Make the mission screen fit the Godot 960×540 viewport and adapt to mobile/web aspect ratios without clipping text or controls.
- [ ] Apply the indigo/cream/gold palette and Nunito typography consistently; use gold as a focused interaction/feedback accent rather than a global fill.
- [ ] Meet the 56 px touch-target minimum for every interactive game control and verify keyboard focus order.
- [ ] Provide clear selected, unavailable, loading, saving, retry, and unlocked states; never use color as the only status cue.
- [ ] Implement motion only where it supports comprehension; respect `prefers-reduced-motion`/the agreed Godot equivalent and avoid flashing or full-screen surprises.
- [ ] Add or refine the gentle Schatten der Eile treatment only if the story source requires it; no countdown, urgency mechanic, or frightening visual/audio treatment.

**Exit check:** the complete flow is legible and usable on desktop and a narrow mobile viewport, with no child-safety or accessibility blocker.

## Phase 4 — Rebuild content assets

**Depends on:** the approved content contract and [PLAN_GODOT_ASSET_STRIP.md](./PLAN_GODOT_ASSET_STRIP.md). Asset generation/replacement can proceed alongside Phases 2–3.

- [ ] Inventory every `TODO-IMG` and `TODO-AUDIO` slot in `game/`; map each slot to a scene, character, option, or outcome in Mission 01.
- [ ] Approve the final slot list, image descriptions, sizes, and art-style lock before generating replacements; reuse the homepage image manifest where paths and slots match.
- [ ] Create or source legally usable Lichtwald artwork; review each final for child safety, representation, readability, and consistency with the approved style.
- [ ] Target the approved Mission 01 set: 6 character portraits (including Hannah), 6 story-beat scenes, 5 option cards, and 4 resource icons; map each to the homepage manifest and game asset path.
- [ ] Replace image placeholders at their referenced paths and regenerate Godot imports; keep fallback placeholders until each final is verified in-engine.
- [ ] Create or source gentle, legally usable audio; keep it silent until user activation and ensure no audio is needed to understand or complete the mission.
- [ ] Add each final asset and its license/attribution/provenance to `game/THIRD_PARTY.md` and `docs/image-provenance.md` (or the agreed audio provenance record).
- [ ] Re-run the asset-strip audit after replacement; confirm no unreviewed upstream asset was reintroduced and the agreed asset budget still holds.

**Exit check:** every shipped visual/audio asset has a verified source and license, and all remaining TODO slots are intentional and documented.

## Phase 5 — Save, resume, and progression

**Depends on:** Phases 1–2.

- [x] Add a backward-compatible `mission_state` save field and verify export/restore plus legacy-save defaults.
- [ ] Persist mission progress, resources, completed outcomes, heard voices, and unlocked content through the existing SaveFile mechanism.
- [ ] Verify save/load and retry behavior on desktop and Web; corrupt or absent saves must lead to a clear new-game path, not a broken screen.
- [ ] Verify URL mission/resume/share parameters reach the intended mission flow and remain consistent with the canonical mission ID.
- [ ] Keep the save contract compatible with the homepage's read-only IndexedDB state parser; update that parser and its tests only when the engine save shape intentionally changes.
- [ ] Add mission 02–07 as locked metadata/teasers only after the Mission 01 unlock chain is reliable; do not imply those missions are playable until their content exists.

**Exit check:** a completed or in-progress Mission 01 can be resumed on the same browser, and the homepage reports the matching state.

## Phase 6 — Tests and child-safe QA

**Depends on:** Phases 1–5.

- [ ] Add headless tests for mission validation and all decision/outcome boundary cases, including empty input, over-budget choices, ties, missing character references, and retries.
- [ ] Add scene/integration tests or a repeatable smoke script for boot → dialogue → each mode → outcome → save/load.
- [ ] Verify every reachable outcome and each intended mode/outcome path; document any intentionally unreachable combination.
- [ ] Verify resource effects, unlocks, and retry do not apply twice after repeated input or reload.
- [ ] Run the mission validator, GDScript lint, Godot headless import/boot, `pnpm check`, `pnpm test`, and `pnpm build`.
- [ ] Complete a manual child-safety pass: no scary imagery or sound, blame, pressure timer, inaccessible control, missing transcript, or loss of progress.
- [ ] Complete desktop, keyboard-only, and real-device touch checks; record defects and close blockers before release.

**Exit check:** automated checks are green and the game can be completed without assistance beyond the intended parent read-aloud experience.

## Phase 7 — Web export and release gate

**Depends on:** Phases 0–6.

- [ ] Export with the repository's Godot 4.4 Web preset and `thread_support=false`; confirm no SharedArrayBuffer/COOP-COEP requirement is introduced.
- [ ] Verify a clean CI build stages the engine at `build/spiel/engine/` and keeps the SvelteKit `/spiel/` route shell intact.
- [ ] Smoke-test `/spiel/`, `/spiel/engine/index.html`, mission deep links, audio-on-tap, save/load, and browser back/refresh on the deployed Pages site.
- [ ] Measure and record export size, first-frame load time, and Mission 01 start-to-first-action time in `docs/perf-baseline.md`.
- [ ] Verify the game and site contain no runtime API dependency, broken asset, unlicensed asset, or unhandled browser-console error.
- [ ] Update the homepage plan, `README.md`, and mission-authoring/story contract docs to reflect shipped behavior and remaining roadmap.

## Definition of done

- [ ] Mission 01 boots and is completable in Godot desktop and the deployed Web export.
- [ ] The player can hear every character, use each supported decision mode, see the correct outcome/effects, and resume saved progress.
- [ ] The game follows the child-safety, touch, keyboard, reduced-motion, and licensing requirements above.
- [ ] Validators, tests, lint, Svelte checks, static build, and the GitHub Pages deploy all pass.
- [ ] Remaining placeholders, teaser-only missions, and known limitations are explicitly documented.
