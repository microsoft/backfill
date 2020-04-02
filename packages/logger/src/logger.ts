import * as fs from "fs-extra";
import * as path from "path";
import filenamify from "filenamify";

import { LogLevel } from "./logLevel";
import { defaultTimer, Timer } from "./timer";
import {
  ConsoleLogger,
  LoggerOverrides,
  makeConsoleLogger
} from "./consoleLogger";

export { isCorrectLogLevel, LogLevel } from "./logLevel";

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

function createFileName(performanceReportData: PerformanceReportData) {
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
  const consoleLogger = makeConsoleLogger(logLevel, overrides);
  const timer: Timer = defaultTimer;
  const performanceReportData: PerformanceReportData = {
    timestamp: Date.now()
  };

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
      const tracer = timer.start();
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
      const filepath = path.join(
        logFolder,
        createFileName(performanceReportData)
      );
      await fs.outputJson(filepath, performanceReportData, { spaces: 2 });

      consoleLogger.silly(`Performance log created at ${filepath}`);
    }
  };
}
