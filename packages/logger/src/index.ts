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
  timer?: Timer;
  outputFormatter?: OutputFormatter;
};

export type OutputFormatter = {
  format(logLevel: LogLevel, ...args: string[]): string[];
};

const logLevels = {
  trace: 5,
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
      case "trace":
        return ["backfill:", "trace", ...args];
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

export class Logger {
  private console: Console;
  private timer: Timer;
  private formatter: OutputFormatter;
  private filter: LevelFilter;
  public reportBuilder: ReportBuilder;

  public constructor(logLevel: LogLevel, overrides?: LoggerOverrides) {
    this.console = (overrides && overrides.console) || console;
    this.timer = (overrides && overrides.timer) || defaultTimer;
    this.formatter =
      (overrides && overrides.outputFormatter) || defaultFormatter;
    this.filter = defaultFilter(logLevel);
    this.reportBuilder = makeReportBuilder(this);
  }

  public changeLogLevel(level: LogLevel): void {
    this.filter = defaultFilter(level);
  }

  public silly(...args: string[]): void {
    if (this.filter.filter("silly")) {
      this.console.info(...this.formatter.format("silly", ...args));
    }
  }

  public verbose(...args: string[]): void {
    if (this.filter.filter("verbose")) {
      this.console.info(...this.formatter.format("verbose", ...args));
    }
  }

  public info(...args: string[]): void {
    if (this.filter.filter("info")) {
      this.console.info(...this.formatter.format("info", ...args));
    }
  }

  public warn(...args: string[]): void {
    if (this.filter.filter("warn")) {
      this.console.warn(...this.formatter.format("warn", ...args));
    }
  }

  public error(...args: string[]): void {
    if (this.filter.filter("error")) {
      this.console.error(...this.formatter.format("error", ...args));
    }
  }

  public trace(...args: string[]): void {
    if (this.filter.filter("trace")) {
      this.console.info(...this.formatter.format("trace", ...args));
    }
  }

  public traceOperation(operationName: string): { stop(): void } {
    const tracer = this.timer.start();
    return {
      stop: (): void => {
        const time = tracer.stop();
        this.trace("Opreation", operationName, `took ${time} ms.`);
      }
    };
  }
}

type PerformanceReportData = {
  timestamp: number;
  name?: string;
  hash?: string;
  cacheProvider?: string;
  hit?: boolean;
  buildTime?: number;
  putTime?: number;
  fetchTime?: number;
  mode?: string;
  hashOfOutput?: string;
};

type Times = "buildTime" | "putTime" | "fetchTime";

const performanceReportData: PerformanceReportData = {
  timestamp: Date.now()
};

function createFileName() {
  return filenamify(
    `perf-${performanceReportData.name}-${performanceReportData.timestamp}.json`
  );
}

export type ReportBuilder = {
  setName(name: string): void;
  setHash(hash: string): void;
  setCacheProvider(cacheProvider: string): void;
  setHit(hit: boolean): void;
  setTime(type: Times): { stop(): void };
  setMode(mode: string): void;
  setHashOfOutput(hash: string): void;
  toFile(logFolder: string): Promise<void>;
};

function makeReportBuilder(logger: Logger): ReportBuilder {
  return {
    setName(name: string) {
      logger.info(`Package name: ${name}`);
      performanceReportData["name"] = name;
    },

    setHash(hash: string) {
      logger.verbose(`Package hash: ${hash}`);
      performanceReportData["hash"] = hash;
    },

    setCacheProvider(cacheProvider: string) {
      logger.verbose(`Cache provider: ${cacheProvider}`);
      performanceReportData["cacheProvider"] = cacheProvider;
    },

    setHit(hit: boolean) {
      logger.info(hit ? `Cache hit!` : `Cache miss!`);
      performanceReportData["hit"] = hit;
    },

    setTime(type: Times): { stop(): void } {
      return logger.traceOperation(type);
    },

    setMode(mode: string) {
      if (mode !== "READ_WRITE") {
        logger.info(`Running in ${mode} mode.`);
      } else {
        logger.verbose(`Running in ${mode} mode.`);
      }

      performanceReportData["mode"] = mode;
    },

    setHashOfOutput(hash: string) {
      logger.verbose(`Hash of output: ${hash}`);
      performanceReportData["hashOfOutput"] = hash;
    },

    async toFile(logFolder: string) {
      const filepath = path.join(logFolder, createFileName());
      await fs.outputJson(filepath, performanceReportData, { spaces: 2 });

      logger.silly(`Performance log created at ${filepath}`);
    }
  };
}
