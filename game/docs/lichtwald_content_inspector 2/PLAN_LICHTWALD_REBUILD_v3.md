# Hannahs Lichtwald — Integrated Game Rebuild Plan v3

**Stand:** 2026-11-06  
**Status:** Planning only – dieses Dokument autorisiert **keine** Code- oder Content-Änderungen.  
**Authority:** Ersetzt und erweitert die Entscheidungen aus `PLAN_GODOT_REBUILD.md`. Alte Commits, Assets und Tests bleiben historische Referenz.  
**Kernziel:** Den gut designten Core-Loop und die event-getriebene Runtime behalten. Authored Content (Entities, Rules, Conditions, Effects) in versioniertes, mensch- und KI-editierbares JSON verschieben. Die **grafische Authoring-Workbench ist ein eigenständiges Tool außerhalb von Godot**. Die Lichtwald-Geschichte wächst *innerhalb* des bestehenden Spiels – kein separates Mission-Game.

---

## Progress Tracker (stabile IDs)

Status-Konvention: `[ ]` not started · `[/]` in progress · `[x]` complete.  
Eine Aufgabe ist erst complete, wenn **Evidence** (Pfad, Test-Output, Commit, Decision-Record) existiert und der Acceptance-Check bestanden ist. Phase erst complete, wenn das Gate erreicht ist.

| Phase | Status | Depends on | Exit Evidence |
|-------|--------|------------|---------------|
| **A** – Baseline Map | [/] | – | Source Inventory + F0 Runtime-Trace |
| **B** – JSON/Flow Feasibility | [ ] | A | F1–F6 Results + Schema-/Flow-Decisions |
| **C** – Standalone Graphical Workbench | [ ] | B | F7–F8 + Workbench-Gate (außerhalb Godot) |
| **D** – JSON Runtime Loader (Godot) | [ ] | C | Identisches Package lädt in Workbench *und* Godot |
| **E** – Rule Migration | [ ] | D | F9 Parity-Evidence + sichere Entfernung der Branches |
| **F** – Lichtwald Package | [ ] | E | Legacy-Disposition + Shared-State Migration |
| **G** – Integrated Story Slice | [ ] | F | Verifizierter Child-Playthrough durch Core-Loop |
| **H** – AI Authoring | [ ] | G | Reviewter AI-Edit ist valid, inspectable, playable |

**Decision Tracker:**

| ID | Thema | Status |
|----|-------|--------|
| DEC-01 | Editor Entities/Views | Open |
| DEC-02 | JSON File Boundaries | Open |
| DEC-03 | Graph / Event / State-Machine Split | Open |
| DEC-04 | Condition/Effect Vocabulary | Open |
| DEC-05 | Legacy Capability/Content Disposition | Open |
| DEC-06 | Save/Migration Policy | Open |
| DEC-07 | Preview/Reload | Open |
| DEC-08 | Diary Placement | Open |
| **DEC-Workbench** | Workbench lebt **außerhalb** von Godot | **Accepted** 2026-11-06 |

---

## 1. Reset in einem Satz

Der bestehende Core-Loop (Resource → Unlock → Event → NPC → Save) ist der Ausgangspunkt – **nicht** neu zu erfinden. Das Diary ist der lebendige Story-Record *innerhalb* dieses Loops. Eine separate Mission-01-Route oder paralleler State ist explizit **nicht** Zielarchitektur.

---

## 2. Warum dieser zweite Reset nötig ist

- Asset-Strip hat die `.gd`/`.tscn`/`.tres`-Systeme und den Save-Picker → Main-Scene-Pfad gelassen.
- Mission 01 ist ein paralleler State (`mission_state`) mit eigener Lifecycle und keiner Integration in World/Resource/NPC.
- Content-Regeln (Unlocks, Choice-Effects, Thresholds) sitzen noch in Controllern (`UnlockController` etc.), nicht in Daten.
- Deshalb: erst Inventory + grafische Sichtbarkeit, dann Migration. Kein weiterer Child-Facing-Screen als Einstieg.

---

## 3. Evidence-based Model des aktuellen Spiels

### 3.1 Runtime & State Flow

