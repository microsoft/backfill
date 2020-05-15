import path from "path";
import fs from "fs-extra";

import { setupFixture } from "backfill-utils-test";

import { makeLogger } from "backfill-logger";
import { generateHashOfFiles } from "../hashOfFiles";
import { getRepoInfo } from "../repoInfo";

describe("generateHashOfFiles()", () => {
  const logger = makeLogger("mute");

  it("excludes files provided by backfill config", async () => {
    const packageRoot = await setupFixture("monorepo");
    const repoInfo = await getRepoInfo(packageRoot);

    const hashOfEverything = await generateHashOfFiles(
      packageRoot,
      ["**"],
      logger,
      repoInfo
    );

    const hashExcludeNodeModules = await generateHashOfFiles(
      packageRoot,
      ["**", "!**/node_modules/**"],
      logger,
      repoInfo
    );

    expect(hashOfEverything).not.toEqual(hashExcludeNodeModules);
  });

  it("creates different hashes for different hashes", async () => {
    const packageRoot = await setupFixture("monorepo");
    const repoInfo = await getRepoInfo(packageRoot);

    const hashOfPackage = await generateHashOfFiles(
      packageRoot,
      ["**", "!**/node_modules/**"],
      logger,
      repoInfo
    );

    fs.writeFileSync(path.join(packageRoot, "foo.txt"), "bar");
    const hashOfPackageWithFoo = await generateHashOfFiles(
      packageRoot,
      ["**", "!**/node_modules/**"],
      logger,
      repoInfo
    );
    expect(hashOfPackage).not.toEqual(hashOfPackageWithFoo);

    fs.writeFileSync(path.join(packageRoot, "foo.txt"), "foo");
    const hashOfPackageWithFoo2 = await generateHashOfFiles(
      packageRoot,
      ["**", "!**/node_modules/**"],
      logger,
      repoInfo
    );
    expect(hashOfPackageWithFoo).not.toEqual(hashOfPackageWithFoo2);

    fs.unlinkSync(path.join(packageRoot, "foo.txt"));
    const hashOfPackageWithoutFoo = await generateHashOfFiles(
      packageRoot,
      ["**", "!**/node_modules/**"],
      logger,
      repoInfo
    );
    expect(hashOfPackage).toEqual(hashOfPackageWithoutFoo);
  });
});
