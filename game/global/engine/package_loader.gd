extends RefCounted
## Godot-side loader for the Lichtwald JSON content package.
##
## Faithfully mirrors the workbench validator (web/js/validator.js) so the same
## package contract is enforced in both runtimes. It reads the manifest, loads
## every listed file, assembles the package (stories keyed by story id, NPC
## files keyed by NPC id, locales keyed by locale), and runs the structural and
## cross-domain checks. It also exposes the PB-02d float→int canonicalization
## that Godot's JSON round-trip requires.
##
## `load_package(dir)` returns { ok: bool, messages: Array[Dictionary],
## catalog: Dictionary, documents: Dictionary, assembled: Dictionary }.

const MANIFEST_NAME := "manifest.json"

const ALLOWED_EFFECTS: Array[String] = [
	"resource.add",
	"resource.spend",
	"relationship.adjust",
	"unlock",
	"flag.set",
	"event.record",
	"combat.request",
]

const MAX_SAFE_INTEGER := 9007199254740991.0


static func load_package(dir: String) -> Dictionary:
	var messages: Array[Dictionary] = []
	var documents: Dictionary = {}
	var ok := true

	var manifest: Variant = _read_json(dir.path_join(MANIFEST_NAME), messages)
	if manifest == null:
		return { "ok": false, "messages": messages, "catalog": {}, "documents": {}, "assembled": {} }
	# PB-02d: Godot's JSON parser widens integral numbers to floats; the
	# manifest is canonicalized too so schemaVersion prints/compares as int.
	manifest = canonicalize_numeric_types(manifest)
	_add(messages, "ok", "Manifest present (packId=%s, schema=%s)" % [
		str(manifest.get("packId", "?")), str(manifest.get("schemaVersion", "?"))
	])
	if manifest.get("schemaVersion") != 1:
		_add(messages, "warn", "Unexpected schemaVersion: %s" % str(manifest.get("schemaVersion")))

	for file_path in manifest.get("files", []):
		var document: Variant = _read_json(dir.path_join(String(file_path)), messages)
		if document != null:
			# PB-02d: Godot's JSON parser widens integral numbers to floats;
			# canonicalize so downstream consumers see proper integers.
			documents[String(file_path)] = canonicalize_numeric_types(document)

	var pkg := _assemble_package(manifest, documents)
	var catalog := _build_catalogs(pkg, messages)
	_validate(pkg, catalog, messages)

	for message in messages:
		if message["level"] == "error":
			ok = false

	return { "ok": ok, "messages": messages, "catalog": catalog, "documents": documents, "assembled": pkg }


static func _read_json(path: String, messages: Array[Dictionary]) -> Variant:
	if not FileAccess.file_exists(path):
		_add(messages, "error", "missing file: %s" % path)
		return null
	var file := FileAccess.open(path, FileAccess.READ)
	if file == null:
		_add(messages, "error", "cannot open file: %s" % path)
		return null
	var text := file.get_as_text()
	file.close()
	var parser := JSON.new()
	if parser.parse(text) != OK:
		_add(messages, "error", "invalid JSON in %s: %s" % [path, parser.get_error_message()])
		return null
	if not parser.data is Dictionary:
		_add(messages, "error", "top-level JSON must be an object: %s" % path)
		return null
	return parser.data


static func _assemble_package(manifest: Dictionary, documents: Dictionary) -> Dictionary:
	var stories: Dictionary = {}
	var story_files: Dictionary = {}
	var npcs: Dictionary = {}
	var npc_files: Dictionary = {}
	var locales: Dictionary = {}

	for path in documents:
		var document: Dictionary = documents[path]
		if path.begins_with("stories/") and path.ends_with(".json"):
			var fallback_id: String = path.substr(8, path.length() - 8 - 5)
			var id: String = _story_id(document, fallback_id)
			stories[id] = document
			story_files[id] = path
		elif path.begins_with("npcs/") and path.ends_with(".json"):
			var fallback_id: String = path.substr(5, path.length() - 5 - 5)
			var id: String = _npc_file_id(document, fallback_id)
			npcs[id] = document
			npc_files[id] = path
		elif path.begins_with("locales/") and path.ends_with(".json"):
			var locale: String = path.substr(8, path.length() - 8 - 5)
			locales[locale] = document

	return {
		"manifest": manifest,
		"documents": documents,
		"entityFiles": { "stories": story_files, "npcs": npc_files },
		"locations": documents.get("locations.json", {}),
		"combat": documents.get("combat.json", {}),
		"resources": documents.get("resources.json", {}),
		"rules": documents.get("rules.json", {}),
		"assets": documents.get("assets.json", {}),
		"stories": stories,
		"npcs": npcs,
		"locales": locales,
	}


