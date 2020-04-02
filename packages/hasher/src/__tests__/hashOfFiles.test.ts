import * as fs from "fs-extra";
import { setupFixture } from "backfill-utils-test";

import { generateHashOfFiles } from "../hashOfFiles";
import { makeLogger } from "backfill-logger";

import { createConfig, Config } from "backfill-config";
const { createDefaultConfig } = jest.requireActual("backfill-config");
jest.mock("backfill-config");

const mockedDependency = <jest.Mock<Config>>createConfig;
const logger = makeLogger("error");

describe("generateHashOfFiles()", () => {
  it("excludes files provided by backfill config", async () => {
    const packageRoot = await setupFixture("monorepo");
    const defaultConfig = createDefaultConfig();

    // Need to mock getting the config
    mockedDependency.mockReturnValue({ ...defaultConfig, hashGlobs: ["**"] });
    const hashOfEverything = await generateHashOfFiles(packageRoot, logger);

    mockedDependency.mockReturnValue({
      ...defaultConfig,
      hashGlobs: ["**", "!**/node_modules/**"]
    });
    const hashExcludeNodeModules = await generateHashOfFiles(
      packageRoot,
      logger
    );

    expect(hashOfEverything).not.toEqual(hashExcludeNodeModules);
  });

  it("creates different hashes for different hashes", async () => {
    const packageRoot = await setupFixture("monorepo");
    const defaultConfig = createDefaultConfig();

    mockedDependency.mockReturnValue(defaultConfig);

    const hashOfPackage = await generateHashOfFiles(packageRoot, logger);

    fs.writeFileSync("foo.txt", "bar");
    const hashOfPackageWithFoo = await generateHashOfFiles(packageRoot, logger);
    expect(hashOfPackage).not.toEqual(hashOfPackageWithFoo);

    fs.writeFileSync("foo.txt", "foo");
    const hashOfPackageWithFoo2 = await generateHashOfFiles(
      packageRoot,
      logger
    );
    expect(hashOfPackageWithFoo).not.toEqual(hashOfPackageWithFoo2);

    fs.unlinkSync("foo.txt");

    const hashOfPackageWithoutFoo = await generateHashOfFiles(
      packageRoot,
      logger
    );
    expect(hashOfPackage).toEqual(hashOfPackageWithoutFoo);
  });
});
