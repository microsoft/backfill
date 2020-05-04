import path from "path";
import fs from "fs-extra";

import { setupFixture } from "backfill-utils-test";

import { generateHashOfFiles } from "../hashOfFiles";

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

    const hashOfPackage = await generateHashOfFiles(packageRoot, [
      "**",
      "!**/node_modules/**"
    ]);

    fs.writeFileSync(path.join(packageRoot, "foo.txt"), "bar");
    const hashOfPackageWithFoo = await generateHashOfFiles(packageRoot, [
      "**",
      "!**/node_modules/**"
    ]);
    expect(hashOfPackage).not.toEqual(hashOfPackageWithFoo);

    fs.writeFileSync(path.join(packageRoot, "foo.txt"), "foo");
    const hashOfPackageWithFoo2 = await generateHashOfFiles(packageRoot, [
      "**",
      "!**/node_modules/**"
    ]);
    expect(hashOfPackageWithFoo).not.toEqual(hashOfPackageWithFoo2);

    fs.unlinkSync(path.join(packageRoot, "foo.txt"));

    const hashOfPackageWithoutFoo = await generateHashOfFiles(packageRoot, [
      "**",
      "!**/node_modules/**"
    ]);
    expect(hashOfPackage).toEqual(hashOfPackageWithoutFoo);
  });
});
