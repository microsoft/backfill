import * as path from "path";
import * as findUp from "find-up";

export interface IDependencyResolver {
  resolve: (path: string) => string | undefined;
  dependencies: () => string[];
}

type DependencyResolverOptions = {
  [key: string]: any;
};

export class DependencyResolver implements IDependencyResolver {
  constructor(private options: DependencyResolverOptions) {}

  public resolve(dependency: string) {
    /**
     * We're using findUp temporarily until we're all using a version of Node.js
     * that does not contain this bug: https://github.com/nodejs/node/pull/23683
     * This bug explains the issue nicely:
     * https://github.com/nodejs/node/issues/18408#issuecomment-429908200
     */
    return findUp.sync(path.join("node_modules", dependency, "package.json"), {
      cwd: this.options.packageRoot
    });
  }

  public dependencies(): string[] {
    const { packageRoot } = this.options;

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
}
