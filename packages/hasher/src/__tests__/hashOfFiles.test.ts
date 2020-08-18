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
  it.only("file paths are consistent across platforms", async () => {
    const packageRoot = await setupFixture("empty");

    // Create a folder to make sure we get folder separators as part of the file name
    const folder = path.join(packageRoot, "foo");

    fs.mkdirpSync(folder);

    fs.writeFileSync(path.join(folder, "foo.txt"), "bar");
    let repoInfo = await getRepoInfoNoCache(packageRoot);

    const hashOfPackage = await generateHashOfFiles(packageRoot, repoInfo);

    expect(hashOfPackage).toEqual("75d811452b9f8561c7827df9a8f18ac8cb44df9a");
  });
});
