## Generic event-driven rule engine for Lichtwald content packages (PD-03b).
##
## GDScript port of the F4 runtime prototype (tests/f4-f6-runtime.test.cjs).
## The mechanics are generic and content-defined behavior comes entirely from
## the JSON `rules` domain: each rule has a `trigger` (event match), a `when`
## condition (evaluated via condition_dsl.gd), and a list of `effects`
## (PB-02c allow-listed ops). This keeps the event bus and handlers generic
## while JSON configures the behavior (PD-03).
##
## State shape (mirrors the Node initialState):
##   resources: {id: amount}
##   relationships: {npcId: value}
##   flags: {flagId: bool}
##   story: {visited: {nodeId: bool}, runtime: {...}}
##   unlocks: {recipes: {}, producers: {}, combatEncounters: {}}
##   conversationChoices: {conversationId: choiceId}
##   events: {processed: [], firedOnceRules: [], log: []}
##   combatRequests: [{encounterId, combatProfileId}]

const ConditionDsl := preload("res://condition_dsl.gd")
const MAX_CONDITION_DEPTH := 12
const MAX_CONDITION_NODES := 64
const ALLOWED_EVENT_TYPES: Array[String] = ["resource.totalAtLeast", "conversation.choice"]
const COMBAT_PROFILES: Array[String] = ["turn_based_core"]


## Build the initial runtime state from a loaded package. Flags are derived
## from every `flag.set` effect in the rules (initialized false), so the state
## is data-driven rather than hard-coded.
static func initial_state(pkg: Dictionary) -> Dictionary:
	var resources: Dictionary = {}
	for resource in _as_array(pkg["resources"].get("resources")):
		if resource is Dictionary:
			resources[str(resource.get("id"))] = int(resource.get("initialAmount", 0))
	var relationships: Dictionary = {}
	for npc_id in pkg["npcs"]:
		for npc in _as_array(pkg["npcs"][npc_id].get("npcs")):
			if npc is Dictionary:
				relationships[str(npc.get("id"))] = int(npc.get("initialRelationship", 0))
	var flags: Dictionary = {}
	for rule in _as_array(pkg["rules"].get("rules")):
		if rule is Dictionary:
			for effect in _as_array(rule.get("effects")):
				if effect is Dictionary and str(effect.get("op")) == "flag.set" and effect.get("flagId") is String:
					var flag_id: String = str(effect.get("flagId"))
					if not flags.has(flag_id):
						flags[flag_id] = false
	var story_nodes: Dictionary = {}
	for story_id in pkg["stories"]:
		var story_doc: Variant = pkg["stories"][story_id]
		if story_doc is Dictionary and (story_doc as Dictionary).get("story") is Dictionary:
			for node in _as_array((story_doc as Dictionary)["story"].get("nodes")):
				if node is Dictionary and node.get("id") is String:
					story_nodes[str(node.get("id"))] = false
	var unlocks_recipes: Dictionary = {}
	for recipe in _as_array(pkg["resources"].get("recipes")):
		if recipe is Dictionary:
			unlocks_recipes[str(recipe.get("id"))] = false
	var unlocks_producers: Dictionary = {}
	for producer in _as_array(pkg["resources"].get("producers")):
		if producer is Dictionary:
			unlocks_producers[str(producer.get("id"))] = false
	var unlocks_encounters: Dictionary = {}
	for encounter in _as_array(pkg["combat"].get("encounters")):
		if encounter is Dictionary:
			unlocks_encounters[str(encounter.get("id"))] = false
	return {
		"resources": resources,
		"relationships": relationships,
		"flags": flags,
		"story": { "visited": story_nodes, "runtime": { "currentNodeId": null, "currentDialogueId": null, "currentDialogueNodeId": null, "pendingInput": null, "visits": [], "appliedOutcomeNodeIds": [], "processedChoiceInputs": [] } },
		"unlocks": { "recipes": unlocks_recipes, "producers": unlocks_producers, "combatEncounters": unlocks_encounters },
		"conversationChoices": {},
		"events": { "processed": [], "firedOnceRules": [], "log": [], "recorded": [] },
		"combatRequests": [],
	}


