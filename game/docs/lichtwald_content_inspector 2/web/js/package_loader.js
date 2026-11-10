/**
 * Manifest-driven JSON package loader shared by the browser and Node tests.
 */
(function registerPackageLoader(global) {
  function safePackagePath(value) {
    if (typeof value !== "string" || !value || value.includes("\\")) {
      throw new Error(`Invalid package path: ${value}`);
    }
    const parts = value.split("/");
    if (value.startsWith("/") || /^[A-Za-z]:/.test(value) ||
        parts.some((part) => !part || part === "." || part === "..")) {
      throw new Error(`Unsafe package path: ${value}`);
    }
    return value;
  }

  function parseJson(text, path) {
    try {
      return JSON.parse(text);
    } catch (error) {
      throw new Error(`Invalid JSON in ${path}: ${error.message}`);
    }
  }

  function parsePackage(entries, packageName = "package") {
    if (!Array.isArray(entries)) throw new Error("Package entries must be an array");
    const files = Object.create(null);
    for (const entry of entries) {
      const path = safePackagePath(entry?.path);
      if (typeof entry.text !== "string") throw new Error(`Package file has no text content: ${path}`);
      if (Object.hasOwn(files, path)) throw new Error(`Duplicate package file: ${path}`);
      files[path] = entry.text;
    }

    if (!Object.hasOwn(files, "manifest.json")) throw new Error("Missing package file: manifest.json");
    const manifest = parseJson(files["manifest.json"], "manifest.json");
    if (!manifest || typeof manifest !== "object" || Array.isArray(manifest)) {
      throw new Error("manifest.json must contain an object");
    }
    if (!Array.isArray(manifest.files)) throw new Error("manifest.json must list its files");

    const documents = Object.create(null);
    const listed = new Set();
    for (const listedPath of manifest.files) {
      const path = safePackagePath(listedPath);
      if (path === "manifest.json") throw new Error("manifest.json must not list itself in manifest.files");
      if (listed.has(path)) throw new Error(`Manifest lists a file more than once: ${path}`);
      listed.add(path);
      if (!Object.hasOwn(files, path)) throw new Error(`Manifest file is missing: ${path}`);
      const document = parseJson(files[path], path);
      if (!document || typeof document !== "object" || Array.isArray(document)) {
        throw new Error(`Package file must contain an object: ${path}`);
      }
      documents[path] = document;
    }

    const stories = Object.create(null);
    const npcs = Object.create(null);
    const locales = Object.create(null);
    const storyFiles = Object.create(null);
    const npcFiles = Object.create(null);
    for (const [path, document] of Object.entries(documents)) {
      if (path.startsWith("stories/") && path.endsWith(".json")) {
        const fallbackId = path.slice("stories/".length, -".json".length);
        const id = document.story?.id || document.id || fallbackId;
        if (Object.hasOwn(stories, id)) throw new Error(`Duplicate story ID in package: ${id}`);
        stories[id] = document;
        storyFiles[id] = path;
      } else if (path.startsWith("npcs/") && path.endsWith(".json")) {
        const fallbackId = path.slice("npcs/".length, -".json".length);
        const id = document.npcs?.[0]?.id || document.id || fallbackId;
        if (Object.hasOwn(npcs, id)) throw new Error(`Duplicate NPC file ID in package: ${id}`);
        npcs[id] = document;
        npcFiles[id] = path;
      } else if (path.startsWith("locales/") && path.endsWith(".json")) {
        const locale = path.slice("locales/".length, -".json".length);
        locales[locale] = document;
      }
    }

    return {
      packageName,
      manifest,
      files,
      documents,
      entityFiles: { stories: storyFiles, npcs: npcFiles },
      locations: documents["locations.json"] || {},
      combat: documents["combat.json"] || {},
      resources: documents["resources.json"] || {},
      rules: documents["rules.json"] || {},
      assets: documents["assets.json"] || {},
      stories,
      npcs,
      locales
    };
  }

  function parsePackageBundle(bundle, packageName = "package") {
    if (!bundle || typeof bundle !== "object" || Array.isArray(bundle)) {
      throw new Error("Package bundle must contain a JSON object");
    }
    if (!Object.hasOwn(bundle, "manifest.json")) throw new Error("Package bundle is missing manifest.json");
    const manifest = bundle["manifest.json"];
    if (!manifest || typeof manifest !== "object" || Array.isArray(manifest)) {
      throw new Error("Package bundle manifest.json must contain an object");
    }
    if (!Array.isArray(manifest.files)) throw new Error("Package bundle manifest.json must list its files");

    const entries = [{ path: "manifest.json", text: JSON.stringify(manifest) }];
    for (const filePath of manifest.files) {
      safePackagePath(filePath);
      if (filePath === "manifest.json") throw new Error("manifest.json must not list itself in manifest.files");
      if (!Object.hasOwn(bundle, filePath)) throw new Error(`Package bundle is missing manifest file: ${filePath}`);
      entries.push({ path: filePath, text: JSON.stringify(bundle[filePath]) });
    }
    const loaded = parsePackage(entries, packageName);
    if (bundle._meta !== undefined) {
      if (!bundle._meta || typeof bundle._meta !== "object" || Array.isArray(bundle._meta)) {
        throw new Error("Package bundle _meta must contain an object");
      }
      const { packageFingerprint, sourceFingerprint } = bundle._meta;
      if (packageFingerprint &&
          packageFingerprint !== fingerprintPackage(loaded.manifest, loaded.documents)) {
        throw new Error("Package bundle fingerprint does not match its content");
      }
      loaded.bundleMeta = {
        format: bundle._meta.format,
        packageFingerprint,
        sourceFingerprint
      };
    }
    return loaded;
  }

  function createPackageBundle(pkg) {
    if (!pkg || typeof pkg !== "object" || !pkg.manifest || !Array.isArray(pkg.manifest.files)) {
      throw new Error("Cannot export package without a manifest file list");
    }
    const files = new Set();
    const bundle = {
      _meta: {
        exportedAt: new Date().toISOString(),
        tool: "Lichtwald Content Inspector v0.2",
        format: "lichtwald-package-bundle-v1",
        sourceFingerprint: pkg.baseFingerprint ||
          fingerprintPackage(pkg.manifest, pkg.documents)
      },
      "manifest.json": JSON.parse(JSON.stringify(pkg.manifest))
    };

    for (const filePath of pkg.manifest.files) {
      safePackagePath(filePath);
      if (filePath === "manifest.json") throw new Error("manifest.json must not list itself in manifest.files");
      if (files.has(filePath)) throw new Error(`Manifest lists a file more than once: ${filePath}`);
      files.add(filePath);
      if (!Object.hasOwn(pkg.documents || {}, filePath)) {
        throw new Error(`Export failed: manifest file is not loaded: ${filePath}`);
      }
      bundle[filePath] = JSON.parse(JSON.stringify(pkg.documents[filePath]));
    }
    bundle._meta.packageFingerprint = fingerprintPackage(pkg.manifest, pkg.documents);
    return bundle;
  }

  function fingerprintPackage(manifest, documents) {
    const orderedDocuments = Object.keys(documents || {}).sort().map(filePath =>
      [filePath, documents[filePath]]
    );
    const text = JSON.stringify(canonicalize({ manifest, documents: orderedDocuments }));
    let hash = 0xcbf29ce484222325n;
    for (let index = 0; index < text.length; index += 1) {
      hash ^= BigInt(text.charCodeAt(index));
      hash = BigInt.asUintN(64, hash * 0x100000001b3n);
    }
    return `fnv1a64:${hash.toString(16).padStart(16, "0")}`;
  }

  function canonicalize(value) {
    if (Array.isArray(value)) return value.map(canonicalize);
    if (!value || typeof value !== "object") return value;
    return Object.fromEntries(
      Object.keys(value).sort().map(key => [key, canonicalize(value[key])])
    );
  }

  const api = { parsePackage, parsePackageBundle, createPackageBundle, fingerprintPackage };
  global.ContentPackage = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(globalThis);
