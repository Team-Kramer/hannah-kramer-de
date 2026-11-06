extends SceneTree
## Headless test for the resumable story-run state machine
## (global/engine/story_run.gd, DEC-03).
##
## Drives the real authored Lichtwald mission graph
## (content/active/stories/story_mission_spielplatz.json) through the full
## flow: beats, conversations (with rule-triggered choice events), gated
## decision choices (resource.spend / flag.set), outcome effects, the weak
## loop, choice idempotency, and a JSON save/restore round-trip.
##
## NOTE: script-mode tests cannot reference autoloads as global identifiers at
## compile time, so the engine scripts are loaded at runtime.

const PACKAGE_DIR: String = "res://content/active"
const STORY_ID: String = "story_mission_spielplatz"

var failures: int = 0
var pkg: Dictionary = {}
var catalog: Dictionary = {}
var story: Dictionary = {}
var conversations: Array = []
var rules: Array = []


func _initialize() -> void:
	call_deferred("_run_tests")


func _run_tests() -> void:
	var package_loader: GDScript = load("res://global/engine/package_loader.gd")
	var story_run: GDScript = load("res://global/engine/story_run.gd")
	var loaded: Dictionary = package_loader.call("load_package", PACKAGE_DIR)
	_check(loaded.get("ok") == true, "Active package loads")
	if not loaded.get("ok", false):
		_finish()
		return
	pkg = loaded["assembled"]
	catalog = loaded["catalog"]
	var story_doc: Dictionary = pkg["stories"][STORY_ID]
	story = story_doc["story"]
	conversations = story_run.call("flatten_conversations", pkg)
	rules = _as_array(pkg["rules"].get("rules"))
	_check(conversations.size() == 6, "All 6 conversations flatten from the NPC files")

	_test_full_good_path(story_run)
	_test_weak_loop(story_run)
	_test_choice_idempotency(story_run)
	_test_resource_gating(story_run)
	_test_conversation_rule_event(story_run)
	_test_restore_round_trip(story_run)
	_test_begin_twice_rejected(story_run)
	_finish()


func _fresh_state() -> Dictionary:
	var event_engine: GDScript = load("res://global/engine/event_engine.gd")
	return event_engine.call("initial_state", pkg)


func _runtime(state: Dictionary) -> Dictionary:
	return state["story"]["runtime"]


func _pending_kind(state: Dictionary) -> String:
	var pending: Variant = _runtime(state).get("pendingInput")
	return str(pending.get("kind")) if pending is Dictionary else ""


## Walk opening -> 5 conversations -> first_choice. Returns the state.
## Each conversation's first choice id differs: hannah's start node is
## "listen" (choice "weiter"), the wish conversations' start node is "wish"
## (choice "listen").
func _walk_to_first_choice(story_run: GDScript, state: Dictionary) -> Dictionary:
	var begin: Dictionary = story_run.call("begin_story", story, state, conversations, catalog, pkg)
	_check(begin.get("ok") == true, "begin_story starts at the opening beat")
	_check(_pending_kind(state) == "continue", "Opening beat waits for continue")
	var advance: Dictionary = story_run.call("advance_story", story, state, conversations, catalog, pkg)
	_check(advance.get("status") == "advanced", "Advance from opening enters the first conversation")
	var first_choices: Dictionary = {
		"hannah_listening": "weiter",
		"juan_wishes": "listen",
		"lina_wishes": "listen",
		"tobi_wishes": "listen",
		"oma_linde_wishes": "listen",
	}
	for conversation_id in first_choices:
		_check(_pending_kind(state) == "conversationChoice", "Conversation %s presents a choice" % conversation_id)
		var conversation: Dictionary = _find_conversation(conversation_id)
		var choice: Dictionary = story_run.call("select_conversation_choice", conversation, first_choices[conversation_id], "evt_%s" % conversation_id, rules, state, conversations, catalog, pkg)
		_check(choice.get("ok") == true and choice.get("available") == true, "Conversation %s choice accepted" % conversation_id)
		advance = story_run.call("advance_story", story, state, conversations, catalog, pkg)
		_check(advance.get("ok") == true, "Advance after %s" % conversation_id)
	return state


