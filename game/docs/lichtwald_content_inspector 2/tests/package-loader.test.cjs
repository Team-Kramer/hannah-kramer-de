const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { test } = require("node:test");
const vm = require("node:vm");

const loaderContext = {};
vm.runInNewContext(
  fs.readFileSync(path.resolve(__dirname, "../web/js/package_loader.js"), "utf8"),
  loaderContext
);
const { parsePackage, parsePackageBundle, createPackageBundle } = loaderContext.ContentPackage;

const fixtureRoot = path.resolve(__dirname, "../fixtures/spielplatz_demo");
const manifest = JSON.parse(fs.readFileSync(path.join(fixtureRoot, "manifest.json"), "utf8"));
const entries = [
  { path: "manifest.json", text: fs.readFileSync(path.join(fixtureRoot, "manifest.json"), "utf8") },
  ...manifest.files.map((file) => ({
    path: file,
    text: fs.readFileSync(path.join(fixtureRoot, file), "utf8")
  }))
];

test("manifest loader retains every domain and file from the fixture", () => {
  const loaded = parsePackage(entries, "spielplatz_demo");
  assert.equal(loaded.packageName, "spielplatz_demo");
  assert.equal(loaded.manifest.packId, "lichtwald");
  assert.deepEqual(Object.keys(loaded.documents).sort(), [...manifest.files].sort());
  assert.deepEqual(Object.keys(loaded.stories), ["story_spielplatz"]);
  assert.deepEqual(Object.keys(loaded.npcs), ["juan"]);
  assert.deepEqual(Object.keys(loaded.locales).sort(), ["de", "en"]);
  assert.equal(loaded.locations.locations[0].id, "lichtwald_spielplatz");
  assert.equal(loaded.combat.encounters[0].id, "playground_shadow");
  assert.equal(loaded.resources.producers[0].id, "gather_holz");
  assert.equal(loaded.rules.rules[0].id, "unlock_playground_options");
  assert.equal(loaded.assets.assets.length > 0, true);
  assert.equal(loaded.files["manifest.json"] !== undefined, true);
});

test("manifest loading rejects missing and duplicate files before returning partial state", () => {
  assert.throws(() => parsePackage(entries.filter((entry) => entry.path !== "combat.json")), /Manifest file is missing: combat.json/);
  assert.throws(() => parsePackage([...entries, entries[1]]), /Duplicate package file: combat.json/);

  const duplicateManifest = structuredClone(manifest);
  duplicateManifest.files.push(duplicateManifest.files[0]);
  const duplicateEntries = entries.map((entry) => entry.path === "manifest.json"
    ? { ...entry, text: JSON.stringify(duplicateManifest) }
    : entry);
  assert.throws(() => parsePackage(duplicateEntries), /Manifest lists a file more than once/);
});

test("manifest paths are constrained to package-relative files and JSON errors name the path", () => {
  const traversalManifest = { ...manifest, files: ["../outside.json"] };
  const traversalEntries = entries.map((entry) => entry.path === "manifest.json"
    ? { ...entry, text: JSON.stringify(traversalManifest) }
    : entry);
  assert.throws(() => parsePackage(traversalEntries), /Unsafe package path/);
  assert.throws(() => parsePackage([
    { path: "manifest.json", text: JSON.stringify({ files: ["rules.json"] }) },
    { path: "rules.json", text: "{" }
  ]), /Invalid JSON in rules.json/);
});

test("package bundles export and reopen every manifest-listed document without metadata leakage", () => {
  const loaded = parsePackage(entries, "spielplatz_demo");
  loaded.resources.resources[1]["x-authoring"]["review-note"] = "Preserve this on export.";
  loaded.documents["resources.json"] = loaded.resources;

  const bundle = createPackageBundle(loaded);
  const reopened = parsePackageBundle(bundle, "reopened_bundle");

  assert.equal(reopened.packageName, "reopened_bundle");
  assert.deepEqual(reopened.manifest, loaded.manifest);
  assert.deepEqual(Object.keys(reopened.documents).sort(), [...manifest.files].sort());
  assert.equal(
    reopened.resources.resources[1]["x-authoring"]["review-note"],
    "Preserve this on export."
  );
  assert.equal(Object.hasOwn(reopened.documents, "_meta"), false);
  assert.equal(Object.hasOwn(reopened.documents, "manifest.json"), false);
});

test("bundle import rejects missing, unsafe, and malformed content atomically", () => {
  const bundle = createPackageBundle(parsePackage(entries, "spielplatz_demo"));
  const missingFile = structuredClone(bundle);
  delete missingFile["combat.json"];
  assert.throws(() => parsePackageBundle(missingFile), /Package bundle is missing manifest file: combat.json/);

  const unsafeBundle = structuredClone(bundle);
  unsafeBundle["manifest.json"].files[0] = "../outside.json";
  assert.throws(() => parsePackageBundle(unsafeBundle), /Unsafe package path/);

  const malformedBundle = structuredClone(bundle);
  malformedBundle["resources.json"] = "{";
  assert.throws(() => parsePackageBundle(malformedBundle), /Package file must contain an object: resources.json/);
});

test("package export refuses a manifest file that is absent from loaded documents", () => {
  const loaded = parsePackage(entries, "spielplatz_demo");
  delete loaded.documents["combat.json"];
  assert.throws(() => createPackageBundle(loaded), /Export failed: manifest file is not loaded: combat.json/);
});
