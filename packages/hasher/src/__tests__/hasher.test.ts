import * as path from "path";
import * as fs from "fs-extra";
import { setupFixture } from "backfill-utils-test";

import {
  ProcessedPackages,
  ExternalDependenciesQueue,
  parseLockFile,
  getWorkspacePackageInfo,
  filterInternalDependencies,
  filterExternalDependencies,
  addNewInternalDependenciesToMainQueue,
  resolveInternalDependenciesAndAdd,
  addNewExternalDependenciesToQueue,
  createDependencySignature,
  resolveExternalDependenciesAndAdd,
  generateHashOfFiles,
  generateHashOfDependencies,
  Hasher
} from "../index";
import getYarnWorkspaces from "../getYarnWorkspaces";

async function setupFixtureAndGetWorkspaceInfo(fixture: string = "monorepo") {
  const packageRoot = await setupFixture(fixture);

  const workspacePaths = getYarnWorkspaces(packageRoot);
  const workspacesPackageInfo = getWorkspacePackageInfo(workspacePaths);

  return { packageRoot, workspacesPackageInfo };
}

// ### Yarn.lock
// * What happens if we don’t have a lock file?
describe("parseLockFile()", () => {
  it("parses yarn.lock file when it is found", async () => {
    const packageRoot = await setupFixture("basic");
    const parsedLockeFile = await parseLockFile(packageRoot);

    expect(parsedLockeFile).toHaveProperty("type", "success");
  });

  it("throws if it cannot find a yarn.lock file", async () => {
    const packageRoot = await setupFixture("basic-without-lock-file");

    await expect(parseLockFile(packageRoot)).rejects.toThrow(
      "Could not find a yarn.lock file"
    );
  });
});

