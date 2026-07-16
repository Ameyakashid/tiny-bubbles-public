/**
 * src/theme/ThemeProvider.tsx — the theming context + the scoped override that
 * makes the live side-by-side mode preview buildable (doc 66 M2).
 *
 * The provider holds the ACTIVE theme inputs (ageMode x sensoryMode x
 * companionStyle x textFirst x colorScheme + parent capability grants) and wraps
 * its subtree in a View carrying the matching NativeWind CSS-var palette class
 * (doc 60 §7.4). Nesting a `<ThemeProvider overrideAgeMode="older">` supplies
 * FORCED inputs for a non-active mode, so two columns can render young + older
 * simultaneously (referenced by M9/M11's parent age-mode preview).
 *
 * For M2 the inputs come from props/defaults; M5 will feed `value` from the
 * settings/child stores. Components consume `useThemeTokens()` / `useCapabilities()`
 * and NEVER read the raw ageMode string (doc 66 §2).
 */
import React, { createContext, useContext, useMemo } from "react";
import { useColorScheme, View } from "react-native";

import type {
  AgeMode,
  CelebrationLevel,
  CompanionStyle,
  NeuroProfile,
  SensoryMode,
} from "../domain/types";
import {
  resolveCapabilities,
  type ModeCapabilities,
} from "./resolveCapabilities";
import {
  resolveCelebration,
  type CelebrationSalience,
} from "./resolveCelebration";
import { resolveEffectiveReducedMotion, resolveThemeClass } from "./resolveTokens";
import { useReducedMotion } from "./useReducedMotion";

/** Parent-set capability grants that ride on top of the age defaults. */
export type CapabilityGrants = Partial<{
  ttsDefault: boolean;
  canPickColor: boolean;
  canPickAccessory: boolean;
  canPickTheme: boolean;
  /** master customization grant (child-autonomy §2.2) — false hides the pickers */
  canCustomizeCompanion: boolean;
  /** child may self-request a reward (child-autonomy §2.1) — false → "ask a grown-up" */
  canPickReward: boolean;
  delegateToChild: boolean;
  canAddTasks: boolean;
  moodCheckin: boolean;
}>;

/** The active theme inputs held in context. `companionStyle`/`textFirst` may be
 *  undefined meaning "derive from ageMode" (doc 66 §1b.6). */
export interface ThemeInputs {
  ageMode: AgeMode;
  sensoryMode: SensoryMode;
  colorScheme: "light" | "dark";
  /**
   * w8 (M1.1): the third theming axis (the COORDINATE-ONCE seam w6+w8 share —
   * 02-architecture §3.1). Fed from the active `ChildProfile.neuroProfile`;
   * ABSENT ⇒ the NEUTRAL preset ⇒ v1 rendering byte-identical (§8 #13 — the
   * canonical technical absent-value is NEUTRAL, NOT "both"; "both" is only
   * the recommended new-child pick). Components NEVER read it raw — it flows
   * into resolveCapabilities/resolveTokens/resolveContent via the hooks.
   */
  neuroProfile?: NeuroProfile;
  companionStyle?: CompanionStyle;
  textFirst?: boolean;
  grants?: CapabilityGrants;
  /**
   * The PERSISTED reduced-motion preference = per-child `settings.reducedMotion`
   * OR global `parentSettings.reducedMotionDefault` (accessibility-i18n §2.3).
   * Fed by `ThemedRoot`; combined with the OS flag via
   * `resolveEffectiveReducedMotion` in the consuming hooks. Absent → false.
   */
  reducedMotion?: boolean;
}

// NOTE (w8/§8 #13): `neuroProfile` is deliberately ABSENT here — absent
// resolves to the NEUTRAL preset, keeping every existing child byte-identical
// to v1. Do NOT default it to a profile string.
const DEFAULT_INPUTS: ThemeInputs = {
  ageMode: "young",
  sensoryMode: "standard",
  colorScheme: "light",
};

const ThemeContext = createContext<ThemeInputs>(DEFAULT_INPUTS);

export interface ThemeProviderProps {
  children: React.ReactNode;
  /** Explicit base inputs (root usage / store-fed in M5). Replaces inherited. */
  value?: Partial<ThemeInputs>;
  /** Scoped overrides — the live-preview mechanism. */
  overrideAgeMode?: AgeMode;
  overrideSensoryMode?: SensoryMode;
  overrideCompanionStyle?: CompanionStyle;
  overrideTextFirst?: boolean;
  overrideColorScheme?: "light" | "dark";
}

