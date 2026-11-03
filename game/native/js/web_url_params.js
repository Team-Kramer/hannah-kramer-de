// Hannahs Lichtwald – web URL params (deep-link for /spiel/[missionId])
// Reads ?mission=mission-01 from the URL and exposes it to GDScript via
// window.__missionParam. Loaded by save_file_picker.gd through
// JavaScriptBridge.eval (same pattern as text_modal.js).
(function () {
	"use strict";

	function readMissionParam() {
		try {
			var params = new URLSearchParams(window.location.search);
			var mission = params.get("mission");
			return mission ? mission : "";
		} catch (error) {
			return "";
		}
	}

	window.__missionParam = readMissionParam();
})();
