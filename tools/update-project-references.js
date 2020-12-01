const execa = require("execa");
const path = require("path");
const fs = require("fs");
const prettier = require("prettier");
const merge = require("lodash.merge");
const resolveFrom = require("resolve-from");

function getTSConfigPath(location) {
  return path.join(process.cwd(), location, "tsconfig.json");
}

function isTSPackage(location) {
  return fs.existsSync(getTSConfigPath(location));
}

function getTSConfig(filePath) {
  const config = fs.existsSync(filePath)
    ? JSON.parse(fs.readFileSync(filePath).toString())
    : {};
  if (config.extends) {
    return merge(
      getTSConfig(resolveFrom(path.dirname(filePath), config.extends)),
      config
    );
  } else {
    return config;
  }
}

function isCompositeEnabled(location) {
  const configPath = getTSConfigPath(location);
  const config = getTSConfig(configPath);
  return Boolean(config.compilerOptions && config.compilerOptions.composite);
}

function getAbsoluteLocation(location, posix = false) {
  if (posix) {
    return path.posix.join(process.cwd(), location);
  } else {
    return path.join(process.cwd(), location);
  }
}

function getRelativeLocation(fromLocation, toLocation, posix = false) {
  return path.posix.relative(
    getAbsoluteLocation(fromLocation, posix),
    getAbsoluteLocation(toLocation, posix)
  );
}

function updateTSConfig(path, options) {
  const config = fs.existsSync(path)
    ? JSON.parse(fs.readFileSync(path).toString())
    : {};
  prettier.resolveConfig(path).then((prettierOptions) =>
    fs.writeFileSync(
      path,
      prettier.format(
        JSON.stringify({
          ...config,
          ...options,
        }),
        {
          ...prettierOptions,
          parser: "json",
        }
      )
    )
  );
}

function pathCompare(a, b) {
  if (a.path < b.path) {
    return -1;
  } else if (a.path > b.path) {
    return 1;
  } else {
    return 0;
  }
}

function updateTSReferences(workspaceInfo) {
  Object.keys(workspaceInfo)
    .map((key) => workspaceInfo[key])
    .filter(({ location }) => isTSPackage(location))
    .forEach(({ location, workspaceDependencies }) => {
      updateTSConfig(getTSConfigPath(location), {
        references: workspaceDependencies
          .map((dependency) => workspaceInfo[dependency].location)
          .filter(isTSPackage)
          .filter(isCompositeEnabled)
          .map((workspaceLocation) => ({
            path: getRelativeLocation(location, workspaceLocation, true),
          }))
          .sort(pathCompare),
      });
    });
}

const workspaceInfo = JSON.parse(
  execa
    .sync("yarn", ["--silent", "workspaces", "info"])
    .stdout.toString()
    .trim()
);

updateTSReferences(workspaceInfo);
