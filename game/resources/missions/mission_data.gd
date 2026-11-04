# Hannahs Lichtwald – mission content layer.
# Data model per docs 01 §5 / 02 §7 of the Lichtwald plan.
#
# Field contract (enforced by MissionValidator.validate):
#   id             String   – internal id, must start with "mission_"
#                             (public slug alias lives in the URL handler).
#   title          String   – 1–60 characters.
#   intro_text     String   – non-empty; the read-aloud opening.
#   characters     Array[Dictionary] – at least 3, unique ids. Each:
#       id         StringName – unique character id.
#       name       String   – display name, non-empty.
#       wish       StringName – id of the option this character wants;
#                             must reference a known option.
#       mood       String   – short mood descriptor, non-empty.
#       can_vote   bool     – whether the character votes in Vote mode.
#                             A false value never decides a vote.
#       dialogs    Array[String] – at least one non-empty line; the
#                             transcript shown when the child listens.
#   resource_pool  int      – Lichttropfen available, at least 50.
#   options        Array[Dictionary] – at least 3, unique ids. Each:
#       id         StringName – unique option id.
#       label      String   – display label, non-empty.
#       cost       int      – positive, must not exceed resource_pool.
#       effect     String   – short one-line description of the effect.
#   decision_modes Array[String] – subset of "self", "vote", "moderate";
#                             at least one, no duplicates.
#   outcomes       Array[Dictionary] – must include good/middle/weak,
#                             unique ids. Each:
#       id         StringName – "good", "middle", or "weak" (plus extras).
#       condition  String   – human-readable predicate, non-empty.
#       result_text String  – the shown outcome text, non-empty.
#       effects    Dictionary – world effects applied exactly once, e.g.
#                             {mut_sterne, freundschaft, unlocks,
#                              schatten_der_eile, retry}.
class_name MissionData
extends Resource

@export var id: String
@export var title: String
@export var intro_text: String
@export var characters: Array[Dictionary]  # id, name, wish, mood, can_vote, dialogs
@export var resource_pool: int
@export var options: Array[Dictionary]  # id, label, cost, effect
@export var decision_modes: Array[String]  # "self", "vote", "moderate"
@export var outcomes: Array[Dictionary]  # id, condition, result_text, effects
