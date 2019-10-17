import { anyString, spy, verify, resetCalls } from "ts-mockito";

import { setupFixture } from "backfill-utils-test";
import { getCacheStorageProvider } from "backfill-cache";
import { Hasher } from "backfill-hasher";
import { createConfig } from "backfill-config";

import { backfill } from "../index";
import { createBuildCommand } from "../commandRunner";

describe("backfill", () => {
  it("with cache miss and then cache hit", async () => {
    //  Set up
    await setupFixture("basic");

    const config = createConfig();
    const {
      cacheStorageConfig,
      clearOutputFolder,
      internalCacheFolder,
      outputFolder,
      packageRoot
    } = config;

    // Arrange
    const cacheStorage = getCacheStorageProvider(
      cacheStorageConfig,
      internalCacheFolder
    );
    const buildCommandRaw = "npm run compile";
    const buildCommand = createBuildCommand(
      [buildCommandRaw],
      clearOutputFolder,
      outputFolder
    );
    const hasher = new Hasher({ packageRoot }, buildCommandRaw);

    // Spy
    const spiedCacheStorage = spy(cacheStorage);
    const spiedBuildCommand = jest.fn(buildCommand);
    const spiedHasher = spy(hasher);

    // Execute
    await backfill(
      { ...config, outputPerformanceLogs: false },
      cacheStorage,
      spiedBuildCommand,
      hasher
    );

    // Assert
    verify(spiedHasher.createPackageHash()).once();
    expect(spiedBuildCommand).toHaveBeenCalled();
    verify(spiedCacheStorage.fetch(anyString(), anyString())).once();
    verify(spiedCacheStorage.put(anyString(), anyString())).once();

    resetCalls(spiedHasher);
    resetCalls(spiedCacheStorage);
    jest.clearAllMocks();

    // Execute
    await backfill(
      { ...config, outputPerformanceLogs: false },
      cacheStorage,
      buildCommand,
      hasher
    );

    // Assert
    verify(spiedHasher.createPackageHash()).once();
    expect(spiedBuildCommand).not.toHaveBeenCalled();
    verify(spiedCacheStorage.fetch(anyString(), anyString())).once();
    verify(spiedCacheStorage.put(anyString(), anyString())).never();
  });
});
