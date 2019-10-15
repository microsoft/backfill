import * as fs from "fs-extra";
import { setupFixture } from "backfill-utils-test";

import { generateHashOfFiles } from "../hashOfFiles";

describe("generateHashOfFiles()", () => {
  it("excludes files provided by backfill config", async () => {
    const packageRoot = await setupFixture("monorepo");

    const hashOfEverything = await generateHashOfFiles(["**"], packageRoot);
    const hashExcludeNodeModules = await generateHashOfFiles(
      ["**", "!**/node_modules/**"],
      packageRoot
    );

    expect(hashOfEverything).not.toEqual(hashExcludeNodeModules);
  });

  it("creates different hashes for different hashes", async () => {
    const packageRoot = await setupFixture("monorepo");

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