func _test_full_good_path(story_run: GDScript) -> void:
	var state: Dictionary = _fresh_state()
	state = _walk_to_first_choice(story_run, state)
	_check(_runtime(state).get("currentNodeId") == "first_choice", "Walk reaches the first decision")
	_check(_pending_kind(state) == "storyChoice", "First decision waits for a story choice")

	var choice: Dictionary = story_run.call("select_story_choice", story, "first_choice", "build_barrierefrei", "evt_build_bf", state, conversations, catalog, pkg)
	_check(choice.get("ok") == true and choice.get("available") == true, "build_barrierefrei accepted at 120 lichttropfen")
	_check(int(state["resources"]["lichttropfen"]) == 70, "Spending 50 lichttropfen leaves 70")
	_check(state["flags"]["built_barrierefrei"] == true, "built_barrierefrei flag set")
	_check(_runtime(state).get("currentNodeId") == "second_choice", "Moves to the second decision")

	choice = story_run.call("select_story_choice", story, "second_choice", "add_rutsche", "evt_add_rutsche", state, conversations, catalog, pkg)
	_check(choice.get("ok") == true and choice.get("available") == true, "add_rutsche accepted (not yet built)")
	_check(int(state["resources"]["lichttropfen"]) == 30, "Spending 40 more leaves 30")
	_check(state["flags"]["built_rutsche"] == true, "built_rutsche flag set")

	choice = story_run.call("select_story_choice", story, "check_outcome", "good", "evt_outcome_good", state, conversations, catalog, pkg)
	_check(choice.get("ok") == true and choice.get("available") == true, "good outcome reachable with barrier-free + rutsche")
	_check(_runtime(state).get("currentNodeId") == "good", "Enters the good outcome node")
	_check(int(state["resources"]["mut_sterne"]) == 15, "Outcome grants 15 mut_sterne")
	_check(int(state["resources"]["freundschaft"]) == 20, "Outcome grants 20 freundschaft")
	_check(state["flags"]["licht_rat_unlocked"] == true, "Outcome sets licht_rat_unlocked")
	_check(_pending_kind(state) == "continue", "Good outcome waits for continue")

	var advance: Dictionary = story_run.call("advance_story", story, state, conversations, catalog, pkg)
	_check(advance.get("status") == "advanced", "Advance from good outcome")
	_check(_runtime(state).get("currentNodeId") == "licht_rat", "Reaches the licht_rat beat")
	advance = story_run.call("advance_story", story, state, conversations, catalog, pkg)
	_check(advance.get("status") == "complete", "Terminal beat completes the run")


func _test_weak_loop(story_run: GDScript) -> void:
	var state: Dictionary = _fresh_state()
	state = _walk_to_first_choice(story_run, state)
	var choice: Dictionary = story_run.call("select_story_choice", story, "first_choice", "later", "evt_later", state, conversations, catalog, pkg)
	_check(choice.get("ok") == true and choice.get("available") == true, "later choice accepted")
	_check(_runtime(state).get("currentNodeId") == "weak", "later lands on the weak outcome")
	_check(int(state["resources"]["lichttropfen"]) == 120, "weak outcome spends nothing")
	var advance: Dictionary = story_run.call("advance_story", story, state, conversations, catalog, pkg)
	_check(advance.get("status") == "advanced", "Advance from weak outcome")
	_check(_runtime(state).get("currentNodeId") == "first_choice", "weak loops back to first_choice")
	_check(_pending_kind(state) == "storyChoice", "Looped decision waits for a story choice again")


func _test_choice_idempotency(story_run: GDScript) -> void:
	var state: Dictionary = _fresh_state()
	state = _walk_to_first_choice(story_run, state)
	var choice: Dictionary = story_run.call("select_story_choice", story, "first_choice", "build_rutsche", "evt_idem", state, conversations, catalog, pkg)
	_check(choice.get("ok") == true and choice.get("available") == true, "First selection applies")
	_check(int(state["resources"]["lichttropfen"]) == 80, "First selection spends 40")
	choice = story_run.call("select_story_choice", story, "first_choice", "build_rutsche", "evt_idem", state, conversations, catalog, pkg)
	_check(choice.get("ok") == true and choice.get("duplicate") == true, "Same eventId is a no-op duplicate")
	_check(int(state["resources"]["lichttropfen"]) == 80, "Duplicate selection spends nothing again")
	choice = story_run.call("select_story_choice", story, "first_choice", "build_fussball", "evt_idem", state, conversations, catalog, pkg)
	_check(choice.get("ok") == false, "Reusing an eventId with different input is rejected")


