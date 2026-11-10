extends SceneTree
## F9 step 2 — legacy/new parity test.
##
## Runs identical recorded inputs through (a) a legacy-semantics reference
## model (encoding the §3.6 branch matrix for the (a)-pattern branches) and
## (b) the new JSON rule engine (event_engine.gd), then asserts the
## observable state is identical. This is the parity evidence F9 requires
## before any legacy branch is deleted (PE-04).
##
## Scope: the (a) patterns only — resource-threshold unlocks and
## conversation-choice consequences. (b) mechanics (combat, worker,
## prestige, tabs) and (c) deferred dark-forest content are out of scope.
##
## Run: godot --headless --path . --script res://f9_parity.gd

const EventEngine := preload("res://event_engine.gd")

var failures: Array[String] = []
var checks: int = 0


func _init() -> void:
	_run()
	_finish()


func _expect(condition: bool, message: String) -> void:
	checks += 1
	if condition:
		print("PASS: %s" % message)
	else:
		failures.append(message)
		print("FAIL: %s" % message)


func _run() -> void:
	# --- Package for the new engine (legacy-shaped content, JSON rules) ---
	# Resources mirror the legacy IDs so the same recorded inputs apply.
	var pkg: Dictionary = {
		"resources": {
			"resources": [
				{ "id": "firepit", "initialAmount": 0, "minimum": 0, "maximum": 999 },
				{ "id": "axe", "initialAmount": 0, "minimum": 0, "maximum": 999 }
			],
			"producers": [
				{ "id": "brick", "name": "Brick" },
				{ "id": "wood", "name": "Wood" }
			],
			"recipes": []
		},
		"npcs": {
			"cat": { "npcs": [ { "id": "cat", "initialRelationship": 0 } ] }
		},
		"conversations": {
			"cat_intro": {
				"conversations": [
					{
						"id": "cat_intro",
						"npcId": "cat",
						"nodes": [
							{
								"id": "n1",
								"choices": [
									{ "id": "opt0", "nextNodeId": "end" },
									{ "id": "opt1", "nextNodeId": "end" }
								]
							},
							{ "id": "end" }
						]
					}
				]
			}
		},
		"rules": {
			"rules": [
				{
					"id": "firepit_ready",
					"once": true,
					"trigger": { "event": "resource.totalAtLeast", "resourceId": "firepit", "value": 1 },
					"when": { "all": [] },
					"effects": [
						{ "op": "unlock", "targetType": "producer", "targetId": "brick" },
						{ "op": "flag.set", "flagId": "worker_role_lumberjack", "value": true },
						{ "op": "event.record", "eventId": "firepit_ready" }
					]
				},
				{
					"id": "axe_ready",
					"once": true,
					"trigger": { "event": "resource.totalAtLeast", "resourceId": "axe", "value": 1 },
					"when": { "all": [] },
					"effects": [
						{ "op": "unlock", "targetType": "producer", "targetId": "wood" }
					]
				},
				{
					"id": "cat_intro_opt0",
					"once": true,
					"trigger": { "event": "conversation.choice", "conversationId": "cat_intro", "choiceId": "opt0" },
					"when": { "all": [] },
					"effects": [
						{ "op": "flag.set", "flagId": "cat_intro_yes", "value": true }
					]
				},
				{
					"id": "cat_intro_opt1",
					"once": true,
					"trigger": { "event": "conversation.choice", "conversationId": "cat_intro", "choiceId": "opt1" },
					"when": { "all": [] },
					"effects": [
						{ "op": "flag.set", "flagId": "cat_intro_no", "value": true }
					]
				}
			]
		},
		"stories": {},
		"combat": { "encounters": [] },
		"locations": {},
		"assets": {},
		"locales": {}
	}
	var catalog: Dictionary = _catalog(pkg)
	var rules: Array = pkg["rules"]["rules"]

	# --- Identical recorded inputs (the legacy trigger sequence) ---
	var inputs: Array[Dictionary] = [
		{ "eventId": "ev_firepit_1", "type": "resource.totalAtLeast", "resourceId": "firepit", "total": 1, "delta": 1 },
		{ "eventId": "ev_axe_1", "type": "resource.totalAtLeast", "resourceId": "axe", "total": 1, "delta": 1 },
		{ "eventId": "ev_cat_opt0", "type": "conversation.choice", "conversationId": "cat_intro", "choiceId": "opt0" }
	]

	# --- (a) Legacy-semantics reference model ---
	var legacy: Dictionary = _legacy_initial()
	for input in inputs:
		_legacy_apply(legacy, input)

	# --- (b) New JSON engine ---
	var state: Dictionary = EventEngine.initial_state(pkg)
	for input in inputs:
		var trace: Dictionary = EventEngine.dispatch_event(input, rules, state, catalog, pkg)
		_expect(trace.get("ok", true), "engine dispatches %s" % input["eventId"])

	# --- Parity: identical observable state ---
	var legacy_view: Dictionary = _legacy_view(legacy)
	var new_view: Dictionary = {
		"producers": state["unlocks"]["producers"],
		"flags": state["flags"],
		"recorded": state["events"]["recorded"]
	}
	_expect(legacy_view["producers"] == new_view["producers"], "parity: unlocked producers match (legacy=%s new=%s)" % [legacy_view["producers"], new_view["producers"]])
	_expect(legacy_view["flags"] == new_view["flags"], "parity: flags match (legacy=%s new=%s)" % [legacy_view["flags"], new_view["flags"]])
	_expect(legacy_view["recorded"] == new_view["recorded"], "parity: recorded events match (legacy=%s new=%s)" % [legacy_view["recorded"], new_view["recorded"]])

	# --- Spot-check the concrete observable outcomes ---
	_expect(new_view["producers"].get("brick", false) == true, "parity: firepit>=1 unlocked the brick producer")
	_expect(new_view["producers"].get("wood", false) == true, "parity: axe>=1 unlocked the wood producer")
	_expect(new_view["flags"].get("worker_role_lumberjack", false) == true, "parity: firepit>=1 set the worker-role flag")
	_expect(new_view["recorded"] == ["firepit_ready"], "parity: firepit>=1 recorded the one-shot event")
	_expect(new_view["flags"].get("cat_intro_yes", false) == true, "parity: cat_intro opt0 set the yes flag")
	_expect(new_view["flags"].get("cat_intro_no", false) == false, "parity: cat_intro opt0 did not set the no flag")

	# --- Idempotency: replaying the same inputs must not change state ---
	var replayed: Dictionary = EventEngine.initial_state(pkg)
	for input in inputs:
		EventEngine.dispatch_event(input, rules, replayed, catalog, pkg)
	for input in inputs:
		EventEngine.dispatch_event(input, rules, replayed, catalog, pkg)
	_expect(replayed["unlocks"]["producers"] == new_view["producers"], "parity: replaying inputs is idempotent (producers)")
	_expect(replayed["events"]["recorded"] == new_view["recorded"], "parity: replaying inputs is idempotent (recorded)")


