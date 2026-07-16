/**
 * theme/breakpoints.ts — the PURE responsive screen-size dimension (doc 66 M2;
 * extracted from apps/kid in M1.1b, 02-architecture §2.1).
 *
 * The fourth resolver input (alongside ageMode x sensoryMode x reducedMotion):
 * screen size, so each age mode gets a real tablet layout instead of a stretched
 * phone UI. ONLY the RN-free part lives here — the runtime `useScreenSize()`
 * hook (RN `useWindowDimensions`) stays per-app in
 * `apps/kid/src/theme/breakpoints.ts` (RN-bound hooks never enter shared).
 */

export type ScreenSize = "phone" | "tablet";

/**
 * Width thresholds in dp. 600dp is the long-standing Android `sw600dp` "tablet"
 * convention and roughly the iPad-mini portrait short edge — a sensible single
 * breakpoint for "this is a tablet-class canvas, give it room."
 */
export const BREAKPOINTS = {
  /** width (dp) at or above which we treat the canvas as tablet-class */
  tablet: 600,
} as const;

/** Pure: map a width (dp) to a screen-size bucket. */
export function screenSizeFor(width: number): ScreenSize {
  return width >= BREAKPOINTS.tablet ? "tablet" : "phone";
}
