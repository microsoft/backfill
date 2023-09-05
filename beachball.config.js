// @ts-check
/** @type {import('beachball').BeachballConfig} */
module.exports = {
  groupChanges: true,
  ignorePatterns: [
    "**/jest.config.js",
    "**/src/__fixtures__/**",
    "**/src/__tests__/**",
  ],
  scope: ["!packages/utils-test/__fixtures__/*"],
};
