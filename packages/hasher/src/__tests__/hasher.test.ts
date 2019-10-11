import * as path from "path";
import { setupFixture } from "backfill-utils-test";

import {
  parseLockFile,
  getWorkspacePackageInfo,
  filterInternalDependencies,
  filterExternalDependencies,
  addNewInternalDependenciesToMainQueue,
  ProcessedPackages
} from "../index";
import getYarnWorkspaces from "../getYarnWorkspaces";

// ### Yarn.lock
// * What happens if we don’t have a lock file?

describe("parseLockFile()", () => {
  it("parses the yarn.lock file when it is found", async () => {
    const packageRoot = await setupFixture("basic-with-lock-file");
    const parsedLockeFile = await parseLockFile(packageRoot);

    expect(parsedLockeFile).toHaveProperty("type", "success");
  });

  it("throws if it cannot find a yarn.lock file", async () => {
    const packageRoot = await setupFixture("basic");

    await expect(parseLockFile(packageRoot)).rejects.toThrow(
      "Could not find a yarn.lock file"
    );
  });
});

// ### getWorkspacePackageInfo
// * Make sure it gathers the right information from the various packages
describe("getWorkspacePackageInfo()", () => {
  it("gathers the name and path from the various packages", async () => {
    const packageRoot = await setupFixture("monorepo");

    const workspacePaths = getYarnWorkspaces(packageRoot);
    const workspacesPackageInfo = getWorkspacePackageInfo(workspacePaths);

    const packageAPath = path.join(packageRoot, "packages", "package-a");
    const packageBPath = path.join(packageRoot, "packages", "package-b");

    expect(workspacesPackageInfo).toEqual([
      { name: "package-a", path: packageAPath },
      { name: "package-b", path: packageBPath }
    ]);
  });
});

describe("filter", () => {
  const filterDependenciesInFixture = async (
    fixture: string,
    filterFunction: any
  ) => {
    const packageRoot = await setupFixture(fixture);

    const workspacePaths = getYarnWorkspaces(packageRoot);
    const workspacesPackageInfo = getWorkspacePackageInfo(workspacePaths);

    const dependencies = { "package-a": "1.0.0", foo: "1.0.0" };

    const filteredDependencies = filterFunction(
      dependencies,
      workspacesPackageInfo
    );

    return filteredDependencies;
  };
  // ### filterInternalDependencies
  // * Correctly filter based on list of dependencies and workspaces
  // * Correctly identifies no internal packages if there are no workspaces
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

  // ### filterExternalDependencies
  // * Correctly filter based on list of dependencies and workspaces
  // * Correctly identifies all packages as external if there are no workspaces
  describe("filterExternalDependencies()", () => {
    it("only lists external dependencies", async () => {
      const results = await filterDependenciesInFixture(
        "monorepo",
        filterExternalDependencies
      );
      expect(results).toEqual(["foo"]);
    });

    it("identifies all dependencies as external packages if there are no workspaces", async () => {
      const results = await filterDependenciesInFixture(
        "basic",
        filterExternalDependencies
      );
      expect(results).toEqual(["package-a", "foo"]);
    });
  });
});

// ### addNewInternalDependenciesToMainQueue
// * Add internal dependency to main queue
// * Don’t add to main queue if the package has been evaluated
// * Don’t add to main queue if the package is already in the queue
describe("addNewInternalDependenciesToMainQueue", () => {
  it("adds internal dependency to main queue", async () => {
    const packageRoot = await setupFixture("monorepo");

    const workspacePaths = getYarnWorkspaces(packageRoot);
    const workspacesPackageInfo = getWorkspacePackageInfo(workspacePaths);

    const packageToAdd = "package-a";

    const processedPackages: ProcessedPackages = [];
    const queue: string[] = [];

    addNewInternalDependenciesToMainQueue(
      workspacesPackageInfo,
      packageToAdd,
      processedPackages,
      queue
    );

    const packagePath = path.join(packageRoot, "packages", packageToAdd);
    const expectedQueue = [packagePath];

    expect(queue).toEqual(expectedQueue);
  });

  it("doesn't add to main queue if the package has been evaluated", async () => {
    const packageRoot = await setupFixture("monorepo");

    const workspacePaths = getYarnWorkspaces(packageRoot);
    const workspacesPackageInfo = getWorkspacePackageInfo(workspacePaths);

    const packageToAdd = "package-a";

    const processedPackages: ProcessedPackages = [
      { name: packageToAdd, filesHash: "", dependenciesHash: "" }
    ];
    const queue: string[] = [];

    addNewInternalDependenciesToMainQueue(
      workspacesPackageInfo,
      packageToAdd,
      processedPackages,
      queue
    );

    expect(queue).toEqual([]);
  });

  it("doesn't add to main queue if the package is already in the queue", async () => {
    const packageRoot = await setupFixture("monorepo");

    const workspacePaths = getYarnWorkspaces(packageRoot);
    const workspacesPackageInfo = getWorkspacePackageInfo(workspacePaths);

    const packageToAdd = "package-a";
    const packagePath = path.join(packageRoot, "packages", packageToAdd);

    const processedPackages: ProcessedPackages = [];
    const queue = [packagePath];

    addNewInternalDependenciesToMainQueue(
      workspacesPackageInfo,
      packageToAdd,
      processedPackages,
      queue
    );

    const expectedQueue = [packagePath];

    expect(queue).toEqual(expectedQueue);
  });
});

// ### resolveInternalDependenciesAndAdd
// * Add internal dependency names to the processedPackages list

// ### addNewExternalDependenciesToQueue
// * Add external dependencies to queue
// * Don’t add packages that has been visited
// * Don’t add packages that is already in the queue

// ### resolveExternalDependenciesAndAdd
// * Given a list of external dependencies and together with a parsed Lock file, add them all to the queue

// ### generateHashOfFiles
// - Exclude files provided by config
// * Create two different hashes given different content, and then the same as the first if you remove the new thing
// * Test adding filters in config

// ### generateHashOfDependencies
// * Create two different hashes given different list of dependencies, and then the same as the first if you remove the new thing

// ### getPackageHash
// * Create two different hashes given a fixtures, and then the same as the first if you remove the new thing

// ### generateHashOfPackage
// * Create two different hashes given different list of dependencies, and then the same as the first if you remove the new thing

// ### Finally, create a new hasher object and apply it to a fixture
// * Create two different hashes given different list of dependencies, and then the same as the first if you remove the new thing
