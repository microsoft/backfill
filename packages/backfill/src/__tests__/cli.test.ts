import * as fs from "fs-extra";
import { setupFixture } from "backfill-utils-test";

import { createBuildCommand } from "../commandRunner";

describe("createBuildCommand", () => {
  it("runs a command successfully", async () => {
    const buildCommand = createBuildCommand(["echo foo"], false, "");

    const buildResult = await buildCommand();

    if (buildResult) {
      expect(buildResult.stdout).toEqual("foo");
    }
  });

  it("resolves if no command can be found", async () => {
    const buildCommand = createBuildCommand([""], false, "");

    await expect(buildCommand()).rejects.toThrow("Command not provided");
  });

  it("prints the error command and throws if it fails", async () => {
    const buildCommand = createBuildCommand(["somecommand"], false, "");

    try {
      await buildCommand();
    } catch (err) {
      expect(err.stderr).toContain("somecommand");
      expect(err.code).not.toEqual(0);
    }
  });

  it("clears the output folder", async () => {
    await setupFixture("pre-built");
    const buildCommand = createBuildCommand(["echo foo"], true, "lib");

    const index_js_ExistsBeforeBuild = await fs.pathExists("lib/index.js");
    await buildCommand();
    const index_js_ExistsAfterBuild = await fs.pathExists("lib/index.js");

    expect(index_js_ExistsBeforeBuild).toEqual(true);
    expect(index_js_ExistsAfterBuild).toEqual(false);
  });
});
