/**
 * src/theme/useThemeTokens.ts — the hook every component uses to read the
 * resolved token set (doc 60 §7.3, doc 66 M2).
 *
 * Combines the ambient theme inputs (from ThemeProvider) with the two runtime
 * axes (reducedMotion from the OS, screenSize from the live window) and returns
 * one `ThemeTokens`. Accepts an optional per-call scoped override so a single
 * subtree can resolve a non-active mode (live preview) without a nested provider.
 *
 * Components call `useThemeTokens()` and read values; they NEVER read the raw
 * ageMode/sensoryMode string (doc 66 §2).
 */
import { useMemo } from "react";

import { useScreenSize } from "./breakpoints";
import { resolveEffectiveReducedMotion, resolveTokens } from "./resolveTokens";
import { useReducedMotion } from "./useReducedMotion";
import { useReduceTransparency } from "./useReduceTransparency";
import { useThemeInputs, type ScopedOverride } from "./ThemeProvider";
import type { ThemeTokens } from "./tokens";

export function useThemeTokens(opts?: ScopedOverride): ThemeTokens {
  const ctx = useThemeInputs();
  const osReducedMotion = useReducedMotion();
  const reduceTransparency = useReduceTransparency();
  const screenSize = useScreenSize();

  const ageMode = opts?.overrideAgeMode ?? ctx.ageMode;
  const sensoryMode = opts?.overrideSensoryMode ?? ctx.sensoryMode;
  const colorScheme = opts?.overrideColorScheme ?? ctx.colorScheme ?? "light";
  // w8 (M1.1): the neuro axis rides the ambient inputs into the resolver (it
  // only fills `sensoryMode` when that is unset; explicit settings still win).
  const neuroProfile = ctx.neuroProfile;
  // Effective reduced-motion = OS ∨ persisted per-child/global (§2.3 bug fix):
  // the persisted preference now actually reaches the resolver, so a Settings
  // toggle zeroes motion + kills confetti end-to-end (previously OS-only).
  const reducedMotion = resolveEffectiveReducedMotion(ctx.reducedMotion, false, osReducedMotion);

  return useMemo(
    () =>
      resolveTokens({
        ageMode,
        sensoryMode,
        neuroProfile,
        reducedMotion,
        screenSize,
        colorScheme,
        reduceTransparency,
      }),
    [ageMode, sensoryMode, neuroProfile, reducedMotion, screenSize, colorScheme, reduceTransparency],
  );
}
