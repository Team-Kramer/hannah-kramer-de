extends SceneTree

class TypedRecord:
	extends RefCounted

	var id: String
	var fields: Dictionary

	func _init(record_id: String, raw_fields: Dictionary) -> void:
		id = record_id
		fields = raw_fields.duplicate(true)

	func to_json_data() -> Dictionary:
		var result: Dictionary = {}
		for key in fields:
			result[key] = _serialize_value(fields[key])
		result["id"] = id
		return result

	func _serialize_value(value: Variant) -> Variant:
		if value is TypedRecord or value is ResourceDefinition:
			return value.to_json_data()
		if value is Dictionary:
			var result: Dictionary = {}
			for key in value:
				result[key] = _serialize_value(value[key])
			return result
		if value is Array:
			var result: Array = []
			for item in value:
				result.append(_serialize_value(item))
			return result
		return value


class ResourceDefinition:
	extends RefCounted

	var id: String
	var kind: String
	var name_key: String
	var icon_asset_id: String
	var initial_amount: int
	var minimum: int
	var maximum: int
	var has_maximum: bool
	var source: Dictionary

	func to_json_data() -> Dictionary:
		var result := source.duplicate(true)
		result["id"] = id
		result["kind"] = kind
		result["nameKey"] = name_key
		result["iconAssetId"] = icon_asset_id
		result["initialAmount"] = initial_amount
		var bounds := {"min": minimum}
		if has_maximum:
			bounds["max"] = maximum
		result["bounds"] = bounds
		return result


const MAX_SAFE_INTEGER := 9007199254740991.0
const PackageLoader := preload("res://package_loader.gd")
const ConditionDsl := preload("res://condition_dsl.gd")
const EventEngine := preload("res://event_engine.gd")
const PackageReloader := preload("res://package_reloader.gd")

var failures: Array[String] = []
var fixture_root: String


func _initialize() -> void:
	call_deferred("_run")


func _run() -> void:
	var user_args := OS.get_cmdline_user_args()
	fixture_root = user_args[0].simplify_path() if not user_args.is_empty() else \
		ProjectSettings.globalize_path("res://").path_join("../../fixtures/spielplatz_demo").simplify_path()

	var manifest_result := _read_json("manifest.json")
	_expect(manifest_result.ok, "manifest parses")
	if not manifest_result.ok:
		_finish()
		return

	var manifest: Dictionary = manifest_result.value
	var documents: Dictionary = {}
	for file_path in manifest.get("files", []):
		var result := _read_json(file_path)
		_expect(result.ok, "%s parses" % file_path)
		if result.ok:
			documents[file_path] = result.value

	if failures.is_empty():
		var typed_documents: Dictionary = {}
		for file_path in documents:
			typed_documents[file_path] = _convert_to_typed(documents[file_path], file_path)
		_test_typed_records(typed_documents)
		_test_typed_resource_boundary(typed_documents)
		_test_json_round_trip(documents, typed_documents)
		_test_invalid_diagnostic()
		_test_unicode_and_optional_values(documents)
		_test_package_contract()
		_test_package_contract_rejects_broken_package()
		_test_numeric_canonicalization()
		_test_condition_dsl()
		_test_event_engine()
		_test_package_reloader()

	_finish()


func _read_json(relative_path: String) -> Dictionary:
	var absolute_path := fixture_root.path_join(relative_path)
	if not FileAccess.file_exists(absolute_path):
		return {"ok": false, "error": "file not found: %s" % relative_path}
	var file := FileAccess.open(absolute_path, FileAccess.READ)
	if file == null:
		return {"ok": false, "error": "cannot open %s" % relative_path}
	var parser := JSON.new()
	var parse_error := parser.parse(file.get_as_text())
	if parse_error != OK:
		return {
			"ok": false,
			"error": "%s:%d: %s" % [relative_path, parser.get_error_line(), parser.get_error_message()]
		}
	if not parser.data is Dictionary:
		return {"ok": false, "error": "%s must contain a JSON object" % relative_path}
	return {"ok": true, "value": parser.data}


