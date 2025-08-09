import * as path from "path";
import { pipeline } from "stream";
import tarFs from "tar-fs";

import { Logger } from "backfill-logger";
import { AzureBlobCacheStorageOptions } from "backfill-config";

import { stat } from "fs-extra";
import { ContainerClient } from "@azure/storage-blob";
import { CacheStorage } from "./CacheStorage";
import { TimeoutStream } from "./TimeoutStream";
import { SpongeStream } from "./SpongeStream";

const ONE_MEGABYTE = 1024 * 1024;
const FOUR_MEGABYTES = 4 * ONE_MEGABYTE;

const uploadOptions = {
  bufferSize: FOUR_MEGABYTES,
  maxBuffers: 5,
};

export class AzureBlobCacheStorage extends CacheStorage {
  private readonly getContainerClient: () => Promise<ContainerClient>;

  constructor(
    private options: AzureBlobCacheStorageOptions,
    logger: Logger,
    cwd: string,
    incrementalCaching = false
  ) {
    super(logger, cwd, incrementalCaching);

    if ("containerClient" in options) {
      this.getContainerClient = () =>
        Promise.resolve(options.containerClient as ContainerClient);
    } else {
      const { connectionString, container, credential } = options;
      // This is delay loaded because it's very slow to parse
      this.getContainerClient = () =>
        import("@azure/storage-blob").then(({ BlobServiceClient }) => {
          const blobServiceClient = credential
            ? new BlobServiceClient(connectionString, credential)
            : BlobServiceClient.fromConnectionString(connectionString);

          const containerClient =
            blobServiceClient.getContainerClient(container);
          return containerClient;
        });
    }
  }

  protected async _fetch(hash: string): Promise<boolean> {
    try {
      const blobClient = (await this.getContainerClient()).getBlobClient(hash);

      // If a maxSize has been specified, make sure to check the properties for the size before transferring
      if (this.options.maxSize) {
        const sizeResponse = await blobClient.getProperties();

        if (
          sizeResponse.contentLength &&
          sizeResponse.contentLength > this.options.maxSize
        ) {
          this.logger.verbose(
            `A blob is too large to be downloaded: ${hash}, size: ${sizeResponse.contentLength} bytes`
          );
          return false;
        }
      }

      const response = await blobClient.download(0);

      const blobReadableStream = response.readableStreamBody;
      if (!blobReadableStream) {
        throw new Error("Unable to fetch blob.");
      }

      const tarWritableStream = tarFs.extract(this.cwd);

      const spongeStream = new SpongeStream();

      const timeoutStream = new TimeoutStream(
        10 * 60 * 1000,
        `The fetch request to ${hash} seems to be hanging`
      );

      const extractionPipeline = new Promise<void>((resolve, reject) =>
        pipeline(
          blobReadableStream,
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
      if (error && (error as any).statusCode === 404) {
        return false;
      } else {
        throw error;
      }
    }
  }

  protected async _put(hash: string, filesToCache: string[]): Promise<void> {
    const blobClient = (await this.getContainerClient()).getBlobClient(hash);

    const blockBlobClient = blobClient.getBlockBlobClient();

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

    await blockBlobClient.uploadStream(
      tarStream,
      uploadOptions.bufferSize,
      uploadOptions.maxBuffers
    );
  }
}
