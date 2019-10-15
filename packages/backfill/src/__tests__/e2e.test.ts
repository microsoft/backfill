import * as path from "path";
import * as fs from "fs-extra";
import * as execa from "execa";
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
    await execa("node", [pathToBackfill, "--", "npm run compile"]);

    // Verify it produces the correct hash
    const ownHash = fs.readdirSync(path.join(packageRoot, hashPath));
    expect(ownHash).toContain("e29a5c3aeebd42261514e0ce0b97eaafb77dbe3a");

    // ... and that `npm run compile` was run successfully
    const libFolderExist = await fs.pathExists("lib");
    expect(libFolderExist).toBe(true);
  });

  it("fails on error with error code 1", async done => {
    await setupFixture("basic");
    const execProcess = execa("node", [pathToBackfill, "--", "somecommand"]);

    execProcess.on("exit", code => {
      expect(code).toBe(1);
      done();
    });
  });
});
