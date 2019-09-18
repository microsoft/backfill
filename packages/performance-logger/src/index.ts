import { parse as json2csv } from "json2csv";
import * as fs from "fs-extra";
import * as path from "path";
import { logger } from "just-task-logger";

type PerformanceLoggerData = {
  timestamp: number;
  name?: string;
  hash?: string;
  cacheProvider?: string;
  hit?: boolean;
  buildTime?: number;
  putTime?: number;
  fetchTime?: number;
};

type Times = "buildTime" | "putTime" | "fetchTime";

class PerformanceLogger {
  data: PerformanceLoggerData;

  constructor() {
    this.data = {
      timestamp: Date.now()
    };
  }

  public setName(name: string) {
    this.data["name"] = name;
  }

  public setHash(hash: string) {
    this.data["hash"] = hash;
  }

  public setCacheProvider(cacheProvider: string) {
    this.data["cacheProvider"] = cacheProvider;
  }

  public setHit(hit: boolean) {
    this.data["hit"] = hit;
  }

  public setTime(type: Times, startTime: number, endTime: number) {
    this.data[type] = endTime - startTime;
  }

  private createFileName() {
    return `perf-${this.data.hash || ""}-${this.data.timestamp}.csv`;
  }

  public async generatePerformanceReport(
    logFolder: string,
    performanceReportName?: string
  ) {
    var endOfLine = require("os").EOL;

    return fs
      .readdir(logFolder)
      .then(files => {
        if (!(files instanceof Array)) {
          throw "Could not read performance logs. No report generated.";
        }

        return files
          .filter(file => path.extname(file) === ".csv")
          .map(file => fs.readFile(path.join(logFolder, file), "utf8"));
      })
      .then(contents => Promise.all(contents))
      .then(contents => {
        if (contents.length === 0) {
          throw "Found no performance logs. No report generated.";
        }

        fs.mkdirpSync(path.join(logFolder, "reports"));

        const filepath = path.join(
          logFolder,
          "reports",
          `perf--${performanceReportName || Date.now()}.csv`
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
            fs.removeSync(file);
          }
        });
      })
      .catch(logger.error);
  }

  public async toFile(logFolder: string) {
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
      const csv = json2csv(this.data, opts);

      await fs.outputFile(path.join(logFolder, this.createFileName()), csv);
    } catch (err) {
      logger.error(err);
    }
  }
}

export const performanceLogger = new PerformanceLogger();