1. Save-Picker → Main-Scene.
2. Autoloads: `Resources`, `SaveFile`, `Locale`, `SignalBus`.
3. World-Screen baut Progress-Buttons aus `SaveFile.resource_generator_unlocks`.
4. `ProgressButtonController` prüft Kosten → emittiert → `ResourceManager` updated `SaveFile.resources` + Signal.
5. `UnlockController` lauscht auf Resource/Worker/Substance/NPC/Tab-Events und treibt Unlocks, Events, NPC-Starts.
6. Worker-Zyklen, Substance-Crafting, NPC-Dialoge, Event-Log – alles über denselben Save-State.
7. `mission_state` ist zusätzliches, isoliertes Feld und **nicht** kanonisch.

**Integration Seam für neue Story:** Jede Story-Aktion muss denselben Shared State ändern und die bestehende Runtime reagieren lassen. Kein zweiter Economy- oder Progress-State.

### 3.2 Wo Progression & Story heute leben

| Concern | Aktuelle Repräsentation | Was der Extractor verbinden muss |
|---------|-------------------------|----------------------------------|
| World Economy | `resources`, `workers`, `substances` | Producers, Consumers, Caps, Generated/Spent, Code-Modifier |
| Available Interactions | `*_unlocks`, `tab_levels` | Unlock-Conditions + UI-Reachability |
| Story/Event History | `events` + `event_log` | Trigger, Interpolated Values, Downstream Logic |
| NPC Progress | `npc_events[npc][event]` | Entry, Text, Options, Edges, Completion, Effects |
| Enemy/Prestige | `enemy` + Reset/Retention | Trigger, State-Reset, Story-Consequences |
| Mission 01 Experiment | `mission_state` | Isolierte Lifecycle (Mismatch mit Shared State) |

### 3.3 Content Inventory (aktuell 208 `.tres`)

| Type | # | Verantwortung & Lücken |
|------|---|------------------------|
| ResourceGenerator | 37 | Output, Cooldown, Costs, Drops, Caps, Efficiency-ID. Kein separates ResourceData-Katalog. |
| WorkerRole | 21 | Produce/Consume + Worker-Upkeep. Efficiency runtime-abhängig. |
| SubstanceData | 39 | Costs, Category, Unlock-Gate. Viele Effects hard-coded. |
| NpcEvent | 22 | IDs + next-arrays. Text/Options in CSV, Trigger/Effects in Code. |
| EventData | 70 | ID, Format-Vars, Color. Text in CSV, Trigger in Controllern. |
| TabData | 9 | Order. Unlocks in Save + Managers. |
| EnemyData | 10 | Order, Health, Images. Trigger/Effects extern. |

**Zusätzlich inventarisieren:** Cost-Functions, Art/Audio, Localization-Rows, Scene/Autoload-Wiring, Controller-Branches.

### 3.4 NPC-Conversations sind noch nicht self-contained

Beispiel Katze:  
`.tres` = Node-IDs + next-Arrays → Text in `localization.csv` → `NpcDialog` zeigt aktives Event → `NpcController` folgt Edge → `UnlockController` hat hard-coded Choice-Effects.  

Ein Graph nur aus `.tres` ist unvollständig. Extractor muss Resource + Locale + Controller + Save-Semantik joinen und confirmed vs. inferred Edges unterscheiden.

### 3.5 Resource-Dependencies = 4 Edge-Familien

1. Manual Generator (Output/Cost/Cooldown/Drop/Cap)
2. Worker-Role (Input/Output + Upkeep)
3. Substance Crafting + Substance-Unlock-Gates
4. Progression-Rules (Unlock Generator/Role/Tab/Event/NPC nach State-Change)

Viele Modifier sitzen in Controller-Code → Inspector braucht Dependency-Graph **und** Condition/Effect-Rule-List.

---

## 4. Target Experience & Architecture Constraints

### 4.1 Experience

- Diary/Story lebt im normalen Game-Flow.
- Story-Beats und Choices operieren auf Shared State.
- NPCs sind persistente Teilnehmer.
- Resources ermöglichen Aktionen und ändern Möglichkeitsraum.
- Legacy Dark-Forest Content (Namen, Text, Art, spezifische Values/Rules) darf nach Cutover **nicht** parallel spielbar bleiben.
- Child-Safety, ruhiges Tempo, lesbare Controls, recoverable Progress bleiben Guardrails.

### 4.2 Preserve vs. Move vs. Replace

