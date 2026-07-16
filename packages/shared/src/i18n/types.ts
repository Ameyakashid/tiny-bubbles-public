/**
 * i18n/types.ts — [extracted v1 → @tiny-bubbles/shared, M1.1b] the canonical i18n type surface (accessibility-i18n §4.1).
 *
 * This file is the SINGLE home of `ModeKeyed<T>` (the age-variant copy shape the
 * whole app relies on). `src/theme/resolveContent.ts` re-exports it for backward
 * compat, so every existing `import { ModeKeyed } from "../theme/resolveContent"`
 * keeps working while the definition lives here (02-architecture §1.7 / §6-C2).
 *
 * Pure types + a couple of pure string helpers only — no React/RN, so the catalog
 * and its unit tests import freely.
 */

/** BCP-47-ish locale code. `'en'` ships; others are added later as pure data. */
export type Locale = string;

/**
 * A value that MUST carry both `young` and `older` variants at compile time
 * (doc 65 §3.2). `preteen` is an OPTIONAL identity override that FALLS BACK to
 * the respectful `older` copy when omitted (aging-up §3.4) — so every copy key
 * keeps its voice for the ~10-12 band and only identity-flavored keys diverge.
 *
 * w8 (M1.1): `literal?` is an OPTIONAL no-idiom/no-sarcasm variant selected
 * when the resolved neuro preset sets `literalLanguage` (autism/both). It
 * FALLS BACK to the age variant when unauthored, so nothing breaks — literal
 * variants are filled in per-feature over time (02-architecture §3.4).
 *
 * CANONICAL single definition (must match aging-up.md §3.4 + 02-architecture
 * §1.7/§6-C2). Do NOT drop the `preteen?` member: dropping it turns every
 * preteen-keyed entry (buddy.tabTitle/stat.bond/greet, celebrate.levelup) into an
 * excess-property tsc error.
 */
export type ModeKeyed<T> = { young: T; older: T; preteen?: T; literal?: T };

/**
 * A catalog entry is either an age-variant `ModeKeyed` pair (kid/parent copy) or a
 * plain string (age-invariant copy, e.g. a reminder title). The accessor
 * normalizes both.
 */
export type CatalogEntry = ModeKeyed<string> | string;

/** A locale catalog: message key → entry. */
export type Catalog = Record<string, CatalogEntry>;

/** Interpolation params (both numbers + strings are accepted, coerced to string). */
export type MessageParams = Record<string, string | number>;
