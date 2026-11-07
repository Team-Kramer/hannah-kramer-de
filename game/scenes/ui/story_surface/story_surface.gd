class_name StorySurface
extends MarginContainer
## PG-04: renders the current illustrated story beat of the active story run
## inside the integrated world/diary surface (no separate mission screen).
##
## It is a thin view over the RuleBridge story facade: it never mutates story
## state itself, it only reads the run's current node + pending input and
## forwards player actions to `RuleBridge.story_*`. Asset records are read from
## the package's `assets` array (the catalog is an id set, not a record lookup);
## an asset with an `imagePath` renders the real image, otherwise a clearly
## marked placeholder shows the art brief.

const EventEngine := preload("res://global/engine/event_engine.gd")

@onready var panel: Panel = $Panel
@onready var title_label: Label = $Panel/MarginContainer/VBoxContainer/TitleLabel
@onready var illustration: TextureRect = $Panel/MarginContainer/VBoxContainer/HBoxContainer/Illustration
@onready var placeholder_label: Label = $Panel/MarginContainer/VBoxContainer/HBoxContainer/Illustration/PlaceholderLabel
@onready var brief_label: Label = $Panel/MarginContainer/VBoxContainer/HBoxContainer/Illustration/BriefLabel
@onready var caption_label: Label = $Panel/MarginContainer/VBoxContainer/HBoxContainer/TextVBoxContainer/CaptionLabel
@onready var speaker_label: Label = $Panel/MarginContainer/VBoxContainer/HBoxContainer/TextVBoxContainer/SpeakerLabel
@onready var dialogue_label: Label = $Panel/MarginContainer/VBoxContainer/HBoxContainer/TextVBoxContainer/DialogueLabel
@onready var buttons: VBoxContainer = $Panel/MarginContainer/VBoxContainer/HBoxContainer/TextVBoxContainer/Buttons

var _bridge: Node = null
var _story_id: String = ""

func setup(bridge: Node) -> void:
	_bridge = bridge

func open_story(story_id: String) -> void:
	_story_id = story_id
	_render()

func close() -> void:
	visible = false

func _ready() -> void:
	visible = false

# ---------------------------------------------------------------------------
# Rendering
# ---------------------------------------------------------------------------

func _render() -> void:
	if _bridge == null:
		push_warning("StorySurface: no bridge wired, hiding")
		visible = false
		return
	if _story_id == "":
		visible = false
		return
	var story: Dictionary = _bridge.get_story(_story_id)
	var state: Dictionary = _bridge.get_state()
	var runtime: Dictionary = state.get("story", {}).get("runtime", {})
	var node: Dictionary = _find_story_node(story, str(runtime.get("currentNodeId", "")))
	if node.is_empty():
		# Nothing is running yet: start the run, then render the first node.
		var begin: Dictionary = _bridge.story_begin(_story_id)
		if not begin.get("ok", false):
			push_warning("StorySurface: begin failed: %s" % str(begin.get("error")))
			visible = false
			return
		_render()
		return
	var pending: Variant = runtime.get("pendingInput")
	var kind: String = str(pending.get("kind")) if pending is Dictionary else ""
	# Title: the story's title key when present.
	var title_key: String = str(story.get("titleKey", ""))
	title_label.text = _t(title_key) if title_key != "" else ""
	# Caption / prompt.
	var text_key: String = str(node.get("captionKey", node.get("promptKey", "")))
	caption_label.text = _t(text_key)
	# Dialogue line for conversation nodes (speaker + text of the current
	# dialogue node); hidden for all other node types.
	_render_dialogue(node, runtime)
	# Illustration.
	_render_illustration(node)
	# Buttons per pending input kind.
	_build_buttons(node, kind, pending if pending is Dictionary else {})
	visible = true

func _render_illustration(node: Dictionary) -> void:
	var asset: Dictionary = _asset_record(node.get("illustration", {}).get("assetId", ""))
	var image_path: String = str(asset.get("imagePath", ""))
	if image_path != "" and ResourceLoader.exists(image_path):
		illustration.texture = load(image_path)
		illustration.visible = true
		placeholder_label.visible = false
		brief_label.visible = false
	else:
		illustration.texture = null
		illustration.visible = false
		placeholder_label.visible = true
		brief_label.visible = true
		var asset_id: String = str(node.get("illustration", {}).get("assetId", ""))
		placeholder_label.text = "[illustration: %s]" % asset_id
		brief_label.text = str(asset.get("artBrief", ""))

func _render_dialogue(node: Dictionary, runtime: Dictionary) -> void:
	if str(node.get("type")) != "conversation":
		speaker_label.visible = false
		dialogue_label.visible = false
		return
	var conversation: Dictionary = _conversation(str(node.get("conversationId", "")))
	var dialogue_node: Dictionary = _dialogue_node(conversation, str(runtime.get("currentDialogueNodeId", "")))
	if dialogue_node.is_empty():
		speaker_label.visible = false
		dialogue_label.visible = false
		return
	var speaker: Dictionary = _npc_record(str(dialogue_node.get("speakerId", "")))
	speaker_label.text = _t(str(speaker.get("displayNameKey", "")))
	dialogue_label.text = _t(str(dialogue_node.get("textKey", "")))
	speaker_label.visible = speaker_label.text != ""
	dialogue_label.visible = dialogue_label.text != ""

