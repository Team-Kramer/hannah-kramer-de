// Hannahs Lichtwald – web URL params (deep-link + share for /spiel/[missionId])
//
// Reads from the URL and exposes to GDScript via window.* globals, loaded by
// save_file_picker.gd through JavaScriptBridge.eval (same pattern as
// text_modal.js):
//
//   ?mission=mission-01  -> window.__missionParam  (deep link into a mission)
//   ?load=last           -> window.__loadParam     (resume the last played save)
//   #z=<base64url>       -> window.__shareParam    (a shared save snapshot)
//
// The #z= snapshot is base64url (URL-safe) so it survives a URL fragment. The
// GDScript importer converts it back to standard base64 before calling
// SaveFile.import_from_string (which expects standard base64).
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

	function readLoadParam() {
		try {
			var params = new URLSearchParams(window.location.search);
			var load = params.get("load");
			return load ? load : "";
		} catch (error) {
			return "";
		}
	}

	function readShareParam() {
		try {
			var hash = window.location.hash || "";
			if (hash.indexOf("#z=") !== 0) {
				return "";
			}
			var snapshot = hash.slice(3);
			// base64url -> standard base64 (the engine expects standard base64).
			var b64 = snapshot.replace(/-/g, "+").replace(/_/g, "/");
			var pad = b64.length % 4;
			if (pad === 2) {
				b64 += "==";
			} else if (pad === 3) {
				b64 += "=";
			}
			return b64;
		} catch (error) {
			return "";
		}
	}

	window.__missionParam = readMissionParam();
	window.__loadParam = readLoadParam();
	window.__shareParam = readShareParam();
})();
