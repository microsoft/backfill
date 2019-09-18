import * as path from "path";
import * as fs from "fs-extra";
import * as execa from "execa";

import { findPathToBackfill } from "./helper";
import { setupFixture } from "backfill-utils-test";

describe("End to end", () => {
  let pathToBackfill: string;
  let hashPath: string;

  beforeAll(async () => {
    pathToBackfill = await findPathToBackfill();
    hashPath = path.join("node_modules", ".cache", "backfill", "hash");
  });

  it("works", async () => {
    await setupFixture("basic");
    await execa("node", [pathToBackfill, "--", "npm run compile"]);

    // Verify it produces the correct hash
    const ownHash = fs.readFileSync(hashPath).toString();
    expect(ownHash).toEqual("632a3243cb2f7f0905efe0f1cc9216b582523290");

    // ... and that `npm run compile` was run successfully
    const libFolderExist = await fs.pathExists("lib");
    expect(libFolderExist).toBe(true);
  });

  it("only produces a hash file if called with `--hash-only`", async () => {
    await setupFixture("basic");
    await execa("node", [pathToBackfill, "--hash-only"]);

    // Verify it produces the same hash as the previous test
    const ownHash = fs.readFileSync(hashPath).toString();
    expect(ownHash).toEqual("632a3243cb2f7f0905efe0f1cc9216b582523290");

    // ... and that it didn't fetch or produce a lib folder
    const libFolderExist = await fs.pathExists("lib");
    expect(libFolderExist).toBe(false);
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
