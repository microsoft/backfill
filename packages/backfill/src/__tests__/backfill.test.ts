import path from "path";
import fs from "fs-extra";

import { setupFixture } from "backfill-utils-test";
import { createConfig } from "backfill-config";
import { makeLogger } from "backfill-logger";

import { backfill } from "../index";

const logger = makeLogger("mute");

describe("backfill", () => {
  it("with cache miss and then cache hit", async () => {
    //  Set up
    const fixtureLocation = await setupFixture("basic");

    const config = createConfig(logger, fixtureLocation);

    const salt = "fooBar";
    let buildCalled = 0;
    const outputContent = `console.log("foo");`;
    const buildCommand = async (): Promise<void> => {
      await fs.mkdirp(path.join(fixtureLocation, "lib"));
      await fs.writeFile(
        path.join(fixtureLocation, "lib", "output.js"),
        outputContent
      );
      buildCalled += 1;
    };

    // Execute
    await backfill(config, buildCommand, salt, logger);

    // Assert
    expect(buildCalled).toBe(1);
    expect(
      fs.readFileSync(path.join(fixtureLocation, "lib", "output.js")).toString()
    ).toBe(outputContent);

    // Reset
    buildCalled = 0;

    // Change the output file to check that it is later properly retrieved from cache
    // and to check that it does not change the package hash because it is gitignored.
    await fs.writeFile(
      path.join(fixtureLocation, "lib", "output.js"),
      "This output should be overriden by backfill during fetch"
    );

    // Execute
    await backfill(config, buildCommand, salt, logger);

    // Assert
    expect(buildCalled).toBe(0);
    expect(
      fs.readFileSync(path.join(fixtureLocation, "lib", "output.js")).toString()
    ).toBe(outputContent);
  });
});
