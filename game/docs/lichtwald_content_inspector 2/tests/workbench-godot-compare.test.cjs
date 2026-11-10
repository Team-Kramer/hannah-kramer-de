const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const test = require("node:test");
const vm = require("node:vm");

const workbenchRoot = path.resolve(__dirname, "..");
const fixtureRoot = path.join(workbenchRoot, "fixtures", "spielplatz_demo");
const godotProject = path.join(__dirname, "godot_f2");
const godotCommand = process.env.GODOT_BIN || "godot";
const godotVersion = spawnSync(godotCommand, ["--version"], { encoding: "utf8" });
const godotAvailable = !godotVersion.error && godotVersion.status === 0;

function loadValidator() {
  const context = {};
  for (const script of ["schema.js", "validator.js"]) {
    vm.runInNewContext(fs.readFileSync(path.join(workbenchRoot, "web/js", script), "utf8"), context);
  }
  vm.runInNewContext(fs.readFileSync(path.join(workbenchRoot, "web/js/package_loader.js"), "utf8"), context);
  return context;
}

function parsePackageFromDisk() {
  const context = loadValidator();
  const { parsePackage } = context.ContentPackage;
  const manifest = JSON.parse(fs.readFileSync(path.join(fixtureRoot, "manifest.json"), "utf8"));
  const entries = [
    { path: "manifest.json", text: JSON.stringify(manifest) },
    ...manifest.files.map(filePath => ({
      path: filePath,
      text: fs.readFileSync(path.join(fixtureRoot, filePath), "utf8")
    }))
  ];
  return parsePackage(entries, "spielplatz_demo");
}

function runGodotCompare() {
  const result = spawnSync(godotCommand, [
    "--headless",
    "--path", godotProject,
    "--script", "res://f2_round_trip.gd",
    "--",
    fixtureRoot,
    "--compare"
  ], { encoding: "utf8", timeout: 120_000 });
  assert.equal(result.error, undefined, result.error?.message);
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  const ok = [];
  const errors = [];
  for (const line of (result.stdout || "").split("\n")) {
    if (line.startsWith("GODOT_OK|")) ok.push(line.slice("GODOT_OK|".length));
    else if (line.startsWith("GODOT_ERR|")) errors.push(line.slice("GODOT_ERR|".length));
  }
  assert.ok(result.stdout.includes("GODOT_COMPARE_DONE"), "Godot comparison run completed");
  return { ok, errors };
}

test("workbench and Godot validators agree on the shared fixture package", {
  skip: godotAvailable ? false : `Godot executable is unavailable: ${godotVersion.error?.message || godotCommand}`
}, () => {
  const pkg = parsePackageFromDisk();
  const node = loadValidator().validatePackage(pkg);
  // validatePackage runs inside a VM realm; copy its arrays into host arrays
  // so deepStrictEqual's prototype check passes.
  const nodeOk = [...node.messages].filter(message => message.level === "ok").map(message => message.text);
  const nodeErrors = [...node.messages].filter(message => message.level === "error").map(message => message.text);
  const godot = runGodotCompare();

  assert.equal(node.ok, true, `Node validator should pass: ${nodeErrors.join("; ")}`);
  assert.deepEqual(godot.errors, [], `Godot validator should pass: ${godot.errors.join("; ")}`);
  assert.deepEqual(godot.ok, nodeOk, "ok messages must match between workbench and Godot validators");
  assert.equal(godot.ok.length, 7, "expected the 7 summary ok messages");
});
