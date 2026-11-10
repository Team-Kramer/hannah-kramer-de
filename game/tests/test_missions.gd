extends SceneTree

const MISSION_PATH: String = "res://resources/missions/mission_01_spielplatz.tres"
const MISSION_SCREEN_PATH: String = "res://scenes/ui/screen/mission_screen/mission_screen_diary.tscn"
const TEST_SAVE_FILE: String = "test_disk_round_trip"

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
		await _test_shared_freundschaft()
		await _test_resume()
		_test_initialize_import()
		_test_save_disk_round_trip()

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
	var save_file: Node = root.get_node_or_null("SaveFile")
	if save_file != null:
		var mission_state: Dictionary = save_file.get("mission_state")
		var completed: Dictionary = mission_state.get("completed", {})
		var completed_mission: Dictionary = completed.get("mission_spielplatz", {})
		_check(
			completed_mission.get("outcome", "") == "middle",
			"Vote outcome records mission completion"
		)
		_check(
			int(mission_state.get("schatten_der_eile", 0)) >= 1,
			"Vote outcome applies the schatten_der_eile effect"
		)
	var retry_button: Button = screen.get_node("%RetryButton")
	_check(retry_button.visible, "Outcome offers a gentle retry route")
	retry_button.emit_signal("pressed")
	_check(screen.get("state") == &"decision", "Retry returns to the decision state")
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
		"schatten_der_eile": 1
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
	# JSON parses all numbers as floats; int fields must survive a disk round-trip.
	var json_round_trip: Dictionary = JSON.parse_string(JSON.stringify(exported))
	var json_restored: Dictionary = save_file.call("_get_mission_state", json_round_trip)
	_check(
		json_restored.get("mut_sterne") == 15
		and json_restored.get("rhythmus") == 0
		and json_restored.get("schatten_der_eile") == 1,
		"Mission int counters survive JSON round-trip"
	)
	save_file.set("mission_state", original_state)


func _test_resume() -> void:
	var save_file: Node = root.get_node_or_null("SaveFile")
	_check(save_file != null, "SaveFile autoload is available for resume test")
	if save_file == null:
		return
	var original_state: Dictionary = save_file.get("mission_state").duplicate(true)
	# A completed mission with the middle outcome already applied.
	save_file.set("mission_state", {
		"completed": {"mission_spielplatz": {"outcome": "middle", "applied": "middle"}},
		"unlocks": [],
		"mut_sterne": 0,
		"rhythmus": 0,
		"schatten_der_eile": 1
	})

	var packed_scene: PackedScene = load(MISSION_SCREEN_PATH) as PackedScene
	var screen: Control = packed_scene.instantiate() as Control
	root.add_child(screen)
	await process_frame
	_check(screen.get("state") == &"outcome", "Completed mission resumes to its outcome")
	var outcome_label: Label = screen.get_node("%OutcomeLabel")
	_check(
		outcome_label.text.contains("Juan sitzt am Rand"),
		"Resumed outcome shows the saved result text"
	)
	# Resuming must not re-apply the recorded outcome's effects.
	_check(
		int(save_file.get("mission_state").get("schatten_der_eile", 0)) == 1,
		"Resuming does not re-apply the recorded outcome effects"
	)

	# Retry and complete again: effects must not apply a second time.
	var retry_button: Button = screen.get_node("%RetryButton")
	retry_button.emit_signal("pressed")
	_check(screen.get("state") == &"decision", "Retry from a resumed outcome returns to decision")
	var vote_button: Button = screen.get_node("%ModeVoteButton")
	vote_button.emit_signal("pressed")
	var confirm_button: Button = screen.get_node("%ConfirmButton")
	confirm_button.emit_signal("pressed")
	_check(
		int(save_file.get("mission_state").get("schatten_der_eile", 0)) == 1,
		"Replaying the same outcome does not apply its effects twice"
	)

	screen.queue_free()
	await process_frame
	save_file.set("mission_state", original_state)


