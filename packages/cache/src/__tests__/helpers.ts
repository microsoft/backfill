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

export async function fetchFromCache({
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

export async function putInCache({
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
