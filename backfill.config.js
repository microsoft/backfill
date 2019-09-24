const path = require("path");

module.exports = {
  cacheStorageConfig: {
    provider: "local"
  },
  logFolder: path.join(__dirname, ".backfill-logs"),
  logLevel: "silly"
};
