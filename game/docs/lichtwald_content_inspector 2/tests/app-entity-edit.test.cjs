const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const workbenchRoot = path.resolve(__dirname, "..");
const fixtureRoot = path.join(workbenchRoot, "fixtures", "spielplatz_demo");
const appSource = fs.readFileSync(path.join(workbenchRoot, "web/js/app.js"), "utf8");
const loaderContext = {};
vm.runInNewContext(
  fs.readFileSync(path.join(workbenchRoot, "web/js/package_loader.js"), "utf8"),
  loaderContext
);
const { parsePackage, fingerprintPackage } = loaderContext.ContentPackage;

function createWorkbench() {
  const elements = new Map();
  const windowObject = { confirm: () => true };
  const createElement = () => ({
    children: [],
    classList: { toggle() {}, add() {}, remove() {} },
    style: {},
    appendChild(child) { this.children.push(child); },
    replaceChildren(...children) { this.children = children; },
    addEventListener() {},
    setAttribute() {}
  });
  const document = {
    addEventListener() {},
    querySelector(selector) {
      if (!elements.has(selector)) elements.set(selector, createElement());
      return elements.get(selector);
    },
    createElement,
    querySelectorAll() {
      return [];
    }
  };
  const context = vm.createContext({ document, window: windowObject });
  vm.runInContext(fs.readFileSync(path.join(workbenchRoot, "web/js/package_loader.js"), "utf8"), context);
  vm.runInContext(fs.readFileSync(path.join(workbenchRoot, "web/js/schema.js"), "utf8"), context);
  vm.runInContext(fs.readFileSync(path.join(workbenchRoot, "web/js/validator.js"), "utf8"), context);
  vm.runInContext(fs.readFileSync(path.join(workbenchRoot, "web/js/merge.js"), "utf8"), context);
  vm.runInContext(appSource, context);
  vm.runInContext(`
    renderEntityList = () => {};
    renderInspector = () => {};
    refreshRawJson = () => {};
    markDirty = (flag = true) => { state.dirty = flag; };
  `, context);

  const manifest = JSON.parse(fs.readFileSync(path.join(fixtureRoot, "manifest.json"), "utf8"));
  const entries = manifest.files.map(filePath => ({
    path: filePath,
    text: fs.readFileSync(path.join(fixtureRoot, filePath), "utf8")
  }));
  const loaded = parsePackage([
    { path: "manifest.json", text: JSON.stringify(manifest) },
    ...entries
  ], "spielplatz_demo");
  context.loaded = loaded;
  vm.runInContext(`
    Object.assign(state, loaded, {
      manifest: loaded.manifest,
      documents: loaded.documents,
      entityFiles: loaded.entityFiles,
      currentType: "",
      currentId: null,
      dirty: false,
      packageName: loaded.packageName,
      baseManifest: JSON.parse(JSON.stringify(loaded.manifest)),
      baseDocuments: JSON.parse(JSON.stringify(loaded.documents)),
      baseFingerprint: ContentPackage.fingerprintPackage(loaded.manifest, loaded.documents)
    });
  `, context);
  return { context, elements, loaded, windowObject };
}

function applyEditedEntity(context, type, id, edit) {
  context.entityType = type;
  context.entityId = id;
  const raw = vm.runInContext(`
    state.currentType = entityType;
    state.currentId = entityId;
    JSON.stringify(getCurrentData());
  `, context);
  const edited = JSON.parse(raw);
  edit(edited);
  context.rawJson = JSON.stringify(edited);
  vm.runInContext(`
    el.rawJson.value = rawJson;
    applyRawJson();
  `, context);
}

function createEntity(context, type, id) {
  context.entityType = type;
  context.newEntityId = id;
  vm.runInContext(`
    state.currentType = entityType;
    prompt = () => newEntityId;
    alert = () => {};
    onNewEntity();
  `, context);
}

function reopenPackage(loaded) {
  return parsePackage([
    { path: "manifest.json", text: JSON.stringify(loaded.manifest) },
    ...loaded.manifest.files.map(filePath => ({
      path: filePath,
      text: JSON.stringify(loaded.documents[filePath])
    }))
  ], "spielplatz_demo");
}

