import path from "path";
import fs from "fs-extra";

import { setupFixture } from "backfill-utils-test";

import { generateHashOfFiles } from "../hashOfFiles";

describe("generateHashOfFiles()", () => {
  it.only("creates different hashes for different hashes", async () => {
    const packageRoot = await setupFixture("monorepo");

    const hashOfPackage = await generateHashOfFiles(packageRoot);

    fs.writeFileSync(path.join(packageRoot, "foo.txt"), "bar");
    const hashOfPackageWithFoo = await generateHashOfFiles(packageRoot);
    expect(hashOfPackage).not.toEqual(hashOfPackageWithFoo);

    fs.writeFileSync(path.join(packageRoot, "foo.txt"), "foo");
    const hashOfPackageWithFoo2 = await generateHashOfFiles(packageRoot);
    expect(hashOfPackageWithFoo).not.toEqual(hashOfPackageWithFoo2);

    fs.unlinkSync(path.join(packageRoot, "foo.txt"));

    const hashOfPackageWithoutFoo = await generateHashOfFiles(packageRoot);
    expect(hashOfPackage).toEqual(hashOfPackageWithoutFoo);
  });
});
