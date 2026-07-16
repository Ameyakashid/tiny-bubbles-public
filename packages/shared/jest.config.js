/**
 * packages/shared/jest.config.js — Node-side suite (ts-jest/node per
 * BUILD-GUIDE §2.2; the ts-jest transform landed in M1.1 with the first real
 * shared tests: resolveNeuroPreset + the w8 compliance modules + gates).
 */
/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: "node",
  testMatch: ["**/__tests__/**/*.test.ts"],
  // ts-jest transpiles the TS sources for the Node runner; CommonJS output
  // (the package is CJS — no "type": "module").
  transform: {
    "^.+\\.ts$": [
      "ts-jest",
      {
        // Merged over the package tsconfig: tests live OUTSIDE src/ (kept out
        // of the lib/ build), so relax composite/rootDir for the test compile;
        // nodenext emits CJS here (the package has no "type": "module").
        tsconfig: {
          composite: false,
          rootDir: ".",
          types: ["node", "jest"],
          // required for the hybrid (nodenext) module kind under ts-jest's
          // per-file transpile; also what tsc itself recommends for tests.
          isolatedModules: true,
        },
      },
    ],
  },
  // Node-side alias resolution (arch §1.3): jest maps the package name to
  // src/ so shared tests can import their own barrel the way consumers do.
  moduleNameMapper: {
    "^@tiny-bubbles/shared(.*)$": "<rootDir>/src$1",
  },
};
