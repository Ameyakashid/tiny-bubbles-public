/**
 * src/i18n — public surface of the string catalog + accessor (accessibility-i18n).
 *
 * The catalog is bundled static data (no persistence, no network). Import the
 * accessor (`getMessage`/`useCopy`) or the registry here; `resolveContent`
 * delegates to `getMessage` so existing call sites keep their exact signatures.
 */
export * from "./types";
export { EN, COPY, PLAIN, type EnKey } from "./en";
export { CATALOGS, SOURCE_LOCALE, AVAILABLE_LOCALES, isLocaleAvailable } from "./catalog";
export { getMessage, formatCount, interpolate, type GetMessageOptions } from "./messages";
export { useLocale, useCopy, localeToBcp47 } from "./useLocale";
