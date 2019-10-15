import * as path from "path";
import { setupFixture } from "backfill-utils-test";

import { filterDependenciesInFixture } from "./helpers";
import { getYarnWorkspaces } from "../yarnWorkspaces";
import { PackageHashInfo } from "../hashOfPackage";
import {
  filterInternalDependencies,
  resolveInternalDependencies,
  addToQueue
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

describe("addToQueue", () => {
  it("adds internal dependencies to the queue", async () => {
    const packageRoot = await setupFixture("monorepo");

    const packageToAdd = "package-a";
    const packagePath = path.join(packageRoot, "packages", packageToAdd);

    const queue: string[] = [];
    const done: PackageHashInfo[] = [];

    addToQueue(packageToAdd, packagePath, queue, done);

    const expectedQueue = [packagePath];
    expect(queue).toEqual(expectedQueue);
  });

  it("doesn't add to the queue if the package has been evaluated", async () => {
    const packageRoot = await setupFixture("monorepo");

    const packageToAdd = "package-a";
    const packagePath = path.join(packageRoot, "packages", packageToAdd);

    const queue: string[] = [];
    const done: PackageHashInfo[] = [
      { name: packageToAdd, filesHash: "", dependenciesHash: "" }
    ];

    addToQueue(packageToAdd, packagePath, queue, done);

    expect(queue).toEqual([]);
  });

  it("doesn't add to the queue if the package is already in the queue", async () => {
    const packageRoot = await setupFixture("monorepo");

    const packageToAdd = "package-a";
    const packagePath = path.join(packageRoot, "packages", packageToAdd);

    const queue: string[] = [packagePath];
    const done: PackageHashInfo[] = [];

    addToQueue(packageToAdd, packagePath, queue, done);

    const expectedQueue = [packagePath];
    expect(queue).toEqual(expectedQueue);
  });
});

describe("resolveInternalDependencies()", () => {
  it("adds internal dependency names to the processedPackages list", async () => {
    const packageRoot = await setupFixture("monorepo");
    const workspaces = getYarnWorkspaces(packageRoot);

    const dependencies = { "package-a": "1.0.0", foo: "1.0.0" };

    const queue: string[] = [];
    const done: PackageHashInfo[] = [];

    const resolvedDependencies = resolveInternalDependencies(
      dependencies,
      workspaces,
      queue,
      done
    );

    expect(resolvedDependencies).toEqual(["package-a"]);
  });
});
