# Asset Strip Log — Hannahs Lichtwald

This port of [GodotProjectZero](https://github.com/TinyTakinTeller/GodotProjectZero)
contains **no original art or audio** from the upstream project. All original
assets were stripped and replaced with generated placeholders so the game
engine compiles and runs, while avoiding all licensing issues.

Second step (later): replace placeholders with real Lichtwald content,
generated in AI batches using the descriptions below.

## Palette (Lichtwald)

| Name | Hex | RGB |
|---|---|---|
| Indigo (night sky) | `#1E1B4B` | 30, 27, 75 |
| Cream (paper / light) | `#FFF9EF` | 255, 249, 239 |
| Gold (Lichttropfen) | `#F5B942` | 245, 185, 66 |

Style: warm, soft, storybook illustration. Never scary. Rounded shapes,
gentle gradients, soft light.

---

## TODO-IMG — image batch list

### Batch A — UI / icons

| File | Size | Description for AI generation |
|---|---|---|
| `assets/image/icon/project_icon.png` | 128×128 | Simple app icon: a small golden light-drop (teardrop shape) glowing on a deep indigo night-sky background, soft glow, storybook style |
| `assets/image/boot/godot_boot_cover.png` | 960×540 | Boot splash: a quiet forest clearing at night, deep indigo sky with tiny stars, a few warm golden lights floating between the trees, soft cream-colored moonlight, no text, calm and inviting |
| `assets/image/art/heart.png` | 128×128 | A soft cream-colored heart with a gentle golden outline, flat storybook style, transparent background |
| `assets/image/art/cat.png` | 256×256 | A small friendly round cat in cream and soft brown, big kind eyes, sitting, storybook illustration, transparent background |
| `assets/image/art/rabbit.png` | 256×256 | A small friendly round rabbit in soft grey-cream, long ears, gentle expression, sitting, storybook illustration, transparent background |
| `assets/image/soul/soul.png` | 128×128 | A soft glowing orb of warm gold light with a faint inner swirl, like a captured firefly, on transparent background |

### Batch B — Mission 01 scene

| File | Size | Description for AI generation |
|---|---|---|
| `assets/image/missions/spielplatz_01_start.png` | 960×540 | A small village playground at dusk: a broken wooden slide with a torn side, a missing bench, a cracked ball pit, deep indigo sky with first stars, warm golden lantern light from a nearby house, soft storybook illustration, no people, melancholic but hopeful |

### Batch C — Mission 01 character portraits

| File | Size | Description for AI generation |
|---|---|---|
| `assets/image/missions/char_portrait_placeholder.png` | 256×256 | **Generic placeholder** — replace with 5 individual portraits: (1) Juan, 8, wheelchair, brown skin, big smile; (2) Lina, 9, red hair, holding a football; (3) Tobi, 8, blonde, messy hair, always in a hurry; (4) Oma Linde, 70s, grey bun, kind wrinkles, cardigan; (5) Der Schatten der Eile — a soft shadowy figure with a clock for a face, not scary, more like a tired grey mist. All: head-and-shoulders, storybook style, soft indigo background |

---

## TODO-AUDIO — audio batch list

All 42 audio files below are **silent placeholders** (valid WAV/MP3, zero
content). They exist so the engine's audio references keep working.

### Batch D — ambient music (replace the 6 MP3 loops)

| File | Description for AI generation |
|---|---|
| `assets/audio/skyler_newsome/forest_arr_mstr_loop.mp3` | Gentle ambient forest loop: soft wind in leaves, distant crickets, warm pad, 60–80 BPM feel, calm, 30–60 s, loopable |
| `assets/audio/skyler_newsome/axes_arr_mstr_loop.mp3` | Same forest ambience but slightly more active: soft wood-chopping rhythm in the distance, still gentle |
| `assets/audio/joseph_philip_burke/forest_song_compressed.mp3` | Warm storybook lullaby: music box + soft strings, major key, hopeful, 30–60 s |
| `assets/audio/joseph_philip_burke/axes_to_a_bed_compressed.mp3` | Same lullaby, quieter ending variation |
| `assets/audio/freemusicarchive_org/universfield/criminal_district/criminal_district.mp3` | **Do not generate** — this track is unused; keep silent or delete with its reference |
| `assets/audio/freemusicarchive_org/universfield/corpse_rot/corpse_rot.mp3` | **Do not generate** — unused; keep silent or delete with its reference |
| `assets/audio/pixabay/junipersona/to_the_death.mp3` | Soft "shadow" theme: low gentle drone with a slow ticking clock, unsettling but NOT scary, like a yawn, 30 s |

### Batch E — UI sounds (replace the interface WAVs)

| File | Description for AI generation |
|---|---|
| `assets/audio/indie_friendly_sounds_survival/indie_friendly_rpg_sounds/interface/ui_simple_*.wav` (6 files) | Soft UI clicks: short warm "tok" sounds, like tapping wood, 0.1–0.2 s each, 6 slight variations |
| `assets/audio/indie_friendly_sounds_survival/indie_friendly_rpg_sounds/interface/magic_chimes_1_7.wav` | A tiny rising two-note chime (like a small bell), warm, 0.3 s |
| `assets/audio/indie_friendly_sounds_survival/indie_friendly_rpg_sounds/interface/magical_interface_3_2.wav` | Soft "receive" sound: a gentle whoosh ending in a warm chime, 0.4 s |
| `assets/audio/custom_sfx/piano_1.wav` | A single soft piano note, middle C, felt piano, 0.5 s |

### Batch F — world sounds (replace the survival/RPG WAVs)

| File | Description for AI generation |
|---|---|
| `assets/audio/indie_friendly_sounds_survival/indie_friendly_survival_sounds/rock_moving_1_5.wav` | Soft thud of a small stone rolling, 0.3 s |
| `assets/audio/indie_friendly_sounds_survival/indie_friendly_survival_sounds/fire_burst_1_1.wav` | A gentle fire "pop" (like a cozy campfire), 0.3 s |
| `assets/audio/indie_friendly_sounds_survival/indie_friendly_rpg_sounds/misc/fire_whoosh_1_1.wav` | Soft fire whoosh, 0.4 s |
| `assets/audio/indie_friendly_sounds_survival/indie_friendly_rpg_sounds/misc/coins_1_1.wav` | Tiny bright coin "ding" (Lichttropfen collect), 0.2 s |
| `assets/audio/indie_friendly_sounds_survival/_edited/coins_2_1_cut.wav` | Same coin ding, slightly lower pitch |
| `assets/audio/indie_friendly_sounds_survival/indie_friendly_rpg_sounds/misc/writing_1_1.wav` / `writing_1_4.wav` | Soft pencil on paper, 0.3 s, 2 variations |
| `assets/audio/indie_friendly_sounds_survival/_edited/book_1_1_cut.wav` | Gentle page turn, 0.3 s |
| `assets/audio/indie_friendly_sounds_survival/_edited/magical_interface_3_2_cut.wav` | Soft chime, 0.3 s |
| `assets/audio/indie_friendly_sounds_survival/_edited/wood_chop_1.wav` | Soft wood tap (not a heavy chop), 0.2 s |
| `assets/audio/indie_friendly_sounds_survival/_edited/wood_bundle_1.wav` | Soft "bundle" rustle, 0.3 s |
| `assets/audio/indie_friendly_sounds_survival/_edited/arrow_hit_1_1_cut.wav` | **Do not generate** — combat SFX, unused in Lichtwald; keep silent |
| `assets/audio/indie_friendly_sounds_survival/indie_friendly_rpg_sounds/combat/*.wav` (7 files) | **Do not generate** — combat SFX, unused in Lichtwald; keep silent |
| `assets/audio/indie_friendly_sounds_survival/_resource/*.wav` (13 files) | **Do not generate** — unused world SFX; keep silent (delete with references in a cleanup pass) |
| `assets/audio/freesound_org/keyboard_typing/keyboard_typing.mp3` | Soft keyboard typing, 2 s loop |
| `assets/audio/freesound_org/heartbeat_80bpm/loudernoises_heartbeat_80bpm.wav` | **Do not generate** — keep silent (unused) |
| `assets/audio/freesound_org/fart/short_definite_fart.wav` | **Do not generate** — keep silent (unused, original was a joke SFX) |

---

## What was removed (summary)

- All original art (Navy_Raccoon, CC BY-NC-SA 4.0) → placeholders above
- All original music (Skyler Newsome, Joseph Philip Burke, Pixabay,
  FreeMusicArchive) → silent placeholders
- All original SFX (Indie Friendly Sounds, Freesound.org) → silent placeholders
- 7 of 9 languages → de + en only (`assets/i18n/localization.csv`,
  de column = TODO-TRANS)
- `language_selection` scene (9-language picker) → `language_toggle_de_en`
- All unreferenced scenes/scripts/assets (see `PLAN_GODOT_ASSET_STRIP.md`
  in the hannah-kramer-saas repo for the full folder/file triage table)

## Replacement workflow (second step)

1. Generate images in batches A–C with an AI image generator, using the
   descriptions above verbatim.
2. Generate audio in batches D–F (skip "Do not generate" rows).
3. Overwrite the placeholder files in place — **file names and paths must
   stay identical** (they are referenced by code and scenes).
4. Re-run `Godot --headless --path game --quit-after 60` and re-export.
