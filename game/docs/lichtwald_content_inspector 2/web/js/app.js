/**
 * Lichtwald Content Inspector – Standalone Web Workbench
 * Produces Godot-importable JSON packages. No Godot dependency.
 */

const state = {
  packageName: null,
  manifest: {},
  documents: {},
  entityFiles: { stories: {}, npcs: {} },
  locations: {},
  combat: {},
  resources: {},
  rules: {},
  stories: {},      // id -> full file data
  npcs: {},         // id -> full file data
  locales: {},
  assets: {},
  currentType: "stories",
  currentId: null,
  previewStoryId: null,
  previewNodeId: null,
  previewDialogueNodeId: null,
  previewLocale: "de",
  previewResources: {},
  previewVisited: new Set(),
  dirty: false,
  files: {}         // original relative path -> text (for export)
};

// ---------------------------------------------------------------------------
// DOM refs
// ---------------------------------------------------------------------------
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

const el = {
  btnLoad: $("#btn-load"),
  btnSave: $("#btn-save"),
  btnExportFolder: $("#btn-export-folder"),
  btnValidate: $("#btn-validate"),
  btnNew: $("#btn-new"),
  btnOpenBundle: $("#btn-open-bundle"),
  packageInfo: $("#package-info"),
  entityList: $("#entity-list"),
  entityCount: $("#entity-count"),
  tableTitle: $("#table-title"),
  tableCount: $("#table-count"),
  entityTable: $("#entity-table"),
  inspectorHeader: $("#inspector-header"),
  inspectorForm: $("#inspector-form"),
  rawJson: $("#raw-json"),
  rawStatus: $("#raw-status"),
  validationLog: $("#validation-log"),
  status: $("#status"),
  dirtyIndicator: $("#dirty-indicator"),
  folderInput: $("#folder-input"),
  fileInput: $("#file-input"),
  graphContainer: $("#graph-container"),
  previewStory: $("#preview-story"),
  previewLocale: $("#preview-locale"),
  previewResourceState: $("#preview-resource-state"),
  storyPreview: $("#story-preview")
};

// ---------------------------------------------------------------------------
// Init
// ---------------------------------------------------------------------------
function init() {
  el.btnLoad.addEventListener("click", () => el.folderInput.click());
  el.btnOpenBundle.addEventListener("click", () => el.fileInput.click());
  el.folderInput.addEventListener("change", onFolderSelected);
  el.fileInput.addEventListener("change", onBundleSelected);
  el.btnSave.addEventListener("click", exportPackage);
  el.btnExportFolder.addEventListener("click", exportPackageFolder);
  el.btnValidate.addEventListener("click", runValidation);
  el.btnNew.addEventListener("click", onNewEntity);
  $("#btn-apply-raw").addEventListener("click", applyRawJson);
  $("#btn-revalidate").addEventListener("click", runValidation);
  $("#btn-graph-story").addEventListener("click", () => showStoryGraph());
  $("#btn-graph-deps").addEventListener("click", () => showDependencyGraph());
  $("#btn-graph-fit").addEventListener("click", fitGraph);
  el.previewStory.addEventListener("change", () => resetPreview(el.previewStory.value));
  el.previewLocale.addEventListener("change", () => {
    state.previewLocale = el.previewLocale.value;
    renderPreview();
  });

  // Tabs
  $$("#entity-tabs .tab").forEach(tab => {
    tab.addEventListener("click", () => {
      $$("#entity-tabs .tab").forEach(t => t.classList.remove("active"));
      tab.classList.add("active");
      state.currentType = tab.dataset.type;
      state.currentId = null;
      renderEntityList();
      renderInspector();
      refreshRawJson();
      updateNewEntityButton();
    });
  });

  $$(".etab").forEach(tab => {
    tab.addEventListener("click", () => {
      $$(".etab").forEach(t => t.classList.remove("active"));
      tab.classList.add("active");
      $$(".view").forEach(v => v.classList.remove("active"));
      $(`#view-${tab.dataset.view}`).classList.add("active");
      if (tab.dataset.view === "graph") showStoryGraph();
      if (tab.dataset.view === "preview") renderPreview();
      if (tab.dataset.view === "raw") refreshRawJson();
      if (tab.dataset.view === "table") renderEntityTable();
    });
  });

  setStatus("Standalone workbench ready. Load a package folder to begin.");
}

// ---------------------------------------------------------------------------
// Load package (File System Access via <input webkitdirectory>)
// ---------------------------------------------------------------------------
async function onFolderSelected(e) {
  const fileList = Array.from(e.target.files);
  if (!fileList.length) return;

  try {
    const firstPath = fileList[0].webkitRelativePath;
    const rootName = firstPath.split("/")[0];
    const jsonFiles = fileList.filter((file) => file.name.toLowerCase().endsWith(".json"));
    const entries = await Promise.all(jsonFiles.map(async (file) => ({
      path: file.webkitRelativePath.replace(rootName + "/", ""),
      text: await file.text()
    })));
    const loaded = ContentPackage.parsePackage(entries, rootName);
    installPackage(loaded);
  } catch (error) {
    setStatus(`Package load failed: ${error.message}`);
  } finally {
    e.target.value = "";
  }
}

