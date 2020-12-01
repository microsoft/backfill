import { Console, defaultConsole } from "./console";
import { defaultFormatter } from "./outputFormatter";
import { defaultLogFilter } from "./outputFilter";
import { LogLevel } from ".";

export type LoggerOverrides = {
  console?: Console;
};

export type ConsoleLogger = {
  silly(...args: string[]): void;
  verbose(...args: string[]): void;
  info(...args: string[]): void;
  warn(...args: string[]): void;
  error(...args: string[]): void;
};

export function makeConsoleLogger(
  logLevel: LogLevel,
  overrides?: LoggerOverrides
): ConsoleLogger & {
  trace(...args: string[]): void;
  consoleOverride: Console;
} {
  let consoleOverride = (overrides && overrides.console) || defaultConsole;
  let formatter = defaultFormatter;
  let logFilter = defaultLogFilter(logLevel);

  return {
    consoleOverride,
    silly(...args: string[]): void {
      if (logFilter.shouldLog("silly")) {
        consoleOverride.info(...formatter.format("silly", ...args));
      }
    },

    verbose(...args: string[]): void {
      if (logFilter.shouldLog("verbose")) {
        consoleOverride.info(...formatter.format("verbose", ...args));
      }
    },

    info(...args: string[]): void {
      if (logFilter.shouldLog("info")) {
        consoleOverride.info(...formatter.format("info", ...args));
      }
    },

    warn(...args: string[]): void {
      if (logFilter.shouldLog("warn")) {
        consoleOverride.warn(...formatter.format("warn", ...args));
      }
    },

    error(...args: string[]): void {
      if (logFilter.shouldLog("error")) {
        consoleOverride.error(...formatter.format("error", ...args));
      }
    },

    trace(...args: string[]): void {
      if (logFilter.shouldLog("verbose")) {
        consoleOverride.error(...formatter.format("trace", ...args));
      }
    },
  };
}
