import { LogLevel } from ".";
import { Console, defaultConsole } from "./console";
import { defaultFormatter } from "./outputFormatter";
import { defaultFilter } from "./outputFilter";

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
): ConsoleLogger & { trace(...args: string[]): void } {
  let consoleOverride = (overrides && overrides.console) || defaultConsole;
  let formatter = defaultFormatter;
  let filter = defaultFilter(logLevel);

  return {
    silly(...args: string[]): void {
      if (filter.filter("silly")) {
        consoleOverride.info(...formatter.format("silly", ...args));
      }
    },

    verbose(...args: string[]): void {
      if (filter.filter("verbose")) {
        consoleOverride.info(...formatter.format("verbose", ...args));
      }
    },

    info(...args: string[]): void {
      if (filter.filter("info")) {
        consoleOverride.info(...formatter.format("info", ...args));
      }
    },

    warn(...args: string[]): void {
      if (filter.filter("warn")) {
        consoleOverride.warn(...formatter.format("warn", ...args));
      }
    },

    error(...args: string[]): void {
      if (filter.filter("error")) {
        consoleOverride.error(...formatter.format("error", ...args));
      }
    },

    trace(...args: string[]): void {
      if (filter.filter("verbose")) {
        consoleOverride.error(...formatter.format("trace", ...args));
      }
    }
  };
}
