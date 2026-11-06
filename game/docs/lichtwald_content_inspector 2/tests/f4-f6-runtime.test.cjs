const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { test } = require("node:test");

// The shared condition DSL is a browser global (UMD). Load it the same way the
// other web/js files are loaded in tests: evaluate in a bare context and read
// the global it installs.
const ConditionDsl = (() => {
  const context = vm.createContext({});
  vm.runInContext(
    fs.readFileSync(path.join(__dirname, "../web/js/condition_dsl.js"), "utf8"),
    context
  );
  return context.ConditionDsl;
})();

const fixtureRoot = path.resolve(__dirname, "../fixtures/spielplatz_demo");
const manifest = JSON.parse(fs.readFileSync(path.join(fixtureRoot, "manifest.json"), "utf8"));
const pkg = Object.fromEntries(
  manifest.files.map((file) => [file, JSON.parse(fs.readFileSync(path.join(fixtureRoot, file), "utf8"))])
);

const MAX_CONDITION_DEPTH = 12;
const MAX_CONDITION_NODES = 64;
const COMBAT_PROFILES = new Set(["turn_based_core"]);
const CONDITION_OPERATORS = ConditionDsl.CONDITION_OPERATORS;

function catalogFor(input = pkg) {
  const story = input["stories/story_spielplatz.json"]?.story || {};
  const npcFile = input["npcs/juan.json"] || {};
  const resources = input["resources.json"]?.resources || [];
  const npcs = npcFile.npcs || [];
  const combat = input["combat.json"] || {};
  return {
    resources: new Map(resources.map((resource) => [resource.id, resource])),
    npcs: new Map(npcs.map((npc) => [npc.id, npc])),
    storyNodes: new Set((story.nodes || []).map((node) => node.id)),
    recipes: new Set((input["resources.json"]?.recipes || []).map((recipe) => recipe.id)),
    producers: new Set((input["resources.json"]?.producers || []).map((producer) => producer.id)),
    encounters: new Map((combat.encounters || []).map((encounter) => [encounter.id, encounter])),
    enemies: new Set((combat.enemies || []).map((enemy) => enemy.id)),
    combatProfiles: COMBAT_PROFILES
  };
}

function initialState(catalog = catalogFor()) {
  return {
    resources: Object.fromEntries(
      [...catalog.resources].map(([id, resource]) => [id, resource.initialAmount])
    ),
    relationships: Object.fromEntries(
      [...catalog.npcs].map(([id, npc]) => [id, npc.initialRelationship])
    ),
    flags: {
      encounter_playground_shadow_unlocked: false,
      playground_path_repaired: false,
      juan_listened: false
    },
    story: {
      visited: Object.fromEntries([...catalog.storyNodes].map((id) => [id, false])),
      runtime: {
        currentNodeId: null,
        currentDialogueId: null,
        currentDialogueNodeId: null,
        pendingInput: null,
        visits: [],
        appliedOutcomeNodeIds: [],
        processedChoiceInputs: []
      }
    },
    unlocks: {
      recipes: Object.fromEntries([...catalog.recipes].map((id) => [id, false])),
      producers: Object.fromEntries([...catalog.producers].map((id) => [id, false])),
      combatEncounters: Object.fromEntries([...catalog.encounters.keys()].map((id) => [id, false]))
    },
    conversationChoices: {},
    events: { processed: [], firedOnceRules: [], log: [] },
    combatRequests: []
  };
}

// Path resolution and comparison live in the shared condition DSL so the
// workbench preview and this runtime prototype cannot drift apart (PD-01b).
function conditionPath(pathValue, state, catalog) {
  return ConditionDsl.readConditionPath(pathValue, state, catalog);
}

function validateCondition(expression, state, catalog, depth = 0, budget = { count: 0 }) {
  if (depth > MAX_CONDITION_DEPTH) throw new Error(`condition exceeds depth limit ${MAX_CONDITION_DEPTH}`);
  budget.count += 1;
  if (budget.count > MAX_CONDITION_NODES) throw new Error(`condition exceeds node limit ${MAX_CONDITION_NODES}`);
  if (!expression || typeof expression !== "object" || Array.isArray(expression)) {
    throw new Error("condition node must be an object");
  }
  const keys = Object.keys(expression);
  if (keys.length === 1 && (keys[0] === "all" || keys[0] === "any")) {
    const children = expression[keys[0]];
    if (!Array.isArray(children)) throw new Error(`condition.${keys[0]} must be an array`);
    children.forEach((child) => validateCondition(child, state, catalog, depth + 1, budget));
    return;
  }
  if (keys.length === 1 && keys[0] === "not") {
    validateCondition(expression.not, state, catalog, depth + 1, budget);
    return;
  }
  if (expression.op === "exists") {
    // Structural operator: validates the path (allow-list + registration) but
    // must not require the field to be present, and takes no `value`.
    if (keys.length !== 2 || !["path", "op"].every((key) => Object.hasOwn(expression, key))) {
      throw new Error("exists condition leaf must contain only path and op");
    }
    ConditionDsl.validateConditionPath(expression.path, catalog);
    return;
  }
  if (keys.length !== 3 || !["path", "op", "value"].every((key) => Object.hasOwn(expression, key))) {
    throw new Error("condition leaf must contain only path, op, and value");
  }
  const actual = conditionPath(expression.path, state, catalog);
  if (!CONDITION_OPERATORS.has(expression.op)) throw new Error(`condition operator is not allow-listed: ${expression.op}`);
  const expected = expression.value;
  if (typeof expected !== "number" && typeof expected !== "boolean") {
    throw new Error(`condition value has unsupported type at ${expression.path}`);
  }
  if (typeof actual !== typeof expected) throw new Error(`condition value type does not match ${expression.path}`);
  if (["gt", "gte", "lt", "lte"].includes(expression.op) && typeof actual !== "number") {
    throw new Error(`numeric condition operator requires a number at ${expression.path}`);
  }
}

