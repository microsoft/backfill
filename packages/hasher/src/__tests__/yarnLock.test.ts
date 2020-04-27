import { setupFixture } from "backfill-utils-test";

import { parseLockFile } from "../lockfile";

describe("parseLockFile()", () => {
  it("parses yarn.lock file when it is found", async () => {
    const packageRoot = await setupFixture("basic");
    const parsedLockeFile = await parseLockFile(packageRoot);

    expect(parsedLockeFile).toHaveProperty("type", "success");
  });

  it("throws if it cannot find a yarn.lock file", async () => {
    const packageRoot = await setupFixture("basic-without-lock-file");

    await expect(parseLockFile(packageRoot)).rejects.toThrow(
      "Could not find a yarn.lock file"
    );
  });
});
