/**
 * Structural and cross-domain validator for Lichtwald content packages.
 * Returns { ok: boolean, messages: [{level, text}] }.
 */

function validatePackage(pkg) {
  const messages = [];
  let ok = true;

  function add(level, text) {
    messages.push({ level, text });
    if (level === "error") ok = false;
  }

  if (!pkg.manifest || typeof pkg.manifest !== "object") {
    add("error", "Missing or invalid manifest.json");
    return { ok, messages };
  }
  add("ok", `Manifest present (packId=${pkg.manifest.packId || "?"}, schema=${pkg.manifest.schemaVersion || "?"})`);
  if (pkg.manifest.schemaVersion !== 1) add("warn", `Unexpected schemaVersion: ${pkg.manifest.schemaVersion}`);

  const locations = Array.isArray(pkg.locations?.locations) ? pkg.locations.locations : [];
  const resources = Array.isArray(pkg.resources?.resources) ? pkg.resources.resources : [];
  const producers = Array.isArray(pkg.resources?.producers) ? pkg.resources.producers : [];
  const recipes = Array.isArray(pkg.resources?.recipes) ? pkg.resources.recipes : [];
  const rules = Array.isArray(pkg.rules?.rules) ? pkg.rules.rules : [];
  const enemies = Array.isArray(pkg.combat?.enemies) ? pkg.combat.enemies : [];
  const encounters = Array.isArray(pkg.combat?.encounters) ? pkg.combat.encounters : [];
  const assets = Array.isArray(pkg.assets?.assets) ? pkg.assets.assets : [];
  const stories = Object.entries(pkg.stories || {}).map(([id, document]) => ({
    id: document.story?.id || document.id || id,
    document,
    story: document.story || document,
    path: pkg.entityFiles?.stories?.[id] || `stories/${id}.json`
  }));
  const npcDocuments = Object.entries(pkg.npcs || {}).map(([id, document]) => ({
    id,
    document,
    path: pkg.entityFiles?.npcs?.[id] || `npcs/${id}.json`
  }));
  const npcs = npcDocuments.flatMap(({ document }) => document.npcs || []);
  const conversations = npcDocuments.flatMap(({ document }) => document.conversations || []);
  const localeEntries = Object.entries(pkg.locales || {});

  const catalogs = {
    location: idSet(locations),
    resource: idSet(resources),
    producer: idSet(producers),
    recipe: idSet(recipes),
    rule: idSet(rules),
    enemy: idSet(enemies),
    encounter: idSet(encounters),
    asset: idSet(assets),
    story: new Set(stories.map(({ id }) => id)),
    npc: idSet(npcs),
    conversation: idSet(conversations)
  };

  function idSet(records) {
    return new Set(records.map(record => record?.id).filter(id => typeof id === "string" && id.length > 0));
  }

  function checkUnique(records, label, source) {
    const seen = new Set();
    records.forEach((record, index) => {
      if (typeof record?.id !== "string" || !record.id) {
        add("error", `${source}[${index}] has no stable id`);
      } else if (seen.has(record.id)) {
        add("error", `${label} has duplicate id "${record.id}" at ${source}[${index}].id`);
      } else {
        seen.add(record.id);
      }
    });
  }

  function checkReference(domain, id, source) {
    if (typeof id === "string" && id && !catalogs[domain].has(id)) {
      add("error", `${source} references unknown ${domain} "${id}"`);
    }
  }

  const domainRecords = [
    ["location", locations, "locations.json.locations"],
    ["resource", resources, "resources.json.resources"],
    ["producer", producers, "resources.json.producers"],
    ["recipe", recipes, "resources.json.recipes"],
    ["rule", rules, "rules.json.rules"],
    ["enemy", enemies, "combat.json.enemies"],
    ["encounter", encounters, "combat.json.encounters"],
    ["asset", assets, "assets.json.assets"],
    ["npc", npcs, "npcs"],
    ["conversation", conversations, "npcs.conversations"]
  ];
  for (const [domain, records, source] of domainRecords) checkUnique(records, domain, source);
  checkUnique(stories.map(({ id }) => ({ id })), "story", "stories");

  for (const { id, story, path: storyPath } of stories) {
    const nodes = Array.isArray(story.nodes) ? story.nodes : [];
    const nodeIds = new Set(nodes.map(node => node?.id).filter(Boolean));
    checkUnique(nodes, `story "${id}" node`, `${storyPath}.story.nodes`);
    if (!story.startNodeId) {
      add("warn", `Story "${id}" has no startNodeId`);
    } else if (!nodeIds.has(story.startNodeId)) {
      add("error", `${storyPath}.story.startNodeId references unknown story node "${story.startNodeId}"`);
    }
    nodes.forEach((node, index) => {
      for (const transition of node.transitions || []) {
        if (transition.to && !nodeIds.has(transition.to)) {
          add("error", `${storyPath}.story.nodes[${index}].transitions references unknown story node "${transition.to}"`);
        }
      }
      for (const choice of node.choices || []) {
        if (choice.to && !nodeIds.has(choice.to)) {
          add("error", `${storyPath}.story.nodes[${index}].choices references unknown story node "${choice.to}"`);
        }
      }
      if (node.type === "conversation" && !node.conversationId) {
        add("warn", `Story "${id}" node "${node.id}": conversation type without conversationId`);
      }
    });
  }

  for (const { id: fileId, document, path: npcPath } of npcDocuments) {
    const fileNpcs = document.npcs || [];
    const fileConversations = document.conversations || [];
    checkUnique(fileNpcs, `NPC in ${npcPath}`, `${npcPath}.npcs`);
    checkUnique(fileConversations, `conversation in ${npcPath}`, `${npcPath}.conversations`);
    for (const conversation of fileConversations) {
      const source = `${npcPath}.conversations.${conversation.id}`;
      const nodes = Array.isArray(conversation.nodes) ? conversation.nodes : [];
      const nodeIds = new Set(nodes.map(node => node?.id).filter(Boolean));
      checkUnique(nodes, `dialogue node in ${conversation.id}`, `${source}.nodes`);
      if (conversation.startNodeId && !nodeIds.has(conversation.startNodeId)) {
        add("error", `${source}.startNodeId references unknown dialogue node "${conversation.startNodeId}"`);
      }
      for (const node of nodes) {
        for (const choice of node.choices || []) {
          if (choice.to && !nodeIds.has(choice.to)) {
            add("error", `${source}.nodes.${node.id}.choices references unknown dialogue node "${choice.to}"`);
          }
        }
      }
    }
    if (!fileNpcs.length && !fileConversations.length) add("warn", `${npcPath} contains no NPCs or conversations (key "${fileId}")`);
  }

  const sourceDocuments = Object.entries(pkg.documents || {});
  const documents = sourceDocuments.length ? sourceDocuments : [
    ["locations.json", pkg.locations],
    ["resources.json", pkg.resources],
    ["rules.json", pkg.rules],
    ["combat.json", pkg.combat],
    ["assets.json", pkg.assets],
    ...stories.map(({ path, document }) => [path, document]),
    ...npcDocuments.map(({ path, document }) => [path, document]),
    ...localeEntries.map(([locale, document]) => [`locales/${locale}.json`, document])
  ];

  for (const [file, document] of documents) {
    visitReferences(document, file, (domain, id, source) => checkReference(domain, id, source), (key, textKey, source) => {
      if (!localeEntries.length) {
        add("error", `${source} references text key "${textKey}" but the package has no locale files`);
        return;
      }
      for (const [locale, localeDocument] of localeEntries) {
        if (!Object.hasOwn(localeDocument.strings || {}, textKey)) {
          add("error", `${source} references missing text key "${textKey}" in locale "${locale}"`);
        }
      }
    });
  }

  for (const location of locations) {
    const source = `locations.json.locations.${location.id}`;
    for (const id of location.producerIds || []) checkReference("producer", id, `${source}.producerIds`);
    for (const id of location.recipeIds || []) checkReference("recipe", id, `${source}.recipeIds`);
    for (const id of location.encounterIds || []) checkReference("encounter", id, `${source}.encounterIds`);
  }
  for (const producer of producers) {
    const source = `resources.json.producers.${producer.id}`;
    for (const id of [...Object.keys(producer.outputs || {}), ...Object.keys(producer.costs || {})]) {
      checkReference("resource", id, `${source}.outputs/costs`);
    }
  }
  for (const recipe of recipes) {
    const source = `resources.json.recipes.${recipe.id}`;
    for (const id of [...Object.keys(recipe.inputs || {}), ...Object.keys(recipe.outputs || {})]) {
      checkReference("resource", id, `${source}.inputs/outputs`);
    }
  }
  for (const rule of rules) {
    for (const effect of rule.effects || []) {
      if (effect.op && !ALLOWED_EFFECTS.includes(effect.op)) {
        add("error", `Rule "${rule.id}": unknown effect op "${effect.op}"`);
      }
      if (effect.targetType === "recipe") checkReference("recipe", effect.targetId, `rules.json.rules.${rule.id}.effects`);
      if (effect.targetType === "combatEncounter") checkReference("encounter", effect.targetId, `rules.json.rules.${rule.id}.effects`);
    }
    if (rule.trigger?.choiceId) {
      const conversation = conversations.find(record => record.id === rule.trigger.conversationId);
      const choiceIds = new Set((conversation?.nodes || []).flatMap(node => (node.choices || []).map(choice => choice.id)));
      if (!choiceIds.has(rule.trigger.choiceId)) {
        add("error", `rules.json.rules.${rule.id}.trigger.choiceId references unknown choice "${rule.trigger.choiceId}"`);
      }
    }
  }

  add("ok", `${stories.length} story/stories checked`);
  add("ok", `${resources.length} resources, ${producers.length} producers, ${recipes.length} recipes`);
  add("ok", `${npcs.length} NPCs, ${conversations.length} conversations`);
  add("ok", `${locations.length} locations, ${enemies.length} enemies, ${encounters.length} encounters`);
  add("ok", `${assets.length} assets, ${rules.length} rules, ${localeEntries.length} locales`);
  if (ok) add("ok", "Structural and cross-domain validation passed");
  else add("error", "Validation failed – fix errors before shipping this package to Godot");
  return { ok, messages };
}

