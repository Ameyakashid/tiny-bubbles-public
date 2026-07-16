/**
 * theme/resolveTokens.ts — [extracted v1 → @tiny-bubbles/shared, M1.1b] the single token resolver (doc 60 §7.3, doc 66 M2).
 *
 * Starts from an `ageMode` BASE, then applies `sensoryMode==='lowStim'` and
 * `reducedMotion` as REDUCERS (dampen palette, kill confetti, shorten/zero
 * motion, soften haptics), and folds in the `screenSize` dimension so each age
 * mode has a real tablet layout. ONE source of truth — no component branches on
 * age (doc 66 §2). Pure + unit-testable.
 *
 * w8 (M1.1): `neuroProfile` joins as an INPUT — when `sensoryMode` is UNSET the
 * preset's `sensoryModeDefault` fills it (autism/both ⇒ lowStim; adhd/neutral ⇒
 * standard). An EXPLICIT `sensoryMode` and OS reduce-motion always win
 * (precedence §3.2). With both `sensoryMode` set and `neuroProfile` absent the
 * output is byte-identical to pre-w8.
 */
import { resolveNeuroPreset } from "./resolveNeuroPreset";

import type { AgeMode, NeuroProfile, SensoryMode } from "../domain/types";
import type { ScreenSize } from "./breakpoints";
import {
  BASE_MOTION,
  DYNAMIC_TYPE_MAX_MULTIPLIER,
  FONT_FAMILIES,
  REEF,
  spacing as spacingFn,
  STILLWATER,
  TIDE_DARK,
  TIDE_LIGHT,
  type ThemeColors,
  type ThemeClass,
  type ThemeTokens,
  type TypeScale,
} from "./tokens";

export interface ResolveTokensInput {
  ageMode: AgeMode;
  /**
   * w8 (M1.1): OPTIONAL — when unset, defaults from the neuroProfile preset
   * (`sensoryModeDefault`; absent profile ⇒ `standard`, the v1 default).
   * Explicit values always win. Existing callers keep passing it → unchanged.
   */
  sensoryMode?: SensoryMode;
  /** w8 (M1.1): the third axis; only consulted when `sensoryMode` is unset. */
  neuroProfile?: NeuroProfile;
  /** the EFFECTIVE reduced-motion (OS ∨ per-child ∨ global) — see
   *  `resolveEffectiveReducedMotion`; `useThemeTokens` computes it. */
  reducedMotion: boolean;
  screenSize: ScreenSize;
  /** only Tide (older/standard) has a dark variant; defaults light */
  colorScheme?: "light" | "dark";
  /** OS Reduce-Transparency → flatten scrim + drop gradients (§2.3); default false */
  reduceTransparency?: boolean;
}

// ---------------------------------------------------------------------------
// Type scales (doc 61 §3.2). Min body never below 16; young min 18.
// ---------------------------------------------------------------------------
const TYPE_YOUNG: TypeScale = {
  display: { size: 40, lineHeight: 46, family: FONT_FAMILIES.displayBold, weight: "700" },
  h1: { size: 30, lineHeight: 36, family: FONT_FAMILIES.heading, weight: "600" },
  h2: { size: 24, lineHeight: 30, family: FONT_FAMILIES.heading, weight: "600" },
  bodyLg: { size: 20, lineHeight: 30, family: FONT_FAMILIES.bodyMedium, weight: "500" },
  body: { size: 18, lineHeight: 27, family: FONT_FAMILIES.body, weight: "400" },
  label: { size: 16, lineHeight: 22, family: FONT_FAMILIES.bodySemiBold, weight: "600" },
  caption: { size: 14, lineHeight: 20, family: FONT_FAMILIES.bodyMedium, weight: "500" },
  token: { size: 24, lineHeight: 28, family: FONT_FAMILIES.bodyBold, weight: "700", tabularNums: true },
};

const TYPE_OLDER: TypeScale = {
  display: { size: 32, lineHeight: 38, family: FONT_FAMILIES.displayBold, weight: "700" },
  h1: { size: 24, lineHeight: 30, family: FONT_FAMILIES.heading, weight: "600" },
  h2: { size: 20, lineHeight: 26, family: FONT_FAMILIES.heading, weight: "600" },
  bodyLg: { size: 18, lineHeight: 27, family: FONT_FAMILIES.bodyMedium, weight: "500" },
  body: { size: 16, lineHeight: 24, family: FONT_FAMILIES.body, weight: "400" },
  label: { size: 14, lineHeight: 20, family: FONT_FAMILIES.bodySemiBold, weight: "600" },
  caption: { size: 13, lineHeight: 18, family: FONT_FAMILIES.bodyMedium, weight: "500" },
  token: { size: 20, lineHeight: 24, family: FONT_FAMILIES.bodyBold, weight: "700", tabularNums: true },
};

