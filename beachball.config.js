// @ts-check
/** @type {import('beachball').BeachballConfig} */
const config = {
  groupChanges: true,
  changelog: {
    groups: [
      {
        masterPackageName: "backfill",
        changelogPath: "packages/backfill",
        include: ["packages/*"],
      },
    ],
  },
  ignorePatterns: [
    "**/jest.config.js",
    "**/src/__fixtures__/**",
    "**/src/__tests__/**",
  ],
  scope: ["!packages/utils-test/__fixtures__/*"],
};
module.exports = config;
