import * as shelljs from "shelljs";
import { telemetry } from "backfill-telemetry";

export interface ICacheStorage {
  fetch: (hash: string, destinationFolder: string) => Promise<Boolean>;
  put: (hash: string, sourceFolder: string) => Promise<void>;
}

export abstract class CacheStorage implements ICacheStorage {
  public fetch(hash: string, destinationFolder: string): Promise<Boolean> {
    const startTime = Date.now();

    return this._fetch(hash, destinationFolder).then(result => {
      telemetry.setTime("fetchTime", startTime, Date.now());
      return result;
    });
  }

  public put(hash: string, sourceFolder: string): Promise<void> {
    const startTime = Date.now();

    if (!shelljs.test("-d", sourceFolder)) {
      throw new Error("Folder to cache does not exist");
    }

    return this._put(hash, sourceFolder).then(() => {
      telemetry.setTime("putTime", startTime, Date.now());
    });
  }

  protected abstract _fetch(
    hash: string,
    destinationFolder: string
  ): Promise<boolean>;

  protected abstract _put(hash: string, sourceFolder: string): Promise<void>;
}