function evaluateCondition(expression, state, catalog = catalogFor()) {
  validateCondition(expression, state, catalog);
  if (Object.hasOwn(expression, "all")) {
    return expression.all.every((child) => evaluateConditionUnchecked(child, state, catalog));
  }
  if (Object.hasOwn(expression, "any")) {
    return expression.any.some((child) => evaluateConditionUnchecked(child, state, catalog));
  }
  if (Object.hasOwn(expression, "not")) {
    return !evaluateConditionUnchecked(expression.not, state, catalog);
  }
  if (expression.op === "exists") return ConditionDsl.conditionPathExists(expression.path, state, catalog);
  return compare(conditionPath(expression.path, state, catalog), expression.op, expression.value);
}

function evaluateConditionUnchecked(expression, state, catalog) {
  if (Object.hasOwn(expression, "all")) return expression.all.every((child) => evaluateConditionUnchecked(child, state, catalog));
  if (Object.hasOwn(expression, "any")) return expression.any.some((child) => evaluateConditionUnchecked(child, state, catalog));
  if (Object.hasOwn(expression, "not")) return !evaluateConditionUnchecked(expression.not, state, catalog);
  if (expression.op === "exists") return ConditionDsl.conditionPathExists(expression.path, state, catalog);
  return compare(conditionPath(expression.path, state, catalog), expression.op, expression.value);
}

function compare(actual, operator, expected) {
  return ConditionDsl.compareConditionValue(actual, operator, expected);
}

function checkAvailability(condition, state, catalog = catalogFor()) {
  const available = evaluateCondition(condition, state, catalog);
  return { available, reason: available ? null : "condition_not_met" };
}

function assertOnlyKeys(value, expected, label) {
  if (Object.keys(value).some((key) => !expected.includes(key)) ||
      expected.some((key) => !Object.hasOwn(value, key))) {
    throw new Error(`${label} contains missing or unsupported fields`);
  }
}

function applyEffects(effects, state, catalog = catalogFor()) {
  if (!Array.isArray(effects)) throw new Error("effects must be an array");
  const next = structuredClone(state);
  for (const effect of effects) {
    if (!effect || typeof effect !== "object" || Array.isArray(effect)) throw new Error("effect must be an object");
    switch (effect.op) {
      case "resource.spend":
      case "resource.add": {
        assertOnlyKeys(effect, ["op", "resourceId", "amount"], `effect ${effect.op}`);
        const resource = catalog.resources.get(effect.resourceId);
        if (!resource) throw new Error(`effect references unregistered resource: ${effect.resourceId}`);
        if (!Number.isSafeInteger(effect.amount) || effect.amount <= 0) throw new Error("resource effect amount must be a positive integer");
        const result = next.resources[effect.resourceId] + (effect.op === "resource.add" ? effect.amount : -effect.amount);
        const min = resource.bounds?.min ?? 0;
        const max = resource.bounds?.max ?? Number.MAX_SAFE_INTEGER;
        if (result < min || result > max) throw new Error(`resource effect violates bounds: ${effect.resourceId}`);
        next.resources[effect.resourceId] = result;
        break;
      }
      case "relationship.adjust": {
        assertOnlyKeys(effect, ["op", "characterId", "amount"], `effect ${effect.op}`);
        if (!catalog.npcs.has(effect.characterId)) throw new Error(`effect references unregistered NPC: ${effect.characterId}`);
        if (!Number.isSafeInteger(effect.amount)) throw new Error("relationship effect amount must be an integer");
        next.relationships[effect.characterId] += effect.amount;
        if (next.relationships[effect.characterId] < -100 || next.relationships[effect.characterId] > 100) {
          throw new Error(`relationship effect violates bounds: ${effect.characterId}`);
        }
        break;
      }
      case "flag.set": {
        assertOnlyKeys(effect, ["op", "flagId", "value"], `effect ${effect.op}`);
        if (typeof effect.flagId !== "string" || !effect.flagId || typeof effect.value !== "boolean") {
          throw new Error("flag.set requires a non-empty flagId and boolean value");
        }
        next.flags[effect.flagId] = effect.value;
        break;
      }
      case "unlock": {
        assertOnlyKeys(effect, ["op", "targetType", "targetId"], `effect ${effect.op}`);
        const unlockCollection = effect.targetType === "recipe"
          ? next.unlocks.recipes
          : effect.targetType === "producer"
            ? next.unlocks.producers
          : effect.targetType === "combatEncounter"
            ? next.unlocks.combatEncounters
            : null;
        const registered = effect.targetType === "recipe"
          ? catalog.recipes.has(effect.targetId)
          : effect.targetType === "producer"
            ? catalog.producers.has(effect.targetId)
          : effect.targetType === "combatEncounter"
            ? catalog.encounters.has(effect.targetId)
            : false;
        if (!unlockCollection || !registered) throw new Error(`unlock target is not allow-listed: ${effect.targetType}:${effect.targetId}`);
        unlockCollection[effect.targetId] = true;
        break;
      }
      case "combat.request": {
        assertOnlyKeys(effect, ["op", "encounterId"], `effect ${effect.op}`);
        const encounter = catalog.encounters.get(effect.encounterId);
        if (!encounter) throw new Error(`combat request references unregistered encounter: ${effect.encounterId}`);
        if (!catalog.enemies.has(encounter.enemyId)) throw new Error(`combat encounter references unregistered enemy: ${encounter.enemyId}`);
        if (!catalog.combatProfiles.has(encounter.combatProfileId)) {
          throw new Error(`combat profile is not registered: ${encounter.combatProfileId}`);
        }
        if (!next.unlocks.combatEncounters[effect.encounterId]) throw new Error(`combat encounter is locked: ${effect.encounterId}`);
        if (!evaluateCondition(encounter.availableWhen, next, catalog)) throw new Error(`combat encounter is unavailable: ${effect.encounterId}`);
        next.combatRequests.push({ encounterId: effect.encounterId, combatProfileId: encounter.combatProfileId });
        break;
      }
      default:
        throw new Error(`effect operation is not allow-listed: ${effect.op}`);
    }
  }
  Object.keys(state).forEach((key) => { state[key] = next[key]; });
  return state;
}

