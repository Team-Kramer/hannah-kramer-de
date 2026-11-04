# Hannahs Lichtwald — The Diary-Comic Concept

**Updated:** 2026-11-05
**Status:** Design rationale for the game's core presentation. Supersedes the flat single-screen mission flow in `mission_screen.gd`.
**Reference:** `docs/Bildschirmfoto 2026-11-04 um 23.39.50.png` (the 3-panel diary).

## 1. The core idea: a diary that tells the story

The game is a **diary / storybook** the child opens. The diary is the central metaphor and the core UI. It has **three panels**, matching the reference screenshot:

- **Left (largest): the comic story flow** — the story told as a flow of cartoon pictures, each with a short subtext. This replaces the current dark, text-driven narrative. The left panel gets *more room* so the story reads as a comic strip.
- **Middle: the location screen** — the current place in the story (e.g., the playground). Here the child gathers resources, talks to characters, and makes decisions.
- **Right: the resources** — what the child has gathered (Lichttropfen, Freundschafts-Funken, and later Mut-Sterne, Rhythmus-Noten).

The diary "enfolds the story ongoing": as the child listens, gathers, and decides, new comic panels are added to the left flow, the location in the middle changes, and the resources on the right update.

## 2. The three panels

### Left — the comic story flow ("Geschichtenfluss")

- A **vertical, scrollable flow** of comic panels (cartoon pictures). The current panel auto-scrolls into view; earlier panels remain visible above as the story grows.
- Each panel = a **cartoon image** (described in text now, generated later) + a short **subtext** (caption).
- Later: **text-to-speech** reads the subtext aloud (audio only on user tap; the transcript stays visible).
- The **mountain range (Bergkamm)** is a recurring backdrop that frames the forest — a sense of place.
- The **Lichtkatze** (cat creature) and the kids appear as characters in the flow.

This is the main change from the current build: the dark text narrative becomes a warm comic flow with more room on the left.

### Middle — the location screen ("Ort")

- **Location-dependent**: for Mission 01 it is the *Spielplatz* (playground); later missions have their own locations.
- Shows:
  - The current location (a scene image).
  - **Resource-gathering options** — cooldown buttons (GodotProjectZero `ProgressButton` + `ResourceGenerator`). The child taps to gather Lichttropfen (and later other resources).
  - **The decisions** — Self / Vote / Moderate modes with the options (barrierefrei / rutsche / fussball / ruhebereich) and their Lichttropfen costs.
  - **The dialogs** — GodotProjectZero `NpcDialog`, where the kids talk and the Lichtkatze frames the decision.

### Right — the resources ("Tagebuch-Seite")

- Shows the gathered resources using GodotProjectZero `ResourceTracker`:
  - **Lichttropfen** — the per-mission budget (gather + spend).
  - **Freundschafts-Funken** — friendship per kid + the Lichtkatze.
  - **Mut-Sterne**, **Rhythmus-Noten** — shown but dormant in story 1 (see §7).

## 3. The game loop

The core loop is unchanged from the vision, now expressed through the diary:

1. **Situation** (left): a comic panel shows the situation (the broken playground, the mountain range in the background).
2. **Listen** (middle, `NpcDialog`): tap each kid to hear their wish; the Lichtkatze appears and frames the decision.
3. **Gather** (middle, `ProgressButton`/`ResourceGenerator`): tap cooldown buttons to gather Lichttropfen.
4. **Decide** (middle): choose a mode (Self / Vote / Moderate), pick options, each costs Lichttropfen.
5. **World reacts** (left + right): a new comic panel shows the outcome; resources and friendship update.
6. **Story grows** (left): new comic panels are added; the Lichtkatze, the mountain range, and new kids appear in later stories.

## 4. The Lichtkatze (the talking cat creature)

The **Lichtkatze** is a guide character:
- It **appears** from the direction of the mountain range (exploiting the Bergkamm idea).
- It **talks** (`NpcDialog`) and **frames the decision** — e.g., it asks "Was sollst du tun?" and offers the compromise (Moderate) option.
- Its **friendship** with the child is tracked like the kids' (see §6).
- It uses the existing `game/assets/image/art/cat.png` asset.

The Lichtkatze is the warm, non-scary "helper" that makes the decision feel supported rather than pressured.

