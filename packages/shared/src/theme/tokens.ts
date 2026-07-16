/**
 * theme/tokens.ts — [extracted v1 → @tiny-bubbles/shared, M1.1b] the design-system token contract + the three palettes.
 *
 * This is the SINGLE source of truth for theme *values* (doc 61 §2-§7). The
 * shape (`ThemeTokens`) is what every component reads via `useThemeTokens()`;
 * components NEVER hardcode hex/px and NEVER branch on `ageMode` (doc 66 §2).
 *
 * Pure module (no React/RN imports) so the resolvers + their unit tests can
 * import it freely.
 *
 * NativeWind note (doc 60 §7.4): the same palette hexes below are ALSO mirrored
 * as CSS variables in `global.css` (one class per palette) so className-driven
 * styling resolves the right colors. The two MUST be kept in sync; this file is
 * the canonical copy and `themeClass` names the matching CSS class.
 */
import type { AgeMode, SensoryMode } from "../domain/types";
import type { ScreenSize } from "./breakpoints";

// ---------------------------------------------------------------------------
// Color contract — every palette fills the SAME keys (doc 61 §2.2) so swapping
// a palette is free. Deliberately ABSENT: any child-facing error/danger/irate
// color (doc 61 §2.2). `gentleAlert` is parent-facing only.
// ---------------------------------------------------------------------------
export interface ThemeColors {
  canvas: string;
  canvasGradTop: string;
  canvasGradBot: string;
  surface: string;
  surfaceAlt: string;
  surfaceSunken: string;
  primary: string;
  primaryDeep: string;
  onPrimary: string;
  secondary: string;
  accent: string;
  grow: string;
  token: string;
  tokenGlow: string;
  success: string;
  successSurface: string;
  info: string;
  /** parent-facing soft amber ONLY — never to scold a child (doc 61 §2.2) */
  gentleAlert: string;
  text: string;
  textDim: string;
  onDark: string;
  border: string;
  separator: string;
  focusRing: string;
  /** modal / celebration backdrop — a soft tinted scrim, not opaque black */
  scrim: string;
  /** ordered confetti / bubble-burst hues (one hue only in Stillwater) */
  celebration: readonly string[];
}

export type HapticsMode = "rich" | "light" | "off";

/** NativeWind palette class names (must match the class sets in global.css). */
export type ThemeClass = "tb-reef" | "tb-tide" | "tb-tide-dark" | "tb-stillwater";

// ---------------------------------------------------------------------------
// Motion tokens (doc 61 §7.1). Plain numbers/objects (no Reanimated Easing) so
// this stays pure. `durationScale` is applied by the sensory/reduced-motion
// reducers; components multiply raw durations by it.
// ---------------------------------------------------------------------------
export interface MotionTokens {
  duration: {
    instant: number;
    quick: number;
    base: number;
    slow: number;
    celebrate: number;
  };
  spring: {
    bouncy: { damping: number; stiffness: number; mass: number };
    gentle: { damping: number; stiffness: number; mass: number };
  };
  /** multiplier applied to every duration: standard 1, lowStim 0.7, reduced 0 */
  durationScale: number;
  /** withRepeat loops + parallax (idle bob/breathe, drifting bubbles) on? */
  loopsEnabled: boolean;
}

export const BASE_MOTION = {
  duration: { instant: 120, quick: 240, base: 320, slow: 520, celebrate: 900 },
  spring: {
    bouncy: { damping: 9, stiffness: 140, mass: 0.8 },
    gentle: { damping: 16, stiffness: 120, mass: 0.9 },
  },
} as const;

// ---------------------------------------------------------------------------
// Type scale (doc 61 §3.2). Two physical scales; `young` is ~1 step larger and
// heavier with looser line height. `family` is a NativeWind/RN fontFamily key.
// ---------------------------------------------------------------------------
export interface TypeStyle {
  size: number;
  lineHeight: number;
  /** fontFamily key (see FONT_FAMILIES) */
  family: string;
  weight: "400" | "500" | "600" | "700";
  tabularNums?: boolean;
}

export interface TypeScale {
  display: TypeStyle;
  h1: TypeStyle;
  h2: TypeStyle;
  bodyLg: TypeStyle;
  body: TypeStyle;
  label: TypeStyle;
  caption: TypeStyle;
  token: TypeStyle;
}