func _test_initialize_import() -> void:
	# Regression for the web deep-link flow: the mission scene boots without a
	# prior initialize(), so the picker must initialize the save before
	# switching to the mission. Verify initialize() imports the persisted
	# mission state from disk into memory.
	var save_file: Node = root.get_node_or_null("SaveFile")
	_check(save_file != null, "SaveFile autoload is available for initialize test")
	if save_file == null:
		return

	var original_active: String = save_file.get("active_file_name")
	var original_state: Dictionary = save_file.get("mission_state").duplicate(true)
	var test_file: String = TEST_SAVE_FILE + "_init"

	# Write a save with a completed mission to disk.
	save_file.set("active_file_name", test_file + ".json")
	save_file.set("mission_state", {
		"completed": {"mission_spielplatz": {"outcome": "good", "applied": "good"}},
		"unlocks": ["licht_rat"],
		"mut_sterne": 15,
		"rhythmus": 0,
		"schatten_der_eile": 0
	})
	save_file.call("save_now")

	# Simulate a fresh boot: _load_save_files() already populated save_datas
	# from disk; wipe the in-memory mission state and re-import via initialize.
	save_file.set("mission_state", {
		"completed": {},
		"unlocks": [],
		"mut_sterne": 0,
		"rhythmus": 0,
		"schatten_der_eile": 0
	})
	save_file.call("initialize", test_file, "")
	var completed: Dictionary = save_file.get("mission_state").get("completed", {})
	_check(
		completed.has("mission_spielplatz")
		and str(completed["mission_spielplatz"].get("outcome", "")) == "good",
		"initialize() imports the persisted completed mission from disk"
	)
	_check(
		int(save_file.get("mission_state").get("mut_sterne", 0)) == 15,
		"initialize() imports the persisted mut_sterne from disk"
	)

	# Clean up the scratch file and restore the active file name.
	DirAccess.remove_absolute(FileSystemUtils.USER_PATH + test_file + ".json")
	save_file.set("active_file_name", original_active)
	save_file.set("mission_state", original_state)


func _test_save_disk_round_trip() -> void:
	var save_file: Node = root.get_node_or_null("SaveFile")
	_check(save_file != null, "SaveFile autoload is available for disk round-trip")
	if save_file == null:
		return

	# Use a scratch file so the default save is never touched.
	var original_active: String = save_file.get("active_file_name")
	save_file.set("active_file_name", TEST_SAVE_FILE + ".json")
	save_file.set("mission_state", {
		"completed": {"mission_spielplatz": {"outcome": "good"}},
		"unlocks": ["licht_rat"],
		"mut_sterne": 15,
		"rhythmus": 3,
		"schatten_der_eile": 2
	})
	save_file.call("save_now")
	_check(
		DirAccess.dir_exists_absolute(FileSystemUtils.USER_PATH)
		and FileAccess.file_exists(FileSystemUtils.USER_PATH + TEST_SAVE_FILE + ".json"),
		"save_now writes the save file to disk"
	)

	# Simulate a fresh load: re-read from disk and restore mission state.
	var from_disk: Dictionary = save_file.call("_read", TEST_SAVE_FILE + ".json")
	var restored: Dictionary = save_file.call("_get_mission_state", from_disk)
	_check(
		int(restored.get("mut_sterne", 0)) == 15
		and int(restored.get("rhythmus", 0)) == 3
		and int(restored.get("schatten_der_eile", 0)) == 2,
		"Int mission counters survive a real disk round-trip"
	)
	_check(
		restored.get("completed", {}).has("mission_spielplatz")
		and restored.get("unlocks", []).has("licht_rat"),
		"Completed and unlocks survive a real disk round-trip"
	)

	# Clean up the scratch file and restore the active file name.
	DirAccess.remove_absolute(FileSystemUtils.USER_PATH + TEST_SAVE_FILE + ".json")
	save_file.set("active_file_name", original_active)


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
