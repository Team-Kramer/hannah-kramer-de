/**
 * Shared condition DSL for Lichtwald content packages (PD-01b).
 *
 * The standalone workbench (AI/human editor) and the Godot F4 runtime
 * prototype must agree on the condition operators, the state-path grammar,
 * and the comparison semantics. This module is the single source of truth for
 * that contract on the JavaScript side so the two consumers cannot drift
 * apart. The Godot runtime (Phase E / PD-02) reimplements the same contract
 * in GDScript and is verified against the same JSON fixtures.
 *
 * Canonical operator set (PB-02b): eq, ne, gt, gte, lt, lte, exists.
 *   - `ne` is the canonical spelling (never `neq`).
 *   - `exists` is a structural operator: a leaf is true when the state field
 *     is present at the path. It takes no `value`.
 *   - `not` is a structural wrapper handled by the evaluator, not a leaf op.
 *
 * State path grammar (allow-listed scopes):
 *   resources.<id>                                  -> state.resources[id]
 *   relationships.<id>                              -> state.relationships[id]
 *   flags.<id>                                      -> state.flags[id]
 *   story.visited.<nodeId>                          -> state.story.visited[nodeId]
 *   unlocks.<recipes|producers|combatEncounters>.<id> -> state.unlocks[scope][id]
 *
 * UMD: loads as a browser global (window.ConditionDsl) and as a CommonJS
 * module for the Node test harness.
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.ConditionDsl = factory();
  }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  const COMPARISON_OPERATORS = new Set(["eq", "ne", "gt", "gte", "lt", "lte"]);
  const CONDITION_OPERATORS = new Set([...COMPARISON_OPERATORS, "exists"]);
  const UNLOCK_SCOPES = ["recipes", "producers", "combatEncounters"];

  /**
   * Validate that a condition path is allow-listed and references a
   * registered ID. Does not touch runtime state, so it is safe to call for
   * `exists` (where a missing field must not throw) and for the lenient
   * workbench preview (which uses it to decide whether a path is "known").
   *
   * @throws {Error} when the path is not allow-listed or references an
   *   unregistered ID.
   */
  function validateConditionPath(pathValue, catalog) {
    if (typeof pathValue !== "string") throw new Error("condition.path must be a string");
    const parts = pathValue.split(".");
    const [scope, id, leaf] = parts;
    let registered = null;
    if (scope === "resources" && parts.length === 2) registered = catalog.resources;
    else if (scope === "relationships" && parts.length === 2) registered = catalog.npcs;
    else if (scope === "flags" && parts.length === 2) registered = null;
    else if (scope === "story" && id === "visited" && parts.length === 3) registered = catalog.storyNodes;
    else if (scope === "unlocks" && parts.length === 3 && UNLOCK_SCOPES.includes(id)) {
      registered = id === "recipes" ? catalog.recipes : id === "producers" ? catalog.producers : catalog.encounters;
    } else {
      throw new Error(`condition path is not allow-listed: ${pathValue}`);
    }
    const key = scope === "story" ? leaf : parts.length === 3 ? leaf : id;
    if (registered && !registered.has(key)) {
      throw new Error(`condition references unregistered ID: ${pathValue}`);
    }
  }

  function valuesForPath(pathValue, state) {
    const parts = pathValue.split(".");
    const [scope, id] = parts;
    if (scope === "resources") return state.resources;
    if (scope === "relationships") return state.relationships;
    if (scope === "flags") return state.flags;
    if (scope === "story") return state.story.visited;
    if (scope === "unlocks") return state.unlocks[id];
    return null;
  }

  function keyForPath(pathValue) {
    const parts = pathValue.split(".");
    const [scope] = parts;
    return scope === "story" ? parts[2] : parts.length === 3 ? parts[2] : parts[1];
  }

  /**
   * Read a condition path against a runtime state. Strict: throws when the
   * field is missing or has a non-numeric/boolean type.
   *
   * @returns {number|boolean} the resolved value
   */
  function readConditionPath(pathValue, state, catalog) {
    validateConditionPath(pathValue, catalog);
    const values = valuesForPath(pathValue, state);
    const key = keyForPath(pathValue);
    if (!Object.hasOwn(values, key)) {
      throw new Error(`condition state field is missing: ${pathValue}`);
    }
    const value = values[key];
    if (typeof value !== "number" && typeof value !== "boolean") {
      throw new Error(`condition state field has wrong type: ${pathValue}`);
    }
    return value;
  }

  /**
   * `exists` operator: true when the state field is present at the path.
   * Validates the path (allow-list + registration) but does not throw for a
   * missing field — a missing field simply means the condition is false.
   */
  function conditionPathExists(pathValue, state, catalog) {
    validateConditionPath(pathValue, catalog);
    const values = valuesForPath(pathValue, state);
    return Object.hasOwn(values, keyForPath(pathValue));
  }

  /**
   * Compare a resolved value against an expected value using a comparison
   * operator. `exists` is not handled here (it is a presence check, see
   * `conditionPathExists`).
   */
  function compareConditionValue(actual, operator, expected) {
    switch (operator) {
      case "eq": return actual === expected;
      case "ne": return actual !== expected;
      case "gt": return actual > expected;
      case "gte": return actual >= expected;
      case "lt": return actual < expected;
      case "lte": return actual <= expected;
      default: throw new Error(`condition operator is not allow-listed: ${operator}`);
    }
  }

  return {
    COMPARISON_OPERATORS,
    CONDITION_OPERATORS,
    UNLOCK_SCOPES,
    validateConditionPath,
    readConditionPath,
    conditionPathExists,
    compareConditionValue
  };
});
