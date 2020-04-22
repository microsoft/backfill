import path from "path";

import { setupFixture } from "backfill-utils-test";

import { getYarnWorkspaces } from "../yarnWorkspaces";

describe("getYarnWorkspaces()", () => {
  it("gets the name and path of the workspaces", async () => {
    const packageRoot = await setupFixture("monorepo");
    const workspacesPackageInfo = getYarnWorkspaces(packageRoot);

    const packageAPath = path.join(packageRoot, "packages", "package-a");
    const packageBPath = path.join(packageRoot, "packages", "package-b");

    expect(workspacesPackageInfo).toEqual([
      { name: "package-a", path: packageAPath },
      { name: "package-b", path: packageBPath }
    ]);
  });
});
