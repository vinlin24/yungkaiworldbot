/**
 * For a detailed explanation regarding each configuration property, visit:
 * https://jestjs.io/docs/configuration
 */

import type { Config } from "jest";

const config: Config = {
  // Automatically clear mock calls, instances, contexts and results before
  // every test
  clearMocks: true,

  // Indicates whether the coverage information should be collected while
  // executing the test
  collectCoverage: true,

  // The directory where Jest should output its coverage files
  coverageDirectory: "coverage",

  // An array of regexp pattern strings used to skip coverage collection
  coveragePathIgnorePatterns: [
    "\\\\node_modules\\\\",
    "tests/",
  ],

  // A list of reporter names that Jest uses when writing coverage reports
  coverageReporters: [
    "text", // Display coverage table in stdout
    "lcov", // Generate HTML report for visualizing (un)covered code
    "json-summary", // Generate JSON data useful for scripting
  ],

  // A preset that is used as a base for Jest's configuration
  preset: "ts-jest",

  // Automatically reset mock state before every test
  resetMocks: true,

  // The root directory that Jest should scan for tests and modules within
  rootDir: "./",

  // The test environment that will be used for testing
  testEnvironment: "node",

  // The glob patterns Jest uses to detect test files
  testMatch: [
    "<rootDir>/tests/**/*.test.ts",
  ],

  // A map from regular expressions to paths to transformers
  transform: {
    "\\.[jt]s": ["ts-jest", {
      isolatedModules: true, // Skip type checking
    }],
  },
};

export default config;