## Evaluate a `when` condition against a state. Returns { ok, value, error }.
## value is a bool on success.
static func evaluate_condition(expression: Variant, state: Dictionary, catalog: Dictionary) -> Dictionary:
	var validation: Dictionary = _validate_condition(expression, state, catalog, 0, { "count": 0 })
	if not validation["ok"]:
		return validation
	return _evaluate_condition_unchecked(expression, state, catalog)


static func _validate_condition(expression: Variant, state: Dictionary, catalog: Dictionary, depth: int, budget: Dictionary) -> Dictionary:
	if depth > MAX_CONDITION_DEPTH:
		return { "ok": false, "value": false, "error": "condition exceeds depth limit %d" % MAX_CONDITION_DEPTH }
	budget["count"] = int(budget["count"]) + 1
	if int(budget["count"]) > MAX_CONDITION_NODES:
		return { "ok": false, "value": false, "error": "condition exceeds node limit %d" % MAX_CONDITION_NODES }
	if not (expression is Dictionary):
		return { "ok": false, "value": false, "error": "condition node must be an object" }
	var node: Dictionary = expression
	var keys: PackedStringArray = node.keys()
	if keys.size() == 1 and (keys[0] == "all" or keys[0] == "any"):
		var children: Variant = node[keys[0]]
		if not (children is Array):
			return { "ok": false, "value": false, "error": "condition.%s must be an array" % keys[0] }
		for child in children:
			var result: Dictionary = _validate_condition(child, state, catalog, depth + 1, budget)
			if not result["ok"]:
				return result
		return { "ok": true, "value": false, "error": "" }
	if keys.size() == 1 and keys[0] == "not":
		return _validate_condition(node["not"], state, catalog, depth + 1, budget)
	if node.get("op") == "exists":
		if keys.size() != 2 or not (node.has("path") and node.has("op")):
			return { "ok": false, "value": false, "error": "exists condition leaf must contain only path and op" }
		return ConditionDsl.validate_condition_path(node.get("path"), catalog)
	if keys.size() != 3 or not (node.has("path") and node.has("op") and node.has("value")):
		return { "ok": false, "value": false, "error": "condition leaf must contain only path, op, and value" }
	var read: Dictionary = ConditionDsl.read_condition_path(node.get("path"), state, catalog)
	if not read["ok"]:
		return read
	if not ConditionDsl.CONDITION_OPERATORS.has(str(node.get("op"))):
		return { "ok": false, "value": false, "error": "condition operator is not allow-listed: %s" % node.get("op") }
	var expected: Variant = node.get("value")
	if not (expected is int or expected is float or expected is bool):
		return { "ok": false, "value": false, "error": "condition value has unsupported type at %s" % node.get("path") }
	var actual: Variant = read["value"]
	if _type_class(actual) != _type_class(expected):
		return { "ok": false, "value": false, "error": "condition value type does not match %s" % node.get("path") }
	if ["gt", "gte", "lt", "lte"].has(str(node.get("op"))) and not (actual is int or actual is float):
		return { "ok": false, "value": false, "error": "numeric condition operator requires a number at %s" % node.get("path") }
	return { "ok": true, "value": false, "error": "" }


static func _evaluate_condition_unchecked(expression: Variant, state: Dictionary, catalog: Dictionary) -> Dictionary:
	var node: Dictionary = expression
	if node.has("all"):
		for child in node["all"]:
			if not _evaluate_condition_unchecked(child, state, catalog)["value"]:
				return { "ok": true, "value": false, "error": "" }
		return { "ok": true, "value": true, "error": "" }
	if node.has("any"):
		for child in node["any"]:
			if _evaluate_condition_unchecked(child, state, catalog)["value"]:
				return { "ok": true, "value": true, "error": "" }
		return { "ok": true, "value": false, "error": "" }
	if node.has("not"):
		return { "ok": true, "value": not _evaluate_condition_unchecked(node["not"], state, catalog)["value"], "error": "" }
	if node.get("op") == "exists":
		return ConditionDsl.condition_path_exists(node.get("path"), state, catalog)
	var read: Dictionary = ConditionDsl.read_condition_path(node.get("path"), state, catalog)
	if not read["ok"]:
		return read
	return ConditionDsl.compare_condition_value(read["value"], str(node.get("op")), node.get("value"))