## Legacy-semantics reference model for the (a)-pattern branches.
## Encodes the §3.6 branch matrix:
##   firepit>=1 -> unlock progress-button `brick` + worker role `lumberjack`
##                 + one-shot diary event `firepit_ready`
##   axe>=1     -> unlock progress-button `wood`
## Observable state: producers (progress buttons), flags (worker roles),
## recorded (one-shot diary events).
func _legacy_initial() -> Dictionary:
	return {
		"resources": { "firepit": 0, "axe": 0 },
		"producers": {},
		"flags": { "worker_role_lumberjack": false, "cat_intro_yes": false, "cat_intro_no": false },
		"recorded": [],
		"fired": {}
	}


func _legacy_apply(legacy: Dictionary, input: Dictionary) -> void:
	var input_type: String = str(input.get("type"))
	if input_type == "resource.totalAtLeast":
		var resource_id: String = str(input.get("resourceId"))
		var total: int = int(input.get("total"))
		legacy["resources"][resource_id] = total
		match resource_id:
			"firepit":
				if total >= 1:
					legacy["producers"]["brick"] = true
					legacy["flags"]["worker_role_lumberjack"] = true
					if not legacy["fired"].has("firepit_ready"):
						legacy["recorded"].append("firepit_ready")
						legacy["fired"]["firepit_ready"] = true
			"axe":
				if total >= 1:
					legacy["producers"]["wood"] = true
	elif input_type == "conversation.choice":
		# §3.6 cat_intro: opt0 -> yes, opt1 -> no
		var conversation_id: String = str(input.get("conversationId"))
		var choice_id: String = str(input.get("choiceId"))
		if conversation_id == "cat_intro" and choice_id == "opt0":
			legacy["flags"]["cat_intro_yes"] = true
		elif conversation_id == "cat_intro" and choice_id == "opt1":
			legacy["flags"]["cat_intro_no"] = true


func _legacy_view(legacy: Dictionary) -> Dictionary:
	return {
		"producers": legacy["producers"],
		"flags": legacy["flags"],
		"recorded": legacy["recorded"]
	}


## Minimal catalog for the engine's effect validation.
func _catalog(pkg: Dictionary) -> Dictionary:
	var resource: Dictionary = {}
	for r in pkg["resources"]["resources"]:
		resource[str(r.get("id"))] = r
	var producer: Dictionary = {}
	for p in pkg["resources"]["producers"]:
		producer[str(p.get("id"))] = p
	var recipe: Dictionary = {}
	for r in pkg["resources"]["recipes"]:
		recipe[str(r.get("id"))] = r
	return { "resource": resource, "producer": producer, "recipe": recipe, "npc": {}, "enemy": {}, "encounter": {} }


func _finish() -> void:
	if failures.is_empty():
		print("F9 PARITY PASS (%d checks)" % checks)
		quit(0)
	else:
		print("F9 PARITY FAIL (%d failures)" % failures.size())
		for failure in failures:
			print("  - %s" % failure)
		quit(1)
