extends Node
## Bridges production SignalBus signals into the JSON rule engine and
## translates engine effects back into production signals.
##
## Input:
##   - resource_updated (amount > 0)  -> resource.totalAtLeast event
##   - npc_event_interacted           -> conversation.choice event
##
## Output (one-shot guarded, mirrors unlock_controller.gd patterns):
##   - unlock producer         -> progress_button_unlock
##   - flag.set worker role    -> manager_button_unlock
##   - flag.set tab            -> tab_unlock
##   - event.record            -> event_triggered
##   - resource.add            -> resource_generated (goes through ResourceManager)
##
## Story facade (PG-04): drives the StoryRun state machine against the shared
## engine state and keeps SaveFile.resources in sync after each action.
##
## The bridge contains no content-specific logic; all lookups are generic
## catalog lookups by string ID.

const PackageLoader := preload("res://global/engine/package_loader.gd")
const EventEngine := preload("res://global/engine/event_engine.gd")
const StoryRun := preload("res://global/engine/story_run.gd")

## Directory of the active JSON content package (loaded in _ready if present).
var package_dir: String = "res://content/active"

var _loaded: bool = false
var _pkg: Dictionary = {}
var _catalog: Dictionary = {}
var _state: Dictionary = {}
var _rules: Array = []


func _ready() -> void:
	SignalBus.resource_updated.connect(_on_resource_updated)
	SignalBus.npc_event_interacted.connect(_on_npc_event_interacted)
	SignalBus.save_requested.connect(_on_save_requested)
	if DirAccess.dir_exists_absolute(ProjectSettings.globalize_path(package_dir)):
		load_package(package_dir)


func load_package(dir: String) -> void:
	var result: Dictionary = PackageLoader.load_package(dir)
	if not result["ok"]:
		push_error("RuleBridge: package load failed: %s" % str(result["messages"]))
		return
	_pkg = result["assembled"]
	_catalog = result["catalog"]
	_rules = _pkg.get("rules", {}).get("rules", [])
	_state = EventEngine.initial_state(_pkg)
	_loaded = true
	_register_package_resources(_pkg)
	_restore_story_state()
	print("RuleBridge: loaded package '%s' (%d rules)" % [str(_pkg.get("manifest", {}).get("packId", "")), _rules.size()])


## Registers package resources in the core-loop catalog and seeds their
## initial amounts so the JSON resources are visible in the tracker and
## usable by the ResourceManager.
func _register_package_resources(pkg: Dictionary) -> void:
	var resources_doc: Dictionary = pkg.get("resources", {})
	var resource_list: Array = resources_doc.get("resources", [])
	var sort_base: int = 10000
	for entry in resource_list:
		var id: String = str(entry.get("id", ""))
		if id == "":
			continue
		if not Resources.resource_generators.has(id):
			var generator: ResourceGenerator = ResourceGenerator.new()
			generator.id = id
			var bounds: Dictionary = entry.get("bounds", {})
			generator.max_amount = int(bounds.get("max", -1))
			generator.hidden = false
			generator.sort_value = sort_base
			sort_base += 1
			Resources.resource_generators[id] = generator
		if not SaveFile.resources.has(id):
			var initial: int = int(entry.get("initialAmount", 0))
			SaveFile.resources[id] = initial
			SignalBus.resource_updated.emit(id, initial, initial, "rule_bridge")


func _on_resource_updated(id: String, total: int, amount: int, _source_id: String) -> void:
	if amount <= 0:
		return
	_dispatch({
		"type": "resource.totalAtLeast",
		"eventId": "res_%s_%d" % [id, total],
		"resourceId": id,
		"total": total,
		"delta": amount,
	})


func _on_npc_event_interacted(npc_id: String, npc_event_id: String, option: int) -> void:
	_dispatch({
		"type": "conversation.choice",
		"eventId": "npc_%s_%s_%d" % [npc_id, npc_event_id, option],
		"conversationId": npc_event_id,
		"choiceId": str(option),
	})


func _dispatch(event: Dictionary) -> void:
	if not _loaded:
		return
	var trace: Dictionary = EventEngine.dispatch_event(event, _rules, _state, _catalog, _pkg)
	# Success traces carry no "ok" key; rejections return {ok: false, error}.
	if not trace.get("ok", true):
		push_warning("RuleBridge: dispatch rejected: %s" % str(trace.get("error", "")))
		return
	for effect in trace.get("orderedEffects", []):
		_apply_effect(effect)