func _convert_to_typed(value: Variant, context: String) -> Variant:
	if value is Dictionary:
		if value.has("id"):
			if context.begins_with("resources.json.resources["):
				var parsed_resource := _parse_resource(value, context)
				_expect(parsed_resource.ok, "%s validates into ResourceDefinition: %s" % [context, parsed_resource.get("error", "")])
				return parsed_resource.get("value")
			var record := _parse_typed_record(value, context)
			if record == null:
				return null
			var fields: Dictionary = {}
			for key in value:
				if key != "id":
					fields[key] = _convert_to_typed(value[key], "%s.%s" % [context, key])
			record.fields = fields
			return record
		var converted: Dictionary = {}
		for key in value:
			converted[key] = _convert_to_typed(value[key], "%s.%s" % [context, key])
		return converted
	if value is Array:
		var converted: Array = []
		for index in value.size():
			converted.append(_convert_to_typed(value[index], "%s[%d]" % [context, index]))
		return converted
	return value


func _test_typed_records(documents: Dictionary) -> void:
	var typed_count := 0
	for file_path in documents:
		typed_count += _count_typed_records(documents[file_path])
	_expect(typed_count >= 30, "typed ID records discovered across package (found %d)" % typed_count)


func _count_typed_records(value: Variant) -> int:
	var count := 0
	if value is TypedRecord or value is ResourceDefinition:
		count += 1
		if value is TypedRecord:
			count += _count_typed_records(value.fields)
		return count
	if value is Dictionary:
		for nested_value in value.values():
			count += _count_typed_records(nested_value)
	elif value is Array:
		for item in value:
			count += _count_typed_records(item)
	return count


func _parse_typed_record(value: Variant, context: String) -> TypedRecord:
	if not value is Dictionary:
		_fail("%s must be an object" % context)
		return null
	if typeof(value.get("id")) != TYPE_STRING or value["id"].is_empty():
		_fail("%s.id must be a non-empty string" % context)
		return null
	var record := TypedRecord.new(value["id"], value)
	return record


func _test_typed_resource_boundary(documents: Dictionary) -> void:
	var resources: Array = documents["resources.json"]["resources"]
	var parsed_resources: Array[ResourceDefinition] = []
	for resource in resources:
		parsed_resources.append(resource)
	if parsed_resources.size() != 2:
		_fail("expected two typed resource definitions")
		return
	var wood: ResourceDefinition = parsed_resources[0]
	_expect(wood.minimum == 0 and wood.maximum == 999 and wood.has_maximum, "numeric bounds 0 and 999 remain typed")
	_expect(wood.initial_amount == 0, "zero initial amount remains typed")

	var light: ResourceDefinition = parsed_resources[1]
	var serialized := light.to_json_data()
	_expect(
		serialized.get("x-authoring") == light.source.get("x-authoring"),
		"unknown x-authoring field is preserved"
	)


func _parse_resource(value: Variant, context: String) -> Dictionary:
	if not value is Dictionary:
		return {"ok": false, "error": "%s must be an object" % context}
	if typeof(value.get("id")) != TYPE_STRING or value["id"].is_empty():
		return {"ok": false, "error": "%s.id must be a non-empty string" % context}
	if typeof(value.get("kind")) != TYPE_STRING:
		return {"ok": false, "error": "%s.kind must be a string" % context}
	if typeof(value.get("nameKey")) != TYPE_STRING:
		return {"ok": false, "error": "%s.nameKey must be a string" % context}
	if typeof(value.get("iconAssetId")) != TYPE_STRING:
		return {"ok": false, "error": "%s.iconAssetId must be a string" % context}
	if not _is_integer_number(value.get("initialAmount")):
		return {"ok": false, "error": "%s.initialAmount must be an integer" % context}
	if not value.get("bounds") is Dictionary:
		return {"ok": false, "error": "%s.bounds must be an object" % context}
	var bounds: Dictionary = value["bounds"]
	if not _is_integer_number(bounds.get("min")):
		return {"ok": false, "error": "%s.bounds.min must be an integer" % context}
	var has_maximum := bounds.has("max")
	if has_maximum and not _is_integer_number(bounds["max"]):
		return {"ok": false, "error": "%s.bounds.max must be an integer" % context}

	var definition := ResourceDefinition.new()
	definition.id = value["id"]
	definition.kind = value["kind"]
	definition.name_key = value["nameKey"]
	definition.icon_asset_id = value["iconAssetId"]
	definition.initial_amount = int(value["initialAmount"])
	definition.minimum = int(bounds["min"])
	definition.has_maximum = has_maximum
	if has_maximum:
		definition.maximum = int(bounds["max"])
	definition.source = value.duplicate(true)
	return {"ok": true, "value": definition}


