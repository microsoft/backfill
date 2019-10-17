import * as fs from "fs-extra";
import * as path from "path";
import execa = require("execa");
import { setupFixture } from "backfill-utils-test";

import { findPathToBackfill } from "./helper";
import { sideEffectWarningString, noSideEffectString } from "../audit";

describe("Audit", () => {
  let pathToBackfill: string;
  let backfillOutput: execa.ExecaReturnValue | undefined;

  beforeAll(async () => {
    pathToBackfill = await findPathToBackfill();
  });

  beforeEach(async () => {
    backfillOutput = undefined;

    const monorepoPath = await setupFixture("monorepo");

    // Create a .git folder to help `--audit` identify the boundaries of the repo
    fs.mkdirpSync(".git");

    const packageAPath = path.join(monorepoPath, "packages", "package-a");
    process.chdir(packageAPath);
  });

  it("correctly returns success when there are no side-effects", async () => {
    backfillOutput = await execa(
      "node",
      [pathToBackfill, "--audit", "npm run compile"],
      { all: true }
    );

    expect(backfillOutput.all).toMatch(noSideEffectString);
  });

  it("correctly warns about side-effects", async () => {
    backfillOutput = await execa(
      "node",
      [pathToBackfill, "--audit", "npm run compile && npm run side-effect"],
      { all: true }
    );

    expect(backfillOutput.all).toMatch(sideEffectWarningString);
    expect(backfillOutput.all).toMatch("packages/DONE");
  });
});