func _apply_effect(entry: Dictionary) -> void:
	var effect: Dictionary = entry.get("effect", {})
	var op: String = str(effect.get("op"))
	match op:
		"unlock":
			var target_type: String = str(effect.get("targetType"))
			var target_id: String = str(effect.get("targetId"))
			if target_type == "producer" and Resources.resource_generators.has(target_id):
				_unlock_resource_generator_if(target_id)
			# recipe / combatEncounter unlocks are recorded in engine state only
		"flag.set":
			var flag_id: String = str(effect.get("flagId"))
			if effect.get("value") == true:
				_unlock_flag_if(flag_id)
		"event.record":
			var event_id: String = str(effect.get("eventId"))
			_trigger_unique_event_if(event_id)
		"resource.add":
			var resource_id: String = str(effect.get("resourceId"))
			var amount: int = int(effect.get("amount", 0))
			if amount != 0:
				SignalBus.resource_generated.emit(resource_id, amount, "rule_bridge")
		"resource.spend":
			var spend_id: String = str(effect.get("resourceId"))
			var spend_amount: int = int(effect.get("amount", 0))
			if spend_amount != 0:
				SignalBus.resource_generated.emit(spend_id, -spend_amount, "rule_bridge")


func _unlock_resource_generator_if(id: String) -> void:
	if not SaveFile.resource_generator_unlocks.has(id):
		SignalBus.progress_button_unlock.emit(Resources.resource_generators[id])


func _unlock_flag_if(flag_id: String) -> void:
	# A flag that matches a worker role or tab unlocks that entity.
	if Resources.worker_roles.has(flag_id) and not SaveFile.worker_role_unlocks.has(flag_id):
		SignalBus.manager_button_unlock.emit(Resources.worker_roles[flag_id])
	elif Resources.tab_datas.has(flag_id) and not SaveFile.tab_unlocks.has(flag_id):
		SignalBus.tab_unlock.emit(Resources.tab_datas[flag_id])


func _trigger_unique_event_if(event_id: String) -> void:
	if SaveFile.events.get(event_id, 0) == 0 and Resources.event_datas.has(event_id):
		SignalBus.event_triggered.emit(Resources.event_datas[event_id], [])


# ---------------------------------------------------------------------------
# Story facade (PG-04)
#
# The story UI (story_surface) drives the StoryRun state machine through these
# methods. StoryRun mutates the shared engine state in place; after each
# successful action the bridge syncs the resource deltas into SaveFile so the
# production ResourceManager (and everything listening to resource signals)
# sees story-originated gains and spends.
# ---------------------------------------------------------------------------

func get_state() -> Dictionary:
	# Keep the engine's resource totals in step with the main loop so the
	# surface's live availability display (and any condition evaluation) sees
	# the player's actual totals, not a stale copy.
	_reconcile_engine_resources()
	return _state


func get_pkg() -> Dictionary:
	return _pkg


func get_catalog() -> Dictionary:
	return _catalog


func get_rules() -> Array:
	return _rules


func get_story(story_id: String) -> Dictionary:
	var doc: Variant = _pkg.get("stories", {}).get(story_id)
	if doc is Dictionary:
		return doc.get("story", {})
	return {}


## All conversation docs in the package (flattened for StoryRun).
func get_conversations() -> Array:
	return StoryRun.flatten_conversations(_pkg)


## All NPC records in the package (flattened from the per-NPC documents).
func get_npcs() -> Array:
	var npcs: Array = []
	for npc_id in _pkg.get("npcs", {}):
		var document: Dictionary = _pkg["npcs"][npc_id]
		var list: Variant = document.get("npcs")
		if list is Array:
			for npc in list:
				if npc is Dictionary:
					npcs.append(npc)
	return npcs


## Pulls the authoritative resource totals from SaveFile (maintained by the
## main loop's ResourceManager) into the engine state before a story action,
## so `when` conditions and spend effects evaluate against the player's real
## totals — including resources gathered or consumed outside the story.
func _reconcile_engine_resources() -> void:
	var engine_resources: Dictionary = _state.get("resources", {})
	for resource_id in engine_resources.keys():
		if SaveFile.resources.has(resource_id):
			engine_resources[resource_id] = int(SaveFile.resources[resource_id])

# ---------------------------------------------------------------------------
# Save / resume (PG-07)
#
# The engine state is the single source of truth for story progress, rule
# effects, and idempotency ledgers. It is persisted into SaveFile.story_state
# on every autosave and restored when a save is loaded, so a resumed game
# continues the story at the exact node it left off and replayed choice
# eventIds stay no-ops across the save boundary.
# ---------------------------------------------------------------------------

