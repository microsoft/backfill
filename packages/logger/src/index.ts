import chalk from "chalk";
import * as fs from "fs-extra";
import * as path from "path";
import filenamify from "filenamify";

export type Console = {
  info(...args: string[]): void;
  warn(...args: string[]): void;
  error(...args: string[]): void;
};
export type Timer = { start(): { stop(): number } };

export type LevelFilter = {
  filter(logLevel: LogLevel): boolean;
};

export type LoggerOverrides = {
  console?: Console;
};

export type OutputFormatter = {
  format(logLevel: LogLevel, ...args: string[]): string[];
};

const logLevels = {
  silly: 4,
  verbose: 3,
  info: 2,
  warn: 1,
  error: 0
};

const defaultTimer = {
  start() {
    const start = Date.now();
    return {
      stop() {
        return Date.now() - start;
      }
    };
  }
};

function assertNever(x: never): never {
  throw new Error("Unexpected object: " + x);
}

const defaultFilter: (logLevel: LogLevel) => LevelFilter = (
  logLevel: LogLevel
) => {
  return {
    filter(level: LogLevel): boolean {
      return logLevels[level] <= logLevels[logLevel];
    }
  };
};

const defaultFormatter = {
  format(logLevel: LogLevel, ...args: string[]): string[] {
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

      default:
        return assertNever(logLevel);
    }
  }
};

export function isCorrectLogLevel(level: string): level is LogLevel {
  return Object.keys(logLevels).includes(level);
}

export type LogLevel = keyof typeof logLevels;

type ConsoleLogger = {
  silly(...args: string[]): void;
  verbose(...args: string[]): void;
  info(...args: string[]): void;
  warn(...args: string[]): void;
  error(...args: string[]): void;
};

function makeConsoleLogger(
  logLevel: LogLevel,
  overrides?: LoggerOverrides
): ConsoleLogger {
  let consoleOverride = (overrides && overrides.console) || console;
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
    }
  };
}

type PerformanceReportData = {
  timestamp: number;
  name?: string;
  hash?: string;
  cacheProvider?: string;
  hit?: boolean;
  buildTime?: number;
  putTime?: number;
  hashTime?: number;
  fetchTime?: number;
  mode?: string;
  hashOfOutput?: string;
};

type Times = "hashTime" | "buildTime" | "putTime" | "fetchTime";

const performanceReportData: PerformanceReportData = {
  timestamp: Date.now()
};

function createFileName() {
  return filenamify(
    `perf-${performanceReportData.name}-${performanceReportData.timestamp}.json`
  );
}

export type Logger = ConsoleLogger & {
  setName(name: string): void;
  setHash(hash: string): void;
  setCacheProvider(cacheProvider: string): void;
  setHit(hit: boolean): void;
  setTime(type: Times): { stop(): void };
  setMode(mode: string): void;
  setHashOfOutput(hash: string): void;
  toFile(logFolder: string): Promise<void>;
};

export function makeLogger(
  logLevel: LogLevel,
  overrides?: LoggerOverrides
): Logger {
  let consoleLogger = makeConsoleLogger(logLevel, overrides);
  return {
    silly: consoleLogger.silly,
    verbose: consoleLogger.verbose,
    info: consoleLogger.info,
    warn: consoleLogger.warn,
    error: consoleLogger.error,
    setName(name: string) {
      consoleLogger.info(`Package name: ${name}`);
      performanceReportData["name"] = name;
    },

    setHash(hash: string) {
      consoleLogger.verbose(`Package hash: ${hash}`);
      performanceReportData["hash"] = hash;
    },

    setCacheProvider(cacheProvider: string) {
      consoleLogger.verbose(`Cache provider: ${cacheProvider}`);
      performanceReportData["cacheProvider"] = cacheProvider;
    },

    setHit(hit: boolean) {
      consoleLogger.info(hit ? `Cache hit!` : `Cache miss!`);
      performanceReportData["hit"] = hit;
    },

    setTime(type: Times): { stop(): void } {
      const tracer = defaultTimer.start();
      return {
        stop: () => {
          const time = tracer.stop();
          consoleLogger.verbose("Opreation", type, `took ${time} ms.`);
          performanceReportData[type] = time;
        }
      };
    },

    setMode(mode: string) {
      if (mode !== "READ_WRITE") {
        consoleLogger.info(`Running in ${mode} mode.`);
      } else {
        consoleLogger.verbose(`Running in ${mode} mode.`);
      }

      performanceReportData["mode"] = mode;
    },

    setHashOfOutput(hash: string) {
      consoleLogger.verbose(`Hash of output: ${hash}`);
      performanceReportData["hashOfOutput"] = hash;
    },

    async toFile(logFolder: string) {
      const filepath = path.join(logFolder, createFileName());
      await fs.outputJson(filepath, performanceReportData, { spaces: 2 });

      consoleLogger.silly(`Performance log created at ${filepath}`);
    }
  };
}
