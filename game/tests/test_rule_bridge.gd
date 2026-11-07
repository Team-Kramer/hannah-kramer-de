extends SceneTree
## Headless test for the RuleBridge (global/engine/rule_bridge.gd).
##
## Verifies that production SignalBus signals are translated into JSON rule
## engine events, that engine effects are translated back into production
## signals, and that the one-shot guards prevent re-unlocks.
##
## Managers (ScreenManager/TabManager/EventManager) are NOT in the test tree,
## so the test writes the SaveFile latches itself, exactly as those managers
## do in production.
##
## NOTE: script-mode tests cannot reference autoloads as global identifiers at
## compile time, so SaveFile and SignalBus are fetched from the root at runtime.

const FIXTURE_DIR: String = "res://tests/fixtures/bridge_test"

var failures: int = 0
var bridge: Node = null
var save_file: Node = null
var signal_bus: Node = null
var resources: Node = null

var progress_button_unlocks: int = 0
var manager_button_unlocks: int = 0
var tab_unlocks: int = 0
var event_triggers: int = 0
var resource_generated_count: int = 0
var last_event_data: Resource = null
var resource_manager: Node = null


func _initialize() -> void:
	call_deferred("_run_tests")


func _run_tests() -> void:
	save_file = root.get_node_or_null("SaveFile")
	signal_bus = root.get_node_or_null("SignalBus")
	resources = root.get_node_or_null("Resources")
	_check(save_file != null, "SaveFile autoload is available")
	_check(signal_bus != null, "SignalBus autoload is available")
	_check(resources != null, "Resources autoload is available")
	if save_file == null or signal_bus == null or resources == null:
		_finish()
		return

	# load() at runtime: the bridge script references the SignalBus autoload,
	# which only resolves as a global once the SceneTree has registered
	# autoloads (preload would compile it before that).
	var bridge_script: GDScript = load("res://global/engine/rule_bridge.gd")
	bridge = bridge_script.new()
	root.add_child(bridge)
	bridge.load_package(FIXTURE_DIR)
	_check(bridge.get("_loaded") == true, "Bridge loads the test fixture package")
	if not bridge.get("_loaded"):
		_finish()
		return

	signal_bus.connect("progress_button_unlock", _on_progress_button_unlock)
	signal_bus.connect("manager_button_unlock", _on_manager_button_unlock)
	signal_bus.connect("tab_unlock", _on_tab_unlock)
	signal_bus.connect("event_triggered", _on_event_triggered)
	signal_bus.connect("resource_generated", _on_resource_generated)

	# A real ResourceManager in the tree so story resource deltas flow through
	# the production handler (shadow scaling, clamping, spent_ counters).
	var rm_script: GDScript = load("res://scenes/manager/resource_manager/resource_manager.gd")
	resource_manager = rm_script.new()
	root.add_child(resource_manager)

	_test_resource_registration()
	_test_resource_rule()
	_test_npc_choice_rule()
	_test_guards()
	_test_main_loop_reconcile()
	_test_story()
	_test_save_resume()

	_finish()


## load_package must register the fixture resources in the core-loop catalog
## and seed their initial amounts so they are visible in the tracker.
func _test_resource_registration() -> void:
	var generators: Dictionary = resources.get("resource_generators")
	_check(generators.has("stein"), "stein is registered in the core-loop catalog")
	_check(generators.has("testglanz"), "testglanz is registered in the core-loop catalog")
	if generators.has("stein"):
		_check(int(generators["stein"].max_amount) == 999, "stein max_amount comes from bounds.max")
	if generators.has("testglanz"):
		_check(int(generators["testglanz"].max_amount) == -1, "testglanz max_amount defaults to -1 without bounds.max")
	_check(int(save_file.resources.get("stein", -1)) == 0, "stein initial amount is seeded into SaveFile")
	_check(int(save_file.resources.get("testglanz", -1)) == 0, "testglanz initial amount is seeded into SaveFile")


## resource_updated(stein, 1, 1) must fire rule r1: producer unlock,
## worker-role flag, tab flag, and the one-shot event.
func _test_resource_rule() -> void:
	signal_bus.emit_signal("resource_updated", "stein", 1, 1, "test")

	_check(progress_button_unlocks == 1, "r1 unlocks the producer (progress_button_unlock fired once)")
	_check(manager_button_unlocks == 1, "r1 unlocks the lumberjack worker role")
	_check(tab_unlocks == 1, "r1 unlocks the soul tab")
	_check(event_triggers == 1, "r1 records the cat_intro_yes event")
	_check(last_event_data != null and str(last_event_data.id) == "cat_intro_yes", "event_triggered carries the cat_intro_yes EventData")

	var state: Dictionary = bridge.get("_state")
	_check(int(state["resources"]["stein"]) == 1, "engine state tracks stein total 1")
	_check(state["flags"]["lumberjack"] == true, "engine state sets lumberjack flag")
	_check(state["flags"]["soul"] == true, "engine state sets soul flag")
	_check(state["events"]["recorded"].has("cat_intro_yes"), "engine state records cat_intro_yes")

	# Simulate the production managers latching what they received.
	save_file.resource_generator_unlocks.append("axe")
	save_file.worker_role_unlocks.append("lumberjack")
	save_file.tab_unlocks.append("soul")
	save_file.events["cat_intro_yes"] = save_file.events.get("cat_intro_yes", 0) + 1


