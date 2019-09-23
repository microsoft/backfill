import { logger as genericLogger } from "./genericLogger";
import { performanceReportLogger } from "./performanceReportLogger";

export { mark } from "./performanceMarkers";

export const logger = {
  ...genericLogger,
  ...performanceReportLogger
};
