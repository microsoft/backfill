import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { Logger, makeLogger } from "backfill-logger";
import { CacheStorage } from "../CacheStorage";

export class LocalCacheStorage extends CacheStorage {
  filesToCache: string[] | undefined;
  constructor(logger: Logger, cwd: string) {
    super(logger, cwd, true);
  }

  protected async _fetch(_hash: string): Promise<boolean> {
    return false;
  }
  protected async _put(_hash: string, filesToCache: string[]): Promise<void> {
    this.filesToCache = filesToCache;
  }
}

describe("getCacheStorage", () => {
  test("only cache files that have changed", async () => {
    const logger = makeLogger("silly");
    const dir = fs.mkdtempSync(
      path.join(os.tmpdir(), "test-backfill-cache-1-")
    );
    const storage = new LocalCacheStorage(logger, dir);

    // makes sure there is no cache interference between tests
    const hash = `${dir}-hash`;

    fs.writeFileSync(path.join(dir, "notChanging"), "not changing content");
    fs.writeFileSync(path.join(dir, "Changing"), "changing content");

    await storage.fetch(hash);

    fs.writeFileSync(path.join(dir, "Changing"), "changing content now");

    await storage.put(hash, ["**/*"]);

    expect(storage.filesToCache).toEqual(["Changing"]);
  });

  test("caches new files", async () => {
    const logger = makeLogger("silly");
    const dir = fs.mkdtempSync(
      path.join(os.tmpdir(), "test-backfill-cache-2-")
    );
    const storage = new LocalCacheStorage(logger, dir);

    // makes sure there is no cache interference between tests
    const hash = `${dir}-hash`;

    fs.writeFileSync(path.join(dir, "notChanging"), "not changing content");

    await storage.fetch(hash);

    fs.writeFileSync(path.join(dir, "new"), "new content");

    await storage.put(hash, ["**/*"]);

    expect(storage.filesToCache).toEqual(["new"]);
  });

  test("does not caches file re-written", async () => {
    const logger = makeLogger("silly");
    const dir = fs.mkdtempSync(
      path.join(os.tmpdir(), "test-backfill-cache-3-")
    );
    const storage = new LocalCacheStorage(logger, dir);

    // makes sure there is no cache interference between tests
    const hash = `${dir}-hash`;

    fs.writeFileSync(path.join(dir, "notChanging"), "not changing content");

    await storage.fetch(hash);

    fs.writeFileSync(path.join(dir, "notChanging"), "not changing content");

    await storage.put(hash, ["**/*"]);

    expect(storage.filesToCache).toEqual([]);
  });
});
