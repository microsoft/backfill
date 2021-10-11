import { Logger, makeLogger } from "backfill-logger";
import { getCacheStorageProvider, ICacheStorage } from "..";
import { AzureBlobCacheStorage } from "../AzureBlobCacheStorage";
import { LocalCacheStorage } from "../LocalCacheStorage";

describe("getCacheStorageProvider", () => {
  test("can get a local storage provider", () => {
    const provider = getCacheStorageProvider(
      {
        provider: "local",
      },
      "test",
      makeLogger("silly"),
      "cwd"
    );

    expect(provider instanceof LocalCacheStorage).toBeTruthy();
  });

  test("can get an azure-blob storage provider", () => {
    const provider = getCacheStorageProvider(
      {
        provider: "azure-blob",
        options: {
          connectionString: "some connection string",
          container: "some container",
        },
      },
      "test",
      makeLogger("silly"),
      "cwd"
    );

    expect(provider instanceof AzureBlobCacheStorage).toBeTruthy();
  });

  test("can get a custom storage provider", () => {
    expect.assertions(2);

    const TestProvider = class implements ICacheStorage {
      constructor(
        _options: any,
        _cacheFolder: string,
        _logger: Logger,
        _cwd: string
      ) {
        expect(_options.genericOption).toBeTruthy();
      }

      fetch(_hash: string) {
        return Promise.resolve(true);
      }

      put(_hash: string, _filesToCache: string[]) {
        return Promise.resolve();
      }
    };

    const provider = getCacheStorageProvider(
      {
        provider: TestProvider,
        options: {
          genericOption: true,
        },
      },
      "test",
      makeLogger("silly"),
      "cwd"
    );

    expect(provider instanceof TestProvider).toBeTruthy();
  });
});