## Pushes the current engine state into SaveFile.story_state (or null when no
## story run is active). Connected to save_requested, which SaveFile emits
## just before every file write (autosave and manual save_now).
func _on_save_requested() -> void:
	export_story_state()


## Exports the engine state for persistence. Returns the exported dict (null
## when no story run is active) so tests can inspect it directly.
func export_story_state() -> Variant:
	if not _loaded:
		return null
	var runtime: Dictionary = _state.get("story", {}).get("runtime", {})
	if runtime.get("currentNodeId", null) == null:
		SaveFile.story_state = null
		return null
	SaveFile.story_state = _state.duplicate(true)
	return SaveFile.story_state


## Restores SaveFile.story_state into the engine state after a save has been
## loaded (called from load_package, which runs when main.tscn instantiates
## the bridge after SaveFile.initialize). JSON round-trips turn ints into
## floats, so the restored state is normalized first.
func restore_story_state() -> bool:
	if not _loaded:
		return false
	var stored: Variant = SaveFile.story_state
	if not stored is Dictionary or (stored as Dictionary).is_empty():
		return false
	_state = StoryRun.normalize_state_numbers(stored.duplicate(true))
	return true


func _restore_story_state() -> void:
	if restore_story_state():
		print("RuleBridge: restored story state from save file")


## Begin the given story. Returns the StoryRun result dict
## ({ok, ...} or {ok: false, error}).
func story_begin(story_id: String) -> Dictionary:
	var story: Dictionary = get_story(story_id)
	if story.is_empty():
		return { "ok": false, "error": "story not found: %s" % story_id }
	_reconcile_engine_resources()
	var before: Dictionary = _state.get("resources", {}).duplicate(true)
	var result: Dictionary = StoryRun.begin_story(story, _state, get_conversations(), _catalog, _pkg)
	if result.get("ok", false):
		_sync_story_resources(before)
	return result


## Advance the story (continue / continueConversation / branch / complete).
func story_advance(story_id: String) -> Dictionary:
	var story: Dictionary = get_story(story_id)
	if story.is_empty():
		return { "ok": false, "error": "story not found: %s" % story_id }
	_reconcile_engine_resources()
	var before: Dictionary = _state.get("resources", {}).duplicate(true)
	var result: Dictionary = StoryRun.advance_story(story, _state, get_conversations(), _catalog, _pkg)
	if result.get("ok", false):
		_sync_story_resources(before)
	return result


## Select a decision-node choice. `event_id` dedupes the input (use a stable
## id like "story_<storyId>_<nodeId>_<choiceId>").
func story_select_choice(story_id: String, node_id: String, choice_id: String, event_id: String) -> Dictionary:
	var story: Dictionary = get_story(story_id)
	if story.is_empty():
		return { "ok": false, "error": "story not found: %s" % story_id }
	_reconcile_engine_resources()
	var before: Dictionary = _state.get("resources", {}).duplicate(true)
	var result: Dictionary = StoryRun.select_story_choice(story, node_id, choice_id, event_id, _state, get_conversations(), _catalog, _pkg)
	if result.get("ok", false):
		_sync_story_resources(before)
	return result


## Select a dialogue-node choice in the active conversation.
func story_select_conversation_choice(conversation_id: String, choice_id: String, event_id: String) -> Dictionary:
	var conversations: Array = get_conversations()
	var conversation: Dictionary = {}
	for candidate in conversations:
		if str(candidate.get("id")) == conversation_id:
			conversation = candidate
			break
	if conversation.is_empty():
		return { "ok": false, "error": "conversation not found: %s" % conversation_id }
	_reconcile_engine_resources()
	var before: Dictionary = _state.get("resources", {}).duplicate(true)
	var result: Dictionary = StoryRun.select_conversation_choice(conversation, choice_id, event_id, _rules, _state, conversations, _catalog, _pkg)
	if result.get("ok", false):
		_sync_story_resources(before)
	return result


## Emits signed resource deltas produced by the last story action and
## reconciles the engine state with SaveFile.resources (which may have been
## shadow-scaled or clamped by the ResourceManager).
func _sync_story_resources(before: Dictionary) -> void:
	var after: Dictionary = _state.get("resources", {})
	for resource_id in after.keys():
		var delta: int = int(after.get(resource_id, 0)) - int(before.get(resource_id, 0))
		if delta != 0:
			SignalBus.resource_generated.emit(resource_id, delta, "rule_bridge")
	# Reconcile: the ResourceManager may have scaled/clamped the amounts,
	# so read the authoritative totals back into the engine state.
	for resource_id in after.keys():
		if SaveFile.resources.has(resource_id):
			_state["resources"][resource_id] = int(SaveFile.resources[resource_id])
