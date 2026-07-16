# Feature Spec — Accessibility Pass + i18n Scaffolding (`accessibility-i18n`)

Status: ready to build (additive, cross-cutting delta on the shipped app). Research tier:
production/clinic hardening (`01-current-state.md` §4.5) + the design-system a11y mandate
(`_build/plan/61-design-system.md` §0/§2.1/§12).
Premium/free: **100% FREE, never gated.** Accessibility + language are safety/equity, in the
same NEVER-GATED category as calm mode, sensory mode, and reminders
(`src/services/entitlements.ts` L12-15). No new gate key; nothing here is purchasable.

Hard rules preserved throughout (do not relitigate):
**ZERO AI** — no machine translation at runtime, no auto-captioning, no AI alt-text, no
"smart" reading-level rewriting. Copy is authored English strings; other locales are
human-translated JSON dropped into a catalog later. **ANTI-SHAME** — an assistive-tech user
never hears a failure/loss/streak-break state (there are none to announce); a screen-reader
announcement of a completion is warm, effort-framed, never corrective. **OFFLINE / on-device**
— the string catalog is bundled, locale is a local setting, nothing is fetched. **Age-adaptive
ONLY via `src/theme` resolvers + capability flags** — no component reads raw `ageMode`; the
i18n catalog is `ModeKeyed` so age variants keep flowing through `resolveContent`. **Expo Go /
web-safe** — all APIs (`AccessibilityInfo`, `useWindowDimensions().fontScale`, `expo-speech`
`language`) are Expo-Go + web-safe; the one optional new dep degrades to `Intl`.

Verify every milestone with: `npx tsc --noEmit`, `npm test`, `npx expo export --platform web`.

---

## 1. Overview + user value

This feature has **two tightly-related halves** that share one throughline — *externalizing every
human-facing string and every presentation decision so the app is usable by assistive tech and
translatable without touching a component*:

1. **Accessibility pass.** Make the shipped app conform to the design system's own a11y mandate
   (`61-design-system.md` §12): (a) **screen-reader labels + announcements** on every interactive
   and status element (VoiceOver / TalkBack, distinct from the existing `expo-speech` TTS
   channel); (b) **Dynamic Type** — respect and *bound* the OS font-scale so text grows for
   low-vision users without clipping; (c) **AA contrast** — a machine-checked guarantee the three
   palettes meet WCAG AA (`61` §2.1 targets: body ≥4.5:1, large/graphical ≥3:1); (d)
   **reduced-motion** — wire the per-child + global reduced-motion *settings* (today only the OS
   flag is honored) and add **reduce-transparency**; (e) **large touch targets** — enforce the
   already-defined `touchTargetMin`/`primaryActionMin` tokens on every tappable; (f)
   **triple-coding** — a resolver that guarantees every status carries icon + shape + label, never
   color alone (`61` §2.1, colorblind-safe blue↔gold).
2. **i18n scaffolding (ship English).** Externalize all kid- and parent-facing copy into a
   **bundled string catalog** keyed by `locale → key → {young, older}`, add a tiny
   interpolation/plural accessor, route the existing `resolveContent` COPY table + the reminder
   copy set through it, add a `locale` setting (defaults/ships `en`), and wire the language into
   TTS + date formatting. No translations are authored now — the point is that adding
   `src/i18n/es.ts` later is a pure data drop with **zero component edits**.

