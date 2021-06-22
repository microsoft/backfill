import path from "path";
import fs from "fs-extra";

import { setupFixture } from "backfill-utils-test";

import { generateHashOfFiles } from "../hashOfFiles";
import { getRepoInfoNoCache } from "../repoInfo";

describe("generateHashOfFiles()", () => {
  it("creates different hashes for different hashes", async () => {
    const packageRoot = await setupFixture("monorepo");
    let repoInfo = await getRepoInfoNoCache(packageRoot);

    const hashOfPackage = await generateHashOfFiles(packageRoot, repoInfo);

    fs.writeFileSync(path.join(packageRoot, "foo.txt"), "bar");
    repoInfo = await getRepoInfoNoCache(packageRoot);

    const hashOfPackageWithFoo = await generateHashOfFiles(
      packageRoot,
      repoInfo
    );
    expect(hashOfPackage).not.toEqual(hashOfPackageWithFoo);

    fs.writeFileSync(path.join(packageRoot, "foo.txt"), "foo");
    repoInfo = await getRepoInfoNoCache(packageRoot);
    const hashOfPackageWithFoo2 = await generateHashOfFiles(
      packageRoot,
      repoInfo
    );
    expect(hashOfPackageWithFoo).not.toEqual(hashOfPackageWithFoo2);

    fs.unlinkSync(path.join(packageRoot, "foo.txt"));
    repoInfo = await getRepoInfoNoCache(packageRoot);
    const hashOfPackageWithoutFoo = await generateHashOfFiles(
      packageRoot,
      repoInfo
    );
    expect(hashOfPackage).toEqual(hashOfPackageWithoutFoo);
  });

  it("is not confused by package names being substring of other packages", async () => {
    const packageRoot = await setupFixture("monorepo");

    let repoInfo = await getRepoInfoNoCache(packageRoot);

    const hashOfPackageA = await generateHashOfFiles(
      path.join(packageRoot, "packages", "package-a"),
      repoInfo
    );

    await fs.mkdir(path.join(packageRoot, "packages", "package-abc"));
    await fs.writeFile(
      path.join(packageRoot, "packages", "package-abc", "foo"),
      "bar"
    );

    repoInfo = await getRepoInfoNoCache(packageRoot);
    const newHashOfPackageA = await generateHashOfFiles(
      path.join(packageRoot, "packages", "package-a"),
      repoInfo
    );

    expect(hashOfPackageA).toEqual(newHashOfPackageA);
  });

  it("file paths are included in hash", async () => {
    const packageRoot = await setupFixture("empty");

    fs.writeFileSync(path.join(packageRoot, "foo.txt"), "bar");
    let repoInfo = await getRepoInfoNoCache(packageRoot);

    const hashOfPackageWithFoo = await generateHashOfFiles(
      packageRoot,
      repoInfo
    );

    fs.unlinkSync(path.join(packageRoot, "foo.txt"));
    fs.writeFileSync(path.join(packageRoot, "bar.txt"), "bar");
    repoInfo = await getRepoInfoNoCache(packageRoot);

    const hashOfPackageWithBar = await generateHashOfFiles(
      packageRoot,
      repoInfo
    );

    expect(hashOfPackageWithFoo).not.toEqual(hashOfPackageWithBar);
  });

  // This test will be run on Windows and on Linux on the CI
  it("file paths are consistent across platforms", async () => {
    const packageRoot = await setupFixture("empty");

    // Create a folder to make sure we get folder separators as part of the file name
    const folder = path.join(packageRoot, "foo");

    fs.mkdirpSync(folder);

    fs.writeFileSync(path.join(folder, "foo.txt"), "bar");
    let repoInfo = await getRepoInfoNoCache(packageRoot);

    const hashOfPackage = await generateHashOfFiles(packageRoot, repoInfo);

    expect(hashOfPackage).toEqual("4d4ca2ecc436e1198554f5d03236ea8f956ac0c4");
  });
});
