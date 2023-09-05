// @ts-check
const execa = require("execa");
const path = require("path");
const fs = require("fs");
const prettier = require("prettier");
const merge = require("lodash.merge");
const resolveFrom = require("resolve-from");
const jju = require("jju");

/**
 * @typedef {{ path: string }} Reference
 * @typedef {{
 *   extends?: string;
 *   compilerOptions?: Record<string, any>;
 *   references?: Reference[];
 * }} TSConfig Parsed tsconfig.json contents
 * @typedef {{
 *   filePath: string;
 *   content: string;
 *   config: TSConfig;
 * }} TSConfigInfo tsconfig.json with file path, original content, and parsed content
 */

/** Repo root */
const root = path.resolve(__dirname, "..");
/** @type {Record<string, TSConfig>} Cache of tsconfig "extends" values */
const extendsCache = {};

function getTSConfigPath(packageLocation) {
  return path.join(root, packageLocation, "tsconfig.json");
}

function isTSPackage(packageLocation) {
  return fs.existsSync(getTSConfigPath(packageLocation));
}

/**
 * Read a tsconfig.json file, resolving and merging the "extends" config.
 * @param {string} filePath Path to tsconfig.json
 * @returns {TSConfigInfo}
 */
function getTSConfig(filePath) {
  const content = fs.existsSync(filePath)
    ? fs.readFileSync(filePath, "utf8")
    : "";
  // Parse with jju to allow comments
  /** @type {TSConfig} */
  let config = content ? jju.parse(content) : {};
  if (config.extends) {
    if (!extendsCache[config.extends]) {
      const extendsPath = resolveFrom(path.dirname(filePath), config.extends);
      extendsCache[config.extends] = getTSConfig(extendsPath).config;
    }
    config = merge(extendsCache[config.extends], config);
  }
  return { filePath, config, content };
}

function getAbsoluteLocation(location, posix = false) {
  return posix ? path.posix.join(root, location) : path.join(root, location);
}

function getRelativeLocation(fromLocation, toLocation, posix = false) {
  return path.posix.relative(
    getAbsoluteLocation(fromLocation, posix),
    getAbsoluteLocation(toLocation, posix)
  );
}

/**
 * @param {TSConfigInfo} param0
 * @param {TSConfig} mergeConfig
 */
async function updateTSConfig({ filePath, content }, mergeConfig) {
  // Use the original config (without expanded extends) for updating
  const newConfig = { ...jju.parse(content), ...mergeConfig };
  // Preserve formatting when updating
  const newContent = jju.update(content, newConfig, {
    mode: "cjson",
    quote_keys: true,
  });
  const prettierOptions = await prettier.resolveConfig(filePath);

  fs.writeFileSync(
    filePath,
    await prettier.format(newContent, {
      ...prettierOptions,
      parser: "json",
    })
  );
}

/**
 * @param {YarnWorkspaceInfo} workspaceInfo
 */
async function updateTSReferences(workspaceInfo) {
  // Read the tsconfigs for each package
  const packageTSConfigs = /** @type {Record<String, TSConfigInfo>} */ ({});
  for (const [name, { location }] of Object.entries(workspaceInfo)) {
    if (isTSPackage(location)) {
      packageTSConfigs[name] = getTSConfig(getTSConfigPath(location));
    }
  }

  // Update the tsconfigs with references
  for (const [name, info] of Object.entries(workspaceInfo)) {
    if (!packageTSConfigs[name]) {
      continue;
    }

    const { location, workspaceDependencies } = info;
    const references = workspaceDependencies
      .filter((dep) => packageTSConfigs[dep]?.config.compilerOptions?.composite)
      .map((dep) => ({
        path: getRelativeLocation(location, workspaceInfo[dep].location, true),
      }))
      .sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
    await updateTSConfig(packageTSConfigs[name], { references });
  }
}

/**
 * @typedef {Record<string, {
 *   location: string;
 *   workspaceDependencies: string[];
 * }>} YarnWorkspaceInfo
 * @type {YarnWorkspaceInfo}
 */
const workspaceInfo = JSON.parse(
  execa
    .sync("yarn", ["--silent", "workspaces", "info"])
    .stdout.toString()
    .trim()
);

updateTSReferences(workspaceInfo).catch((err) => {
  console.error(err.stack || err);
  process.exit(1);
});