**Why (honest, cited):**
- **Market / community demand.** The category's users are neurodivergent kids *and* their
  (often ADHD, often reading-fatigued) parents; the research repeatedly names **non-readers,
  sensory sensitivity, and "control all sounds / calm the UI"** as table-stakes
  (`01-feature-matrix.md` #4, #8; `00-SYNTHESIS.md` §2.3; `30` §2.2, §3.5, §3.6). Screen-reader
  support and Dynamic Type extend the *same* "everything spoken / picture-first / calm" promise to
  low-vision and blind users and to kids who need very large text. i18n is a market-reach lever
  (the ADHD-kids market is not English-only) and, per the design system, a first-class sensory
  control ("OpenDyslexic toggle… control all sounds" — `61` §3.1/§9.3).
- **Verified science, stated modestly.** No new efficacy claim is made. Accessibility is a
  **usability/equity** requirement, not a treatment mechanism; the honest framing rules
  (`00-SYNTHESIS.md` §4.6) forbid over-claiming, and this feature adds no clinical copy. Dynamic
  Type / high-legibility fonts align with the reading-research rationale already recorded for
  Lexend + OpenDyslexic (`61` §3.1) without asserting a symptom effect.
- **Regulatory / trust.** A children's product carries FTC/COPPA scrutiny (`40` §11); shipping
  accessible, honestly-worded, on-device-only copy (no runtime translation calls, no network) is
  the low-risk posture the corpus endorses (`00-SYNTHESIS.md` §4.4).

**Grounding in the actual code (this is a DELTA, not a greenfield build):**
- The **age-keyed copy table already exists** — `src/theme/resolveContent.ts` `COPY` with the
  compile-time `ModeKeyed<T>` "both variants or it's a type error" guarantee. i18n **wraps** this,
  it does not replace it.
- The **reduced-motion OS hook exists** — `src/theme/useReducedMotion.ts` (reads
  `AccessibilityInfo.isReduceMotionEnabled`), consumed by `useThemeTokens`.
- The **motion/confetti/haptic reducers exist** — `resolveTokens.ts` already zeroes motion and
  kills confetti under `lowStim`/`reducedMotion`.
- The **touch-target + font-scale tokens exist** — `ThemeTokens.touchTargetMin`,
  `primaryActionMin`, `fontScale` (`src/theme/tokens.ts`).
- **88 accessibility props already exist** across 25 files (partial coverage) — this feature
  *completes and standardizes* them, adds announcements, and adds the missing gaps.
- The **reminder copy set + banned-tone gate exist** — `src/services/notifications.ts`
  (`REMINDER_TITLE`, `REMINDER_BODY_TEMPLATES`, `BANNED_REMINDER_PATTERNS`).

**Known gaps this feature closes (verified by audit):**
- `AccessibilityInfo.isScreenReaderEnabled` / `announceForAccessibility` are **never used** — a
  VoiceOver/TalkBack user gets **no announcement** when a token lands, a step is done, or the
  celebration fires (grep: zero occurrences).
- The per-child `settings.reducedMotion` and global `parentSettings.reducedMotionDefault` are
  **persisted but NOT wired into `useThemeTokens`** — only the OS flag currently reaches the
  resolver (`app/_layout.tsx` never feeds them in; `useThemeTokens` reads only `useReducedMotion()`).
  This is a real bug the pass fixes.
- OS **Dynamic Type is uncontrolled** — RN `<Text>` auto-scales (`allowFontScaling` defaults
  true) with **no `maxFontSizeMultiplier` cap anywhere**, so an iOS accessibility text size can
  overflow the fixed-height kid buttons. `61` §3.2 requires a **1.3× cap + wrap-not-clip**.
- **No contrast test exists** — the palettes were hand-tuned to AA but nothing guards a future
  edit from dropping below it.
- Copy is **English inline** in many screens; there is **no locale/catalog layer**.

---

## 2. UX behavior, screen-by-screen

There is **no new user-facing screen** for the accessibility half — it is a cross-cutting
behavioral upgrade to existing screens. The i18n half adds **one parent settings row** (Language)
and is otherwise invisible until a second locale is added.

### 2.1 Screen-reader (VoiceOver / TalkBack) behavior — every existing kid + parent screen

Two **distinct channels** must not be conflated:
- **TTS (`expo-speech`)** = the app *proactively* reading a label aloud for a non-reader who is
  looking at the screen (the "button speaks itself", `SpokenLabel`). Unchanged.
- **Screen reader (`AccessibilityInfo`)** = the *OS* narrates whatever the blind/low-vision user
  focuses, plus programmatic **announcements** for events that have no focus (a token flying to a
  counter). This is the new channel.

Rules the pass applies (mechanically, via shared helpers in §5):
- **Every interactive element** (`Pressable`/`TouchableOpacity`/`Switch`) carries
  `accessibilityRole` + a resolved `accessibilityLabel` (from the catalog, never a raw literal)
  + `accessibilityState` (`{ selected, disabled, checked, expanded }` where applicable) +
  `accessibilityHint` for non-obvious actions. Toggles use `role="switch"`; the parent gate
  keypad uses `role="keyboardkey"`; tabs use the router's built-in tab roles.
- **The core loop announces its rewards.** On step-done and token payout,
  `announce(resolveContent("a11y.stepDone"|"a11y.tokenEarned", …))` fires via
  `AccessibilityInfo.announceForAccessibility` so a screen-reader user hears
  *"Nice — that's done. You earned a bubble."* The **token counter** (`TokenMeter`) gets
  `accessibilityLiveRegion="polite"` (Android) + an `accessibilityValue` reflecting the new
  balance, so the running total is spoken on change without stealing focus. This is the
  screen-reader parallel of the sub-300ms multisensory burst — it must NOT block or delay the
  visual/haptic/token path (`useCelebration` stays imperative; the announce call is fire-and-forget
  after the token is credited).
- **The celebration overlay** (`CelebrationOverlay`) is announced once on mount
  (`a11y.celebrate.step` / `a11y.celebrate.routine`) and its purely decorative confetti/bubbles
  are hidden from the reader (`accessibilityElementsHidden` / `importantForAccessibility="no-hide-descendants"`),
  so the user hears one warm line, not 18 bubble nodes.
- **The Bubble Buddy** gets a single resolved `accessibilityLabel` describing name + current mood
  (`a11y.buddy.state` with `{name, mood}` params, e.g. *"Bloop looks happy"*), and its animated
  SVG internals are marked decorative. The mood string is descriptive only — and because
  `CompanionMood` has no negative member, a reader can never announce a sad/sick pet.
- **Focus order + grouping.** The one focal step card (young) is the first a11y element; the big
  Done button is reachable in ≤2 swipes. Decorative background bubbles / gradients are always
  hidden from the reader.
- **Modals** (`celebrate`, `peek`, `parental-gate`) set the a11y viewport so focus is trapped in
  the modal and the "grown-ups door" overlay is hidden (it already hides visually over modals).

### 2.2 Dynamic Type behavior — every text surface

- A **`maxFontSizeMultiplier` cap of 1.3×** (from `61` §3.2) is applied app-wide so OS accessibility
  text sizes enlarge copy but never overflow the fixed kid buttons. This is delivered by two shared
  primitives — **`components/ui/AppText.tsx`** and **`components/ui/AppTextInput.tsx`** — that read
  the token and set `allowFontScaling` + `maxFontSizeMultiplier`. `SpokenLabel` renders through
  `AppText`. High-traffic raw `<Text>` in kid-facing screens is migrated to `AppText`.
- The **design font-scale is unchanged** — `t.fontScale` (young 1.25 / older 1.0) stays the
  *design* multiplier baked into `fontSize`; the OS Dynamic Type scale is applied *on top* by RN's
  native Text scaling and **bounded** by the cap. The two compose; neither is removed.
- **Layouts wrap, never clip** (`61` §3.2): the pass adds `flexShrink`/`numberOfLines` guards and
  a **`useOSFontScale()`** hook (reads `useWindowDimensions().fontScale`, clamped to `[1, 1.3]`) so
  a screen can reflow (e.g. stack a horizontal row vertically) when the effective scale is large.
  This is opt-in per screen; the primary safety net is the cap + wrapping.

### 2.3 Reduced-motion + reduce-transparency behavior

- **Settings now actually take effect.** The pass wires the **effective reduced-motion** =
  `OS Reduce-Motion OR per-child settings.reducedMotion OR parentSettings.reducedMotionDefault`
  into the resolver (via a pure `resolveEffectiveReducedMotion(...)` helper mirroring the existing
  `resolveEffectiveSensoryMode`). Turning on "Reduced motion" in Settings (which today only
  persists) now zeroes motion, kills confetti, and clamps celebrations — end-to-end.
- **Reduce-transparency** (`AccessibilityInfo.isReduceTransparencyEnabled`, new
  `useReduceTransparency()` hook) folds into a new `reduceTransparency` token that **flattens the
  scrim to a solid fill and drops canvas gradients** (Stillwater already flat), so celebration
  backdrops and washes don't shimmer for sensitive users. Composes with `lowStim`.
- These are additive to the existing `lowStim` path; nothing about the calm palette changes.

### 2.4 Triple-coding (color is never the only signal)

- A pure **`resolveStatusPresentation(status)`** (and `resolveDaypartPresentation(daypart)`)
  returns `{ icon, shape, colorKey, labelKey }` so a done step is *check-bubble + success color +
  "Done"*, a to-do step is *outline bubble + neutral + "To do"*, and a skipped step is
  *soft dash + textDim + "Later"* — the blue↔gold, never red↔green rule (`61` §2.1). Components
  render all three channels from this resolver instead of switching on color inline. This makes
  the `61` §12.4 "triple-code everything" rule *enforceable and testable* rather than aspirational.

### 2.5 YOUNG vs OLDER differences (via resolvers / flags — never raw `ageMode`)

| Concern | `young` | `older` | Produced by |
|---|---|---|---|
| a11y label copy | warm, 1-3 words | short, respectful | `resolveContent` (`ModeKeyed`, i18n-backed) |
| announcement verbosity | mood + reward spoken warmly | terse ("Done. +1 bubble") | `a11y.*` catalog keys, both variants |
| Dynamic Type base | 1.25 design scale, still capped ×1.3 | 1.0 design scale, capped ×1.3 | `t.fontScale` + `maxFontSizeMultiplier` |
| auto-TTS default | on (pervasive) | off (on tap) | existing `spokenLabelDefault` token |

No component branches on age — the table is entirely resolver/flag output. Parent surfaces keep
using `ageModeLabel(...)` (`resolveContent.ts` L78) for display names.

### 2.6 Low-stim / calm variants

- `lowStim` / OS-Reduce-Motion already desaturate + kill confetti + shorten motion; the pass adds
  `reduceTransparency` (flat scrim) and ensures announcements stay identical (a11y is independent
  of stim level). Calm mode (non-gamified) has no tokens/confetti to announce; the step-done
  announcement still fires (it is not a "reward", just a state change) and stays warm.

### 2.7 Parent settings — the one visible addition (`app/(parent)/settings.tsx`)

A new **"Language"** row in a **"Language & display"** card (or appended to "Sound & motion"):
- A `Segmented`/picker bound to `parentSettings.locale`. With English-only shipped it shows a
  single **"English"** option (disabled/informational) + a note: *"More languages coming. Set your
  device language and Tiny Bubbles will follow when available."* When a second catalog is added,
  the picker lists the available locales automatically (derived from the catalog registry).
- **OpenDyslexic font activation (NOW OWNED by this pass — was an inert no-op).** The advertised FREE
  `openDyslexicFont` toggle currently does nothing because `src/theme/fonts.ts` is unwired
  (`01-current-state.md` §4.5 #17). This pass **wires the `fonts.ts` `fontFamily` plumbing**: register
  OpenDyslexic-Regular/Bold via `expo-font` and resolve the effective app font family from
  `parentSettings.openDyslexicFont` (falling back to Lexend when off), so `AppText`/`AppTextInput`
  (§CREATE 13/14) render in OpenDyslexic when the toggle is on. **The font binaries (`.otf`/`.ttf`)
  are an out-of-band orchestrator prerequisite** — a code-agent cannot author a font (same posture as
  the CC0 soundscape loops; roadmap §6 / production-readiness §2.9). **Buildable default:** if the
  binaries are NOT yet bundled, wire the plumbing but keep the toggle **hidden/disabled** in settings
  (never advertise a no-op control — production-readiness §2.9 owns the ship-gate assertion). When the
  binaries land, add them to `THIRD_PARTY_NOTICES.md` and the toggle activates. The pass may co-locate
  a **"Larger text follows your device"** informational note (Dynamic Type is automatic; no toggle
  needed).

---

## 3. Data-model additions (exact types + store + migration)

All additions are **OPTIONAL / additive** → **no `SCHEMA_VERSION` bump** (stays 1;
`MIGRATIONS` stays empty). `mergeWithDefaults` fills missing fields from the default factories;
existing persisted blobs remain valid.

### 3.1 Persisted (`ParentSettings`, `src/domain/types.ts` L587-609; default factory
`src/domain/constants.ts` `defaultParentSettings` L195)

```ts
export interface ParentSettings {
  // …existing fields unchanged…
  openDyslexicFont: boolean;                 // existing
  // --- ADDITIVE (this feature) ---
  /** App language. Ships 'en'; other codes select a translated catalog when present,
   *  else fall back to English at runtime. Optional so old blobs load; default 'en'. */
  locale?: string;                            // e.g. 'en' | 'es' | 'pt-BR'
  updatedAt: EpochMs;                         // existing
}
```

`defaultParentSettings` gains `locale: "en"`. `mergeWithDefaults` backfills `'en'` for any blob
saved before this field existed. `settings.tsx` reads `parentSettings.locale ?? "en"` defensively.

> No per-child locale — language is a household setting (matches the shipped `ParentSettings`
> granularity). Deferred per-child language is an open assumption (§10).

### 3.2 Resolver output — `ThemeTokens` contract additions (`src/theme/tokens.ts` `ThemeTokens`;
NOT persisted — computed by `resolveTokens`)

