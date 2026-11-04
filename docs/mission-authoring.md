# Eigene Mission bauen (German, kind-friendly)

Eine Mission ist eine kleine Geschichte mit einer Entscheidung, die Hannah
und ihre Freunde gemeinsam treffen. Diese Anleitung zeigt Schritt für Schritt,
wie du eine neue Mission für den Lichtwald baust – am Beispiel von **Mission 01
„Der kaputte Spielplatz"** als Referenz.

## Wie eine Mission aufgebaut ist

Jede Mission ist eine Godot-`Resource` vom Typ `MissionData`
(Schema: [`game/resources/missions/mission_data.gd`](../game/resources/missions/mission_data.gd)):

| Feld | Was es ist | Beispiel (Mission 01) |
|---|---|---|
| `id` | Technischer Name, klein mit Unterstrichen | `mission_spielplatz` |
| `title` | Name, den die Kinder sehen | „Der kaputte Spielplatz" |
| `intro_text` | Der Einstieg – kurz, in einfachen Sätzen | „Im Lichtwald gibt es einen alten Spielplatz…" |
| `characters` | Die Figuren: `id`, `name`, `wish`, `mood`, `can_vote`, `dialogs` | Juan, Lina, Tobi, Oma Linde, Schatten der Eile |
| `resource_pool` | Wie viele Lichttropfen es zu verteilen gibt | `120` |
| `options` | Die Bausteine: `id`, `label`, `cost`, `effect` | Barrierefreier Weg (50), Rutsche (40), … |
| `decision_modes` | Wie entschieden wird | `["self", "vote", "moderate"]` |
| `outcomes` | Die Enden: `id`, `condition`, `result_text`, `effects` | `good` / `middle` / `weak` |

Die technische ID der ersten Mission ist `mission_spielplatz`; der öffentliche
URL-Slug ist `mission-01`. Der Deep-Link ordnet diesen Slug ausdrücklich der
Mission 01 zu. Neue Missionen bekommen jeweils eine eindeutige technische ID
und einen dokumentierten öffentlichen Slug.
`can_vote` ist ein Pflichtfeld: Bewohnerinnen und Bewohner stimmen mit; der
Schatten der Eile darf drängeln, aber nicht abstimmen oder gewinnen.
Im Abstimmungsmodus zählt jede stimmberechtigte Figur mit dem Gewicht
`1 + 0,1 × Freundschaft`. Bei Gleichstand gewinnt der Wunsch, der von der
am wenigsten gehörten Figur unterstützt wird; weitere Gleichstände werden
stabil nach Figuren- und Options-ID entschieden.

## Schritt für Schritt

1. **Intro schreiben.** 3–5 kurze Sätze. Was ist kaputt oder neu? Wer ist da?
   Am Ende eine Frage, die neugierig macht („Aber wer entscheidet eigentlich?").
2. **Figuren besetzen.** Jede Figur hat einen Wunsch (`wish`) und eine Stimmung
   (`mood`). Mindestens eine Figur braucht Hilfe (z. B. Juan im Rollstuhl) –
   das ist der Kern der Entscheidung. Eine Figur darf drängeln
   („Schatten der Eile") – aber nie gewinnen.
3. **Optionen mit Kosten.** Jede Option kostet Lichttropfen. Die gute Option
   muss sich leisten *lassen*, aber nicht trivial sein. Eine „alles halb"-Option
   darf existieren, muss aber zu einem schwachen Ende führen.
4. **Enden schreiben.** Mindestens drei:
   - `good` – alle kommen dran, besonders die, die Hilfe brauchten.
   - `middle` – nur eine der lautesten Ideen wird umgesetzt; niemand bekommt
     einen Ressourcenbonus oder Freischaltungen.
   - `weak` – niemand ist richtig zufrieden → `effects: {"retry": true}`.
   Der Text des `good`-Endes darf etwas Neues freischalten
   (`effects: {"unlocks": &"licht_rat"}`).
   In Mission 01 wird zuerst `alles_halb`, dann `good`, dann die spezielle
   lauteste-only-`middle`-Bedingung geprüft; andere Ergebnisse, bei denen Juan
   nicht mitmachen kann, sind `weak` und bleiben wiederholbar.
5. **Validieren.** `mission_data.gd` ist eine `Resource` – lege die `.tres`-Datei
   in `game/resources/missions/` und öffne sie einmal im Godot-Editor (oder
   starte headless: `godot --headless --path game --quit`). Fehler im Schema
   erscheinen als rote Meldungen.
6. **Pushen.** Commit + Push nach `main`. Die CI baut und deployet automatisch.

## Referenz: Mission 01

Komplettes Beispiel: [`game/resources/missions/mission_01_spielplatz.tres`](../game/resources/missions/mission_01_spielplatz.tres)
– 5 Figuren, 5 Optionen (120 Tropfen), 3 Modi, 3 Enden. Kopiere die Struktur,
schreibe deinen eigenen Inhalt.

## Regeln für den Lichtwald (child-safe)

- Keine Angstfiguren, keine Zeitdruck-Timer, keine Strafen.
- Der „Schatten" darf drängeln, aber nie gewinnen.
- Jedes `good`-Ende endet mit einem Satz, der Mut macht.
- Sprache: kurze Sätze, keine Fachbegriffe, Deutsch zuerst.
