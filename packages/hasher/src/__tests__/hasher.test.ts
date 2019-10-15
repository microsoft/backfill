import { setupFixture } from "backfill-utils-test";

import { createHash } from "../helpers";
import { Hasher } from "../index";

describe("createHash()", () => {
  it("creates different hashes given different lists", () => {
    const list = [];

    list.push("foo");
    list.push("bar");

    const hash = createHash(list);

    list.push("baz");
    const hashWithBaz = createHash(list);

    expect(hash).not.toEqual(hashWithBaz);

    list.pop();
    const hashWithoutBaz = createHash(list);

    expect(hash).toEqual(hashWithoutBaz);
  });

  it("lists of different order produce the same hash", () => {
    const list = [];

    list.push("foo");
    list.push("bar");

    const hash = createHash(list);

    list.reverse();
    const hashReverse = createHash(list);

    expect(hash).toEqual(hashReverse);
  });
});

describe("The main Hasher class", () => {
  const setupFixtureAndReturnHash = async (fixture: string = "monorepo") => {
    const packageRoot = await setupFixture(fixture);

    const options = { packageRoot, hashGlobs: ["**"] };
    const buildSignature = "yarn build";

    const hasher = new Hasher(options, buildSignature);
    const hash = await hasher.createPackageHash();

    return hash;
  };

  it("creates different hashes given different fixtures", async () => {
    const hash = await setupFixtureAndReturnHash();
    const hashOfBasic = await setupFixtureAndReturnHash("basic");

    expect(hash).not.toEqual(hashOfBasic);

    const hashOfMonorepoAgain = await setupFixtureAndReturnHash();

    expect(hash).toEqual(hashOfMonorepoAgain);
  });
});