function visitReferences(value, source, checkReference, checkTextKey) {
  if (Array.isArray(value)) {
    value.forEach((item, index) => visitReferences(item, `${source}[${index}]`, checkReference, checkTextKey));
    return;
  }
  if (!value || typeof value !== "object") return;

  for (const [key, nested] of Object.entries(value)) {
    const referenceSource = `${source}.${key}`;
    if (typeof nested === "string") {
      if (key === "locationId") checkReference("location", nested, referenceSource);
      if (key === "resourceId") checkReference("resource", nested, referenceSource);
      if (key === "producerId") checkReference("producer", nested, referenceSource);
      if (key === "recipeId") checkReference("recipe", nested, referenceSource);
      if (key === "enemyId") checkReference("enemy", nested, referenceSource);
      if (key === "encounterId" || (key === "targetId" && value.targetType === "combatEncounter")) {
        checkReference("encounter", nested, referenceSource);
      }
      if (key === "characterId" || key === "npcId" || key === "speakerId") {
        checkReference("npc", nested, referenceSource);
      }
      if (key === "conversationId") checkReference("conversation", nested, referenceSource);
      if (key === "assetId" || /AssetId$/.test(key)) checkReference("asset", nested, referenceSource);
      if (key === "targetId" && value.targetType === "recipe") checkReference("recipe", nested, referenceSource);
      if (key.endsWith("Key")) checkTextKey(key, nested, referenceSource);
      if (key === "path" && nested.startsWith("resources.")) {
        checkReference("resource", nested.slice("resources.".length), referenceSource);
      }
    }
    visitReferences(nested, referenceSource, checkReference, checkTextKey);
  }
}
