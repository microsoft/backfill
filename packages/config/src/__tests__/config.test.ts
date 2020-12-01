import path from "path";

import { setupFixture } from "backfill-utils-test";
import { makeLogger } from "backfill-logger";

import {
  getName,
  getEnvConfig,
  getSearchPaths,
  createDefaultConfig,
  createConfig,
} from "../index";

describe("getName()", () => {
  it("get the name of the package", async () => {
    const packageRoot = await setupFixture("basic");
    const packageName = getName(packageRoot);

    expect(packageName).toBe("basic");
  });
});

describe("getEnvConfig()", () => {
  const originalEnv = process.env;
  const logger = makeLogger("mute");

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it("sets log folder through ENV variable", async () => {
    process.env["BACKFILL_LOG_FOLDER"] = "foo";

    const config = getEnvConfig(logger);
    expect(config).toStrictEqual({ logFolder: "foo" });
  });

  it("sets the performance logging flag through ENV variable", async () => {
    process.env["BACKFILL_PRODUCE_PERFORMANCE_LOGS"] = "true";

    const config = getEnvConfig(logger);
    expect(config).toStrictEqual({ producePerformanceLogs: true });
  });

  it("sets local cache folder through ENV variable", async () => {
    process.env["BACKFILL_INTERNAL_CACHE_FOLDER"] = "bar";

    const config = getEnvConfig(logger);
    expect(config).toStrictEqual({ internalCacheFolder: "bar" });
  });

  it("sets cache provider through ENV variable", async () => {
    const cacheStorageConfig = {
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
    expect(config).toStrictEqual({ cacheStorageConfig: cacheStorageConfig });
  });

  it("sets performance report name through ENV variable", async () => {
    process.env["BACKFILL_PERFORMANCE_REPORT_NAME"] = "report";

    const config = getEnvConfig(logger);
    expect(config).toStrictEqual({ performanceReportName: "report" });
  });
});

describe("getSearchPaths()", () => {
  it("find all instances of backfill.config.js", async () => {
    const packageRoot = await setupFixture("config");

    const pathPackage1 = path.join(packageRoot, "packages", "package-1");
    const searchPathsFromPackage1 = getSearchPaths(pathPackage1);

    const pathPackage2 = path.join(packageRoot, "packages", "package-2");
    const searchPathsFromPackage2 = getSearchPaths(pathPackage2);

    expect(searchPathsFromPackage1).toStrictEqual([
      path.join(packageRoot, "backfill.config.js"),
      path.join(packageRoot, "packages", "package-1", "backfill.config.js"),
    ]);
    expect(searchPathsFromPackage2).toStrictEqual([
      path.join(packageRoot, "backfill.config.js"),
    ]);
  });

  it("returns empty list when no backfill.config.js can be found", async () => {
    const fixtureLocation = await setupFixture("basic");
    const searchPaths = getSearchPaths(fixtureLocation);

    expect(searchPaths).toStrictEqual([]);
  });
});

describe("createConfig()", () => {
  const originalEnv = process.env;
  const logger = makeLogger("info");

  beforeAll(() => {
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it("returns default config values when no config file and no ENV override is provided", async () => {
    const fixtureLocation = await setupFixture("basic");
    const config = createConfig(logger, fixtureLocation);

    const defaultLocalCacheFolder = createDefaultConfig(fixtureLocation)
      .internalCacheFolder;
    expect(config.internalCacheFolder).toStrictEqual(defaultLocalCacheFolder);
  });

  it("returns config file value when config file is provided, and no ENV override", async () => {
    const fixtureLocation = await setupFixture("config");
    const config = createConfig(logger, fixtureLocation);

    expect(config.internalCacheFolder).toStrictEqual("foo");
  });

  it("returns ENV override value when ENV override is provided", async () => {
    process.env["BACKFILL_INTERNAL_CACHE_FOLDER"] = "bar";

    const fixtureLocation = await setupFixture("config");
    const config = createConfig(logger, fixtureLocation);

    expect(config.internalCacheFolder).toStrictEqual("bar");
  });
});
