import { logger as genericLogger } from "./genericLogger";
import { performanceReportLogger } from "./performanceReportLogger";

export { LogLevels, setLogLevel } from "./genericLogger";

export const logger = {
  ...genericLogger,
  ...performanceReportLogger
};
