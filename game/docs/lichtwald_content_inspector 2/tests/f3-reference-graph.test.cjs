const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { test } = require("node:test");

const fixtureRoot = path.resolve(__dirname, "../fixtures/spielplatz_demo");
const manifest = JSON.parse(fs.readFileSync(path.join(fixtureRoot, "manifest.json"), "utf8"));
const pkg = Object.fromEntries(
  manifest.files.map((file) => [file, JSON.parse(fs.readFileSync(path.join(fixtureRoot, file), "utf8"))])
);

const story = pkg["stories/story_spielplatz.json"].story;
const npcFile = pkg["npcs/juan.json"];

function index(input = pkg) {
  const activeStory = input["stories/story_spielplatz.json"]?.story || {};
  const activeNpcFile = input["npcs/juan.json"] || {};
  return {
    locations: new Set((input["locations.json"]?.locations || []).map((record) => record.id)),
    resources: new Set((input["resources.json"]?.resources || []).map((record) => record.id)),
    producers: new Set((input["resources.json"]?.producers || []).map((record) => record.id)),
    recipes: new Set((input["resources.json"]?.recipes || []).map((record) => record.id)),
    rules: new Set((input["rules.json"]?.rules || []).map((record) => record.id)),
    enemies: new Set((input["combat.json"]?.enemies || []).map((record) => record.id)),
    encounters: new Set((input["combat.json"]?.encounters || []).map((record) => record.id)),
    assets: new Set((input["assets.json"]?.assets || []).map((record) => record.id)),
    npcs: new Set((activeNpcFile.npcs || []).map((record) => record.id)),
    conversations: new Set((activeNpcFile.conversations || []).map((record) => record.id)),
    storyNodes: new Set((activeStory.nodes || []).map((record) => record.id))
  };
}