```ts
export interface ThemeTokens {
  // …existing…
  fontScale: number;                 // existing design multiplier (unchanged)
  // --- ADDITIVE ---
  /** OS Dynamic Type cap so text grows but never clips the kid buttons (61 §3.2 = 1.3). */
  maxFontSizeMultiplier: number;
  /** OS Reduce-Transparency in effect → flatten scrim + drop gradients. */
  reduceTransparency: boolean;
}
```

`resolveTokens` gains inputs `reduceTransparency?: boolean` (default false) and continues to take
`reducedMotion` (now the *effective* value from §2.3). `DYNAMIC_TYPE_MAX_MULTIPLIER = 1.3` is a
new exported constant in `tokens.ts`.

### 3.3 No new store, no new persisted key

The i18n catalog is **static bundled code** (`src/i18n/*`), not persisted state. Locale lives in
the existing `settings` slice (`settingsStore.parentSettings`), already partialized + key-scoped.
No `tb/*` key is added. The a11y announcement channel is stateless (fire-and-forget OS calls).

### 3.4 Migration note (for the record)

`SCHEMA_VERSION` **stays 1**. If a LATER change makes `locale` required, or persists additional
a11y preferences (e.g. a per-child high-contrast flag), add a `{ from: 1, to: 2, migrate }` entry
that backfills `locale: 'en'` and any new field with its safe default — the engine
(`migrations.ts` `runMigrations`) is ready and `mergeWithDefaults` already preserves unknown keys.
No anti-shame invariant is added or weakened (locale/a11y fields cannot represent loss/failure), so
`validateAndRepair` needs no new rule.

