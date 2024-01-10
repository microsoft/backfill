// @ts-check
/**
 * lage types are slightly incorrect with what's required/optional
 * @typedef {import('lage').ConfigOptions} ConfigOptions
 * @typedef {import('lage').CacheOptions} CacheOptions
 * @typedef {Partial<Omit<ConfigOptions, 'cacheOptions'>> & { cacheOptions?: Partial<CacheOptions> }} LageConfig
 * @type {LageConfig}
 */
const config = {
  pipeline: {
    build: ["^build"],
    test: ["build"],
    watch: [],
  },
  npmClient: "yarn",
  // These options are sent to `backfill`
  cacheOptions: {
    // These are relative to the git root, and affects the hash of the cache
    // Any of these file changes will invalidate cache
    environmentGlob: [
      "!**/node_modules/**",
      "!**/__fixtures__/**",
      ".github/workflows/*",
      "*.json",
      "*.yml",
      "yarn.lock",
      "tools/**/*",
    ],

    /**
     * Subset of files in package directories that will be saved into the cache.
     */
    outputGlob: ["lib/**/*"],
  },
};
module.exports = config;