static func _story_id(document: Dictionary, fallback_id: String) -> String:
	if document.has("story") and document["story"] is Dictionary:
		var story_id: String = str(document["story"].get("id", ""))
		if story_id != "":
			return story_id
	if document.get("id") is String and str(document.get("id")) != "":
		return str(document.get("id"))
	return fallback_id


static func _npc_file_id(document: Dictionary, fallback_id: String) -> String:
	if document.has("npcs") and document["npcs"] is Array and not document["npcs"].is_empty():
		var first: Variant = document["npcs"][0]
		if first is Dictionary and first.get("id") is String and str(first.get("id")) != "":
			return str(first.get("id"))
	if document.get("id") is String and str(document.get("id")) != "":
		return str(document.get("id"))
	return fallback_id


static func _build_catalogs(pkg: Dictionary, messages: Array[Dictionary]) -> Dictionary:
	var locations := _as_array(pkg["locations"].get("locations"))
	var resources := _as_array(pkg["resources"].get("resources"))
	var producers := _as_array(pkg["resources"].get("producers"))
	var recipes := _as_array(pkg["resources"].get("recipes"))
	var rules := _as_array(pkg["rules"].get("rules"))
	var enemies := _as_array(pkg["combat"].get("enemies"))
	var encounters := _as_array(pkg["combat"].get("encounters"))
	var assets := _as_array(pkg["assets"].get("assets"))
	var stories: Dictionary = pkg["stories"]
	var story_set: Dictionary = {}
	var story_node_set: Dictionary = {}
	for story_id in stories.keys():
		story_set[str(story_id)] = true
		var story_doc: Variant = stories[story_id]
		if story_doc is Dictionary and (story_doc as Dictionary).get("story") is Dictionary:
			var story: Dictionary = (story_doc as Dictionary)["story"]
			for node in _as_array(story.get("nodes")):
				if node is Dictionary and node.get("id") is String and str(node.get("id")) != "":
					story_node_set[str(node.get("id"))] = true
	var npcs: Dictionary = pkg["npcs"]
	var npcs_flat: Array = []
	var conversations_flat: Array = []
	for npc_id in npcs:
		var document: Dictionary = npcs[npc_id]
		for npc in _as_array(document.get("npcs")):
			npcs_flat.append(npc)
		for conversation in _as_array(document.get("conversations")):
			conversations_flat.append(conversation)

	var catalog := {
		"location": _id_set(locations),
		"resource": _id_set(resources),
		"producer": _id_set(producers),
		"recipe": _id_set(recipes),
		"rule": _id_set(rules),
		"enemy": _id_set(enemies),
		"encounter": _id_set(encounters),
		"asset": _id_set(assets),
		"story": story_set,
		"storyNode": story_node_set,
		"npc": _id_set(npcs_flat),
		"conversation": _id_set(conversations_flat),
	}

	_check_unique(catalog, "location", locations, "locations.json.locations", messages)
	_check_unique(catalog, "resource", resources, "resources.json.resources", messages)
	_check_unique(catalog, "producer", producers, "resources.json.producers", messages)
	_check_unique(catalog, "recipe", recipes, "resources.json.recipes", messages)
	_check_unique(catalog, "rule", rules, "rules.json.rules", messages)
	_check_unique(catalog, "enemy", enemies, "combat.json.enemies", messages)
	_check_unique(catalog, "encounter", encounters, "combat.json.encounters", messages)
	_check_unique(catalog, "asset", assets, "assets.json.assets", messages)
	_check_unique(catalog, "npc", npcs_flat, "npcs", messages)
	_check_unique(catalog, "conversation", conversations_flat, "npcs.conversations", messages)

	return catalog


static func _id_set(records: Array) -> Dictionary:
	var result: Dictionary = {}
	for record in records:
		if record is Dictionary and record.get("id") is String and str(record.get("id")) != "":
			result[str(record.get("id"))] = true
	return result


