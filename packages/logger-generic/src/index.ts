import chalk = require("chalk");

function logInternal(
  method: "info" | "warn" | "error",
  symbol: string,
  ...args: any[]
) {
  console[method]("backfill:", symbol, ...args);
}

export const logLevelObject = {
  error: "",
  warn: "",
  info: "",
  verbose: "",
  silly: ""
};

export type LogLevels = keyof typeof logLevelObject;

export function isCorrectLogLevel(logLevel: string): logLevel is LogLevels {
  return logLevelObject.hasOwnProperty(logLevel);
}

let logLevel: LogLevels = "info";

export function setLogLevel(newLogLevel: LogLevels) {
  logLevel = newLogLevel;
}

function logLevelNumber(logLevel: LogLevels) {
  switch (logLevel) {
    case "error":
      return 0;
    case "warn":
      return 1;
    case "info":
      return 2;
    case "verbose":
      return 3;
    case "silly":
      return 4;
  }
}

export interface Logger {
  silly(...args: any[]): void;
  verbose(...args: any[]): void;
  info(...args: any[]): void;
  warn(...args: any[]): void;
  error(...args: any[]): void;
  profile(marker: string, ...args: any[]): number | void;
}

const performanceMarkers: { [marker: string]: [number, number] } = {};

export const logger: Logger = {
  silly(...args: any[]) {
    if (logLevelNumber(logLevel) >= logLevelNumber("silly")) {
      logInternal("info", chalk.gray("\u25C7"), ...args);
    }
  },

  verbose(...args: any[]) {
    if (logLevelNumber(logLevel) >= logLevelNumber("verbose")) {
      logInternal("info", "\u25a1", ...args);
    }
  },

  info(...args: any[]) {
    if (logLevelNumber(logLevel) >= logLevelNumber("info")) {
      logInternal("info", chalk.blue.bold("\u25a0"), ...args);
    }
  },

  warn(...args: any[]) {
    if (logLevelNumber(logLevel) >= logLevelNumber("warn")) {
      logInternal("warn", chalk.yellow.bold("\u25B2"), ...args);
    }
  },

  error(...args: any[]) {
    logInternal("error", chalk.redBright("x"), ...args);
  },

  profile(marker: string, ...args: any[]) {
    if (!performanceMarkers[marker]) {
      performanceMarkers[marker] = process.hrtime();
    } else {
      const delta = process.hrtime(performanceMarkers[marker]);
      delete performanceMarkers[marker];

      if (delta) {
        const ms = Math.round(delta[0] * 1000 + delta[1] / 1000000);

        if (logLevelNumber(logLevel) >= logLevelNumber("verbose")) {
          logInternal(
            "info",
            chalk.cyan("\u2023"),
            `Profiling ${chalk.underline(marker)} took ${chalk.cyanBright(
              `${ms}ms`
            )}`,
            ...args
          );
        }

        return ms;
      }
    }
  }
};
