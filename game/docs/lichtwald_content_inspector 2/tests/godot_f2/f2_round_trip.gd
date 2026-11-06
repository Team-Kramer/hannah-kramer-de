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
