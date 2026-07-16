/**
 * src/theme/fonts.ts — the app font map loaded at splash (doc 61 §3.1, doc 66 M2).
 *
 * Fredoka (display/headings/young UI) + Lexend (body/labels/numerals) ship via
 * @expo-google-fonts (OFL-1.1). OpenDyslexic (the a11y body-face toggle, OFL-1.1)
 * is LOCALLY BUNDLED — its .otf binaries are not in the repo yet and we must NOT
 * fabricate them. Do NOT `require()` a missing font file: Metro resolves requires
 * statically and a missing path breaks bundling (and `expo export`).
 *
 * When the real `assets/fonts/OpenDyslexic-Regular.otf` + `-Bold.otf` land
 * (recorded in THIRD_PARTY_NOTICES §5 with OFL text + Reserved Font Name),
 * uncomment the two lines below. Until then the `dyslexic` fontFamily keys in
 * tokens.ts/tailwind degrade to the platform default — acceptable for M2.
 */
import {
  Fredoka_400Regular,
  Fredoka_500Medium,
  Fredoka_600SemiBold,
  Fredoka_700Bold,
} from "@expo-google-fonts/fredoka";
import {
  Lexend_400Regular,
  Lexend_500Medium,
  Lexend_600SemiBold,
  Lexend_700Bold,
} from "@expo-google-fonts/lexend";

export const APP_FONTS = {
  Fredoka_400Regular,
  Fredoka_500Medium,
  Fredoka_600SemiBold,
  Fredoka_700Bold,
  Lexend_400Regular,
  Lexend_500Medium,
  Lexend_600SemiBold,
  Lexend_700Bold,
  // "OpenDyslexic-Regular": require("../../assets/fonts/OpenDyslexic-Regular.otf"),
  // "OpenDyslexic-Bold": require("../../assets/fonts/OpenDyslexic-Bold.otf"),
} as const;

// ---------------------------------------------------------------------------
// OpenDyslexic activation plumbing (accessibility-i18n §2.7 — NOW OWNED by the
// a11y pass; was an inert no-op). `AppText`/`AppTextInput` resolve the effective
// body face from `parentSettings.openDyslexicFont` via `resolveFontFamily`.
//
// The binaries are an OUT-OF-BAND orchestrator prerequisite (a code-agent cannot
// author a font). Until they are bundled + registered above, this flag stays
// false, `resolveFontFamily` is a NO-OP (returns the input face), and the settings
// toggle is kept HIDDEN/disabled (never advertise a no-op control — §2.7,
// production-readiness §2.9 owns the ship-gate assertion). When
// `assets/fonts/OpenDyslexic-{Regular,Bold}.otf` land: uncomment the two
// `require`s above, flip this to `true`, and add the OFL entry to
// THIRD_PARTY_NOTICES §5 — the toggle then activates with zero further edits.
// ---------------------------------------------------------------------------
export const OPEN_DYSLEXIC_BUNDLED = false;

const DYSLEXIC_REGULAR = "OpenDyslexic-Regular";
const DYSLEXIC_BOLD = "OpenDyslexic-Bold";

/** True iff the toggle can do anything (binaries bundled). Gates the settings row. */
export function isOpenDyslexicAvailable(): boolean {
  return OPEN_DYSLEXIC_BUNDLED;
}

/**
 * Resolve the effective font family for a rendered text style. When the
 * OpenDyslexic toggle is ON *and* the binaries are bundled, the Lexend BODY faces
 * swap to OpenDyslexic (Regular/Bold); the Fredoka display/heading faces stay
 * (they carry the brand voice, `61` §3.1). Otherwise the input family is returned
 * unchanged — so this is a safe no-op today.
 */
export function resolveFontFamily(family: string | undefined, openDyslexicFont: boolean): string | undefined {
  if (!family || !openDyslexicFont || !OPEN_DYSLEXIC_BUNDLED) return family;
  if (family.startsWith("Lexend")) {
    return /700|Bold/.test(family) ? DYSLEXIC_BOLD : DYSLEXIC_REGULAR;
  }
  return family;
}