/**
 * Resolved fontFamily keys. The OpenDyslexic key swaps the body face app-wide
 * when the accessibility toggle is on (doc 61 §3.1). Loaded at splash (M2).
 */
export const FONT_FAMILIES = {
  display: "Fredoka_600SemiBold",
  displayBold: "Fredoka_700Bold",
  heading: "Fredoka_600SemiBold",
  body: "Lexend_400Regular",
  bodyMedium: "Lexend_500Medium",
  bodySemiBold: "Lexend_600SemiBold",
  bodyBold: "Lexend_700Bold",
  dyslexic: "OpenDyslexic-Regular",
  dyslexicBold: "OpenDyslexic-Bold",
} as const;

/**
 * OS Dynamic-Type cap (accessibility-i18n §2.2, `61` §3.2). OS accessibility text
 * sizes enlarge copy up to this multiple of the design size, then stop — so text
 * grows for low-vision users but never clips the fixed-height kid buttons.
 */
export const DYNAMIC_TYPE_MAX_MULTIPLIER = 1.3;

// ---------------------------------------------------------------------------
// The resolved token set every component consumes.
// ---------------------------------------------------------------------------
export interface ThemeTokens {
  /** echoed for keys/debug ONLY — components must not branch on these */
  ageMode: AgeMode;
  sensoryMode: SensoryMode;
  screenSize: ScreenSize;
  /** NativeWind class to apply at the provider boundary (drives CSS-var palette) */
  themeClass: ThemeClass;

  // scale — young is bigger/chunkier
  /** absolute floor for any standalone tappable hit area (doc 61 §5.2) */
  touchTargetMin: number;
  /** the big primary "Done"/pop tap height (doc 61 §5.2) */
  primaryActionMin: number;
  fontScale: number;
  /**
   * OS Dynamic-Type cap (accessibility-i18n §2.2 / `61` §3.2 = 1.3). `AppText`/
   * `AppTextInput` pass this as `maxFontSizeMultiplier` so OS accessibility text
   * sizes grow copy but never overflow the fixed kid buttons (wrap-not-clip).
   */
  maxFontSizeMultiplier: number;
  /**
   * OS Reduce-Transparency in effect → flatten the scrim to a solid fill + drop
   * canvas gradients (accessibility-i18n §2.3). Composes with lowStim.
   */
  reduceTransparency: boolean;
  /** card corner radius (doc 61 §5.3) */
  radius: number;
  /** 4px-grid spacing helper (doc 61 §5.1) */
  spacing: (n: number) => number;

  colors: ThemeColors;
  type: TypeScale;
  motion: MotionTokens;

  // behavior flags consumed by components
  textFirst: boolean;
  spokenLabelDefault: boolean;
  showLabels: boolean;
  /** multi-hue confetti allowed? false in lowStim / reducedMotion (doc 61 §8.4) */
  confetti: boolean;
  /** see MotionTokens.durationScale — duplicated at top level for ergonomics */
  animationDurationScale: number;
  haptics: HapticsMode;
  soundscapeDefault: boolean;

  // responsive (doc 66 M2 additions)
  /** max content width in dp; centers + caps the focal column on big screens */
  contentMaxWidth: number;
  /** grid columns (young stays 1; older grids gain columns on tablet) */
  columns: number;
}

// ---------------------------------------------------------------------------
// PALETTES — the ACTUAL hex tokens from doc 61 §2.3-§2.5.
// ---------------------------------------------------------------------------

/** Palette A — "Reef" (young, standard). Bright, candy-aquatic, warm. */
export const REEF: ThemeColors = {
  canvas: "#EAF6FF",
  canvasGradTop: "#EAF6FF",
  canvasGradBot: "#FFF4FA",
  surface: "#FFFFFF",
  surfaceAlt: "#F1F8FF",
  surfaceSunken: "#E3EFF8",
  primary: "#1EA7E6",
  primaryDeep: "#0E6FA8",
  onPrimary: "#FFFFFF",
  secondary: "#FF7A66",
  accent: "#FFC53D",
  grow: "#2ED3A0",
  token: "#FFB020",
  tokenGlow: "#FFE08A",
  success: "#13A66B",
  successSurface: "#D9F5E8",
  info: "#4C8DD6",
  gentleAlert: "#E8941F",
  text: "#15293A",
  textDim: "#52677A",
  onDark: "#F4FBFF",
  border: "#D3E6F2",
  separator: "#E6F0F7",
  focusRing: "#0E6FA8",
  scrim: "rgba(10,32,52,0.72)",
  celebration: ["#FFC53D", "#FF7A66", "#1EA7E6", "#2ED3A0", "#A06BE6", "#FF9EC2"],
};

