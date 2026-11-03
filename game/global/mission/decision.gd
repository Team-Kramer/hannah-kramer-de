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
	return total_cost(selected, costs) <= pool


# Weg B – Abstimmung: each character votes for their wish.
# Weight = 1 + 0.1 * freundschaft (Freundschafts-Funken amplify a voice).
# Ties are broken by the quietest voice: the character with the lowest
# freundschaft wins (Oma Linde's rule – "das Lauteste ist nicht das Wichtigste").
static func vote(character_wishes: Dictionary, freundschaft: Dictionary) -> StringName:
	var best_id: StringName = &""
	var best_weight: float = -1.0
	var best_freundschaft: int = 999999
	for character_id: StringName in character_wishes:
		var wish_id: StringName = character_wishes[character_id]
		var weight: float = 1.0 + 0.1 * float(freundschaft.get(character_id, 0))
		var freundschaft_value: int = int(freundschaft.get(character_id, 0))
		var wins: bool = weight > best_weight
		var tied_quietest: bool = weight == best_weight and freundschaft_value < best_freundschaft
		if wins or tied_quietest:
			best_weight = weight
			best_freundschaft = freundschaft_value
			best_id = wish_id
	return best_id


# Weg C – Moderieren: fixed compromise, costs Mut-Sterne.
static func moderate_compromise() -> Array[StringName]:
	return MODERATE_COMPROMISE.duplicate()


static func total_cost(selected: Array[StringName], costs: Dictionary) -> int:
	var total: int = 0
	for option_id: StringName in selected:
		total += int(costs.get(option_id, 0))
	return total
