/**
 * src/i18n/useLocale.ts — the React hooks that thread locale into screens (§4.2).
 *
 * `useLocale()` reads the household language from settings (defaults `en`).
 * `useCopy()` returns a `(key, params?) => string` bound to the active locale +
 * ambient ageMode, so screens don't thread `locale`/`ageMode` manually. Existing
 * `resolveContent(key, { ageMode })` call sites keep working (locale defaults en).
 */
import { useCallback } from "react";

import { useSettingsStore } from "../state/settingsStore";
import { useThemeInputs } from "../theme/ThemeProvider";
import { SOURCE_LOCALE } from "./catalog";
import { getMessage } from "./messages";
import type { Locale, MessageParams } from "./types";

/** The active household locale (`parentSettings.locale`), defaulting to `en`. */
export function useLocale(): Locale {
  return useSettingsStore((s) => s.parentSettings.locale ?? SOURCE_LOCALE);
}

/**
 * A convenience copy resolver bound to the active locale + ambient ageMode.
 * `copy("a11y.buddy.state", { name, mood })` → the resolved, interpolated string.
 */
export function useCopy(): (key: string, params?: MessageParams) => string {
  const locale = useLocale();
  const { ageMode } = useThemeInputs();
  return useCallback(
    (key: string, params?: MessageParams) => getMessage(key, { locale, ageMode, params }),
    [locale, ageMode],
  );
}

/**
 * Map a locale to a BCP-47 tag for TTS (`expo-speech` `language`) + date-fns.
 * Identity for now (English ships); a richer map lands with the first translation.
 */
export function localeToBcp47(locale: Locale): string {
  return locale;
}