## npc_event_interacted(mira, mira_talk, 0) must fire rule r2: relationship
## bump and the mira_listened flag.
func _test_npc_choice_rule() -> void:
	signal_bus.emit_signal("npc_event_interacted", "mira", "mira_talk", 0)

	var state: Dictionary = bridge.get("_state")
	_check(int(state["relationships"]["mira"]) == 1, "r2 bumps mira relationship to 1")
	_check(state["flags"]["mira_listened"] == true, "r2 sets the mira_listened flag")
	_check(progress_button_unlocks == 1, "r2 does not unlock producers")
	_check(event_triggers == 1, "r2 does not trigger events")


## With the SaveFile latches set (as the managers would), a re-emitted
## resource signal must not fire any unlock signal again.
func _test_guards() -> void:
	signal_bus.emit_signal("resource_updated", "stein", 1, 1, "test")

	_check(progress_button_unlocks == 1, "guard: producer not re-unlocked")
	_check(manager_button_unlocks == 1, "guard: worker role not re-unlocked")
	_check(tab_unlocks == 1, "guard: tab not re-unlocked")
	_check(event_triggers == 1, "guard: event not re-triggered")

	# Non-positive amounts are ignored entirely.
	signal_bus.emit_signal("resource_updated", "stein", 1, -1, "test")
	_check(progress_button_unlocks == 1, "negative amount is ignored")


## PG-06: the engine's resource totals must track the authoritative main-loop
## totals (SaveFile.resources, maintained by the ResourceManager), not a stale
## copy left behind by a rule event. Here the engine holds stein 1 (from the
## r1 resource.totalAtLeast event in _test_resource_rule) while SaveFile still
## holds 0, because the test emitted the signal directly without the
## ResourceManager actually generating the resource. A story `when` condition
## reads the engine state, so a stale total would wrongly gate choices.
func _test_main_loop_reconcile() -> void:
	var state: Dictionary = bridge.get("_state")
	_check(int(state["resources"]["stein"]) == 1, "engine state is stale at stein 1 (from the rule event)")
	_check(int(save_file.resources["stein"]) == 0, "SaveFile is the authoritative main-loop total (0)")

	# Simulate the player gathering 5 stein in the main loop: the ResourceManager
	# writes SaveFile, and the engine state is NOT touched directly.
	save_file.resources["stein"] = 5
	_check(int(bridge.get_state()["resources"]["stein"]) == 5, "get_state reconciles the engine total to the main-loop total (5)")

	# And the reverse: consuming in the main loop pulls the engine total down.
	save_file.resources["stein"] = 0
	_check(int(bridge.get_state()["resources"]["stein"]) == 0, "get_state reconciles the engine total back down after consumption (0)")
	# Leave the engine state at the authoritative 0 so _test_story's gated
	# conversation-choice assertions (unavailable at stein 0) hold.


