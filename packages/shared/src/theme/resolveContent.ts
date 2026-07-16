/**
 * theme/resolveContent.ts — [extracted v1 → @tiny-bubbles/shared, M1.1b] mode-keyed copy / TTS strings + buddy art variant.
 *
 * Components never hardcode kid-facing copy; they resolve it here so reading
 * level, tone, and the spoken string all flow from the age axis (doc 65 §3.2).
 *
 * i18n DELEGATION (accessibility-i18n §4.2): the string TABLE now lives in the
 * bundled catalog (`src/i18n/en.ts`); this module keeps its EXACT signatures and
 * simply delegates to `getMessage`, so NO call site changes. `ModeKeyed<T>` is
 * defined ONCE in `src/i18n/types.ts` and re-exported here for backward compat
 * (02-architecture §1.7/§6-C2); `COPY` (the age-variant subset of the catalog) is
 * re-exported so `content-typetest` + `resolveContent.test.ts` still prove the
 * compile-time "both variants" guarantee against the `en` catalog.
 *
 * The buddy art variant is resolved from `companionStyle` (NOT ageMode), per the
 * no-fork rule (doc 66 §1b.7) — a cuddly-loving older kid still gets Bloop.
 *
 * Pure + unit-testable.
 */
import { resolveNeuroPreset } from "./resolveNeuroPreset";

import type { AgeMode, CompanionStyle, NeuroProfile } from "../domain/types";
import { COPY } from "../i18n/en";
import { getMessage } from "../i18n/messages";
import type { Locale, MessageParams } from "../i18n/types";

// NOTE (M1.1b barrel-ownership, 02-architecture §2.1): `ModeKeyed` + `COPY`
// are NOT re-exported here — their ONE canonical home is `i18n/types.ts` /
// `i18n/en.ts` (the shared barrel exports the home only, so `export *` never
// collides). The kid app's `src/theme/resolveContent.ts` shim restores the
// v1 backward-compat re-exports for existing kid imports.

/** A key of the age-variant copy table (excludes the plain reminder/language keys). */
export type CopyKey = keyof typeof COPY;

/** Resolved companion art-variant key consumed by <BubbleBuddy variant=...>. */
export type BuddyArtVariant = "bloop" | "orbit" | "nova";

// ---------------------------------------------------------------------------
// Parent-facing display name for an age mode (profile rows, preview tiles).
// Centralized here so NO parent screen branches on the raw ageMode string
// (doc 66 §2). Record<AgeMode,string> so ALL THREE bands are compiler-forced.
// ---------------------------------------------------------------------------
const AGE_MODE_LABEL: Record<AgeMode, string> = {
  young: "Younger",
  older: "Older",
  preteen: "Preteen",
};

/** Human-readable mode name for parent surfaces (e.g. "Younger" / "Older"). */
export function ageModeLabel(ageMode: AgeMode): string {
  return AGE_MODE_LABEL[ageMode];
}

// ---------------------------------------------------------------------------
// Buddy art variant — keyed on companionStyle, NOT ageMode (doc 66 §1b.7).
// ---------------------------------------------------------------------------
const BUDDY_ART: Record<CompanionStyle, BuddyArtVariant> = {
  cuddly: "bloop", // round, big-eyed, cheeks
  cool: "orbit", // sleeker, "energy orb," no cheeks
  avatar: "nova", // sleekest, smallest calm eyes, no cheeks, an identity ring
};

// ---------------------------------------------------------------------------
// resolveContent — overloaded so the buddy art-variant key resolves from
// `companionStyle` while every copy key resolves (via the i18n catalog) from
// `ageMode` (+ optional locale / interpolation params).
// ---------------------------------------------------------------------------
export function resolveContent(
  key: "buddy.artVariant",
  opts: { companionStyle: CompanionStyle },
): BuddyArtVariant;
export function resolveContent(
  key: CopyKey,
  opts: {
    ageMode: AgeMode;
    /** w8 (M1.1): selects an authored `literal?` variant via the neuro preset
     *  (`literalLanguage`); absent ⇒ neutral ⇒ v1 copy unchanged. */
    neuroProfile?: NeuroProfile;
    locale?: Locale;
    params?: MessageParams;
  },
): string;
export function resolveContent(
  key: CopyKey | "buddy.artVariant",
  opts: {
    ageMode?: AgeMode;
    neuroProfile?: NeuroProfile;
    companionStyle?: CompanionStyle;
    locale?: Locale;
    params?: MessageParams;
  },
): string | BuddyArtVariant {
  if (key === "buddy.artVariant") {
    return BUDDY_ART[opts.companionStyle ?? "cuddly"];
  }
  // Delegate to the catalog accessor; it applies the same preteen→older fallback
  // and default-young branch this function used to, plus locale + interpolation.
  // w8: the literal-language flag comes from the PRESET (never a raw-axis
  // branch); an entry without a `literal` variant falls back to the age copy.
  return getMessage(key, {
    ageMode: opts.ageMode,
    locale: opts.locale,
    params: opts.params,
    literal: resolveNeuroPreset(opts.neuroProfile).literalLanguage,
  });
}
