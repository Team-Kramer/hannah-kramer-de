const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
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
const loaderContext = {};
vm.runInNewContext(
  fs.readFileSync(path.join(workbenchRoot, "web/js/package_loader.js"), "utf8"),
  loaderContext
);
const { createPackageBundle, parsePackage, parsePackageBundle } = loaderContext.ContentPackage;

test("workbench bundle folder passes the Godot F2 loader and round-trip boundary", {
  skip: godotAvailable ? false : `Godot executable is unavailable: ${godotVersion.error?.message || godotCommand}`
}, () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(fixtureRoot, "manifest.json"), "utf8"));
  const entries = [
    { path: "manifest.json", text: JSON.stringify(manifest) },
    ...manifest.files.map(filePath => ({
      path: filePath,
      text: fs.readFileSync(path.join(fixtureRoot, filePath), "utf8")
    }))
  ];
  const bundle = createPackageBundle(parsePackage(entries, "spielplatz_demo"));
  const reopened = parsePackageBundle(bundle, "spielplatz_demo");
  const exportDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "lichtwald-workbench-export-"));

  try {
    fs.writeFileSync(
      path.join(exportDirectory, "manifest.json"),
      `${JSON.stringify(reopened.manifest, null, 2)}\n`
    );
    for (const filePath of reopened.manifest.files) {
      const outputPath = path.join(exportDirectory, filePath);
      fs.mkdirSync(path.dirname(outputPath), { recursive: true });
      fs.writeFileSync(outputPath, `${JSON.stringify(reopened.documents[filePath], null, 2)}\n`);
    }

    const result = spawnSync(godotCommand, [
      "--headless",
      "--path", godotProject,
      "--script", "res://f2_round_trip.gd",
      "--",
      exportDirectory
    ], { encoding: "utf8", timeout: 120_000 });

    assert.equal(result.error, undefined, result.error?.message);
    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
    assert.match(result.stdout, /F2 PASS/);
  } finally {
    fs.rmSync(exportDirectory, { recursive: true, force: true });
  }
});