function memoryDirectory(name) {
  const directories = new Map();
  const files = new Map();
  return {
    name,
    directories,
    files,
    async getDirectoryHandle(childName, options = {}) {
      if (directories.has(childName)) return directories.get(childName);
      if (!options.create) {
        const error = new Error(`Directory not found: ${childName}`);
        error.name = "NotFoundError";
        throw error;
      }
      const directory = memoryDirectory(childName);
      directories.set(childName, directory);
      return directory;
    },
    async getFileHandle(fileName, options = {}) {
      if (!files.has(fileName) && !options.create) {
        const error = new Error(`File not found: ${fileName}`);
        error.name = "NotFoundError";
        throw error;
      }
      return {
        async createWritable() {
          let text = "";
          return {
            async write(value) { text = value; },
            async close() { files.set(fileName, text); }
          };
        }
      };
    }
  };
}

const edits = [
  {
    name: "location",
    type: "locations",
    id: "lichtwald_spielplatz",
    edit: entity => { entity.nameKey = "location.playground.name"; },
    verify: loaded => assert.equal(loaded.documents["locations.json"].locations[0].nameKey, "location.playground.name")
  },
  {
    name: "combat enemy",
    type: "combat",
    id: "enemy:knotted_shadow",
    edit: entity => { entity.alignment = "evil-and-afraid"; },
    verify: loaded => assert.equal(loaded.documents["combat.json"].enemies[0].alignment, "evil-and-afraid")
  },
  {
    name: "combat encounter",
    type: "combat",
    id: "encounter:playground_shadow",
    edit: entity => { entity.victoryTextKey = "encounter.playground_shadow.won"; },
    verify: loaded => assert.equal(loaded.documents["combat.json"].encounters[0].victoryTextKey, "encounter.playground_shadow.won")
  },
  {
    name: "asset",
    type: "assets",
    id: "location_spielplatz_background",
    edit: entity => { entity.artBrief = "Updated art direction"; },
    verify: loaded => assert.equal(loaded.documents["assets.json"].assets[0].artBrief, "Updated art direction")
  },
  {
    name: "locale string",
    type: "locales",
    id: "en:story_spielplatz.title",
    edit: entity => { entity.value = "The New Playground Story"; },
    verify: loaded => assert.equal(loaded.documents["locales/en.json"].strings["story_spielplatz.title"], "The New Playground Story")
  },
  {
    name: "recipe",
    type: "resources",
    id: "recipe:make_lichttropfen",
    edit: entity => { entity.outputs.lichttropfen = 2; },
    verify: loaded => assert.equal(loaded.documents["resources.json"].recipes[0].outputs.lichttropfen, 2)
  },
  {
    name: "NPC conversation",
    type: "npcs",
    id: "conversation:juan_playground",
    edit: entity => { entity.nodes[0].textKey = "conversation.juan_playground.opening.text"; },
    verify: loaded => assert.equal(loaded.documents["npcs/juan.json"].conversations[0].nodes[0].textKey, "conversation.juan_playground.opening.text")
  }
];

for (const scenario of edits) {
  test(`raw JSON edits write back to the original ${scenario.name} document`, () => {
    const { context, elements, loaded } = createWorkbench();
    applyEditedEntity(context, scenario.type, scenario.id, scenario.edit);
    scenario.verify(loaded);
    assert.equal(elements.get("#raw-status").textContent, "Applied ✓");
    assert.equal(loaded.manifest.files.includes(scenario.type === "locales" ? "locales/en.json" : scenario.type === "npcs" ? "npcs/juan.json" : scenario.type === "resources" ? "resources.json" : scenario.type === "assets" ? "assets.json" : scenario.type === "combat" ? "combat.json" : "locations.json"), true);
  });
}

test("raw JSON edits cannot change an entity's stable ID", () => {
  const { context, loaded, elements } = createWorkbench();
  context.entityType = "combat";
  context.entityId = "enemy:knotted_shadow";
  vm.runInContext(`
    state.currentType = entityType;
    state.currentId = entityId;
    const edited = JSON.parse(JSON.stringify(getCurrentData()));
    edited.id = "renamed_shadow";
    el.rawJson.value = JSON.stringify(edited);
    applyRawJson();
  `, context);

  assert.equal(loaded.documents["combat.json"].enemies[0].id, "knotted_shadow");
  assert.match(elements.get("#raw-status").textContent, /Stable entity IDs cannot be changed/);
});

