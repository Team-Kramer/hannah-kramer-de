# Hannahs Lichtwald – outcome evaluation (doc 02 §6)
# Pure, deterministic: given the built options, return the outcome id.
class_name Outcomes

const GOOD: StringName = &"good"
const MIDDLE: StringName = &"middle"
const WEAK: StringName = &"weak"

const BARRIEREFREI: StringName = &"barrierefrei"
const ALLES_HALB: StringName = &"alles_halb"
const LOUDEST: Array[StringName] = [&"rutsche", &"fussball"]


# Evaluates the built options against the Mission 01 outcome conditions.
# Priority: weak (alles_halb) > good > middle (only loudest) > weak (juan forgotten).
static func evaluate(built: Array[StringName]) -> StringName:
	var has_barrierefrei: bool = built.has(BARRIEREFREI)
	var option_count: int = built.size()

	# Schwacher Ausgang: alles wird nur halb gebaut.
	if built.has(ALLES_HALB):
		return WEAK

	# Guter Ausgang: barrierefrei + mindestens eine weitere Idee.
	if has_barrierefrei and option_count >= 2:
		return GOOD

	# Mittlerer Ausgang: nur die lauteste Idee (Rutsche oder Fußball) gebaut.
	if _only_loudest(built):
		return MIDDLE

	# Schwacher Ausgang: Juan wird komplett vergessen (kein barrierefrei).
	if not has_barrierefrei:
		return WEAK

	# barrierefrei alone: improved but not fully inclusive → middle.
	return MIDDLE


static func _only_loudest(built: Array[StringName]) -> bool:
	if built.is_empty():
		return false
	for option_id: StringName in built:
		if not LOUDEST.has(option_id):
			return false
	return true


# Effects per outcome (doc 02 §6): world status + character relations.
static func effects_for(outcome_id: StringName) -> Dictionary:
	match outcome_id:
		GOOD:
			return {"mut_sterne": 15, "freundschaft": 20, "unlocks": &"licht_rat"}
		MIDDLE:
			return {"schatten_der_eile": 1}
		_:
			return {"retry": true}
