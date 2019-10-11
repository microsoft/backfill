import * as path from "path";
import { setupFixture } from "backfill-utils-test";

import getYarnWorkspaces from "../getYarnWorkspaces";

describe.only("getYarnWorkspaces()", () => {
  it("resolves all workspace references", async () => {
    const packageRoot = await setupFixture("monorepo");

    const workspacePaths = getYarnWorkspaces(packageRoot);

    const expectedWorkspacePaths = [
      path.join(packageRoot, "packages", "package-a"),
      path.join(packageRoot, "packages", "package-b")
    ];

    expect(workspacePaths).toEqual(expectedWorkspacePaths);
  });
});