func _is_integer_number(value: Variant) -> bool:
	if typeof(value) == TYPE_INT:
		return true
	if typeof(value) == TYPE_FLOAT:
		return value == floor(value)
	return false


func _test_json_round_trip(documents: Dictionary, typed_documents: Dictionary) -> void:
	var serialized: Dictionary = {}
	for file_path in typed_documents:
		serialized[file_path] = _serialize_value(typed_documents[file_path])
	var encoded_once := JSON.stringify(_normalize_numeric_types(serialized), "", true, true)
	var decoded: Variant = JSON.parse_string(encoded_once)
	_expect(decoded is Dictionary, "serialized package parses again")
	if not decoded is Dictionary:
		return
	var reloaded_typed: Dictionary = {}
	for file_path in decoded:
		reloaded_typed[file_path] = _convert_to_typed(decoded[file_path], file_path)
	var encoded_twice := JSON.stringify(_normalize_numeric_types(_serialize_value(reloaded_typed)), "", true, true)
	if encoded_once != encoded_twice:
		var difference_index := 0
		var limit: int = mini(encoded_once.length(), encoded_twice.length())
		while difference_index < limit and encoded_once[difference_index] == encoded_twice[difference_index]:
			difference_index += 1
		print("SERIALIZATION DIFF: %s <> %s" % [
			encoded_once.substr(maxi(0, difference_index - 30), 80),
			encoded_twice.substr(maxi(0, difference_index - 30), 80)
		])
	_expect(encoded_once == encoded_twice, "canonical JSON serialization is deterministic")
	_expect(
		_normalize_numeric_types(decoded) == _normalize_numeric_types(documents),
		"typed entities serialize and reload without data loss"
	)


func _serialize_value(value: Variant) -> Variant:
	if value is TypedRecord or value is ResourceDefinition:
		return value.to_json_data()
	if value is Dictionary:
		var result: Dictionary = {}
		for key in value:
			result[key] = _serialize_value(value[key])
		return result
	if value is Array:
		var result: Array = []
		for item in value:
			result.append(_serialize_value(item))
		return result
	return value


func _normalize_numeric_types(value: Variant) -> Variant:
	if value is Dictionary:
		var result: Dictionary = {}
		for key in value:
			result[key] = _normalize_numeric_types(value[key])
		return result
	if value is Array:
		var result: Array = []
		for item in value:
			result.append(_normalize_numeric_types(item))
		return result
	if typeof(value) == TYPE_FLOAT and absf(value) <= MAX_SAFE_INTEGER and value == floor(value):
		return int(value)
	return value


func _test_invalid_diagnostic() -> void:
	var invalid_resource := {
		"id": "invalid",
		"kind": "stock",
		"nameKey": "resource.invalid.name",
		"iconAssetId": "resource_invalid",
		"initialAmount": "zero",
		"bounds": {"min": 0}
	}
	var result := _parse_resource(invalid_resource, "resources.json.resources[0]")
	_expect(not result.ok, "wrong field type is rejected")
	_expect(
		String(result.get("error", "")).contains("resources.json.resources[0].initialAmount"),
		"wrong-type diagnostic identifies entity and field"
	)


func _test_unicode_and_optional_values(documents: Dictionary) -> void:
	var locales: Dictionary = documents["locales/de.json"]["strings"]
	_expect(String(locales["conversation.juan_playground.wish.text"]).contains("ü"), "Unicode text survives JSON load")
	var producer: Dictionary = documents["resources.json"]["producers"][0]
	_expect(producer.has("maxUses") and producer["maxUses"] == null, "optional null maxUses survives")
	_expect(documents["resources.json"]["workerRoles"].is_empty(), "empty entity arrays survive")
	_expect(documents["resources.json"]["recipes"][0]["outputs"]["lichttropfen"] == 1, "integer output boundary survives")


