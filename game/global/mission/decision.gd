# Hannahs Lichtwald – decision logic (doc 02 §5)
# Pure, deterministic helpers: no scene dependencies.
class_name Decision

const MODERATE_COMPROMISE: Array[StringName] = [&"barrierefrei", &"ruhebereich"]
const LOUDEST_IDS: Array[StringName] = [&"rutsche", &"fussball"]
const MUT_COST_MODERATE: int = 5


# Weg A – Selbst entscheiden: 1–2 options, total cost must fit the pool.
static func is_valid_self_choice(selected: Array[StringName], pool: int, costs: Dictionary) -> bool:
	if selected.is_empty() or selected.size() > 2:
		return false
	var seen: Dictionary = {}
	for option_id: StringName in selected:
		if not costs.has(option_id) or seen.has(option_id):
			return false
		seen[option_id] = true
	return total_cost(selected, costs) <= pool


# Weg B – Abstimmung: aggregate every eligible character's weighted vote.
# Equal totals are decided by the option supported by the least-heard voice.
static func vote(
	character_wishes: Dictionary,
	freundschaft: Dictionary,
	listened_counts: Dictionary = {}
) -> StringName:
	var totals: Dictionary = {}
	var quietest_supporters: Dictionary = {}
	for character_id: Variant in character_wishes:
		var wish_id: StringName = StringName(str(character_wishes[character_id]))
		if wish_id == &"":
			continue
		var friendship_value: int = maxi(0, int(freundschaft.get(character_id, 0)))
		var weight: float = 1.0 + 0.1 * friendship_value
		totals[wish_id] = float(totals.get(wish_id, 0.0)) + weight

		var supporter: Dictionary = {
			"listens": maxi(0, int(listened_counts.get(character_id, 0))),
			"id": str(character_id)
		}
		var previous: Dictionary = quietest_supporters.get(wish_id, {})
		if (
			previous.is_empty()
			or int(supporter["listens"]) < int(previous["listens"])
			or (
				int(supporter["listens"]) == int(previous["listens"])
				and str(supporter["id"]) < str(previous["id"])
			)
		):
			quietest_supporters[wish_id] = supporter

	if totals.is_empty():
		return &""

	var highest_total: float = -INF
	for option_id: StringName in totals:
		highest_total = maxf(highest_total, float(totals[option_id]))

	var tied_options: Array[StringName] = []
	for option_id: StringName in totals:
		if is_equal_approx(float(totals[option_id]), highest_total):
			tied_options.append(option_id)
	tied_options.sort_custom(
		func(left: StringName, right: StringName) -> bool:
			var left_supporter: Dictionary = quietest_supporters[left]
			var right_supporter: Dictionary = quietest_supporters[right]
			var left_listens: int = int(left_supporter["listens"])
			var right_listens: int = int(right_supporter["listens"])
			if left_listens != right_listens:
				return left_listens < right_listens
			var left_character: String = str(left_supporter["id"])
			var right_character: String = str(right_supporter["id"])
			if left_character != right_character:
				return left_character < right_character
			return str(left) < str(right)
	)
	return tied_options[0]


# Weg C – Moderieren: fixed compromise, costs Mut-Sterne.
static func moderate_compromise() -> Array[StringName]:
	return MODERATE_COMPROMISE.duplicate()


static func total_cost(selected: Array[StringName], costs: Dictionary) -> int:
	var total: int = 0
	for option_id: StringName in selected:
		total += int(costs.get(option_id, 0))
	return total