function dispatchEvent(event, rules, state, catalog = catalogFor()) {
  if (!event || typeof event !== "object" || typeof event.eventId !== "string" || !event.eventId) {
    throw new Error("event requires a stable eventId");
  }
  if (!["resource.totalAtLeast", "conversation.choice"].includes(event.type)) {
    throw new Error(`event type is not allow-listed: ${event.type}`);
  }
  const fingerprint = JSON.stringify(canonicalize(event));
  const previous = state.events.processed.find((entry) => entry.eventId === event.eventId);
  if (previous) {
    if (previous.fingerprint !== fingerprint) throw new Error(`eventId reused with different payload: ${event.eventId}`);
    return {
      eventId: event.eventId,
      payload: structuredClone(event),
      duplicate: true,
      evaluations: [],
      firedRuleIds: [],
      orderedEffects: [],
      resultingState: stateView(state)
    };
  }

  const draft = structuredClone(state);
  if (event.type === "resource.totalAtLeast") {
    if (typeof event.resourceId !== "string" || !Number.isSafeInteger(event.total) ||
        !Number.isSafeInteger(event.delta) || event.delta <= 0) {
      throw new Error("resource.totalAtLeast requires resourceId, integer total, and positive integer delta");
    }
    const resource = catalog.resources.get(event.resourceId);
    if (!resource) throw new Error(`event references unregistered resource: ${event.resourceId}`);
    if (draft.resources[event.resourceId] + event.delta !== event.total) {
      throw new Error(`resource event total does not match applied delta: ${event.resourceId}`);
    }
    applyEffects([{ op: "resource.add", resourceId: event.resourceId, amount: event.delta }], draft, catalog);
  } else {
    if (typeof event.conversationId !== "string" || typeof event.choiceId !== "string") {
      throw new Error("conversation.choice requires conversationId and choiceId");
    }
    draft.conversationChoices[event.conversationId] = event.choiceId;
  }

  const evaluations = [];
  const firedRuleIds = [];
  const orderedEffects = [];
  for (const rule of rules) {
    const trigger = rule.trigger || {};
    const triggerMatched = trigger.event === event.type &&
      Object.entries(trigger).every(([key, expected]) => {
        if (key === "event") return true;
        if (key === "value") return typeof event.total === "number" && event.total >= expected;
        return event[key] === expected;
      });
    const alreadyFired = rule.once && draft.events.firedOnceRules.includes(rule.id);
    const conditionResult = triggerMatched && !alreadyFired
      ? evaluateCondition(rule.when || { all: [] }, draft, catalog)
      : null;
    const evaluation = {
      ruleId: rule.id,
      triggerMatched,
      skippedAsAlreadyFired: Boolean(alreadyFired),
      conditionResult
    };
    evaluations.push(evaluation);
    if (!triggerMatched || alreadyFired || !conditionResult) continue;

    applyEffects(rule.effects || [], draft, catalog);
    if (rule.once) draft.events.firedOnceRules.push(rule.id);
    firedRuleIds.push(rule.id);
    orderedEffects.push(...(rule.effects || []).map((effect) => ({ ruleId: rule.id, effect: structuredClone(effect) })));
  }

  draft.events.processed.push({ eventId: event.eventId, fingerprint });
  const trace = {
    eventId: event.eventId,
    payload: structuredClone(event),
    duplicate: false,
    evaluations,
    firedRuleIds,
    orderedEffects,
    resultingState: stateView(draft)
  };
  draft.events.log.push(trace);
  Object.keys(state).forEach((key) => { state[key] = draft[key]; });
  return trace;
}

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value).sort().map((key) => [key, canonicalize(value[key])])
    );
  }
  return value;
}

function stateView(state) {
  return {
    resources: structuredClone(state.resources),
    relationships: structuredClone(state.relationships),
    flags: structuredClone(state.flags),
    unlocks: structuredClone(state.unlocks),
    conversationChoices: structuredClone(state.conversationChoices)
  };
}

