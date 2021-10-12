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

  test("can get a custom storage provider as a class", () => {
    const TestProvider = class implements ICacheStorage {
      constructor(private logger: Logger, private cwd: string) {}

      fetch(hash: string) {
        this.logger.silly(`fetching ${this.cwd} ${hash}`);
        return Promise.resolve(true);
      }

      put(hash: string, filesToCache: string[]) {
        this.logger.silly(
          `putting ${this.cwd} ${hash} ${filesToCache.length} files`
        );
        return Promise.resolve();
      }
    };

    const provider = getCacheStorageProvider(
      {
        provider: (logger, cwd) => new TestProvider(logger, cwd),
      },
      "test",
      makeLogger("silly"),
      "cwd"
    );

    expect(provider.fetch).toBeTruthy();
    expect(provider.put).toBeTruthy();
  });
});
