module.exports = {
  cacheStorageConfig: {
    provider: (logger, cwd) => ({
      fetch(hash) {
        return Promise.resolve(true);
      },
      put(hash, filesToCache) {
        return Promise.resolve();
      },
    }),
    name: "custom-provider",
  },
};
