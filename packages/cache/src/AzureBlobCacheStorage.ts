import { BlobServiceClient } from "@azure/storage-blob";
import * as fs from "fs-extra";
import * as tar from "tar";
import * as path from "path";

import { AzureBlobCacheStorageOptions } from "backfill-config";
import { outputFolderAsArray } from "backfill-config";

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
    private internalCacheFolder: string
  ) {
    super();
  }

  protected async _fetch(hash: string): Promise<string | undefined> {
    const temporaryBlobOutputFolder = path.join(
      this.internalCacheFolder,
      "azure-blob",
      hash
    );

    if (!fs.existsSync(temporaryBlobOutputFolder)) {
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

        fs.mkdirpSync(temporaryBlobOutputFolder);

        const tarWritableStream = tar.extract({
          cwd: temporaryBlobOutputFolder
        });

        blobReadableStream.pipe(tarWritableStream);

        const blobPromise = new Promise((resolve, reject) => {
          blobReadableStream.on("end", () => resolve());
          blobReadableStream.on("error", error => reject(error));
        });

        await blobPromise;
      } catch (error) {
        fs.removeSync(temporaryBlobOutputFolder);

        if (error && error.statusCode === 404) {
          return;
        } else {
          throw new Error(error);
        }
      }
    }

    return temporaryBlobOutputFolder;
  }

  protected async _put(
    hash: string,
    outputFolder: string | string[]
  ): Promise<void> {
    const blobClient = createBlobClient(
      this.options.connectionString,
      this.options.container,
      hash
    );

    const blockBlobClient = blobClient.getBlockBlobClient();

    const outputFolders = outputFolderAsArray(outputFolder);
    const tarStream = tar.create({ gzip: false }, outputFolders);

    await blockBlobClient.uploadStream(
      tarStream,
      uploadOptions.bufferSize,
      uploadOptions.maxBuffers
    );
  }
}