for (const scenario of [
  {
    name: "story",
    type: "stories",
    id: "smoke_test_story",
    verify(reopened) {
      assert.equal(reopened.stories.smoke_test_story.story.id, "smoke_test_story");
    },
    newFile: "stories/smoke_test_story.json"
  },
  {
    name: "NPC",
    type: "npcs",
    id: "smoke_test_npc",
    verify(reopened) {
      assert.ok(reopened.npcs.juan.npcs.some(npc => npc.id === "smoke_test_npc"));
    },
    newFile: null
  },
  {
    name: "resource",
    type: "resources",
    id: "smoke_test_resource",
    verify(reopened) {
      assert.ok(reopened.resources.resources.some(resource => resource.id === "smoke_test_resource"));
    },
    newFile: null
  },
  {
    name: "rule",
    type: "rules",
    id: "smoke_test_rule",
    verify(reopened) {
      assert.ok(reopened.rules.rules.some(rule => rule.id === "smoke_test_rule"));
    },
    newFile: null
  }
]) {
  test(`creating a ${scenario.name} updates the manifest-backed package and survives reopen`, () => {
    const { context, loaded } = createWorkbench();
    createEntity(context, scenario.type, scenario.id);
    const reopened = reopenPackage(loaded);
    scenario.verify(reopened);
    assert.equal(vm.runInContext("state.dirty", context), true);
    if (scenario.newFile) assert.ok(loaded.manifest.files.includes(scenario.newFile));
  });
}

for (const scenario of [
  { type: "stories", id: "template_story" },
  { type: "npcs", id: "template_npc" },
  { type: "resources", id: "template_resource" }
]) {
  test(`creating a ${scenario.type} entity registers template text keys and assets so the package stays valid`, () => {
    const { context, loaded } = createWorkbench();
    createEntity(context, scenario.type, scenario.id);
    const result = vm.runInContext("validatePackage(state)", context);
    assert.equal(result.ok, true, result.messages.filter(m => m.level === "error").map(m => m.text).join("; "));
    const deStrings = loaded.documents["locales/de.json"].strings;
    const enStrings = loaded.documents["locales/en.json"].strings;
    const expectedKey = {
      stories: `story.${scenario.id}.title`,
      npcs: `npc.${scenario.id}.name`,
      resources: `resource.${scenario.id}.name`
    }[scenario.type];
    assert.ok(Object.hasOwn(deStrings, expectedKey), "de locale must contain the template string");
    assert.ok(Object.hasOwn(enStrings, expectedKey), "en locale must contain the template string");
    const expectedAsset = {
      stories: `story_${scenario.id}_start`,
      npcs: `npc_${scenario.id}_portrait`,
      resources: `resource_${scenario.id}`
    }[scenario.type];
    assert.ok(
      loaded.documents["assets.json"].assets.some(asset => asset.id === expectedAsset),
      "assets.json must contain the placeholder asset"
    );
  });
}

test("new IDs that cannot be represented as package file names are rejected", () => {
  const { context, loaded } = createWorkbench();
  createEntity(context, "stories", "../unsafe");
  assert.equal(loaded.manifest.files.length, 9);
  assert.equal(Object.hasOwn(loaded.stories, "../unsafe"), false);
});

test("folder export writes all package files into a unique directory without overwriting", async () => {
  const { context, elements, windowObject } = createWorkbench();
  const parent = memoryDirectory("exports");
  const baseDirectoryName = "lichtwald-2026-01-02T03-04-05-000Z";
  parent.directories.set(baseDirectoryName, memoryDirectory(baseDirectoryName));
  windowObject.showDirectoryPicker = async () => parent;
  context.Date = class extends Date {
    constructor(...args) {
      super(...(args.length ? args : ["2026-01-02T03:04:05.000Z"]));
    }
  };

  await vm.runInContext("exportPackageFolder()", context);

  const output = parent.directories.get(`${baseDirectoryName}-1`);
  assert.ok(output, "an existing package directory should not be overwritten");
  assert.deepEqual([...output.files.keys()].sort(), ["assets.json", "combat.json", "locations.json", "manifest.json", "resources.json", "rules.json"]);
  const stories = output.directories.get("stories");
  const npcs = output.directories.get("npcs");
  const locales = output.directories.get("locales");
  assert.equal(JSON.parse(stories.files.get("story_spielplatz.json")).story.id, "story_spielplatz");
  assert.equal(JSON.parse(npcs.files.get("juan.json")).npcs[0].id, "juan");
  assert.deepEqual([...locales.files.keys()].sort(), ["de.json", "en.json"]);
  assert.match(elements.get("#status").textContent, /Exported validated package/);
});

