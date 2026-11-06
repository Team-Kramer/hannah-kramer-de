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
## The bridge contains no content-specific logic; all lookups are generic
## catalog lookups by string ID.

const PackageLoader := preload("res://global/engine/package_loader.gd")
const EventEngine := preload("res://global/engine/event_engine.gd")

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
