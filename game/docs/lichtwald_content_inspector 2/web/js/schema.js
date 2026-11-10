/**
 * Lichtwald Content Schema helpers (v1)
 * Shared vocabulary for the standalone workbench.
 */

const SCHEMA_VERSION = 1;

const ENTITY_TYPES = {
  stories: { label: "Stories", singular: "story", folder: "stories" },
  locations: { label: "Locations", singular: "location", file: "locations.json" },
  resources: { label: "Resources", singular: "resource", file: "resources.json" },
  npcs: { label: "NPCs", singular: "npc", folder: "npcs" },
  combat: { label: "Combat", singular: "combat entity", file: "combat.json" },
  rules: { label: "Rules", singular: "rule", file: "rules.json" },
  assets: { label: "Assets", singular: "asset", file: "assets.json" },
  locales: { label: "Locales", singular: "locale string", folder: "locales" }
};

/**
 * Minimal empty templates for "New Entity".
 * Text and art use the package convention: locale text keys (`*Key`) and
 * asset references (`*AssetId`, `illustration.assetId`) — never inline
 * locale objects. The workbench registers the referenced strings/assets on
 * creation so the package validates immediately.
 */
function createEmptyEntity(type, id, packId = "lichtwald") {
  switch (type) {
    case "stories":
      return {
        schemaVersion: SCHEMA_VERSION,
        packId,
        story: {
          id,
          titleKey: `story.${id}.title`,
          startNodeId: "start",
          nodes: [
            {
              id: "start",
              type: "storyBeat",
              captionKey: `story.${id}.start.caption`,
              illustration: { assetId: `story_${id}_start` },
              transitions: []
            }
          ]
        }
      };
    case "resources":
      return {
        id,
        kind: "stock",
        nameKey: `resource.${id}.name`,
        iconAssetId: `resource_${id}`,
        initialAmount: 0,
        bounds: { min: 0 }
      };
    case "npcs":
      return {
        schemaVersion: SCHEMA_VERSION,
        packId,
        npcs: [
          {
            id,
            displayNameKey: `npc.${id}.name`,
            portraitAssetId: `npc_${id}_portrait`,
            initialRelationship: 0
          }
        ],
        conversations: []
      };
    case "rules":
      return {
        id,
        trigger: { event: "resource.totalAtLeast", resourceId: "lichttropfen", value: 1 },
        when: { all: [] },
        effects: []
      };
    default:
      return { id };
  }
}

/**
 * Locale strings and placeholder assets a freshly created entity of `type`
 * must reference. Used by the workbench so new entities validate immediately.
 */
function entityTemplateRequirements(type, id) {
  switch (type) {
    case "stories":
      return {
        strings: {
          [`story.${id}.title`]: id,
          [`story.${id}.start.caption`]: id
        },
        assets: [
          { id: `story_${id}_start`, type: "image", status: "placeholder", artBrief: `Illustration for story ${id} (start beat).` }
        ]
      };
    case "resources":
      return {
        strings: { [`resource.${id}.name`]: id },
        assets: [
          { id: `resource_${id}`, type: "image", status: "placeholder", artBrief: `Icon for resource ${id}; recognizable at icon size.` }
        ]
      };
    case "npcs":
      return {
        strings: { [`npc.${id}.name`]: id },
        assets: [
          { id: `npc_${id}_portrait`, type: "image", status: "placeholder", artBrief: `Portrait for NPC ${id}.` }
        ]
      };
    default:
      return { strings: {}, assets: [] };
  }
}

/** Known effect operations (allow-list, PB-02c) */
const ALLOWED_EFFECTS = [
  "resource.add",
  "resource.spend",
  "relationship.adjust",
  "unlock",
  "flag.set",
  "event.record",
  "combat.request"
];

/** Known condition operators (allow-list, PB-02b; canonical spelling is `ne`) */
const ALLOWED_OPS = ["eq", "ne", "gt", "gte", "lt", "lte", "exists", "not"];
