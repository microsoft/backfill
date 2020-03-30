import * as fs from "fs-extra";
import * as path from "path";
import * as filenamify from "filenamify";

import { Logger } from "backfill-generic-logger";
import { BackfillModes } from "backfill-config";

type PerformanceReportData = {
  timestamp: number;
  name?: string;
  hash?: string;
  cacheProvider?: string;
  hit?: boolean;
  buildTime?: number;
  putTime?: number;
  fetchTime?: number;
  mode?: BackfillModes;
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

export const performanceLogger = {
  setName(name: string, logger: Logger) {
    logger.info(`Package name: ${name}`);
    performanceReportData["name"] = name;
  },

  setHash(hash: string, logger: Logger) {
    logger.verbose(`Package hash: ${hash}`);
    performanceReportData["hash"] = hash;
  },

  setCacheProvider(cacheProvider: string, logger: Logger) {
    logger.verbose(`Cache provider: ${cacheProvider}`);
    performanceReportData["cacheProvider"] = cacheProvider;
  },

  setHit(hit: boolean, logger: Logger) {
    logger.info(hit ? `Cache hit!` : `Cache miss!`);
    performanceReportData["hit"] = hit;
  },

  setTime(type: Times, marker: string, logger: Logger) {
    const ms = logger.profile(marker);

    if (ms) {
      performanceReportData[type] = ms;
    }
  },

  setMode(mode: BackfillModes, logger: Logger) {
    if (mode !== "READ_WRITE") {
      logger.info(`Running in ${mode} mode.`);
    } else {
      logger.verbose(`Running in ${mode} mode.`);
    }

    performanceReportData["mode"] = mode;
  },

  setHashOfOutput(hash: string, logger: Logger) {
    logger.verbose(`Hash of output: ${hash}`);
    performanceReportData["hashOfOutput"] = hash;
  },

  async toFile(logFolder: string, logger: Logger) {
    const filepath = path.join(logFolder, createFileName());
    await fs.outputJson(filepath, performanceReportData, { spaces: 2 });

    logger.silly(`Performance log created at ${filepath}`);
  }
};
