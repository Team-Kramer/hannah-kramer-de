class_name StoryRun
extends RefCounted
## Resumable story-run state machine (DEC-03).
##
## Navigates an authored story graph (storyBeat / decision / conversation /
## outcome nodes) against the shared rule-engine state produced by
## [EventEngine.initial_state]. It is a pure, static, headless-testable module
## with no Node, no SaveFile coupling, and no production signal emission: the
## RuleBridge (or a future story bridge) owns persistence and signal
## translation and calls these functions to drive a run.
##
## Semantics are a direct port of the F4 runtime prototype
## (docs/lichtwald_content_inspector 2/tests/f4-f6-runtime.test.cjs):
##   * entering a node records the visit and sets `runtime.pendingInput`;
##   * `advance_story` walks single-transition continuations;
##   * choices are gated by `when` conditions and apply effects atomically on a
##     draft clone (a failing effect rolls the whole input back);
##   * outcome effects and choice inputs are idempotent via
##     `appliedOutcomeNodeIds` / `processedChoiceInputs`.
##
## Every public function mutates `state` in place on success and returns a
## result Dictionary. Errors are returned as `{ "ok": false, "error": ... }`
## (never raised), so callers can surface them to the player.

const EventEngine := preload("res://global/engine/event_engine.gd")


## Flatten the assembled package's per-NPC conversation documents into one
## array of conversation objects, the shape the state machine navigates.
static func flatten_conversations(pkg: Dictionary) -> Array:
	var conversations: Array = []
	for npc_id in pkg.get("npcs", {}):
		var npc_doc: Variant = pkg["npcs"][npc_id]
		if not (npc_doc is Dictionary):
			continue
		for conversation in _as_array(npc_doc.get("conversations")):
			if conversation is Dictionary:
				conversations.append(conversation)
	return conversations


## Start a story run at its start node. Fails if a run is already active.
static func begin_story(story: Dictionary, state: Dictionary, conversations: Array, catalog: Dictionary, pkg: Dictionary) -> Dictionary:
	var runtime: Dictionary = state["story"]["runtime"]
	if runtime.get("currentNodeId") != null:
		return { "ok": false, "error": "story has already started" }
	return enter_story_node(story, str(story.get("startNodeId", "")), state, conversations, catalog, pkg)


## Walk the run forward. Returns a `status`:
##   * "advanced"         moved to the next node
##   * "complete"         the run reached a terminal node
##   * "branch_required"  the current node has multiple transitions
##   * "waiting"          a player input (choice / conversation) is required
static func advance_story(story: Dictionary, state: Dictionary, conversations: Array, catalog: Dictionary, pkg: Dictionary) -> Dictionary:
	var runtime: Dictionary = state["story"]["runtime"]
	var node: Dictionary = _find_node(story, str(runtime.get("currentNodeId")))
	if node.is_empty():
		return { "ok": false, "error": "story has no current node" }
	var pending: Variant = runtime.get("pendingInput")
	var pending_kind: String = str(pending.get("kind")) if pending is Dictionary else ""
	if pending_kind == "complete":
		return { "ok": true, "status": "complete" }
	if pending_kind == "continue":
		var transitions: Array = _as_array(node.get("transitions"))
		if transitions.size() != 1:
			return { "ok": true, "status": "branch_required" if transitions.size() > 0 else "complete" }
		var enter: Dictionary = enter_story_node(story, str(transitions[0].get("to")), state, conversations, catalog, pkg)
		if not enter["ok"]:
			return enter
		var next_kind: Variant = runtime.get("pendingInput")
		return { "ok": true, "status": "complete" if next_kind is Dictionary and str(next_kind.get("kind")) == "complete" else "advanced" }
	if pending_kind == "continueConversation":
		var transitions: Array = _as_array(node.get("transitions"))
		if transitions.size() != 1:
			return { "ok": false, "error": "conversation story node needs one continuation: %s" % node.get("id") }
		var enter: Dictionary = enter_story_node(story, str(transitions[0].get("to")), state, conversations, catalog, pkg)
		if not enter["ok"]:
			return enter
		return { "ok": true, "status": "advanced" }
	return { "ok": true, "status": "waiting", "pendingInput": _deep_copy(pending) }