| Klassifikation | Bedeutung |
|----------------|-----------|
| **Preserve as capability** | Resource-Loop, Event/Signal-Flow, Worker, Crafting, NPC, Progression, Save/Load, UI. Nur ändern, wenn Data-Driven-Support oder explizite Design-Entscheidung. |
| **Move to JSON** | Authored Definitions + content-spezifische Values/Rules. |
| **Replace as Lichtwald** | Legacy Names, Text, Characters, Art/Audio, Economy-Values, Story-Conditions/Effects. |
| **Remove** | Nur wenn kein approved Role + Callers/Save/Dependencies geprüft. |
| **Unresolved** | Blockiert Remove oder „migrated“-Claim. |

---

## 5. Content Extraction, Inspection & Authoring Tool

### 5.1 Architektur-Entscheidung (DEC-Workbench) – Accepted 2026-11-06

**Die grafische Authoring-Workbench ist ein eigenständiges Tool außerhalb von Godot.**

| Anforderung | Godot Plugin | Standalone Tool |
|-------------|--------------|-----------------|
| AI kann Stories unabhängig generieren & testen | Schwer | Natürlich |
| CI / headless Validation | Möglich, aber schwer | Trivial |
| Autoren ohne Godot-Installation | Nein | Ja (Browser) |
| Identisches JSON für Tool **und** Runtime | Ja | Ja |
| Keine versehentliche Game-Code-Kopplung | Höheres Risiko | Niedriger |

**Konsequenz:**  
Godot enthält später nur einen JSON-Package-Loader (Phase D).  
Die Workbench (aktuell: Web-App unter `web/`) erzeugt, validiert und exportiert die Pakete.  
AI-Workflows (Phase H) arbeiten direkt mit den JSON-Dateien + Validator, ohne Godot zu starten.

Siehe auch: `STANDALONE_WORKBENCH.md` und `PLAN_UPDATE_STANDALONE_WORKBENCH.md`.

### 5.2 Working Name & Purpose

**Lichtwald Content Inspector** – Developer- und Author-Tool (standalone).  
Erste Version: grafisch, kann JSON-backed Entities editieren. Darf bestehende Godot-Resources nur als Migrations-Referenz betrachten, schreibt aber ausschließlich in das JSON-Package-Format.

### 5.3 Required Views (MVP)

| View | Muss zeigen |
|------|-------------|
| Story/Progression Graph | Start/Re-entry, Triggers, Beats, Conversations, Choices, Conditions, Outcomes, Downstream Unlocks. |
| Resource Catalogue + Dependency Graph | Jede Resource-ID, Generators, Recipes, Worker I/O, Costs, Caps, Unlock-Conditions. Table + Graph. |
| NPC/Conversation Catalogue + Graph | NPCs, Entry-Triggers, Lines, Choices, Conditions, Next, Effects, Localized Text. |
| Cross-Domain Trace | Von Action/Choice → State-Changes → Rules → Unlocks → spätere Nodes. |
| Coverage/Validation Report | Missing Refs, Missing Translations/Assets, Duplicate IDs, Unreachable, Cycles, Unmodeled Code-Effects. |

Edge-Types explizit labeln: `trigger`, `choice`, `requires`, `produces`, `consumes`, `unlocks`, `changes-state`.

### 5.4 Workbench Gate (Phase C) – revidiert

Ein Mensch (oder AI) kann:

1. Ein Content-Package in der **standalone Workbench** laden oder erstellen.
2. Eine kleine Story, eine Resource-Action und eine NPC-Conversation anlegen/editieren.
3. Cross-Links und Basis-Graphen sehen.
4. Das Package validieren.
5. Ein sauberes Package im vereinbarten Ordner-/JSON-Layout exportieren.
6. Das exportierte Package ist strukturell bereit für den zukünftigen Godot JSON-Loader (Phase D).

Erst nach diesem Gate werden hard-coded Content-Rules aus Controllern herausgenommen.

### 5.5 Flow Architecture (klar getrennt)

| Model | Verantwortung | Empfehlung |
|-------|---------------|------------|
| **Story/Conversation Graph** | Authored Narrative Topology | Human/AI-facing Planungs- und Inspect-View. Nodes/Edges = JSON Entities. |
| **Event-driven Rule Set** | Reagiert auf Game-Facts, evaluiert Conditions, dispatched typed Effects | Behalten. Content-spezifische Rules → deklaratives JSON. Generic Dispatcher bleibt Code. |
| **State Machine** | Lifecycle einer aktiven Interaction/Story-Instance | Nur wo echte Lifecycle-Klarheit nötig. |
| **Workflow/BPMN Engine** | Lange Jobs, Retries, externe Services | **Nicht** für v1. |

