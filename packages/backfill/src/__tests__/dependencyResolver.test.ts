import * as path from "path";

import { DependencyResolver } from "../dependencyResolver";
import { setupFixture } from "backfill-utils-test";

const setupDependencyResolver = async (fixtureName: string) => {
  const packageRoot = await setupFixture(fixtureName);

  const dependencyResolver = new DependencyResolver({ packageRoot });
  return dependencyResolver;
};

describe("resolve()", () => {
  it("resolves correct path based on packageRoot and package name", async () => {
    const dependencyResolver = await setupDependencyResolver("basic");
    const resolvedPath = await dependencyResolver.resolve("package-2");

    const correctPath = path.join(
      process.cwd(),
      "node_modules",
      "package-2",
      "package.json"
    );

    expect(resolvedPath).toBe(correctPath);
  });

  it("return undefined if it cannot resolve", async () => {
    const dependencyResolver = await setupDependencyResolver("basic");
    const resolvedPath = await dependencyResolver.resolve("package-3");

    expect(resolvedPath).toBe(undefined);
  });
});

describe("dependencies()", () => {
  const resolveDependencies = async (fixtureName: string) => {
    const dependencyResolver = await setupDependencyResolver(fixtureName);
    const dependencies = dependencyResolver.dependencies();

    return dependencies;
  };

  it("lists all dependencies", async () => {
    const dependencies = await resolveDependencies("many-dependencies");
    expect(dependencies).toStrictEqual(["package-2", "package-3", "package-4"]);
  });

  it("returns empty list if there are no dependencies", async () => {
    const dependencies = await resolveDependencies("no-dependency");
    expect(dependencies).toStrictEqual([]);
  });
});
