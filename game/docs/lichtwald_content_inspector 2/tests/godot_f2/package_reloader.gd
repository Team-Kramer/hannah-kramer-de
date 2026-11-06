extends RefCounted
## Development-time package reloader with a whole-package validation gate.
##
## This is the PD-04 boundary: the game may only swap in a new JSON package
## when the entire package passes validation (PD-02a). An invalid reload never
## disturbs the last valid package, so a half-edited or broken export on disk
## cannot take the running game down. The reloader is deliberately stateful:
## it remembers the last valid package and serves it until a valid replacement
## arrives.
##
## Usage:
##   var reloader := PackageReloader.new()
##   var first: Dictionary = reloader.load("user://content")      # initial
##   var again: Dictionary = reloader.reload("user://content")    # dev reload
##   var active: Variant = reloader.current()                     # last valid
##
## `load`/`reload` return { ok, reloaded, keptLastValid, messages, package,
## catalog }. `package` is the assembled package (PD-02a `assembled`) or null
## when no valid package is active. `catalog` is the ID catalog or null.

const PackageLoader := preload("res://package_loader.gd")

var _active_package: Variant = null
var _active_catalog: Variant = null


## True once a valid package has been loaded and not since replaced.
func has_active_package() -> bool:
	return _active_package != null


## The currently active assembled package, or null if none is active.
func current() -> Variant:
	return _active_package


## The currently active ID catalog, or null if none is active.
func current_catalog() -> Variant:
	return _active_catalog


## Initial load. A valid package becomes active; an invalid one leaves the
## reloader with no active package.
func load(dir: String) -> Dictionary:
	return _attempt(dir, false)


## Development reload. A valid package replaces the active one; an invalid
## package keeps the last valid package active.
func reload(dir: String) -> Dictionary:
	return _attempt(dir, true)


func _attempt(dir: String, is_reload: bool) -> Dictionary:
	var result: Dictionary = PackageLoader.load_package(dir)
	var messages: Array = result["messages"]
	if result.ok:
		_active_package = result["assembled"]
		_active_catalog = result["catalog"]
		return {
			"ok": true,
			"reloaded": true,
			"keptLastValid": false,
			"messages": messages,
			"package": _active_package,
			"catalog": _active_catalog,
		}
	# Invalid package: never disturb the last valid one.
	return {
		"ok": false,
		"reloaded": false,
		"keptLastValid": _active_package != null,
		"messages": messages,
		"package": _active_package,
		"catalog": _active_catalog,
	}