### 5.6 Ordered Feasibility Tests (F0–F9)

Kleine Fixture: 2 Resources, 1 Producer, 1 Recipe, 1 NPC mit Branching Conversation, 1 Story mit Choice + 2 Outcomes, Rules die Resource-Event und Conversation-Choice verbinden.

**F0 – Baseline Behavior & Trace** (teilweise done)  
- [x] Representative Paths gewählt.  
- [x] Source-Level Event Order, Payloads, State Fields, Source Anchors gemappt.  
- [ ] Runtime Replay gegen controlled Save.  
- [ ] Save/Reload erhält den selektierten Path-State.

**F1 – JSON File Boundaries & Readability**  
Hand-author Fixture → Mensch + AI machen unabhängige Edits → Granularität prüfen.

**F2 – Parse, Typed Model, Round-Trip**  
Load → validate → serialize → reload. Unicode, optionale Felder, unknown Fields.

**F3 – References & Cross-Domain Graph**  
IDs resolven, Graph Edges aus explicit References, Negative Fixtures für dangling/duplicate IDs.

**F4 – Conditions & Effects**  
Condition Vocabulary + allow-listed Effects. Conjunction/Disjunction, Typ-Checks, Reject von Scripts.

**F5 – Event-driven Connection & Parity**  
Typed Event → JSON Rule Selection → Parity gegen F0-Trace. Idempotency Keys.

**F6 – Story Graph Execution & Resume**  
Beat → Conversation → Choice → Branch → Outcome. Save/Resume, Loops, blocked Choices.

**F7 – Graphical Editor & Graph Comprehension**  
(Jetzt in der standalone Workbench) Writer + Developer beantworten „Was kann als nächstes passieren?“ nur mit dem Tool.

**F8 – Human/AI Co-Edit & Merge Safety**  
Getrennte und konfliktierende Edits, Rename-Propagation, Semantic Diff.

**F9 – Legacy Migration Boundary**  
Content-ID-keyed Branches → JSON Rules oder intentional retained Mechanics. Parity Evidence.

**Feasibility Exit:** F0–F9 supporten File Boundaries, Reference Model, Condition/Effect Vocab, Graph/Event Separation und Minimum Workbench Flow. Erst dann Production Schema + Loader committen.

---

## 6. Proposed Versioned JSON Content Contract

### 6.1 Package Shape

```
game/content/lichtwald/          # oder beliebiges Package-Root
  manifest.json
  resources.json
  rules.json
  stories/
    story_spielplatz.json
  npcs/
    juan.json
  locales/
    de.json
    en.json
  assets.json
```

Shared Rules:

- Jede Entity hat stabile, case-sensitive `id`.
- Human-readable Text in Locale-Maps (keine Doppel-Authoring in JSON + CSV).
- Conditions = structured JSON Expressions.
- Effects = typed, allow-listed Operations (kein Script).
- Missing References → Validation fail.
- JSON = canonical Authoring Source. Nach Cutover lädt Runtime die Domain aus JSON.

### 6.2–6.4 Story / Resource / NPC Schema

(Siehe frühere Beispieldokumente – Shape bleibt gültig. Schema muss unterstützen: explicit Triggers, conditional Branches, multiple Outcomes, reusable Conversations, resumable Progress, shared Condition/Effect Vocabulary.)

---

## 7. Shared Game State & Effect Contract

**Trennung:**

- **Content Definitions:** Story, Locations, NPCs, Dialogue, Resources, Producers, Recipes, Rules, Assets, Localization.
- **Per-Save State:** Resource Amounts, Story Progress, Flags, Unlocked Content, Relationships, Choices, Idempotency Keys.
- **Derived State:** aktuell verfügbare Controls/Entries (aus Conditions berechnet).

**Transaction Order:**

1. Condition gegen authoritative State prüfen.
2. Validated typed Effects einmal anwenden.
3. Choice/Event + Story Position recorden.
4. Neu verfügbare Conversations/Actions/Unlocks recomputen.
5. Über shared Save Contract speichern.
6. Diary/World aus saved State rendern.

`mission_state` nicht als paralleles Modell weiterführen.

