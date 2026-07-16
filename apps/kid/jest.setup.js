/* Jest setup — native-module mocks so the storage layer + component render-tests
 * can run under jest-expo without a device/native runtime. */

/* AsyncStorage: official in-memory mock (jest-expo does not mock it itself). */
jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

/* Reanimated (production-readiness §2.8): activate the self-contained manual mock
 * in `__mocks__/react-native-reanimated.js`. The shipped `/mock` entry pulls in
 * the real `react-native-worklets` native initializer, which throws under jest,
 * so we stub the API worklet-free (animations resolve synchronously, shared
 * values are plain boxes, Animated.* are RN components). This makes the mandated
 * component render-tests (visual-timers §4, breathing-regulation §4) authorable —
 * a rendered withTiming / useAnimatedProps / useSharedValue no longer throws.
 * See __tests__/helpers/render.tsx + __tests__/render/harness.test.tsx. */
global.__reanimatedWorkletInit = () => {};
jest.mock("react-native-reanimated");

/* Gesture Handler: its jestSetup stubs the native gesture module so a rendered
 * component that uses it (e.g. the soundscapes VolumeSlider) doesn't throw. */
require("react-native-gesture-handler/jestSetup");
