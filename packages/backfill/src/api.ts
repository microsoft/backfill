import { Writable } from "stream";
import { EOL } from "os";

import { createConfig } from "backfill-config";
import {
  Logger,
  makeLogger as makeLoggerInternal,
  Console,
  LogLevel
} from "backfill-logger";
import { Hasher } from "backfill-hasher";
import { getCacheStorageProvider } from "backfill-cache";

function makeConsole(stdout: Writable, stderr: Writable): Console {
  return {
    info(...args: string[]): void {
      stdout.write(args.join(EOL) + EOL);
    },
    warn(...args: string[]): void {
      stderr.write(args.join(EOL) + EOL);
    },
    error(...args: string[]): void {
      stderr.write(args.join(EOL) + EOL);
    }
  };
}

export function makeLogger(
  logLevel: LogLevel,
  stdout: Writable,
  stderr: Writable
): Logger {
  return makeLoggerInternal(logLevel, { console: makeConsole(stdout, stderr) });
}

export async function computeHash(
  cwd: string,
  hashSalt: string,
  logger: Logger
): Promise<string> {
  const { outputGlob, packageRoot } = createConfig(logger, cwd);
  const hasher = new Hasher({ packageRoot, outputGlob }, logger);
  const hash = await hasher.createPackageHash(hashSalt);
  return hash;
}

export async function computeHashOfOutput(
  cwd: string,
  logger: Logger
): Promise<string> {
  const { outputGlob, packageRoot } = createConfig(logger, cwd);
  const hasher = new Hasher({ packageRoot, outputGlob }, logger);
  const hash = await hasher.hashOfOutput();
  return hash;
}

export async function fetch(
  cwd: string,
  hashSalt: string,
  logger: Logger
): Promise<boolean> {
  const { cacheStorageConfig, internalCacheFolder, packageRoot } = createConfig(
    logger,
    cwd
  );
  const cacheStorage = getCacheStorageProvider(
    cacheStorageConfig,
    internalCacheFolder,
    logger,
    cwd
  );
  const hash = await computeHash(packageRoot, hashSalt, logger);
  const fetch = await cacheStorage.fetch(hash);
  return fetch;
}
