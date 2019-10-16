import { setupFixture } from "backfill-utils-test";

import { filterDependenciesInFixture } from "./resolveDependenciesHelper";
import { getYarnWorkspaces } from "../yarnWorkspaces";
import {
  filterExternalDependencies,
  resolveExternalDependencies,
  addToQueue
} from "../resolveExternalDependencies";
import { parseLockFile } from "../yarnLock";

describe("filterExternalDependencies()", () => {
  it("only lists external dependencies", async () => {
    const results = await filterDependenciesInFixture(
      "monorepo",
      filterExternalDependencies
    );
    expect(results).toEqual({ foo: "1.0.0" });
  });

  it("identifies all dependencies as external packages if there are no workspaces", async () => {
    const results = await filterDependenciesInFixture(
      "basic",
      filterExternalDependencies
    );
    expect(results).toEqual({ foo: "1.0.0", "package-a": "1.0.0" });
  });
});

describe("addToQueue()", () => {
  it("adds external dependencies to queue", () => {
    const externalDependencies = { foo: "1.0.0" };
    const done: string[] = [];
    const queue: [string, string][] = [];

    addToQueue(externalDependencies, done, queue);

    const expectedQueue = [["foo", "1.0.0"]];
    expect(queue).toEqual(expectedQueue);
  });

  it("doesn't add to the queue if the dependency has been visited", () => {
    const externalDependencies = { foo: "1.0.0" };
    const done: string[] = ["foo@1.0.0"];
    const queue: [string, string][] = [];

    addToQueue(externalDependencies, done, queue);

    expect(queue).toEqual([]);
  });

  it("doesn't add to queue if the dependency is already in the queue", () => {
    const externalDependencies = { foo: "1.0.0" };
    const done: string[] = [];
    const queue: [string, string][] = [["foo", "1.0.0"]];

    addToQueue(externalDependencies, done, queue);

    const expectedQueue = [["foo", "1.0.0"]];
    expect(queue).toEqual(expectedQueue);
  });
});

describe("resolveExternalDependencies()", () => {
  it("given a list of external dependencies and a parsed Lock file, add all dependencies, transitively", async () => {
    const packageRoot = await setupFixture("monorepo");
    const workspaces = getYarnWorkspaces(packageRoot);

    const allDependencies = { "package-a": "1.0.0", foo: "1.0.0" };
    const parsedLockeFile = await parseLockFile(packageRoot);

    const resolvedDependencies = resolveExternalDependencies(
      allDependencies,
      workspaces,
      parsedLockeFile
    );

    expect(resolvedDependencies).toEqual(["foo@1.0.0", "bar@^1.0.0"]);
  });
});
