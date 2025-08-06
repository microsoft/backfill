import type { Config } from "jest";

export const jestConfig: Config = {
  roots: ["<rootDir>/src"],
  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        // Badly-named option actually means disable type checking
        isolatedModules: true,
      },
    ],
  },
  testRegex: "(/__tests__/.*(\\.|/)(test|spec))\\.tsx?$",
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "node"],
  testTimeout: 30 * 1000,
};