## Choose an option on the current `decision` node. Effects are applied
## atomically on a draft clone; the input is recorded in
## `processedChoiceInputs` for idempotency.
static func select_story_choice(story: Dictionary, node_id: String, choice_id: String, event_id: String, state: Dictionary, conversations: Array, catalog: Dictionary, pkg: Dictionary) -> Dictionary:
	var runtime: Dictionary = state["story"]["runtime"]
	var fingerprint: String = _fingerprint({ "nodeId": node_id, "choiceId": choice_id })
	for entry in runtime.get("processedChoiceInputs", []):
		if entry is Dictionary and str(entry.get("eventId")) == event_id:
			if str(entry.get("fingerprint")) != fingerprint:
				return { "ok": false, "error": "choice eventId reused with different input: %s" % event_id }
			return { "ok": true, "duplicate": true }
	var source: Dictionary = _find_node(story, node_id)
	if source.is_empty():
		return { "ok": false, "error": "story node is not registered: %s" % node_id }
	if str(source.get("id")) != str(runtime.get("currentNodeId")):
		return { "ok": false, "error": "story choice node does not match the current node" }
	if str(source.get("type")) != "decision":
		return { "ok": false, "error": "story is not waiting for a decision choice" }
	var pending: Variant = runtime.get("pendingInput")
	if not (pending is Dictionary) or str(pending.get("kind")) != "storyChoice":
		return { "ok": false, "error": "story is not waiting for a decision choice" }
	var choice: Dictionary = _find_choice(source, choice_id)
	if choice.is_empty():
		return { "ok": false, "error": "story choice is not available: %s" % choice_id }
	var availability: Dictionary = _check_availability(choice.get("when"), state, catalog)
	if not availability["ok"]:
		return availability
	if not availability["available"]:
		return { "ok": true, "available": false, "reason": "condition_not_met" }
	var draft: Dictionary = _deep_copy(state)
	var apply_result: Dictionary = EventEngine.apply_effects(_as_array(choice.get("effects")), draft, catalog, pkg)
	if not apply_result["ok"]:
		return { "ok": false, "error": apply_result["error"] }
	draft["story"]["runtime"]["processedChoiceInputs"].append({ "eventId": event_id, "fingerprint": fingerprint })
	var enter: Dictionary = enter_story_node(story, str(choice.get("to")), draft, conversations, catalog, pkg)
	if not enter["ok"]:
		return enter
	_commit(draft, state)
	return { "ok": true, "available": true, "duplicate": false }


