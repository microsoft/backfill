import { parse as json2csv } from "json2csv";
import * as fs from "fs-extra";
import * as path from "path";

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
  return `perf-${performanceReportData.hash || ""}-${
    performanceReportData.timestamp
  }.csv`;
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

  async generatePerformanceReport(
    logFolder: string,
    performanceReportName?: string
  ) {
    var endOfLine = require("os").EOL;

    return fs
      .readdir(logFolder)
      .then(files => {
        if (!(files instanceof Array)) {
          throw new Error(
            "Could not read performance logs. No report generated."
          );
        }

        return files
          .filter(file => path.extname(file) === ".csv")
          .map(file => fs.readFile(path.join(logFolder, file), "utf8"));
      })
      .then(contents => Promise.all(contents))
      .then(contents => {
        if (contents.length === 0) {
          throw new Error("Found no performance logs. No report generated.");
        }

        fs.mkdirpSync(path.join(logFolder, "reports"));

        const filepath = path.join(
          logFolder,
          "reports",
          `perf-${performanceReportName || Date.now()}.csv`
        );

        const data = contents.sort().join(endOfLine);

        return fs
          .outputFile(filepath, data)
          .then(() =>
            logger.info(`Backfill Performance Report created: ${filepath}`)
          );
      })
      .then(() => {
        // Remove individual performance logs
        fs.readdirSync(logFolder).forEach(file => {
          if (path.basename(file).match(/perf-.*.csv/)) {
            fs.removeSync(path.join(logFolder, file));
          }
        });
      })
      .catch(logger.error);
  },

  async toFile(logFolder: string) {
    const fields = [
      "timestamp",
      "name",
      "hash",
      "cacheProvider",
      "hit",
      "buildTime",
      "putTime",
      "fetchTime"
    ];
    const opts = { fields, header: false };

    try {
      const csv = json2csv(performanceReportData, opts);
      const filepath = path.join(logFolder, createFileName());

      await fs.outputFile(filepath, csv);
      logger.silly(`Performance Log created at ${filepath}`);
    } catch (err) {
      logger.error(err);
    }
  }
};
