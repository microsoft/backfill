import path from "path";
import fs from "fs-extra";
import execa from "execa";

import { setupFixture } from "backfill-utils-test";

import { findPathToBackfill } from "./helper";

describe("End to end", () => {
  let pathToBackfill: string;
  let hashPath: string;

  beforeAll(async () => {
    pathToBackfill = await findPathToBackfill();
    hashPath = path.join("node_modules", ".cache", "backfill");
  });

  it("works", async () => {
    const packageRoot = await setupFixture("basic");

    await execa("node", [pathToBackfill, "--", "npm run compile"], {
      cwd: packageRoot
    });

    // Verify it produces the correct hash
    const ownHash = fs.readdirSync(path.join(packageRoot, hashPath));
    expect(ownHash).toContain("88e8e1578cb7fd86d6162025488b985a49ee1482");

    // ... and that `npm run compile` was run successfully
    const libFolderExist = await fs.pathExists(path.join(packageRoot, "lib"));
    expect(libFolderExist).toBe(true);
  });

  it("fails on error with error code 1", async done => {
    const packageRoot = await setupFixture("basic");

    const execProcess = execa("node", [pathToBackfill, "--", "somecommand"], {
      cwd: packageRoot
    });

    execProcess.on("exit", code => {
      expect(code).toBe(1);
      done();
    });
  });
});