// ### getWorkspacePackageInfo
// * Make sure it gathers the right information from the various packages
describe("getWorkspacePackageInfo()", () => {
  it("gets the name and path of the workspaces", async () => {
    const {
      packageRoot,
      workspacesPackageInfo
    } = await setupFixtureAndGetWorkspaceInfo();

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
    const { workspacesPackageInfo } = await setupFixtureAndGetWorkspaceInfo(
      fixture
    );

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
    const {
      packageRoot,
      workspacesPackageInfo
    } = await setupFixtureAndGetWorkspaceInfo();

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
    const { workspacesPackageInfo } = await setupFixtureAndGetWorkspaceInfo();

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
    const {
      packageRoot,
      workspacesPackageInfo
    } = await setupFixtureAndGetWorkspaceInfo();

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
describe("resolveInternalDependenciesAndAdd()", () => {
  it("adds internal dependency names to the processedPackages list", async () => {
    const { workspacesPackageInfo } = await setupFixtureAndGetWorkspaceInfo();

    const packageToAdd = "package-a";

    const dependencyNames: string[] = [packageToAdd];
    const processedDependencies: Set<string> = new Set();
    const processedPackages: ProcessedPackages = [];
    const queue: string[] = [];

    resolveInternalDependenciesAndAdd(
      dependencyNames,
      processedDependencies,
      workspacesPackageInfo,
      processedPackages,
      queue
    );

    expect(processedDependencies).toEqual(new Set([packageToAdd]));
  });
});

// ### addNewExternalDependenciesToQueue
// * Add external dependencies to queue
// * Don’t add packages that has been visited
// * Don’t add packages that is already in the queue
describe("addNewExternalDependenciesToQueue()", () => {
  it("adds external dependencies to queue", () => {
    const externalDependencies = { foo: "1.0.0" };
    const visited: Set<string> = new Set();
    const queue: ExternalDependenciesQueue = [];

    addNewExternalDependenciesToQueue(externalDependencies, visited, queue);

    const expectedQueue = [
      {
        name: "foo",
        versionRange: "1.0.0"
      }
    ];

    expect(queue).toEqual(expectedQueue);
  });

  it("doesn't add to queue if the dependency has been visited", () => {
    const externalDependencies = { foo: "1.0.0" };
    const visited: Set<string> = new Set([
      createDependencySignature("foo", "1.0.0")
    ]);
    const queue: ExternalDependenciesQueue = [];

    addNewExternalDependenciesToQueue(externalDependencies, visited, queue);

    expect(queue).toEqual([]);
  });

  it("doesn't add to queue if the dependency is already in the queue", () => {
    const externalDependencies = { foo: "1.0.0" };
    const visited: Set<string> = new Set();
    const queue: ExternalDependenciesQueue = [
      {
        name: "foo",
        versionRange: "1.0.0"
      }
    ];

    addNewExternalDependenciesToQueue(externalDependencies, visited, queue);

    const expectedQueue = [
      {
        name: "foo",
        versionRange: "1.0.0"
      }
    ];

    expect(queue).toEqual(expectedQueue);
  });
});

// ### resolveExternalDependenciesAndAdd
// * Given a list of external dependencies and together with a parsed Lock file, add them all to the queue
describe("resolveExternalDependenciesAndAdd()", () => {
  it("given a list of external dependencies and a parsed Lock file, add all dependencies, transitively", async () => {
    const { packageRoot } = await setupFixtureAndGetWorkspaceInfo("basic");

    const allDependencies = { "package-a": "1.0.0", foo: "1.0.0" };
    const namesOfExternalDependencies = ["foo"];
    const processedDependencies: Set<string> = new Set();
    const parsedLockeFile = await parseLockFile(packageRoot);

    resolveExternalDependenciesAndAdd(
      allDependencies,
      namesOfExternalDependencies,
      processedDependencies,
      parsedLockeFile
    );

    expect(processedDependencies).toEqual(new Set(["foo@1.0.0"]));
  });
});

// ### generateHashOfFiles
// - Exclude files provided by config
// * Create two different hashes given different content, and then the same as the first if you remove the new thing
describe("generateHashOfFiles()", () => {
  it("excludes files provided by backfill config", async () => {
    const { packageRoot } = await setupFixtureAndGetWorkspaceInfo();

    const hashOfEverything = await generateHashOfFiles(["**"], packageRoot);
    const hashExcludeNodeModules = await generateHashOfFiles(
      ["**", "!**/node_modules/**"],
      packageRoot
    );

    expect(hashOfEverything).not.toEqual(hashExcludeNodeModules);
  });

  it("creates different hashes for different hashes", async () => {
    const { packageRoot } = await setupFixtureAndGetWorkspaceInfo();
    const glob = ["**"];

    const hashOfPackage = await generateHashOfFiles(glob, packageRoot);

    fs.writeFileSync("foo.txt", "bar");
    const hashOfPackageWithFoo = await generateHashOfFiles(glob, packageRoot);

    expect(hashOfPackage).not.toEqual(hashOfPackageWithFoo);

    fs.unlinkSync("foo.txt");

    const hashOfPackageWithoutFoo = await generateHashOfFiles(
      glob,
      packageRoot
    );
    expect(hashOfPackage).toEqual(hashOfPackageWithoutFoo);
  });
});

// ### generateHashOfDependencies
// * Create two different hashes given different list of dependencies, and then the same as the first if you remove the new thing
describe("generateHashOfDependencies()", () => {
  it("creates different hashes given different lists of dependencies, and then the same as the first when the new item is removed", () => {
    const dependencies: Set<string> = new Set();

    dependencies.add("foo");
    dependencies.add("bar");

    const hash = generateHashOfDependencies(dependencies);

    dependencies.add("baz");
    const hashWithBaz = generateHashOfDependencies(dependencies);

    expect(hash).not.toEqual(hashWithBaz);

    dependencies.delete("baz");
    const hashWithoutBaz = generateHashOfDependencies(dependencies);

    expect(hash).toEqual(hashWithoutBaz);
  });
});

// ### Finally, create a new hasher object and apply it to a fixture
// * Create two different hashes given different list of dependencies, and then the same as the first if you remove the new thing
describe("The main Hasher class", () => {
  const setupFixtureAndReturnHash = async (fixture?: string) => {
    const { packageRoot } = await setupFixtureAndGetWorkspaceInfo(fixture);

    const options = { packageRoot, hashGlobs: ["**"] };
    const buildSignature = "yarn build";

    const hasher = new Hasher(options, buildSignature);
    const hash = await hasher.createPackageHash();

    return hash;
  };

  it("creates different hashes given different fixtures", async () => {
    const hash = await setupFixtureAndReturnHash();
    const hashOfBasic = await setupFixtureAndReturnHash("basic");

    expect(hash).not.toEqual(hashOfBasic);

    const hashOfMonorepoAgain = await setupFixtureAndReturnHash();

    expect(hash).toEqual(hashOfMonorepoAgain);
  });
});