func _test_package_contract() -> void:
	var result: Dictionary = PackageLoader.load_package(fixture_root)
	_expect(result.ok, "Godot package loader validates the canonical fixture")
	if not result.ok:
		for message in result["messages"]:
			if message["level"] == "error":
				print("  contract error: %s" % message["text"])
	var catalog: Dictionary = result["catalog"]
	_expect(catalog["resource"].has("holz") and catalog["resource"].has("lichttropfen"), "catalog registers canonical resources")
	_expect(catalog["npc"].has("juan") and catalog["conversation"].has("juan_playground"), "catalog registers NPC and conversation")
	_expect(catalog["story"].has("story_spielplatz"), "catalog registers the story id")
	_expect(catalog["encounter"].has("playground_shadow") and catalog["enemy"].has("knotted_shadow"), "catalog registers combat entities")
	var passed := false
	for message in result["messages"]:
		if message["level"] == "ok" and message["text"].contains("Structural and cross-domain validation passed"):
			passed = true
	_expect(passed, "loader reports structural and cross-domain validation passed")


func _test_package_contract_rejects_broken_package() -> void:
	var temp_dir := DirAccess.make_dir_recursive_absolute(
		"user://f2_broken_package"
	)
	_expect(temp_dir == OK, "broken-package temp dir created")
	_write_broken_package("user://f2_broken_package")
	var result: Dictionary = PackageLoader.load_package("user://f2_broken_package")
	_expect(not result.ok, "broken package is rejected by the Godot loader")
	var error_text := ""
	for message in result["messages"]:
		if message["level"] == "error":
			error_text += message["text"] + "\n"
	_expect(error_text.contains("references unknown resource"), "broken package reports the unknown resource reference")
	_expect(error_text.contains("missing text key"), "broken package reports the missing text key")
	DirAccess.remove_absolute("user://f2_broken_package")


func _write_broken_package(dir: String) -> void:
	var manifest := {
		"schemaVersion": 1,
		"packId": "broken",
		"files": ["resources.json", "locales/de.json"],
	}
	_write_json(dir.path_join("manifest.json"), manifest)
	# Recipe references a resource id that is not registered.
	_write_json(dir.path_join("resources.json"), {
		"schemaVersion": 1,
		"packId": "broken",
		"resources": [
			{"id": "holz", "kind": "stock", "nameKey": "resource.holz.name", "iconAssetId": "resource_holz", "initialAmount": 0, "bounds": {"min": 0, "max": 999}}
		],
		"producers": [],
		"recipes": [
			{"id": "make_lichttropfen", "locationId": "lichtwald_spielplatz", "inputs": {"holz": 2}, "outputs": {"lichttropfen": 1}}
		],
		"workerRoles": []
	})
	# Locale is missing the resource name key referenced above.
	DirAccess.make_dir_recursive_absolute(dir.path_join("locales"))
	_write_json(dir.path_join("locales/de.json"), {
		"schemaVersion": 1,
		"packId": "broken",
		"locale": "de",
		"strings": {}
	})


func _write_json(path: String, value: Variant) -> void:
	var file := FileAccess.open(path, FileAccess.WRITE)
	file.store_string(JSON.stringify(value))
	file.close()


func _test_numeric_canonicalization() -> void:
	# Godot's JSON round-trip can widen integral numbers to floats (PB-02d).
	var widened: Dictionary = {"initialAmount": 3.0, "nested": {"bounds": {"min": 0.0, "max": 999.0}}, "ratio": 0.5}
	var canonical: Variant = PackageLoader.canonicalize_numeric_types(widened)
	_expect(typeof(canonical["initialAmount"]) == TYPE_INT, "integral float initialAmount canonicalized to int")
	_expect(typeof(canonical["nested"]["bounds"]["min"]) == TYPE_INT, "integral float bounds.min canonicalized to int")
	_expect(typeof(canonical["nested"]["bounds"]["max"]) == TYPE_INT, "integral float bounds.max canonicalized to int")
	_expect(typeof(canonical["ratio"]) == TYPE_FLOAT, "non-integral float is preserved")


