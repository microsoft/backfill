import * as fs from "fs-extra";
import { setupFixture } from "backfill-utils-test";

import { createConfig, Config } from "backfill-config";
import { generateHashOfFiles } from "../hashOfFiles";

const { createDefaultConfig } = jest.requireActual("backfill-config");
jest.mock("backfill-config");

const mockedDependency = <jest.Mock<Config>>createConfig;

describe("generateHashOfFiles()", () => {
  it("excludes files provided by backfill config", async () => {
    const packageRoot = await setupFixture("monorepo");
    const defaultConfig = createDefaultConfig();

    // Need to mock getting the config
    mockedDependency.mockReturnValue({ ...defaultConfig, hashGlobs: ["**"] });
    const hashOfEverything = await generateHashOfFiles(packageRoot);

    mockedDependency.mockReturnValue({
      ...defaultConfig,
      hashGlobs: ["**", "!**/node_modules/**"]
    });
    const hashExcludeNodeModules = await generateHashOfFiles(packageRoot);

    expect(hashOfEverything).not.toEqual(hashExcludeNodeModules);
  });

  it("creates different hashes for different hashes", async () => {
    const packageRoot = await setupFixture("monorepo");
    const defaultConfig = createDefaultConfig();

    mockedDependency.mockReturnValue(defaultConfig);

    const hashOfPackage = await generateHashOfFiles(packageRoot);

    fs.writeFileSync("foo.txt", "bar");
    const hashOfPackageWithFoo = await generateHashOfFiles(packageRoot);
    expect(hashOfPackage).not.toEqual(hashOfPackageWithFoo);

    fs.writeFileSync("foo.txt", "foo");
    const hashOfPackageWithFoo2 = await generateHashOfFiles(packageRoot);
    expect(hashOfPackageWithFoo).not.toEqual(hashOfPackageWithFoo2);

    fs.unlinkSync("foo.txt");

    const hashOfPackageWithoutFoo = await generateHashOfFiles(packageRoot);
    expect(hashOfPackage).toEqual(hashOfPackageWithoutFoo);
  });
});
