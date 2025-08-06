import fs from "fs";
import path from "path";
import { setupFixture, removeTempDir } from "backfill-utils-test";
import { makeLogger } from "backfill-logger";
import {
  getName,
  getEnvConfig,
  getSearchPaths,
  createDefaultConfig,
  createConfig,
} from "../index";
import type { CacheStorageConfig } from "../cacheConfig";

describe("getName()", () => {
  let packageRoot = "";

  afterEach(() => {
    packageRoot && removeTempDir(packageRoot);
    packageRoot = "";
  });

  it("get the name of the package", async () => {
    packageRoot = setupFixture("basic");
    const packageName = getName(packageRoot);

    expect(packageName).toBe("basic");
  });
});

describe("getEnvConfig()", () => {
  const originalEnv = { ...process.env };
  const logger = makeLogger("mute");

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it("sets log folder through env variable", () => {
    process.env["BACKFILL_LOG_FOLDER"] = "foo";

    const config = getEnvConfig(logger);
    expect(config).toStrictEqual({ logFolder: "foo" });
  });

  it("sets the performance logging flag through env variable", () => {
    process.env["BACKFILL_PRODUCE_PERFORMANCE_LOGS"] = "true";

    const config = getEnvConfig(logger);
    expect(config).toStrictEqual({ producePerformanceLogs: true });
  });

  it("sets local cache folder through env variable", () => {
    process.env["BACKFILL_INTERNAL_CACHE_FOLDER"] = "bar";

    const config = getEnvConfig(logger);
    expect(config).toStrictEqual({ internalCacheFolder: "bar" });
  });

  it("sets cache provider through env variables", () => {
    const cacheStorageConfig: CacheStorageConfig = {
      provider: "npm",
      options: {
        npmPackageName: "package",
        registryUrl: "https://registry.npmjs.org/",
      },
    };

    process.env["BACKFILL_CACHE_PROVIDER"] = cacheStorageConfig.provider;
    process.env["BACKFILL_CACHE_PROVIDER_OPTIONS"] = JSON.stringify(
      cacheStorageConfig.options
    );

    const config = getEnvConfig(logger);
    expect(config).toStrictEqual({ cacheStorageConfig });
  });

  it("sets performance report name through env variable", () => {
    process.env["BACKFILL_PERFORMANCE_REPORT_NAME"] = "report";

    const config = getEnvConfig(logger);
    expect(config).toStrictEqual({ performanceReportName: "report" });
  });

  it("throws on invalid log level", () => {
    process.env["BACKFILL_LOG_LEVEL"] = "nope";
    expect(() => createConfig(logger, "foo"))
      .toThrowErrorMatchingInlineSnapshot(`
     "Backfill config option BACKFILL_LOG_LEVEL was set to an invalid value.
     Expected: one of silly, verbose, info, warn, error, mute
     Received: nope"
    `);
  });

  it("throws on invalid mode", () => {
    process.env["BACKFILL_MODE"] = "nope";
    expect(() => createConfig(logger, "foo"))
      .toThrowErrorMatchingInlineSnapshot(`
     "Backfill config option BACKFILL_MODE was set to an invalid value.
     Expected: one of READ_ONLY, WRITE_ONLY, READ_WRITE, PASS
     Received: nope"
    `);
  });

  it("throws on invalid output glob", () => {
    process.env["BACKFILL_OUTPUT_GLOB"] = "nope";
    expect(() => createConfig(logger, "foo"))
      .toThrowErrorMatchingInlineSnapshot(`
     "Backfill config option BACKFILL_OUTPUT_GLOB was set to an invalid value.
     Expected: array of strings
     Received: nope"
    `);
  });

  it("throws on invalid npm cache provider options", () => {
    process.env["BACKFILL_CACHE_PROVIDER"] = "npm";
    process.env["BACKFILL_CACHE_PROVIDER_OPTIONS"] = "invalid-json";
    expect(() => getEnvConfig(logger)).toThrow(
      `Could not parse BACKFILL_CACHE_PROVIDER_OPTIONS as JSON:\n"invalid-json"`
    );

    process.env["BACKFILL_CACHE_PROVIDER_OPTIONS"] = "{}";
    expect(() => getEnvConfig(logger)).toThrowErrorMatchingInlineSnapshot(`
     "Invalid BACKFILL_CACHE_PROVIDER_OPTIONS for BACKFILL_CACHE_PROVIDER="npm":
     Expected: object with string values for keys "npmPackageName", "registryUrl"
     Received: "{}""
    `);
  });

  it("throws on invalid azure-blob cache provider options", () => {
    process.env["BACKFILL_CACHE_PROVIDER"] = "azure-blob";
    process.env["BACKFILL_CACHE_PROVIDER_OPTIONS"] = "invalid-json";
    expect(() => getEnvConfig(logger)).toThrow(
      `Could not parse BACKFILL_CACHE_PROVIDER_OPTIONS as JSON:\n"invalid-json"`
    );

    process.env["BACKFILL_CACHE_PROVIDER_OPTIONS"] = "{}";
    expect(() => getEnvConfig(logger)).toThrowErrorMatchingInlineSnapshot(`
     "Invalid BACKFILL_CACHE_PROVIDER_OPTIONS for BACKFILL_CACHE_PROVIDER="azure-blob":
     Expected: object with string values for keys "connectionString", "container"
     Received: "{}""
    `);
  });

  // This should be updated to check for a thrown error once more config
  // validation is added in a major version
  it("does not throw on invalid cache provider name", () => {
    const warnSpy = jest.spyOn(logger, "warn");
    process.env["BACKFILL_CACHE_PROVIDER"] = "nope";
    process.env["BACKFILL_CACHE_PROVIDER_OPTIONS"] = "stuff";

    const config = getEnvConfig(logger);
    expect(config.cacheStorageConfig).toBeUndefined();
    expect(warnSpy).toHaveBeenCalledWith(
      'Ignoring unknown BACKFILL_CACHE_PROVIDER: "nope"'
    );
  });
});

