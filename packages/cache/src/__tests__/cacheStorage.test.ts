import * as fs from "fs-extra";
import * as path from "path";

import { setupFixture } from "backfill-utils-test";
import { getCacheStorageProvider } from "../index";
import { CacheStorageConfig } from "../index";

describe("LocalCacheStorage", () => {
  const setupCacheStorage = async (fixtureName: string) => {
    await setupFixture(fixtureName);

    // TODO: Import from config
    const cacheStorageConfig: CacheStorageConfig = {
      provider: "local"
    };
    const localCacheFolder = path.join("node_modules", ".cache", "backfill");

    const cacheStorage = getCacheStorageProvider(
      cacheStorageConfig,
      localCacheFolder
    );

    return { cacheStorage, localCacheFolder };
  };

  describe("fetch", () => {
    const fetchFromCache = async (
      fixtureName: string,
      hashToFetch: string,
      destinationFolder: string
    ) => {
      // Setup
      const { cacheStorage, localCacheFolder } = await setupCacheStorage(
        fixtureName
      );

      const secretFile = "qwerty";
      const secretFileInCache = path.join(
        localCacheFolder,
        hashToFetch,
        destinationFolder,
        secretFile
      );
      const secretFileInDestination = path.join(destinationFolder, secretFile);

      // Touch Add file to the cache
      const touchTime = new Date();
      await fs.utimes(secretFileInCache, touchTime, touchTime);

      // Execute
      const fetchResult = await cacheStorage.fetch(
        hashToFetch,
        destinationFolder
      );

      // Verify that fetch finished successfully
      expect(fetchResult).toBe(true);

      // ... and that the secret file was copied over
      const secretFileExists = await fs.pathExists(secretFileInDestination);
      expect(secretFileExists).toBe(true);
    };

    it("will fetch on cache hit", async () => {
      await fetchFromCache(
        "with-cache",
        "811c319a73f988d9260fbf3f1d30f0f447c2a194",
        "lib"
      );
    });

    it("will fetch on cache hit (destination folder is dist instead of lib)", async () => {
      await fetchFromCache(
        "any-location-with-cache",
        "46df1a257dfbde62b1e284f6382b20a49506f029",
        "dist"
      );
    });

    it("will not fetch on cache miss", async () => {
      // Setup
      const { cacheStorage } = await setupCacheStorage("with-cache");

      const hashToFetch = "incorrect_hash";
      const destinationFolder = "lib";

      // Execute
      const fetchResult = await cacheStorage.fetch(
        hashToFetch,
        destinationFolder
      );

      // Verify that fetch happened
      expect(fetchResult).toBe(false);

      // ... and that it worked by creating a lib folder
      const libFolderExist = await fs.pathExists(destinationFolder);
      expect(libFolderExist).toBe(false);
    });
  });

  describe("put", () => {
    const putInCache = async (
      fixtureName: string,
      hashToPut: string,
      destinationFolder: string
    ) => {
      // Setup
      const { cacheStorage, localCacheFolder } = await setupCacheStorage(
        fixtureName
      );

      const secretFile = "qwerty";
      const secretFileInCache = path.join(
        localCacheFolder,
        hashToPut,
        destinationFolder,
        secretFile
      );
      const secretFileInDestination = path.join(destinationFolder, secretFile);

      // Add file to the cache
      const touchTime = new Date();
      await fs.utimes(secretFileInDestination, touchTime, touchTime);

      // Execute
      await cacheStorage.put(hashToPut, destinationFolder);

      // Assert
      const secretFileExists = await fs.pathExists(secretFileInCache);
      expect(secretFileExists).toBe(true);
    };

    it("will put cache in store", async () => {
      await putInCache(
        "pre-built",
        "811c319a73f988d9260fbf3f1d30f0f447c2a194",
        "lib"
      );
    });

    it("will put cache in store (cache folder is dist instead of lib)", async () => {
      await putInCache(
        "any-location",
        "46df1a257dfbde62b1e284f6382b20a49506f029",
        "dist"
      );
    });

    it("will not persist cache when folder to cache does not exist", async () => {
      // Setup
      const { cacheStorage, localCacheFolder } = await setupCacheStorage(
        "basic"
      );

      const folderToCache = "lib";
      const hash = "811c319a73f988d9260fbf3f1d30f0f447c2a194";

      // Execute
      await expect(() => cacheStorage.put(hash, folderToCache)).toThrowError(
        "Folder to cache does not exist"
      );

      // Assert
      const cachedFolderExists = await fs.pathExists(localCacheFolder);
      expect(cachedFolderExists).toBe(false);
    });
  });
});
