import path from "path";
import { PassThrough, pipeline, Transform, TransformCallback } from "stream";
import tarFs from "tar-fs";
import { Logger } from "backfill-logger";
import { stat } from "fs-extra";
import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import { S3CacheStorageOptions } from "backfill-config";
import { CacheStorage } from "./CacheStorage";

/*
 * Timeout stream, will emit an error event if the
 * input has not started providing data after a given time after
 * its creation.
 */
class TimeoutStream extends Transform {
  private timeout: NodeJS.Timeout;
  constructor(timeout: number, message: string) {
    super();
    this.timeout = setTimeout(() => {
      this.destroy(new Error(message));
    }, timeout);
  }
  _transform(
    chunk: any,
    _encoding: BufferEncoding,
    callback: TransformCallback
  ): void {
    clearTimeout(this.timeout);
    this.push(chunk);
    callback();
  }
}

/*
 * Sponge stream, it will accumulate all the data it receives
 * and emit it only if and when the input stream sends the "end" event.
 */
class SpongeStream extends Transform {
  constructor() {
    super({
      // This stream should never receive more data than its readableHighWaterMark
      // otherwise the stream will get into a deadlock
      // 1 TB should give enough room :)
      readableHighWaterMark: 1024 * 1024 * 1024 * 1024,
    });
  }
  _transform(
    chunk: any,
    _encoding: BufferEncoding,
    callback: TransformCallback
  ): void {
    this.pause();
    this.push(chunk);
    callback();
  }
  _flush(callback: TransformCallback): void {
    this.resume();
    callback();
  }
}

/**
 * Implementation of backfill storage using AWS S3.  To use it,
 * specify a custom
 */
export class S3CacheStorage extends CacheStorage {
  private readonly s3Client: S3Client;

  constructor(
    private options: S3CacheStorageOptions,
    logger: Logger,
    cwd: string,
    incrementalCaching = false
  ) {
    super(logger, cwd, incrementalCaching);
    this.s3Client = new S3Client(options.clientConfig || {});
  }

  protected async _fetch(hash: string): Promise<boolean> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.options.bucket,
        Key: (this.options.prefix ?? "") + hash,
      });

      const response = await this.s3Client.send(command);

      if (
        this.options.maxSize &&
        response.ContentLength &&
        response.ContentLength > this.options.maxSize
      ) {
        this.logger.verbose(
          `Object is too large to be downloaded: ${hash}, size: ${response.ContentLength} bytes`
        );
        return false;
      }

      const objectStream = response.Body;
      if (!objectStream) {
        throw new Error("Unable to fetch object.");
      }

      const tarWritableStream = tarFs.extract(this.cwd);

      const spongeStream = new SpongeStream();

      const timeoutStream = new TimeoutStream(
        10 * 60 * 1000,
        `The fetch request to ${hash} seems to be hanging`
      );

      const extractionPipeline = new Promise<void>((resolve, reject) =>
        pipeline(
          objectStream as any,
          spongeStream,
          timeoutStream,
          tarWritableStream,
          (err) => {
            if (err) {
              reject(err);
            } else {
              resolve();
            }
          }
        )
      );

      await extractionPipeline;
      return true;
    } catch (error) {
      if (error && (error as any).name === "NoSuchKey") {
        return false;
      } else {
        throw error;
      }
    }
  }

  protected async _put(hash: string, filesToCache: string[]): Promise<void> {
    const tarStream = tarFs.pack(this.cwd, { entries: filesToCache });
    // If there's a maxSize limit, first sum up the total size of bytes of all the outputGlobbed files
    if (this.options.maxSize) {
      let total = 0;
      for (const file of filesToCache) {
        total = total + (await stat(path.join(this.cwd, file))).size;
      }

      if (total > this.options.maxSize) {
        this.logger.verbose(
          `The output is too large to be uploaded: ${hash}, size: ${total} bytes`
        );
        return;
      }
    }

    const pass = new PassThrough();
    tarStream.pipe(pass);

    const upload = new Upload({
      client: this.s3Client,
      params: {
        Bucket: this.options.bucket,
        ContentType: "application/x-tar",
        Key: (this.options.prefix ?? "") + hash,
        Body: pass,
      },
    });
    await upload.done();
  }
}