static func _check_unique(catalog: Dictionary, domain: String, records: Array, source: String, messages: Array[Dictionary]) -> void:
	var seen: Dictionary = {}
	for index in records.size():
		var record: Variant = records[index]
		if not (record is Dictionary) or not (record.get("id") is String) or str(record.get("id")) == "":
			_add(messages, "error", "%s[%d] has no stable id" % [source, index])
		elif seen.has(str(record.get("id"))):
			_add(messages, "error", "%s has duplicate id \"%s\" at %s[%d].id" % [domain, str(record.get("id")), source, index])
		else:
			seen[str(record.get("id"))] = true


static func _validate(pkg: Dictionary, catalog: Dictionary, messages: Array[Dictionary]) -> void:
	var locations := _as_array(pkg["locations"].get("locations"))
	var producers := _as_array(pkg["resources"].get("producers"))
	var recipes := _as_array(pkg["resources"].get("recipes"))
	var rules := _as_array(pkg["rules"].get("rules"))
	var conversations_flat: Array = []
	for npc_id in pkg["npcs"]:
		for conversation in _as_array(pkg["npcs"][npc_id].get("conversations")):
			conversations_flat.append(conversation)

	# Story graph checks.
	var stories: Dictionary = pkg["stories"]
	for story_id in stories:
		var document: Dictionary = stories[story_id]
		var story: Dictionary = document.get("story", document)
		var story_path: String = str(pkg["entityFiles"]["stories"].get(story_id, "stories/%s.json" % story_id))
		var nodes := _as_array(story.get("nodes"))
		var node_ids := _id_set(nodes)
		_check_unique(catalog, "story \"%s\" node" % story_id, nodes, "%s.story.nodes" % story_path, messages)
		if not (story.get("startNodeId") is String) or str(story.get("startNodeId", "")) == "":
			_add(messages, "warn", "Story \"%s\" has no startNodeId" % story_id)
		elif not node_ids.has(str(story.get("startNodeId"))):
			_add(messages, "error", "%s.story.startNodeId references unknown story node \"%s\"" % [story_path, str(story.get("startNodeId"))])
		for index in nodes.size():
			var node: Dictionary = nodes[index]
			for transition in _as_array(node.get("transitions")):
				if transition is Dictionary and transition.get("to") != null and not node_ids.has(str(transition.get("to"))):
					_add(messages, "error", "%s.story.nodes[%d].transitions references unknown story node \"%s\"" % [story_path, index, str(transition.get("to"))])
			for choice in _as_array(node.get("choices")):
				if choice is Dictionary and choice.get("to") != null and not node_ids.has(str(choice.get("to"))):
					_add(messages, "error", "%s.story.nodes[%d].choices references unknown story node \"%s\"" % [story_path, index, str(choice.get("to"))])
			if str(node.get("type", "")) == "conversation" and node.get("conversationId") == null:
				_add(messages, "warn", "Story \"%s\" node \"%s\": conversation type without conversationId" % [story_id, str(node.get("id", ""))])

	# NPC / conversation graph checks.
	for npc_id in pkg["npcs"]:
		var document: Dictionary = pkg["npcs"][npc_id]
		var npc_path: String = str(pkg["entityFiles"]["npcs"].get(npc_id, "npcs/%s.json" % npc_id))
		var file_npcs := _as_array(document.get("npcs"))
		var file_conversations := _as_array(document.get("conversations"))
		_check_unique(catalog, "NPC in %s" % npc_path, file_npcs, "%s.npcs" % npc_path, messages)
		_check_unique(catalog, "conversation in %s" % npc_path, file_conversations, "%s.conversations" % npc_path, messages)
		for conversation in file_conversations:
			var source: String = "%s.conversations.%s" % [npc_path, str(conversation.get("id", ""))]
			var nodes := _as_array(conversation.get("nodes"))
			var node_ids := _id_set(nodes)
			_check_unique(catalog, "dialogue node in %s" % str(conversation.get("id", "")), nodes, "%s.nodes" % source, messages)
			if conversation.get("startNodeId") != null and not node_ids.has(str(conversation.get("startNodeId"))):
				_add(messages, "error", "%s.startNodeId references unknown dialogue node \"%s\"" % [source, str(conversation.get("startNodeId"))])
			for node in nodes:
				for choice in _as_array(node.get("choices")):
					if choice is Dictionary and choice.get("to") != null and not node_ids.has(str(choice.get("to"))):
						_add(messages, "error", "%s.nodes.%s.choices references unknown dialogue node \"%s\"" % [source, str(node.get("id", "")), str(choice.get("to"))])
		if file_npcs.is_empty() and file_conversations.is_empty():
			_add(messages, "warn", "%s contains no NPCs or conversations (key \"%s\")" % [npc_path, npc_id])

	# Generic reference + text-key walk over every document.
	for file_path in pkg["documents"]:
		_visit_references(pkg["documents"][file_path], file_path, catalog, pkg["locales"], messages)

	# Location → producer/recipe/encounter.
	for location in locations:
		var source: String = "locations.json.locations.%s" % str(location.get("id", ""))
		for producer_id in _as_array(location.get("producerIds")):
			_check_reference(catalog, "producer", str(producer_id), "%s.producerIds" % source, messages)
		for recipe_id in _as_array(location.get("recipeIds")):
			_check_reference(catalog, "recipe", str(recipe_id), "%s.recipeIds" % source, messages)
		for encounter_id in _as_array(location.get("encounterIds")):
			_check_reference(catalog, "encounter", str(encounter_id), "%s.encounterIds" % source, messages)

	# Producer/recipe → resource.
	for producer in producers:
		var source: String = "resources.json.producers.%s" % str(producer.get("id", ""))
		for res_id in _resource_map_keys(producer.get("outputs")):
			_check_reference(catalog, "resource", res_id, "%s.outputs/costs" % source, messages)
		for res_id in _resource_map_keys(producer.get("costs")):
			_check_reference(catalog, "resource", res_id, "%s.outputs/costs" % source, messages)
	for recipe in recipes:
		var source: String = "resources.json.recipes.%s" % str(recipe.get("id", ""))
		for res_id in _resource_map_keys(recipe.get("inputs")):
			_check_reference(catalog, "resource", res_id, "%s.inputs/outputs" % source, messages)
		for res_id in _resource_map_keys(recipe.get("outputs")):
			_check_reference(catalog, "resource", res_id, "%s.inputs/outputs" % source, messages)

	# Rule effects + trigger.choiceId.
	for rule in rules:
		for effect in _as_array(rule.get("effects")):
			if not effect is Dictionary:
				continue
			if effect.get("op") != null and not ALLOWED_EFFECTS.has(str(effect.get("op"))):
				_add(messages, "error", "Rule \"%s\": unknown effect op \"%s\"" % [str(rule.get("id", "")), str(effect.get("op"))])
			if str(effect.get("targetType", "")) == "recipe":
				_check_reference(catalog, "recipe", str(effect.get("targetId", "")), "rules.json.rules.%s.effects" % str(rule.get("id", "")), messages)
			if str(effect.get("targetType", "")) == "combatEncounter":
				_check_reference(catalog, "encounter", str(effect.get("targetId", "")), "rules.json.rules.%s.effects" % str(rule.get("id", "")), messages)
		var trigger: Variant = rule.get("trigger")
		if trigger is Dictionary and trigger.get("choiceId") != null:
			var conversation_id: String = str(trigger.get("conversationId", ""))
			var conversation: Variant = _find_by_id(conversations_flat, conversation_id)
			var choice_ids: Dictionary = {}
			if conversation is Dictionary:
				for node in _as_array(conversation.get("nodes")):
					for choice in _as_array(node.get("choices")):
						if choice is Dictionary and choice.get("id") != null:
							choice_ids[str(choice.get("id"))] = true
			if not choice_ids.has(str(trigger.get("choiceId"))):
				_add(messages, "error", "rules.json.rules.%s.trigger.choiceId references unknown choice \"%s\"" % [str(rule.get("id", "")), str(trigger.get("choiceId"))])

	_add(messages, "ok", "%d story/stories checked" % stories.size())
	_add(messages, "ok", "%d resources, %d producers, %d recipes" % [
		_as_array(pkg["resources"].get("resources")).size(), producers.size(), recipes.size()
	])
	_add(messages, "ok", "%d NPCs, %d conversations" % [
		_flatten_npcs(pkg["npcs"]).size(), conversations_flat.size()
	])
	_add(messages, "ok", "%d locations, %d enemies, %d encounters" % [
		locations.size(), _as_array(pkg["combat"].get("enemies")).size(), _as_array(pkg["combat"].get("encounters")).size()
	])
	_add(messages, "ok", "%d assets, %d rules, %d locales" % [
		_as_array(pkg["assets"].get("assets")).size(), rules.size(), pkg["locales"].size()
	])
	if _has_error(messages):
		_add(messages, "error", "Validation failed – fix errors before shipping this package to Godot")
	else:
		_add(messages, "ok", "Structural and cross-domain validation passed")


