const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const workbenchRoot = path.resolve(__dirname, "..");
const context = vm.createContext({});
vm.runInContext(fs.readFileSync(path.join(workbenchRoot, "web/js/schema.js"), "utf8"), context);
vm.runInContext(fs.readFileSync(path.join(workbenchRoot, "web/js/validator.js"), "utf8"), context);

// Canonical sets from PLAN_GODOT_REBUILD_V2.md PB-02b / PB-02c.
const CANONICAL_OPS = new Set(["eq", "ne", "gt", "gte", "lt", "lte", "exists", "not"]);
const CANONICAL_EFFECTS = new Set([
  "resource.add",
  "resource.spend",
  "relationship.adjust",
  "unlock",
  "flag.set",
  "event.record",
  "combat.request"
]);

test("ALLOWED_OPS matches the canonical PB-02b operator set (no neq)", () => {
  const ops = vm.runInContext("ALLOWED_OPS", context);
  assert.deepEqual([...ops].sort(), [...CANONICAL_OPS].sort());
  assert.ok(!ops.includes("neq"), "neq must not be part of the canonical vocabulary");
});

test("ALLOWED_EFFECTS matches the canonical PB-02c effect set", () => {
  const effects = vm.runInContext("ALLOWED_EFFECTS", context);
  assert.deepEqual([...effects].sort(), [...CANONICAL_EFFECTS].sort());
});

function buildPackageFor(type, id) {
  const entity = vm.runInContext(
    `createEmptyEntity(${JSON.stringify(type)}, ${JSON.stringify(id)}, "lichtwald")`,
    context
  );
  const requirements = vm.runInContext(
    `entityTemplateRequirements(${JSON.stringify(type)}, ${JSON.stringify(id)})`,
    context
  );
  const locales = {
    de: { schemaVersion: 1, packId: "lichtwald", locale: "de", strings: { ...requirements.strings } },
    en: { schemaVersion: 1, packId: "lichtwald", locale: "en", strings: { ...requirements.strings } }
  };
  const assets = {
    schemaVersion: 1,
    packId: "lichtwald",
    assets: structuredClone(requirements.assets)
  };
  const documents = {};
  const pkg = {
    manifest: { schemaVersion: 1, packId: "lichtwald", files: [] },
    documents,
    locales,
    assets,
    stories: {},
    npcs: {},
    resources: { resources: [] },
    rules: { rules: [] }
  };

  if (type === "stories") {
    const filePath = `stories/${id}.json`;
    documents[filePath] = entity;
    pkg.stories[id] = entity;
    pkg.entityFiles = { stories: { [id]: filePath } };
  } else if (type === "npcs") {
    const filePath = `npcs/${id}.json`;
    documents[filePath] = entity;
    pkg.npcs[id] = entity;
    pkg.entityFiles = { npcs: { [id]: filePath } };
  } else if (type === "resources") {
    documents["resources.json"] = { schemaVersion: 1, packId: "lichtwald", resources: [entity] };
    pkg.resources = documents["resources.json"];
  } else if (type === "rules") {
    // The template trigger references resource "lichttropfen"; register it so
    // the reference check passes in this minimal package.
    documents["resources.json"] = {
      schemaVersion: 1,
      packId: "lichtwald",
      resources: [
        {
          id: "lichttropfen",
          kind: "stock",
          nameKey: "resource.lichttropfen.name",
          initialAmount: 0,
          bounds: { min: 0 }
        }
      ]
    };
    documents["rules.json"] = { schemaVersion: 1, packId: "lichtwald", rules: [entity] };
    pkg.resources = documents["resources.json"];
    pkg.rules = documents["rules.json"];
    locales.de.strings["resource.lichttropfen.name"] = "Lichttropfen";
    locales.en.strings["resource.lichttropfen.name"] = "Light Drop";
  }

  pkg.manifest.files = Object.keys(documents).concat("locales/de.json", "locales/en.json", "assets.json");
  return { pkg, entity };
}

for (const [type, id] of [
  ["stories", "new_story"],
  ["resources", "new_resource"],
  ["npcs", "new_npc"],
  ["rules", "new_rule"]
]) {
  test(`createEmptyEntity(${type}) uses text keys + asset refs and validates`, () => {
    const { pkg, entity } = buildPackageFor(type, id);
    const serialized = JSON.stringify(entity);
    assert.ok(!serialized.includes('"de"') && !serialized.includes('"en"'), "templates must not embed inline locale objects");
    context.pkg = pkg;
    const result = vm.runInContext("validatePackage(pkg)", context);
    assert.equal(result.ok, true, `validation errors: ${result.messages.filter(m => m.level === "error").map(m => m.text).join("; ")}`);
  });
}
