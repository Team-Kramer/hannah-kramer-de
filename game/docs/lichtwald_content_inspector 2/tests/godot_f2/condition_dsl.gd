## Shared condition DSL for Lichtwald content packages (PD-03a).
##
## GDScript port of web/js/condition_dsl.js (PD-01b). The standalone workbench
## and the Godot runtime must agree on the condition operators, the state-path
## grammar, and the comparison semantics. This module is the single source of
## truth for that contract on the Godot side and is verified against the same
## JSON fixtures as the Node prototype.
##
## Canonical operator set (PB-02b): eq, ne, gt, gte, lt, lte, exists.
##   - `ne` is the canonical spelling (never `neq`).
##   - `exists` is a structural operator: a leaf is true when the state field
##     is present at the path. It takes no `value`.
##   - `not` is a structural wrapper handled by the evaluator, not a leaf op.
##
## State path grammar (allow-listed scopes):
##   resources.<id>                                  -> state.resources[id]
##   relationships.<id>                              -> state.relationships[id]
##   flags.<id>                                      -> state.flags[id]
##   story.visited.<nodeId>                          -> state.story.visited[nodeId]
##   unlocks.<recipes|producers|combatEncounters>.<id> -> state.unlocks[scope][id]
##
## The catalog argument is the ID-set catalog produced by package_loader.gd
## (keys: resource, npc, recipe, producer, encounter, story, ...).

const COMPARISON_OPERATORS: Array[String] = ["eq", "ne", "gt", "gte", "lt", "lte"]
const CONDITION_OPERATORS: Array[String] = ["eq", "ne", "gt", "gte", "lt", "lte", "exists"]
const UNLOCK_SCOPES: Array[String] = ["recipes", "producers", "combatEncounters"]


## Validate that a condition path is allow-listed and references a registered
## ID. Does not touch runtime state, so it is safe to call for `exists` (where
## a missing field must not throw) and for the lenient workbench preview.
##
## Returns { ok: bool, error: String }.
static func validate_condition_path(path_value: Variant, catalog: Dictionary) -> Dictionary:
	if not (path_value is String):
		return { "ok": false, "error": "condition.path must be a string" }
	var parts: PackedStringArray = (path_value as String).split(".")
	if parts.size() < 2:
		return { "ok": false, "error": "condition path is not allow-listed: %s" % path_value }
	var scope: String = parts[0]
	var id: String = parts[1]
	var leaf: String = parts[2] if parts.size() >= 3 else ""

	# Which catalog set must the referenced ID belong to?
	var registered_set: Dictionary = {}
	var registered_required := false
	if scope == "resources" and parts.size() == 2:
		registered_set = catalog.get("resource", {})
		registered_required = true
	elif scope == "relationships" and parts.size() == 2:
		registered_set = catalog.get("npc", {})
		registered_required = true
	elif scope == "flags" and parts.size() == 2:
		registered_required = false
	elif scope == "story" and id == "visited" and parts.size() == 3:
		registered_set = catalog.get("storyNode", {})
		registered_required = true
	elif scope == "unlocks" and parts.size() == 3 and UNLOCK_SCOPES.has(id):
		if id == "recipes":
			registered_set = catalog.get("recipe", {})
		elif id == "producers":
			registered_set = catalog.get("producer", {})
		else:
			registered_set = catalog.get("encounter", {})
		registered_required = true
	else:
		return { "ok": false, "error": "condition path is not allow-listed: %s" % path_value }

	var key: String
	if scope == "story":
		key = leaf
	elif parts.size() == 3:
		key = leaf
	else:
		key = id
	if registered_required and not registered_set.has(key):
		return { "ok": false, "error": "condition references unregistered ID: %s" % path_value }
	return { "ok": true, "error": "" }


