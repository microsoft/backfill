import { parse as json2csv } from "json2csv";
import * as shelljs from "shelljs";
import * as fs from "fs-extra";
import * as path from "path";

type TelemetryData = {
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

class Telemetry {
  data: TelemetryData;

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
    return `tel-${this.data.hash || ""}-${this.data.timestamp}.csv`;
  }

  public async generateTelemetryReport(
    telemetryFileFolder: string,
    telemetryReportName?: string
  ) {
    var endOfLine = require("os").EOL;

    return fs
      .readdir(telemetryFileFolder)
      .then(files => {
        if (!(files instanceof Array)) {
          throw "Could not read telemetry files. No report generated.";
        }

        return files
          .filter(file => path.extname(file) === ".csv")
          .map(file =>
            fs.readFile(path.join(telemetryFileFolder, file), "utf8")
          );
      })
      .then(contents => Promise.all(contents))
      .then(contents => {
        if (contents.length === 0) {
          throw "No telemetry files. No report generated.";
        }

        shelljs.mkdir("-p", path.join(telemetryFileFolder, "reports"));

        const filepath = path.join(
          telemetryFileFolder,
          "reports",
          `telemetry-${telemetryReportName || Date.now()}.csv`
        );

        const data = contents.sort().join(endOfLine);

        return fs
          .outputFile(filepath, data)
          .then(() =>
            console.log(`Backfill telemetry report created: ${filepath}`)
          );
      })
      .then(() => {
        // Remove single telemetry reports
        shelljs.rm("-f", path.join(telemetryFileFolder, "tel-*.csv"));
      })
      .catch(console.error);
  }

  public async toFile(telemetryFileFolder: string) {
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

      await fs.outputFile(
        path.join(telemetryFileFolder, this.createFileName()),
        csv
      );
    } catch (err) {
      console.error(err);
    }
  }
}

export const telemetry = new Telemetry();
