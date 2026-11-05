# Hannahs Lichtwald – Mission 01 screen.
# Loads mission_01_spielplatz.tres, lets the player hear the characters and
# pick options in one of three decision modes, then shows the evaluated outcome.
extends Control

const MISSION_PATH: String = "res://resources/missions/mission_01_spielplatz.tres"

const STATE_INTRO: StringName = &"intro"
const STATE_LISTENING: StringName = &"listening"
const STATE_DECISION: StringName = &"decision"
const STATE_OUTCOME: StringName = &"outcome"

var mission: MissionData
var costs: Dictionary = {}
var selected: Array[StringName] = []
var mode: StringName = &"self"
var state: StringName = STATE_INTRO
var option_buttons: Dictionary = {}
var characters_by_id: Dictionary = {}
var dialogue_indices: Dictionary = {}
var listened_counts: Dictionary = {}
var character_status_labels: Dictionary = {}

@onready var title_label: Label = %TitleLabel
@onready var intro_label: Label = %IntroLabel
@onready var listen_label: Label = %ListenLabel
@onready var mode_help_label: Label = %ModeHelpLabel
@onready var continue_button: Button = %ContinueButton
@onready var characters_hbox: HBoxContainer = %CharactersHBox
@onready var options_flow: FlowContainer = %OptionsFlow
@onready var mode_self_button: Button = %ModeSelfButton
@onready var mode_vote_button: Button = %ModeVoteButton
@onready var mode_moderate_button: Button = %ModeModerateButton
@onready var confirm_button: Button = %ConfirmButton
@onready var outcome_label: Label = %OutcomeLabel
@onready var outcome_panel: Panel = %OutcomePanel
@onready var comic_flow: VBoxContainer = %ComicFlow


func _ready() -> void:
	mission = load(MISSION_PATH) as MissionData
	if mission == null:
		push_error("Could not load mission resource: %s" % MISSION_PATH)
		_disable_decision_controls()
		return
	var validation_errors: PackedStringArray = MissionValidator.validate(mission)
	if not validation_errors.is_empty():
		push_error("Mission data is invalid: %s" % "; ".join(validation_errors))
		_disable_decision_controls()
		return
	_build_ui()
	_set_state(STATE_INTRO)
	SignalBus.display_language_updated.connect(_on_display_language_updated)


func _build_ui() -> void:
	title_label.text = mission.title
	intro_label.text = mission.intro_text
	_on_mode_self_button_up()
	for option: Dictionary in mission.options:
		var option_id: StringName = option.id
		costs[option_id] = int(option.cost)
		var button: Button = Button.new()
		button.toggle_mode = true
		button.custom_minimum_size.y = 56
		button.text = "%s – %s Lichttropfen" % [option.label, option.cost]
		button.toggled.connect(_on_option_toggled.bind(option_id))
		options_flow.add_child(button)
		option_buttons[option_id] = button
	_build_characters()
	_build_comic_flow()
	_refresh_confirm()


func _build_comic_flow() -> void:
	for panel_data: Dictionary in mission.comic_panels:
		_add_comic_panel(panel_data)


func _add_comic_panel(panel_data: Dictionary) -> void:
	var panel: PanelContainer = PanelContainer.new()
	var vbox: VBoxContainer = VBoxContainer.new()
	vbox.add_theme_constant_override("separation", 4)
	var caption: Label = Label.new()
	caption.text = str(panel_data.get("caption", ""))
	caption.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	vbox.add_child(caption)
	panel.add_child(vbox)
	comic_flow.add_child(panel)


func _set_state(new_state: StringName) -> void:
	state = new_state
	var is_decision: bool = state == STATE_DECISION
	intro_label.visible = state == STATE_INTRO
	listen_label.visible = state == STATE_LISTENING or is_decision
	characters_hbox.visible = state == STATE_LISTENING or is_decision
	continue_button.visible = state == STATE_INTRO or state == STATE_LISTENING
	continue_button.text = "Zu den Stimmen" if state == STATE_INTRO else "Zur Entscheidung"
	options_flow.visible = is_decision
	mode_help_label.visible = is_decision
	mode_self_button.visible = is_decision
	mode_vote_button.visible = is_decision
	mode_moderate_button.visible = is_decision
	confirm_button.visible = is_decision
	outcome_panel.visible = state == STATE_OUTCOME
	_refresh_confirm()


func _on_continue_button_up() -> void:
	match state:
		STATE_INTRO:
			_set_state(STATE_LISTENING)
		STATE_LISTENING:
			_set_state(STATE_DECISION)


func _disable_decision_controls() -> void:
	continue_button.disabled = true
	confirm_button.disabled = true
	mode_self_button.disabled = true
	mode_vote_button.disabled = true
	mode_moderate_button.disabled = true


