#!/usr/bin/env bash
# Hannahs Lichtwald – local play harness.
#
# One command to rebuild the Godot web export and play Mission 01 in the
# browser as fast as possible:
#
#   ./scripts/dev-play.sh            # export + ensure dev server + print URL
#   ./scripts/dev-play.sh --no-serve # export only (dev server already running)
#   ./scripts/dev-play.sh --watch    # re-export on every game/ change
#
# The Vite dev server serves static/spiel/engine/ directly, so after an
# export you only need to reload the browser tab (Cmd+R) to play the new
# build. The game itself is a debug build (export-debug is NOT used here on
# purpose: release export is faster and the developer console + debug logs
# are already wired via Game.PARAMS).
set -euo pipefail

cd "$(dirname "$0")/.."

PORT="${PORT:-5173}"
URL="http://localhost:${PORT}/spiel/mission-01/"
WATCH=0
NO_SERVE=0

for arg in "$@"; do
	case "$arg" in
		--watch) WATCH=1 ;;
		--no-serve) NO_SERVE=1 ;;
		*) echo "Unknown option: $arg" >&2; exit 1 ;;
	esac
done

export_game() {
	local start
	start=$(date +%s)
	node scripts/prepare-game-dev.mjs
	local elapsed=$(( $(date +%s) - start ))
	echo ""
	echo "Export done in ${elapsed}s."
	echo "Play: ${URL}"
	echo "Reload the open tab (Cmd+R) to pick up the new build."
}

server_running() {
	curl -sf -o /dev/null "http://localhost:${PORT}/" 2>/dev/null
}

if [ "$WATCH" -eq 1 ]; then
	echo "Watching game/ for changes (Ctrl+C to stop)…"
	export_game
	# Re-export whenever a game source file changes.
	while true; do
		fswatch -o game/scenes game/global game/resources game/native 2>/dev/null \
			| while read -r _; do
				echo "Change detected – re-exporting…"
				export_game
			done
	done
else
	export_game
	if [ "$NO_SERVE" -eq 1 ]; then
		exit 0
	fi
	if server_running; then
		echo "Dev server already running on port ${PORT}."
	else
		echo "Starting Vite dev server on port ${PORT}…"
		pnpm dev > /tmp/hannah-dev-server.log 2>&1 &
		for _ in $(seq 1 30); do
			if server_running; then
				break
			fi
			sleep 1
		done
		if ! server_running; then
			echo "Dev server did not start. Check /tmp/hannah-dev-server.log" >&2
			exit 1
		fi
		echo "Dev server started (log: /tmp/hannah-dev-server.log)."
	fi
fi
