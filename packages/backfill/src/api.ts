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
  salt: string,
  logger: Logger
): Promise<string> {
  const { outputGlob, packageRoot } = createConfig(logger, cwd);
  const hasher = new Hasher({ packageRoot, outputGlob }, logger);
  const hash = await hasher.createPackageHash(salt);
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
