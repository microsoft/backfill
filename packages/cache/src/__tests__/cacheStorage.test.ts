import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { Logger, makeLogger } from "backfill-logger";
import { CacheStorage } from "../CacheStorage";

export class LocalCacheStorage extends CacheStorage {
  filesToCache: string[] | undefined;
  constructor(logger: Logger, cwd: string) {
    super(logger, cwd);
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
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "test-backfill-cache-"));
    const storage = new LocalCacheStorage(logger, dir);

    fs.writeFileSync(path.join(dir, "notChanging"), "not changing content");
    fs.writeFileSync(path.join(dir, "Changing"), "changing content");

    await storage.fetch("aaa");

    fs.writeFileSync(path.join(dir, "Changing"), "changing content now");

    await storage.put("aaa", ["**/*"]);

    expect(storage.filesToCache).toEqual(["Changing"]);
  });

  test("caches new files", async () => {
    const logger = makeLogger("silly");
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "test-backfill-cache-"));
    const storage = new LocalCacheStorage(logger, dir);

    fs.writeFileSync(path.join(dir, "notChanging"), "not changing content");

    await storage.fetch("aaa");

    fs.writeFileSync(path.join(dir, "new"), "new content");

    await storage.put("aaa", ["**/*"]);

    expect(storage.filesToCache).toEqual(["new"]);
  });
});
