const path = require("path");

module.exports = {
  cacheStorageConfig: {
    provider: "local"
  },
  telemetryFileFolder: path.join(__dirname, "telemetry")
};