## 5. The mountain range (Bergkamm)

The mountain range that "stretches near the forest" is exploited three ways:
- **Visual:** a recurring backdrop in the left comic panels (frames the forest, sense of place).
- **Story:** the home of the Lichtkatze (the cat appears from the mountain direction).
- **Mechanic (later stories):** a gatherable location / resource source (e.g., "Berg-Licht"). In story 1 it is purely a backdrop + the place the cat appears from.

This keeps story 1 simple while planting the seed for expansion.

## 6. Friendship tracking

Each kid (Juan, Lina, Tobi, Oma Linde) and the Lichtkatze has a **Freundschafts-Funken** value:
- Decisions affect friendship: choosing a kid's wish increases that kid's friendship; ignored wishes get a gentle, non-punitive adjustment (never a loss that feels like blame).
- Friendship feeds the **vote weight** in Vote mode: `1 + 0.1 × Freundschaft`.
- **Later outcomes depend on friendship**: a high-friendship kid helps in a later mission; a low-friendship kid is less cooperative. Different outcomes branch on friendship level.

This is already partially in the save schema (`character_freundschaft`); it needs to be wired into outcomes and extended to the Lichtkatze.

## 7. Reduced resources in story 1

Story 1 (Mission 01) uses a **reduced** resource set:
- **Active:** Lichttropfen (gather + spend), Freundschafts-Funken (track per kid + cat).
- **Dormant (shown, not needed):** Mut-Sterne, Rhythmus-Noten — shown in the right panel with a gentle "kommt später" (coming later) hint.

Later stories activate the full four-resource set as in the original.

## 8. Mapping to GodotProjectZero mechanics

| Concept element | GodotProjectZero block (present in `game/`) |
|---|---|
| Resource-gathering (cooldown buttons) | `scenes/ui/screen/world_screen/progress_button` + `resources/game_data/resource_generator` |
| Resource display (right panel) | `scenes/ui/resource_tracker` |
| Dialogs (kids + cat) | `scenes/ui/screen/world_screen/npc_dialog` |
| Location/world screen | `scenes/ui/screen/world_screen` |
| Save state | `global/autoload/save_file` (`mission_state`) |
| Comic flow (left) | **New** custom component (a vertical flow of comic panels) |

All the GodotProjectZero building blocks are already present in the stripped de-repo; the main new work is the 3-panel diary layout and the comic flow.

## 9. Data model changes (MissionData)

`MissionData` (`game/resources/missions/mission_data.gd`) extends to support:
- `comic_panels: Array[ComicPanel]` — the left flow (image/description + subtext).
- `location: LocationData` — the middle (name, scene image, gatherables, options, modes).
- `characters` — extended with friendship effects + the Lichtkatze.
- `outcomes` — extended with comic panels + friendship effects.

## 10. Mission 01 in the new concept

- **Left (comic flow):**
  1. The forest clearing, broken playground, mountain range backdrop. Subtext: "Am Rande des Lichtwaldes, wo ein sanfter Bergzug den Wald umarmt, ist der Spielplatz kaputt."
  2. The kids gathering. Subtext: "Die Kinder des Waldes versammeln sich, um zu überlegen, was sie tun können."
  3. The Lichtkatze appears from the mountain. Subtext: "Aus Richtung des Bergkamms kommt die Lichtkatze, um zu helfen."
  4. (After decision) The outcome panel.
  5. (After outcome) The forest celebrates; the story grows.
- **Middle (location = Spielplatz):** gather Lichttropfen; listen to Juan / Lina / Tobi / Oma Linde + Lichtkatze; choose barrierefrei / rutsche / fussball / ruhebereich.
- **Right (resources):** Lichttropfen budget, Freundschafts-Funken per kid + cat; Mut-Sterne / Rhythmus-Noten dormant.

## 11. Open decisions

- [ ] Confirm the Lichtkatze is the cat creature (vs. a different creature) and its name.
- [ ] Confirm story-1 active resources: Lichttropfen + Freundschafts-Funken (Mut-Sterne / Rhythmus-Noten dormant).
- [ ] Confirm the mountain range is a backdrop in story 1 (resource source later).
- [ ] Confirm the comic panel count for Mission 01 (5 panels above).
- [ ] Confirm TTS is a later phase (subtext shown as text now).
