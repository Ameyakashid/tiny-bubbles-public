/**
 * src/theme — public surface of the theming / age-adaptive engine (doc 66 M2).
 *
 * Components should import from here. The golden rule: read tokens / capability
 * flags / resolved content keys — NEVER the raw ageMode/sensoryMode string.
 */
export * from "./tokens";
export * from "./breakpoints";
export * from "./resolveTokens";
export * from "./resolveCapabilities";
export * from "./resolveContent";
export * from "./resolveCelebration";
export * from "./resolveMoodCheckin";
export * from "./resolveStatusPresentation";
export * from "./contrast";
export * from "./useReducedMotion";
export * from "./useReduceTransparency";
export * from "./useOSFontScale";
export * from "./useThemeTokens";
export * from "./fonts";
export {
  ThemeProvider,
  useThemeInputs,
  useCapabilities,
  useCelebrationLevel,
  type ThemeProviderProps,
  type ThemeInputs,
  type ScopedOverride,
  type CapabilityGrants,
} from "./ThemeProvider";