func _test_condition_dsl() -> void:
	var result: Dictionary = PackageLoader.load_package(fixture_root)
	if not result.ok:
		_expect(false, "condition DSL: fixture package loads")
		return
	var catalog: Dictionary = result["catalog"]

	# Allow-listed + registered paths validate; unknown scopes/IDs do not.
	_expect(ConditionDsl.validate_condition_path("resources.holz", catalog)["ok"], "DSL validates resources.holz")
	_expect(ConditionDsl.validate_condition_path("relationships.juan", catalog)["ok"], "DSL validates relationships.juan")
	_expect(ConditionDsl.validate_condition_path("flags.juan_listened", catalog)["ok"], "DSL validates flags (no registration)")
	_expect(ConditionDsl.validate_condition_path("story.visited.opening", catalog)["ok"], "DSL validates story.visited.opening")
	_expect(ConditionDsl.validate_condition_path("unlocks.recipes.make_lichttropfen", catalog)["ok"], "DSL validates unlocks.recipes")
	_expect(ConditionDsl.validate_condition_path("unlocks.combatEncounters.playground_shadow", catalog)["ok"], "DSL validates unlocks.combatEncounters")
	_expect(not ConditionDsl.validate_condition_path("resources.unknown", catalog)["ok"], "DSL rejects unregistered resource id")
	_expect(not ConditionDsl.validate_condition_path("unlocks.unknownScope.make_lichttropfen", catalog)["ok"], "DSL rejects unknown unlock scope")
	_expect(not ConditionDsl.validate_condition_path("score.holz", catalog)["ok"], "DSL rejects non-allow-listed scope")
	_expect(not ConditionDsl.validate_condition_path(42, catalog)["ok"], "DSL rejects non-string path")

	# read_condition_path: strict read with type check.
	var state: Dictionary = {
		"resources": {"holz": 2, "lichttropfen": 0},
		"relationships": {"juan": 1},
		"flags": {"juan_listened": true},
		"story": {"visited": {"opening": true}},
		"unlocks": {"recipes": {"make_lichttropfen": false}},
	}
	var read: Dictionary = ConditionDsl.read_condition_path("resources.holz", state, catalog)
	_expect(read["ok"] and read["value"] == 2, "DSL reads resources.holz == 2")
	_expect(not ConditionDsl.read_condition_path("flags.missing_flag", state, catalog)["ok"], "DSL read fails on missing field")
	_expect(ConditionDsl.read_condition_path("unlocks.recipes.make_lichttropfen", state, catalog)["value"] == false, "DSL reads present unlock entry (false)")
	_expect(not ConditionDsl.read_condition_path("unlocks.combatEncounters.playground_shadow", state, catalog)["ok"], "DSL read fails on missing unlock entry")

	# exists: presence only, missing field is false (not an error).
	_expect(ConditionDsl.condition_path_exists("flags.juan_listened", state, catalog)["value"] == true, "DSL exists true for present flag")
	_expect(ConditionDsl.condition_path_exists("flags.missing_flag", state, catalog)["value"] == false, "DSL exists false for missing flag")
	_expect(ConditionDsl.condition_path_exists("unlocks.recipes.make_lichttropfen", state, catalog)["value"] == true, "DSL exists true for present unlock entry")

	# compare_condition_value: canonical operator set.
	_expect(ConditionDsl.compare_condition_value(2, "eq", 2)["value"] == true, "DSL eq 2==2")
	_expect(ConditionDsl.compare_condition_value(2, "ne", 3)["value"] == true, "DSL ne 2!=3")
	_expect(ConditionDsl.compare_condition_value(3, "gt", 2)["value"] == true, "DSL gt 3>2")
	_expect(ConditionDsl.compare_condition_value(2, "gte", 2)["value"] == true, "DSL gte 2>=2")
	_expect(ConditionDsl.compare_condition_value(1, "lt", 2)["value"] == true, "DSL lt 1<2")
	_expect(ConditionDsl.compare_condition_value(2, "lte", 2)["value"] == true, "DSL lte 2<=2")
	_expect(ConditionDsl.compare_condition_value(2.0, "eq", 2)["value"] == true, "DSL eq treats 2.0 == 2 numerically")
	_expect(ConditionDsl.compare_condition_value(2, "eq", true)["value"] == false, "DSL eq is strict across number/bool")
	_expect(not ConditionDsl.compare_condition_value(2, "neq", 3)["ok"], "DSL rejects non-canonical op spelling")


