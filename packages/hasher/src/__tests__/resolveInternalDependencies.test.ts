import { setupFixture } from "backfill-utils-test";

import { filterDependenciesInFixture } from "./resolveDependenciesHelper";
import { getYarnWorkspaces } from "../yarnWorkspaces";
import {
  filterInternalDependencies,
  resolveInternalDependencies
} from "../resolveInternalDependencies";

describe("filterInternalDependencies()", () => {
  it("only lists internal dependencies", async () => {
    const results = await filterDependenciesInFixture(
      "monorepo",
      filterInternalDependencies
    );

    expect(results).toEqual(["package-a"]);
  });

  it("lists no internal packages if there are no workspaces", async () => {
    const results = await filterDependenciesInFixture(
      "basic",
      filterInternalDependencies
    );

    expect(results).toEqual([]);
  });
});

describe("resolveInternalDependencies()", () => {
  it("adds internal dependency names to the processedPackages list", async () => {
    const packageRoot = await setupFixture("monorepo");
    const workspaces = getYarnWorkspaces(packageRoot);

    const dependencies = { "package-a": "1.0.0", foo: "1.0.0" };

    const resolvedDependencies = resolveInternalDependencies(
      dependencies,
      workspaces
    );

    expect(resolvedDependencies).toEqual(["package-a"]);
  });
});