function validateReferences(input = pkg) {
  const errors = [];
  const catalog = index(input);
  const entityRecords = [
    ["locations.json.locations", input["locations.json"]?.locations || []],
    ["resources.json.resources", input["resources.json"]?.resources || []],
    ["resources.json.producers", input["resources.json"]?.producers || []],
    ["resources.json.recipes", input["resources.json"]?.recipes || []],
    ["rules.json.rules", input["rules.json"]?.rules || []],
    ["combat.json.enemies", input["combat.json"]?.enemies || []],
    ["combat.json.encounters", input["combat.json"]?.encounters || []],
    ["assets.json.assets", input["assets.json"]?.assets || []],
    ["stories/story_spielplatz.json.story", input["stories/story_spielplatz.json"]?.story ? [input["stories/story_spielplatz.json"].story] : []],
    ["npcs/juan.json.npcs", input["npcs/juan.json"]?.npcs || []],
    ["npcs/juan.json.conversations", input["npcs/juan.json"]?.conversations || []]
  ];
  const seenIds = new Map();
  for (const [collectionPath, records] of entityRecords) {
    records.forEach((record, position) => {
      if (seenIds.has(record.id)) {
        errors.push({
          source: `${collectionPath}[${position}].id`,
          reference: record.id,
          kind: "duplicateId"
        });
      } else {
        seenIds.set(record.id, `${collectionPath}[${position}].id`);
      }
    });
  }
  const check = (set, id, source, kind) => {
    if (!set.has(id)) errors.push({ source, reference: id, kind });
  };

  for (const [file, document] of Object.entries(input)) {
    const visit = (value, source) => {
      if (Array.isArray(value)) {
        value.forEach((item, position) => visit(item, `${source}[${position}]`));
      } else if (value && typeof value === "object") {
        for (const [key, nested] of Object.entries(value)) {
          if (key === "locationId") check(catalog.locations, nested, `${source}.${key}`, "location");
          if (key === "resourceId") check(catalog.resources, nested, `${source}.${key}`, "resource");
          if (key === "path" && typeof nested === "string" && nested.startsWith("resources.")) {
            check(catalog.resources, nested.slice("resources.".length), `${source}.${key}`, "resourcePath");
          }
          if (key === "producerId") check(catalog.producers, nested, `${source}.${key}`, "producer");
          if (key === "recipeId") check(catalog.recipes, nested, `${source}.${key}`, "recipe");
          if (key === "enemyId") check(catalog.enemies, nested, `${source}.${key}`, "enemy");
          if (key === "encounterId" || (key === "targetId" && value.targetType === "combatEncounter")) {
            check(catalog.encounters, nested, `${source}.${key}`, "encounter");
          }
          if (key === "characterId" || key === "npcId" || key === "speakerId") {
            check(catalog.npcs, nested, `${source}.${key}`, "npc");
          }
          if (key === "conversationId") check(catalog.conversations, nested, `${source}.${key}`, "conversation");
          if (key === "assetId" || /AssetId$/.test(key)) check(catalog.assets, nested, `${source}.${key}`, "asset");
          if (key.endsWith("Key") && typeof nested === "string") {
            for (const localeFile of manifest.files.filter((entry) => entry.startsWith("locales/"))) {
              const strings = input[localeFile]?.strings || {};
              if (!Object.hasOwn(strings, nested)) {
                errors.push({ source: `${source}.${key}`, reference: nested, kind: `text:${localeFile}` });
              }
            }
          }
          visit(nested, `${source}.${key}`);
        }
      }
    };
    visit(document, file);
  }

  const activeStory = input["stories/story_spielplatz.json"]?.story || {};
  check(catalog.storyNodes, activeStory.startNodeId, "stories/story_spielplatz.json.story.startNodeId", "storyNode");
  const storyNodeIds = new Set();
  for (const [position, node] of (activeStory.nodes || []).entries()) {
    if (storyNodeIds.has(node.id)) {
      errors.push({
        source: `stories/story_spielplatz.json.story.nodes[${position}].id`,
        reference: node.id,
        kind: "duplicateStoryNodeId"
      });
    } else {
      storyNodeIds.add(node.id);
    }
  }
  for (const node of activeStory.nodes || []) {
    for (const transition of node.transitions || []) {
      check(catalog.storyNodes, transition.to, `stories/story_spielplatz.json.story.nodes.${node.id}.transitions.${transition.id}`, "storyNode");
    }
    for (const choice of node.choices || []) {
      check(catalog.storyNodes, choice.to, `stories/story_spielplatz.json.story.nodes.${node.id}.choices.${choice.id}`, "storyNode");
    }
  }
  for (const conversation of input["npcs/juan.json"]?.conversations || []) {
    const nodeIds = new Set(conversation.nodes.map((node) => node.id));
    if (nodeIds.size !== conversation.nodes.length) {
      errors.push({
        source: `npcs/${conversation.id}.nodes`,
        reference: conversation.id,
        kind: "duplicateDialogueNodeId"
      });
    }
    check(nodeIds, conversation.startNodeId, `npcs/${conversation.id}.startNodeId`, "dialogueNode");
    for (const node of conversation.nodes) {
      for (const choice of node.choices || []) {
        check(nodeIds, choice.to, `npcs/${conversation.id}.nodes.${node.id}.choices.${choice.id}`, "dialogueNode");
      }
    }
  }
  for (const rule of (input["rules.json"]?.rules || [])) {
    if (rule.trigger.choiceId) {
      const conversation = (input["npcs/juan.json"]?.conversations || []).find((record) => record.id === rule.trigger.conversationId);
      const choices = new Set((conversation?.nodes || []).flatMap((node) => (node.choices || []).map((choice) => choice.id)));
      check(choices, rule.trigger.choiceId, `rules.json.rules.${rule.id}.trigger.choiceId`, "choice");
    }
    for (const effect of rule.effects || []) {
      if (effect.targetType === "recipe") check(catalog.recipes, effect.targetId, `rules.json.rules.${rule.id}.effects`, "recipe");
    }
  }
  for (const producer of input["resources.json"]?.producers || []) {
    for (const resourceId of [...Object.keys(producer.outputs || {}), ...Object.keys(producer.costs || {})]) {
      check(catalog.resources, resourceId, `resources.json.producers.${producer.id}`, "producerResource");
    }
  }
  for (const recipe of input["resources.json"]?.recipes || []) {
    for (const resourceId of [...Object.keys(recipe.inputs || {}), ...Object.keys(recipe.outputs || {})]) {
      check(catalog.resources, resourceId, `resources.json.recipes.${recipe.id}`, "recipeResource");
    }
  }
  return errors;
}