## Drives the fixture story through the bridge facade: begin, advance into a
## conversation node, a gated conversation choice with a shared-contract
## relationship effect, continue back to the story, a gated decision choice
## (spend + flag + outcome gain), idempotency, and the terminal outcome.
## Resource deltas flow through the real ResourceManager into SaveFile.
## Note: outcome effects apply during select_story_choice (via
## enter_story_node), so the engine nets spend(-3) + gain(+5) = +2, and the
## bridge syncs the net delta to SaveFile.
func _test_story() -> void:
	var state: Dictionary = bridge.get("_state")
	var runtime: Dictionary = state["story"]["runtime"]

	var begin: Dictionary = bridge.story_begin("story_test")
	_check(begin.get("ok", false) == true, "story_begin succeeds")
	_check(str(runtime["currentNodeId"]) == "beat_start", "story starts at beat_start")
	_check(str(runtime["pendingInput"]["kind"]) == "continue", "storyBeat waits for continue")

	# PG-05: advance into the conversation node.
	var advance: Dictionary = bridge.story_advance("story_test")
	_check(advance.get("ok", false) == true, "story_advance succeeds")
	_check(str(advance.get("status", "")) == "advanced", "advance reports advanced")
	_check(str(runtime["currentNodeId"]) == "mira_talk", "story moved to mira_talk conversation")
	_check(str(runtime["pendingInput"]["kind"]) == "conversationChoice", "conversation waits for a choice")
	_check(str(runtime["pendingInput"]["conversationId"]) == "mira_talk", "pending input references the conversation")
	_check(str(runtime["currentDialogueNodeId"]) == "n1", "dialogue starts at n1")

	# Gated conversation choice "1" (needs stein >= 1) is unavailable at stein 0.
	var conv_blocked: Dictionary = bridge.story_select_conversation_choice("mira_talk", "1", "story_test_conv_mira_talk_1")
	_check(conv_blocked.get("ok", false) == true, "gated conversation choice returns ok")
	_check(conv_blocked.get("available", false) == false, "gated conversation choice unavailable at stein 0")
	_check(str(conv_blocked.get("reason", "")) == "condition_not_met", "gated conversation choice reports condition_not_met")

	# Seed stein so both the conversation choice (>= 1) and the story choice
	# (>= 3) become available.
	save_file.resources["stein"] = 5
	state["resources"]["stein"] = 5

	var base_mira: int = int(state["relationships"]["mira"])
	var conv: Dictionary = bridge.story_select_conversation_choice("mira_talk", "1", "story_test_conv_mira_talk_1")
	# Committing bridge calls replace state["story"] with a fresh dict.
	runtime = state["story"]["runtime"]
	_check(conv.get("ok", false) == true, "conversation choice is accepted")
	_check(conv.get("available", false) == true, "conversation choice is available at stein 5")
	_check(conv.get("duplicate", false) == false, "first conversation choice is not a duplicate")
	_check(int(state["relationships"]["mira"]) == base_mira + 1, "conversation choice applied the relationship.adjust effect")
	_check(str(runtime["currentDialogueNodeId"]) == "n2", "dialogue advanced to n2")
	_check(str(runtime["pendingInput"]["kind"]) == "continueConversation", "terminal dialogue line waits for continue")
	_check(int(state["resources"]["stein"]) == 5, "conversation choice did not change resources")

	# Idempotency: replaying the same eventId is a no-op.
	var conv_again: Dictionary = bridge.story_select_conversation_choice("mira_talk", "1", "story_test_conv_mira_talk_1")
	runtime = state["story"]["runtime"]
	_check(conv_again.get("ok", false) == true, "replayed conversation choice returns ok")
	_check(conv_again.get("duplicate", false) == true, "replayed conversation choice is flagged duplicate")
	_check(int(state["relationships"]["mira"]) == base_mira + 1, "replayed conversation choice did not change relationships")

	# Continue the conversation back into the story graph.
	var conv_advance: Dictionary = bridge.story_advance("story_test")
	runtime = state["story"]["runtime"]
	_check(conv_advance.get("ok", false) == true, "continue conversation succeeds")
	_check(str(conv_advance.get("status", "")) == "advanced", "continue conversation reports advanced")
	_check(str(runtime["currentNodeId"]) == "choice_gate", "story moved to choice_gate after conversation")
	_check(str(runtime["pendingInput"]["kind"]) == "storyChoice", "decision waits for a choice")

	# Gated choice: with stein 5 the condition (stein >= 3) is met.
	# Effects: spend 3 stein + set flag, then outcome_reward adds 5 stein.
	# Net engine delta: -3 + 5 = +2.
	var spend: Dictionary = bridge.story_select_choice("story_test", "choice_gate", "spend_stone", "story_test_choice_gate_spend_stone")
	runtime = state["story"]["runtime"]
	_check(spend.get("ok", false) == true, "gated choice is accepted")
	_check(spend.get("available", false) == true, "gated choice is available at stein 5")
	_check(spend.get("duplicate", false) == false, "first choice is not a duplicate")
	_check(int(state["resources"]["stein"]) == 7, "engine state nets -3 spend + 5 outcome = 7")
	_check(state["flags"]["test_spent_stone"] == true, "choice set the test_spent_stone flag")
	_check(str(runtime["currentNodeId"]) == "outcome_reward", "choice moved to outcome_reward")
	_check(int(save_file.resources["stein"]) == 7, "ResourceManager applied the net +2 delta to SaveFile (5+2)")
	_check(resource_generated_count >= 1, "resource_generated signal fired for the story delta")

	# Idempotency: replaying the same eventId is a no-op.
	var again: Dictionary = bridge.story_select_choice("story_test", "choice_gate", "spend_stone", "story_test_choice_gate_spend_stone")
	_check(again.get("ok", false) == true, "replayed choice returns ok")
	_check(again.get("duplicate", false) == true, "replayed choice is flagged duplicate")
	_check(int(state["resources"]["stein"]) == 7, "replayed choice did not change resources")

	# Terminal outcome: pendingInput.kind is "complete", advance reports complete.
	var outcome: Dictionary = bridge.story_advance("story_test")
	_check(outcome.get("ok", false) == true, "advance into outcome succeeds")
	_check(str(outcome.get("status", "")) == "complete", "terminal outcome reports complete")
	_check(int(state["resources"]["stein"]) == 7, "complete does not change resources")
	_check(int(save_file.resources["stein"]) == 7, "complete does not change SaveFile resources")


