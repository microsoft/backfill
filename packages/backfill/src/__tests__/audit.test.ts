import path from "path";
import fs from "fs-extra";
import execa from "execa";

import { setupFixture } from "backfill-utils-test";

import { sideEffectWarningString, noSideEffectString } from "../audit";
import { findPathToBackfill } from "./helper";

describe("Audit", () => {
  let pathToBackfill: string;
  let backfillOutput: execa.ExecaReturnValue | undefined;
  let packageAPath: string;

  beforeAll(async () => {
    pathToBackfill = await findPathToBackfill();
  });

  beforeEach(async () => {
    backfillOutput = undefined;

    const monorepoPath = await setupFixture("monorepo");

    // Create a .git folder to help `--audit` identify the boundaries of the repo
    fs.mkdirpSync(path.join(monorepoPath, ".git"));

    packageAPath = path.join(monorepoPath, "packages", "package-a");
  });

  it("correctly returns success when there are no side-effects", async () => {
    backfillOutput = await execa(
      "node",
      [pathToBackfill, "--audit", "npm run compile"],
      { all: true, cwd: packageAPath }
    );

    expect(backfillOutput.all).toMatch(noSideEffectString);
  });

  it("correctly warns about side-effects", async () => {
    backfillOutput = await execa(
      "node",
      [
        pathToBackfill,
        "--audit",
        "npm run compile --scripts-prepend-node-path && npm run side-effect --scripts-prepend-node-path"
      ],
      { all: true, cwd: packageAPath }
    );

    expect(backfillOutput.all).toMatch(sideEffectWarningString);
    expect(backfillOutput.all).toMatch(path.join("packages", "DONE"));
  });
});
