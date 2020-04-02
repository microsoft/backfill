import chalk from "chalk";
import { LogLevel } from ".";

export type OutputFormatter = {
  format(logLevel: LogLevel, ...args: string[]): string[];
};

export const defaultFormatter = {
  format(logLevel: LogLevel | "trace", ...args: string[]): string[] {
    switch (logLevel) {
      case "silly":
        return ["backfill:", chalk.gray("\u25C7"), ...args];
      case "verbose":
        return ["backfill:", "\u25a1", ...args];
      case "info":
        return ["backfill:", chalk.blue("\u25a0"), ...args];
      case "warn":
        return ["backfill:", chalk.yellow("\u25B2"), ...args];
      case "error":
        return ["backfill:", chalk.redBright("x"), ...args];
      case "trace":
        return ["backfill:", chalk.cyan("\u2023"), ...args];
      case "mute":
        return [];

      default:
        return assertNever(logLevel);
    }
  }
};

function assertNever(x: never): never {
  throw new Error("Unexpected object: " + x);
}