## Apply a list of PB-02c allow-listed effects to state in place. Returns
## { ok, error }.
static func apply_effects(effects: Variant, state: Dictionary, catalog: Dictionary, pkg: Dictionary) -> Dictionary:
	if not (effects is Array):
		return { "ok": false, "error": "effects must be an array" }
	for effect in effects:
		if not (effect is Dictionary):
			return { "ok": false, "error": "effect must be an object" }
		var result: Dictionary = _apply_single_effect(effect, state, catalog, pkg)
		if not result["ok"]:
			return result
	return { "ok": true, "error": "" }


static func _apply_single_effect(effect: Dictionary, state: Dictionary, catalog: Dictionary, pkg: Dictionary) -> Dictionary:
	var op: String = str(effect.get("op"))
	match op:
		"resource.spend", "resource.add":
			if not _only_keys(effect, ["op", "resourceId", "amount"]):
				return { "ok": false, "error": "effect %s contains missing or unsupported fields" % op }
			var resource_id: String = str(effect.get("resourceId"))
			if not catalog.get("resource", {}).has(resource_id):
				return { "ok": false, "error": "effect references unregistered resource: %s" % resource_id }
			var amount: Variant = effect.get("amount")
			if not (amount is int) or int(amount) <= 0:
				return { "ok": false, "error": "resource effect amount must be a positive integer" }
			var current: int = int(state["resources"].get(resource_id, 0))
			var result: int = current + (int(amount) if op == "resource.add" else -int(amount))
			var bounds: Dictionary = _resource_bounds(pkg, resource_id)
			var min: int = int(bounds.get("min", 0))
			var max: int = int(bounds.get("max", 9007199254740991))
			if result < min or result > max:
				return { "ok": false, "error": "resource effect violates bounds: %s" % resource_id }
			state["resources"][resource_id] = result
			return { "ok": true, "error": "" }
		"relationship.adjust":
			if not _only_keys(effect, ["op", "characterId", "amount"]):
				return { "ok": false, "error": "effect %s contains missing or unsupported fields" % op }
			var character_id: String = str(effect.get("characterId"))
			if not catalog.get("npc", {}).has(character_id):
				return { "ok": false, "error": "effect references unregistered NPC: %s" % character_id }
			var amount: Variant = effect.get("amount")
			if not (amount is int):
				return { "ok": false, "error": "relationship effect amount must be an integer" }
			var next_value: int = int(state["relationships"].get(character_id, 0)) + int(amount)
			if next_value < -100 or next_value > 100:
				return { "ok": false, "error": "relationship effect violates bounds: %s" % character_id }
			state["relationships"][character_id] = next_value
			return { "ok": true, "error": "" }
		"flag.set":
			if not _only_keys(effect, ["op", "flagId", "value"]):
				return { "ok": false, "error": "effect %s contains missing or unsupported fields" % op }
			var flag_id: Variant = effect.get("flagId")
			var value: Variant = effect.get("value")
			if not (flag_id is String) or flag_id == "" or not (value is bool):
				return { "ok": false, "error": "flag.set requires a non-empty flagId and boolean value" }
			state["flags"][flag_id] = value
			return { "ok": true, "error": "" }
		"unlock":
			if not _only_keys(effect, ["op", "targetType", "targetId"]):
				return { "ok": false, "error": "effect %s contains missing or unsupported fields" % op }
			var target_type: String = str(effect.get("targetType"))
			var target_id: String = str(effect.get("targetId"))
			var scope: String
			var catalog_key: String
			if target_type == "recipe":
				scope = "recipes"; catalog_key = "recipe"
			elif target_type == "producer":
				scope = "producers"; catalog_key = "producer"
			elif target_type == "combatEncounter":
				scope = "combatEncounters"; catalog_key = "encounter"
			else:
				return { "ok": false, "error": "unlock target is not allow-listed: %s:%s" % [target_type, target_id] }
			if not catalog.get(catalog_key, {}).has(target_id):
				return { "ok": false, "error": "unlock target is not allow-listed: %s:%s" % [target_type, target_id] }
			state["unlocks"][scope][target_id] = true
			return { "ok": true, "error": "" }
		"combat.request":
			if not _only_keys(effect, ["op", "encounterId"]):
				return { "ok": false, "error": "effect %s contains missing or unsupported fields" % op }
			var encounter_id: String = str(effect.get("encounterId"))
			var encounter: Dictionary = _find_encounter(pkg, encounter_id)
			if encounter.is_empty():
				return { "ok": false, "error": "combat request references unregistered encounter: %s" % encounter_id }
			if not catalog.get("enemy", {}).has(str(encounter.get("enemyId"))):
				return { "ok": false, "error": "combat encounter references unregistered enemy: %s" % encounter.get("enemyId") }
			if not COMBAT_PROFILES.has(str(encounter.get("combatProfileId"))):
				return { "ok": false, "error": "combat profile is not registered: %s" % encounter.get("combatProfileId") }
			if not state["unlocks"]["combatEncounters"].get(encounter_id, false):
				return { "ok": false, "error": "combat encounter is locked: %s" % encounter_id }
			var availability: Dictionary = evaluate_condition(encounter.get("availableWhen", { "all": [] }), state, catalog)
			if not availability["ok"]:
				return availability
			if not availability["value"]:
				return { "ok": false, "error": "combat encounter is unavailable: %s" % encounter_id }
			state["combatRequests"].append({ "encounterId": encounter_id, "combatProfileId": str(encounter.get("combatProfileId")) })
			return { "ok": true, "error": "" }
		"event.record":
			if not _only_keys(effect, ["op", "eventId"]):
				return { "ok": false, "error": "effect %s contains missing or unsupported fields" % op }
			var event_id: String = str(effect.get("eventId"))
			if event_id == "":
				return { "ok": false, "error": "event.record requires a non-empty eventId" }
			state["events"]["recorded"].append(event_id)
			return { "ok": true, "error": "" }
		_:
			return { "ok": false, "error": "effect operation is not allow-listed: %s" % op }


