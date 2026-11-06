/**
 * Simple graph builders for Story and Dependency views using vis-network.
 */

let network = null;

function renderStoryGraph(container, storyData) {
  const story = storyData.story || storyData;
  const nodes = [];
  const edges = [];

  for (const n of (story.nodes || [])) {
    let color = "#2a2a38";
    if (n.type === "storyBeat") color = "#3b3b4f";
    if (n.type === "conversation") color = "#4a3a5c";
    if (n.type === "decision") color = "#5c4a2a";
    if (n.type === "outcome") color = "#2a4a3a";

    nodes.push({
      id: n.id,
      label: `${n.id}\n(${n.type || "?"})`,
      color: { background: color, border: "#a78bfa" },
      font: { color: "#e8e6f0", size: 12 },
      shape: "box",
      margin: 10
    });

    for (const t of (n.transitions || [])) {
      if (t.to) {
        edges.push({
          from: n.id,
          to: t.to,
          label: t.id || "",
          arrows: "to",
          color: { color: "#6b7280" },
          font: { color: "#9ca3af", size: 10 }
        });
      }
    }
    for (const c of (n.choices || [])) {
      if (c.to) {
        edges.push({
          from: n.id,
          to: c.to,
          label: c.id || "choice",
          arrows: "to",
          color: { color: "#a78bfa" },
          font: { color: "#c4b5fd", size: 10 },
          dashes: true
        });
      }
    }
  }

  const data = { nodes: new vis.DataSet(nodes), edges: new vis.DataSet(edges) };
  const options = {
    layout: { hierarchical: { direction: "UD", sortMethod: "directed", levelSeparation: 80 } },
    physics: false,
    interaction: { hover: true, tooltipDelay: 100 },
    edges: { smooth: { type: "cubicBezier" } }
  };

  if (network) network.destroy();
  network = new vis.Network(container, data, options);
}

function renderDependencyGraph(container, pkg) {
  const graph = buildDependencyGraph(pkg);
  const data = {
    nodes: new vis.DataSet(graph.nodes),
    edges: new vis.DataSet(graph.edges.map(edge => ({
      ...edge,
      title: edge.source,
      arrows: "to",
      color: { color: "#9ca3af" },
      font: { color: "#9ca3af", size: 10 }
    })))
  };
  const options = {
    physics: { enabled: true, barnesHut: { gravitationalConstant: -3000 } },
    interaction: { hover: true },
    edges: { smooth: true, font: { size: 10, color: "#9ca3af" } }
  };

  if (network) network.destroy();
  network = new vis.Network(container, data, options);
}