// preteen reads at the older scale for v1 (aging-up §3.3). A future polish pass
// may tighten it; reusing the older metrics keeps the tier additive-only.
const TYPE_PRETEEN: TypeScale = { ...TYPE_OLDER };

// ---------------------------------------------------------------------------
// Per-age BASE (standard sensory, phone, before reducers).
// ---------------------------------------------------------------------------
interface AgeBase {
  touchTargetMin: number;
  primaryActionMin: number;
  fontScale: number;
  radius: number;
  type: TypeScale;
  textFirst: boolean;
  spokenLabelDefault: boolean;
  showLabels: boolean;
  soundscapeDefault: boolean;
}

const AGE_BASE: Record<AgeMode, AgeBase> = {
  young: {
    touchTargetMin: 64, // absolute floor for any standalone tappable (~1cm)
    primaryActionMin: 120, // big Done/pop tap (~1.9cm)
    fontScale: 1.25,
    radius: 28,
    type: TYPE_YOUNG,
    textFirst: false, // icon/picture first
    spokenLabelDefault: true, // auto-speak
    showLabels: true,
    soundscapeDefault: true,
  },
  older: {
    touchTargetMin: 48,
    primaryActionMin: 96,
    fontScale: 1.0,
    radius: 22,
    type: TYPE_OLDER,
    textFirst: true,
    spokenLabelDefault: false,
    showLabels: true,
    soundscapeDefault: false,
  },
  // preteen mirrors older's metrics (aging-up §3.3); identity differences live in
  // the copy/companion resolvers, not the geometry.
  preteen: {
    touchTargetMin: 48,
    primaryActionMin: 96,
    fontScale: 1.0,
    radius: 22,
    type: TYPE_PRETEEN,
    textFirst: true,
    spokenLabelDefault: false,
    showLabels: true,
    soundscapeDefault: false,
  },
};

// ---------------------------------------------------------------------------
// Responsive: contentMaxWidth + columns per (ageMode x screenSize).
// young stays single-focal (1 column) but centered with a max width on tablet;
// older grids gain a column on tablet. (doc 66 M2)
// ---------------------------------------------------------------------------
const RESPONSIVE: Record<AgeMode, Record<ScreenSize, { contentMaxWidth: number; columns: number }>> = {
  young: {
    phone: { contentMaxWidth: 520, columns: 1 },
    tablet: { contentMaxWidth: 600, columns: 1 },
  },
  older: {
    phone: { contentMaxWidth: 640, columns: 1 },
    tablet: { contentMaxWidth: 960, columns: 2 },
  },
  // preteen mirrors older (tablet 2-col) — aging-up §3.3.
  preteen: {
    phone: { contentMaxWidth: 640, columns: 1 },
    tablet: { contentMaxWidth: 960, columns: 2 },
  },
};

/**
 * §1b.5 sensory precedence: the EFFECTIVE sensoryMode fed to the resolvers is
 * `lowStim` if EITHER the per-child setting OR the global lowStim theme is on.
 * Centralized here so the composition root (`app/_layout.tsx`) never inlines a
 * raw `=== 'lowStim'` branch — every mode branch lives in a resolver (doc 66 §2,
 * M14). Pure + unit-testable.
 */
export function resolveEffectiveSensoryMode(
  childSensoryMode: SensoryMode | undefined,
  globalLowStimTheme: boolean,
): SensoryMode {
  return childSensoryMode === "lowStim" || globalLowStimTheme ? "lowStim" : "standard";
}

/**
 * The EFFECTIVE reduced-motion fed to the resolvers (accessibility-i18n §2.3 bug
 * fix). Mirrors `resolveEffectiveSensoryMode`: reduced-motion is on when the OS
 * flag OR the per-child `settings.reducedMotion` OR the global
 * `parentSettings.reducedMotionDefault` is on. Before this pass ONLY the OS flag
 * reached the resolver — the persisted settings were saved but inert. Pure +
 * unit-testable; `useThemeTokens` wires the persisted inputs in.
 */
export function resolveEffectiveReducedMotion(
  childReduced: boolean | undefined,
  globalReducedDefault: boolean | undefined,
  osReduced: boolean,
): boolean {
  return !!childReduced || !!globalReducedDefault || osReduced;
}

/** Flatten an `rgba(...)`/`rgb(...)` scrim to an opaque solid (reduce-transparency). */
function solidifyColor(color: string): string {
  const m = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i.exec(color);
  return m ? `rgb(${m[1]}, ${m[2]}, ${m[3]})` : color;
}

/**
 * The NativeWind CSS-var class for a given axis combo — used by ThemeProvider to
 * apply the palette to its subtree without needing the full (screen-dependent)
 * token resolution. Palette depends ONLY on age x sensory x colorScheme.
 */
