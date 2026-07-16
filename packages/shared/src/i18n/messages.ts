/**
 * i18n/messages.ts — [extracted v1 → @tiny-bubbles/shared, M1.1b] the pure, unit-testable message accessor (§4.1).
 *
 * `getMessage` resolves: locale → key → (age variant if the entry is ModeKeyed)
 * → `{param}` interpolation. Fallback chain never crashes:
 *   requested-locale entry → SOURCE_LOCALE ('en') entry → the key itself (echo).
 *
 * Deliberately NOT a runtime i18n lib (i18next/react-intl): those don't model our
 * age-variant (`ModeKeyed`) keys and add ICU + bundle weight (§6). A ~40-line
 * accessor covers interpolation + English plural and keeps the compile-time
 * both-variants guarantee. No React/RN import — safe from tests + the boot path.
 */
import type { AgeMode } from "../domain/types";
import { CATALOGS, SOURCE_LOCALE } from "./catalog";
import type { CatalogEntry, Locale, MessageParams, ModeKeyed } from "./types";

/** Type guard: an entry carrying age variants vs a plain string. */
function isModeKeyed(entry: CatalogEntry): entry is ModeKeyed<string> {
  return typeof entry === "object" && entry !== null && "young" in entry;
}

/**
 * Replace every `{name}` token in `template` with the matching param. Unknown
 * tokens are left intact (never throws / never drops surrounding copy).
 */
export function interpolate(template: string, params?: MessageParams): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (whole, name: string) => {
    const v = params[name];
    return v === undefined || v === null ? whole : String(v);
  });
}

/**
 * Minimal English plural: `formatCount(1, "bubble", "bubbles") → "1 bubble"`,
 * `formatCount(3, …) → "3 bubbles"`. Locales needing richer CLDR plural rules
 * handle it per-entry when their catalog is added (§4.1).
 */
export function formatCount(n: number, one: string, other: string): string {
  return `${n} ${Math.abs(n) === 1 ? one : other}`;
}

export interface GetMessageOptions {
  locale?: Locale;
  ageMode?: AgeMode;
  params?: MessageParams;
  /**
   * w8 (M1.1): select the entry's optional `literal` variant (no idioms /
   * sarcasm) when true — set from the neuro preset's `literalLanguage`, never
   * from a raw `neuroProfile` read. Falls back to the age variant when the
   * entry has no literal branch (nothing breaks; §3.4).
   */
  literal?: boolean;
}

/**
 * Resolve a catalog message to a final string. Age variants fall back
 * `preteen → older` (never `young`) so an omitted identity override keeps the
 * respectful voice (aging-up §3.4). A missing locale falls back to English; a
 * missing key echoes the key so a screen never renders blank or crashes (§8.8).
 */
export function getMessage(key: string, opts: GetMessageOptions = {}): string {
  const { locale = SOURCE_LOCALE, ageMode, params, literal } = opts;

  const requested = CATALOGS[locale] as Record<string, CatalogEntry> | undefined;
  const source = CATALOGS[SOURCE_LOCALE] as Record<string, CatalogEntry>;
  const entry: CatalogEntry | undefined =
    (requested && requested[key]) ?? source[key];

  if (entry === undefined) return key; // missing key → echo (never crash)

  let text: string;
  if (isModeKeyed(entry)) {
    // w8: literal variant wins when requested AND authored; otherwise the age
    // branch — preteen → older fallback; default branch is young (matches
    // resolveContent).
    text =
      (literal ? entry.literal : undefined) ??
      entry[ageMode ?? "young"] ??
      entry.older;
  } else {
    text = entry;
  }
  return interpolate(text, params);
}
