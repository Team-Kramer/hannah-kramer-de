# Hannahs Lichtwald – Mission 01 content layer
# Data model per docs 01 §5 / 02 §7 of the Lichtwald plan.
extends Resource
class_name MissionData

@export var id: String
@export var title: String
@export var intro_text: String
@export var characters: Array[Dictionary]  # id, name, wish, mood, dialogs
@export var resource_pool: int
@export var options: Array[Dictionary]  # id, label, cost, effect
@export var decision_modes: Array[String]  # "self", "vote", "moderate"
@export var outcomes: Array[Dictionary]  # id, condition, result_text, effects
