/**
 * src/theme/breakpoints.ts — responsive screen-size dimension (doc 66 M2).
 *
 * M1.1b split: the PURE part (`ScreenSize`, `BREAKPOINTS`, `screenSizeFor`)
 * moved to `@tiny-bubbles/shared/theme/breakpoints` (02-architecture §2.1 —
 * the shared `resolveTokens` needs it) and is re-exported here unchanged.
 * ONLY the RN-bound runtime hook stays per-app (BUILD-GUIDE §4: never move
 * RN-native code into shared).
 */
import { useWindowDimensions } from "react-native";

import { screenSizeFor, type ScreenSize } from "@tiny-bubbles/shared/theme/breakpoints";

export * from "@tiny-bubbles/shared/theme/breakpoints";

/** Runtime hook: current screen-size bucket from the live window width. */
export function useScreenSize(): ScreenSize {
  const { width } = useWindowDimensions();
  return screenSizeFor(width);
}