## Read a condition path against a runtime state. Strict: fails when the field
## is missing or has a non-numeric/boolean type.
##
## Returns { ok: bool, value: Variant, error: String }.
static func read_condition_path(path_value: Variant, state: Dictionary, catalog: Dictionary) -> Dictionary:
	var validation: Dictionary = validate_condition_path(path_value, catalog)
	if not validation["ok"]:
		return { "ok": false, "value": null, "error": validation["error"] }
	var values: Variant = _values_for_path(path_value, state)
	if not (values is Dictionary):
		return { "ok": false, "value": null, "error": "condition state field is missing: %s" % path_value }
	var values_dict: Dictionary = values
	var key: String = _key_for_path(path_value)
	if not values_dict.has(key):
		return { "ok": false, "value": null, "error": "condition state field is missing: %s" % path_value }
	var value: Variant = values_dict[key]
	if not (value is int or value is float or value is bool):
		return { "ok": false, "value": null, "error": "condition state field has wrong type: %s" % path_value }
	return { "ok": true, "value": value, "error": "" }


## `exists` operator: true when the state field is present at the path.
## Validates the path (allow-list + registration) but does not fail for a
## missing field — a missing field simply means the condition is false.
##
## Returns { ok: bool, value: bool, error: String }.
static func condition_path_exists(path_value: Variant, state: Dictionary, catalog: Dictionary) -> Dictionary:
	var validation: Dictionary = validate_condition_path(path_value, catalog)
	if not validation["ok"]:
		return { "ok": false, "value": false, "error": validation["error"] }
	var values: Variant = _values_for_path(path_value, state)
	if not (values is Dictionary):
		return { "ok": true, "value": false, "error": "" }
	var key: String = _key_for_path(path_value)
	return { "ok": true, "value": (values as Dictionary).has(key), "error": "" }


## Compare a resolved value against an expected value using a comparison
## operator. `exists` is not handled here (it is a presence check, see
## condition_path_exists).
##
## Returns { ok: bool, value: bool, error: String }.
static func compare_condition_value(actual: Variant, operator: String, expected: Variant) -> Dictionary:
	match operator:
		"eq":
			return { "ok": true, "value": _loose_eq(actual, expected), "error": "" }
		"ne":
			return { "ok": true, "value": not _loose_eq(actual, expected), "error": "" }
		"gt":
			return { "ok": true, "value": _as_number(actual) > _as_number(expected), "error": "" }
		"gte":
			return { "ok": true, "value": _as_number(actual) >= _as_number(expected), "error": "" }
		"lt":
			return { "ok": true, "value": _as_number(actual) < _as_number(expected), "error": "" }
		"lte":
			return { "ok": true, "value": _as_number(actual) <= _as_number(expected), "error": "" }
		_:
			return { "ok": false, "value": false, "error": "condition operator is not allow-listed: %s" % operator }


## Resolve the scope dictionary for a condition path.
static func _values_for_path(path_value: String, state: Dictionary) -> Variant:
	var parts: PackedStringArray = path_value.split(".")
	var scope: String = parts[0]
	if scope == "resources":
		return state.get("resources", {})
	if scope == "relationships":
		return state.get("relationships", {})
	if scope == "flags":
		return state.get("flags", {})
	if scope == "story":
		var story: Variant = state.get("story", {})
		if story is Dictionary:
			return (story as Dictionary).get("visited", {})
		return {}
	if scope == "unlocks":
		var unlocks: Variant = state.get("unlocks", {})
		if unlocks is Dictionary:
			return (unlocks as Dictionary).get(parts[1], {})
		return {}
	return {}


## The leaf key inside the scope dictionary for a condition path.
static func _key_for_path(path_value: String) -> String:
	var parts: PackedStringArray = path_value.split(".")
	var scope: String = parts[0]
	if scope == "story":
		return parts[2]
	if parts.size() == 3:
		return parts[2]
	return parts[1]


## JS `===` semantics for number/boolean: strict type + value equality.
static func _loose_eq(a: Variant, b: Variant) -> bool:
	if (a is bool) != (b is bool):
		return false
	if a is bool:
		return a == b
	# Both numeric (int/float): compare numerically.
	return _as_number(a) == _as_number(b)


static func _as_number(value: Variant) -> float:
	if value is int:
		return float(value)
	if value is float:
		return value
	return 0.0
