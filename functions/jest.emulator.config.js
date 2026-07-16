/**
 * functions/jest.emulator.config.js — the EMULATOR-backed suite (w1 M1.2).
 *
 * ⚠ NEEDS JAVA — the Firestore emulator cannot run in the build environment
 * (env floor: no JVM). Run BEFORE ANY DEPLOY on a Java-equipped machine:
 *
 *   cd functions
 *   npx firebase emulators:exec --project demo-tiny-bubbles \
 *     "npx jest --config jest.emulator.config.js"
 *
 * See docs/RULES-REVIEW.md for the full pre-deploy checklist.
 */
/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: "node",
  testMatch: ["**/__emulator__/**/*.test.ts"],
  testPathIgnorePatterns: ["/node_modules/", "/lib/"],
  testTimeout: 30000,
  transform: {
    "^.+\\.ts$": [
      "ts-jest",
      {
        tsconfig: {
          composite: false,
          rootDir: ".",
          types: ["node", "jest"],
          isolatedModules: true,
        },
      },
    ],
  },
  moduleNameMapper: {
    "^@tiny-bubbles/shared$": "<rootDir>/../packages/shared/src/index.ts",
    "^@tiny-bubbles/shared/(.*)$": "<rootDir>/../packages/shared/src/$1",
  },
};
