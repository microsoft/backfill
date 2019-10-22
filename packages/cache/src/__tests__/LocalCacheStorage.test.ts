import * as fs from "fs-extra";
import * as path from "path";

import { setupFixture } from "backfill-utils-test";
import { CacheStorageConfig, outputFolderAsArray } from "backfill-config";
import { getCacheStorageProvider } from "../index";

const setupCacheStorage = async (fixtureName: string) => {
  await setupFixture(fixtureName);

  const cacheStorageConfig: CacheStorageConfig = {
    provider: "local"
  };
  const internalCacheFolder = path.join("node_modules", ".cache", "backfill");

  const cacheStorage = getCacheStorageProvider(
    cacheStorageConfig,
    internalCacheFolder
  );

  return { cacheStorage, internalCacheFolder };
};

function createFileInFolder(
  folder: string,
  filename: string,
  expectFolderExists: boolean
) {
  if (expectFolderExists) {
    expect(fs.pathExistsSync(folder)).toBe(true);
  }

  fs.outputFileSync(path.join(folder, filename), "");
}

function expectPathExists(pathToCheck: string, expectSuccess: boolean) {
  expect(fs.pathExistsSync(pathToCheck)).toBe(expectSuccess);
}

type CacheHelper = {
  fixtureName: string;
  hash: string;
  outputFolder: string | string[];
  expectSuccess?: boolean;
  errorMessage?: string;
};

async function fetchFromCache({
  fixtureName,
  hash,
  outputFolder,
  expectSuccess = true
}: CacheHelper) {
  const { cacheStorage, internalCacheFolder } = await setupCacheStorage(
    fixtureName
  );

  const secretFile = "qwerty";

  if (expectSuccess) {
    outputFolderAsArray(outputFolder).forEach(folder => {
      createFileInFolder(
        path.join(internalCacheFolder, hash, folder),
        secretFile,
        true
      );
    });
  }

  const fetchResult = await cacheStorage.fetch(hash, outputFolder);
  expect(fetchResult).toBe(expectSuccess);

  outputFolderAsArray(outputFolder).forEach(folder => {
    const pathToCheck = expectSuccess ? path.join(folder, secretFile) : folder;

    expectPathExists(pathToCheck, expectSuccess);
  });
}

async function putInCache({
  fixtureName,
  hash,
  outputFolder,
  expectSuccess = true,
  errorMessage
}: CacheHelper) {
  const { cacheStorage, internalCacheFolder } = await setupCacheStorage(
    fixtureName
  );

  const secretFile = "qwerty";

  if (expectSuccess) {
    outputFolderAsArray(outputFolder).forEach(folder => {
      createFileInFolder(folder, secretFile, false);
    });
  }

  if (expectSuccess) {
    await cacheStorage.put(hash, outputFolder);
  } else {
    await expect(cacheStorage.put(hash, outputFolder)).rejects.toThrow(
      errorMessage
    );
  }

  outputFolderAsArray(outputFolder).forEach(folder => {
    const pathToCheck = expectSuccess
      ? path.join(internalCacheFolder, hash, folder, secretFile)
      : internalCacheFolder;

    expectPathExists(pathToCheck, expectSuccess);
  });
}

describe("LocalCacheStorage", () => {
  describe("fetch", () => {
    it("will fetch on cache hit", async () => {
      await fetchFromCache({
        fixtureName: "with-cache",
        hash: "811c319a73f988d9260fbf3f1d30f0f447c2a194",
        outputFolder: "lib"
      });
    });

    it("will fetch on cache hit (output folder: dist)", async () => {
      await fetchFromCache({
        fixtureName: "with-cache-dist",
        hash: "46df1a257dfbde62b1e284f6382b20a49506f029",
        outputFolder: "dist"
      });
    });

    it("will fetch on cache hit (multiple output folders: lib and dist)", async () => {
      await fetchFromCache({
        fixtureName: "multiple-output-folders-with-cache",
        hash: "46df1a257dfbde62b1e284f6382b20a49506f029",
        outputFolder: ["lib", "dist"]
      });
    });

    it("will not fetch on cache miss", async () => {
      await fetchFromCache({
        fixtureName: "with-cache",
        hash: "incorrect_hash",
        outputFolder: "lib",
        expectSuccess: false
      });
    });
  });

  describe("put", () => {
    it("will put cache in store", async () => {
      await putInCache({
        fixtureName: "pre-built",
        hash: "811c319a73f988d9260fbf3f1d30f0f447c2a194",
        outputFolder: "lib"
      });
    });

    it("will put cache in store (output folder: dist)", async () => {
      await putInCache({
        fixtureName: "pre-built-dist",
        hash: "46df1a257dfbde62b1e284f6382b20a49506f029",
        outputFolder: "dist"
      });
    });

    it("will put cache in store (multiple output folders: lib and dist)", async () => {
      await putInCache({
        fixtureName: "multiple-output-folders",
        hash: "46df1a257dfbde62b1e284f6382b20a49506f029",
        outputFolder: ["lib", "dist"]
      });
    });

    it("will not persist cache when folder to cache does not exist", async () => {
      await putInCache({
        fixtureName: "basic",
        hash: "811c319a73f988d9260fbf3f1d30f0f447c2a194",
        outputFolder: "lib",
        expectSuccess: false,
        errorMessage: "backfill is trying to cache"
      });
    });
  });
});
