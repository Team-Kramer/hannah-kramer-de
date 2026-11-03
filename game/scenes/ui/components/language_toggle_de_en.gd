# Simple 2-language toggle (de/en) replacing the removed 9-language picker.
extends HBoxContainer

@onready var de_button: Button = %DeButton
@onready var en_button: Button = %EnButton


func _ready() -> void:
	de_button.pressed.connect(_on_de_button_pressed)
	en_button.pressed.connect(_on_en_button_pressed)
	SignalBus.display_language_updated.connect(_on_display_language_updated)
	_on_display_language_updated()


func _on_de_button_pressed() -> void:
	Scene.change_language_to("de")


func _on_en_button_pressed() -> void:
	Scene.change_language_to("en")


func _on_display_language_updated() -> void:
	var is_de: bool = SaveFile.locale == "de"
	de_button.button_pressed = is_de
	en_button.button_pressed = not is_de
