# Hannahs Lichtwald – Mission 01 screen (skeleton)
# Loads mission_01_spielplatz.tres, lets the player pick options in one of
# three decision modes, then shows the evaluated outcome.
extends Control

const MISSION_PATH: String = "res://resources/missions/mission_01_spielplatz.tres"

var mission: MissionData
var costs: Dictionary = {}
var selected: Array[StringName] = []
var mode: StringName = &"self"

@onready var title_label: Label = %TitleLabel
@onready var intro_label: Label = %IntroLabel
@onready var characters_hbox: HBoxContainer = %CharactersHBox
@onready var options_flow: FlowContainer = %OptionsFlow
@onready var mode_self_button: Button = %ModeSelfButton
@onready var mode_vote_button: Button = %ModeVoteButton
@onready var mode_moderate_button: Button = %ModeModerateButton
@onready var confirm_button: Button = %ConfirmButton
@onready var outcome_label: Label = %OutcomeLabel
@onready var outcome_panel: Panel = %OutcomePanel

var option_buttons: Dictionary = {}


func _ready() -> void:
	mission = load(MISSION_PATH) as MissionData
	_build_ui()
	SignalBus.display_language_updated.connect(_on_display_language_updated)


func _build_ui() -> void:
	title_label.text = mission.title
	intro_label.text = mission.intro_text
	for option: Dictionary in mission.options:
		var option_id: StringName = option.id
		costs[option_id] = int(option.cost)
		var button: Button = Button.new()
		button.toggle_mode = true
		button.text = "%s – %s Lichttropfen" % [option.label, option.cost]
		button.toggled.connect(_on_option_toggled.bind(option_id))
		options_flow.add_child(button)
		option_buttons[option_id] = button
	_build_characters()
	_refresh_confirm()


# TODO-IMG: replace with per-character portraits (see docs/asset-strip.md, Batch C)
func _build_characters() -> void:
	var portrait: Texture2D = load("res://assets/image/missions/char_portrait_placeholder.png")
	for character: Dictionary in mission.characters:
		var vbox: VBoxContainer = VBoxContainer.new()
		var texture_rect: TextureRect = TextureRect.new()
		texture_rect.custom_minimum_size = Vector2(72, 72)
		texture_rect.texture = portrait
		texture_rect.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
		var name_label: Label = Label.new()
		name_label.text = str(character.name)
		name_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		vbox.add_child(texture_rect)
		vbox.add_child(name_label)
		characters_hbox.add_child(vbox)


func _on_option_toggled(toggled_on: bool, option_id: StringName) -> void:
	if toggled_on:
		if not selected.has(option_id):
			selected.append(option_id)
	else:
		selected.erase(option_id)
	_refresh_confirm()


func _on_mode_self_button_up() -> void:
	mode = &"self"
	_refresh_confirm()


func _on_mode_vote_button_up() -> void:
	mode = &"vote"
	_refresh_confirm()


func _on_mode_moderate_button_up() -> void:
	mode = &"moderate"
	_refresh_confirm()


func _refresh_confirm() -> void:
	if mode == &"moderate":
		confirm_button.disabled = false
		return
	confirm_button.disabled = not Decision.is_valid_self_choice(selected, mission.resource_pool, costs)


func _on_confirm_button_up() -> void:
	var built: Array[StringName]
	match mode:
		&"self":
			built = selected.duplicate()
		&"vote":
			var wishes: Dictionary = {}
			var freundschaft: Dictionary = {}
			for character: Dictionary in mission.characters:
				wishes[character.id] = character.wish
				freundschaft[character.id] = 0
			var winner: StringName = Decision.vote(wishes, freundschaft)
			built = [winner] if winner != &"" else []
		&"moderate":
			built = Decision.moderate_compromise()
	_show_outcome(built)


func _show_outcome(built: Array[StringName]) -> void:
	var outcome_id: StringName = Outcomes.evaluate(built)
	var outcome: Dictionary = _find_outcome(outcome_id)
	var effects: Dictionary = Outcomes.effects_for(outcome_id)
	var effects_text: String = _format_effects(effects)
	outcome_label.text = str(outcome.get("result_text", "")) + "\n\n" + effects_text
	outcome_panel.visible = true
	confirm_button.disabled = true
	for button: Button in option_buttons.values():
		button.disabled = true


func _find_outcome(outcome_id: StringName) -> Dictionary:
	for outcome: Dictionary in mission.outcomes:
		if outcome.id == outcome_id:
			return outcome
	return {}


func _format_effects(effects: Dictionary) -> String:
	var parts: Array[String] = []
	if effects.has("mut_sterne"):
		parts.append("+%s Mut-Sterne" % effects["mut_sterne"])
	if effects.has("freundschaft"):
		parts.append("+%s Freundschaft" % effects["freundschaft"])
	if effects.has("unlocks"):
		parts.append("Freigeschaltet: Licht-Rat")
	if effects.has("schatten_der_eile"):
		parts.append("Der Schatten der Eile wird stärker…")
	if effects.has("retry"):
		parts.append("Diese Mission kann später wiederholt werden.")
	return " | ".join(parts)


func _on_back_button_up() -> void:
	Scene.change_scene("main_scene")


func _on_display_language_updated() -> void:
	# TODO-TRANS: re-localize mission text once de/en CSV keys exist.
	pass