function buildGraph() {
  const edges = [];
  const edge = (from, type, to, source) => edges.push({ from, type, to, source });

  for (const producer of pkg["resources.json"].producers) {
    edge(`producer:${producer.id}`, "located-at", `location:${producer.locationId}`, `resources.json.producers.${producer.id}.locationId`);
    for (const resourceId of Object.keys(producer.outputs || {})) {
      edge(`producer:${producer.id}`, "produces", `resource:${resourceId}`, `resources.json.producers.${producer.id}.outputs.${resourceId}`);
    }
  }
  for (const recipe of pkg["resources.json"].recipes) {
    for (const resourceId of Object.keys(recipe.inputs || {})) {
      edge(`resource:${resourceId}`, "consumed-by", `recipe:${recipe.id}`, `resources.json.recipes.${recipe.id}.inputs.${resourceId}`);
    }
    for (const resourceId of Object.keys(recipe.outputs || {})) {
      edge(`recipe:${recipe.id}`, "produces", `resource:${resourceId}`, `resources.json.recipes.${recipe.id}.outputs.${resourceId}`);
    }
  }
  for (const node of story.nodes) {
    const source = `stories/story_spielplatz.json.story.nodes.${node.id}`;
    if (node.locationId) edge(`storyNode:${node.id}`, "at-location", `location:${node.locationId}`, `${source}.locationId`);
    if (node.conversationId) edge(`storyNode:${node.id}`, "starts-conversation", `conversation:${node.conversationId}`, `${source}.conversationId`);
    for (const transition of node.transitions || []) {
      edge(`storyNode:${node.id}`, "transitions-to", `storyNode:${transition.to}`, `${source}.transitions.${transition.id}.to`);
    }
    for (const choice of node.choices || []) {
      edge(`storyNode:${node.id}`, "choice-to", `storyNode:${choice.to}`, `${source}.choices.${choice.id}.to`);
      for (const condition of choice.when?.all || []) {
        if (condition.path?.startsWith("resources.")) {
          edge(`resource:${condition.path.slice("resources.".length)}`, "required-by", `storyChoice:${node.id}/${choice.id}`, `${source}.choices.${choice.id}.when`);
        }
      }
      for (const effect of choice.effects || []) {
        if (effect.resourceId) edge(`storyChoice:${node.id}/${choice.id}`, effect.op, `resource:${effect.resourceId}`, `${source}.choices.${choice.id}.effects`);
      }
    }
    if (node.illustration?.assetId) edge(`storyNode:${node.id}`, "illustrated-by", `asset:${node.illustration.assetId}`, `${source}.illustration.assetId`);
  }
  for (const conversation of npcFile.conversations) {
    edge(`conversation:${conversation.id}`, "belongs-to", `npc:${conversation.npcId}`, `npcs/juan.json.conversations.${conversation.id}.npcId`);
    for (const node of conversation.nodes) {
      const from = `dialogueNode:${conversation.id}/${node.id}`;
      edge(from, "spoken-by", `npc:${node.speakerId}`, `npcs/juan.json.conversations.${conversation.id}.nodes.${node.id}.speakerId`);
      if (node.illustrationAssetId) edge(from, "illustrated-by", `asset:${node.illustrationAssetId}`, `npcs/juan.json.conversations.${conversation.id}.nodes.${node.id}.illustrationAssetId`);
      for (const choice of node.choices || []) {
        edge(from, "choice-to", `dialogueNode:${conversation.id}/${choice.to}`, `npcs/juan.json.conversations.${conversation.id}.nodes.${node.id}.choices.${choice.id}.to`);
      }
    }
  }
  for (const rule of pkg["rules.json"].rules) {
    if (rule.trigger.resourceId) edge(`resource:${rule.trigger.resourceId}`, "triggers", `rule:${rule.id}`, `rules.json.rules.${rule.id}.trigger`);
    if (rule.trigger.conversationId) edge(`conversation:${rule.trigger.conversationId}`, "triggers", `rule:${rule.id}`, `rules.json.rules.${rule.id}.trigger`);
    for (const effect of rule.effects || []) {
      if (effect.targetType === "recipe") edge(`rule:${rule.id}`, "unlocks", `recipe:${effect.targetId}`, `rules.json.rules.${rule.id}.effects`);
      else if (effect.targetType === "combatEncounter") edge(`rule:${rule.id}`, "unlocks", `encounter:${effect.targetId}`, `rules.json.rules.${rule.id}.effects`);
      else if (effect.resourceId) edge(`rule:${rule.id}`, effect.op, `resource:${effect.resourceId}`, `rules.json.rules.${rule.id}.effects`);
      else if (effect.characterId) edge(`rule:${rule.id}`, effect.op, `npc:${effect.characterId}`, `rules.json.rules.${rule.id}.effects`);
    }
  }
  return edges.sort((a, b) =>
    `${a.from}|${a.type}|${a.to}|${a.source}`.localeCompare(`${b.from}|${b.type}|${b.to}|${b.source}`)
  );
}