func _build_buttons(node: Dictionary, kind: String, pending: Dictionary) -> void:
	for child in buttons.get_children():
		child.queue_free()
	match kind:
		"continue":
			_add_button(_t("story.continue"), Callable(self, "_on_continue"))
		"complete":
			_add_button(_t("story.continue"), Callable(self, "close"))
		"continueConversation":
			_add_button(_t("story.continue"), Callable(self, "_on_continue"))
		"storyChoice":
			for choice in _as_array(node.get("choices")):
				var label: String = _t(str(choice.get("labelKey", "")))
				var available: bool = _choice_available(choice)
				var cid: String = str(choice.get("id"))
				var eid: String = "story_%s_%s" % [_story_id, cid]
				_add_button(label, _make_choice(cid, eid), available)
		"conversationChoice":
			var conversation: Dictionary = _conversation(str(pending.get("conversationId", "")))
			var dialogue_node: Dictionary = _dialogue_node(conversation, str(pending.get("nodeId", "")))
			for choice in _as_array(dialogue_node.get("choices")):
				var label: String = _t(str(choice.get("labelKey", "")))
				var available: bool = _choice_available(choice)
				var cid: String = str(choice.get("id"))
				var eid: String = "conv_%s_%s" % [str(pending.get("conversationId", "")), cid]
				_add_button(label, _make_conv_choice(cid, eid), available)
		"blocked":
			_add_button(_t("story.conversation_hint"), Callable(self, "close"), false)
		_:
			pass

# ---------------------------------------------------------------------------
# Player actions (forwarded to the RuleBridge facade)
# ---------------------------------------------------------------------------

func _on_continue() -> void:
	_bridge.story_advance(_story_id)
	_render()

func _make_choice(choice_id: String, event_id: String) -> Callable:
	return func():
		_bridge.story_select_choice(_story_id, _current_node_id(), choice_id, event_id)
		_render()

func _make_conv_choice(choice_id: String, event_id: String) -> Callable:
	return func():
		_bridge.story_select_conversation_choice(_current_conversation_id(), choice_id, event_id)
		_render()

func _current_node_id() -> String:
	var runtime: Dictionary = _bridge.get_state().get("story", {}).get("runtime", {})
	return str(runtime.get("currentNodeId", ""))

func _current_conversation_id() -> String:
	var runtime: Dictionary = _bridge.get_state().get("story", {}).get("runtime", {})
	return str(runtime.get("currentDialogueId", ""))

# ---------------------------------------------------------------------------
# Lookups
# ---------------------------------------------------------------------------

func _choice_available(choice: Dictionary) -> bool:
	var when: Variant = choice.get("when")
	if when == null:
		return true
	var result: Dictionary = EventEngine.evaluate_condition(when, _bridge.get_state(), _bridge.get_catalog())
	return bool(result.get("value", false)) if result.get("ok", false) else false

func _find_story_node(story: Dictionary, node_id: String) -> Dictionary:
	for node in _as_array(story.get("nodes")):
		if node is Dictionary and str(node.get("id")) == node_id:
			return node
	return {}

func _conversation(conversation_id: String) -> Dictionary:
	for conversation in _bridge.get_conversations():
		if str(conversation.get("id")) == conversation_id:
			return conversation
	return {}

func _dialogue_node(conversation: Dictionary, node_id: String) -> Dictionary:
	for node in _as_array(conversation.get("nodes")):
		if node is Dictionary and str(node.get("id")) == node_id:
			return node
	return {}

func _npc_record(npc_id: String) -> Dictionary:
	if npc_id == "":
		return {}
	for npc in _bridge.get_npcs():
		if npc is Dictionary and str(npc.get("id")) == npc_id:
			return npc
	return {}

## The catalog is an id set, so asset records are read from the package's
## `assets` array by scanning for the id.
func _asset_record(asset_id: String) -> Dictionary:
	if asset_id == "":
		return {}
	var assets: Array = _bridge.get_pkg().get("assets", {}).get("assets", [])
	for asset in assets:
		if asset is Dictionary and str(asset.get("id")) == asset_id:
			return asset
	return {}

func _t(key: String) -> String:
	if key == "":
		return ""
	var locale: String = str(SaveFile.locale)
	var strings: Dictionary = _bridge.get_pkg().get("locales", {}).get(locale, {}).get("strings", {})
	return str(strings.get(key, key))

func _add_button(text: String, pressed: Callable, available: bool = true) -> void:
	var button := Button.new()
	button.text = text
	button.disabled = not available
	button.custom_minimum_size.y = 48
	button.pressed.connect(pressed)
	buttons.add_child(button)

func _as_array(value: Variant) -> Array:
	return value if value is Array else []
