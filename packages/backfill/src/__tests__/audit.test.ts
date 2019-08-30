import * as path from "path";
import * as findUp from "find-up";
import * as shelljs from "shelljs";
import execa = require("execa");

import { setupFixture } from "backfill-utils-test";

describe("Audit", () => {
  let pathToBackfill: string;
  let backfillOutput: execa.ExecaReturns | undefined;

  beforeAll(async () => {
    const findPathToBackfill = await findUp(path.join("bin", "backfill.js"), {
      cwd: __dirname
    });
    if (!findPathToBackfill) {
      throw new Error("Cannot find path to `backfill` command");
    }

    pathToBackfill = findPathToBackfill;
  });

  beforeEach(async () => {
    backfillOutput = undefined;

    const monorepoPath = await setupFixture("monorepo");

    // Create a .git folder to help `--audit` identify the boundaries of the repo
    shelljs.mkdir(".git");

    const packageAPath = path.join(monorepoPath, "packages", "package-a");
    process.chdir(packageAPath);
  });

  it("correctly returns success when there are no side-effects", async () => {
    backfillOutput = await execa("node", [
      pathToBackfill,
      "--audit",
      "npm run compile"
    ]);

    expect(backfillOutput.stdout).toMatch("[success]");
  });

  it("correctly warns about side-effects", async () => {
    backfillOutput = await execa("node", [
      pathToBackfill,
      "--audit",
      "npm run compile && npm run side-effect"
    ]);

    expect(backfillOutput.stdout).toMatch("[warning]");
    expect(backfillOutput.stdout).toMatch("monorepo/packages/DONE");
  });
});
