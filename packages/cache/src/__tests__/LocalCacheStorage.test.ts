import * as fs from "fs-extra";
import * as path from "path";

import { setupFixture } from "backfill-utils-test";
import { CacheStorageConfig } from "backfill-config";
import { getCacheStorageProvider } from "../index";
import { logger } from "backfill-logger";

const setupCacheStorage = async (fixtureName: string) => {
  await setupFixture(fixtureName);

  const cacheStorageConfig: CacheStorageConfig = {
    provider: "local"
  };
  const internalCacheFolder = path.join("node_modules", ".cache", "backfill");

  const cacheStorage = getCacheStorageProvider(
    cacheStorageConfig,
    internalCacheFolder,
    logger,
    process.cwd()
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
  outputGlob?: string[];
  filesToCache?: string[];
  expectSuccess?: boolean;
  errorMessage?: string;
};

async function fetchFromCache({
  fixtureName,
  hash,
  expectSuccess = true
}: CacheHelper) {
  const { cacheStorage, internalCacheFolder } = await setupCacheStorage(
    fixtureName
  );

  const secretFile = "qwerty";

  if (expectSuccess) {
    createFileInFolder(path.join(internalCacheFolder, hash), secretFile, true);
  }

  const fetchResult = await cacheStorage.fetch(hash);
  expect(fetchResult).toBe(expectSuccess);

  expectPathExists(secretFile, expectSuccess);
}

async function putInCache({
  fixtureName,
  hash,
  outputGlob,
  filesToCache,
  expectSuccess = true,
  errorMessage
}: CacheHelper) {
  const { cacheStorage, internalCacheFolder } = await setupCacheStorage(
    fixtureName
  );

  if (!outputGlob) {
    throw new Error("outputGlob should be provided to the putInCache function");
  }

  if (!filesToCache) {
    throw new Error(
      "filesToCache should be provided to the putInCache function"
    );
  }

  if (expectSuccess) {
    filesToCache.forEach(f => createFileInFolder(".", f, false));
  }

  if (expectSuccess) {
    await cacheStorage.put(hash, outputGlob);
  } else {
    await expect(cacheStorage.put(hash, outputGlob)).rejects.toThrow(
      errorMessage
    );
  }

  filesToCache.forEach(f => {
    const pathToCheck = expectSuccess
      ? path.join(internalCacheFolder, hash, f)
      : internalCacheFolder;

    expectPathExists(pathToCheck, expectSuccess);
  });
}

describe("LocalCacheStorage", () => {
  describe("fetch", () => {
    it("will fetch on cache hit", async () => {
      await fetchFromCache({
        fixtureName: "with-cache",
        hash: "811c319a73f988d9260fbf3f1d30f0f447c2a194"
      });
    });

    it("will fetch on cache hit (output folder: dist)", async () => {
      await fetchFromCache({
        fixtureName: "with-cache-dist",
        hash: "46df1a257dfbde62b1e284f6382b20a49506f029"
      });
    });

    it("will fetch on cache hit (multiple output folders: lib and dist)", async () => {
      await fetchFromCache({
        fixtureName: "multiple-output-folders-with-cache",
        hash: "46df1a257dfbde62b1e284f6382b20a49506f029"
      });
    });

    it("will not fetch on cache miss", async () => {
      await fetchFromCache({
        fixtureName: "with-cache",
        hash: "incorrect_hash",
        expectSuccess: false
      });
    });
  });

  describe("put", () => {
    it("will put cache in store", async () => {
      await putInCache({
        fixtureName: "pre-built",
        hash: "811c319a73f988d9260fbf3f1d30f0f447c2a194",
        outputGlob: ["lib/**"],
        filesToCache: ["lib/qwerty"]
      });
    });

    it("will put cache in store (output folder: dist)", async () => {
      await putInCache({
        fixtureName: "pre-built-dist",
        hash: "46df1a257dfbde62b1e284f6382b20a49506f029",
        outputGlob: ["dist/**"],
        filesToCache: ["dist/qwerty"]
      });
    });

    it("will put cache in store (multiple output folders: lib and dist)", async () => {
      await putInCache({
        fixtureName: "multiple-output-folders",
        hash: "46df1a257dfbde62b1e284f6382b20a49506f029",
        outputGlob: ["lib/**", "dist/**"],
        filesToCache: ["lib/qwerty", "dist/azer/ty"]
      });
    });

    it("will not persist cache when folder to cache does not exist", async () => {
      await putInCache({
        fixtureName: "basic",
        hash: "811c319a73f988d9260fbf3f1d30f0f447c2a194",
        expectSuccess: false,
        outputGlob: ["lib/**", "dist/**"],
        filesToCache: [],
        errorMessage:
          "Couldn't find any file on disk matching the output glob (lib/**, dist/**)"
      });
    });

    it("will persist file matching glob in root folder", async () => {
      await putInCache({
        fixtureName: "basic",
        hash: "811c319a73f988d9260fbf3f1d30f0f447c2a194",
        outputGlob: ["tsconfig.tsbuildinfo"],
        filesToCache: ["tsconfig.tsbuildinfo"]
      });
    });

    it("will not persist file excluded by a glob", async () => {
      await putInCache({
        fixtureName: "basic",
        hash: "811c319a73f988d9260fbf3f1d30f0f447c2a194",
        expectSuccess: false,
        outputGlob: ["lib/**", "!lib/qwerty"],
        filesToCache: ["lib/qwerty"],
        errorMessage:
          "Couldn't find any file on disk matching the output glob (lib/**, !lib/qwerty)"
      });
    });

    it("will persist file when others are excluded in the same folder", async () => {
      await putInCache({
        fixtureName: "basic",
        hash: "46df1a257dfbde62b1e284f6382b20a49506f029",
        outputGlob: ["lib/**", "!lib/qwerty"],
        filesToCache: ["lib/azerty"]
      });
    });
  });
});