---

## 8. Removal & Preservation Policy

1. Aktuellen Branch/History, alte Plans, Mission-Implementation, Tests, Data, Translations, Source Story material **behalten**.
2. Established Gameplay Loop + Event-driven Integration default preserve.
3. Dark-Forest Content ersetzen und content-spezifische Branches in JSON Rules verschieben, **nachdem** Workbench + Tests equivalent Behavior zeigen.
4. Legacy Content aus shipped Package nur nach Reference Check + Save Migration Decision entfernen.
5. Beide (old + new) **nicht** parallel spielbar lassen, außer explizite Entscheidung.
6. Attribution/Licensing für retained Code/Assets bewahren.

---

## 9. Implementation Phases & Stop Gates

### Phase A – Freeze & Map
- [x] PA-01 Keine Game Code/Data Changes während Baseline.
- [x] PA-02 Source Revision + Commits + Runtime Entry Paths confirmed.
- [/] PA-03 Repeatable read-only Inventory.
- [/] PA-04 Classification (preserve / move-to-JSON / replace / remove / unresolved).
- [/] PA-05 F0 complete (inkl. Runtime Replay + Save/Reload).

**Gate:** Jede active Entity, Content Rule, hard-coded Branch hat Source Reference + Disposition.

### Phase B – Feasibility Tests
- [ ] PB-01 F1–F6 in Order, nur kleine Fixture + Throwaway Prototypes.
- [ ] PB-02 Design Changes recorden und resolven.
- [ ] PB-03 Tests isoliert halten.

**Gate:** JSON round-trips safe; References bauen intended Graph; Event Rules reproduzieren Legacy Trace; Story resumed + Effects einmalig.

### Phase C – Standalone Graphical Workbench
- [ ] PC-01 F7 + F8 in der standalone Workbench.
- [ ] PC-02 Entity Model + Human Editing Flow Decisions.
- [ ] PC-03 Graph, Table, Inspector, Raw-JSON Views.
- [ ] PC-04 Package laden/erstellen, validieren, atomic exportieren.
- [ ] PC-05 (Optional) Read-only Legacy-Source Adapter als Vergleichshilfe.

**Gate:** Human kann kleine Story + Resource Action + NPC Conversation im **standalone Tool** erstellen; exportiertes Package ist valid und für Godot-Loader bereit. Kein Legacy Rule removed yet.

### Phase D – JSON Runtime Loader (in Godot)
- [ ] PD-01 Schema Versioning, IDs, Localization/Assets, Condition/Effect DSL, Migrations finalisieren.
- [ ] PD-02 Runtime lädt dasselbe Package-Format, das die Workbench exportiert.
- [ ] PD-03 Generic Event-driven Mechanics intact; Content-defined Behavior aus JSON.
- [ ] PD-04 Dev Reload nur nach whole-Package Validation.

**Gate:** Same Package öffnet in Workbench und läuft in Godot; Values und Behavior agree.

### Phase E – Rule Migration
- [ ] PE-01 Content-spezifische Triggers/Unlocks/Effects → deklarative JSON Rules.
- [ ] PE-02 Event Bus + generic Handlers behalten.
- [ ] PE-03 Novel Mechanics als dokumentierte Capabilities.
- [ ] PE-04 F9 complete; Parity Evidence before Delete.

**Gate:** Migrated Paths haben Behavior-Parity, idempotent Effects, keine remaining content-spezifischen Branches für diese Paths.

### Phase F – Lichtwald Package + Unify Progression
- [ ] PF-01 Lichtwald JSON Package mit Workbench erstellen.
- [ ] PF-02 Save Migration oder intentional Reset.
- [ ] PF-03 Unapproved Dark-Forest Content entfernen.
- [ ] PF-04 Normal Game Entry Path behalten; Mission-01-Route erst später entfernen.

**Gate:** Normal Game lädt JSON-authored Lichtwald Content durch bestehenden Core Loop.

### Phase G – Integrated Story Slice
- [ ] PG-01–PG-06 End-to-end Child Story durch realen Game Loop, Save/Resume, Idempotenz, Child-Perspective Review.

**Gate:** Ein vollständiger Story-Slice funktioniert ohne zweites Mission-Game oder parallele State-Systeme.

