const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const mergeContext = {};
vm.runInNewContext(
  fs.readFileSync(path.join(__dirname, "../web/js/merge.js"), "utf8"),
  mergeContext
);
const { mergePackageDocuments, diffDocuments } = mergeContext.ContentMerge;

function packageDocs(resourceAmount = 0, conversationCaption = "Hello") {
  return {
    "resources.json": {
      resources: [
        { id: "wood", initialAmount: resourceAmount, bounds: { min: 0 } },
        { id: "light", initialAmount: 0, bounds: { min: 0 } }
      ],
      producers: [],
      recipes: [{ id: "convert", inputs: { wood: 1 }, outputs: { light: 1 } }]
    },
    "npcs/juan.json": {
      npcs: [{ id: "juan" }],
      conversations: [{
        id: "juan_talk",
        nodes: [{ id: "start", text: conversationCaption, choices: [] }]
      }]
    },
    "locations.json": {
      locations: [{ id: "playground", producerIds: ["wood_gathering"] }]
    },
    "rules.json": {
      rules: [{ id: "wood_rule", trigger: { event: "resource.changed", resourceId: "wood" }, effects: [] }]
    }
  };
}

test("co-edit merge combines changes to independent entities and reports semantic paths", () => {
  const base = packageDocs();
  const local = structuredClone(base);
  const incoming = structuredClone(base);
  local["npcs/juan.json"].conversations[0].nodes[0].text = "A child-edited greeting";
  incoming["resources.json"].resources[0].initialAmount = 2;

  const result = mergePackageDocuments(base, local, incoming);
  assert.equal(result.conflicts.length, 0);
  assert.equal(result.documents["npcs/juan.json"].conversations[0].nodes[0].text, "A child-edited greeting");
  assert.equal(result.documents["resources.json"].resources[0].initialAmount, 2);
  assert.deepEqual(JSON.parse(JSON.stringify(result.localChanges)), [
    "npcs/juan.json.conversations[id=juan_talk].nodes[id=start].text"
  ]);
  assert.deepEqual(JSON.parse(JSON.stringify(result.incomingChanges)), [
    "resources.json.resources[id=wood].initialAmount"
  ]);
  assert.deepEqual(
    JSON.parse(JSON.stringify(diffDocuments(base, incoming))),
    JSON.parse(JSON.stringify(result.incomingChanges))
  );
});

test("co-edit merge makes divergent same-field edits explicit and blocks application", () => {
  const base = packageDocs();
  const local = structuredClone(base);
  const incoming = structuredClone(base);
  local["resources.json"].resources[0].initialAmount = 1;
  incoming["resources.json"].resources[0].initialAmount = 3;

  const result = mergePackageDocuments(base, local, incoming);
  assert.equal(result.documents, null);
  assert.equal(result.conflicts.length, 1);
  assert.match(result.conflicts[0].path, /resources\[id=wood\]\.initialAmount/);
  assert.equal(result.conflicts[0].local, "1");
  assert.equal(result.conflicts[0].incoming, "3");
});

test("co-edit merge blocks possible ID renames and lists known references", () => {
  const base = packageDocs();
  const local = structuredClone(base);
  const incoming = structuredClone(base);
  local["resources.json"].resources[0].id = "timber";

  const result = mergePackageDocuments(base, local, incoming);
  assert.equal(result.documents, null);
  const rename = result.conflicts.find(conflict => conflict.fromId === "wood");
  assert.ok(rename);
  assert.deepEqual(JSON.parse(JSON.stringify(rename.toIds)), ["timber"]);
  assert.ok(rename.references.includes("base/resources.json.recipes[0].inputs.wood"));
  assert.ok(rename.references.includes("incoming/rules.json.rules[0].trigger.resourceId"));
});

test("co-edit merge also blocks a stable story ID change inside a document", () => {
  const base = {
    "stories/first.json": {
      story: { id: "first", nodes: [{ id: "start" }] }
    },
    "rules.json": {
      rules: [{ id: "unlock_first", trigger: { storyId: "first" } }]
    }
  };
  const local = structuredClone(base);
  const incoming = structuredClone(base);
  incoming["stories/first.json"].story.id = "renamed";

  const result = mergePackageDocuments(base, local, incoming);
  assert.equal(result.documents, null);
  const rename = result.conflicts.find(conflict => conflict.path.endsWith(".story.id"));
  assert.ok(rename);
  assert.equal(rename.fromId, "first");
  assert.ok(rename.references.includes("base/rules.json.rules[0].trigger.storyId"));
});

test("co-edit merge blocks package file-list changes for manual reconciliation", () => {
  const base = packageDocs();
  const local = structuredClone(base);
  const incoming = { ...structuredClone(base), "stories/new.json": { story: { id: "new" } } };

  const result = mergePackageDocuments(base, local, incoming);
  assert.equal(result.documents, null);
  assert.equal(result.conflicts[0].path, "manifest.files");
});