## Choose an option on the current dialogue node of an active conversation.
## The choice is dispatched as a `conversation.choice` event (so rules can
## react) and its effects are applied atomically on a draft clone.
static func select_conversation_choice(conversation: Dictionary, choice_id: String, event_id: String, rules: Array, state: Dictionary, conversations: Array, catalog: Dictionary, pkg: Dictionary) -> Dictionary:
	var runtime: Dictionary = state["story"]["runtime"]
	var event := { "eventId": event_id, "type": "conversation.choice", "conversationId": conversation.get("id"), "choiceId": choice_id }
	var fingerprint: String = _fingerprint(event)
	for entry in state["events"]["processed"]:
		if entry is Dictionary and str(entry.get("eventId")) == event_id:
			if str(entry.get("fingerprint")) != fingerprint:
				return { "ok": false, "error": "eventId reused with different payload: %s" % event_id }
			return { "ok": true, "duplicate": true }
	var pending: Variant = runtime.get("pendingInput")
	if not (pending is Dictionary) or str(pending.get("kind")) != "conversationChoice" or str(pending.get("conversationId")) != str(conversation.get("id")):
		return { "ok": false, "error": "story is not waiting for this conversation choice" }
	var dialogue_node: Dictionary = _find_dialogue_node(conversation, str(runtime.get("currentDialogueNodeId")))
	if dialogue_node.is_empty():
		return { "ok": false, "error": "dialogue node is not registered: %s" % runtime.get("currentDialogueNodeId") }
	var choice: Dictionary = _find_choice(dialogue_node, choice_id)
	if choice.is_empty():
		return { "ok": false, "error": "conversation choice is not available: %s" % choice_id }
	var availability: Dictionary = _check_availability(choice.get("when"), state, catalog)
	if not availability["ok"]:
		return availability
	if not availability["available"]:
		return { "ok": true, "available": false, "reason": "condition_not_met" }
	var draft: Dictionary = _deep_copy(state)
	var event_trace: Dictionary = EventEngine.dispatch_event(event, rules, draft, catalog, pkg)
	# Success traces carry no "ok" key; rejections return {ok:false, error}.
	if event_trace.get("ok") == false:
		return { "ok": false, "error": str(event_trace.get("error")) }
	var apply_result: Dictionary = EventEngine.apply_effects(_as_array(choice.get("effects")), draft, catalog, pkg)
	if not apply_result["ok"]:
		return { "ok": false, "error": apply_result["error"] }
	draft["story"]["runtime"]["currentDialogueNodeId"] = choice.get("to")
	var dialogue: Dictionary = _set_dialogue_input(conversation, draft["story"]["runtime"])
	if not dialogue["ok"]:
		return dialogue
	_commit(draft, state)
	return { "ok": true, "available": true, "duplicate": bool(event_trace.get("duplicate", false)), "eventTrace": event_trace }


## Record a visit to a story node and set the pending input for its type.
## Exposed so the RuleBridge can re-enter a node after a restore.
static func enter_story_node(story: Dictionary, node_id: String, state: Dictionary, conversations: Array, catalog: Dictionary, pkg: Dictionary) -> Dictionary:
	var node: Dictionary = _find_node(story, node_id)
	if node.is_empty():
		return { "ok": false, "error": "story node is not registered: %s" % node_id }
	var runtime: Dictionary = state["story"]["runtime"]
	runtime["currentNodeId"] = node.get("id")
	runtime["currentDialogueId"] = null
	runtime["currentDialogueNodeId"] = null
	runtime["visits"].append(node.get("id"))
	state["story"]["visited"][str(node.get("id"))] = true
	var node_type: String = str(node.get("type"))
	if node_type == "storyBeat":
		runtime["pendingInput"] = { "kind": "continue" }
	elif node_type == "decision":
		runtime["pendingInput"] = { "kind": "storyChoice" }
	elif node_type == "conversation":
		var conversation: Dictionary = _find_conversation(conversations, str(node.get("conversationId")))
		if conversation.is_empty():
			return { "ok": false, "error": "conversation is not registered: %s" % node.get("conversationId") }
		var availability: Dictionary = _check_availability(conversation.get("entryCondition"), state, catalog)
		if not availability["ok"]:
			return availability
		if not availability["available"]:
			runtime["pendingInput"] = { "kind": "blocked", "reason": "condition_not_met" }
			return { "ok": true, "available": false, "reason": "condition_not_met" }
		runtime["currentDialogueId"] = conversation.get("id")
		runtime["currentDialogueNodeId"] = conversation.get("startNodeId")
		return _set_dialogue_input(conversation, runtime)
	elif node_type == "outcome":
		if not runtime.get("appliedOutcomeNodeIds", []).has(node.get("id")):
			var apply_result: Dictionary = EventEngine.apply_effects(_as_array(node.get("effects")), state, catalog, pkg)
			if not apply_result["ok"]:
				return { "ok": false, "error": apply_result["error"] }
			runtime["appliedOutcomeNodeIds"].append(node.get("id"))
		runtime["pendingInput"] = { "kind": "continue" } if _as_array(node.get("transitions")).size() > 0 else { "kind": "complete" }
	else:
		return { "ok": false, "error": "story node type is not supported: %s" % node_type }
	return { "ok": true, "available": true, "reason": null }


