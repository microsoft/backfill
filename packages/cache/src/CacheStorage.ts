import { Logger } from "backfill-logger";
import * as fg from "fast-glob";

export interface ICacheStorage {
  fetch: (hash: string) => Promise<Boolean>;
  put: (hash: string, outputGlob: string[]) => Promise<void>;
}

export abstract class CacheStorage implements ICacheStorage {
  public constructor(protected logger: Logger) {}
  public async fetch(hash: string): Promise<Boolean> {
    const tracer = this.logger.setTime("fetchTime");

    const result = await this._fetch(hash);

    tracer.stop();

    this.logger.setHit(result);
    return result;
  }

  public async put(hash: string, outputGlob: string[]): Promise<void> {
    const tracer = this.logger.setTime("putTime");

    const filesBeingCached = fg.sync(outputGlob);
    if (filesBeingCached.length === 0) {
      throw new Error(
        `Couldn't find any file on disk matching the output glob (${outputGlob.join(
          ", "
        )})`
      );
    }

    await this._put(hash, outputGlob);
    tracer.stop();
  }

  protected abstract async _fetch(hash: string): Promise<boolean>;

  protected abstract async _put(
    hash: string,
    outputGlob: string[]
  ): Promise<void>;
}