---

## 4. The i18n architecture (concrete, so a build-agent can implement it)

### 4.1 Catalog shape — `src/i18n/`

The catalog preserves the **age-keyed `ModeKeyed` structure** the app already relies on, so age
variants keep flowing and the compile-time "both variants" guarantee is retained for the source
locale.

```ts
// src/i18n/types.ts
export type Locale = string;                         // 'en' shipped; others added as data
// CANONICAL single definition — MUST match aging-up.md §3.4 and 02-architecture.md §1.7/§6-C2.
// `young`+`older` are compile-required; `preteen?` is optional and falls back to `older`.
// When M-A3 relocates this type here from resolveContent.ts, PRESERVE the optional `preteen?`
// member that M-A2 (aging-up) already added — do NOT drop it, or every preteen-keyed copy
// entry (buddy.tabTitle/stat.bond/greet, celebrate.levelup) becomes an excess-property tsc error.
export type ModeKeyed<T> = { young: T; older: T; preteen?: T };   // re-exported from theme

// The message keys are the UNION of the existing COPY keys + the new a11y/reminder keys.
export type MessageKey = /* generated from the EN catalog's keys (keyof typeof EN) */ string;

// A catalog entry is either a ModeKeyed pair (age-variant copy) or a plain string
// (age-invariant, e.g. a reminder title). Helpers normalize both.
export type CatalogEntry = ModeKeyed<string> | string;
export type Catalog = Record<string, CatalogEntry>;
```

```ts
// src/i18n/en.ts — THE SOURCE OF TRUTH. Must be COMPLETE.
// `satisfies Record<string, CatalogEntry>` + a `ModeKeyed` sub-constraint keeps the
// compile-time "both young+older" guarantee for every age-variant key (same trick as
// resolveContent today). This file MERGES the current COPY table + new keys.
export const EN = {
  // migrated verbatim from resolveContent.COPY:
  "celebrate.step": { young: "Yay — you did it!", older: "Nice — that's done." },
  // …all existing COPY keys…
  // NEW screen-reader announcement keys (both variants):
  "a11y.stepDone":    { young: "Yay — you did it!",   older: "Done." },
  "a11y.tokenEarned": { young: "A bubble for you!",   older: "Plus one bubble." },
  "a11y.celebrate.routine": { young: "You finished everything! 🫧", older: "Routine complete." },
  "a11y.buddy.state": { young: "{name} looks {mood}", older: "{name} is {mood}" },
  // NEW reminder copy (age-invariant plain strings), migrated from notifications.ts:
  "reminder.title": "Tiny Bubbles 🫧",
  "reminder.body.1": "Whenever you're ready: {label}. 🫧",
  // …templates 2-5…
} as const satisfies Record<string, CatalogEntry>;
```

```ts
// src/i18n/catalog.ts — locale registry + fallback chain.
import { EN } from "./en";
export const CATALOGS: Record<Locale, Partial<typeof EN>> = { en: EN /*, es: ES … */ };
export const SOURCE_LOCALE: Locale = "en";
export const AVAILABLE_LOCALES = (): Locale[] => Object.keys(CATALOGS);
```

```ts
// src/i18n/messages.ts — the accessor (pure, unit-testable).
import type { AgeMode } from "../domain/types";
// getMessage: resolve locale → key → (ageMode variant if ModeKeyed) → interpolate {params}.
// Fallback: requested locale entry → SOURCE_LOCALE ('en') → the key itself (never crash).
export function getMessage(
  key: string,
  opts: { locale?: Locale; ageMode?: AgeMode; params?: Record<string, string | number> },
): string { /* pick catalog, pick age branch, interpolate, plural-select */ }

// Minimal English plural + interpolation. NO ICU lib; a `{count}`-aware helper:
// formatCount(1) → "1 bubble", formatCount(3) → "3 bubbles". Translations that need
// richer plural rules are handled per-locale in the catalog entry when added.
export function formatCount(n: number, one: string, other: string): string { … }
```

### 4.2 Wiring `resolveContent` through the catalog (keep the API stable)

