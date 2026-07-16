/**
 * src/theme/useOSFontScale.ts — the clamped OS Dynamic-Type scale (§2.2).
 *
 * RN scales `<Text>` by the OS accessibility text size on top of the design
 * `fontScale`. `AppText`/`AppTextInput` BOUND that with `maxFontSizeMultiplier`
 * (1.3, the primary safety net). This hook exposes the *effective* OS scale,
 * clamped to `[1, DYNAMIC_TYPE_MAX_MULTIPLIER]`, so a screen can OPT IN to reflow
 * (e.g. stack a horizontal row vertically) when text is large. Web-safe.
 */
import { useWindowDimensions } from "react-native";

import { DYNAMIC_TYPE_MAX_MULTIPLIER } from "./tokens";

/** Clamp a raw scale to the design's `[1, cap]` Dynamic-Type range. */
export function clampFontScale(raw: number): number {
  if (!Number.isFinite(raw) || raw < 1) return 1;
  return Math.min(raw, DYNAMIC_TYPE_MAX_MULTIPLIER);
}

/**
 * The current OS font scale, clamped to `[1, 1.3]`. Use for layout-reflow
 * decisions only; the text cap itself is applied by `AppText`/`AppTextInput`.
 */
export function useOSFontScale(): number {
  const { fontScale } = useWindowDimensions();
  return clampFontScale(fontScale);
}

/** True when the OS text size is large enough to warrant reflowing a tight row. */
export function useIsLargeTextScale(threshold = 1.15): boolean {
  return useOSFontScale() >= threshold;
}
