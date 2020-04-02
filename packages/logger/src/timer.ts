export type Timer = { start(): { stop(): number } };

export const defaultTimer = {
  start() {
    const start = Date.now();
    return {
      stop() {
        return Date.now() - start;
      }
    };
  }
};