function enterStoryNode(story, nodeId, state, conversations, catalog) {
  const node = story.nodes.find((record) => record.id === nodeId);
  if (!node) throw new Error(`story node is not registered: ${nodeId}`);
  let runtime = state.story.runtime;
  runtime.currentNodeId = node.id;
  runtime.currentDialogueId = null;
  runtime.currentDialogueNodeId = null;
  runtime.visits.push(node.id);
  state.story.visited[node.id] = true;

  if (node.type === "storyBeat") {
    runtime.pendingInput = { kind: "continue" };
  } else if (node.type === "decision") {
    runtime.pendingInput = { kind: "storyChoice" };
  } else if (node.type === "conversation") {
    const conversation = conversations.find((record) => record.id === node.conversationId);
    if (!conversation) throw new Error(`conversation is not registered: ${node.conversationId}`);
    const availability = checkAvailability(conversation.entryCondition || { all: [] }, state, catalog);
    if (!availability.available) {
      runtime.pendingInput = { kind: "blocked", reason: availability.reason };
      return availability;
    }
    runtime.currentDialogueId = conversation.id;
    runtime.currentDialogueNodeId = conversation.startNodeId;
    setDialogueInput(conversation, runtime);
  } else if (node.type === "outcome") {
    if (!runtime.appliedOutcomeNodeIds.includes(node.id)) {
      applyEffects(node.effects || [], state, catalog);
      runtime = state.story.runtime;
      runtime.appliedOutcomeNodeIds.push(node.id);
    }
    runtime.pendingInput = node.transitions?.length ? { kind: "continue" } : { kind: "complete" };
  } else {
    throw new Error(`story node type is not supported: ${node.type}`);
  }
  return { available: true, reason: null };
}

function setDialogueInput(conversation, runtime) {
  const node = conversation.nodes.find((record) => record.id === runtime.currentDialogueNodeId);
  if (!node) throw new Error(`dialogue node is not registered: ${runtime.currentDialogueNodeId}`);
  runtime.pendingInput = node.choices?.length
    ? { kind: "conversationChoice", conversationId: conversation.id, nodeId: node.id }
    : { kind: "continueConversation", conversationId: conversation.id, nodeId: node.id };
}

function beginStory(story, state, conversations, catalog) {
  if (state.story.runtime.currentNodeId) throw new Error("story has already started");
  return enterStoryNode(story, story.startNodeId, state, conversations, catalog);
}

function advanceStory(story, state, conversations, catalog) {
  const runtime = state.story.runtime;
  const node = story.nodes.find((record) => record.id === runtime.currentNodeId);
  if (!node) throw new Error("story has no current node");
  if (runtime.pendingInput?.kind === "complete") return { status: "complete" };
  if (runtime.pendingInput?.kind === "continue") {
    if (node.transitions?.length !== 1) {
      return { status: node.transitions?.length ? "branch_required" : "complete" };
    }
    enterStoryNode(story, node.transitions[0].to, state, conversations, catalog);
    return { status: runtime.pendingInput.kind === "complete" ? "complete" : "advanced" };
  }
  if (runtime.pendingInput?.kind === "continueConversation") {
    if (node.transitions?.length !== 1) throw new Error(`conversation story node needs one continuation: ${node.id}`);
    enterStoryNode(story, node.transitions[0].to, state, conversations, catalog);
    return { status: "advanced" };
  }
  return { status: "waiting", pendingInput: structuredClone(runtime.pendingInput) };
}

function selectConversationChoice(conversation, choiceId, eventId, rules, state, conversations, catalog) {
  const runtime = state.story.runtime;
  const event = {
    eventId,
    type: "conversation.choice",
    conversationId: conversation.id,
    choiceId
  };
  const fingerprint = JSON.stringify(canonicalize(event));
  const previous = state.events.processed.find((entry) => entry.eventId === eventId);
  if (previous) {
    if (previous.fingerprint !== fingerprint) throw new Error(`eventId reused with different payload: ${eventId}`);
    return { duplicate: true };
  }
  if (runtime.pendingInput?.kind !== "conversationChoice" ||
      runtime.pendingInput.conversationId !== conversation.id) {
    throw new Error("story is not waiting for this conversation choice");
  }
  const node = conversation.nodes.find((record) => record.id === runtime.currentDialogueNodeId);
  const choice = node?.choices?.find((record) => record.id === choiceId);
  if (!choice) throw new Error(`conversation choice is not available: ${choiceId}`);
  const availability = checkAvailability(choice.when || { all: [] }, state, catalog);
  if (!availability.available) return availability;

  const draft = structuredClone(state);
  const eventTrace = dispatchEvent(event, rules, draft, catalog);
  applyEffects(choice.effects || [], draft, catalog);
  draft.story.runtime.currentDialogueNodeId = choice.to;
  setDialogueInput(conversation, draft.story.runtime);
  Object.keys(state).forEach((key) => { state[key] = draft[key]; });
  return { available: true, duplicate: eventTrace.duplicate, eventTrace };
}