## Dispatch a typed event to the generic rule handlers. Returns a trace:
## { eventId, payload, duplicate, evaluations, firedRuleIds, orderedEffects,
##   resultingState }. On failure returns { ok: false, error }.
static func dispatch_event(event: Dictionary, rules: Array, state: Dictionary, catalog: Dictionary, pkg: Dictionary) -> Dictionary:
	if not event.get("eventId") is String or str(event.get("eventId")) == "":
		return { "ok": false, "error": "event requires a stable eventId" }
	var event_type: String = str(event.get("type"))
	if not ALLOWED_EVENT_TYPES.has(event_type):
		return { "ok": false, "error": "event type is not allow-listed: %s" % event_type }
	var fingerprint: String = _fingerprint(event)
	for entry in state["events"]["processed"]:
		if entry.get("eventId") == event.get("eventId"):
			if entry.get("fingerprint") != fingerprint:
				return { "ok": false, "error": "eventId reused with different payload: %s" % event.get("eventId") }
			return {
				"eventId": event.get("eventId"),
				"payload": _deep_copy(event),
				"duplicate": true,
				"evaluations": [],
				"firedRuleIds": [],
				"orderedEffects": [],
				"resultingState": _state_view(state),
			}
	var draft: Dictionary = _deep_copy(state)
	if event_type == "resource.totalAtLeast":
		if not event.get("resourceId") is String or not event.get("total") is int or not event.get("delta") is int or int(event.get("delta")) <= 0:
			return { "ok": false, "error": "resource.totalAtLeast requires resourceId, integer total, and positive integer delta" }
		var resource_id: String = str(event.get("resourceId"))
		if not catalog.get("resource", {}).has(resource_id):
			return { "ok": false, "error": "event references unregistered resource: %s" % resource_id }
		if int(draft["resources"].get(resource_id, 0)) + int(event.get("delta")) != int(event.get("total")):
			return { "ok": false, "error": "resource event total does not match applied delta: %s" % resource_id }
		var apply_result: Dictionary = apply_effects([{ "op": "resource.add", "resourceId": resource_id, "amount": int(event.get("delta")) }], draft, catalog, pkg)
		if not apply_result["ok"]:
			return apply_result
	else:
		if not event.get("conversationId") is String or not event.get("choiceId") is String:
			return { "ok": false, "error": "conversation.choice requires conversationId and choiceId" }
		draft["conversationChoices"][str(event.get("conversationId"))] = str(event.get("choiceId"))

	var evaluations: Array = []
	var fired_rule_ids: Array = []
	var ordered_effects: Array = []
	for rule in rules:
		if not (rule is Dictionary):
			continue
		var trigger: Dictionary = rule.get("trigger", {}) if rule.get("trigger") is Dictionary else {}
		var trigger_matched: bool = str(trigger.get("event")) == event_type
		if trigger_matched:
			for key in trigger:
				if key == "event":
					continue
				var expected: Variant = trigger[key]
				if key == "value":
					if not event.get("total") is int or int(event.get("total")) < int(expected):
						trigger_matched = false
						break
				elif event.get(key) != expected:
					trigger_matched = false
					break
		var already_fired: bool = rule.get("once", false) and draft["events"]["firedOnceRules"].has(str(rule.get("id")))
		var condition_result: Variant = null
		if trigger_matched and not already_fired:
			var eval: Dictionary = evaluate_condition(rule.get("when", { "all": [] }), draft, catalog)
			if not eval["ok"]:
				return eval
			condition_result = eval["value"]
		evaluations.append({ "ruleId": str(rule.get("id")), "triggerMatched": trigger_matched, "skippedAsAlreadyFired": already_fired, "conditionResult": condition_result })
		if not trigger_matched or already_fired or condition_result == false:
			continue
		var apply_result: Dictionary = apply_effects(rule.get("effects", []), draft, catalog, pkg)
		if not apply_result["ok"]:
			return apply_result
		if rule.get("once", false):
			draft["events"]["firedOnceRules"].append(str(rule.get("id")))
		fired_rule_ids.append(str(rule.get("id")))
		for effect in rule.get("effects", []):
			ordered_effects.append({ "ruleId": str(rule.get("id")), "effect": _deep_copy(effect) })
	draft["events"]["processed"].append({ "eventId": event.get("eventId"), "fingerprint": fingerprint })
	var trace: Dictionary = {
		"eventId": event.get("eventId"),
		"payload": _deep_copy(event),
		"duplicate": false,
		"evaluations": evaluations,
		"firedRuleIds": fired_rule_ids,
		"orderedEffects": ordered_effects,
		"resultingState": _state_view(draft),
	}
	draft["events"]["log"].append(trace)
	for key in state:
		state[key] = draft[key]
	return trace