### Phase H – AI-assisted Authoring
- [ ] PH-01 Generate/revise dieselben JSON Entities.
- [ ] PH-02 Deterministic Validation + Dependency Graphs + Semantic Diff; Human Approval required.
- [ ] PH-03 Resources/Mechanics nur expandieren, wenn Story es braucht.

**Gate:** Generated Content öffnet in der Workbench, ist human inspectable, valid, reachable, localization-ready und safe. Keine Game-Script-Edits für gewöhnliche Narrative-/Resource-/NPC-Änderungen nötig.

---

## 10. Alte Plan-Ideen (nicht V3 Requirements)

- Standalone Mission 01 Scene + Deep-Link als Primary Flow.
- `MissionData` + `mission_state` als paralleler Progress.
- Fixed Mission 01 Budget/Options, Self/Vote/Moderate Modes.
- Annahme, dass Dark-Game Progress/Resource/NPC Systems bereits stripped waren.
- Exact Three-Panel Percentages, separate Gather Button, assumed NPC/Guide Mechanics.

Behalten: Child-friendly Story, Comic/Diary Direction, Friendship + consequential Relationships, Gathering, Original Source Material als Review-Material.

---

## 11. Joint Review Questions (mit Empfehlungen)

| ID | Decision | Empfohlener Starting Point | Status |
|----|----------|----------------------------|--------|
| **DEC-Workbench** | Workbench außerhalb Godot? | Standalone Web-Tool + später CLI/API | **Accepted** 2026-11-06 |
| **DEC-01** | Core Entities & Views im MVP | Story, Resource, NPC, Rule + Inspector/Graph/Raw/Validation | Open |
| **DEC-02** | JSON File Boundaries | One File per Story und per NPC; shared resources/rules/locales | Open |
| **DEC-03** | Graph vs. Event Rules vs. Run State | Authored Graph + Event-driven Rules + small resumable State Machine | Open |
| **DEC-04** | Condition/Effect Operations (first slice) | resource.add/spend, relationship.adjust, flag, unlock, event.record | Open |
| **DEC-05** | Preserve vs. migrate first | Preserve Mechanics by default; start with UnlockController Thresholds + Cat Choice Effects | Open |
| **DEC-06** | State Concepts + Save Migration | Shared resources, relationships, story progress, flags, unlocked, idempotency keys. Explicit Mapping oder Reset. | Open |
| **DEC-07** | Preview / Reload | Explicit validated Reload first; Hot-Reload in Godot später | Open |
| **DEC-08** | Diary Placement | Ongoing Story Log in Main Game Surface; exact Layout später | Open |

---

## 12. Source Map (unverändert relevant)

- Prior implementation checklist: `PLAN_GODOT_REBUILD.md`
- Earlier asset/code strip intent: `PLAN_GODOT_ASSET_STRIP.md`
- Runtime entry: `project.godot`, `main.tscn`, `main.gd`
- Shared state: `save_file.gd`
- Progression: `unlock_controller.gd`, `npc_controller.gd`, `event_manager.gd`
- Localized content: `localization.csv`
- Mission experiment: `mission_data.gd`, `mission_screen.gd`
- Diary concept: `concept-diary-comic.md`, `mission-01-der-kaputte-spielplatz.md`

---

## 13. Aktueller Stand der Tooling-Artefakte

| Artefakt | Pfad | Zweck |
|----------|------|-------|
| Standalone Workbench | `web/` | Grafischer JSON-Editor (außerhalb Godot) |
| Entscheidung + Nutzung | `STANDALONE_WORKBENCH.md` | Warum standalone + How-to |
| Plan-Update Record | `PLAN_UPDATE_STANDALONE_WORKBENCH.md` | Formelle Änderung an Phase C/D/H |
| Geschärfter Gesamtplan | `PLAN_LICHTWALD_REBUILD_v3.md` | Dieses Dokument |
| Referenz-Fixture | `fixtures/spielplatz_demo/` | Minimal-Package für F1–F8 |

---

**Nächster empfohlener Schritt:**

1. F0 Runtime Replay + Save/Reload abschließen (Phase A).
2. DEC-01 bis DEC-04 in einem Joint Review klären.
3. Mit der standalone Workbench + Fixture die Tests F1–F3 fahren.

---

*Content-Tooling bleibt bewusst außerhalb der Engine, damit Menschen und AI schnell iterieren können, ohne Godot in jede Authoring-Entscheidung hineinzuziehen.*
