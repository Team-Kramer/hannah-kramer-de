import { spawnSync } from 'node:child_process';
import { cpSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const root = process.cwd();
const exportDir = resolve(root, 'game/.export/dev-web');
const stagedDir = resolve(root, 'static/spiel/engine');

function runGodot(args) {
	const result = spawnSync('godot', ['--headless', '--path', 'game', ...args], {
		cwd: root,
		stdio: 'inherit'
	});

	if (result.error) {
		console.error(`Could not run Godot: ${result.error.message}`);
		process.exit(1);
	}
	if (result.status !== 0) {
		process.exit(result.status ?? 1);
	}
}

rmSync(exportDir, { recursive: true, force: true });
mkdirSync(exportDir, { recursive: true });

runGodot(['--import']);
runGodot([
	'--export-release',
	'The Best Game Ever',
	resolve(exportDir, 'index.html')
]);

rmSync(stagedDir, { recursive: true, force: true });
mkdirSync(dirname(stagedDir), { recursive: true });
cpSync(exportDir, stagedDir, { recursive: true });

console.log(`Godot Web export ready at ${stagedDir}`);