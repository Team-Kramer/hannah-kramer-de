import { MISSIONS } from '$lib/missions';

// Prerendering: which mission deep links exist (playable missions only).
export const entries = () => MISSIONS.filter((m) => m.playable).map((m) => ({ missionId: m.id }));

export function load({ params }) {
	const mission = MISSIONS.find((m) => m.id === params.missionId);
	if (!mission) {
		// Unknown mission: fall back to the plain game shell (save picker).
		return { mission: '' };
	}
	return { mission: mission.id };
}