# TODO-IMG: replace with per-character portraits (see docs/asset-strip.md, Batch C)
func _build_characters() -> void:
	var portrait: Texture2D = load("res://assets/image/missions/char_portrait_placeholder.png")
	for character: Dictionary in mission.characters:
		var vbox: VBoxContainer = VBoxContainer.new()
		var texture_rect: TextureRect = TextureRect.new()
		texture_rect.custom_minimum_size = Vector2(72, 72)
		texture_rect.texture = portrait
		texture_rect.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
		var listen_button: Button = Button.new()
		listen_button.custom_minimum_size = Vector2(112, 56)
		listen_button.text = str(character.name)
		listen_button.pressed.connect(_on_character_pressed.bind(character.id))
		var status_label: Label = Label.new()
		status_label.text = "Noch nicht gehört"
		status_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		vbox.add_child(texture_rect)
		vbox.add_child(listen_button)
		vbox.add_child(status_label)
		characters_hbox.add_child(vbox)
		characters_by_id[character.id] = character
		character_status_labels[character.id] = status_label
		dialogue_indices[character.id] = 0
		listened_counts[character.id] = 0
	for button: Button in [
		mode_self_button,
		mode_vote_button,
		mode_moderate_button,
		confirm_button
	]:
		button.custom_minimum_size.y = 56


func _on_character_pressed(character_id: StringName) -> void:
	var character: Dictionary = characters_by_id.get(character_id, {})
	var dialogs: Array = character.get("dialogs", [])
	if dialogs.is_empty():
		push_error("Character %s has no dialogue to play." % character_id)
		return
	var dialogue_index: int = int(dialogue_indices.get(character_id, 0))
	listen_label.text = "%s: %s" % [
		character.get("name", character_id),
		dialogs[dialogue_index]
	]
	dialogue_indices[character_id] = (dialogue_index + 1) % dialogs.size()
	listened_counts[character_id] = 1
	character_status_labels[character_id].text = "Gehört · erneut anhören"


func _on_option_toggled(toggled_on: bool, option_id: StringName) -> void:
	if toggled_on:
		if not selected.has(option_id):
			selected.append(option_id)
	else:
		selected.erase(option_id)
	_refresh_confirm()


func _on_mode_self_button_up() -> void:
	mode = &"self"
	mode_help_label.text = (
		"Du wählst eine oder zwei Ideen. Zusammen dürfen sie höchstens %d Lichttropfen kosten."
		% mission.resource_pool
	)
	_refresh_confirm()


func _on_mode_vote_button_up() -> void:
	mode = &"vote"
	mode_help_label.text = (
		"Die Bewohner stimmen über ihre Wünsche ab. Du kannst vorher alle Stimmen anhören."
	)
	_refresh_confirm()


func _on_mode_moderate_button_up() -> void:
	mode = &"moderate"
	mode_help_label.text = "Du suchst einen Kompromiss, der mehrere Wünsche berücksichtigt."
	_refresh_confirm()


func _refresh_confirm() -> void:
	var finished: bool = outcome_panel.visible
	for option_id: StringName in option_buttons:
		option_buttons[option_id].disabled = finished or mode != &"self"
	mode_self_button.disabled = finished
	mode_vote_button.disabled = finished
	mode_moderate_button.disabled = finished
	if finished:
		confirm_button.disabled = true
		return
	match mode:
		&"vote", &"moderate":
			confirm_button.disabled = false
		_:
			confirm_button.disabled = not Decision.is_valid_self_choice(
				selected, mission.resource_pool, costs
			)


func _on_confirm_button_up() -> void:
	if state != STATE_DECISION or confirm_button.disabled:
		return
	var built: Array[StringName]
	match mode:
		&"self":
			built = selected.duplicate()
		&"vote":
			var wishes: Dictionary = {}
			var freundschaft: Dictionary = {}
			for character: Dictionary in mission.characters:
				if not character.can_vote:
					continue
				wishes[character.id] = character.wish
				freundschaft[character.id] = 0
			var winner: StringName = Decision.vote(wishes, freundschaft, listened_counts)
			built = []
			if winner != &"":
				built.append(winner)
		&"moderate":
			built = Decision.moderate_compromise()
	_show_outcome(built)


func _show_outcome(built: Array[StringName]) -> void:
	var outcome_id: StringName = Outcomes.evaluate(built)
	var outcome: Dictionary = _find_outcome(outcome_id)
	if outcome.is_empty():
		push_error("Mission %s has no outcome for %s." % [mission.id, outcome_id])
		outcome_label.text = "Das Ergebnis konnte nicht geladen werden. Bitte versuche es noch einmal."
		_set_state(STATE_OUTCOME)
		return
	var effects: Dictionary = Outcomes.effects_for(outcome_id)
	var effects_text: String = _format_effects(effects)
	outcome_label.text = str(outcome.get("result_text", "")) + "\n\n" + effects_text
	_set_state(STATE_OUTCOME)


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