`src/theme/resolveContent.ts` keeps its exact function signatures (so **no call site changes**),
but its `COPY` object is **replaced by a thin delegate** to `getMessage`:

```ts
export function resolveContent(key: CopyKey, opts: { ageMode: AgeMode; locale?: Locale }): string {
  return getMessage(key, { ageMode: opts.ageMode, locale: opts.locale });
}
// buddy.artVariant overload unchanged (it's presentation, not copy).
```

`ModeKeyed<T>` is defined **once** (in `src/i18n/types.ts`) and re-exported from
`resolveContent.ts` for backward compat, so the `__typetests__/content-typetest.ts` proof still
holds against the `en` catalog. A **`useLocale()`** hook reads `parentSettings.locale ?? "en"`; a
convenience **`useCopy()`** hook returns `(key, params?) => getMessage(key, {locale, ageMode, params})`
so screens don't thread `locale`/`ageMode` manually. Components that already call
`resolveContent(key, { ageMode })` keep working (locale defaults to `en`).

### 4.3 Externalizing the reminder copy (`src/services/notifications.ts`)

`REMINDER_TITLE` + `REMINDER_BODY_TEMPLATES` become catalog reads (`reminder.title`,
`reminder.body.1..5`) via `getMessage` — **but the `BANNED_REMINDER_PATTERNS` gate +
`assertReminderCopyClean` dev-assert stay**, and are extended to run over the *resolved* catalog
strings for the active locale (so a future translation can never smuggle in a shame/nag tone). The
banned-tone patterns are the load-bearing tone control (`66 §1b.14`); i18n does not weaken them.

### 4.4 Device-locale detection (optional, English-only ships)

`useLocale()` returns `parentSettings.locale` when set; on first run it may seed from the device
locale **only if a matching catalog exists**, else `'en'`. Device locale comes from
`expo-localization` (§5 lib) or, if that dep is declined, `Intl.DateTimeFormat().resolvedOptions().locale`.
Since only `en` ships, detection is inert now but ready.

### 4.5 TTS + dates follow the locale

- `speak()` already accepts `language?: string` (`src/services/tts.ts` L41). `SpokenLabel` and the
  onboarding voice pass `language: bcp47(locale)` so TTS uses the right voice when a locale ships.
- Any **displayed** date (parent dashboard, future clinician report) formats via `date-fns` with
  the locale's `date-fns` locale object (English `enUS` now); domain *computation* stays
  tz-based and locale-independent (unchanged).

---

## 5. Files to CREATE and MODIFY (real paths under `tiny-bubbles/`)

### CREATE — i18n
1. `src/i18n/types.ts` — `Locale`, `ModeKeyed<T> = { young: T; older: T; preteen?: T }`
   (canonical single definition — **preserve the `preteen?` member M-A2 aging-up already added**;
   `young`+`older` compile-required, `preteen` falls back to `older`), `CatalogEntry`, `MessageKey`.
   When migrating `resolveContent.COPY` → `en.ts`, carry over any `preteen?` overrides already present
   (identity keys such as `buddy.tabTitle`/`buddy.stat.bond`/`buddy.greet`/`celebrate.levelup`).
2. `src/i18n/en.ts` — the English source catalog (migrated `COPY` keys + new `a11y.*` /
   `reminder.*` keys), `satisfies Record<string, CatalogEntry>` with the `ModeKeyed` sub-constraint.
3. `src/i18n/catalog.ts` — `CATALOGS`, `SOURCE_LOCALE`, `AVAILABLE_LOCALES()`.
4. `src/i18n/messages.ts` — `getMessage`, `formatCount`, `interpolate`, locale fallback chain (pure).
5. `src/i18n/useLocale.ts` — `useLocale()` (reads settings) + `useCopy()` convenience hook.
6. `src/i18n/index.ts` — barrel.

### CREATE — accessibility
7. `src/a11y/announce.ts` — `announce(msg)` wrapping `AccessibilityInfo.announceForAccessibility`
   (no-op/try-catch on web); `useScreenReader()` (`isScreenReaderEnabled` + change subscription).
8. `src/a11y/props.ts` — pure helpers that build a11y prop bundles:
   `buttonA11y(label, {hint, disabled})`, `toggleA11y(label, value)`, `selectedA11y(label, sel)`,
   `decorative()` (`{ accessibilityElementsHidden: true, importantForAccessibility: "no-hide-descendants" }`),
   `liveValue(n)`. Keeps call sites terse and consistent.
9. `src/theme/useReduceTransparency.ts` — OS Reduce-Transparency hook (mirror of `useReducedMotion`).
10. `src/theme/useOSFontScale.ts` — clamped OS font-scale for layout reflow decisions.
11. `src/theme/contrast.ts` — pure WCAG contrast: `relativeLuminance(hex)`, `contrastRatio(a,b)`,
    `meetsAA(fg, bg, { large })`.
12. `src/theme/resolveStatusPresentation.ts` — `resolveStatusPresentation(status)` +
    `resolveDaypartPresentation(daypart)` → `{ icon, shape, colorKey, labelKey }` (triple-coding).
13. `components/ui/AppText.tsx` — Text wrapper applying `allowFontScaling` +
    `maxFontSizeMultiplier` from tokens (the Dynamic Type cap).
14. `components/ui/AppTextInput.tsx` — the same cap for inputs (PIN, name, reward fields).

### CREATE — tests
15. `__tests__/i18n/messages.test.ts` — key resolution, age-variant selection, `{param}`
    interpolation, plural (`formatCount`), missing-locale → `en` fallback, missing-key → key echo.
