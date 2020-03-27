import { BlobServiceClient } from "@azure/storage-blob";
import * as tar from "tar";
import * as fg from "fast-glob";

import { AzureBlobCacheStorageOptions } from "backfill-config";

import { CacheStorage } from "./CacheStorage";

const ONE_MEGABYTE = 1024 * 1024;
const FOUR_MEGABYTES = 4 * ONE_MEGABYTE;

const uploadOptions = {
  bufferSize: FOUR_MEGABYTES,
  maxBuffers: 5
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
    private cwd: string
  ) {
    super();
  }

  protected async _fetch(hash: string): Promise<boolean> {
    try {
      const blobClient = createBlobClient(
        this.options.connectionString,
        this.options.container,
        hash
      );

      const response = await blobClient.download(0);

      const blobReadableStream = response.readableStreamBody;
      if (!blobReadableStream) {
        throw new Error("Unable to fetch blob.");
      }

      const tarWritableStream = tar.extract({ cwd: this.cwd });

      blobReadableStream.pipe(tarWritableStream);

      const blobPromise = new Promise((resolve, reject) => {
        blobReadableStream.on("end", () => resolve());
        blobReadableStream.on("error", error => reject(error));
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

    const filesToCopy = await fg(outputGlob);

    const tarStream = tar.create({ gzip: false, cwd: this.cwd }, filesToCopy);

    await blockBlobClient.uploadStream(
      tarStream,
      uploadOptions.bufferSize,
      uploadOptions.maxBuffers
    );
  }
}