function selectStoryChoice(story, nodeId, choiceId, eventId, state, conversations, catalog) {
  const runtime = state.story.runtime;
  const fingerprint = JSON.stringify(canonicalize({ nodeId, choiceId }));
  const previous = runtime.processedChoiceInputs.find((entry) => entry.eventId === eventId);
  if (previous) {
    if (previous.fingerprint !== fingerprint) throw new Error(`choice eventId reused with different input: ${eventId}`);
    return { duplicate: true };
  }
  const source = story.nodes.find((record) => record.id === nodeId);
  const choice = source?.choices?.find((record) => record.id === choiceId);
  if (source?.id !== runtime.currentNodeId) throw new Error("story choice node does not match the current node");
  if (source?.type !== "decision" || runtime.pendingInput?.kind !== "storyChoice") {
    throw new Error("story is not waiting for a decision choice");
  }
  if (!choice) throw new Error(`story choice is not available: ${choiceId}`);
  const availability = checkAvailability(choice.when || { all: [] }, state, catalog);
  if (!availability.available) return availability;

  const draft = structuredClone(state);
  applyEffects(choice.effects || [], draft, catalog);
  draft.story.runtime.processedChoiceInputs.push({ eventId, fingerprint });
  enterStoryNode(story, choice.to, draft, conversations, catalog);
  Object.keys(state).forEach((key) => { state[key] = draft[key]; });
  return { available: true, duplicate: false };
}

test("bounded condition DSL evaluates all, any, not, and typed comparisons deterministically", () => {
  const catalog = catalogFor();
  const state = initialState(catalog);
  state.resources.holz = 2;
  state.relationships.juan = 1;
  const expression = {
    all: [
      { path: "resources.holz", op: "gte", value: 2 },
      { any: [
        { path: "relationships.juan", op: "eq", value: 1 },
        { path: "flags.juan_listened", op: "eq", value: true }
      ] },
      { not: { path: "story.visited.path_repaired", op: "eq", value: true } }
    ]
  };
  assert.equal(evaluateCondition(expression, state, catalog), true);
  assert.equal(evaluateCondition(expression, state, catalog), true);
});

test("valid unmet conditions block choices with a stable explanation", () => {
  const catalog = catalogFor();
  const state = initialState(catalog);
  const gate = { all: [{ path: "resources.lichttropfen", op: "gte", value: 1 }] };
  assert.deepEqual(checkAvailability(gate, state, catalog), {
    available: false,
    reason: "condition_not_met"
  });
  state.resources.lichttropfen = 1;
  assert.deepEqual(checkAvailability(gate, state, catalog), { available: true, reason: null });
});

test("malformed, missing, wrong-typed, unknown, and oversized conditions are rejected", () => {
  const state = initialState();
  const rejects = (condition, message) => assert.throws(() => evaluateCondition(condition, state), message);
  rejects({ path: "resources.holz", op: "script", value: 1 }, /not allow-listed/);
  rejects({ path: "resources.not_registered", op: "eq", value: 0 }, /unregistered ID/);
  rejects({ path: "flags.missing", op: "eq", value: false }, /state field is missing/);
  rejects({ path: "resources.holz", op: "gte", value: true }, /type does not match/);
  rejects({ path: "resources.holz", op: "eq", value: { script: "run" } }, /unsupported type/);
  rejects({ all: "not-an-array" }, /must be an array/);
  rejects({ all: [], extra: true }, /only path, op, and value/);
  let deep = { path: "resources.holz", op: "gte", value: 0 };
  for (let depth = 0; depth < MAX_CONDITION_DEPTH + 1; depth += 1) deep = { not: deep };
  rejects(deep, /depth limit/);
  rejects({ all: Array.from({ length: MAX_CONDITION_NODES }, () => ({ path: "resources.holz", op: "gte", value: 0 })) }, /node limit/);
});

test("exists checks field presence without requiring a value or a present field", () => {
  const catalog = catalogFor();
  const state = initialState(catalog);
  // A registered flag that is absent from state: not rejected, simply false.
  assert.equal(evaluateCondition({ path: "flags.not_set_yet", op: "exists" }, state, catalog), false);
  // A registered flag that is present: true.
  assert.equal(evaluateCondition({ path: "flags.juan_listened", op: "exists" }, state, catalog), true);
  // exists takes no value: a third key is rejected.
  assert.throws(
    () => evaluateCondition({ path: "flags.juan_listened", op: "exists", value: true }, state, catalog),
    /only path and op/
  );
  // exists still enforces allow-list and registration.
  assert.throws(() => evaluateCondition({ path: "unlocks.unknownScope.x", op: "exists" }, state, catalog), /not allow-listed/);
  assert.throws(() => evaluateCondition({ path: "unlocks.recipes.not_registered", op: "exists" }, state, catalog), /unregistered ID/);
});

test("unlocks.* condition paths resolve against the shared state", () => {
  const catalog = catalogFor();
  const state = initialState(catalog);
  assert.equal(evaluateCondition({ path: "unlocks.recipes.make_lichttropfen", op: "eq", value: false }, state, catalog), true);
  state.unlocks.recipes.make_lichttropfen = true;
  assert.equal(evaluateCondition({ path: "unlocks.recipes.make_lichttropfen", op: "eq", value: true }, state, catalog), true);
  assert.equal(evaluateCondition({ path: "unlocks.recipes.make_lichttropfen", op: "exists" }, state, catalog), true);
});

test("resource, relationship, flag, and unlock effects apply to the shared state", () => {
  const state = initialState();
  state.resources.holz = 3;
  applyEffects([
    { op: "resource.spend", resourceId: "holz", amount: 2 },
    { op: "resource.add", resourceId: "lichttropfen", amount: 1 },
    { op: "relationship.adjust", characterId: "juan", amount: 1 },
    { op: "flag.set", flagId: "juan_listened", value: true },
    { op: "unlock", targetType: "recipe", targetId: "make_lichttropfen" },
    { op: "unlock", targetType: "producer", targetId: "gather_holz" },
    { op: "unlock", targetType: "combatEncounter", targetId: "playground_shadow" }
  ], state);
  assert.equal(state.resources.holz, 1);
  assert.equal(state.resources.lichttropfen, 1);
  assert.equal(state.relationships.juan, 1);
  assert.equal(state.flags.juan_listened, true);
  assert.equal(state.unlocks.recipes.make_lichttropfen, true);
  assert.equal(state.unlocks.producers.gather_holz, true);
  assert.equal(state.unlocks.combatEncounters.playground_shadow, true);
});

