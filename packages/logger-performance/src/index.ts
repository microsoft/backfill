import * as fs from "fs-extra";
import * as path from "path";
import * as filenamify from "filenamify";

import { logger } from "backfill-generic-logger";
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

  setTime(type: Times, marker: string) {
    const ms = logger.profile(marker);

    if (ms) {
      performanceReportData[type] = ms;
    }
  },

  setMode(mode: BackfillModes) {
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
