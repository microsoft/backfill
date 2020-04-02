import { LogLevel, logLevelsObject } from "./logLevel";

export type LevelFilter = {
  filter(logLevel: LogLevel): boolean;
};

export const defaultFilter: (logLevel: LogLevel) => LevelFilter = (
  logLevel: LogLevel
) => {
  return {
    filter(level: LogLevel): boolean {
      if (level === "mute") {
        return false;
      }

      return logLevelsObject[level] <= logLevelsObject[logLevel];
    }
  };
};
