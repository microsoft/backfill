import { LogLevel, logLevelsObject } from "./logLevel";

export type LogFilter = {
  shouldLog(logLevel: LogLevel): boolean;
};

export const defaultLogFilter: (logLevel: LogLevel) => LogFilter = (
  logLevel: LogLevel
) => {
  return {
    shouldLog(level: LogLevel): boolean {
      if (level === "mute") {
        return false;
      }

      return logLevelsObject[level] <= logLevelsObject[logLevel];
    },
  };
};