func _test_event_engine() -> void:
	var result: Dictionary = PackageLoader.load_package(fixture_root)
	if not result.ok:
		_expect(false, "event engine: fixture package loads")
		return
	var pkg: Dictionary = result["assembled"]
	var catalog: Dictionary = result["catalog"]
	var rules: Array = pkg["rules"]["rules"]
	var state: Dictionary = EventEngine.initial_state(pkg)

	# Initial state is data-driven from the package.
	_expect(state["resources"]["holz"] == 0 and state["resources"]["lichttropfen"] == 0, "engine initial resources from initialAmount")
	_expect(state["relationships"]["juan"] == 0, "engine initial relationship from initialRelationship")
	_expect(state["flags"]["encounter_playground_shadow_unlocked"] == false and state["flags"]["juan_listened"] == false, "engine flags derived from flag.set effects")
	_expect(state["unlocks"]["recipes"]["make_lichttropfen"] == false and state["unlocks"]["combatEncounters"]["playground_shadow"] == false, "engine unlocks initialized false")
	_expect(state["story"]["visited"]["opening"] == false, "engine story nodes initialized false")

	# resource.totalAtLeast event: applying the delta must match the total,
	# and the unlock_playground_options rule fires once.
	var trace: Dictionary = EventEngine.dispatch_event(
		{ "eventId": "ev_holz_2", "type": "resource.totalAtLeast", "resourceId": "holz", "total": 2, "delta": 2 },
		rules, state, catalog, pkg
	)
	_expect(trace.get("ok", true), "engine dispatches resource.totalAtLeast event")
	_expect(trace.get("duplicate") == false, "engine first event is not a duplicate")
	_expect(trace.get("firedRuleIds") == ["unlock_playground_options"], "engine fires the unlock rule")
	_expect(state["resources"]["holz"] == 2, "engine applied the resource delta")
	_expect(state["unlocks"]["recipes"]["make_lichttropfen"] == true, "engine unlocked the recipe")
	_expect(state["unlocks"]["combatEncounters"]["playground_shadow"] == true, "engine unlocked the combat encounter")
	_expect(state["flags"]["encounter_playground_shadow_unlocked"] == true, "engine set the unlock flag")
	_expect(trace["resultingState"]["resources"]["holz"] == 2, "engine trace carries the resulting state")

	# Duplicate eventId with the same payload is idempotent.
	var dup: Dictionary = EventEngine.dispatch_event(
		{ "eventId": "ev_holz_2", "type": "resource.totalAtLeast", "resourceId": "holz", "total": 2, "delta": 2 },
		rules, state, catalog, pkg
	)
	_expect(dup.get("duplicate") == true, "engine duplicate eventId is idempotent")
	_expect(state["resources"]["holz"] == 2, "engine duplicate does not re-apply the delta")

	# Reusing an eventId with a different payload is rejected.
	var reused: Dictionary = EventEngine.dispatch_event(
		{ "eventId": "ev_holz_2", "type": "resource.totalAtLeast", "resourceId": "holz", "total": 3, "delta": 1 },
		rules, state, catalog, pkg
	)
	_expect(not reused.get("ok", true), "engine rejects eventId reused with different payload")

	# A total that does not match the applied delta is rejected.
	var mismatch: Dictionary = EventEngine.dispatch_event(
		{ "eventId": "ev_holz_bad", "type": "resource.totalAtLeast", "resourceId": "holz", "total": 9, "delta": 1 },
		rules, state, catalog, pkg
	)
	_expect(not mismatch.get("ok", true), "engine rejects resource event total/delta mismatch")

	# conversation.choice event: juan_listened rule adjusts the relationship.
	var conv: Dictionary = EventEngine.dispatch_event(
		{ "eventId": "ev_juan_listen", "type": "conversation.choice", "conversationId": "juan_playground", "choiceId": "listen" },
		rules, state, catalog, pkg
	)
	_expect(conv.get("ok", true), "engine dispatches conversation.choice event")
	_expect(conv.get("firedRuleIds") == ["juan_listened"], "engine fires the juan_listened rule")
	_expect(state["relationships"]["juan"] == 1, "engine adjusted the relationship")
	_expect(state["flags"]["juan_listened"] == true, "engine set the juan_listened flag")
	_expect(state["conversationChoices"]["juan_playground"] == "listen", "engine recorded the conversation choice")

	# An event with no matching rule (different resourceId) applies its delta
	# but fires no rules.
	var no_match: Dictionary = EventEngine.dispatch_event(
		{ "eventId": "ev_licht_1", "type": "resource.totalAtLeast", "resourceId": "lichttropfen", "total": 1, "delta": 1 },
		rules, state, catalog, pkg
	)
	_expect(no_match.get("ok", true) and no_match.get("firedRuleIds").is_empty(), "engine no-match event fires no rules")
	_expect(state["resources"]["lichttropfen"] == 1, "engine applied the no-match delta")


