const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const workbenchRoot = path.resolve(__dirname, "..");
const fixtureRoot = path.join(workbenchRoot, "fixtures", "spielplatz_demo");
const runtime = {};
for (const script of ["schema.js", "validator.js", "graph.js"]) {
  vm.runInNewContext(fs.readFileSync(path.join(workbenchRoot, "web/js", script), "utf8"), runtime);
}
const loaderRuntime = {};
vm.runInNewContext(fs.readFileSync(path.join(workbenchRoot, "web/js/package_loader.js"), "utf8"), loaderRuntime);
const manifest = JSON.parse(fs.readFileSync(path.join(fixtureRoot, "manifest.json"), "utf8"));
const entries = [
  { path: "manifest.json", text: JSON.stringify(manifest) },
  ...manifest.files.map(filePath => ({
    path: filePath,
    text: fs.readFileSync(path.join(fixtureRoot, filePath), "utf8")
  }))
];
const fixturePackage = loaderRuntime.ContentPackage.parsePackage(entries, "spielplatz_demo");

function validate(pkg) {
  runtime.pkg = pkg;
  return JSON.parse(vm.runInContext("JSON.stringify(validatePackage(pkg))", runtime));
}

function buildGraph(pkg) {
  runtime.pkg = pkg;
  return JSON.parse(vm.runInContext("JSON.stringify(buildDependencyGraph(pkg))", runtime));
}

test("the workbench validator accepts the complete F1 package", () => {
  const result = validate(fixturePackage);
  assert.equal(result.ok, true, result.messages.filter(message => message.level === "error").map(message => message.text).join("\n"));
  assert.ok(result.messages.some(message => message.text.includes("Structural and cross-domain validation passed")));
});

test("the workbench validator reports dangling references by source domain", () => {
  const broken = structuredClone(fixturePackage);
  broken.locations.locations[0].producerIds.push("missing_producer");
  broken.resources.producers[0].outputs.missing_resource = 1;
  broken.combat.encounters[0].enemyId = "missing_enemy";
  broken.stories.story_spielplatz.story.nodes[0].transitions[0].to = "missing_story_node";
  broken.assets.assets[0].id = "renamed_background";
  delete broken.locales.en.strings["story_spielplatz.title"];

  const result = validate(broken);
  assert.equal(result.ok, false);
  for (const expected of [
    'unknown producer "missing_producer"',
    'unknown resource "missing_resource"',
    'unknown enemy "missing_enemy"',
    'unknown story node "missing_story_node"',
    'unknown asset "location_spielplatz_background"',
    'missing text key "story_spielplatz.title"'
  ]) {
    assert.ok(result.messages.some(message => message.level === "error" && message.text.includes(expected)), expected);
  }
});

test("the workbench validator detects duplicate authored IDs and dialogue targets", () => {
  const broken = structuredClone(fixturePackage);
  const dialogue = broken.npcs.juan.conversations[0];
  dialogue.nodes.push(structuredClone(dialogue.nodes[0]));
  dialogue.nodes[0].choices[0].to = "missing_dialogue_node";

  const result = validate(broken);
  assert.equal(result.ok, false);
  assert.ok(result.messages.some(message => message.text.includes("duplicate id \"wish\"")));
  assert.ok(result.messages.some(message => message.text.includes('unknown dialogue node "missing_dialogue_node"')));
});

test("the dependency graph models cross-domain content with stable source paths", () => {
  const graph = buildGraph(fixturePackage);
  const nodeIds = new Set(graph.nodes.map(node => node.id));
  const edgeKeys = new Set(graph.edges.map(edge => `${edge.from}|${edge.type}|${edge.to}`));

  for (const id of [
    "location:lichtwald_spielplatz",
    "resource:holz",
    "producer:gather_holz",
    "recipe:make_lichttropfen",
    "enemy:knotted_shadow",
    "encounter:playground_shadow",
    "story:story_spielplatz",
    "storyNode:story_spielplatz/opening",
    "npc:juan",
    "conversation:juan_playground",
    "asset:location_spielplatz_background",
    "locale:en:story_spielplatz.title"
  ]) assert.ok(nodeIds.has(id), `missing graph node ${id}`);

  for (const edge of [
    "producer:gather_holz|located-at|location:lichtwald_spielplatz",
    "producer:gather_holz|produces|resource:holz",
    "resource:holz|consumed-by|recipe:make_lichttropfen",
    "encounter:playground_shadow|uses-enemy|enemy:knotted_shadow",
    "storyNode:story_spielplatz/talk_to_juan|starts-conversation|conversation:juan_playground",
    "conversation:juan_playground|belongs-to|npc:juan",
    "resource:lichttropfen|required-by|storyChoice:story_spielplatz/repair_choice/build_path",
    "rule:unlock_playground_options|unlocks|encounter:playground_shadow"
  ]) assert.ok(edgeKeys.has(edge), `missing graph edge ${edge}`);

  assert.ok(graph.edges.every(edge => typeof edge.source === "string" && edge.source.length > 0));
  assert.deepEqual(buildGraph(fixturePackage), graph, "graph ordering should be deterministic");
});