test("all effects validate before mutation; invalid operations and bounds leave state unchanged", () => {
  const state = initialState();
  state.resources.holz = 2;
  const original = structuredClone(state);
  assert.throws(() => applyEffects([
    { op: "resource.spend", resourceId: "holz", amount: 1 },
    { op: "resource.add", resourceId: "lichttropfen", amount: 1 },
    { op: "arbitrary.script", code: "run()" }
  ], state), /not allow-listed/);
  assert.deepEqual(state, original);
  assert.throws(() => applyEffects([{ op: "resource.spend", resourceId: "holz", amount: 3 }], state), /violates bounds/);
  assert.deepEqual(state, original);
  assert.throws(() => applyEffects([{ op: "unlock", targetType: "recipe", targetId: "missing" }], state), /not allow-listed/);
  assert.deepEqual(state, original);
});

test("combat requests invoke only registered encounters, enemies, and combat profiles", () => {
  const catalog = catalogFor();
  const state = initialState(catalog);
  state.flags.encounter_playground_shadow_unlocked = true;
  state.unlocks.combatEncounters.playground_shadow = true;
  applyEffects([{ op: "combat.request", encounterId: "playground_shadow" }], state, catalog);
  assert.deepEqual(state.combatRequests, [{
    encounterId: "playground_shadow",
    combatProfileId: "turn_based_core"
  }]);

  const invalidScript = { op: "combat.request", encounterId: "playground_shadow", script: "arbitrary" };
  assert.throws(() => applyEffects([invalidScript], state, catalog), /unsupported fields/);
  assert.throws(() => applyEffects([{ op: "combat.request", encounterId: "missing" }], state, catalog), /unregistered encounter/);

  const unknownEnemyPackage = structuredClone(pkg);
  unknownEnemyPackage["combat.json"].encounters[0].enemyId = "unknown_enemy";
  assert.throws(() => applyEffects(
    [{ op: "combat.request", encounterId: "playground_shadow" }],
    state,
    catalogFor(unknownEnemyPackage)
  ), /unregistered enemy/);

  const unknownProfilePackage = structuredClone(pkg);
  unknownProfilePackage["combat.json"].encounters[0].combatProfileId = "unregistered_profile";
  assert.throws(() => applyEffects(
    [{ op: "combat.request", encounterId: "playground_shadow" }],
    state,
    catalogFor(unknownProfilePackage)
  ), /profile is not registered/);
});

test("event dispatch records matched rules, conditions, ordered effects, and resulting state", () => {
  const catalog = catalogFor();
  const state = initialState(catalog);
  const rules = pkg["rules.json"].rules;
  const resourceTrace = dispatchEvent({
    eventId: "holz-total-2",
    type: "resource.totalAtLeast",
    resourceId: "holz",
    total: 2,
    delta: 2
  }, rules, state, catalog);

  assert.deepEqual(resourceTrace.firedRuleIds, ["unlock_playground_options"]);
  assert.deepEqual(resourceTrace.payload, {
    eventId: "holz-total-2",
    type: "resource.totalAtLeast",
    resourceId: "holz",
    total: 2,
    delta: 2
  });
  assert.equal(resourceTrace.evaluations.find((item) => item.ruleId === "unlock_playground_options").conditionResult, true);
  assert.deepEqual(resourceTrace.orderedEffects.map(({ effect }) => effect.op), ["unlock", "unlock", "flag.set"]);
  assert.equal(resourceTrace.resultingState.unlocks.recipes.make_lichttropfen, true);
  assert.equal(resourceTrace.resultingState.unlocks.combatEncounters.playground_shadow, true);

  const choiceTrace = dispatchEvent({
    eventId: "juan-listen-1",
    type: "conversation.choice",
    conversationId: "juan_playground",
    choiceId: "listen"
  }, rules, state, catalog);
  assert.deepEqual(choiceTrace.firedRuleIds, ["juan_listened"]);
  assert.deepEqual(choiceTrace.orderedEffects.map(({ effect }) => effect.op), ["relationship.adjust", "flag.set"]);
  assert.equal(choiceTrace.resultingState.relationships.juan, 1);
});

