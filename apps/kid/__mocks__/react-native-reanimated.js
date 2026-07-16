/**
 * __mocks__/react-native-reanimated.js — self-contained jest mock
 * (production-readiness §2.8).
 *
 * The shipped `react-native-reanimated/mock` (SDK-56 / Reanimated 4) pulls in the
 * REAL `react-native-worklets` native initializer, which throws under jest
 * ("Native part of Worklets doesn't seem to be initialized"). So instead of
 * re-exporting the package mock, this provides a lightweight, worklet-free stub:
 * animation helpers resolve SYNCHRONOUSLY to their target value, shared values
 * are plain `{ value }` boxes, and `Animated.View`/`Text`/`Image`/`ScrollView`
 * are the corresponding React Native components. This is what lets the mandated
 * component render-tests (visual-timers §4, breathing-regulation §4) run — a
 * rendered `withTiming`/`useAnimatedProps`/`useSharedValue` component no longer
 * throws. Auto-applied to every suite via the root `__mocks__` convention.
 */
/* eslint-disable @typescript-eslint/no-var-requires */
const React = require("react");
const {
  View,
  Text,
  Image,
  ScrollView,
  Animated: RNAnimated,
} = require("react-native");

// ---- animation helpers: resolve to their target value synchronously ----------
const withTiming = (toValue, _config, callback) => {
  if (typeof _config === "function") _config(true);
  if (typeof callback === "function") callback(true);
  return toValue;
};
const withSpring = (toValue, _config, callback) => {
  if (typeof _config === "function") _config(true);
  if (typeof callback === "function") callback(true);
  return toValue;
};
const withSequence = (...values) => (values.length ? values[values.length - 1] : 0);
const withRepeat = (value) => value;
const withDelay = (_delay, value) => value;
const withDecay = (_config, callback) => {
  if (typeof callback === "function") callback(true);
  return 0;
};
const cancelAnimation = () => {};

// ---- hooks --------------------------------------------------------------------
const useSharedValue = (initial) => {
  const ref = React.useRef({ value: initial });
  return ref.current;
};
const safeCall = (fn) => {
  try {
    return typeof fn === "function" ? fn() : {};
  } catch {
    return {};
  }
};
const useAnimatedStyle = (fn) => safeCall(fn);
const useAnimatedProps = (fn) => safeCall(fn);
const useDerivedValue = (fn) => ({ value: safeCall(fn) });
const useAnimatedRef = () => React.useRef(null);
const useAnimatedReaction = () => {};
const useAnimatedScrollHandler = () => () => {};
const useAnimatedGestureHandler = () => () => {};
const useReducedMotion = () => false;
const useFrameCallback = () => ({ setActive: () => {}, isActive: false });

// ---- thread hops (no-op: run inline) ------------------------------------------
const runOnJS = (fn) => fn;
const runOnUI = (fn) => fn;

// ---- interpolation ------------------------------------------------------------
const interpolate = (value, input, output) => {
  if (Array.isArray(output)) return output[0];
  return value;
};
const interpolateColor = (_value, _input, output) =>
  Array.isArray(output) ? output[0] : "#000000";

const Extrapolation = { CLAMP: "clamp", EXTEND: "extend", IDENTITY: "identity" };
const Extrapolate = Extrapolation;
const ReduceMotion = { System: "system", Never: "never", Always: "always" };

// ---- Easing: every access is a callable that returns itself -------------------
const easingFn = (...args) => easingFn;
const Easing = new Proxy(easingFn, { get: () => easingFn });

// ---- entering/exiting/layout builders: chainable no-op proxy ------------------
function makeAnimBuilder() {
  const target = function AnimBuilder() {};
  const proxy = new Proxy(target, {
    get: (_t, prop) => {
      if (prop === "build") return () => () => ({});
      return (..._args) => proxy;
    },
    apply: () => proxy,
  });
  return proxy;
}
const FadeIn = makeAnimBuilder();
const FadeOut = makeAnimBuilder();
const FadeInDown = makeAnimBuilder();
const FadeInUp = makeAnimBuilder();
const ZoomIn = makeAnimBuilder();
const ZoomOut = makeAnimBuilder();
const SlideInDown = makeAnimBuilder();
const SlideInUp = makeAnimBuilder();
const SlideOutDown = makeAnimBuilder();
const SlideOutUp = makeAnimBuilder();
const Layout = makeAnimBuilder();
const LinearTransition = makeAnimBuilder();
const CurvedTransition = makeAnimBuilder();

// ---- Animated namespace -------------------------------------------------------
const createAnimatedComponent = (Component) => Component;
const Animated = {
  View,
  Text,
  Image,
  ScrollView,
  createAnimatedComponent,
  addWhitelistedNativeProps: () => {},
  addWhitelistedUIProps: () => {},
  // RN Animated shims a couple of files reference off the default export.
  Value: RNAnimated?.Value,
  timing: RNAnimated?.timing,
};

module.exports = {
  __esModule: true,
  default: Animated,
  createAnimatedComponent,
  useSharedValue,
  useAnimatedStyle,
  useAnimatedProps,
  useDerivedValue,
  useAnimatedRef,
  useAnimatedReaction,
  useAnimatedScrollHandler,
  useAnimatedGestureHandler,
  useReducedMotion,
  useFrameCallback,
  withTiming,
  withSpring,
  withSequence,
  withRepeat,
  withDelay,
  withDecay,
  cancelAnimation,
  runOnJS,
  runOnUI,
  interpolate,
  interpolateColor,
  Extrapolation,
  Extrapolate,
  ReduceMotion,
  Easing,
  FadeIn,
  FadeOut,
  FadeInDown,
  FadeInUp,
  ZoomIn,
  ZoomOut,
  SlideInDown,
  SlideInUp,
  SlideOutDown,
  SlideOutUp,
  Layout,
  LinearTransition,
  CurvedTransition,
};
