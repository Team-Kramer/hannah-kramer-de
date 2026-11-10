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

## Die vier Lichtwald-Ressourcen

Der Lichtwald kennt vier Ressourcen (Quelle: `01-Strategie-und-Start.md` §4).
So sind sie im Spiel gespeichert und sichtbar:

| Ressource | Bedeutung | Spielzustand | Wo sie wirkt |
|---|---|---|---|
| **Lichttropfen** | Energie / Baumaterial | `mission.resource_pool` (pro Mission, z. B. 120) | Budget für die gewählten Optionen; wird im Intro und in der Modus-Hilfe angezeigt |
| **Mut-Sterne** | Zivilcourage & schwierige Entscheidungen | `SaveFile.mission_state.mut_sterne` (weltweit, startet bei 0) | Werden von `good`-Enden vergeben; der Moderations-Modus kostet `Decision.MUT_COST_MODERATE` (5) Mut-Sterne |
| **Freundschafts-Funken** | Beziehungen & Vertrauen | `SaveFile.mission_state.character_freundschaft` (pro Figur, startet bei 0) | Erhöhen das Stimmengewicht im Abstimmungsmodus: `1 + 0,1 × Freundschaft`; werden von `good`-Enden vergeben |
| **Rhythmus-Noten** | Tanz, Freude, gemeinsamer Takt | `SaveFile.mission_state.rhythmus` (weltweit, startet bei 0) | Noch nicht in Mission 01 vergeben; Platzhalter für spätere Missions-Enden (z. B. gemeinsame Feier) |

Regeln:

- **Lichttropfen** sind ein pro-Missions-Budget: Sie werden nicht abgezogen,
  sondern begrenzen, was sich eine Mission leisten kann. Jede Option muss
  einzeln und jede zulässige Kombination innerhalb des Pools liegen.
- **Mut-Sterne, Freundschaft und Rhythmus** sind dauerhafte Weltwerte im
  `SaveFile.mission_state` und wachsen über alle Missionen an.
- Ein `good`-Ende vergibt immer einen positiven Weltwert (Mut-Sterne oder
  Freundschaft) – das prüft der Validator.
- Ein `middle`-Ende vergibt **keine** Weltwerte und keine Freischaltungen.
- Ein `weak`-Ende vergibt nichts, löscht aber auch nichts: Die Mission bleibt
  wiederholbar, und bereits gesammelte Werte bleiben erhalten.
- Der Schatten der Eile ist **keine** Ressource: Er ist eine nicht-zeitgesteuerte
  Story-Stimme, die drängeln darf, aber nie gewinnt.

## Regeln für den Lichtwald (child-safe)

- Keine Angstfiguren, keine Zeitdruck-Timer, keine Strafen.
- Der „Schatten" darf drängeln, aber nie gewinnen.
- Jedes `good`-Ende endet mit einem Satz, der Mut macht.
- Sprache: kurze Sätze, keine Fachbegriffe, Deutsch zuerst.
