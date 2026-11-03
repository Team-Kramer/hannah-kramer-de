extends Node

@onready var ui: Control = %UI
@onready var save_file_tracker: SaveFileTracker = %SaveFileTracker

###############
## overrides ##
###############


func _process(_delta: float) -> void:
	if Input.is_action_just_pressed("escape_game"):
		get_tree().quit()


func _ready() -> void:
	Input.set_mouse_mode(Input.MOUSE_MODE_VISIBLE)

	_initialize()
	_connect_signals()
	_check_mission_url_param()

	if Game.PARAMS["debug_logs"]:
		print("_READY: " + self.get_name())


#############
## helpers ##
#############


func _initialize() -> void:
	var save_file_name: String = save_file_tracker.get_last_played_save_file_name()
	ui.theme = SaveFile.get_settings_theme(save_file_name)

	var bus_index: int = AudioServer.get_bus_index(&"Master")
	AudioServer.set_bus_mute(bus_index, true)


func _change_scene_to_main_scene(save_file_name: String, metadata_name: String = "") -> void:
	SaveFile.initialize(save_file_name, metadata_name)
	Scene.change_scene("main_scene")


func _force_unique_save_file_name(save_file_name: String) -> String:
	while SaveFile.save_datas.has(save_file_name):
		return StringUtils.increment_int_suffix(save_file_name, SaveFile.save_datas.keys())
	return save_file_name


func _check_mission_url_param() -> void:
	# Web deep link: /spiel/?mission=mission-01 opens the mission directly.
	# Delayed so it wins over the auto "new save file -> main_scene" jump.
	if not OS.has_feature("web"):
		return
	var js: String = FileSystemUtils.read_text_from("res://native/js/web_url_params.js")
	if js.is_empty():
		return
	JavaScriptBridge.eval(js)
	var eval_return: Variant = JavaScriptBridge.eval("window.__missionParam")
	var mission_param: String = str(eval_return) if eval_return != null else ""
	if mission_param == "mission-01":
		get_tree().create_timer(0.5).timeout.connect(
			func(): Scene.change_scene("mission_scene")
		)


##############
## handlers ##
##############


func _handle_on_new_save_file(save_file_name: String) -> void:
	var max_length: int = Game.PARAMS["max_file_name_length"]

	var metadata_name: String = StringUtils.sanitize_text(
		save_file_name, StringUtils.ASCII, max_length, "0"
	)

	save_file_name = StringUtils.sanitize_text(save_file_name, StringUtils.COMMON, max_length, "0")
	save_file_name = _force_unique_save_file_name(save_file_name)

	_change_scene_to_main_scene(save_file_name, metadata_name)


func _handle_on_new_input_set(save_file_name: String, new_text: String, old_text: String) -> void:
	var max_length: int = Game.PARAMS["max_file_name_length"]

	var metadata_name: String = StringUtils.sanitize_text(
		new_text, StringUtils.ASCII, max_length, "0"
	)

	SaveFile.rename(save_file_name, metadata_name, old_text)


#############
## signals ##
#############


func _connect_signals() -> void:
	save_file_tracker.load_save_file.connect(_on_load_save_file)
	save_file_tracker.delete_save_file.connect(_on_delete_save_file)
	save_file_tracker.new_save_file.connect(_on_new_save_file)
	save_file_tracker.new_input_set.connect(_on_new_input_set)


func _on_load_save_file(save_file_name: String) -> void:
	_change_scene_to_main_scene(save_file_name)


func _on_new_save_file(save_file_name: String) -> void:
	_handle_on_new_save_file(save_file_name)


func _on_delete_save_file(save_file_name: String) -> void:
	SaveFile.delete(save_file_name)


func _on_new_input_set(save_file_name: String, new_text: String, old_text: String) -> void:
	_handle_on_new_input_set(save_file_name, new_text, old_text)
