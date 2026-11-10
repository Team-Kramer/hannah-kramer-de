#!/usr/bin/env node
// Hannahs Lichtwald – headless play harness.
//
// Drives the Godot web export in a real Chromium so the game can be played,
// inspected and regression-checked from the terminal:
//
//   node scripts/play.mjs                          # load Mission 01, screenshot
//   node scripts/play.mjs shot <name>              # screenshot to /tmp/hannah-<name>.png
//   node scripts/play.mjs click <gx> <gy>          # click at GAME coords (960x540 space)
//   node scripts/play.mjs click <gx> <gy> <name>   # click + screenshot after
//   node scripts/play.mjs boxes                    # print canvas rect + coord mapping
//   node scripts/play.mjs run 'shot:a' 'click:480:470:b' 'wait:800'
//                                                  # scripted play in one session
//   node scripts/play.mjs type <text>              # type into the game (dev console)
//   node scripts/play.mjs url <full-url>           # load an arbitrary game URL
//   node scripts/play.mjs logs                     # load, wait, dump console logs
//
// State (saves) persists in a dedicated Chromium profile, so consecutive
// runs continue the same game – exactly like a child reloading the tab.
//
// The game renders at 960x540 (canvas_resize_policy=2, letterboxed). Clicks
// are given in game coordinates and mapped onto the canvas element.

import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const BASE = 'http://localhost:5173';
const PROFILE_DIR = '/tmp/hannah-play-profile';
const GAME_W = 960;
const GAME_H = 540;

const args = process.argv.slice(2);
const cmd = args[0] || 'shot';
const url =
	cmd === 'url'
		? args[1]
		: `${BASE}/spiel/mission-01/`;

mkdirSync(PROFILE_DIR, { recursive: true });

const ctx = await chromium.launchPersistentContext(PROFILE_DIR, {
	viewport: { width: 1280, height: 800 },
	args: ['--no-sandbox'],
});
const page = ctx.pages()[0] || (await ctx.newPage());

const consoleLines = [];
page.on('console', (msg) => consoleLines.push(`[${msg.type()}] ${msg.text()}`));
page.on('pageerror', (err) => consoleLines.push(`[pageerror] ${err.message}`));

console.log(`Loading ${url}`);
await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });

// Wait for the Godot engine to finish booting (canvas + engine frame ready).
const engineFrame = await waitForEngineFrame(page, 120);
if (!engineFrame) {
	console.error('Engine frame never appeared. Console:');
	consoleLines.slice(-30).forEach((l) => console.error('  ' + l));
	process.exit(1);
}
// Give the scene a moment to build UI after the engine reports ready.
await page.waitForTimeout(2500);

// Map a game coordinate (960x540) to page coordinates via the canvas rect.
async function gamePoint(gx, gy) {
	const canvas = await engineFrame.$('canvas');
	if (!canvas) throw new Error('no canvas in engine frame');
	const box = await canvas.boundingBox();
	if (!box) throw new Error('canvas has no bounding box');
	// canvas_resize_policy=2 keeps aspect and letterboxes inside the canvas.
	const scale = Math.min(box.width / GAME_W, box.height / GAME_H);
	const rw = GAME_W * scale;
	const rh = GAME_H * scale;
	const ox = box.x + (box.width - rw) / 2;
	const oy = box.y + (box.height - rh) / 2;
	return { x: ox + gx * scale, y: oy + gy * scale };
}

async function canvasBox() {
	const canvas = await engineFrame.$('canvas');
	return canvas ? canvas.boundingBox() : null;
}

async function clickGame(gx, gy, label) {
	const p = await gamePoint(gx, gy);
	console.log(`Click game(${gx}, ${gy}) -> page(${p.x.toFixed(1)}, ${p.y.toFixed(1)})`);
	await page.mouse.click(p.x, p.y);
	await page.waitForTimeout(600);
	if (label) await shot(label);
}

async function shot(name) {
	const out = `/tmp/hannah-${name}.png`;
	await page.screenshot({ path: out });
	console.log(`Screenshot: ${out}`);
	return out;
}

switch (cmd) {
	case 'shot':
		await shot(args[1] || 'state');
		break;
	case 'click': {
		const gx = Number(args[1]);
		const gy = Number(args[2]);
		await clickGame(gx, gy, args[3]);
		break;
	}
	case 'boxes': {
		// Print the canvas rect and the page->game mapping so clicks can be
		// aimed from a screenshot.
		const box = await canvasBox();
		if (!box) {
			console.error('no canvas');
			break;
		}
		const scale = Math.min(box.width / GAME_W, box.height / GAME_H);
		const ox = box.x + (box.width - GAME_W * scale) / 2;
		const oy = box.y + (box.height - GAME_H * scale) / 2;
		console.log(JSON.stringify({ box, scale, ox, oy }, null, 2));
		console.log('game(0,0)    -> page(' + ox.toFixed(1) + ',' + oy.toFixed(1) + ')');
		console.log('game(960,540)-> page(' + (ox + 960 * scale).toFixed(1) + ',' + (oy + 540 * scale).toFixed(1) + ')');
		break;
	}
	case 'run': {
		// Play a scripted sequence in ONE browser session (state persists
		// between steps, unlike separate click invocations).
		//   node scripts/play.mjs run 'shot:intro' 'click:480:470:listen' 'click:...'
		const steps = args.slice(1);
		for (const step of steps) {
			const [action, ...rest] = step.split(':');
			if (action === 'shot') {
				await shot(rest[0] || 'step');
			} else if (action === 'click') {
				await clickGame(Number(rest[0]), Number(rest[1]), rest[2]);
			} else if (action === 'wait') {
				await page.waitForTimeout(Number(rest[0]) || 1000);
			} else {
				console.error('unknown run action: ' + action);
			}
		}
		break;
	}
	case 'type': {
		await page.keyboard.type(args.slice(1).join(' '));
		await page.waitForTimeout(400);
		await shot('after-type');
		break;
	}
	case 'logs':
		break;
	default:
		await shot('state');
}

// Dump engine-relevant console lines (Godot prints via console.log/error).
const interesting = consoleLines.filter(
	(l) =>
		l.includes('ERROR') ||
		l.includes('SCRIPT ERROR') ||
		l.includes('_READY') ||
		l.includes('Mission') ||
		l.includes('mission')
);
if (interesting.length) {
	console.log('\n--- console (filtered) ---');
	interesting.slice(-40).forEach((l) => console.log(l));
}

await ctx.close();

async function waitForEngineFrame(page, seconds) {
	const deadline = Date.now() + seconds * 1000;
	while (Date.now() < deadline) {
		for (const f of page.frames()) {
			if (f.url().includes('/spiel/engine/')) return f;
		}
		await page.waitForTimeout(500);
	}
	return null;
}
