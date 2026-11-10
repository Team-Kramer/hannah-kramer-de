const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { test } = require("node:test");

const fixtureRoot = path.resolve(__dirname, "../fixtures/spielplatz_demo");

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(fixtureRoot, relativePath), "utf8"));
}

const manifest = readJson("manifest.json");
const packageData = Object.fromEntries(
  manifest.files.map((relativePath) => [relativePath, readJson(relativePath)])
);

function entities(file, key) {
  return packageData[file][key] || [];
}

function assertUniqueIds(records, label) {
  const ids = records.map((record) => record.id);
  assert.equal(new Set(ids).size, ids.length, `${label} IDs must be unique`);
}

function collectReferences(value, predicate, result = []) {
  if (Array.isArray(value)) {
    for (const item of value) collectReferences(item, predicate, result);
  } else if (value && typeof value === "object") {
    for (const [key, nestedValue] of Object.entries(value)) {
      if (predicate(key, nestedValue)) result.push(nestedValue);
      collectReferences(nestedValue, predicate, result);
    }
  }
  return result;
}

const storyData = packageData["stories/story_spielplatz.json"].story;
const npcData = packageData["npcs/juan.json"];
const locales = Object.fromEntries(
  manifest.files
    .filter((relativePath) => relativePath.startsWith("locales/"))
    .map((relativePath) => {
      const locale = packageData[relativePath];
      return [locale.locale, locale.strings];
    })
);
const assets = entities("assets.json", "assets");
const assetById = new Map(assets.map((asset) => [asset.id, asset]));

test("manifest lists every package file exactly once", () => {
  assert.equal(new Set(manifest.files).size, manifest.files.length);
  for (const relativePath of manifest.files) {
    assert.ok(fs.existsSync(path.join(fixtureRoot, relativePath)), `${relativePath} must exist`);
    assert.equal(packageData[relativePath].packId, manifest.packId, `${relativePath} packId`);
    assert.equal(packageData[relativePath].schemaVersion, manifest.schemaVersion, `${relativePath} schemaVersion`);
  }
});

test("fixture is domain-sized and contains the planned F1 sample", () => {
  assert.deepEqual(
    new Set(manifest.files),
    new Set([
      "combat.json",
      "locations.json",
      "resources.json",
      "rules.json",
      "stories/story_spielplatz.json",
      "npcs/juan.json",
      "locales/de.json",
      "locales/en.json",
      "assets.json"
    ])
  );
  assert.equal(entities("resources.json", "resources").length, 2);
  assert.equal(entities("resources.json", "producers").length, 1);
  assert.equal(entities("resources.json", "recipes").length, 1);
  assert.equal(entities("combat.json", "enemies").length, 1);
  assert.equal(entities("combat.json", "encounters").length, 1);
  assert.equal(storyData.nodes.filter((node) => node.type === "outcome").length, 2);
});

test("entity IDs are unique within each authored domain", () => {
  for (const [file, collection] of [
    ["locations.json", "locations"],
    ["resources.json", "resources"],
    ["resources.json", "producers"],
    ["resources.json", "recipes"],
    ["combat.json", "enemies"],
    ["combat.json", "encounters"],
    ["rules.json", "rules"],
    ["assets.json", "assets"]
  ]) {
    assertUniqueIds(entities(file, collection), `${file}:${collection}`);
  }
  assertUniqueIds([storyData], "stories");
  assertUniqueIds(storyData.nodes, "story nodes");
  assertUniqueIds(npcData.npcs, "NPCs");
  assertUniqueIds(npcData.conversations, "conversations");
  for (const conversation of npcData.conversations) {
    assertUniqueIds(conversation.nodes, `conversation ${conversation.id} nodes`);
    for (const node of conversation.nodes) {
      assertUniqueIds(node.choices || [], `conversation node ${node.id} choices`);
    }
  }
});

test("locale keys and visual asset references resolve", () => {
  assert.ok(locales.de, "German locale is required");
  assert.ok(locales.en, "English locale is required");
  const textKeys = collectReferences(
    Object.fromEntries(Object.entries(packageData).filter(([file]) => !file.startsWith("locales/"))),
    (key, value) => key.endsWith("Key") && typeof value === "string"
  );
  for (const textKey of textKeys) {
    for (const [localeId, strings] of Object.entries(locales)) {
      assert.ok(Object.hasOwn(strings, textKey), `${textKey} missing from ${localeId}`);
    }
  }

  const assetIds = collectReferences(
    Object.fromEntries(Object.entries(packageData).filter(([file]) => file !== "assets.json")),
    (key, value) => /AssetId$/.test(key) || key === "assetId"
  );
  for (const assetId of assetIds) {
    const asset = assetById.get(assetId);
    assert.ok(asset, `asset ${assetId} must be declared`);
  }
  for (const asset of assets) {
    assert.equal(asset.status, "placeholder", `${asset.id} should remain explicitly unproduced`);
    assert.ok(asset.artBrief?.trim(), `placeholder ${asset.id} needs an art brief`);
    assert.ok(!asset.path, `placeholder ${asset.id} must not point to a ready image file`);
  }
});