async function onBundleSelected(e) {
  const file = e.target.files?.[0];
  if (!file) return;

  try {
    const text = await file.text();
    const bundle = JSON.parse(text);
    const packageName = file.name.replace(/\.json$/i, "") || "package";
    const loaded = ContentPackage.parsePackageBundle(bundle, packageName);
    installPackage(loaded);
  } catch (error) {
    setStatus(`Package bundle import failed: ${error.message}`);
  } finally {
    e.target.value = "";
  }
}

function installPackage(loaded) {
  if (state.dirty && !window.confirm("Discard unsaved package changes and load another package?")) {
    setStatus("Package load cancelled; current changes were kept.");
    return;
  }

  state.packageName = loaded.packageName;
  state.manifest = loaded.manifest;
  state.documents = loaded.documents;
  state.entityFiles = loaded.entityFiles;
  state.files = loaded.files;
  state.locations = loaded.locations;
  state.combat = loaded.combat;
  state.resources = loaded.resources;
  state.rules = loaded.rules;
  state.stories = loaded.stories;
  state.npcs = loaded.npcs;
  state.locales = loaded.locales;
  state.assets = loaded.assets;
  state.currentType = "stories";
  state.currentId = null;
  resetPreview(Object.keys(state.stories)[0] || null);
  state.dirty = false;
  updateDirty();
  el.btnSave.disabled = false;
  el.btnExportFolder.disabled = typeof window.showDirectoryPicker !== "function";
  el.btnValidate.disabled = false;
  updateNewEntityButton();

  $$("#entity-tabs .tab").forEach(tab => tab.classList.toggle("active", tab.dataset.type === "stories"));
  el.packageInfo.textContent = `📦 ${state.manifest.packId || loaded.packageName}  · schema v${state.manifest.schemaVersion || "?"}`;
  renderEntityList();
  renderInspector();
  refreshRawJson();
  setStatus(
    `Loaded "${loaded.packageName}" · ${Object.keys(state.documents).length} manifest files, ` +
    `${Object.keys(state.stories).length} stories, ${(state.resources.resources || []).length} resources, ` +
    `${Object.keys(state.npcs).length} NPCs`
  );
}

// ---------------------------------------------------------------------------
// Entity list
// ---------------------------------------------------------------------------
function renderEntityList() {
  el.entityList.innerHTML = "";
  const items = getEntityItems(state.currentType);
  el.entityCount.textContent = `${items.length} entities`;

  for (const item of items) {
    const div = document.createElement("div");
    div.className = "entity-item" + (state.currentId === item.id ? " active" : "");
    div.textContent = item.label;
    div.addEventListener("click", () => selectEntity(item.id));
    el.entityList.appendChild(div);
  }
  renderEntityTable();
}

function getEntityItems(type) {
  if (type === "stories") {
    return Object.entries(state.stories).map(([id, record]) => ({ id, label: id, kind: "story", record }));
  }
  if (type === "locations") {
    return (state.locations.locations || []).map(record => ({
      id: record.id, label: record.id, kind: "location", record
    }));
  }
  if (type === "resources") {
    return [
      ...(state.resources.resources || []).map(record => ({
        id: record.id, label: record.id, kind: "resource", record
      })),
      ...(state.resources.producers || []).map(record => ({
        id: `producer:${record.id}`, label: `⚙ ${record.id}`, kind: "producer", record
      })),
      ...(state.resources.recipes || []).map(record => ({
        id: `recipe:${record.id}`, label: `🧪 ${record.id}`, kind: "recipe", record
      }))
    ];
  }
  if (type === "npcs") {
    return Object.values(state.npcs).flatMap(document => [
      ...(document.npcs || []).map(record => ({
        id: `npc:${record.id}`, label: `👤 ${record.id}`, kind: "npc", record
      })),
      ...(document.conversations || []).map(record => ({
        id: `conversation:${record.id}`, label: `💬 ${record.id}`, kind: "conversation", record
      }))
    ]);
  }
  if (type === "combat") {
    return [
      ...(state.combat.enemies || []).map(record => ({
        id: `enemy:${record.id}`, label: `Enemy · ${record.id}`, kind: "enemy", record
      })),
      ...(state.combat.encounters || []).map(record => ({
        id: `encounter:${record.id}`, label: `Encounter · ${record.id}`, kind: "encounter", record
      }))
    ];
  }
  if (type === "rules") {
    return (state.rules.rules || []).map(record => ({
      id: record.id, label: record.id, kind: "rule", record
    }));
  }
  if (type === "assets") {
    return (state.assets.assets || []).map(record => ({
      id: record.id, label: record.id, kind: "asset", record
    }));
  }
  if (type === "locales") {
    return Object.entries(state.locales).flatMap(([locale, document]) =>
      Object.entries(document.strings || {}).map(([key, value]) => ({
        id: `${locale}:${key}`,
        label: `${locale} · ${key}`,
        kind: "locale string",
        record: { locale, key, value }
      }))
    );
  }
  return [];
}

