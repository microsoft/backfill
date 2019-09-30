import * as fs from "fs-extra";
import * as path from "path";
import { logger } from "backfill-logger";
import { setupFixture } from "backfill-utils-test";
import { createConfig } from "backfill-config";

import {
  initializeWatcher,
  closeWatcher,
  sideEffectCallToActionString,
  noSideEffectString
} from "../audit";

describe("Audit", () => {
  beforeEach(async () => {
    const monorepoPath = await setupFixture("monorepo");

    // Create a .git folder to help `--audit` identify the boundaries of the repo
    fs.mkdirpSync(".git");

    const packageAPath = path.join(monorepoPath, "packages", "package-a");
    process.chdir(packageAPath);

    const {
      packageRoot,
      internalCacheFolder,
      logFolder,
      outputFolder,
      watchGlobs
    } = createConfig();

    initializeWatcher(
      packageRoot,
      internalCacheFolder,
      logFolder,
      outputFolder,
      watchGlobs
    );
  });

  it("correctly returns success when there are no side-effects", async () => {
    const spy = jest.spyOn(logger, "info");

    fs.copyFileSync("src", "lib");
    await closeWatcher();

    expect(spy).toBeCalledWith(noSideEffectString);

    spy.mockRestore();
  });

  it("correctly warns about side-effects", async () => {
    const spy = jest.spyOn(logger, "warn");

    fs.copyFileSync("src", "lib");
    fs.createFileSync(path.join("..", "DONE"));
    await closeWatcher();

    expect(spy.mock.calls[1][0]).toContain("monorepo/packages/DONE");
    expect(spy.mock.calls[2][0]).toContain(sideEffectCallToActionString);

    spy.mockRestore();
  });
});
