/** @type {import('jest').Config} */
module.exports = {
  preset: "jest-expo",
  // Mock native modules (AsyncStorage) before each test file runs.
  setupFiles: ["<rootDir>/jest.setup.js"],
  // Static audio assets (the M13 cue .wav files) are `require()`d at module load
  // in src/services/sound.ts; jest has no transformer for them, so map them to a
  // numeric stub so the sound-registry logic can be unit-tested off-device.
  moduleNameMapper: {
    "\\.(wav|mp3|m4a)$": "<rootDir>/__tests__/__mocks__/audioAssetStub.js",
    // M1.1: resolve the shared workspace the same way tsc `paths` + Metro
    // `extraNodeModules` do (02-architecture §1.3) — the package has no
    // `exports` map, so subpath imports (e.g. @tiny-bubbles/shared/domain/types)
    // need an explicit map to packages/shared/src.
    "^@tiny-bubbles/shared$": "<rootDir>/../../packages/shared/src/index.ts",
    "^@tiny-bubbles/shared/(.*)$": "<rootDir>/../../packages/shared/src/$1",
  },
  // Allow Babel to transform the ESM-shipped RN/Expo/NativeWind/Reanimated
  // packages so domain + component tests can import them in later milestones.
  transformIgnorePatterns: [
    "node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|nativewind|react-native-css-interop|react-native-reanimated|react-native-worklets))",
  ],
  testMatch: ["**/__tests__/**/*.test.ts", "**/__tests__/**/*.test.tsx"],
};
