import chalk from "chalk";

function logInternal(
  method: "info" | "warn" | "error",
  symbol: string,
  ...args: any[]
) {
  const now = new Date();
  const timestamp = chalk.gray(`[${now.toLocaleTimeString()}]`);

  console[method](timestamp, symbol, ...args);
}

export type LogLevels = "error" | "warn" | "info" | "verbose" | "silly";

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
      logInternal("info", chalk.gray("sill"), ...args);
    }
  },

  verbose(...args: any[]) {
    if (logLevelNumber(logLevel) >= logLevelNumber("verbose")) {
      logInternal("info", "verb", ...args);
    }
  },

  info(...args: any[]) {
    if (logLevelNumber(logLevel) >= logLevelNumber("info")) {
      logInternal("info", chalk.blue.bold("info"), ...args);
    }
  },

  warn(...args: any[]) {
    if (logLevelNumber(logLevel) >= logLevelNumber("warn")) {
      logInternal("warn", chalk.yellow.bold("warn"), ...args);
    }
  },

  error(...args: any[]) {
    logInternal("error", chalk.redBright("err!"), ...args);
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
            chalk.cyan("prof"),
            `${chalk.underline(marker)} took ${chalk.cyanBright(`${ms}ms`)}`,
            ...args
          );
        }

        return ms;
      }
    }
  }
};
