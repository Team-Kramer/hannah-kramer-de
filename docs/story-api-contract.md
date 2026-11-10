# Story API contract (B17)

The structured story record is the future contract for a **Story-Generation API**:
a service that can produce, validate, and serialize a Lichtwald mission the same
way the hand-authored `MissionData` resources do today. The engine consumes the
record; the generator (human or AI) produces it.

## Source of truth

- Engine schema: [`game/resources/missions/mission_data.gd`](../game/resources/missions/mission_data.gd)
  (`class_name MissionData`, a Godot `Resource`).
- Reference instance: [`game/resources/missions/mission_01_spielplatz.tres`](../game/resources/missions/mission_01_spielplatz.tres)

Mission 01 has the internal resource id `mission_spielplatz` and the public
route/deep-link slug `mission-01`. The web URL slug is an explicit alias, not a
second mission id.

## Record shape (JSON)

```json
{
  "id": "mission_spielplatz",
  "title": "Der kaputte Spielplatz",
  "intro_text": "Im Lichtwald gibt es einen alten Spielplatz. ...",
  "characters": [
    {
      "id": "juan",
      "name": "Juan",
      "wish": "barrierefrei",
      "mood": "Hoffnungsvoll, etwas schuechtern",
      "can_vote": true,
      "dialogs": ["Einen Weg ohne Stufen..."]
    }
  ],
  "resource_pool": 120,
  "options": [
    { "id": "barrierefrei", "label": "Barrierefreier Weg + Schaukel", "cost": 50, "effect": "Juan kann mitspielen" }
  ],
  "decision_modes": ["self", "vote", "moderate"],
  "outcomes": [
    {
      "id": "good",
      "condition": "has_barrierefrei and option_count >= 2",
      "result_text": "Juan rollt zum ersten Mal auf den Spielplatz. ...",
      "effects": { "mut_sterne": 15, "freundschaft": 20, "unlocks": "licht_rat" }
    }
  ]
}
```

## Field contract

| Field | Type | Required | Rules |
|---|---|---|---|
| `id` | string | yes | `mission_*`, snake_case, unique |
| `title` | string | yes | <= 60 chars, child-readable |
| `intro_text` | string | yes | 3-5 short sentences, ends with a question |
| `characters` | array | yes | >= 3; each has `id`, `name`, `wish`, `mood`, `can_vote` (boolean), `dialogs[]` |
| `resource_pool` | int | yes | >= 50; sum of the two cheapest good-enabling options <= pool |
| `options` | array | yes | >= 3; each `cost` > 0; at most one `alles_halb`-style option |
| `decision_modes` | string[] | yes | subset of `["self", "vote", "moderate"]`, >= 1 |
| `outcomes` | array | yes | >= 3; must include `good`, `middle`, `weak` |
| `outcomes[].condition` | string | yes | human-readable predicate over the chosen options |
| `outcomes[].effects` | object | yes | `good` -> positive resource deltas + optional `unlocks`; `weak` -> `{"retry": true}` |

## Child-safety invariants (validator must enforce)

1. No outcome may reward the `alles_halb` / loudest-idea path.
2. `good` requires the character who needed help to be included.
3. No timers, no fail-states beyond `retry`, no scary characters in `characters`.
4. Language: German first, short sentences, no jargon.
5. A character with `can_vote: false` may influence the story dialogue but never determines the vote.

## Generation flow (future)

1. Generator emits the JSON record.
2. Validator checks the field contract + child-safety invariants.
3. Serializer writes a `.tres` (`MissionData`) into `game/resources/missions/`.
4. CI headless boot validates the resource loads; the mission appears in the game.

Until the API exists, the same contract is satisfied by hand-authored `.tres`
files (see [`mission-authoring.md`](./mission-authoring.md)).
