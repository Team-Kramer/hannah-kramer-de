extends SceneTree
## Headless test for PF-02: content reset on content-version change.
##
## Verifies that a save written under a different contentVersion has its
## content state reset to defaults while player settings (settings, audio,
## effects, locale, metadata) are preserved, and that matching-version saves
## are left untouched.
##
## NOTE: script-mode tests fetch the SaveFile autoload at runtime.

var failures: int = 0
var save_file: Node = null


func _initialize() -> void:
	call_deferred("_run_tests")


func _run_tests() -> void:
	save_file = root.get_node_or_null("SaveFile")
	_check(save_file != null, "SaveFile autoload is available")
	if save_file == null:
		_finish()
		return

	var active_version: String = save_file._get_active_content_version()
	_check(active_version == "lichtwald-mission01-1", "Active contentVersion reads from content/active manifest (got '%s')" % active_version)

	_test_export_records_content_version()
	_test_stale_save_is_reset()
	_test_matching_save_is_untouched()
	_test_versionless_save_is_reset()
	_test_no_package_means_no_reset()

	_finish()


func _test_export_records_content_version() -> void:
	var exported: Dictionary = save_file._export_save_data()
	_check(exported.get("content_version", "") == "lichtwald-mission01-1", "Exported save records the active content_version")


func _test_stale_save_is_reset() -> void:
	var save_data: Dictionary = _fixture_save("old-dark-forest-9")
	save_data["resources"] = {"holz": 500, "lichttropfen": 3}
	save_data["mission_state"] = {"completed": {"old_mission": true}, "mut_sterne": 99}
	save_data["npc_events"] = {"old_npc": 1}
	save_data["tab_unlocks"] = ["world", "settings", "dark_forest"]
	save_data["settings"] = {"theme": "light", "display_mode": "fullscreen", "display_resolution": [1280, 720]}
	save_data["LOCALE"] = "de"

	save_file._check_content_reset(save_data)

	_check(save_data["resources"] == save_file.get("resources"), "Stale save: resources reset to defaults")
	_check(save_data["mission_state"] == save_file.get("mission_state"), "Stale save: mission_state reset to defaults")
	_check(save_data["npc_events"] == {}, "Stale save: npc_events reset")
	_check(save_data["tab_unlocks"] == save_file.get("tab_unlocks"), "Stale save: tab_unlocks reset to defaults")
	_check(save_data["content_version"] == "lichtwald-mission01-1", "Stale save: content_version updated to active")
	_check(save_data["settings"].get("theme") == "light", "Stale save: player settings preserved")
	_check(save_data["LOCALE"] == "de", "Stale save: locale preserved")


func _test_matching_save_is_untouched() -> void:
	var save_data: Dictionary = _fixture_save("lichtwald-mission01-1")
	save_data["resources"] = {"lichttropfen": 42}
	save_file._check_content_reset(save_data)
	_check(save_data["resources"] == {"lichttropfen": 42}, "Matching-version save: resources untouched")
	_check(save_data["content_version"] == "lichtwald-mission01-1", "Matching-version save: content_version unchanged")


func _test_versionless_save_is_reset() -> void:
	var save_data: Dictionary = _fixture_save("")
	save_data["resources"] = {"holz": 10}
	save_file._check_content_reset(save_data)
	_check(save_data["resources"] == save_file.get("resources"), "Versionless save: resources reset to defaults")
	_check(save_data["content_version"] == "lichtwald-mission01-1", "Versionless save: content_version set")


func _test_no_package_means_no_reset() -> void:
	var original: String = save_file.get("_active_content_version")
	save_file.set("_active_content_version", "")
	var save_data: Dictionary = _fixture_save("whatever")
	save_data["resources"] = {"holz": 10}
	save_file._check_content_reset(save_data)
	_check(save_data["resources"] == {"holz": 10}, "No active package: save untouched")
	save_file.set("_active_content_version", original)


func _fixture_save(content_version: String) -> Dictionary:
	var save_data: Dictionary = save_file._export_save_data()
	save_data["content_version"] = content_version
	return save_data


func _check(condition: bool, label: String) -> void:
	if condition:
		print("PASS: " + label)
	else:
		print("FAIL: " + label)
		failures += 1


func _finish() -> void:
	if failures == 0:
		print("Content reset tests passed.")
		quit(0)
	else:
		push_error("%s content reset test(s) failed." % failures)
		quit(1)
