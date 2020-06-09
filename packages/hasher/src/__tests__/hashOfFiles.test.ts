import path from "path";
import fs from "fs-extra";

import { setupFixture } from "backfill-utils-test";

import { makeLogger } from "backfill-logger";
import { generateHashOfFiles } from "../hashOfFiles";
import { getRepoInfoNoCache } from "../repoInfo";

describe("generateHashOfFiles()", () => {
  const logger = makeLogger("mute");

  it("creates different hashes for different hashes", async () => {
    const packageRoot = await setupFixture("monorepo");
    let repoInfo = await getRepoInfoNoCache(packageRoot);

    const hashOfPackage = await generateHashOfFiles(
      packageRoot,
      logger,
      repoInfo
    );

    fs.writeFileSync(path.join(packageRoot, "foo.txt"), "bar");
    repoInfo = await getRepoInfoNoCache(packageRoot);

    const hashOfPackageWithFoo = await generateHashOfFiles(
      packageRoot,
      logger,
      repoInfo
    );
    expect(hashOfPackage).not.toEqual(hashOfPackageWithFoo);

    fs.writeFileSync(path.join(packageRoot, "foo.txt"), "foo");
    repoInfo = await getRepoInfoNoCache(packageRoot);
    const hashOfPackageWithFoo2 = await generateHashOfFiles(
      packageRoot,
      logger,
      repoInfo
    );
    expect(hashOfPackageWithFoo).not.toEqual(hashOfPackageWithFoo2);

    fs.unlinkSync(path.join(packageRoot, "foo.txt"));
    repoInfo = await getRepoInfoNoCache(packageRoot);
    const hashOfPackageWithoutFoo = await generateHashOfFiles(
      packageRoot,
      logger,
      repoInfo
    );
    expect(hashOfPackage).toEqual(hashOfPackageWithoutFoo);
  });
});