16. `__tests__/i18n/catalog.test.ts` — every `MessageKey` used in code exists in `en`; every
    `ModeKeyed` entry has BOTH required variants (compile + runtime). EXTEND `content-typetest.ts`
    (aging-up's proof) to assert a `preteen`-ONLY entry is still a type error while `young`+`older`
    stay compile-required and `preteen` remains optional (the fallback-to-`older` contract).
17. `__tests__/theme/contrast.test.ts` — assert each palette (Reef/Tide light+dark/Stillwater)
    meets the `61` §2.1 pairings: `text`/`textDim`/`onDark` ≥4.5:1 on their surface; `onPrimary`
    on `primary` and `success`/`token` ≥3:1 (large/graphical). Fails the build if a token regresses.
18. `__tests__/theme/resolveStatusPresentation.test.ts` — every status/daypart yields
    icon+shape+label (never color-only), colorblind-safe pairing.
19. `__tests__/theme/resolveTokens.test.ts` (EXTEND) — `maxFontSizeMultiplier === 1.3`;
    `reduceTransparency` flows; effective reduced-motion still zeroes motion.
20. `__tests__/services/notifications.test.ts` (EXTEND) — catalog-sourced reminder copy still
    passes `isReminderCopyClean` for the active locale.

### MODIFY
1. `src/domain/types.ts` — `ParentSettings.locale?: string` (§3.1).
2. `src/domain/constants.ts` — `defaultParentSettings`: add `locale: "en"`.
3. `src/theme/tokens.ts` — `ThemeTokens.maxFontSizeMultiplier` + `reduceTransparency`;
   export `DYNAMIC_TYPE_MAX_MULTIPLIER = 1.3`.
4. `src/theme/resolveTokens.ts` — output the two new tokens; accept `reduceTransparency`; add
   `resolveEffectiveReducedMotion(childReduced, globalReducedDefault, osReduced)` pure helper.
5. `src/theme/useThemeTokens.ts` — fold in `useReduceTransparency()` and the **effective**
   reduced-motion (OS ∨ per-child ∨ global) via the new helper — the bug fix in §2.3.
6. `src/theme/resolveContent.ts` — delegate `COPY` to `getMessage`; keep signatures; re-export
   `ModeKeyed` from `src/i18n/types`. (The `COPY` literal object is removed; strings live in `en.ts`.)
7. `app/_layout.tsx` (`ThemedRoot`) — pass `parentSettings.reducedMotionDefault` +
   active child's `settings.reducedMotion` into the theme inputs so the effective reduced-motion
   reaches the resolver (today only `lowStim` is fed); no raw-mode branch (use the helper).
8. `src/services/notifications.ts` — source title/bodies from the catalog; keep + extend the
   banned-tone gate over resolved strings.
9. `src/services/tts.ts` + `components/ui/SpokenLabel.tsx` + `components/onboarding/useOnboardingVoice.ts`
   — thread `language` from `useLocale()`; `SpokenLabel` renders via `AppText`.
10. `components/ui/SpokenLabel.tsx` — fix `accessibilityRole` (`"button"` when it has an action,
    `"text"` otherwise); add `accessibilityHint` for the speak-on-tap affordance.
11. **Core-loop announcements** — `components/task/DoneButton.tsx`, `components/task/TaskRunner.tsx`,
    `hooks/useCelebration.ts` (via the celebration path), `components/rewards/TokenMeter.tsx`
    (live region + `accessibilityValue`), `components/celebration/CelebrationOverlay.tsx`
    (announce once; hide decorative descendants), `components/buddy/BubbleBuddy.tsx`
    (resolved mood label + decorative internals).
12. **Triple-coding adoption** — `components/task/StepCard.tsx`, `components/progress/*`,
    `components/kid/DaypartDonePanel.tsx`, `app/(kid)/peek.tsx` render status via
    `resolveStatusPresentation` (icon+shape+label), not color-only.
13. **Touch-target + a11y-prop sweep** — apply `buttonA11y`/`toggleA11y`/`selectedA11y` +
    enforce `minHeight ≥ t.touchTargetMin` / `t.primaryActionMin` + `hitSlop` across the
    interactive elements in: `components/parent/ui.tsx` (`Toggle`, `Segmented`, `TextButton`,
    `PrimaryButton`, `SettingRow`), `components/parent/pickers.tsx`, `components/rewards/RewardCard.tsx`,
    `components/rewards/CollectiblesGrid.tsx`, `app/(gate)/parental-gate.tsx`,
    `app/(kid)/_layout.tsx` (GrownUpsDoor), `app/(onboarding)/*`.
14. `app/(parent)/settings.tsx` — add the **Language** row (§2.7) bound to `parentSettings.locale`
    via `AVAILABLE_LOCALES()`; migrate its inline strings + `LICENSE_LINES` to catalog reads where
    kid/parent-facing (license lines may stay literal — they are proper nouns). **OpenDyslexic row:**
    keep it hidden/disabled unless the font binaries are bundled + `fonts.ts` wired (§2.7 / production-
    readiness §2.9) — never advertise a no-op toggle.
15. `src/theme/fonts.ts` — wire the `fontFamily` plumbing so `openDyslexicFont` takes effect when the
    OpenDyslexic binaries are registered via `expo-font` (fall back to Lexend when off / absent); the
    binaries themselves are an out-of-band prerequisite (§2.7). `AppText`/`AppTextInput` consume the
    resolved family.
16. `src/theme/index.ts` — export the new theme utilities; `src/i18n/index.ts` wired.
17. `README`/`THIRD_PARTY_NOTICES.md` — record `expo-localization` (if adopted) + note the catalog
    is the translation drop-in point (docs only; no code); add the OpenDyslexic font entry when its
    binaries land (§2.7).

> **Migration discipline for other screens:** the a11y-prop + `AppText` sweep is mechanical and
> can be done screen-by-screen; each screen stays green independently. Prioritize the **kid core
> loop** (runner, celebrate, tokens, buddy) first — that is where the announcement gap is
> user-blocking — then parent surfaces.

---

## 6. Reused prebuilt libraries

Prefer existing deps — the whole feature is buildable with **at most one small new MIT dep**.

- **Screen reader / reduced-motion / reduce-transparency / font scale:** React Native core
  `AccessibilityInfo`, `useWindowDimensions().fontScale`, `PixelRatio` — no dep. (`useReducedMotion`
  already uses `AccessibilityInfo`.)
- **TTS language:** `expo-speech` (already a dep; `language` param already supported).
- **Dates:** `date-fns` / `date-fns-tz` (already deps) for locale-aware *display* formatting.
- **State / settings:** `zustand` `settingsStore` (existing) for `locale`.
- **Copy resolution:** hand-rolled catalog — **deliberately NOT** a runtime i18n lib. `i18next`/
  `react-intl`/`lingui` don't model our **age-variant (`ModeKeyed`)** keys well and add bundle +
  ICU weight; a ~40-line `getMessage` + `formatCount` covers interpolation + English plural and
  keeps the compile-time both-variants guarantee. (Revisit a lib only if rich CLDR plural/gender is
  later needed for a specific locale.)
- **NEW MIT lib (one, optional):** **`expo-localization`** (MIT, part of Expo SDK 56, Expo-Go +
  web-safe) — device locale/region detection so the app can auto-select a catalog when translations
  land, and to source a `date-fns` locale. **Why acceptable:** first-party Expo module, zero native
  config, offline, no network. **If declined:** fall back to `Intl.DateTimeFormat().resolvedOptions().locale`
  (built-in, no dep) — the spec works either way; `useLocale` isolates the choice.

---

## 7. Anti-shame + no-AI rules that apply here

- **No runtime AI translation / captioning / alt-text.** All strings are human-authored; other
  locales are human-translated JSON added later. No LLM, no cloud translation call, no "auto
  reading-level" rewrite (that would be AI + would fight the age-keyed copy). The catalog is static
  bundled data.
- **Announcements are warm + effort-framed, never corrective.** The screen-reader channel can only
  announce states that exist — and there is **no failure/loss/streak-break state** to announce
  (`TaskStatus` has no `failed`; `CompanionMood` has no negative member; progress never hits a
  punishing 0). A skipped step announces neutrally ("Later"), never "you missed this".
- **The buddy can never be announced sad/sick.** `a11y.buddy.state` interpolates only positive
  moods (the union is positive-only), so an assistive-tech user gets the same never-punishing pet.
- **Reminder tone is preserved under translation.** The `BANNED_REMINDER_PATTERNS` gate runs over
  resolved catalog strings, so no locale can introduce nag/shame/loss-aversion/urgency copy
  (`66 §1b.14`).
- **Accessibility is free + never gated + never a paywall lever.** No a11y or language capability
  is in `FEATURE_GATES`; flipping premium off changes nothing about announcements, contrast,
  Dynamic Type, motion, or language (`entitlements.ts` NEVER-GATED note).
- **Age-adaptive via resolvers only.** i18n keeps the `ModeKeyed` age variants; `resolveContent`,
  `resolveStatusPresentation`, and the `a11y.*` catalog keys are the only age-aware layer. No
  component reads raw `ageMode`; no `ageMode` prop is introduced.
- **On-device only.** Locale is a local setting; nothing about language or a11y is uploaded (no
  network path is added). Consistent with the offline-first, opt-in-analytics posture.

---

## 8. Acceptance criteria + verify steps

**Acceptance criteria**
1. **Screen reader (core loop).** With VoiceOver/TalkBack on, completing a step announces a warm
   done+reward line and the token counter's new balance (live region); the celebration overlay
   announces once and its confetti is not focusable; the buddy focuses to a single "name is mood"
   label. The multisensory/haptic/token path timing is unchanged (announce is fire-and-forget).
2. **a11y props everywhere.** Every `Pressable`/toggle/keypad key in the modified files exposes
   `accessibilityRole` + resolved `accessibilityLabel` (+ `accessibilityState` where selectable);
   decorative visuals are hidden from the reader. (Verified by the sweep + grep for bare
   `<Pressable` without an a11y bundle in kid-facing screens.)
3. **Dynamic Type bounded.** OS accessibility text sizes enlarge copy but never overflow the
   fixed kid buttons; the effective multiplier is capped at 1.3× (`AppText`/`AppTextInput` apply
   `maxFontSizeMultiplier`); layouts wrap, never clip.
4. **Reduced-motion setting works end-to-end.** Toggling "Reduced motion" (per-child or global)
   in Settings — with OS Reduce-Motion OFF — zeroes motion, kills confetti, and clamps
   celebrations (previously only the OS flag did this). Verified via
   `resolveEffectiveReducedMotion(...)` unit test + `resolveTokens` output.
5. **Reduce-transparency.** With OS Reduce-Transparency on, the celebration scrim is a flat solid
   and canvas gradients drop (`reduceTransparency` token true).
6. **AA contrast guaranteed.** `contrast.test.ts` passes: every stated text pairing meets ≥4.5:1
   and every large/graphical pairing meets ≥3:1 across all four palettes; a token edit that
   regresses below target fails CI.
7. **Triple-coding.** No kid-facing status is conveyed by color alone — `resolveStatusPresentation`
   supplies icon+shape+label for done/todo/skipped and per-daypart; the pairing is blue↔gold,
   never red↔green (test-asserted).
8. **i18n scaffolding, English ships.** All migrated copy renders identically to today via the
   catalog; `getMessage` resolves age variants + `{param}` interpolation + English plural; a
   missing locale falls back to `en`; a missing key echoes the key (never crashes). The
   `content-typetest` still enforces both age variants for every age-keyed entry.
9. **Reminder tone preserved.** Catalog-sourced reminder title/bodies still pass
   `isReminderCopyClean` (banned-tone gate) for the active locale.
10. **Language row.** Settings shows a Language control bound to `parentSettings.locale`
    (single "English" entry now; auto-lists locales as catalogs are added). Default/back-compat
    locale is `en`; old blobs load without a schema bump.
11. **Free + no-AI + offline invariants hold** (§7): no gate key added, no network path added, no
    AI, no raw `ageMode` read in any component.

**Verify steps an agent runs**
- `npx tsc --noEmit` → 0 errors (catalog `satisfies` + `ModeKeyed` constraints hold; new tokens
  type through `resolveTokens`; `ParentSettings.locale` optional).
- `npm test` → all suites green including the new i18n/contrast/status-presentation suites and the
  extended token/notifications suites (target ≥ 345; never fewer than the current 335).
- `npx expo export --platform web` → succeeds (`AccessibilityInfo`/`announceForAccessibility`
  no-op safely on web; `useWindowDimensions().fontScale` is web-safe; catalog is pure data).
- `grep -rn "isScreenReaderEnabled\|announceForAccessibility" src app components` → now non-zero
  (announcements wired); `grep -rn "maxFontSizeMultiplier" components/ui/AppText.tsx` → present.
- `grep -rn "ageMode" components` → only resolver/`ageModeLabel` usage, no raw branch.
- Manual (Expo Go + a physical device, VoiceOver/TalkBack + large text + Reduce-Motion on): run a
  young and an older child through the core loop; confirm announcements, capped text, working
  reduced-motion setting, and the flat scrim under Reduce-Transparency.

---

## 9. Dependencies on other feature specs + premium/free classification

**Depends on (all already shipped in the repo):**
- **Theming / age engine** — `resolveContent`/`ModeKeyed`, `resolveTokens`, `useThemeTokens`,
  `ThemeProvider`, `useReducedMotion`. (Hard dependency — this feature extends them.)
- **Settings store** — `settingsStore.parentSettings` for `locale` + reduced-motion wiring.
- **Core loop** — `TaskRunner`/`DoneButton`/`useCelebration`/`TokenMeter`/`CelebrationOverlay`/
  `BubbleBuddy` are the announcement targets.
- **Reminders (M10)** — `notifications.ts` copy set + banned-tone gate for the i18n externalization.
- **TTS** — `services/tts.ts` (`language` param) + `SpokenLabel` + onboarding voice.

**This feature is FOUNDATIONAL for other specs (they should build on it, not around it):**
- **Every other feature spec** should route its kid/parent copy through the catalog (`getMessage`/
  `resolveContent`) and render text via `AppText`, and add a11y props via `src/a11y/props.ts`.
  Cross-ref the sibling specs: `mood-checkin` (its `mood.*` keys move into `en.ts`),
  `visual-timers`, `verify-undo`, `novelty-refresh`, `soundscapes`, `breathing-regulation`,
  `if-then-plans`, `multi-child`, `child-autonomy` — each adds its strings to the catalog and its
  status visuals through `resolveStatusPresentation`.
- **Local backup / restore** — must include `parentSettings.locale` in the export (it is part of
  the already-serialized `settings` slice; just ensure the serializer covers it).
- **Printable / shareable clinician report** — the report is a *display* surface: its copy comes
  from the catalog and its dates format via the locale's `date-fns` locale; it must stay
  non-diagnostic and, being potentially shared, benefits from the AA-contrast + Dynamic-Type work.

**Premium/free classification**
- **FREE — the entire feature, non-negotiable.** Accessibility and language are safety/equity, in
  the explicit NEVER-GATED set alongside ageMode, companionStyle, sensoryMode, reduced-motion,
  calm mode, and reminders (`entitlements.ts` L12-15). **No new `FEATURE_GATES` key is added.**
  Turning premium off (or trial-end) changes nothing about announcements, contrast, Dynamic Type,
  motion, triple-coding, or the app language.

---

## 10. Open assumptions

1. **English-only ships now.** The deliverable is the *scaffolding* + a complete `en` catalog +
   an accessible app. Adding `src/i18n/es.ts` (etc.) is a later, pure data drop with no component
   edits. No translation is authored here.
2. **Household locale, not per-child.** `locale` lives on `ParentSettings` (one language per
   device), matching the shipped settings granularity. Per-child language (e.g. a bilingual
   household) would add a `ChildSettings.locale?` overriding the parent default — spec separately.
3. **Seed-data spokenLabels stay literal English data for now.** The 18 task templates / rewards /
   cosmetics (`src/data/*`) carry inline `spokenLabel`/`text`. Making *those* translatable means
   giving each a `messageKey` and moving the strings into the catalog — a mechanical follow-up, not
   done now (the catalog structure already supports it). Flagged so translation isn't assumed
   complete on day one.
4. **Dynamic Type via RN native scaling + a 1.3× cap**, not a re-baked numeric token. RN `<Text>`
   applies the OS scale on top of the design `fontScale`, bounded by `maxFontSizeMultiplier`. If a
   future need requires a single computed effective scale (e.g. layout math), fold the clamped
   `useOSFontScale()` into `resolveTokens` and render with `allowFontScaling={false}` — the hook is
   already provided.
5. **AA, not AAA.** Targets follow `61` §2.1 (WCAG AA: 4.5:1 body / 3:1 large-graphical). A
   high-contrast (AAA) palette variant is out of scope; if wanted, add a `highContrast` sensory
   overlay and a fourth palette — additive, later.
6. **`expo-localization` is recommended but optional.** If the team declines the dep, `useLocale`
   falls back to `Intl`; English-only behavior is identical. The one-dep decision is isolated in
   `useLocale.ts`.
7. **Screen-reader announcement verbosity is tuned by the `a11y.*` catalog keys**, not code — if
   testing with real users shows the young announcements are too chatty, edit the catalog, not the
   components.
8. **OS Bold Text** (`AccessibilityInfo.isBoldTextEnabled`) is a nice-to-have not built here; if
   added later it maps to a font-weight bump in the token layer (a resolver change, no component
   edits). Noted so it isn't assumed present.