test("F0 resource thresholds and NPC choice replay to the recorded observable outcomes", () => {
  const legacyPackage = structuredClone(pkg);
  legacyPackage["resources.json"].resources.push({
    id: "land",
    kind: "stock",
    initialAmount: 0,
    bounds: { min: 0, max: 999 }
  });
  legacyPackage["resources.json"].producers.push(
    { id: "FOREST", kind: "generator" },
    { id: "CREEK", kind: "generator" }
  );
  const catalog = catalogFor(legacyPackage);
  const state = initialState(catalog);
  const rules = [
    {
      id: "land_1",
      once: true,
      trigger: { event: "resource.totalAtLeast", resourceId: "land", value: 1 },
      when: { all: [] },
      effects: [{ op: "unlock", targetType: "producer", targetId: "FOREST" }]
    },
    {
      id: "land_2",
      once: true,
      trigger: { event: "resource.totalAtLeast", resourceId: "land", value: 2 },
      when: { all: [] },
      effects: [{ op: "unlock", targetType: "producer", targetId: "CREEK" }]
    },
    {
      id: "cat_watching",
      once: true,
      trigger: { event: "resource.totalAtLeast", resourceId: "land", value: 3 },
      when: { all: [] },
      effects: [
        { op: "flag.set", flagId: "cat_watching", value: true },
        { op: "flag.set", flagId: "cat_peek_pending", value: true }
      ]
    },
    {
      id: "cat_intro_yes",
      trigger: { event: "conversation.choice", conversationId: "cat_intro", choiceId: "yes" },
      when: { all: [] },
      effects: [
        { op: "flag.set", flagId: "cat_talk_A1_pending", value: true },
        { op: "flag.set", flagId: "cat_intro_yes", value: true }
      ]
    }
  ];

  const resourceEvents = [1, 2, 3].map((total) => ({
    eventId: `land-generated-${total}`,
    type: "resource.totalAtLeast",
    resourceId: "land",
    total,
    delta: 1
  }));
  const resourceTraces = resourceEvents.map((event) => dispatchEvent(event, rules, state, catalog));
  const choiceTrace = dispatchEvent({
    eventId: "cat-intro-choice-0",
    type: "conversation.choice",
    conversationId: "cat_intro",
    choiceId: "yes"
  }, rules, state, catalog);

  assert.deepEqual(resourceTraces.map((trace) => trace.firedRuleIds), [
    ["land_1"],
    ["land_2"],
    ["cat_watching"]
  ]);
  assert.deepEqual(choiceTrace.firedRuleIds, ["cat_intro_yes"]);
  assert.equal(state.resources.land, 3);
  assert.equal(state.unlocks.producers.FOREST, true);
  assert.equal(state.unlocks.producers.CREEK, true);
  assert.equal(state.flags.cat_watching, true);
  assert.equal(state.flags.cat_peek_pending, true);
  assert.equal(state.conversationChoices.cat_intro, "yes");
  assert.equal(state.flags.cat_talk_A1_pending, true);
  assert.equal(state.flags.cat_intro_yes, true);

  const reloaded = JSON.parse(JSON.stringify(state));
  const beforeReplay = structuredClone(reloaded);
  const duplicate = dispatchEvent(resourceEvents[2], rules, reloaded, catalog);
  assert.equal(duplicate.duplicate, true);
  assert.deepEqual(reloaded, beforeReplay);
  assert.deepEqual(choiceTrace.firedRuleIds, ["cat_intro_yes"]);
});

test("event IDs are persistent idempotency keys and reject conflicting payload reuse", () => {
  const catalog = catalogFor();
  const state = initialState(catalog);
  const rules = pkg["rules.json"].rules;
  const event = {
    eventId: "holz-total-2",
    type: "resource.totalAtLeast",
    resourceId: "holz",
    total: 2,
    delta: 2
  };
  dispatchEvent(event, rules, state, catalog);
  const afterFirstDelivery = structuredClone(state);
  assert.equal(dispatchEvent(event, rules, state, catalog).duplicate, true);
  assert.deepEqual(state, afterFirstDelivery);
  const reorderedPayload = Object.fromEntries(Object.entries(event).reverse());
  assert.equal(dispatchEvent(reorderedPayload, rules, state, catalog).duplicate, true);
  assert.deepEqual(state, afterFirstDelivery);
  assert.throws(() => dispatchEvent({ ...event, total: 3 }, rules, state, catalog), /different payload/);
  assert.deepEqual(state, afterFirstDelivery);

  const reloaded = JSON.parse(JSON.stringify(state));
  assert.equal(dispatchEvent(event, rules, reloaded, catalog).duplicate, true);
  assert.deepEqual(reloaded, afterFirstDelivery);
});

test("event/rule order is explicit and unrelated rules do not fire", () => {
  const catalog = catalogFor();
  const state = initialState(catalog);
  state.flags.first_gate = false;
  const orderedRules = [
    {
      id: "open_gate",
      trigger: { event: "conversation.choice", conversationId: "juan_playground", choiceId: "listen" },
      when: { all: [] },
      effects: [{ op: "flag.set", flagId: "first_gate", value: true }]
    },
    {
      id: "follow_gate",
      trigger: { event: "conversation.choice", conversationId: "juan_playground", choiceId: "listen" },
      when: { all: [{ path: "flags.first_gate", op: "eq", value: true }] },
      effects: [{ op: "flag.set", flagId: "second_gate", value: true }]
    },
    {
      id: "unrelated",
      trigger: { event: "resource.totalAtLeast", resourceId: "lichttropfen", value: 9 },
      when: { all: [] },
      effects: [{ op: "flag.set", flagId: "unrelated_fired", value: true }]
    }
  ];
  const trace = dispatchEvent({
    eventId: "juan-listen-ordered",
    type: "conversation.choice",
    conversationId: "juan_playground",
    choiceId: "listen"
  }, orderedRules, state, catalog);
  assert.deepEqual(trace.firedRuleIds, ["open_gate", "follow_gate"]);
  assert.equal(trace.evaluations.find((item) => item.ruleId === "follow_gate").conditionResult, true);
  assert.equal(state.flags.second_gate, true);
  assert.equal(state.flags.unrelated_fired, undefined);
});

