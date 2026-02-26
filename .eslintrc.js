module.exports = {
  root: true,
  parser: "@typescript-eslint/parser",
  plugins: ["@typescript-eslint"],
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/eslint-recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:import/errors",
    "plugin:import/warnings",
    "plugin:import/typescript",
    "prettier", // disable rules that are redundant with prettier
  ],
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: "module",
  },
  ignorePatterns: ["**/node_modules/**", "**/lib/**", "**/*.js"],
  rules: {
    "@typescript-eslint/no-shadow": ["error", { ignoreTypeValueShadow: true }],
    "@typescript-eslint/explicit-module-boundary-types": "error",
    "prefer-const": ["error", { destructuring: "all" }],

    "@typescript-eslint/no-var-requires": "off",
    "@typescript-eslint/interface-name-prefix": "off",
    "@typescript-eslint/no-explicit-any": "off",
    "@typescript-eslint/camelcase": "off",
    "no-prototype-builtins": "off",
    "@typescript-eslint/consistent-type-assertions": "off",
    "import/namespace": "off",
    "import/order": "warn",
    "import/no-unresolved": "off",
    "import/default": "off",
  },
  overrides: [
    {
      files: ["**/*.test.ts"],
      rules: {
        "no-restricted-properties": [
          "error",
          ...["describe", "it", "test"]
            .map((func) => [
              {
                object: func,
                property: "only",
                message: "Do not commit .only() tests",
              },
              {
                object: func,
                property: "skip",
                message:
                  "Do not commit .skip() tests (disable this rule if needed)",
              },
            ])
            .flat(),
        ],
      },
    },
  ],
};