test("the valid package resolves every explicit cross-domain reference", () => {
  assert.deepEqual(validateReferences(), []);
});

test("the graph includes exact, provenance-backed dependency and flow edges", () => {
  const edges = buildGraph();
  const pairs = new Set(edges.map((item) => `${item.from}|${item.type}|${item.to}`));
  for (const expected of [
    "producer:gather_holz|produces|resource:holz",
    "resource:holz|consumed-by|recipe:make_lichttropfen",
    "recipe:make_lichttropfen|produces|resource:lichttropfen",
    "storyNode:opening|transitions-to|storyNode:talk_to_juan",
    "storyNode:talk_to_juan|starts-conversation|conversation:juan_playground",
    "storyNode:waited|transitions-to|storyNode:repair_choice",
    "resource:lichttropfen|required-by|storyChoice:repair_choice/build_path",
    "storyChoice:repair_choice/build_path|resource.spend|resource:lichttropfen",
    "conversation:juan_playground|triggers|rule:juan_listened",
    "rule:unlock_playground_options|unlocks|encounter:playground_shadow"
  ]) {
    assert.ok(pairs.has(expected), `missing graph edge ${expected}`);
  }
  assert.ok(edges.every((item) => item.source), "every edge must identify its JSON source path");
  assert.deepEqual(buildGraph(), edges, "edge order is deterministic");
});

test("dangling IDs and duplicate entity IDs fail with source diagnostics", () => {
  const danglingPackage = structuredClone(pkg);
  danglingPackage["stories/story_spielplatz.json"].story.nodes[0].transitions[0].to = "missing_node";
  const danglingErrors = validateReferences(danglingPackage);
  assert.ok(danglingErrors.some((error) =>
    error.kind === "storyNode" &&
    error.reference === "missing_node" &&
    error.source.includes("opening")
  ));

  const duplicatePackage = structuredClone(pkg);
  duplicatePackage["resources.json"].resources.push({
    ...duplicatePackage["resources.json"].resources[0]
  });
  const duplicateErrors = validateReferences(duplicatePackage);
  assert.ok(duplicateErrors.some((error) =>
    error.kind === "duplicateId" &&
    error.reference === "holz" &&
    error.source === "resources.json.resources[2].id"
  ));

  const missingStartPackage = structuredClone(pkg);
  missingStartPackage["stories/story_spielplatz.json"].story.startNodeId = "missing_start";
  assert.ok(validateReferences(missingStartPackage).some((error) =>
    error.kind === "storyNode" &&
    error.reference === "missing_start" &&
    error.source.endsWith(".startNodeId")
  ));

  const duplicateNodePackage = structuredClone(pkg);
  duplicateNodePackage["stories/story_spielplatz.json"].story.nodes[1].id = "opening";
  assert.ok(validateReferences(duplicateNodePackage).some((error) =>
    error.kind === "duplicateStoryNodeId" &&
    error.reference === "opening"
  ));
});
