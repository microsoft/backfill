import { BlobServiceClient } from "@azure/storage-blob";
import * as tar from "tar";
import * as path from "path";

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
  constructor(private options: AzureBlobCacheStorageOptions) {
    super();
  }

  protected async _fetch(
    hash: string,
    destinationFolder: string
  ): Promise<boolean> {
    const blobClient = createBlobClient(
      this.options.connectionString,
      this.options.container,
      hash
    );

    try {
      const response = await blobClient.download(0);

      const parentFolderWhereToExtractFolder = path.join(
        destinationFolder,
        ".."
      );

      const blobReadableStream = response.readableStreamBody;
      const tarWritableStream = tar.extract({
        cwd: parentFolderWhereToExtractFolder
      });

      if (!blobReadableStream) {
        throw new Error("Unable to fetch blob.");
      }

      await blobReadableStream.pipe(tarWritableStream);

      return true;
    } catch {
      return false;
    }
  }

  protected async _put(hash: string, sourceFolder: string): Promise<void> {
    const blobClient = createBlobClient(
      this.options.connectionString,
      this.options.container,
      hash
    );

    const blockBlobClient = blobClient.getBlockBlobClient();

    const tarStream = tar.create({ gzip: false }, [sourceFolder]);

    await blockBlobClient.uploadStream(
      tarStream,
      uploadOptions.bufferSize,
      uploadOptions.maxBuffers
    );
  }
}
