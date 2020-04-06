import { anyString, anything, spy, verify, resetCalls } from "ts-mockito";

import { setupFixture } from "backfill-utils-test";
import { getCacheStorageProvider } from "backfill-cache";
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
      outputGlob
    } = config;

    // Arrange
    const cacheStorage = getCacheStorageProvider(
      cacheStorageConfig,
      internalCacheFolder,
      logger,
      process.cwd()
    );
    const buildCommandRaw = "npm run compile";
    const buildCommand = createBuildCommand(
      [buildCommandRaw],
      clearOutput,
      outputGlob,
      logger
    );

    // Spy
    const spiedCacheStorage = spy(cacheStorage);
    const spiedBuildCommand = jest.fn(buildCommand);

    // Execute
    await backfill(
      config,
      cacheStorage,
      spiedBuildCommand,
      buildCommandRaw,
      logger
    );

    // Assert
    expect(spiedBuildCommand).toHaveBeenCalled();
    verify(spiedCacheStorage.fetch(anyString())).once();
    verify(spiedCacheStorage.put(anyString(), anything())).once();

    resetCalls(spiedCacheStorage);
    jest.clearAllMocks();

    // Execute
    await backfill(config, cacheStorage, buildCommand, buildCommandRaw, logger);

    // Assert
    expect(spiedBuildCommand).not.toHaveBeenCalled();
    verify(spiedCacheStorage.fetch(anyString())).once();
    verify(spiedCacheStorage.put(anyString(), anyString())).never();
  });
});
