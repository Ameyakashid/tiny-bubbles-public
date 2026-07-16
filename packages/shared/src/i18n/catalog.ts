/**
 * i18n/catalog.ts — [extracted v1 → @tiny-bubbles/shared, M1.1b] the locale registry + fallback source (§4.1).
 *
 * English is the SOURCE_LOCALE and the only catalog shipped. Adding another
 * locale is a pure data drop: author `src/i18n/es.ts` as a `Partial<typeof EN>`
 * (missing keys fall back to English via `getMessage`) and register it here —
 * `AVAILABLE_LOCALES()` then surfaces it in the settings Language row with zero
 * component edits (§10.1). No runtime translation, no network (§7).
 */
import { EN } from "./en";
import type { Locale } from "./types";

/** Registered locale catalogs. Others are added as `Partial<typeof EN>` later. */
export const CATALOGS: Record<Locale, Partial<typeof EN>> = {
  en: EN,
  // es: ES,  // ← example future drop-in (human-translated), no code change
};

/** The complete fallback locale — every missing key resolves against this. */
export const SOURCE_LOCALE: Locale = "en";

/** The locales a user may pick (derived from the registry — auto-grows). */
export function AVAILABLE_LOCALES(): Locale[] {
  return Object.keys(CATALOGS);
}

/** Is `locale` a registered catalog? */
export function isLocaleAvailable(locale: string): boolean {
  return Object.prototype.hasOwnProperty.call(CATALOGS, locale);
}