test("story, conversation, resource, location, rule, and encounter links resolve", () => {
  const nodeIds = new Set(storyData.nodes.map((node) => node.id));
  for (const node of storyData.nodes) {
    for (const transition of node.transitions || []) {
      assert.ok(nodeIds.has(transition.to), `story transition ${node.id} -> ${transition.to}`);
    }
    for (const choice of node.choices || []) {
      assert.ok(nodeIds.has(choice.to), `story choice ${node.id}/${choice.id} -> ${choice.to}`);
    }
  }
  assert.ok(nodeIds.has(storyData.startNodeId), "story start node must exist");

  const conversationIds = new Set(npcData.conversations.map((conversation) => conversation.id));
  const npcIds = new Set(npcData.npcs.map((npc) => npc.id));
  const locations = new Map(entities("locations.json", "locations").map((location) => [location.id, location]));
  for (const storyNode of storyData.nodes) {
    assert.ok(locations.has(storyNode.locationId), `story node location ${storyNode.locationId}`);
    if (storyNode.conversationId) {
      assert.ok(conversationIds.has(storyNode.conversationId), `conversation ${storyNode.conversationId}`);
    }
  }
  for (const npc of npcData.npcs) {
    assert.ok(assetById.has(npc.portraitAssetId), `NPC portrait ${npc.portraitAssetId}`);
  }
  for (const conversation of npcData.conversations) {
    assert.ok(npcIds.has(conversation.npcId), `NPC ${conversation.npcId}`);
    const conversationNodeIds = new Set(conversation.nodes.map((node) => node.id));
    assert.ok(conversationNodeIds.has(conversation.startNodeId), `start node for ${conversation.id}`);
    for (const node of conversation.nodes) {
      assert.ok(npcIds.has(node.speakerId), `speaker ${node.speakerId}`);
      for (const choice of node.choices || []) {
        assert.ok(conversationNodeIds.has(choice.to), `conversation choice ${node.id}/${choice.id}`);
      }
    }
  }

  const resources = new Set(entities("resources.json", "resources").map((resource) => resource.id));
  const producers = new Map(entities("resources.json", "producers").map((producer) => [producer.id, producer]));
  const recipes = new Map(entities("resources.json", "recipes").map((recipe) => [recipe.id, recipe]));
  const enemies = new Set(entities("combat.json", "enemies").map((enemy) => enemy.id));
  const encounters = new Map(entities("combat.json", "encounters").map((encounter) => [encounter.id, encounter]));

  for (const producer of producers.values()) {
    assert.ok(locations.has(producer.locationId), `producer location ${producer.locationId}`);
    for (const resourceId of [...Object.keys(producer.outputs || {}), ...Object.keys(producer.costs || {})]) {
      assert.ok(resources.has(resourceId), `producer resource ${resourceId}`);
    }
  }
  for (const recipe of recipes.values()) {
    assert.ok(locations.has(recipe.locationId), `recipe location ${recipe.locationId}`);
    for (const resourceId of [...Object.keys(recipe.inputs || {}), ...Object.keys(recipe.outputs || {})]) {
      assert.ok(resources.has(resourceId), `recipe resource ${resourceId}`);
    }
  }
  for (const location of locations.values()) {
    assert.ok(assetById.has(location.backgroundAssetId), `location asset ${location.backgroundAssetId}`);
    for (const producerId of location.producerIds || []) assert.ok(producers.has(producerId), `producer ${producerId}`);
    for (const recipeId of location.recipeIds || []) assert.ok(recipes.has(recipeId), `recipe ${recipeId}`);
    for (const encounterId of location.encounterIds || []) assert.ok(encounters.has(encounterId), `encounter ${encounterId}`);
  }
  for (const encounter of encounters.values()) {
    assert.ok(enemies.has(encounter.enemyId), `enemy ${encounter.enemyId}`);
    assert.ok(locations.has(encounter.locationId), `encounter location ${encounter.locationId}`);
    assert.ok(encounter.combatProfileId, `combat profile for ${encounter.id}`);
  }

  const allContent = Object.fromEntries(
    Object.entries(packageData).filter(([file]) => !file.startsWith("locales/"))
  );
  const effects = collectReferences(allContent, (key, value) => key === "effects" && Array.isArray(value)).flat();
  for (const effect of effects) {
    if (effect.resourceId) assert.ok(resources.has(effect.resourceId), `effect resource ${effect.resourceId}`);
    if (effect.characterId) assert.ok(npcIds.has(effect.characterId), `effect character ${effect.characterId}`);
    if (effect.targetType === "recipe") assert.ok(recipes.has(effect.targetId), `unlocked recipe ${effect.targetId}`);
    if (effect.targetType === "combatEncounter") assert.ok(encounters.has(effect.targetId), `unlocked encounter ${effect.targetId}`);
  }

  const choicesByConversation = new Map(
    npcData.conversations.map((conversation) => [
      conversation.id,
      new Set(conversation.nodes.flatMap((node) => (node.choices || []).map((choice) => choice.id)))
    ])
  );
  const rules = entities("rules.json", "rules");
  for (const rule of rules) {
    if (rule.trigger.resourceId) assert.ok(resources.has(rule.trigger.resourceId), `trigger resource ${rule.trigger.resourceId}`);
    if (rule.trigger.conversationId) assert.ok(conversationIds.has(rule.trigger.conversationId), `trigger conversation ${rule.trigger.conversationId}`);
    if (rule.trigger.choiceId) {
      assert.ok(
        choicesByConversation.get(rule.trigger.conversationId)?.has(rule.trigger.choiceId),
        `trigger choice ${rule.trigger.conversationId}/${rule.trigger.choiceId}`
      );
    }
  }
});

test("player-facing story and conversation nodes include explicit art references", () => {
  for (const node of storyData.nodes) {
    assert.ok(node.illustration?.assetId, `story node ${node.id} needs an illustration`);
  }
  for (const conversation of npcData.conversations) {
    for (const node of conversation.nodes) {
      assert.ok(node.illustrationAssetId, `conversation node ${conversation.id}/${node.id} needs an illustration`);
    }
  }
  for (const resource of entities("resources.json", "resources")) {
    assert.ok(resource.iconAssetId, `resource ${resource.id} needs an icon`);
  }
});