static func _set_dialogue_input(conversation: Dictionary, runtime: Dictionary) -> Dictionary:
	var node: Dictionary = _find_dialogue_node(conversation, str(runtime.get("currentDialogueNodeId")))
	if node.is_empty():
		return { "ok": false, "error": "dialogue node is not registered: %s" % runtime.get("currentDialogueNodeId") }
	if _as_array(node.get("choices")).size() > 0:
		runtime["pendingInput"] = { "kind": "conversationChoice", "conversationId": conversation.get("id"), "nodeId": node.get("id") }
	else:
		runtime["pendingInput"] = { "kind": "continueConversation", "conversationId": conversation.get("id"), "nodeId": node.get("id") }
	return { "ok": true }


static func _check_availability(condition: Variant, state: Dictionary, catalog: Dictionary) -> Dictionary:
	var expression: Variant = condition if condition is Dictionary else { "all": [] }
	var result: Dictionary = EventEngine.evaluate_condition(expression, state, catalog)
	if not result["ok"]:
		return { "ok": false, "error": str(result.get("error")) }
	return { "ok": true, "available": bool(result.get("value")), "reason": null }


static func _find_node(story: Dictionary, node_id: String) -> Dictionary:
	for node in _as_array(story.get("nodes")):
		if node is Dictionary and str(node.get("id")) == node_id:
			return node
	return {}


static func _find_choice(container: Dictionary, choice_id: String) -> Dictionary:
	for choice in _as_array(container.get("choices")):
		if choice is Dictionary and str(choice.get("id")) == choice_id:
			return choice
	return {}


static func _find_dialogue_node(conversation: Dictionary, node_id: String) -> Dictionary:
	for node in _as_array(conversation.get("nodes")):
		if node is Dictionary and str(node.get("id")) == node_id:
			return node
	return {}


static func _find_conversation(conversations: Array, conversation_id: String) -> Dictionary:
	for conversation in conversations:
		if conversation is Dictionary and str(conversation.get("id")) == conversation_id:
			return conversation
	return {}


static func _commit(draft: Dictionary, state: Dictionary) -> void:
	for key in draft.keys():
		state[key] = draft[key]


static func _fingerprint(value: Variant) -> String:
	return JSON.stringify(_canonicalize(value))


static func _canonicalize(value: Variant) -> Variant:
	if value is Array:
		var result: Array = []
		for item in value:
			result.append(_canonicalize(item))
		return result
	if value is Dictionary:
		var sorted_keys: PackedStringArray = (value as Dictionary).keys()
		sorted_keys.sort()
		var result: Dictionary = {}
		for key in sorted_keys:
			result[key] = _canonicalize(value[key])
		return result
	return value


static func _deep_copy(value: Variant) -> Variant:
	if value is Dictionary:
		var result: Dictionary = {}
		for key in value:
			result[key] = _deep_copy(value[key])
		return result
	if value is Array:
		var result: Array = []
		for item in value:
			result.append(_deep_copy(item))
		return result
	return value


static func _as_array(value: Variant) -> Array:
	return value if value is Array else []


## Godot's JSON parser returns every number as a float, so a state restored
## from a save file carries float resource/relationship amounts and whole
## numbers in the runtime arrays. This normalizes whole-number floats back to
## ints so the restored state is byte-compatible with a fresh
## [EventEngine.initial_state] (type checks, bounds, and fingerprints).
## Persistence (RuleBridge / SaveFile) should call this after a load.
static func normalize_state_numbers(value: Variant) -> Variant:
	if value is Dictionary:
		var result: Dictionary = {}
		for key in value:
			result[key] = normalize_state_numbers(value[key])
		return result
	if value is Array:
		var result: Array = []
		for item in value:
			result.append(normalize_state_numbers(item))
		return result
	if value is float and value == floor(value):
		return int(value)
	return value