# ---------------------------------------------------------------------------
# Generic reference + text-key walk (mirror of validator.js visitReferences)
# ---------------------------------------------------------------------------

static func _visit_references(value: Variant, source: String, catalog: Dictionary, locales: Dictionary, messages: Array[Dictionary]) -> void:
	if value is Array:
		for index in value.size():
			_visit_references(value[index], "%s[%d]" % [source, index], catalog, locales, messages)
		return
	if not (value is Dictionary):
		return

	for key in value:
		var nested: Variant = value[key]
		var reference_source: String = "%s.%s" % [source, key]
		if nested is String:
			var text: String = nested
			if key == "locationId":
				_check_reference(catalog, "location", text, reference_source, messages)
			if key == "resourceId":
				_check_reference(catalog, "resource", text, reference_source, messages)
			if key == "producerId":
				_check_reference(catalog, "producer", text, reference_source, messages)
			if key == "recipeId":
				_check_reference(catalog, "recipe", text, reference_source, messages)
			if key == "enemyId":
				_check_reference(catalog, "enemy", text, reference_source, messages)
			if key == "encounterId" or (key == "targetId" and str(value.get("targetType", "")) == "combatEncounter"):
				_check_reference(catalog, "encounter", text, reference_source, messages)
			if key == "characterId" or key == "npcId" or key == "speakerId":
				_check_reference(catalog, "npc", text, reference_source, messages)
			if key == "conversationId":
				_check_reference(catalog, "conversation", text, reference_source, messages)
			if key == "assetId" or key.ends_with("AssetId"):
				_check_reference(catalog, "asset", text, reference_source, messages)
			if key == "targetId" and str(value.get("targetType", "")) == "recipe":
				_check_reference(catalog, "recipe", text, reference_source, messages)
			if key.ends_with("Key"):
				_check_text_key(text, reference_source, locales, messages)
			if key == "path" and text.begins_with("resources."):
				_check_reference(catalog, "resource", text.substr(10), reference_source, messages)
		_visit_references(nested, reference_source, catalog, locales, messages)


