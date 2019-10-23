import { logger as genericLogger } from "./genericLogger";
import { performanceReportLogger } from "./performanceReportLogger";

export { LogLevels, setLogLevel, isCorrectLogLevel } from "./genericLogger";

export const logger = {
  ...genericLogger,
  ...performanceReportLogger
};