## PG-07: the engine state must survive a save/load round trip. The bridge
## exports its state on save_requested; the save file stores it as JSON (all
## numbers become floats); a fresh bridge restores it from SaveFile.story_state
## and normalizes the numbers back. The resumed run must be at the same node,
## with the same resources/relationships/flags, and replayed choice eventIds
## must still be idempotent (the processedChoiceInputs ledger survived).
func _test_save_resume() -> void:
	# Export path: the save_requested signal (emitted by SaveFile before every
	# file write) must push the current engine state into SaveFile.story_state.
	save_file.set("story_state", null)
	signal_bus.emit_signal("save_requested")
	var exported: Variant = save_file.get("story_state")
	_check(exported is Dictionary, "save_requested exports the engine state into SaveFile.story_state")
	if not exported is Dictionary:
		return
	var exported_runtime: Dictionary = (exported as Dictionary).get("story", {}).get("runtime", {})
	_check(str(exported_runtime.get("currentNodeId", "")) == "outcome_reward", "exported state is at the terminal outcome node")

	# Simulate the save file's JSON round trip: everything numeric becomes a
	# float, exactly like _write/_import_save_data would do.
	var json_text: String = JSON.stringify(exported)
	var restored: Variant = JSON.parse_string(json_text)
	_check(restored is Dictionary, "story state survives the JSON round trip")
	if not restored is Dictionary:
		return
	var restored_resources: Dictionary = (restored as Dictionary).get("resources", {})
	_check(typeof(restored_resources.get("stein")) == TYPE_FLOAT, "JSON round trip turns stein into a float")
	save_file.set("story_state", restored)

	# A fresh bridge (new main.tscn) must restore the state in load_package.
	var fresh: Node = bridge.get_script().new()
	root.add_child(fresh)
	fresh.load_package(FIXTURE_DIR)
	var fresh_state: Dictionary = fresh.get("_state")
	var fresh_runtime: Dictionary = fresh_state.get("story", {}).get("runtime", {})
	_check(str(fresh_runtime.get("currentNodeId", "")) == "outcome_reward", "restored run resumes at outcome_reward")
	_check(str(fresh_runtime.get("pendingInput", {}).get("kind", "")) == "complete", "restored run keeps the complete pending input")
	_check(typeof(fresh_state["resources"]["stein"]) == TYPE_INT, "restored stein is normalized back to an int")
	_check(int(fresh_state["resources"]["stein"]) == 7, "restored stein total is intact (7)")
	_check(int(fresh_state["relationships"]["mira"]) == int(bridge.get("_state")["relationships"]["mira"]), "restored mira relationship is intact")
	_check(fresh_state["flags"]["test_spent_stone"] == true, "restored flags keep test_spent_stone")
	_check(fresh_state["flags"]["lumberjack"] == true, "restored flags keep lumberjack")

	# Idempotency across the save boundary: the processedChoiceInputs ledger
	# must survive, so replaying the original choice eventId is a no-op.
	var replay: Dictionary = fresh.story_select_choice("story_test", "choice_gate", "spend_stone", "story_test_choice_gate_spend_stone")
	_check(replay.get("ok", false) == true, "replayed choice after resume returns ok")
	_check(replay.get("duplicate", false) == true, "replayed choice after resume is flagged duplicate")
	_check(int(fresh.get("_state")["resources"]["stein"]) == 7, "replayed choice after resume did not change resources")
	_check(int(save_file.resources["stein"]) == 7, "replayed choice after resume did not change SaveFile resources")
	root.remove_child(fresh)


func _on_progress_button_unlock(_resource_generator: Resource) -> void:
	progress_button_unlocks += 1


func _on_manager_button_unlock(_worker_role: Resource) -> void:
	manager_button_unlocks += 1


func _on_tab_unlock(_tab_data: Resource) -> void:
	tab_unlocks += 1


func _on_event_triggered(event_data: Resource, _vals: Array) -> void:
	event_triggers += 1
	last_event_data = event_data


func _on_resource_generated(_id: String, _amount: int, _source_id: String) -> void:
	resource_generated_count += 1


func _finish() -> void:
	if failures == 0:
		print("RuleBridge tests passed.")
		quit(0)
	else:
		push_error("%s rule bridge test(s) failed." % failures)
		quit(1)


func _check(condition: bool, description: String) -> void:
	if condition:
		return
	failures += 1
	push_error("FAIL: %s" % description)
