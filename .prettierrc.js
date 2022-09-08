module.exports = {
  overrides: [
    {
      files: "*.md",
      options: {
        proseWrap: "always",
      },
    },
    {
      files: "*.json5",
      options: {
        parser: "jsonc",
      },
    },
  ],
};
