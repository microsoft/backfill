import { anyString, anything, spy, verify, resetCalls } from "ts-mockito";

import { setupFixture } from "backfill-utils-test";
import { getCacheStorageProvider } from "backfill-cache";
import { Hasher } from "backfill-hasher";
import { createConfig } from "backfill-config";
import { makeLogger } from "backfill-logger";

import { backfill } from "../index";
import { createBuildCommand } from "../commandRunner";

const logger = makeLogger("mute");

describe("backfill", () => {
  it("with cache miss and then cache hit", async () => {
    //  Set up
    await setupFixture("basic");

    const config = createConfig(logger, process.cwd());
    const {
      cacheStorageConfig,
      clearOutput,
      internalCacheFolder,
      outputGlob,
      packageRoot
    } = config;

    // Arrange
    const cacheStorage = getCacheStorageProvider(
      cacheStorageConfig,
      internalCacheFolder,
      logger
    );
    const buildCommandRaw = "npm run compile";
    const buildCommand = createBuildCommand(
      [buildCommandRaw],
      clearOutput,
      outputGlob,
      logger
    );
    const hasher = new Hasher(
      { packageRoot, outputGlob },
      buildCommandRaw,
      logger
    );

    // Spy
    const spiedCacheStorage = spy(cacheStorage);
    const spiedBuildCommand = jest.fn(buildCommand);
    const spiedHasher = spy(hasher);

    // Execute
    await backfill(config, cacheStorage, spiedBuildCommand, hasher, logger);

    // Assert
    verify(spiedHasher.createPackageHash()).once();
    expect(spiedBuildCommand).toHaveBeenCalled();
    verify(spiedCacheStorage.fetch(anyString())).once();
    verify(spiedCacheStorage.put(anyString(), anything())).once();

    resetCalls(spiedHasher);
    resetCalls(spiedCacheStorage);
    jest.clearAllMocks();

    // Execute
    await backfill(config, cacheStorage, buildCommand, hasher, logger);

    // Assert
    verify(spiedHasher.createPackageHash()).once();
    expect(spiedBuildCommand).not.toHaveBeenCalled();
    verify(spiedCacheStorage.fetch(anyString())).once();
    verify(spiedCacheStorage.put(anyString(), anyString())).never();
  });
});
