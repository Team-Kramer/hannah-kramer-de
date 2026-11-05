extends SceneTree

const MISSION_PATH: String = "res://resources/missions/mission_01_spielplatz.tres"
const MISSION_SCREEN_PATH: String = "res://scenes/ui/screen/mission_screen/mission_screen_diary.tscn"

var failures: int = 0


func _initialize() -> void:
	call_deferred("_run_tests")


func _run_tests() -> void:
	var mission: MissionData = load(MISSION_PATH) as MissionData
	_check(mission != null, "Mission 01 resource loads")
	if mission != null:
		_test_mission_data(mission)
		_test_validation(mission)
		_test_decisions()
		_test_vote()
		_test_outcomes()
		_test_mission_state_persistence()
		await _test_mission_screen()

	if failures == 0:
		print("Mission tests passed.")
		quit(0)
	else:
		push_error("%s mission test(s) failed." % failures)
		quit(1)


func _test_mission_data(mission: MissionData) -> void:
	_check(not mission.intro_text.strip_edges().is_empty(), "Mission 01 intro text loads")
	_check(mission.characters.size() == 6, "Mission 01 has six characters (incl. Lichtkatze)")
	_check(mission.resource_pool == 120, "Mission 01 pool is 120 Lichttropfen")
	_check(mission.options.size() == 5, "Mission 01 has five options")
	_check(mission.decision_modes.size() == 3, "Mission 01 supports three decision modes")

	var expected_costs: Dictionary = {
		&"barrierefrei": 50,
		&"rutsche": 40,
		&"fussball": 35,
		&"ruhebereich": 30,
		&"alles_halb": 120
	}
	for option: Dictionary in mission.options:
		var option_id: StringName = option.id
		_check(
			expected_costs.get(option_id, -1) == int(option.cost),
			"Option %s has its specified cost" % option_id
		)


func _test_validation(mission: MissionData) -> void:
	var mission_errors: PackedStringArray = MissionValidator.validate(mission)
	_check(
		mission_errors.is_empty(),
		"Mission 01 passes schema and child-safety validation: %s"
		% "; ".join(mission_errors)
	)

	var no_weak_outcome: MissionData = mission.duplicate(true) as MissionData
	no_weak_outcome.outcomes = [mission.outcomes[0], mission.outcomes[1]]
	_check(
		_has_error(MissionValidator.validate(no_weak_outcome), "Missing required outcome: weak"),
		"Missing weak outcome is rejected"
	)

	var unknown_wish: MissionData = mission.duplicate(true) as MissionData
	unknown_wish.characters[0]["wish"] = &"unknown_option"
	_check(
		_has_error(MissionValidator.validate(unknown_wish), "refers to unknown option"),
		"Unknown character wishes are rejected"
	)

	var over_budget_option: MissionData = mission.duplicate(true) as MissionData
	over_budget_option.options[0]["cost"] = 121
	_check(
		_has_error(
			MissionValidator.validate(over_budget_option),
			"costs more than the mission resource pool"
		),
		"Options above the pool are rejected"
	)


func _test_decisions() -> void:
	var costs: Dictionary = {&"barrierefrei": 50, &"ruhebereich": 30, &"alles_halb": 120}
	_check(
		Decision.is_valid_self_choice([&"barrierefrei"], 120, costs),
		"Self mode accepts an affordable option"
	)
	_check(
		not Decision.is_valid_self_choice([], 120, costs),
		"Self mode rejects an empty choice"
	)
	_check(
		not Decision.is_valid_self_choice(
			[&"barrierefrei", &"ruhebereich", &"alles_halb"], 120, costs
		),
		"Self mode rejects more than two options"
	)
	_check(
		not Decision.is_valid_self_choice([&"barrierefrei", &"alles_halb"], 120, costs),
		"Self mode rejects an over-budget choice"
	)


func _test_outcomes() -> void:
	_check(
		Outcomes.evaluate([&"barrierefrei", &"ruhebereich"]) == Outcomes.GOOD,
		"Inclusive build with another option has a good outcome"
	)
	_check(
		Outcomes.evaluate([&"rutsche"]) == Outcomes.MIDDLE,
		"Loudest-only choice has a middle outcome"
	)
	_check(
		Outcomes.evaluate([&"alles_halb"]) == Outcomes.WEAK,
		"Everything-half choice has a weak outcome"
	)
	_check(
		Outcomes.evaluate([&"ruhebereich"]) == Outcomes.WEAK,
		"Leaving Juan out without a loudest-only choice has a weak outcome"
	)