function buildDependencyGraph(pkg) {
  const nodes = [];
  const edges = [];
  const nodeIds = new Set();
  const colors = {
    location: "#1e3a2f",
    resource: "#1e3a2f",
    producer: "#1e2a3a",
    recipe: "#1e2a3a",
    story: "#2a1e3a",
    storyNode: "#2a1e3a",
    storyChoice: "#3a2d4d",
    npc: "#3a2a1e",
    conversation: "#3a2a1e",
    dialogueNode: "#3a2a1e",
    rule: "#3a1e2a",
    enemy: "#492323",
    encounter: "#492323",
    asset: "#243447",
    locale: "#34313d"
  };

  function addNode(id, group, label) {
    if (nodeIds.has(id)) return;
    nodeIds.add(id);
    nodes.push({
      id,
      label: label || id,
      group,
      color: { background: colors[group] || "#2a2a38", border: "#a78bfa" },
      font: { color: "#e8e6f0", size: 11 },
      shape: "ellipse"
    });
  }

  function addEdge(from, type, to, source) {
    addNode(from, from.split(":")[0]);
    addNode(to, to.split(":")[0]);
    edges.push({ from, type, to, label: type, source });
  }

  function addFieldReferences(owner, value, source) {
    function visit(record, recordPath) {
      if (Array.isArray(record)) {
        record.forEach((item, index) => visit(item, `${recordPath}[${index}]`));
        return;
      }
      if (!record || typeof record !== "object") return;
      for (const [key, nested] of Object.entries(record)) {
        const fieldPath = `${recordPath}.${key}`;
        if (typeof nested === "string" && (key === "assetId" || /AssetId$/.test(key))) {
          addEdge(owner, "uses-asset", `asset:${nested}`, fieldPath);
        }
        if (typeof nested === "string" && key.endsWith("Key")) {
          for (const [locale, document] of Object.entries(pkg.locales || {})) {
            if (Object.hasOwn(document.strings || {}, nested)) {
              addEdge(owner, `localized-${locale}`, `locale:${locale}:${nested}`, fieldPath);
            }
          }
        }
        visit(nested, fieldPath);
      }
    }
    visit(value, source);
  }

  function addEffectEdges(owner, effects, source) {
    for (const [index, effect] of (effects || []).entries()) {
      const effectPath = `${source}[${index}]`;
      if (effect.resourceId) addEdge(owner, effect.op || "affects", `resource:${effect.resourceId}`, `${effectPath}.resourceId`);
      if (effect.characterId) addEdge(owner, effect.op || "affects", `npc:${effect.characterId}`, `${effectPath}.characterId`);
      if (effect.targetType === "recipe" && effect.targetId) addEdge(owner, "unlocks", `recipe:${effect.targetId}`, `${effectPath}.targetId`);
      if (effect.targetType === "combatEncounter" && effect.targetId) addEdge(owner, "unlocks", `encounter:${effect.targetId}`, `${effectPath}.targetId`);
    }
  }

  for (const location of pkg.locations?.locations || []) {
    const owner = `location:${location.id}`;
    addNode(owner, "location", location.id);
    addFieldReferences(owner, location, `locations.json.locations.${location.id}`);
    for (const id of location.producerIds || []) addEdge(owner, "offers", `producer:${id}`, `locations.json.locations.${location.id}.producerIds`);
    for (const id of location.recipeIds || []) addEdge(owner, "offers", `recipe:${id}`, `locations.json.locations.${location.id}.recipeIds`);
    for (const id of location.encounterIds || []) addEdge(owner, "offers", `encounter:${id}`, `locations.json.locations.${location.id}.encounterIds`);
  }

  for (const resource of pkg.resources?.resources || []) {
    const owner = `resource:${resource.id}`;
    addNode(owner, "resource", resource.id);
    addFieldReferences(owner, resource, `resources.json.resources.${resource.id}`);
  }
  for (const producer of pkg.resources?.producers || []) {
    const owner = `producer:${producer.id}`;
    addNode(owner, "producer", producer.id);
    addEdge(owner, "located-at", `location:${producer.locationId}`, `resources.json.producers.${producer.id}.locationId`);
    for (const resourceId of Object.keys(producer.outputs || {})) {
      addEdge(owner, "produces", `resource:${resourceId}`, `resources.json.producers.${producer.id}.outputs.${resourceId}`);
    }
    for (const resourceId of Object.keys(producer.costs || {})) {
      addEdge(owner, "costs", `resource:${resourceId}`, `resources.json.producers.${producer.id}.costs.${resourceId}`);
    }
    addFieldReferences(owner, producer, `resources.json.producers.${producer.id}`);
  }
  for (const recipe of pkg.resources?.recipes || []) {
    const owner = `recipe:${recipe.id}`;
    addNode(owner, "recipe", recipe.id);
    addEdge(owner, "located-at", `location:${recipe.locationId}`, `resources.json.recipes.${recipe.id}.locationId`);
    for (const resourceId of Object.keys(recipe.inputs || {})) {
      addEdge(`resource:${resourceId}`, "consumed-by", owner, `resources.json.recipes.${recipe.id}.inputs.${resourceId}`);
    }
    for (const resourceId of Object.keys(recipe.outputs || {})) {
      addEdge(owner, "produces", `resource:${resourceId}`, `resources.json.recipes.${recipe.id}.outputs.${resourceId}`);
    }
    addFieldReferences(owner, recipe, `resources.json.recipes.${recipe.id}`);
  }
  for (const enemy of pkg.combat?.enemies || []) {
    const owner = `enemy:${enemy.id}`;
    addNode(owner, "enemy", enemy.id);
    addFieldReferences(owner, enemy, `combat.json.enemies.${enemy.id}`);
  }
  for (const encounter of pkg.combat?.encounters || []) {
    const owner = `encounter:${encounter.id}`;
    addNode(owner, "encounter", encounter.id);
    addEdge(owner, "uses-enemy", `enemy:${encounter.enemyId}`, `combat.json.encounters.${encounter.id}.enemyId`);
    addEdge(owner, "located-at", `location:${encounter.locationId}`, `combat.json.encounters.${encounter.id}.locationId`);
    addEffectEdges(owner, encounter.effects, `combat.json.encounters.${encounter.id}.effects`);
    addFieldReferences(owner, encounter, `combat.json.encounters.${encounter.id}`);
  }
  for (const asset of pkg.assets?.assets || []) addNode(`asset:${asset.id}`, "asset", asset.id);
  for (const [locale, document] of Object.entries(pkg.locales || {})) {
    for (const key of Object.keys(document.strings || {})) addNode(`locale:${locale}:${key}`, "locale", `${locale} · ${key}`);
  }

  for (const [storyId, document] of Object.entries(pkg.stories || {})) {
    const story = document.story || document;
    const storyNode = `story:${story.id || storyId}`;
    const storyPath = pkg.entityFiles?.stories?.[storyId] || `stories/${storyId}.json`;
    addNode(storyNode, "story", story.title?.en || story.title?.de || story.id || storyId);
    addFieldReferences(storyNode, { title: story.title }, `${storyPath}.story`);
    for (const node of story.nodes || []) {
      const nodeId = `storyNode:${story.id || storyId}/${node.id}`;
      const { choices, ...nodeFields } = node;
      addNode(nodeId, "storyNode", `${node.id} (${node.type || "beat"})`);
      addEdge(storyNode, "contains", nodeId, `${storyPath}.story.nodes.${node.id}`);
      addFieldReferences(nodeId, nodeFields, `${storyPath}.story.nodes.${node.id}`);
      if (node.locationId) addEdge(nodeId, "at-location", `location:${node.locationId}`, `${storyPath}.story.nodes.${node.id}.locationId`);
      if (node.conversationId) addEdge(nodeId, "starts-conversation", `conversation:${node.conversationId}`, `${storyPath}.story.nodes.${node.id}.conversationId`);
      for (const transition of node.transitions || []) {
        addEdge(nodeId, "transitions-to", `storyNode:${story.id || storyId}/${transition.to}`, `${storyPath}.story.nodes.${node.id}.transitions.${transition.id || transition.to}.to`);
      }
      for (const choice of choices || []) {
        const choiceId = `storyChoice:${story.id || storyId}/${node.id}/${choice.id}`;
        addNode(choiceId, "storyChoice", choice.label?.en || choice.label?.de || choice.id);
        addEdge(nodeId, "offers-choice", choiceId, `${storyPath}.story.nodes.${node.id}.choices.${choice.id}`);
        if (choice.to) addEdge(choiceId, "choice-to", `storyNode:${story.id || storyId}/${choice.to}`, `${storyPath}.story.nodes.${node.id}.choices.${choice.id}.to`);
        for (const condition of choice.when?.all || []) {
          if (condition.path?.startsWith("resources.")) {
            addEdge(`resource:${condition.path.slice("resources.".length)}`, "required-by", choiceId, `${storyPath}.story.nodes.${node.id}.choices.${choice.id}.when`);
          }
        }
        addEffectEdges(choiceId, choice.effects, `${storyPath}.story.nodes.${node.id}.choices.${choice.id}.effects`);
        addFieldReferences(choiceId, choice, `${storyPath}.story.nodes.${node.id}.choices.${choice.id}`);
      }
    }
    if (story.startNodeId) {
      addEdge(storyNode, "starts-at", `storyNode:${story.id || storyId}/${story.startNodeId}`, `${storyPath}.story.startNodeId`);
    }
  }

  for (const [fileId, document] of Object.entries(pkg.npcs || {})) {
    const npcPath = pkg.entityFiles?.npcs?.[fileId] || `npcs/${fileId}.json`;
    for (const npc of document.npcs || []) {
      const owner = `npc:${npc.id}`;
      addNode(owner, "npc", npc.displayName?.en || npc.displayName?.de || npc.id);
      addFieldReferences(owner, npc, `${npcPath}.npcs.${npc.id}`);
    }
    for (const conversation of document.conversations || []) {
      const owner = `conversation:${conversation.id}`;
      const { nodes, ...conversationFields } = conversation;
      addNode(owner, "conversation", conversation.id);
      addEdge(owner, "belongs-to", `npc:${conversation.npcId}`, `${npcPath}.conversations.${conversation.id}.npcId`);
      addFieldReferences(owner, conversationFields, `${npcPath}.conversations.${conversation.id}`);
      for (const node of nodes || []) {
        const nodeId = `dialogueNode:${conversation.id}/${node.id}`;
        const { choices, ...nodeFields } = node;
        addNode(nodeId, "dialogueNode", `${node.id} (${node.type || "line"})`);
        addEdge(owner, "contains", nodeId, `${npcPath}.conversations.${conversation.id}.nodes.${node.id}`);
        if (node.speakerId) addEdge(nodeId, "spoken-by", `npc:${node.speakerId}`, `${npcPath}.conversations.${conversation.id}.nodes.${node.id}.speakerId`);
        addFieldReferences(nodeId, nodeFields, `${npcPath}.conversations.${conversation.id}.nodes.${node.id}`);
        for (const choice of choices || []) {
          if (choice.to) {
            addEdge(nodeId, "choice-to", `dialogueNode:${conversation.id}/${choice.to}`, `${npcPath}.conversations.${conversation.id}.nodes.${node.id}.choices.${choice.id}.to`);
          }
          addEffectEdges(nodeId, choice.effects, `${npcPath}.conversations.${conversation.id}.nodes.${node.id}.choices.${choice.id}.effects`);
          addFieldReferences(nodeId, choice, `${npcPath}.conversations.${conversation.id}.nodes.${node.id}.choices.${choice.id}`);
        }
      }
      if (conversation.startNodeId) {
        addEdge(owner, "starts-at", `dialogueNode:${conversation.id}/${conversation.startNodeId}`, `${npcPath}.conversations.${conversation.id}.startNodeId`);
      }
    }
  }

  for (const rule of pkg.rules?.rules || []) {
    const owner = `rule:${rule.id}`;
    addNode(owner, "rule", rule.id);
    if (rule.trigger?.resourceId) addEdge(`resource:${rule.trigger.resourceId}`, "triggers", owner, `rules.json.rules.${rule.id}.trigger.resourceId`);
    if (rule.trigger?.conversationId) addEdge(`conversation:${rule.trigger.conversationId}`, "triggers", owner, `rules.json.rules.${rule.id}.trigger.conversationId`);
    addEffectEdges(owner, rule.effects, `rules.json.rules.${rule.id}.effects`);
    addFieldReferences(owner, rule, `rules.json.rules.${rule.id}`);
  }

  nodes.sort((left, right) => left.id.localeCompare(right.id));
  edges.sort((left, right) =>
    `${left.from}|${left.type}|${left.to}|${left.source}`.localeCompare(`${right.from}|${right.type}|${right.to}|${right.source}`)
  );
  return { nodes, edges };
}

function fitGraph() {
  if (network) network.fit({ animation: true });
}
