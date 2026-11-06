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
var last_event_data: Resource = null


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

	_test_resource_registration()
	_test_resource_rule()
	_test_npc_choice_rule()
	_test_guards()

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


func _on_progress_button_unlock(_resource_generator: Resource) -> void:
	progress_button_unlocks += 1


func _on_manager_button_unlock(_worker_role: Resource) -> void:
	manager_button_unlocks += 1


func _on_tab_unlock(_tab_data: Resource) -> void:
	tab_unlocks += 1


func _on_event_triggered(event_data: Resource, _vals: Array) -> void:
	event_triggers += 1
	last_event_data = event_data


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
