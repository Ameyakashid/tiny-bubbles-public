/** @type {import('jest').Config} */
// apps/parent/jest.config.js — mirrors apps/kid (jest-expo preset + the same
// ESM transform allowlist).
module.exports = {
  preset: "jest-expo",
  transformIgnorePatterns: [
    "node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|nativewind|react-native-css-interop|react-native-reanimated|react-native-worklets))",
  ],
  testMatch: ["**/__tests__/**/*.test.ts", "**/__tests__/**/*.test.tsx"],
};
