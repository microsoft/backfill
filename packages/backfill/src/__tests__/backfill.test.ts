import { anyString, spy, verify, resetCalls } from "ts-mockito";

import { setupFixture } from "backfill-utils-test";
import { getCacheStorageProvider } from "backfill-cache";

import { backfill } from "../index";
import { DependencyResolver } from "../dependencyResolver";
import { Hasher } from "../hasher";
import { createBuildCommand } from "../commandRunner";
import { createConfig } from "../config";

describe("backfill", () => {
  it("with cache miss and then cache hit", async () => {
    //  Set up
    await setupFixture("basic");

    const config = createConfig();
    const {
      cacheStorageConfig,
      hashFileFolder,
      packageRoot,
      localCacheFolder,
      watchGlobs
    } = config;

    // Arrange
    const cacheStorage = getCacheStorageProvider(
      cacheStorageConfig,
      localCacheFolder
    );
    const buildCommandRaw = "npm run compile";
    const buildCommand = createBuildCommand([buildCommandRaw]);
    const hasher = new Hasher(
      { packageRoot, watchGlobs, hashFileFolder },
      buildCommandRaw,
      new DependencyResolver({ packageRoot })
    );

    // Spy
    const spiedCacheStorage = spy(cacheStorage);
    const spiedBuildCommand = jest.fn(buildCommand);
    const spiedHasher = spy(hasher);

    // Execute
    await backfill(
      { ...config, useTelemetry: false },
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
      { ...config, useTelemetry: false },
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
