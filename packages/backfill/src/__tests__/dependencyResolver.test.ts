import * as path from "path";

import { getAllDependencies, resolveDependency } from "../dependencyResolver";
import { setupFixture } from "backfill-utils-test";

describe("resolve()", () => {
  it("resolves correct path based on packageRoot and package name", async () => {
    const packageRoot = await setupFixture("basic");
    const resolvedPath = resolveDependency("package-2", packageRoot);

    const correctPath = path.join(
      process.cwd(),
      "node_modules",
      "package-2",
      "package.json"
    );

    expect(resolvedPath).toBe(correctPath);
  });

  it("return undefined if it cannot resolve", async () => {
    const packageRoot = await setupFixture("basic");
    const resolvedPath = resolveDependency("package-3", packageRoot);

    expect(resolvedPath).toBe(undefined);
  });
});

describe("dependencies()", () => {
  it("lists all dependencies", async () => {
    const packageRoot = await setupFixture("many-dependencies");
    const dependencies = getAllDependencies(packageRoot);

    expect(dependencies).toStrictEqual(["package-2", "package-3", "package-4"]);
  });

  it("returns empty list if there are no dependencies", async () => {
    const packageRoot = await setupFixture("no-dependency");
    const dependencies = getAllDependencies(packageRoot);

    expect(dependencies).toStrictEqual([]);
  });
});
