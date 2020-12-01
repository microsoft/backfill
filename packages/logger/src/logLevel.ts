export const logLevelsObject = {
  silly: 4,
  verbose: 3,
  info: 2,
  warn: 1,
  error: 0,
  mute: -1,
};

export type LogLevel = keyof typeof logLevelsObject;

export function isCorrectLogLevel(level: string): level is LogLevel {
  return Object.keys(logLevelsObject).includes(level);
}
