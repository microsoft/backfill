import * as path from "path";
import { BlobServiceClient } from "@azure/storage-blob";
import tarFs from "tar-fs";
import globby from "globby";

import { Logger } from "backfill-logger";
import { AzureBlobCacheStorageOptions } from "backfill-config";

import { stat } from "fs-extra";
import { CacheStorage } from "./CacheStorage";

const ONE_MEGABYTE = 1024 * 1024;
const FOUR_MEGABYTES = 4 * ONE_MEGABYTE;

const uploadOptions = {
  bufferSize: FOUR_MEGABYTES,
  maxBuffers: 5,
};

function createBlobClient(
  connectionString: string,
  containerName: string,
  blobName: string
) {
  const blobServiceClient = BlobServiceClient.fromConnectionString(
    connectionString
  );
  const containerClient = blobServiceClient.getContainerClient(containerName);
  const blobClient = containerClient.getBlobClient(blobName);

  return blobClient;
}

export class AzureBlobCacheStorage extends CacheStorage {
  constructor(
    private options: AzureBlobCacheStorageOptions,
    logger: Logger,
    cwd: string
  ) {
    super(logger, cwd);
  }

  protected async _fetch(hash: string): Promise<boolean> {
    try {
      const blobClient = createBlobClient(
        this.options.connectionString,
        this.options.container,
        hash
      );

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

      blobReadableStream.pipe(tarWritableStream);

      const blobPromise = new Promise<void>((resolve, reject) => {
        blobReadableStream.on("end", () => resolve());
        blobReadableStream.on("error", (error) => reject(error));
      });

      await blobPromise;

      return true;
    } catch (error) {
      if (error && error.statusCode === 404) {
        return false;
      } else {
        throw new Error(error);
      }
    }
  }

  protected async _put(hash: string, outputGlob: string[]): Promise<void> {
    const blobClient = createBlobClient(
      this.options.connectionString,
      this.options.container,
      hash
    );

    const blockBlobClient = blobClient.getBlockBlobClient();

    const filesToCopy = await globby(outputGlob, { cwd: this.cwd });
    const tarStream = tarFs.pack(this.cwd, { entries: filesToCopy });

    // If there's a maxSize limit, first sum up the total size of bytes of all the outputGlobbed files
    if (this.options.maxSize) {
      let total = 0;
      for (const file of filesToCopy) {
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