export function ThemeProvider({
  children,
  value,
  overrideAgeMode,
  overrideSensoryMode,
  overrideCompanionStyle,
  overrideTextFirst,
  overrideColorScheme,
}: ThemeProviderProps) {
  const parent = useContext(ThemeContext);
  const osScheme = useColorScheme();

  const merged = useMemo<ThemeInputs>(() => {
    // base = explicit value (root) else inherited parent inputs (nesting)
    const base: ThemeInputs = { ...parent, ...value };

    // overrideAgeMode re-derives companionStyle/textFirst for the previewed age
    // (drop inherited ones) unless the caller ALSO overrides them explicitly.
    if (overrideAgeMode) {
      base.ageMode = overrideAgeMode;
      base.companionStyle = undefined;
      base.textFirst = undefined;
    }
    if (overrideSensoryMode) base.sensoryMode = overrideSensoryMode;
    if (overrideCompanionStyle !== undefined) base.companionStyle = overrideCompanionStyle;
    if (overrideTextFirst !== undefined) base.textFirst = overrideTextFirst;
    if (overrideColorScheme) base.colorScheme = overrideColorScheme;

    // resolve a concrete colorScheme (OS fallback) so children get a real value
    const colorScheme = base.colorScheme ?? osScheme ?? "light";
    return { ...base, colorScheme };
  }, [
    parent,
    value,
    overrideAgeMode,
    overrideSensoryMode,
    overrideCompanionStyle,
    overrideTextFirst,
    overrideColorScheme,
    osScheme,
  ]);

  const themeClass = resolveThemeClass(merged.ageMode, merged.sensoryMode, merged.colorScheme);

  return (
    <ThemeContext.Provider value={merged}>
      {/* The CSS-var palette class drives className-based color for the subtree. */}
      <View className={themeClass} style={{ flex: 1 }}>
        {children}
      </View>
    </ThemeContext.Provider>
  );
}

/** Raw active theme inputs (rarely needed directly; prefer the resolved hooks). */
export function useThemeInputs(): ThemeInputs {
  return useContext(ThemeContext);
}

/** Per-call scoped overrides accepted by the resolved hooks (doc 66 M2). */
export interface ScopedOverride {
  overrideAgeMode?: AgeMode;
  overrideSensoryMode?: SensoryMode;
  overrideCompanionStyle?: CompanionStyle;
  overrideTextFirst?: boolean;
  overrideColorScheme?: "light" | "dark";
}

/**
 * Resolved capability flags. Accepts an optional per-call override so a single
 * subtree (e.g. a preview tile) can resolve a non-active mode without a nested
 * provider. When `overrideAgeMode` is given, companionStyle/textFirst re-derive
 * for that age unless their own overrides are supplied.
 */
export function useCapabilities(opts?: ScopedOverride): ModeCapabilities {
  const ctx = useThemeInputs();
  const ageMode = opts?.overrideAgeMode ?? ctx.ageMode;
  const reAge = opts?.overrideAgeMode !== undefined;
  const companionStyle =
    opts?.overrideCompanionStyle ?? (reAge ? undefined : ctx.companionStyle);
  const textFirst = opts?.overrideTextFirst ?? (reAge ? undefined : ctx.textFirst);
  // w8 (M1.1): the neuro axis rides the ambient inputs into the resolver —
  // components read the resulting FLAGS only (golden rule).
  const neuroProfile = ctx.neuroProfile;

  return useMemo(
    () =>
      resolveCapabilities({
        ageMode,
        neuroProfile,
        companionStyle,
        textFirst,
        ...ctx.grants,
      }),
    [ageMode, neuroProfile, companionStyle, textFirst, ctx.grants],
  );
}

/**
 * Convenience that resolves a CelebrationLevel from ambient theme inputs
 * (ageMode/sensoryMode from context, reducedMotion from the OS) + the per-moment
 * salience/clamps the caller supplies. M7/M13 use this so callers never have to
 * re-plumb the ambient axes. Phase is intentionally NOT acceptable here.
 */
export function useCelebrationLevel(moment: {
  salience: CelebrationSalience;
  calmMode?: boolean;
  quietHours?: boolean;
  bonus?: boolean;
  overrideAgeMode?: AgeMode;
  overrideSensoryMode?: SensoryMode;
}): CelebrationLevel {
  const ctx = useThemeInputs();
  const osReduced = useReducedMotion();
  // Effective reduced-motion = OS ∨ persisted (per-child/global) so a Settings
  // toggle clamps celebrations end-to-end, not just the OS flag (§2.3).
  const reducedMotion = resolveEffectiveReducedMotion(ctx.reducedMotion, false, osReduced);
  const ageMode = moment.overrideAgeMode ?? ctx.ageMode;
  const sensoryMode = moment.overrideSensoryMode ?? ctx.sensoryMode;
  return useMemo(
    () =>
      resolveCelebration({
        ageMode,
        sensoryMode,
        reducedMotion,
        salience: moment.salience,
        calmMode: moment.calmMode ?? false,
        quietHours: moment.quietHours ?? false,
        bonus: moment.bonus,
      }),
    [
      ageMode,
      sensoryMode,
      reducedMotion,
      moment.salience,
      moment.calmMode,
      moment.quietHours,
      moment.bonus,
    ],
  );
}