export function resolveThemeClass(
  ageMode: AgeMode,
  sensoryMode: SensoryMode,
  colorScheme: "light" | "dark" = "light",
): ThemeClass {
  return pickPalette(ageMode, sensoryMode, colorScheme).themeClass;
}

function pickPalette(
  ageMode: AgeMode,
  sensoryMode: SensoryMode,
  colorScheme: "light" | "dark",
): { colors: ThemeColors; themeClass: ThemeClass } {
  // lowStim ALWAYS resolves to Stillwater, overlaying either age (doc 61 §2.5).
  if (sensoryMode === "lowStim") {
    return { colors: STILLWATER, themeClass: "tb-stillwater" };
  }
  if (ageMode === "young") {
    return { colors: REEF, themeClass: "tb-reef" }; // Reef has no dark variant
  }
  // older | preteen -> Tide (the only palette with a dark variant; doc 61 §2.4
  // states Tide "supports aging-up"). Explicit so a future distinct preteen
  // "Slate" palette is a 1-line swap (aging-up §3.3 / §9.2).
  return colorScheme === "dark"
    ? { colors: TIDE_DARK, themeClass: "tb-tide-dark" }
    : { colors: TIDE_LIGHT, themeClass: "tb-tide" };
}

export function resolveTokens(input: ResolveTokensInput): ThemeTokens {
  const { ageMode, reducedMotion, screenSize } = input;
  // w8 (M1.1): explicit sensoryMode > neuroProfile preset default > standard.
  // (OS reduce-motion keeps clamping motion below, independent of this.)
  const sensoryMode =
    input.sensoryMode ?? resolveNeuroPreset(input.neuroProfile).sensoryModeDefault;
  const colorScheme = input.colorScheme ?? "light";

  const reduceTransparency = input.reduceTransparency ?? false;

  const base = AGE_BASE[ageMode];
  const responsive = RESPONSIVE[ageMode][screenSize];
  const picked = pickPalette(ageMode, sensoryMode, colorScheme);
  const themeClass = picked.themeClass;
  // Reduce-transparency: flatten the celebration scrim to a solid + drop canvas
  // gradients so washes don't shimmer for sensitive users (§2.3). Composes with
  // lowStim (Stillwater is already flat). Everything else about the palette holds.
  const colors: ThemeColors = reduceTransparency
    ? {
        ...picked.colors,
        canvasGradTop: picked.colors.canvas,
        canvasGradBot: picked.colors.canvas,
        scrim: solidifyColor(picked.colors.scrim),
      }
    : picked.colors;

  const lowStim = sensoryMode === "lowStim";

  // --- motion reducer (doc 61 §7.1, doc 66/67 M2 "shortens motion") ---
  // standard = 1; lowStim shortens to 0.7; reducedMotion forces instant (0) and
  // wins over lowStim. Loops/parallax die under either.
  let durationScale = 1;
  if (lowStim) durationScale = 0.7;
  if (reducedMotion) durationScale = 0;
  const loopsEnabled = !lowStim && !reducedMotion;

  // --- confetti: off in lowStim OR reducedMotion (doc 61 §8.4) ---
  const confetti = !lowStim && !reducedMotion;

  // --- haptics: standard rich; lowStim light; (off is a per-category user
  //     setting handled downstream, not an age/sensory default) ---
  const haptics = lowStim ? "light" : "rich";

  // --- soundscape: lowStim never auto-enables an ambient loop ---
  const soundscapeDefault = base.soundscapeDefault && !lowStim;

  // --- tablet/lowStim density: lowStim wants more whitespace -> 1 column,
  //     slightly narrower focal column ---
  const columns = lowStim ? 1 : responsive.columns;
  const contentMaxWidth = lowStim
    ? Math.min(responsive.contentMaxWidth, 600)
    : responsive.contentMaxWidth;

  // lowStim flattens corners a touch (doc 61 §5.3 lowStim radius ~16)
  const radius = lowStim ? Math.min(base.radius, 16) : base.radius;

  return {
    ageMode,
    sensoryMode,
    screenSize,
    themeClass,

    touchTargetMin: base.touchTargetMin,
    primaryActionMin: base.primaryActionMin,
    fontScale: base.fontScale,
    maxFontSizeMultiplier: DYNAMIC_TYPE_MAX_MULTIPLIER,
    reduceTransparency,
    radius,
    spacing: spacingFn,

    colors,
    type: base.type,
    motion: {
      duration: BASE_MOTION.duration,
      spring: BASE_MOTION.spring,
      durationScale,
      loopsEnabled,
    },

    textFirst: base.textFirst,
    spokenLabelDefault: base.spokenLabelDefault,
    showLabels: base.showLabels,
    confetti,
    animationDurationScale: durationScale,
    haptics,
    soundscapeDefault,

    contentMaxWidth,
    columns,
  };
}
