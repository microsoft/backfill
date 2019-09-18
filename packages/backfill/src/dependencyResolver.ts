import * as path from "path";
import * as findUp from "find-up";

export function resolveDependency(dependency: string, packageRoot: string) {
  /**
   * We're using findUp temporarily until we're all using a version of Node.js
   * that does not contain this bug: https://github.com/nodejs/node/pull/23683
   * This bug explains the issue nicely:
   * https://github.com/nodejs/node/issues/18408#issuecomment-429908200
   */
  return findUp.sync(path.join("node_modules", dependency, "package.json"), {
    cwd: packageRoot
  });
}

export function getAllDependencies(packageRoot: string): string[] {
  const packageJson = require(path.join(packageRoot, "package.json"));

  if (!Boolean(packageJson)) {
    return [];
  }

  const dependencies = {
    ...packageJson.dependencies,
    ...packageJson.devDependencies,
    ...packageJson.peerDependencies
  };

  const dependencyNames = Object.keys(dependencies);

  if (dependencyNames.length === 0) {
    return [];
  }

  // Ignore npm dependency comments
  const dependencyNamesFiltered = dependencyNames.filter(
    dependency => dependency !== "//"
  );

  return dependencyNamesFiltered;
}