function renderEntityTable() {
  if (!el.entityTable) return;
  const items = getEntityItems(state.currentType);
  el.tableTitle.textContent = state.currentType[0].toUpperCase() + state.currentType.slice(1);
  el.tableCount.textContent = `${items.length} entities`;
  el.entityTable.replaceChildren();

  if (!items.length) {
    appendText(el.entityTable, "p", "muted", "No entities in this domain.");
    return;
  }

  const fields = [...new Set(items.flatMap(item => Object.keys(item.record || {})))];
  const table = document.createElement("table");
  table.className = "entity-table";
  const header = document.createElement("thead");
  const headerRow = document.createElement("tr");
  for (const label of ["Entity", "Kind", ...fields]) {
    const cell = document.createElement("th");
    cell.scope = "col";
    cell.textContent = label;
    headerRow.appendChild(cell);
  }
  header.appendChild(headerRow);
  table.appendChild(header);

  const body = document.createElement("tbody");
  for (const item of items) {
    const row = document.createElement("tr");
    if (item.id === state.currentId) row.className = "selected";
    row.tabIndex = 0;
    row.addEventListener("click", () => selectEntity(item.id));
    row.addEventListener("keydown", event => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        selectEntity(item.id);
      }
    });
    for (const value of [item.label, item.kind, ...fields.map(field => item.record?.[field])]) {
      const cell = document.createElement("td");
      cell.textContent = value == null
        ? ""
        : typeof value === "object" ? JSON.stringify(value) : String(value);
      row.appendChild(cell);
    }
    body.appendChild(row);
  }
  table.appendChild(body);
  el.entityTable.appendChild(table);
}

function selectEntity(id) {
  state.currentId = id;
  if (state.currentType === "stories") resetPreview(id);
  renderEntityList();
  renderInspector();
  refreshRawJson();
  setStatus(`Selected ${state.currentType} → ${id}`);
}

function updateNewEntityButton() {
  const supportedTypes = new Set(["stories", "resources", "npcs", "rules"]);
  el.btnNew.disabled = !state.manifest.packId || !supportedTypes.has(state.currentType);
}

// ---------------------------------------------------------------------------
// Inspector (simple recursive form)
// ---------------------------------------------------------------------------
function getCurrentEntity() {
  const currentId = state.currentId;
  if (!currentId) return null;

  if (state.currentType === "stories") {
    const data = state.stories[currentId];
    if (!data) return null;
    return {
      data,
      replace(value) {
        const newId = value?.story?.id || value?.id;
        if (newId !== currentId) throw new Error("Stable story IDs cannot be changed in the inspector");
        const path = state.entityFiles.stories[currentId];
        state.stories[currentId] = value;
        if (path) state.documents[path] = value;
      }
    };
  }
  if (state.currentType === "locations") return arrayEntity(state.locations.locations, currentId);
  if (state.currentType === "resources") {
    if (currentId.startsWith("producer:")) return arrayEntity(state.resources.producers, currentId.slice("producer:".length));
    if (currentId.startsWith("recipe:")) return arrayEntity(state.resources.recipes, currentId.slice("recipe:".length));
    return arrayEntity(state.resources.resources, currentId);
  }
  if (state.currentType === "npcs") {
    const separator = currentId.indexOf(":");
    const kind = currentId.slice(0, separator);
    const id = currentId.slice(separator + 1);
    const collection = kind === "npc" ? "npcs" : kind === "conversation" ? "conversations" : null;
    if (!collection) return null;
    for (const document of Object.values(state.npcs)) {
      const entity = arrayEntity(document[collection], id);
      if (entity) return entity;
    }
    return null;
  }
  if (state.currentType === "combat") {
    if (currentId.startsWith("enemy:")) return arrayEntity(state.combat.enemies, currentId.slice("enemy:".length));
    if (currentId.startsWith("encounter:")) return arrayEntity(state.combat.encounters, currentId.slice("encounter:".length));
    return null;
  }
  if (state.currentType === "rules") return arrayEntity(state.rules.rules, currentId);
  if (state.currentType === "assets") return arrayEntity(state.assets.assets, currentId);
  if (state.currentType === "locales") {
    const separator = currentId.indexOf(":");
    const locale = currentId.slice(0, separator);
    const key = currentId.slice(separator + 1);
    const document = state.locales[locale];
    if (!document || !Object.hasOwn(document.strings || {}, key)) return null;
    return {
      data: { locale, key, value: document.strings[key] },
      replace(value) {
        if (value.locale !== locale || value.key !== key || typeof value.value !== "string") {
          throw new Error("Locale edits must keep the selected locale/key and a string value");
        }
        document.strings[key] = value.value;
      }
    };
  }
  return null;
}

function arrayEntity(records, id) {
  const items = records || [];
  const index = items.findIndex(record => record.id === id);
  if (index < 0) return null;
  return {
    data: items[index],
    replace(value) {
      if (!value || value.id !== id) throw new Error("Stable entity IDs cannot be changed in the inspector");
      items[index] = value;
    }
  };
}

function getCurrentData() {
  return getCurrentEntity()?.data || null;
}

function renderInspector() {
  const data = getCurrentData();
  el.inspectorForm.innerHTML = "";

  if (!data) {
    const heading = document.createElement("h2");
    heading.textContent = "Select an entity";
    const description = document.createElement("p");
    description.className = "muted";
    description.textContent = "Nothing selected.";
    el.inspectorHeader.replaceChildren(heading, description);
    return;
  }

  el.inspectorHeader.replaceChildren();
  const heading = document.createElement("h2");
  heading.textContent = state.currentId;
  const description = document.createElement("p");
  description.className = "muted";
  description.textContent = `${state.currentType} · read-only form; use Raw JSON to edit`;
  el.inspectorHeader.append(heading, description);

  buildForm(el.inspectorForm, data, "");
}