static func _check_reference(catalog: Dictionary, domain: String, id: String, source: String, messages: Array[Dictionary]) -> void:
	if id != "" and not catalog[domain].has(id):
		_add(messages, "error", "%s references unknown %s \"%s\"" % [source, domain, id])


static func _check_text_key(text_key: String, source: String, locales: Dictionary, messages: Array[Dictionary]) -> void:
	if locales.is_empty():
		_add(messages, "error", "%s references text key \"%s\" but the package has no locale files" % [source, text_key])
		return
	for locale in locales:
		var document: Dictionary = locales[locale]
		var strings: Variant = document.get("strings")
		if not (strings is Dictionary) or not strings.has(text_key):
			_add(messages, "error", "%s references missing text key \"%s\" in locale \"%s\"" % [source, text_key, locale])


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

static func _as_array(value: Variant) -> Array:
	if value is Array:
		return value
	return []


static func _resource_map_keys(value: Variant) -> Array:
	if value is Dictionary:
		return value.keys()
	return []


static func _find_by_id(records: Array, id: String) -> Variant:
	for record in records:
		if record is Dictionary and str(record.get("id", "")) == id:
			return record
	return null


static func _flatten_npcs(npcs: Dictionary) -> Array:
	var result: Array = []
	for npc_id in npcs:
		for npc in _as_array(npcs[npc_id].get("npcs")):
			result.append(npc)
	return result


static func _add(messages: Array[Dictionary], level: String, text: String) -> void:
	messages.append({ "level": level, "text": text })


static func _has_error(messages: Array[Dictionary]) -> bool:
	for message in messages:
		if message["level"] == "error":
			return true
	return false


# ---------------------------------------------------------------------------
# PB-02d: canonicalize integral floats back to ints after a Godot JSON round-trip.
# ---------------------------------------------------------------------------

static func canonicalize_numeric_types(value: Variant) -> Variant:
	if value is Dictionary:
		var result: Dictionary = {}
		for key in value:
			result[key] = canonicalize_numeric_types(value[key])
		return result
	if value is Array:
		var result: Array = []
		for item in value:
			result.append(canonicalize_numeric_types(item))
		return result
	if typeof(value) == TYPE_FLOAT and absf(value) <= MAX_SAFE_INTEGER and value == floor(value):
		return int(value)
	return value