func _test_package_reloader() -> void:
	var valid_dir := "user://f2_reload_valid"
	var broken_dir := "user://f2_reload_broken"
	DirAccess.remove_absolute(valid_dir)
	DirAccess.remove_absolute(broken_dir)
	_copy_dir_recursive(fixture_root, valid_dir)
	_copy_dir_recursive(fixture_root, broken_dir)
	_break_package_resources(broken_dir)

	var reloader: PackageReloader = PackageReloader.new()
	_expect(not reloader.has_active_package(), "reloader starts with no active package")

	var first: Dictionary = reloader.load(valid_dir)
	_expect(first.ok and first.reloaded, "reloader initial load activates a valid package")
	_expect(reloader.has_active_package(), "reloader reports an active package after load")
	_expect(reloader.current() is Dictionary and not reloader.current().is_empty(), "reloader serves the active package")

	var second: Dictionary = reloader.reload(valid_dir)
	_expect(second.ok and second.reloaded, "reloader accepts a valid reload")

	var broken: Dictionary = reloader.reload(broken_dir)
	_expect(not broken.ok, "reloader rejects an invalid reload")
	_expect(broken.keptLastValid, "reloader keeps the last valid package on invalid reload")
	_expect(reloader.current() is Dictionary and not reloader.current().is_empty(), "reloader still serves the last valid package")
	var error_text := ""
	for message in broken["messages"]:
		if message["level"] == "error":
			error_text += message["text"] + "\n"
	_expect(error_text.contains("unknown resource"), "invalid reload reports the validation error")

	var recovered: Dictionary = reloader.reload(valid_dir)
	_expect(recovered.ok and recovered.reloaded, "reloader recovers on the next valid reload")

	DirAccess.remove_absolute(valid_dir)
	DirAccess.remove_absolute(broken_dir)


func _copy_dir_recursive(src: String, dst: String) -> void:
	DirAccess.make_dir_recursive_absolute(dst)
	var dir := DirAccess.open(src)
	for sub in dir.get_directories():
		_copy_dir_recursive(src.path_join(sub), dst.path_join(sub))
	for entry in dir.get_files():
		DirAccess.copy_absolute(src.path_join(entry), dst.path_join(entry))


func _break_package_resources(dir: String) -> void:
	var path := dir.path_join("resources.json")
	var parser := JSON.new()
	parser.parse(FileAccess.get_file_as_string(path))
	var doc: Dictionary = parser.data
	for recipe in doc.get("recipes", []):
		recipe["inputs"] = {"unknown_resource": 1}
	var file := FileAccess.open(path, FileAccess.WRITE)
	file.store_string(JSON.stringify(doc))
	file.close()


func _expect(condition: bool, message: String) -> void:
	if condition:
		print("PASS: %s" % message)
	else:
		_fail(message)


func _fail(message: String) -> void:
	failures.append(message)
	push_error("FAIL: %s" % message)


func _finish() -> void:
	if failures.is_empty():
		print("F2 PASS")
		quit(0)
		return
	print("F2 FAIL: %d assertion(s)" % failures.size())
	quit(1)