function buildForm(parent, obj, path, depth = 0) {
  if (depth > 5) return;
  if (obj === null || obj === undefined) return;

  if (Array.isArray(obj)) {
    obj.forEach((item, i) => {
      const section = document.createElement("div");
      section.className = "form-section";
      const title = document.createElement("h4");
      title.textContent = `[${i}]`;
      section.appendChild(title);
      parent.appendChild(section);
      buildForm(section, item, `${path}[${i}]`, depth + 1);
    });
    return;
  }

  if (typeof obj === "object") {
    for (const [key, value] of Object.entries(obj)) {
      const fullPath = path ? `${path}.${key}` : key;
      if (value !== null && typeof value === "object") {
        const section = document.createElement("div");
        section.className = "form-section";
        const title = document.createElement("h4");
        title.textContent = key;
        section.appendChild(title);
        parent.appendChild(section);
        buildForm(section, value, fullPath, depth + 1);
      } else {
        const row = document.createElement("div");
        row.className = "form-row";
        const label = document.createElement("label");
        label.textContent = key;
        const input = document.createElement("input");
        input.type = "text";
        input.value = value === null || value === undefined ? "" : String(value);
        input.readOnly = true;
        row.appendChild(label);
        row.appendChild(input);
        parent.appendChild(row);
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Raw JSON
// ---------------------------------------------------------------------------
function refreshRawJson() {
  const data = getCurrentData();
  el.rawJson.value = data ? JSON.stringify(data, null, 2) : "";
  el.rawStatus.textContent = "";
}

function applyRawJson() {
  try {
    const parsed = JSON.parse(el.rawJson.value);
    const selected = getCurrentEntity();
    if (!selected) throw new Error("No editable entity is selected");
    selected.replace(parsed);
    markDirty();
    renderEntityList();
    renderInspector();
    refreshRawJson();
    el.rawStatus.textContent = "Applied ✓";
    el.rawStatus.style.color = "var(--success)";
  } catch (err) {
    el.rawStatus.textContent = "Could not apply changes: " + err.message;
    el.rawStatus.style.color = "var(--error)";
  }
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------
function getWorkbenchPackage() {
  return {
    manifest: state.manifest,
    documents: state.documents,
    entityFiles: state.entityFiles,
    locations: state.locations,
    combat: state.combat,
    resources: state.resources,
    rules: state.rules,
    stories: state.stories,
    npcs: state.npcs,
    locales: state.locales,
    assets: state.assets
  };
}

function displayValidation(result, switchToTab = false) {
  const rows = result.messages.map(m => {
    const cls = m.level === "ok" ? "v-ok" : m.level === "warn" ? "v-warn" : "v-error";
    const row = document.createElement("div");
    row.className = cls;
    row.textContent = `[${m.level.toUpperCase()}] ${m.text}`;
    return row;
  });
  el.validationLog.replaceChildren(...rows);

  if (switchToTab) {
    $$(".etab").forEach(t => t.classList.remove("active"));
    $$(".view").forEach(v => v.classList.remove("active"));
    document.querySelector('.etab[data-view="validation"]').classList.add("active");
    $("#view-validation").classList.add("active");
  }
}

function runValidation() {
  const result = validatePackage(getWorkbenchPackage());
  displayValidation(result, true);
  setStatus(result.ok ? "Validation PASSED" : "Validation FAILED – see report");
}

// ---------------------------------------------------------------------------
// Graph
// ---------------------------------------------------------------------------
function showStoryGraph() {
  if (state.currentType === "stories" && state.currentId && state.stories[state.currentId]) {
    renderStoryGraph(el.graphContainer, state.stories[state.currentId]);
  } else {
    // Show first story if available
    const first = Object.keys(state.stories)[0];
    if (first) renderStoryGraph(el.graphContainer, state.stories[first]);
    else el.graphContainer.innerHTML = "<p class='muted' style='padding:2rem'>No story selected / loaded.</p>";
  }
}

function showDependencyGraph() {
  const pkg = {
    entityFiles: state.entityFiles,
    locations: state.locations,
    combat: state.combat,
    resources: state.resources,
    rules: state.rules,
    stories: state.stories,
    npcs: state.npcs,
    locales: state.locales,
    assets: state.assets
  };
  renderDependencyGraph(el.graphContainer, pkg);
}

// ---------------------------------------------------------------------------
// Read-only story preview
// ---------------------------------------------------------------------------
function resetPreview(storyId) {
  state.previewStoryId = storyId;
  const documentData = state.stories[storyId];
  const story = documentData?.story || documentData;
  state.previewNodeId = story?.startNodeId || null;
  state.previewDialogueNodeId = null;
  state.previewVisited = new Set(state.previewNodeId ? [state.previewNodeId] : []);
  state.previewResources = Object.fromEntries(
    (state.resources.resources || []).map(resource => [resource.id, Number(resource.initialAmount) || 0])
  );
  if (!Object.hasOwn(state.locales, state.previewLocale)) {
    state.previewLocale = Object.keys(state.locales)[0] || "";
  }
  renderPreview();
}

function renderPreview() {
  if (!el.storyPreview) return;
  const storyOptions = Object.entries(state.stories);
  const localeOptions = Object.keys(state.locales);
  fillSelect(el.previewStory, storyOptions.map(([id, documentData]) => ({
    value: id,
    label: getLocalizedValue(documentData.story || documentData, "title", id)
  })), state.previewStoryId);
  fillSelect(el.previewLocale, localeOptions.map(locale => ({ value: locale, label: locale })), state.previewLocale);
  renderPreviewResources();

  const storyDocument = state.stories[state.previewStoryId];
  const story = storyDocument?.story || storyDocument;
  const node = story?.nodes?.find(record => record.id === state.previewNodeId);
  el.storyPreview.replaceChildren();
  if (!story || !node) {
    appendText(el.storyPreview, "p", "muted", "Load a package with a story to preview its panels.");
    return;
  }

  const panel = document.createElement("article");
  panel.className = "preview-panel";
  appendText(panel, "p", "preview-kicker", `${story.id} · ${node.id} · ${node.type || "storyBeat"}`);
  appendText(panel, "h2", "preview-title", getLocalizedValue(story, "title", story.id));
  const location = (state.locations.locations || []).find(record => record.id === node.locationId);
  if (location) {
    appendText(panel, "p", "preview-location", getLocalizedText(location.nameKey) || location.id);
  }
  appendPreviewArt(panel, node.illustration?.assetId || node.illustrationAssetId);

  const bodyKey = node.captionKey || node.promptKey || node.textKey;
  if (bodyKey) appendText(panel, "p", "preview-copy", getLocalizedText(bodyKey) || `[Missing text: ${bodyKey}]`);

  if (node.type === "conversation" && node.conversationId) {
    renderConversationPreview(panel, node.conversationId);
  }
  renderEffects(panel, "On entering this panel", node.effects || []);
  renderStoryChoices(panel, story, node);
  renderStoryTransitions(panel, story, node);
  el.storyPreview.appendChild(panel);

  const visited = [...state.previewVisited];
  appendText(el.storyPreview, "p", "preview-visited", `Preview path: ${visited.join(" → ")}`);
}

function fillSelect(select, options, selectedValue) {
  if (!select) return;
  select.replaceChildren();
  for (const optionData of options) {
    const option = document.createElement("option");
    option.value = optionData.value;
    option.textContent = optionData.label;
    select.appendChild(option);
  }
  if (options.some(optionData => optionData.value === selectedValue)) select.value = selectedValue;
}

function renderPreviewResources() {
  if (!el.previewResourceState) return;
  el.previewResourceState.replaceChildren();
  appendText(el.previewResourceState, "strong", "", "Preview starting resources");
  appendText(el.previewResourceState, "span", "muted", " — changing these values only affects condition checks here.");
  for (const resource of state.resources.resources || []) {
    const label = document.createElement("label");
    label.className = "preview-resource";
    const name = getLocalizedText(resource.nameKey) || resource.id;
    appendText(label, "span", "", name);
    const input = document.createElement("input");
    input.type = "number";
    input.min = String(resource.bounds?.min ?? 0);
    if (Number.isFinite(resource.bounds?.max)) input.max = String(resource.bounds.max);
    input.value = String(state.previewResources[resource.id] ?? resource.initialAmount ?? 0);
    input.setAttribute("aria-label", `${name} preview amount`);
    input.addEventListener("change", () => {
      state.previewResources[resource.id] = Number(input.value);
      renderPreview();
    });
    label.appendChild(input);
    el.previewResourceState.appendChild(label);
  }
}

function renderConversationPreview(parent, conversationId) {
  const conversation = Object.values(state.npcs)
    .flatMap(documentData => documentData.conversations || [])
    .find(record => record.id === conversationId);
  const section = document.createElement("section");
  section.className = "preview-dialogue";
  appendText(section, "h3", "", `Conversation · ${conversationId}`);
  if (!conversation) {
    appendText(section, "p", "v-error", `Conversation not found: ${conversationId}`);
    parent.appendChild(section);
    return;
  }

  const dialogueNode = conversation.nodes?.find(node => node.id === state.previewDialogueNodeId) ||
    conversation.nodes?.find(node => node.id === conversation.startNodeId);
  if (!dialogueNode) {
    appendText(section, "p", "v-error", "Conversation has no valid start node.");
    parent.appendChild(section);
    return;
  }
  state.previewDialogueNodeId = dialogueNode.id;
  appendPreviewArt(section, dialogueNode.illustrationAssetId);
  const speaker = findNpc(dialogueNode.speakerId);
  const speakerName = speaker
    ? getLocalizedText(speaker.displayNameKey) || speaker.id
    : dialogueNode.speakerId || "Narrator";
  appendText(section, "p", "preview-speaker", speakerName);
  const dialogueText = getLocalizedText(dialogueNode.textKey);
  if (dialogueText) appendText(section, "p", "preview-copy", dialogueText);

  for (const choice of dialogueNode.choices || []) {
    const choiceCard = document.createElement("div");
    choiceCard.className = "preview-choice";
    appendText(choiceCard, "strong", "", getLocalizedText(choice.labelKey) || choice.id);
    renderCondition(choiceCard, choice.when);
    renderEffects(choiceCard, "Direct choice effects", choice.effects || []);
    const triggeredRules = findTriggeredConversationRules(conversationId, choice.id);
    for (const rule of triggeredRules) {
      appendText(choiceCard, "p", "preview-rule", `Triggered rule · ${rule.id}`);
      renderCondition(choiceCard, rule.when);
      renderEffects(choiceCard, "Rule effects", rule.effects || []);
    }
    if (choice.to) {
      const button = document.createElement("button");
      button.className = "btn small";
      button.textContent = `Preview dialogue → ${choice.to}`;
      const availability = evaluatePreviewCondition(choice.when || { all: [] });
      button.disabled = availability.known && !availability.available;
      button.addEventListener("click", () => {
        state.previewDialogueNodeId = choice.to;
        renderPreview();
      });
      choiceCard.appendChild(button);
    }
    section.appendChild(choiceCard);
  }
  parent.appendChild(section);
}

function renderStoryChoices(parent, story, node) {
  if (!node.choices?.length) return;
  const section = document.createElement("section");
  section.className = "preview-options";
  appendText(section, "h3", "", getLocalizedText(node.promptKey) || "Choices");
  for (const choice of node.choices) {
    const card = document.createElement("div");
    card.className = "preview-choice";
    appendText(card, "strong", "", getLocalizedText(choice.labelKey) || choice.id);
    renderCondition(card, choice.when);
    renderEffects(card, "Changes if selected", choice.effects || []);
    if (choice.to) {
      const target = story.nodes.find(record => record.id === choice.to);
      appendText(card, "p", "preview-target", `Leads to · ${target?.id || choice.to}`);
      const button = document.createElement("button");
      button.className = "btn small";
      button.textContent = `Preview branch → ${target?.id || choice.to}`;
      const availability = evaluatePreviewCondition(choice.when || { all: [] });
      button.disabled = availability.known && !availability.available;
      button.addEventListener("click", () => navigatePreview(choice.to));
      card.appendChild(button);
    }
    section.appendChild(card);
  }
  parent.appendChild(section);
}

function renderStoryTransitions(parent, story, node) {
  if (!node.transitions?.length) return;
  const section = document.createElement("section");
  section.className = "preview-options";
  appendText(section, "h3", "", "Continue");
  for (const transition of node.transitions) {
    const target = story.nodes.find(record => record.id === transition.to);
    const button = document.createElement("button");
    button.className = "btn small preview-transition";
    button.textContent = `Continue → ${target?.id || transition.to}`;
    button.disabled = !target;
    button.addEventListener("click", () => navigatePreview(transition.to));
    section.appendChild(button);
  }
  parent.appendChild(section);
}

function navigatePreview(nodeId) {
  state.previewNodeId = nodeId;
  state.previewDialogueNodeId = null;
  state.previewVisited.add(nodeId);
  renderPreview();
}

function appendPreviewArt(parent, assetId) {
  const section = document.createElement("div");
  section.className = "preview-art";
  if (!assetId) {
    appendText(section, "p", "muted", "No illustration asset assigned.");
  } else {
    const asset = (state.assets.assets || []).find(record => record.id === assetId);
    appendText(section, "strong", "", assetId);
    appendText(section, "p", "muted", asset?.artBrief || "No art brief available.");
    appendText(section, "small", "", asset?.status === "placeholder" ? "Image placeholder · not generated yet" : asset?.path || "Asset reference");
  }
  parent.appendChild(section);
}

function renderCondition(parent, condition) {
  const result = evaluatePreviewCondition(condition || { all: [] });
  const summary = document.createElement("p");
  summary.className = `preview-condition ${result.known ? (result.available ? "available" : "locked") : "unknown"}`;
  const status = !result.known ? "Condition not evaluated" : result.available ? "Available in preview" : "Locked in preview";
  summary.textContent = `${status}${condition && !isEmptyCondition(condition) ? ` · ${describePreviewCondition(condition)}` : " · no extra requirements"}`;
  parent.appendChild(summary);
}

function evaluatePreviewCondition(condition) {
  if (!condition || typeof condition !== "object" || Array.isArray(condition)) return { known: false };
  if (Array.isArray(condition.all)) {
    const children = condition.all.map(evaluatePreviewCondition);
    if (children.some(child => child.known && !child.available)) return { known: true, available: false };
    if (children.every(child => child.known)) return { known: true, available: true };
    return { known: false };
  }
  if (Array.isArray(condition.any)) {
    const children = condition.any.map(evaluatePreviewCondition);
    if (children.some(child => child.known && child.available)) return { known: true, available: true };
    if (children.every(child => child.known)) return { known: true, available: false };
    return { known: false };
  }
  if (condition.not) {
    const nested = evaluatePreviewCondition(condition.not);
    return nested.known ? { known: true, available: !nested.available } : nested;
  }

  const actual = readPreviewPath(condition.path);
  if (actual === undefined || typeof condition.value !== typeof actual) return { known: false };
  switch (condition.op) {
    case "eq": return { known: true, available: actual === condition.value };
    case "ne":
    case "neq": return { known: true, available: actual !== condition.value };
    case "gt": return { known: true, available: actual > condition.value };
    case "gte": return { known: true, available: actual >= condition.value };
    case "lt": return { known: true, available: actual < condition.value };
    case "lte": return { known: true, available: actual <= condition.value };
    default: return { known: false };
  }
}

function readPreviewPath(pathValue) {
  const parts = typeof pathValue === "string" ? pathValue.split(".") : [];
  if (parts.length === 2 && parts[0] === "resources") {
    if (!(state.resources.resources || []).some(record => record.id === parts[1])) return undefined;
    return state.previewResources[parts[1]];
  }
  if (parts.length === 2 && parts[0] === "flags") return false;
  if (parts.length === 3 && parts[0] === "story" && parts[1] === "visited") {
    const story = state.stories[state.previewStoryId]?.story || state.stories[state.previewStoryId];
    if (!story?.nodes?.some(node => node.id === parts[2])) return undefined;
    return state.previewVisited.has(parts[2]);
  }
  if (parts.length === 2 && parts[0] === "relationships") {
    const npc = findNpc(parts[1]);
    return npc ? npc.initialRelationship : undefined;
  }
  return undefined;
}

function describePreviewCondition(condition) {
  if (Array.isArray(condition.all)) return condition.all.map(describePreviewCondition).join(" and ") || "always";
  if (Array.isArray(condition.any)) return condition.any.map(describePreviewCondition).join(" or ") || "never";
  if (condition.not) return `not (${describePreviewCondition(condition.not)})`;
  const actual = readPreviewPath(condition.path);
  const operators = { eq: "=", ne: "≠", neq: "≠", gt: ">", gte: "≥", lt: "<", lte: "≤" };
  const current = actual === undefined ? "unknown" : `current ${actual}`;
  return `${condition.path} ${operators[condition.op] || condition.op} ${condition.value} (${current})`;
}

function isEmptyCondition(condition) {
  return Array.isArray(condition?.all) && condition.all.length === 0;
}

function renderEffects(parent, heading, effects) {
  if (!effects.length) return;
  appendText(parent, "p", "preview-effect-heading", heading);
  const list = document.createElement("ul");
  list.className = "preview-effects";
  for (const effect of effects) {
    const item = document.createElement("li");
    item.textContent = describePreviewEffect(effect);
    list.appendChild(item);
  }
  parent.appendChild(list);
}

function describePreviewEffect(effect) {
  if (effect.op === "resource.add" || effect.op === "resource.spend") {
    const resource = (state.resources.resources || []).find(record => record.id === effect.resourceId);
    const name = getLocalizedText(resource?.nameKey) || effect.resourceId;
    return `${effect.op === "resource.add" ? "Gain" : "Spend"} ${effect.amount} ${name}`;
  }
  if (effect.op === "relationship.adjust") {
    const npc = findNpc(effect.characterId);
    const name = getLocalizedText(npc?.displayNameKey) || effect.characterId;
    const amount = Number(effect.amount);
    return `Relationship with ${name} ${amount >= 0 ? "+" : ""}${amount}`;
  }
  if (effect.op === "flag.set") return `Set flag ${effect.flagId} = ${JSON.stringify(effect.value)}`;
  if (effect.op === "unlock") return `Unlock ${effect.targetType} ${effect.targetId}`;
  return `${effect.op || "Effect"}${effect.targetId ? ` ${effect.targetId}` : ""}`;
}

function findTriggeredConversationRules(conversationId, choiceId) {
  return (state.rules.rules || []).filter(rule =>
    rule.trigger?.event === "conversation.choice" &&
    rule.trigger.conversationId === conversationId &&
    rule.trigger.choiceId === choiceId
  );
}

function findNpc(npcId) {
  return Object.values(state.npcs)
    .flatMap(documentData => documentData.npcs || [])
    .find(record => record.id === npcId);
}

function getLocalizedText(key) {
  if (!key) return "";
  return state.locales[state.previewLocale]?.strings?.[key] ||
    Object.values(state.locales).map(locale => locale.strings?.[key]).find(Boolean) ||
    "";
}

function getLocalizedValue(documentData, field, fallback) {
  const key = documentData?.[`${field}Key`];
  if (key) return getLocalizedText(key) || fallback;
  const value = documentData?.[field];
  if (typeof value === "string") return value;
  if (value && typeof value === "object") return value[state.previewLocale] || Object.values(value).find(item => typeof item === "string") || fallback;
  return fallback;
}

function appendText(parent, tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  element.textContent = text;
  parent.appendChild(element);
  return element;
}

// ---------------------------------------------------------------------------
// New Entity
// ---------------------------------------------------------------------------
function onNewEntity() {
  const type = state.currentType;
  const entityType = ENTITY_TYPES[type];
  if (!entityType || !["stories", "resources", "npcs", "rules"].includes(type)) {
    setStatus(`Creating ${type} entities is not supported yet.`);
    return;
  }
  const id = prompt(`New ${ENTITY_TYPES[type].singular} ID (stable, case-sensitive):`);
  if (!id || !id.trim()) return;
  const cleanId = id.trim();
  if (!/^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(cleanId)) {
    alert("Use letters, numbers, underscores, and hyphens; the ID must start with a letter or number.");
    return;
  }

  const packId = state.manifest.packId || "lichtwald";
  const entity = createEmptyEntity(type, cleanId, packId);

  if (type === "stories") {
    if (Object.hasOwn(state.stories, cleanId)) return alert("ID already exists");
    const filePath = `stories/${cleanId}.json`;
    if (Object.hasOwn(state.documents, filePath)) return alert(`Package file already exists: ${filePath}`);
    registerPackageDocument(filePath, entity);
    state.stories[cleanId] = entity;
    state.entityFiles.stories[cleanId] = filePath;
  } else if (type === "npcs") {
    if (Object.values(state.npcs).some(document => (document.npcs || []).some(npc => npc.id === cleanId))) {
      return alert("ID already exists");
    }
    let target = Object.keys(state.npcs).find(fileId => state.entityFiles.npcs[fileId]);
    if (target) {
      target = state.npcs[target];
    } else {
      const filePath = `npcs/${cleanId}.json`;
      if (Object.hasOwn(state.documents, filePath)) return alert(`Package file already exists: ${filePath}`);
      target = { schemaVersion: state.manifest.schemaVersion || 1, packId, npcs: [], conversations: [] };
      registerPackageDocument(filePath, target);
      state.npcs[cleanId] = target;
      state.entityFiles.npcs[cleanId] = filePath;
    }
    if (!Array.isArray(target.npcs)) target.npcs = [];
    target.npcs.push(entity.npcs[0]);
  } else if (type === "resources") {
    if ((state.resources.resources || []).some(record => record.id === cleanId)) return alert("ID already exists");
    ensurePackageCollection("resources.json", state.resources, "resources");
    if (!state.resources.resources) state.resources.resources = [];
    state.resources.resources.push(entity);
  } else if (type === "rules") {
    if ((state.rules.rules || []).some(record => record.id === cleanId)) return alert("ID already exists");
    ensurePackageCollection("rules.json", state.rules, "rules");
    if (!state.rules.rules) state.rules.rules = [];
    state.rules.rules.push(entity);
  }

  markDirty();
  renderEntityList();
  selectEntity(type === "npcs" ? `npc:${cleanId}` : cleanId);
  setStatus(`Created new ${ENTITY_TYPES[type].singular}: ${cleanId}`);
}

function registerPackageDocument(filePath, documentData) {
  state.documents[filePath] = documentData;
  state.files[filePath] = JSON.stringify(documentData, null, 2);
  if (!state.manifest.files.includes(filePath)) state.manifest.files.push(filePath);
}

function ensurePackageCollection(filePath, currentDocument, collectionName) {
  if (Object.hasOwn(state.documents, filePath)) return;
  const documentData = currentDocument && typeof currentDocument === "object" ? currentDocument : {};
  if (!Array.isArray(documentData[collectionName])) documentData[collectionName] = [];
  documentData.schemaVersion = state.manifest.schemaVersion || 1;
  documentData.packId = state.manifest.packId || "lichtwald";
  registerPackageDocument(filePath, documentData);
  if (collectionName === "resources") state.resources = documentData;
  if (collectionName === "rules") state.rules = documentData;
}

// ---------------------------------------------------------------------------
// Export / Save
// ---------------------------------------------------------------------------
function exportPackage() {
  let url;
  try {
    const bundle = getValidatedPackageBundle();
    if (!bundle) return;
    const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: "application/json" });
    url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${state.packageName || "lichtwald-package"}-export.json`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    markDirty(false);
    setStatus("Exported validated package bundle. Use Open Bundle to reopen it.");
  } catch (error) {
    setStatus(`Package export failed: ${error.message}`);
  } finally {
    if (url) window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}

async function exportPackageFolder() {
  if (typeof window.showDirectoryPicker !== "function") {
    setStatus("Folder export is unavailable in this browser; use Export Bundle instead.");
    return;
  }

  let outputDirectoryName = null;
  try {
    const bundle = getValidatedPackageBundle();
    if (!bundle) return;

    const parentHandle = await window.showDirectoryPicker({ mode: "readwrite" });
    const safePackId = String(state.manifest.packId || "lichtwald").replace(/[^A-Za-z0-9_-]/g, "-");
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    outputDirectoryName = `${safePackId}-${timestamp}`;
    const packageDirectory = await createUniqueDirectory(parentHandle, outputDirectoryName);
    outputDirectoryName = packageDirectory.name || outputDirectoryName;

    for (const [filePath, value] of Object.entries(bundle)) {
      if (filePath === "_meta") continue;
      const pathParts = filePath.split("/");
      const fileName = pathParts.pop();
      let directory = packageDirectory;
      for (const part of pathParts) directory = await directory.getDirectoryHandle(part, { create: true });
      const fileHandle = await directory.getFileHandle(fileName, { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(JSON.stringify(value, null, 2));
      await writable.close();
    }

    markDirty(false);
    setStatus(`Exported validated package to new folder "${outputDirectoryName}".`);
  } catch (error) {
    if (error.name === "AbortError") {
      setStatus("Folder export cancelled; package changes were kept.");
    } else {
      const target = outputDirectoryName ? ` Partial output may remain in "${outputDirectoryName}".` : "";
      setStatus(`Package folder export failed: ${error.message}.${target}`);
    }
  }
}

async function createUniqueDirectory(parentHandle, baseName) {
  for (let suffix = 0; ; suffix++) {
    const name = suffix === 0 ? baseName : `${baseName}-${suffix}`;
    try {
      await parentHandle.getDirectoryHandle(name);
    } catch (error) {
      if (error.name !== "NotFoundError") throw error;
      return parentHandle.getDirectoryHandle(name, { create: true });
    }
  }
}

function getValidatedPackageBundle() {
  const validation = validatePackage(getWorkbenchPackage());
  displayValidation(validation, !validation.ok);
  if (!validation.ok) {
    setStatus("Export blocked: package validation failed. Fix the reported errors before exporting.");
    return null;
  }
  return ContentPackage.createPackageBundle(getWorkbenchPackage());
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function markDirty(flag = true) {
  state.dirty = flag;
  updateDirty();
}

function updateDirty() {
  el.dirtyIndicator.classList.toggle("hidden", !state.dirty);
}

function setStatus(msg) {
  el.status.textContent = msg;
}

// Boot
document.addEventListener("DOMContentLoaded", init);
