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

/** Minimal empty templates for "New Entity" */
function createEmptyEntity(type, id, packId = "lichtwald") {
  switch (type) {
    case "stories":
      return {
        schemaVersion: SCHEMA_VERSION,
        packId,
        story: {
          id,
          title: { de: "Neue Geschichte", en: "New Story" },
          startNodeId: "start",
          nodes: [
            {
              id: "start",
              type: "storyBeat",
              caption: { de: "Anfang…" },
              transitions: []
            }
          ]
        }
      };
    case "resources":
      return {
        id,
        kind: "stock",
        displayName: { de: id, en: id },
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
            displayName: { de: id, en: id },
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

/** Known effect operations (allow-list) */
const ALLOWED_EFFECTS = [
  "resource.add",
  "resource.spend",
  "relationship.adjust",
  "unlock",
  "flag.set",
  "event.record"
];

/** Known condition operators */
const ALLOWED_OPS = ["eq", "neq", "gt", "gte", "lt", "lte", "exists", "not"];
