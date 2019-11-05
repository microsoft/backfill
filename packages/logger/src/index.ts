import { logger as genericLogger } from "backfill-generic-logger";
import { performanceLogger } from "backfill-performance-logger";

export {
  LogLevels,
  setLogLevel,
  isCorrectLogLevel
} from "backfill-generic-logger";

export const logger = {
  ...genericLogger,
  ...performanceLogger
};