test("malformed events fail before state mutation", () => {
  const catalog = catalogFor();
  const state = initialState(catalog);
  const original = structuredClone(state);
  assert.throws(() => dispatchEvent({ type: "conversation.choice" }, [], state, catalog), /stable eventId/);
  assert.throws(() => dispatchEvent({
    eventId: "bad-resource",
    type: "resource.totalAtLeast",
    resourceId: "holz",
    total: 2,
    delta: 1
  }, [], state, catalog), /does not match applied delta/);
  assert.throws(() => dispatchEvent({
    eventId: "unknown-event",
    type: "resource.removed",
    resourceId: "holz",
    total: 0,
    delta: -1
  }, [], state, catalog), /not allow-listed/);
  assert.deepEqual(state, original);
});

test("story, conversation, blocked choice, outcome effect, loop, and save/resume remain deterministic", () => {
  const story = pkg["stories/story_spielplatz.json"].story;
  const conversations = pkg["npcs/juan.json"].conversations;
  const rules = pkg["rules.json"].rules;
  const catalog = catalogFor();
  const state = initialState(catalog);

  beginStory(story, state, conversations, catalog);
  assert.equal(state.story.runtime.currentNodeId, "opening");
  assert.deepEqual(advanceStory(story, state, conversations, catalog), { status: "advanced" });
  assert.equal(state.story.runtime.currentNodeId, "talk_to_juan");
  assert.deepEqual(state.story.runtime.pendingInput, {
    kind: "conversationChoice",
    conversationId: "juan_playground",
    nodeId: "wish"
  });

  const waitingSave = JSON.parse(JSON.stringify(state));
  const resumedAtConversation = JSON.parse(JSON.stringify(waitingSave));
  const conversation = conversations.find((record) => record.id === "juan_playground");
  const listened = selectConversationChoice(
    conversation,
    "listen",
    "juan-listen-story-1",
    rules,
    resumedAtConversation,
    conversations,
    catalog
  );
  assert.equal(listened.available, true);
  assert.equal(resumedAtConversation.relationships.juan, 1);
  assert.equal(resumedAtConversation.story.runtime.currentDialogueNodeId, "thanks");

  const afterEffectSave = JSON.parse(JSON.stringify(resumedAtConversation));
  const resumedAfterEffect = JSON.parse(JSON.stringify(afterEffectSave));
  const afterEffectSnapshot = structuredClone(resumedAfterEffect);
  assert.deepEqual(selectConversationChoice(
    conversation,
    "listen",
    "juan-listen-story-1",
    rules,
    resumedAfterEffect,
    conversations,
    catalog
  ), { duplicate: true });
  assert.deepEqual(resumedAfterEffect, afterEffectSnapshot);

  assert.deepEqual(advanceStory(story, resumedAfterEffect, conversations, catalog), { status: "advanced" });
  assert.equal(resumedAfterEffect.story.runtime.currentNodeId, "repair_choice");
  const blockedSnapshot = structuredClone(resumedAfterEffect);
  assert.deepEqual(selectStoryChoice(
    story,
    "repair_choice",
    "build_path",
    "blocked-build-path",
    resumedAfterEffect,
    conversations,
    catalog
  ), { available: false, reason: "condition_not_met" });
  assert.deepEqual(resumedAfterEffect, blockedSnapshot);

  assert.equal(selectStoryChoice(
    story,
    "repair_choice",
    "gather_first",
    "wait-choice-1",
    resumedAfterEffect,
    conversations,
    catalog
  ).available, true);
  assert.equal(resumedAfterEffect.story.runtime.currentNodeId, "waited");
  assert.deepEqual(advanceStory(story, resumedAfterEffect, conversations, catalog), { status: "advanced" });
  assert.equal(resumedAfterEffect.story.runtime.currentNodeId, "repair_choice");
  assert.deepEqual(
    resumedAfterEffect.story.runtime.visits.filter((id) => id === "repair_choice"),
    ["repair_choice", "repair_choice"]
  );

  applyEffects([{ op: "resource.add", resourceId: "lichttropfen", amount: 1 }], resumedAfterEffect, catalog);
  assert.equal(checkAvailability(
    story.nodes.find((node) => node.id === "repair_choice").choices[0].when,
    resumedAfterEffect,
    catalog
  ).available, true);
  assert.equal(selectStoryChoice(
    story,
    "repair_choice",
    "build_path",
    "build-path-1",
    resumedAfterEffect,
    conversations,
    catalog
  ).available, true);
  assert.equal(resumedAfterEffect.resources.lichttropfen, 0);
  assert.equal(resumedAfterEffect.flags.playground_path_repaired, true);
  assert.equal(resumedAfterEffect.story.runtime.currentNodeId, "path_repaired");

  const completionSave = JSON.parse(JSON.stringify(resumedAfterEffect));
  const resumedAtOutcome = JSON.parse(JSON.stringify(completionSave));
  const outcomeSnapshot = structuredClone(resumedAtOutcome);
  assert.deepEqual(selectStoryChoice(
    story,
    "repair_choice",
    "build_path",
    "build-path-1",
    resumedAtOutcome,
    conversations,
    catalog
  ), { duplicate: true });
  assert.deepEqual(resumedAtOutcome, outcomeSnapshot);
  assert.deepEqual(advanceStory(story, resumedAtOutcome, conversations, catalog), { status: "complete" });
  assert.ok(waitingSave.story.runtime.pendingInput);
  assert.ok(afterEffectSave.events.processed.some((entry) => entry.eventId === "juan-listen-story-1"));
});
