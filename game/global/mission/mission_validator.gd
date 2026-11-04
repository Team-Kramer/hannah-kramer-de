class_name MissionValidator
extends RefCounted

const REQUIRED_OUTCOMES: Array[StringName] = [&"good", &"middle", &"weak"]
const ALLOWED_MODES: Array[StringName] = [&"self", &"vote", &"moderate"]


static func validate(mission: MissionData) -> PackedStringArray:
	var errors: PackedStringArray = []
	if mission == null:
		errors.append("Mission resource is missing.")
		return errors

	if not mission.id.begins_with("mission_"):
		errors.append("Mission id must start with 'mission_'.")
	if mission.title.strip_edges().is_empty() or mission.title.length() > 60:
		errors.append("Mission title must contain 1–60 characters.")
	if mission.intro_text.strip_edges().is_empty():
		errors.append("Mission intro_text must not be empty.")
	if mission.resource_pool < 50:
		errors.append("Mission resource_pool must be at least 50.")

	var character_ids: Dictionary = {}
	for character: Dictionary in mission.characters:
		var character_id: StringName = StringName(str(character.get("id", "")))
		if character_id == &"":
			errors.append("Every character needs a non-empty id.")
		elif character_ids.has(character_id):
			errors.append("Duplicate character id: %s." % character_id)
		else:
			character_ids[character_id] = true

		for field: String in ["name", "wish", "mood"]:
			if str(character.get(field, "")).strip_edges().is_empty():
				errors.append("Character %s needs a non-empty %s." % [character_id, field])
		if typeof(character.get("can_vote", null)) != TYPE_BOOL:
			errors.append("Character %s needs a boolean can_vote field." % character_id)

		var dialogs: Variant = character.get("dialogs", null)
		if not dialogs is Array or dialogs.is_empty():
			errors.append("Character %s needs at least one dialogue line." % character_id)
		else:
			for line: Variant in dialogs:
				if not line is String or line.strip_edges().is_empty():
					errors.append("Character %s has an empty or invalid dialogue line." % character_id)

	if mission.characters.size() < 3:
		errors.append("Mission must have at least three characters.")

	var option_ids: Dictionary = {}
	var option_costs: Dictionary = {}
	for option: Dictionary in mission.options:
		var option_id: StringName = StringName(str(option.get("id", "")))
		if option_id == &"":
			errors.append("Every option needs a non-empty id.")
		elif option_ids.has(option_id):
			errors.append("Duplicate option id: %s." % option_id)
		else:
			option_ids[option_id] = true

		var cost: Variant = option.get("cost", null)
		if typeof(cost) != TYPE_INT or int(cost) <= 0:
			errors.append("Option %s must have a positive integer cost." % option_id)
		else:
			option_costs[option_id] = int(cost)
			if int(cost) > mission.resource_pool:
				errors.append("Option %s costs more than the mission resource pool." % option_id)
		if str(option.get("label", "")).strip_edges().is_empty():
			errors.append("Option %s needs a non-empty label." % option_id)

	if mission.options.size() < 3:
		errors.append("Mission must have at least three options.")

	for character: Dictionary in mission.characters:
		var wish_id: StringName = StringName(str(character.get("wish", "")))
		if not option_ids.has(wish_id):
			errors.append("Character %s refers to unknown option %s." % [character.get("id", ""), wish_id])

	var seen_modes: Dictionary = {}
	if mission.decision_modes.is_empty():
		errors.append("Mission must support at least one decision mode.")
	for mode_name: String in mission.decision_modes:
		var mode_id: StringName = StringName(mode_name)
		if not ALLOWED_MODES.has(mode_id):
			errors.append("Unknown decision mode: %s." % mode_name)
		elif seen_modes.has(mode_id):
			errors.append("Duplicate decision mode: %s." % mode_name)
		else:
			seen_modes[mode_id] = true

	var outcome_ids: Dictionary = {}
	var outcomes_by_id: Dictionary = {}
	for outcome: Dictionary in mission.outcomes:
		var outcome_id: StringName = StringName(str(outcome.get("id", "")))
		if outcome_id == &"":
			errors.append("Every outcome needs a non-empty id.")
		elif outcome_ids.has(outcome_id):
			errors.append("Duplicate outcome id: %s." % outcome_id)
		else:
			outcome_ids[outcome_id] = true
			outcomes_by_id[outcome_id] = outcome
		for field: String in ["condition", "result_text"]:
			if str(outcome.get(field, "")).strip_edges().is_empty():
				errors.append("Outcome %s needs a non-empty %s." % [outcome_id, field])
		if not outcome.get("effects", null) is Dictionary:
			errors.append("Outcome %s needs an effects dictionary." % outcome_id)

	for required_id: StringName in REQUIRED_OUTCOMES:
		if not outcome_ids.has(required_id):
			errors.append("Missing required outcome: %s." % required_id)

	var weak_outcome: Dictionary = outcomes_by_id.get(&"weak", {})
	var weak_effects: Variant = weak_outcome.get("effects", {})
	if weak_effects is Dictionary and weak_effects.get("retry", false) != true:
		errors.append("The weak outcome must allow the mission to be retried.")
	var weak_condition: String = str(weak_outcome.get("condition", "")).to_lower()
	if option_ids.has(&"alles_halb") and not weak_condition.contains("alles_halb"):
		errors.append("The weak outcome must cover the alles_halb option.")

	var good_outcome: Dictionary = outcomes_by_id.get(&"good", {})
	var good_effects: Variant = good_outcome.get("effects", {})
	var good_condition: String = str(good_outcome.get("condition", "")).to_lower()
	if good_effects is Dictionary:
		var has_positive_effect: bool = (
			int(good_effects.get("mut_sterne", 0)) > 0
			or int(good_effects.get("freundschaft", 0)) > 0
		)
		if not has_positive_effect:
			errors.append("The good outcome must grant a positive world effect.")
	if option_ids.has(&"barrierefrei"):
		if not good_condition.contains("barrierefrei"):
			errors.append("The good outcome must require the barrier-free option.")
		if not good_condition.contains("option_count >= 2"):
			errors.append("The good outcome must require at least two built options.")

	var middle_outcome: Dictionary = outcomes_by_id.get(&"middle", {})
	var middle_effects: Variant = middle_outcome.get("effects", {})
	if middle_effects is Dictionary:
		var grants_middle_reward: bool = (
			int(middle_effects.get("mut_sterne", 0)) > 0
			or int(middle_effects.get("freundschaft", 0)) > 0
			or middle_effects.has("unlocks")
		)
		if grants_middle_reward:
			errors.append("The middle outcome must not reward a loudest-only choice.")

	if option_ids.has(&"barrierefrei"):
		var accessible_cost: int = int(option_costs.get(&"barrierefrei", 0))
		var cheapest_other_cost: int = mission.resource_pool + 1
		for option_id: StringName in option_costs:
			if option_id != &"barrierefrei":
				cheapest_other_cost = mini(cheapest_other_cost, int(option_costs[option_id]))
		if accessible_cost + cheapest_other_cost > mission.resource_pool:
			errors.append("A barrier-free choice plus another option must fit the resource pool.")

	return errors
