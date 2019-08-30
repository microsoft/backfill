import * as path from "path";

import { setupFixture } from "backfill-utils-test";

import {
  getName,
  getEnvConfig,
  getSearchPaths,
  createDefaultConfig,
  createConfig
} from "../config";

describe("getName()", () => {
  it("get the name of the package", async () => {
    const packageRoot = await setupFixture("basic");
    const packageName = getName(packageRoot);

    expect(packageName).toBe("basic");
  });
});

describe("getEnvConfig()", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it("sets telemetry file folder through ENV variable", async () => {
    process.env["BACKFILL_TELEMETRY_FILE_FOLDER"] = "foo";

    const config = getEnvConfig();
    expect(config).toStrictEqual({ telemetryFileFolder: "foo" });
  });

  it("sets telemetry flag through ENV variable", async () => {
    process.env["BACKFILL_USE_TELEMETRY"] = "true";

    const config = getEnvConfig();
    expect(config).toStrictEqual({ useTelemetry: true });
  });

  it("sets local cache folder through ENV variable", async () => {
    process.env["BACKFILL_LOCAL_CACHE_FOLDER"] = "bar";

    const config = getEnvConfig();
    expect(config).toStrictEqual({ localCacheFolder: "bar" });
  });

  it("sets cache provider through ENV variable", async () => {
    const cacheStorageConfig = {
      provider: "npm",
      options: {
        npmPackageName: "package",
        registryUrl: "https://registry.npmjs.org/"
      }
    };

    process.env["BACKFILL_CACHE_PROVIDER"] = cacheStorageConfig.provider;
    process.env["BACKFILL_CACHE_PROVIDER_OPTIONS"] = JSON.stringify(
      cacheStorageConfig.options
    );

    const config = getEnvConfig();
    expect(config).toStrictEqual({ cacheStorageConfig: cacheStorageConfig });
  });

  it("sets telemetry report name through ENV variable", async () => {
    process.env["BACKFILL_TELEMETRY_REPORT_NAME"] = "report";

    const config = getEnvConfig();
    expect(config).toStrictEqual({ telemetryReportName: "report" });
  });
});

describe("getSearchPaths()", () => {
  it("find all instances of backfill.config.js", async () => {
    const packageRoot = await setupFixture("config");

    process.chdir(path.join(packageRoot, "packages", "package-1"));
    const searchPathsFromPackage1 = getSearchPaths();

    process.chdir(path.join(packageRoot, "packages", "package-2"));
    const searchPathsFromPackage2 = getSearchPaths();

    expect(searchPathsFromPackage1).toStrictEqual([
      path.join(packageRoot, "backfill.config.js"),
      path.join(packageRoot, "packages", "package-1", "backfill.config.js")
    ]);
    expect(searchPathsFromPackage2).toStrictEqual([
      path.join(packageRoot, "backfill.config.js")
    ]);
  });

  it("returns empty list when no backfill.config.js can be found", async () => {
    await setupFixture("basic");
    const searchPaths = getSearchPaths();

    expect(searchPaths).toStrictEqual([]);
  });
});

describe("createConfig()", () => {
  const originalEnv = process.env;

  beforeAll(() => {
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it("returns default config values when no config file and no ENV override is provided", async () => {
    await setupFixture("basic");
    const config = createConfig();

    const defaultLocalCacheFolder = createDefaultConfig().localCacheFolder;
    expect(config.localCacheFolder).toStrictEqual(defaultLocalCacheFolder);
  });

  it("returns config file value when config file is provided, and no ENV override", async () => {
    await setupFixture("config");
    const config = createConfig();

    expect(config.localCacheFolder).toStrictEqual("foo");
  });

  it("returns ENV override value when ENV override is provided", async () => {
    process.env["BACKFILL_LOCAL_CACHE_FOLDER"] = "bar";

    await setupFixture("config");
    const config = createConfig();

    expect(config.localCacheFolder).toStrictEqual("bar");
  });
});