static func _state_view(state: Dictionary) -> Dictionary:
	return {
		"resources": _deep_copy(state["resources"]),
		"relationships": _deep_copy(state["relationships"]),
		"flags": _deep_copy(state["flags"]),
		"unlocks": _deep_copy(state["unlocks"]),
		"conversationChoices": _deep_copy(state["conversationChoices"]),
	}


## Canonicalize a value: sort dictionary keys recursively so the JSON
## fingerprint is stable regardless of insertion order.
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


static func _fingerprint(event: Dictionary) -> String:
	return JSON.stringify(_canonicalize(event))


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


static func _only_keys(effect: Dictionary, expected: Array) -> bool:
	for key in effect:
		if not expected.has(key):
			return false
	for key in expected:
		if not effect.has(key):
			return false
	return true


static func _resource_bounds(pkg: Dictionary, resource_id: String) -> Dictionary:
	for resource in _as_array(pkg["resources"].get("resources")):
		if resource is Dictionary and str(resource.get("id")) == resource_id:
			var bounds: Variant = resource.get("bounds")
			return bounds if bounds is Dictionary else {}
	return {}


static func _find_encounter(pkg: Dictionary, encounter_id: String) -> Dictionary:
	for encounter in _as_array(pkg["combat"].get("encounters")):
		if encounter is Dictionary and str(encounter.get("id")) == encounter_id:
			return encounter
	return {}


static func _type_class(value: Variant) -> String:
	if value is bool:
		return "bool"
	if value is int or value is float:
		return "number"
	if value is String:
		return "string"
	return "other"


static func _as_array(value: Variant) -> Array:
	return value if value is Array else []