describe("getSearchPaths()", () => {
  let packageRoot = "";

  afterEach(() => {
    packageRoot && removeTempDir(packageRoot);
    packageRoot = "";
  });

  it("finds all instances of backfill.config.js", async () => {
    packageRoot = setupFixture("config");

    const pathPackage1 = path.join(packageRoot, "packages/package-1");
    const searchPathsFromPackage1 = getSearchPaths(pathPackage1);

    const pathPackage2 = path.join(packageRoot, "packages/package-2");
    const searchPathsFromPackage2 = getSearchPaths(pathPackage2);

    expect(searchPathsFromPackage1).toStrictEqual([
      path.join(packageRoot, "backfill.config.js"),
      path.join(packageRoot, "packages/package-1/backfill.config.js"),
    ]);
    expect(searchPathsFromPackage2).toStrictEqual([
      path.join(packageRoot, "backfill.config.js"),
    ]);
  });

  it("returns empty list when no backfill.config.js can be found", async () => {
    packageRoot = setupFixture("basic");
    const searchPaths = getSearchPaths(packageRoot);

    expect(searchPaths).toStrictEqual([]);
  });
});

describe("createConfig()", () => {
  const originalEnv = process.env;
  const logger = makeLogger("info");
  let packageRoot = "";

  beforeAll(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    packageRoot && removeTempDir(packageRoot);
    packageRoot = "";
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it("returns default config values when no config file and no env override is provided", async () => {
    packageRoot = setupFixture("basic");
    const config = createConfig(logger, packageRoot);

    const defaultLocalCacheFolder =
      createDefaultConfig(packageRoot).internalCacheFolder;
    expect(config.internalCacheFolder).toStrictEqual(defaultLocalCacheFolder);
  });

  it("returns config file value when config file is provided, and no env override", async () => {
    packageRoot = setupFixture("config");
    const config = createConfig(logger, packageRoot);

    expect(config.internalCacheFolder).toStrictEqual("foo");
    // this one isn't set in the config file, so the default should be used
    expect(config.logLevel).toStrictEqual("info");
  });

  it("returns env override value when env override is provided", async () => {
    process.env["BACKFILL_INTERNAL_CACHE_FOLDER"] = "bar";

    packageRoot = setupFixture("config");
    const config = createConfig(logger, packageRoot);

    expect(config.internalCacheFolder).toStrictEqual("bar");
    // this one isn't set in the config file or env, so the default should be used
    expect(config.logLevel).toStrictEqual("info");
  });

  // For some reason, "mode" is the only option that throws if invalid as of writing
  it("throws on an invalid mode", async () => {
    packageRoot = setupFixture("config");
    fs.writeFileSync(
      path.join(packageRoot, "backfill.config.js"),
      "module.exports = { mode: 'invalid-mode' };"
    );

    expect(() => createConfig(logger, packageRoot)).toThrow("invalid-mode");
  });

  // This should be removed once more config validation is added in a major version
  it("does not throw on other invalid options", async () => {
    packageRoot = setupFixture("config");
    fs.writeFileSync(
      path.join(packageRoot, "backfill.config.js"),
      "module.exports = { logLevel: 'nope', cacheStorageConfig: 'hmm' };"
    );

    const config = createConfig(logger, packageRoot);
    // no validation of these other options
    expect(config.logLevel).toBe("nope");
    expect(config.cacheStorageConfig).toBe("hmm");
  });
});
