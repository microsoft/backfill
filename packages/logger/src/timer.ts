export type Timer = { start(): { stop(): number } };

export const defaultTimer = {
  start() {
    const start = process.hrtime();
    return {
      stop() {
        const delta = process.hrtime(start);
        const time = Math.round(delta[0] * 1000 + delta[1] / 1000000);
        return time;
      },
    };
  },
};