/** Palette B — "Tide" (older, standard, light). Cooler, cleaner, "designed." */
export const TIDE_LIGHT: ThemeColors = {
  canvas: "#F3F7FB",
  canvasGradTop: "#F3F7FB",
  canvasGradBot: "#ECF2F8",
  surface: "#FFFFFF",
  surfaceAlt: "#EDF3F8",
  surfaceSunken: "#E2EAF1",
  primary: "#1C84AD",
  primaryDeep: "#10617F",
  onPrimary: "#FFFFFF",
  secondary: "#5566E0",
  accent: "#17B3AD",
  grow: "#1FB37E",
  token: "#E2A92F",
  tokenGlow: "#F7DD9C",
  success: "#159469",
  successSurface: "#D5EFE5",
  info: "#3E7FC2",
  gentleAlert: "#D6881A",
  text: "#13202B",
  textDim: "#54677A",
  onDark: "#EAF2F8",
  border: "#D9E3EC",
  separator: "#E6EDF3",
  focusRing: "#1C84AD",
  scrim: "rgba(8,18,26,0.74)",
  celebration: ["#17B3AD", "#5566E0", "#1C84AD", "#1FB37E", "#E2A92F", "#7B5BE0"],
};

/** Palette B (dark) — "Tide" dark variant (older kids ask for dark mode). */
export const TIDE_DARK: ThemeColors = {
  canvas: "#0E1822",
  canvasGradTop: "#0E1822",
  canvasGradBot: "#101F2C",
  surface: "#17242F",
  surfaceAlt: "#1E2E3B",
  surfaceSunken: "#0B141C",
  primary: "#39A7CE",
  primaryDeep: "#7FCDE6",
  onPrimary: "#08131B",
  secondary: "#8A97F0",
  accent: "#3FD0C8",
  grow: "#3BD79B",
  token: "#F3C75A",
  tokenGlow: "#5A4B22",
  success: "#3BD79B",
  successSurface: "#13322A",
  info: "#6FA8E0",
  gentleAlert: "#F0A93A",
  text: "#EAF2F8",
  textDim: "#9FB2C2",
  onDark: "#EAF2F8",
  border: "#2A3B49",
  separator: "#21323F",
  focusRing: "#39A7CE",
  scrim: "rgba(2,7,11,0.80)",
  celebration: ["#3FD0C8", "#8A97F0", "#39A7CE", "#3BD79B", "#F3C75A", "#A992F0"],
};

/**
 * Palette C — "Stillwater" (low-stim / calm, overlays either age). Desaturated,
 * low-contrast-but-AA, warm-neutral. No gradients, single-hue celebration.
 */
export const STILLWATER: ThemeColors = {
  canvas: "#EEF0EC",
  canvasGradTop: "#EEF0EC",
  canvasGradBot: "#EEF0EC",
  surface: "#F7F8F5",
  surfaceAlt: "#E8EBE5",
  surfaceSunken: "#DFE3DC",
  primary: "#5E8398",
  primaryDeep: "#3F6173",
  onPrimary: "#FBFDFC",
  secondary: "#7E9A93",
  accent: "#C7B187",
  grow: "#6FA98C",
  token: "#BFA06A",
  tokenGlow: "#E3D5B6",
  success: "#5E977A",
  successSurface: "#DCE8E0",
  info: "#6C8AA0",
  gentleAlert: "#B68A4A",
  text: "#26323A",
  textDim: "#5C6A72",
  onDark: "#F2F4F0",
  border: "#D5DAD0",
  separator: "#E1E5DC",
  focusRing: "#3F6173",
  scrim: "rgba(38,50,58,0.55)",
  celebration: ["#6FA98C"], // single soft green — gentle ripple, no multi-hue
};

// ---------------------------------------------------------------------------
// Spacing (doc 61 §5.1) — a clean 4px grid.
// ---------------------------------------------------------------------------
export const SPACE = {
  xxxs: 2,
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
} as const;

/** spacing helper: multiples of the 4px grid (spacing(4) === 16). */
export const spacing = (n: number): number => n * 4;