func _test_vote() -> void:
	var majority: StringName = Decision.vote(
		{&"juan": &"barrierefrei", &"lina": &"rutsche", &"tobi": &"rutsche"},
		{},
		{&"juan": 0, &"lina": 5, &"tobi": 4}
	)
	_check(majority == &"rutsche", "Vote mode selects the option with the most weighted votes")

	var quiet_voice: StringName = Decision.vote(
		{&"juan": &"barrierefrei", &"lina": &"rutsche"},
		{},
		{&"juan": 0, &"lina": 3}
	)
	_check(quiet_voice == &"barrierefrei", "Vote ties favor the least-heard voice")

	var friendship_weight: StringName = Decision.vote(
		{&"juan": &"barrierefrei", &"lina": &"rutsche"},
		{&"juan": 20, &"lina": 0},
		{&"juan": 3, &"lina": 0}
	)
	_check(friendship_weight == &"barrierefrei", "Friendship modifies a character's vote weight")
	var stable_tie: StringName = Decision.vote(
		{&"lina": &"rutsche", &"juan": &"barrierefrei"}, {}, {}
	)
	_check(stable_tie == &"barrierefrei", "Vote ties resolve deterministically")
	_check(Decision.vote({}, {}) == &"", "An empty vote has no winner")


func _test_mission_screen() -> void:
	var packed_scene: PackedScene = load(MISSION_SCREEN_PATH) as PackedScene
	_check(packed_scene != null, "Mission screen scene loads")
	if packed_scene == null:
		return

	var screen: Control = packed_scene.instantiate() as Control
	root.add_child(screen)
	await process_frame
	var continue_button: Button = screen.get_node("%ContinueButton")
	continue_button.emit_signal("pressed")
	var characters: HBoxContainer = screen.get_node("%CharactersHBox")
	_check(characters.visible, "Intro advances to the listening phase")
	var first_character_card: VBoxContainer = characters.get_child(0)
	var listen_button: Button = first_character_card.get_child(1)
	var status_label: Label = first_character_card.get_child(2)
	listen_button.emit_signal("pressed")
	var listen_label: Label = screen.get_node("%ListenLabel")
	_check(listen_label.text.begins_with("Juan:"), "Mission screen presents character dialogue")
	_check(status_label.text.begins_with("Gehört"), "Listening state is visible")
	listen_button.emit_signal("pressed")
	_check(status_label.text.begins_with("Gehört"), "Replaying dialogue does not increase vote weight")

	continue_button.emit_signal("pressed")
	_check(screen.get("state") == &"decision", "Listening advances to decision state")
	var vote_button: Button = screen.get_node("%ModeVoteButton")
	_check(
		vote_button.visible and not vote_button.disabled,
		"Vote mode is available in decision state"
	)
	_check(
		vote_button.is_connected("pressed", Callable(screen, "_on_mode_vote_button_up")),
		"Vote mode button is connected to its handler"
	)
	vote_button.emit_signal("pressed")
	_check(screen.get("mode") == &"vote", "Vote mode button selects vote mode")
	var confirm_button: Button = screen.get_node("%ConfirmButton")
	_check(not confirm_button.disabled, "Vote mode enables confirmation")
	confirm_button.emit_signal("pressed")
	var outcome_panel: Panel = screen.get_node("%OutcomePanel")
	_check(outcome_panel.visible, "Vote mode completes and shows its outcome")
	screen.queue_free()
	await process_frame


func _test_mission_state_persistence() -> void:
	var save_file: Node = root.get_node_or_null("SaveFile")
	_check(save_file != null, "SaveFile autoload is available in tests")
	if save_file == null:
		return
	var original_state: Dictionary = save_file.get("mission_state").duplicate(true)
	var expected_state: Dictionary = {
		"completed": {"mission_spielplatz": {"outcome": "good"}},
		"unlocks": ["licht_rat"],
		"mut_sterne": 15,
		"rhythmus": 0,
		"schatten_der_eile": 1,
		"character_freundschaft": {"juan": 5}
	}
	save_file.set("mission_state", expected_state.duplicate(true))
	var exported: Dictionary = save_file.call("_export_save_data")
	var restored: Dictionary = save_file.call("_get_mission_state", exported)
	_check(restored == expected_state, "Mission progress survives save export and restore")
	var legacy_state: Dictionary = save_file.call("_get_mission_state", {})
	_check(
		legacy_state.get("completed", {}).is_empty()
		and legacy_state.get("unlocks", []).is_empty(),
		"Legacy saves default to empty mission progress"
	)
	save_file.set("mission_state", original_state)


func _has_error(errors: PackedStringArray, fragment: String) -> bool:
	for error_text: String in errors:
		if error_text.contains(fragment):
			return true
	return false


func _check(condition: bool, description: String) -> void:
	if condition:
		return
	failures += 1
	push_error("FAIL: %s" % description)