func _test_resource_gating(story_run: GDScript) -> void:
	var state: Dictionary = _fresh_state()
	state = _walk_to_first_choice(story_run, state)
	state["resources"]["lichttropfen"] = 20
	var choice: Dictionary = story_run.call("select_story_choice", story, "first_choice", "build_barrierefrei", "evt_gated", state, conversations, catalog, pkg)
	_check(choice.get("ok") == true and choice.get("available") == false, "build_barrierefrei gated below 50 lichttropfen")
	_check(_runtime(state).get("currentNodeId") == "first_choice", "Gated choice leaves the run unchanged")
	choice = story_run.call("select_story_choice", story, "first_choice", "later", "evt_gated_ok", state, conversations, catalog, pkg)
	_check(choice.get("ok") == true and choice.get("available") == true, "ungated later choice still works")


func _test_conversation_rule_event(story_run: GDScript) -> void:
	var state: Dictionary = _fresh_state()
	var begin: Dictionary = story_run.call("begin_story", story, state, conversations, catalog, pkg)
	_check(begin.get("ok") == true, "begin_story for rule event test")
	var advance: Dictionary = story_run.call("advance_story", story, state, conversations, catalog, pkg)
	_check(advance.get("status") == "advanced", "Enters hannah_listening")
	var conversation: Dictionary = _find_conversation("hannah_listening")
	var choice: Dictionary = story_run.call("select_conversation_choice", conversation, "weiter", "evt_hannah_weiter", rules, state, conversations, catalog, pkg)
	_check(choice.get("ok") == true and choice.get("available") == true, "hannah weiter choice accepted")
	_check(state["flags"]["encounter_schatten_der_eile_unlocked"] == true, "Rule fired: shadow encounter flag set")
	_check(state["unlocks"]["combatEncounters"]["encounter_schatten_der_eile"] == true, "Rule fired: shadow encounter unlocked")
	_check(_pending_kind(state) == "continueConversation", "Final dialogue line waits for continueConversation")
	choice = story_run.call("select_conversation_choice", conversation, "weiter", "evt_hannah_weiter", rules, state, conversations, catalog, pkg)
	_check(choice.get("ok") == true and choice.get("duplicate") == true, "Same conversation eventId is a no-op duplicate")


func _test_restore_round_trip(story_run: GDScript) -> void:
	var state: Dictionary = _fresh_state()
	state = _walk_to_first_choice(story_run, state)
	var choice: Dictionary = story_run.call("select_story_choice", story, "first_choice", "build_barrierefrei", "evt_restore", state, conversations, catalog, pkg)
	_check(choice.get("ok") == true, "Selection before save")
	var saved_json: String = JSON.stringify(state)
	var parsed: Variant = JSON.parse_string(saved_json)
	_check(parsed is Dictionary, "State serializes to JSON")
	# Godot's JSON parser returns whole numbers as floats; the persistence
	# layer normalizes them back before handing state to the engine.
	var restored: Dictionary = story_run.call("normalize_state_numbers", parsed)
	_check(restored["resources"]["lichttropfen"] is int, "Restore normalizes resource amounts to int")
	_check(int(restored["resources"]["lichttropfen"]) == 70, "Restored lichttropfen value preserved")
	_check(restored["flags"]["built_barrierefrei"] == true, "Restored flag preserved")
	var advance: Dictionary = story_run.call("advance_story", story, restored, conversations, catalog, pkg)
	_check(advance.get("ok") == true, "Restored state advances")
	_check(_runtime(restored).get("currentNodeId") == "second_choice", "Restored run resumes at the second decision")
	choice = story_run.call("select_story_choice", story, "second_choice", "finish", "evt_finish", restored, conversations, catalog, pkg)
	_check(choice.get("ok") == true and choice.get("available") == true, "Restored run can complete decisions")


func _test_begin_twice_rejected(story_run: GDScript) -> void:
	var state: Dictionary = _fresh_state()
	var begin: Dictionary = story_run.call("begin_story", story, state, conversations, catalog, pkg)
	_check(begin.get("ok") == true, "First begin_story succeeds")
	begin = story_run.call("begin_story", story, state, conversations, catalog, pkg)
	_check(begin.get("ok") == false, "Second begin_story is rejected")


func _find_conversation(conversation_id: String) -> Dictionary:
	for conversation in conversations:
		if str(conversation.get("id")) == conversation_id:
			return conversation
	return {}


func _as_array(value: Variant) -> Array:
	return value if value is Array else []


func _finish() -> void:
	if failures == 0:
		print("StoryRun tests passed.")
		quit(0)
	else:
		push_error("%d story run test(s) failed." % failures)
		quit(1)


func _check(condition: bool, description: String) -> void:
	if condition:
		return
	failures += 1
	push_error("FAIL: %s" % description)
