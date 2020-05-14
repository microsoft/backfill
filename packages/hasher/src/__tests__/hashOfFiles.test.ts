import path from "path";
import fs from "fs-extra";

import { setupFixture } from "backfill-utils-test";

import { makeLogger } from "backfill-logger";
import { generateHashOfFiles } from "../hashOfFiles";

describe("generateHashOfFiles()", () => {
  const logger = makeLogger("mute");

  it("excludes files provided by backfill config", async () => {
    const packageRoot = await setupFixture("monorepo");

    const hashOfEverything = await generateHashOfFiles(
      packageRoot,
      ["**"],
      logger,
      false /* _cacheRepoHash */
    );

    const hashExcludeNodeModules = await generateHashOfFiles(
      packageRoot,
      ["**", "!**/node_modules/**"],
      logger,
      false /* _cacheRepoHash */
    );

    expect(hashOfEverything).not.toEqual(hashExcludeNodeModules);
  });

  it("creates different hashes for different hashes", async () => {
    const packageRoot = await setupFixture("monorepo");

    const hashOfPackage = await generateHashOfFiles(
      packageRoot,
      ["**", "!**/node_modules/**"],
      logger,
      false /* _cacheRepoHash */
    );

    fs.writeFileSync(path.join(packageRoot, "foo.txt"), "bar");
    const hashOfPackageWithFoo = await generateHashOfFiles(
      packageRoot,
      ["**", "!**/node_modules/**"],
      logger,
      false /* _cacheRepoHash */
    );
    expect(hashOfPackage).not.toEqual(hashOfPackageWithFoo);

    fs.writeFileSync(path.join(packageRoot, "foo.txt"), "foo");
    const hashOfPackageWithFoo2 = await generateHashOfFiles(
      packageRoot,
      ["**", "!**/node_modules/**"],
      logger,
      false /* _cacheRepoHash */
    );
    expect(hashOfPackageWithFoo).not.toEqual(hashOfPackageWithFoo2);

    fs.unlinkSync(path.join(packageRoot, "foo.txt"));
    const hashOfPackageWithoutFoo = await generateHashOfFiles(
      packageRoot,
      ["**", "!**/node_modules/**"],
      logger,
      false /* _cacheRepoHash */
    );
    expect(hashOfPackage).toEqual(hashOfPackageWithoutFoo);
  });
});
