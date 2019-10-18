import * as fs from "fs-extra";
import * as path from "path";

import { setupFixture } from "backfill-utils-test";
import { createDefaultConfig, outputFolderAsArray } from "backfill-config";
import { getCacheStorageProvider } from "../index";

describe("LocalCacheStorage", () => {
  const setupCacheStorage = async (fixtureName: string) => {
    await setupFixture(fixtureName);

    const cacheStorageConfig = createDefaultConfig().cacheStorageConfig;
    const internalCacheFolder = path.join("node_modules", ".cache", "backfill");

    const cacheStorage = getCacheStorageProvider(
      cacheStorageConfig,
      internalCacheFolder
    );

    return { cacheStorage, internalCacheFolder };
  };

  describe("fetch", () => {
    const fetchFromCache = async (
      fixtureName: string,
      hash: string,
      outputFolder: string | string[]
    ) => {
      // Setup
      const { cacheStorage, internalCacheFolder } = await setupCacheStorage(
        fixtureName
      );

      const secretFile = "qwerty";

      outputFolderAsArray(outputFolder).forEach(folder => {
        const secretFileInCache = path.join(
          internalCacheFolder,
          hash,
          folder,
          secretFile
        );

        //  Add file to the cache
        fs.outputFileSync(secretFileInCache, "");
      });

      // Execute
      const fetchResult = await cacheStorage.fetch(hash, outputFolder);

      // Verify that fetch finished successfully
      expect(fetchResult).toBe(true);

      outputFolderAsArray(outputFolder).forEach(folder => {
        // ... and that the secret file was copied over
        const secretFileInDestination = path.join(folder, secretFile);
        const secretFileExists = fs.pathExistsSync(secretFileInDestination);
        expect(secretFileExists).toBe(true);
      });
    };

    it("will fetch on cache hit", async () => {
      await fetchFromCache(
        "with-cache",
        "811c319a73f988d9260fbf3f1d30f0f447c2a194",
        "lib"
      );
    });

    it("will fetch on cache hit (output folder: dist)", async () => {
      await fetchFromCache(
        "any-location-with-cache",
        "46df1a257dfbde62b1e284f6382b20a49506f029",
        "dist"
      );
    });

    it("will fetch on cache hit (multiple output folders: lib and dist)", async () => {
      await fetchFromCache(
        "multiple-output-folders-with-cache",
        "46df1a257dfbde62b1e284f6382b20a49506f029",
        ["lib", "dist"]
      );
    });

    it("will not fetch on cache miss", async () => {
      // Setup
      const { cacheStorage } = await setupCacheStorage("with-cache");

      const hash = "incorrect_hash";
      const outputFolder = "lib";

      // Execute
      const fetchResult = await cacheStorage.fetch(hash, outputFolder);

      // Verify that fetch happened
      expect(fetchResult).toBe(false);

      // ... and that it worked by creating a lib folder
      const libFolderExist = await fs.pathExists(outputFolder);
      expect(libFolderExist).toBe(false);
    });
  });

  describe("put", () => {
    const putInCache = async (
      fixtureName: string,
      hash: string,
      outputFolder: string | string[]
    ) => {
      // Setup
      const { cacheStorage, internalCacheFolder } = await setupCacheStorage(
        fixtureName
      );

      const secretFile = "qwerty";

      outputFolderAsArray(outputFolder).forEach(folder => {
        const secretFileInDestination = path.join(folder, secretFile);

        // Add file to the cache
        fs.outputFileSync(secretFileInDestination, "");
      });

      // Execute
      await cacheStorage.put(hash, outputFolder);

      // Assert
      outputFolderAsArray(outputFolder).forEach(folder => {
        const secretFileInCache = path.join(
          internalCacheFolder,
          hash,
          folder,
          secretFile
        );

        const secretFileExists = fs.pathExistsSync(secretFileInCache);
        expect(secretFileExists).toBe(true);
      });
    };

    it("will put cache in store", async () => {
      await putInCache(
        "pre-built",
        "811c319a73f988d9260fbf3f1d30f0f447c2a194",
        "lib"
      );
    });

    it("will put cache in store (output folder: dist)", async () => {
      await putInCache(
        "any-location",
        "46df1a257dfbde62b1e284f6382b20a49506f029",
        "dist"
      );
    });

    it("will put cache in store (multiple output folders: lib and dist)", async () => {
      await putInCache(
        "multiple-output-folders",
        "46df1a257dfbde62b1e284f6382b20a49506f029",
        ["lib", "dist"]
      );
    });

    it("will not persist cache when folder to cache does not exist", async () => {
      // Setup
      const { cacheStorage, internalCacheFolder } = await setupCacheStorage(
        "basic"
      );

      const outputFolder = "lib";
      const hash = "811c319a73f988d9260fbf3f1d30f0f447c2a194";

      // Execute and assert
      await expect(cacheStorage.put(hash, outputFolder)).rejects.toThrow(
        "Folder to cache does not exist"
      );

      const cachedFolderExists = await fs.pathExists(internalCacheFolder);
      expect(cachedFolderExists).toBe(false);
    });
  });
});
