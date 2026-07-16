/**
 * functions/jest.config.js — Node-side UNIT suite (BUILD-GUIDE §2.3).
 *
 * Runs the handler tests against in-memory fakes of the `ports.ts` seams —
 * NO emulator, NO Java, NO network (the env floor). The emulator-backed
 * rules/auth/retention suite lives under `__emulator__/` with its own config
 * (`jest.emulator.config.js`) and is EXCLUDED here — run it via
 * `npm run test:emulator` on a Java-equipped machine before deploy
 * (docs/RULES-REVIEW.md).
 */
/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: "node",
  testMatch: ["**/__tests__/**/*.test.ts"],
  testPathIgnorePatterns: ["/node_modules/", "/lib/", "/__emulator__/"],
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
  // Node-side alias resolution (arch §1.3): ts-jest resolves the shared
  // package without the app-side Metro/tsconfig plumbing.
  moduleNameMapper: {
    "^@tiny-bubbles/shared$": "<rootDir>/../packages/shared/src/index.ts",
    "^@tiny-bubbles/shared/(.*)$": "<rootDir>/../packages/shared/src/$1",
  },
};