test("folder export is blocked for invalid package references and keeps edits dirty", async () => {
  const { context, elements, windowObject } = createWorkbench();
  let pickerCalls = 0;
  windowObject.showDirectoryPicker = async () => {
    pickerCalls++;
    return memoryDirectory("exports");
  };
  vm.runInContext(`
    state.dirty = true;
    state.locations.locations[0].backgroundAssetId = "missing_art";
  `, context);

  await vm.runInContext("exportPackageFolder()", context);

  assert.equal(pickerCalls, 0);
  assert.equal(vm.runInContext("state.dirty", context), true);
  assert.match(elements.get("#status").textContent, /Export blocked: package validation failed/);
});

test("bundle import replaces the active package only after the bundle is fully parsed", async () => {
  const { context, elements, loaded } = createWorkbench();
  const bundle = vm.runInContext("ContentPackage.createPackageBundle(loaded)", context);
  bundle["locations.json"].locations[0].nameKey = "location.imported.name";
  bundle._meta.packageFingerprint = fingerprintPackage(
    bundle["manifest.json"],
    Object.fromEntries(bundle["manifest.json"].files.map(filePath => [filePath, bundle[filePath]]))
  );
  context.bundleText = JSON.stringify(bundle);

  await vm.runInContext(`
    onBundleSelected({
      target: {
        files: [{ name: "imported-package.json", text: async () => bundleText }],
        value: "selected"
      }
    })
  `, context);

  assert.equal(vm.runInContext("state.packageName", context), "imported-package");
  assert.equal(vm.runInContext("state.locations.locations[0].nameKey", context), "location.imported.name");
  assert.equal(vm.runInContext("state.dirty", context), false);
  assert.match(elements.get("#status").textContent, /Loaded "imported-package"/);

  const invalid = structuredClone(bundle);
  delete invalid["assets.json"];
  context.bundleText = JSON.stringify(invalid);
  await vm.runInContext(`
    onBundleSelected({
      target: {
        files: [{ name: "broken-package.json", text: async () => bundleText }],
        value: "selected"
      }
    })
  `, context);

  assert.equal(vm.runInContext("state.packageName", context), "imported-package");
  assert.equal(vm.runInContext("state.locations.locations[0].nameKey", context), "location.imported.name");
  assert.match(elements.get("#status").textContent, /Package bundle import failed: Package bundle is missing manifest file: assets.json/);
  assert.equal(loaded.manifest.files.length, 9);
});

test("story preview conditions reflect editable sample resources without changing package state", () => {
  const { context } = createWorkbench();
  vm.runInContext(`
    state.previewStoryId = "story_spielplatz";
    state.previewNodeId = "repair_choice";
    state.previewResources = { holz: 0, lichttropfen: 0 };
    state.previewVisited = new Set(["opening", "repair_choice"]);
  `, context);

  const condition = {
    all: [
      { path: "resources.lichttropfen", op: "gte", value: 1 },
      { path: "story.visited.opening", op: "eq", value: true }
    ]
  };
  context.previewCondition = condition;
  const locked = JSON.parse(vm.runInContext("JSON.stringify(evaluatePreviewCondition(previewCondition))", context));
  const explanation = vm.runInContext("describePreviewCondition(previewCondition)", context);
  assert.deepEqual(locked, { known: true, available: false   });

  assert.match(explanation, /current 0/);
  assert.match(explanation, /story\.visited\.opening = true/);

  vm.runInContext("state.previewResources.lichttropfen = 1", context);
  const available = JSON.parse(vm.runInContext("JSON.stringify(evaluatePreviewCondition(previewCondition))", context));
  assert.deepEqual(available, { known: true, available: true });
  assert.equal(loadedResourceAmount(context), 0, "preview amounts must not mutate package definitions");
});

test("domain table exposes every fixture entity and selects the matching inspector record", () => {
  const { context, elements } = createWorkbench();
  const counts = JSON.parse(vm.runInContext(`
    JSON.stringify(Object.fromEntries(
      ["stories", "locations", "resources", "npcs", "combat", "rules", "assets", "locales"]
        .map(type => [type, getEntityItems(type).length])
    ))
  `, context));

  assert.deepEqual(counts, {
    stories: 1,
    locations: 1,
    resources: 4,
    npcs: 2,
    combat: 2,
    rules: 2,
    assets: 13,
    locales: 46
  });

  vm.runInContext(`
    state.currentType = "locales";
    state.currentId = getEntityItems("locales")[0].id;
    renderEntityTable();
  `, context);

  const table = elements.get("#entity-table").children[0];
  assert.equal(table.className, "entity-table");
  assert.ok(table.children[0].children[0].children.some(cell => cell.textContent === "locale"));
  assert.ok(table.children[0].children[0].children.some(cell => cell.textContent === "value"));
  assert.equal(table.children[1].children.length, 46);
  assert.equal(table.children[1].children[0].className, "selected");
});

