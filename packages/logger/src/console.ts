export type Console = {
  info(...args: string[]): void;
  warn(...args: string[]): void;
  error(...args: string[]): void;
};

export const defaultConsole = {
  info: console.info,
  warn: console.warn,
  error: console.error,
};
