import fs from "fs-extra";

import { setupFixture } from "backfill-utils-test";
import { createConfig, Config } from "backfill-config";

import { generateHashOfFiles } from "../hashOfFiles";

const { createDefaultConfig } = jest.requireActual("backfill-config");
jest.mock("backfill-config");

const mockedDependency = <jest.Mock<Config>>createConfig;

describe("generateHashOfFiles()", () => {
  it("excludes files provided by backfill config", async () => {
    const packageRoot = await setupFixture("monorepo");

    const hashOfEverything = await generateHashOfFiles(packageRoot, ["**"]);

    const hashExcludeNodeModules = await generateHashOfFiles(packageRoot, [
      "**",
      "!**/node_modules/**"
    ]);

    expect(hashOfEverything).not.toEqual(hashExcludeNodeModules);
  });

  it("creates different hashes for different hashes", async () => {
    const packageRoot = await setupFixture("monorepo");
    const defaultConfig = createDefaultConfig();

    mockedDependency.mockReturnValue(defaultConfig);

    const hashOfPackage = await generateHashOfFiles(packageRoot, [
      "**",
      "!**/node_modules/**"
    ]);

    fs.writeFileSync("foo.txt", "bar");
    const hashOfPackageWithFoo = await generateHashOfFiles(packageRoot, [
      "**",
      "!**/node_modules/**"
    ]);
    expect(hashOfPackage).not.toEqual(hashOfPackageWithFoo);

    fs.writeFileSync("foo.txt", "foo");
    const hashOfPackageWithFoo2 = await generateHashOfFiles(packageRoot, [
      "**",
      "!**/node_modules/**"
    ]);
    expect(hashOfPackageWithFoo).not.toEqual(hashOfPackageWithFoo2);

    fs.unlinkSync("foo.txt");

    const hashOfPackageWithoutFoo = await generateHashOfFiles(packageRoot, [
      "**",
      "!**/node_modules/**"
    ]);
    expect(hashOfPackage).toEqual(hashOfPackageWithoutFoo);
  });
});