test("event rule matrix explains fixture triggers and effects and filters by content", () => {
  const { context, elements } = createWorkbench();
  vm.runInContext("renderEventRules()", context);

  let table = elements.get("#event-rules-table").children[0];
  assert.equal(table.children[1].children.length, 2);
  const firstRule = table.children[1].children[0].children.map(cell => cell.textContent);
  assert.equal(firstRule[0], "unlock_playground_options");
  assert.match(firstRule[1], /resource\.totalAtLeast/);
  assert.match(firstRule[1], /resourceId=holz/);
  assert.match(firstRule[2], /Always/);
  assert.match(firstRule[3], /Unlock recipe make_lichttropfen/);
  assert.match(firstRule[3], /Set flag encounter_playground_shadow_unlocked to true/);

  vm.runInContext(`
    el.eventRuleSearch.value = "juan";
    renderEventRules();
  `, context);
  table = elements.get("#event-rules-table").children[0];
  assert.equal(table.children[1].children.length, 1);
  assert.equal(table.children[1].children[0].children[0].textContent, "juan_listened");
});

test("co-edit review validates and prepares independent branch changes", () => {
  const { context, elements } = createWorkbench();
  context.localCaption = "A human-edited greeting";
  context.remoteAmount = 2;
  vm.runInContext(`
    state.documents["locales/de.json"].strings["conversation.juan_playground.wish.text"] = localCaption;
    const remoteDocuments = JSON.parse(JSON.stringify(state.baseDocuments));
    remoteDocuments["resources.json"].resources[0].initialAmount = remoteAmount;
    const incoming = ContentPackage.parsePackageBundle(
      ContentPackage.createPackageBundle({
        manifest: state.baseManifest,
        documents: remoteDocuments,
        baseFingerprint: state.baseFingerprint
      }),
      "incoming"
    );
    prepareCoeditMerge(incoming);
  `, context);

  assert.equal(vm.runInContext("state.pendingMerge !== null", context), true);
  assert.equal(elements.get("#btn-apply-merge").disabled, false);
  const merged = JSON.parse(vm.runInContext("JSON.stringify(state.pendingMerge.documents)", context));
  assert.equal(merged["locales/de.json"].strings["conversation.juan_playground.wish.text"], "A human-edited greeting");
  assert.equal(merged["resources.json"].resources[0].initialAmount, 2);
});

test("co-edit review blocks same-field conflicts and stale branch lineage", () => {
  const { context, elements } = createWorkbench();
  context.remoteAmount = 3;
  vm.runInContext(`
    state.documents["resources.json"].resources[0].initialAmount = 1;
    const remoteDocuments = JSON.parse(JSON.stringify(state.baseDocuments));
    remoteDocuments["resources.json"].resources[0].initialAmount = remoteAmount;
    const incoming = ContentPackage.parsePackageBundle(
      ContentPackage.createPackageBundle({
        manifest: state.baseManifest,
        documents: remoteDocuments,
        baseFingerprint: state.baseFingerprint
      }),
      "incoming"
    );
    prepareCoeditMerge(incoming);
  `, context);
  assert.equal(vm.runInContext("state.pendingMerge === null", context), true);
  assert.equal(elements.get("#btn-apply-merge").disabled, true);

  assert.throws(() => vm.runInContext(`
    prepareCoeditMerge({
      manifest: state.manifest,
      documents: state.baseDocuments,
      bundleMeta: { sourceFingerprint: "stale-base" }
    })
  `, context), /same base package/);

  assert.throws(() => vm.runInContext(`
    prepareCoeditMerge({
      manifest: { ...state.manifest, description: "changed independently" },
      documents: state.baseDocuments,
      bundleMeta: { sourceFingerprint: state.baseFingerprint }
    })
  `, context), /Manifest metadata changed/);
});

function loadedResourceAmount(context) {
  return vm.runInContext("state.resources.resources.find(resource => resource.id === 'lichttropfen').initialAmount", context);
}
