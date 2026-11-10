/**
 * Conservative three-way package-document merge for human/AI co-editing.
 * Entity arrays merge by stable ID; ambiguous ID changes and overlapping edits block apply.
 */
(function registerPackageMerge(global) {
  const MISSING = Symbol("missing");

  function mergePackageDocuments(baseDocuments, localDocuments, incomingDocuments) {
    const conflicts = [];
    const paths = [baseDocuments, localDocuments, incomingDocuments].map(documents =>
      Object.keys(documents || {}).sort()
    );
    if (!sameArray(paths[0], paths[1]) || !sameArray(paths[0], paths[2])) {
      return {
        documents: null,
        conflicts: [{
          path: "manifest.files",
          reason: "Package file lists differ; adding or removing package files requires a manual merge."
        }],
        localChanges: diffDocuments(baseDocuments, localDocuments),
        incomingChanges: diffDocuments(baseDocuments, incomingDocuments)
      };
    }

    const referenceDocuments = {};
    for (const [label, documents] of [
      ["base", baseDocuments],
      ["local", localDocuments],
      ["incoming", incomingDocuments]
    ]) {
      for (const [filePath, document] of Object.entries(documents)) {
        referenceDocuments[`${label}/${filePath}`] = document;
      }
    }

    for (const filePath of paths[0]) {
      collectPotentialRenames(
        baseDocuments[filePath], localDocuments[filePath], filePath, "local", conflicts, referenceDocuments
      );
      collectPotentialRenames(
        baseDocuments[filePath], incomingDocuments[filePath], filePath, "incoming", conflicts, referenceDocuments
      );
    }
    if (conflicts.length) {
      return {
        documents: null,
        conflicts,
        localChanges: diffDocuments(baseDocuments, localDocuments),
        incomingChanges: diffDocuments(baseDocuments, incomingDocuments)
      };
    }

    const documents = {};
    for (const filePath of paths[0]) {
      documents[filePath] = mergeValue(
        baseDocuments[filePath],
        localDocuments[filePath],
        incomingDocuments[filePath],
        filePath,
        conflicts,
        baseDocuments
      );
    }
    return {
      documents: conflicts.length ? null : documents,
      conflicts,
      localChanges: diffDocuments(baseDocuments, localDocuments),
      incomingChanges: diffDocuments(baseDocuments, incomingDocuments)
    };
  }

  function mergeValue(base, local, incoming, path, conflicts, referenceDocuments) {
    if (deepEqual(local, base)) return clone(incoming);
    if (deepEqual(incoming, base)) return clone(local);
    if (deepEqual(local, incoming)) return clone(local);

    if (isRecord(base) && isRecord(local) && isRecord(incoming)) {
      const merged = {};
      const keys = new Set([...Object.keys(base), ...Object.keys(local), ...Object.keys(incoming)]);
      for (const key of keys) {
        const value = mergeValue(
          Object.hasOwn(base, key) ? base[key] : MISSING,
          Object.hasOwn(local, key) ? local[key] : MISSING,
          Object.hasOwn(incoming, key) ? incoming[key] : MISSING,
          `${path}.${key}`,
          conflicts,
          referenceDocuments
        );
        if (value !== MISSING) merged[key] = value;
      }
      return merged;
    }

    if ([base, local, incoming].every(value => Array.isArray(value) || value === MISSING) &&
        [base, local, incoming].some(Array.isArray) &&
        [base, local, incoming].filter(Array.isArray).every(isEntityArray)) {
      return mergeEntityArray(base, local, incoming, path, conflicts, referenceDocuments);
    }

    if ([base, local, incoming].some(value => value === MISSING)) {
      conflicts.push({
        path,
        reason: "One branch removed a value that the other branch changed.",
        local: displayValue(local),
        incoming: displayValue(incoming)
      });
      return clone(local);
    }

    conflicts.push({
      path,
      reason: "Both branches changed this value differently.",
      local: displayValue(local),
      incoming: displayValue(incoming)
    });
    return clone(local);
  }

  function mergeEntityArray(base, local, incoming, path, conflicts, referenceDocuments) {
    const baseRows = asEntityMap(base);
    const localRows = asEntityMap(local);
    const incomingRows = asEntityMap(incoming);
    if (!baseRows || !localRows || !incomingRows) {
      conflicts.push({ path, reason: "Entity array has missing or duplicate stable IDs." });
      return clone(local);
    }

    const ids = [...new Set([
      ...(Array.isArray(base) ? base.map(record => record.id) : []),
      ...(Array.isArray(local) ? local.map(record => record.id) : []),
      ...(Array.isArray(incoming) ? incoming.map(record => record.id) : [])
    ])];
    const result = [];
    for (const id of ids) {
      const baseValue = baseRows.has(id) ? baseRows.get(id) : MISSING;
      const localValue = localRows.has(id) ? localRows.get(id) : MISSING;
      const incomingValue = incomingRows.has(id) ? incomingRows.get(id) : MISSING;
      const value = mergeValue(
        baseValue,
        localValue,
        incomingValue,
        `${path}[id=${id}]`,
        conflicts,
        referenceDocuments
      );
      if (value !== MISSING) result.push(value);
    }
    return result;
  }

  function collectRenameConflicts(base, branch, path, label, conflicts, referenceDocuments) {
    const baseRows = asEntityMap(base);
    const branchRows = asEntityMap(branch);
    if (!baseRows || !branchRows) return;
    const removed = [...baseRows.keys()].filter(id => !branchRows.has(id));
    const added = [...branchRows.keys()].filter(id => !baseRows.has(id));
    if (!removed.length || !added.length) return;
    for (const oldId of removed) {
      conflicts.push({
        path,
        reason: `Possible ${label} entity ID rename or delete-and-add; references require review.`,
        fromId: oldId,
        toIds: added,
        references: findIdMentions(referenceDocuments, oldId)
      });
    }
  }

  function collectPotentialRenames(base, branch, path, label, conflicts, referenceDocuments) {
    if (Array.isArray(base) && Array.isArray(branch) && isEntityArray(base) && isEntityArray(branch)) {
      collectRenameConflicts(base, branch, path, label, conflicts, referenceDocuments);
      return;
    }
    if (!isRecord(base) || !isRecord(branch)) return;
    if (typeof base.id === "string" && typeof branch.id === "string" && base.id !== branch.id) {
      conflicts.push({
        path: `${path}.id`,
        reason: `Possible ${label} stable-ID rename; references require review.`,
        fromId: base.id,
        toIds: [branch.id],
        references: findIdMentions(referenceDocuments, base.id)
      });
    }
    for (const key of Object.keys(base)) {
      if (Object.hasOwn(branch, key)) {
        collectPotentialRenames(base[key], branch[key], `${path}.${key}`, label, conflicts, referenceDocuments);
      }
    }
  }

  function diffDocuments(base, branch) {
    const changed = [];
    const filePaths = new Set([...Object.keys(base || {}), ...Object.keys(branch || {})]);
    for (const filePath of filePaths) {
      if (!Object.hasOwn(base || {}, filePath) || !Object.hasOwn(branch || {}, filePath)) {
        changed.push(filePath);
      } else {
        collectDiffPaths(base[filePath], branch[filePath], filePath, changed);
      }
    }
    return [...new Set(changed)].sort();
  }

  function collectDiffPaths(base, branch, path, output) {
    if (deepEqual(base, branch)) return;
    if (isRecord(base) && isRecord(branch)) {
      const keys = new Set([...Object.keys(base), ...Object.keys(branch)]);
      for (const key of keys) {
        if (!Object.hasOwn(base, key) || !Object.hasOwn(branch, key)) {
          output.push(`${path}.${key}`);
        } else {
          collectDiffPaths(base[key], branch[key], `${path}.${key}`, output);
        }
      }
      return;
    }
    if (Array.isArray(base) && Array.isArray(branch) &&
        [...base, ...branch].every(record => isRecord(record) && typeof record.id === "string")) {
      const baseRows = asEntityMap(base);
      const branchRows = asEntityMap(branch);
      if (baseRows && branchRows) {
        const ids = new Set([...baseRows.keys(), ...branchRows.keys()]);
        for (const id of ids) {
          if (!baseRows.has(id) || !branchRows.has(id)) output.push(`${path}[id=${id}]`);
          else collectDiffPaths(baseRows.get(id), branchRows.get(id), `${path}[id=${id}]`, output);
        }
        return;
      }
    }
    output.push(path);
  }

  function findIdMentions(documents, id) {
    const references = [];
    function visit(value, path, parentKey = "") {
      if (value === id && parentKey !== "id") references.push(path);
      if (Array.isArray(value)) {
        value.forEach((item, index) => visit(item, `${path}[${index}]`));
      } else if (isRecord(value)) {
        for (const [key, nested] of Object.entries(value)) {
          const childPath = `${path}.${key}`;
          if (key === id) references.push(childPath);
          visit(nested, childPath, key);
        }
      }
    }
    for (const [filePath, document] of Object.entries(documents || {})) visit(document, filePath);
    return [...new Set(references)].sort();
  }

  function asEntityMap(value) {
    if (!Array.isArray(value)) return new Map();
    const result = new Map();
    for (const record of value) {
      if (!isRecord(record) || typeof record.id !== "string" || result.has(record.id)) return null;
      result.set(record.id, record);
    }
    return result;
  }

  function isEntityArray(value) {
    return Array.isArray(value) && value.every(record => isRecord(record) && typeof record.id === "string");
  }

  function isRecord(value) {
    return value !== null && typeof value === "object" && !Array.isArray(value) && value !== MISSING;
  }

  function deepEqual(left, right) {
    if (left === right) return true;
    if (left === MISSING || right === MISSING || left === null || right === null ||
        typeof left !== "object" || typeof right !== "object") return false;
    if (Array.isArray(left) !== Array.isArray(right)) return false;
    if (Array.isArray(left)) {
      return left.length === right.length && left.every((value, index) => deepEqual(value, right[index]));
    }
    const leftKeys = Object.keys(left);
    const rightKeys = Object.keys(right);
    return leftKeys.length === rightKeys.length &&
      leftKeys.every(key => Object.hasOwn(right, key) && deepEqual(left[key], right[key]));
  }

  function sameArray(left, right) {
    return left.length === right.length && left.every((value, index) => value === right[index]);
  }

  function clone(value) {
    return value === MISSING ? MISSING : JSON.parse(JSON.stringify(value));
  }

  function displayValue(value) {
    if (value === MISSING) return "<removed>";
    return JSON.stringify(value);
  }

  global.ContentMerge = { mergePackageDocuments, diffDocuments };
})(globalThis);
