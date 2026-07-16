# Tiny Bubbles — MASTER IMPLEMENTATION PLAN (FINAL)

**Plan doc 66 · The single source of truth for building the MVP.**
*Compiled 2026-06-28 by the lead architect; finalized 2026-06-28 after the five-lens critique (technical feasibility, anti-shame/child-safety ethics, license compliance, completeness/coverage, age-adaptive coverage). Synthesizes plan docs 60 (architecture), 61 (design system), 62 (data model), 63 (feature specs), 64 (assembly plan), 65 (age-adaptive) + research `00-SYNTHESIS.md` + `01-feature-matrix.md`.*

**Authority:** This document is authoritative. Where it conflicts with docs 60–65, **this doc wins** — §1b below lists the canonical reconciliations (single enums, single field names, single onboarding flow) that supersede the individual docs. The individual docs remain the detailed domain spec for everything not overridden here. The deferred backlog (`67-build-backlog.md`) is the checkbox companion; the changelog (`68-plan-changelog.md`) records what the critique changed.

This plan takes us from **empty folder → a running, polished, testable MVP** as an ordered set of **independently-buildable milestones**, each ending at a checkpoint where the app still launches and runs.

---

## 0. Locked product decisions (constraints, not relitigated)

- **Platform:** React Native + Expo SDK 54. One codebase: iOS + Android, **phones + tablets**. Offline-first, no account by default.
- **Product:** "Tiny Bubbles" — a polished ADHD app FOR KIDS, age-adaptive ~4–12 via a parent-set per-child `ageMode` (`young` ~4–7, `older` ~8–12). Age-adaptive is a first-class architectural concern.
- **Core loop:** parent assigns small templated tasks (2–3 taps) → child runs a one-step-at-a-time routine → each "done" tap fires an IMMEDIATE multisensory celebration + a token → tokens nurture a NEVER-PUNISHING companion and redeem for caregiver-set real-world rewards. Reinforce densely first, then thin.
- **HARD rules:** NO shame/streak-loss/loss-aversion; NO dying/guilt-tripping pet; NO nagging/notification floods; NO dark-pattern paywalls; NO over-claiming clinical treatment. Forgiving/cumulative progress only. Calm canvas, celebratory moments. Curated autonomy (3–6 options). Everything spoken aloud. A calm/non-gamified path. AI OFF by default; no surveillance pipelines.
- **Monetization (MVP):** full app + a DESIGNED free/premium paywall and gating, but the purchase is **stubbed/mocked** (no real processor).
- **Donors:** `lockin` (base/primary **code** donor, MIT, SDK 54) is the **only repo any code is grafted from**. `habit-tracker-app`, `tether`, `momentum` are **REFERENCE-ONLY** (MIT logic/patterns we re-author against our own stack — see §1b.2). `adhd-india` (no license) and `adhd-focus-mate` (no LICENSE file) are **REFERENCE-ONLY, never ship a line**. `lockin`'s shame mechanics + rigid one-immutable-goal-per-year model MUST be removed/retoned before use.

---

## 1. Reconciled architectural decisions (where the docs disagreed)

| Decision | Resolution | Rationale |
|---|---|---|
| **Base-repo strategy** | **Fresh `create-expo-app` (SDK 54) shell + selective retone-on-graft of `lockin` ONLY** (doc 60 Option B). | The thing we must delete (shame) is `lockin`'s *core mechanic*. A clean shell whose IA is correct from line one is lower-risk than scrubbing the tree. |
| **Donor code vs reference** | **`lockin` = the only code-graft donor. `tether`/`momentum`/`habit-tracker-app` = REFERENCE-ONLY** (logic + patterns re-authored against Zustand/MMKV/expo-router/NativeWind). | Verified: tether is Electron + `fs` + `tsyringe` + React-DOM; momentum is Prisma/Postgres server jobs + Vite/React-DOM; habit-tracker is MobX-State-Tree + React-Navigation + Ignite on SDK 50/RN 0.73/Reanimated 3. **None port as RN code** — they are net-new builds, sized accordingly (M2/M4/M8/M9 are *builds*, not grafts). |
| **State** | **Zustand** stores + `persist` middleware (doc 60 §5). Domain logic stays pure in `src/domain` (RN-free, unit-testable). | Small, hook-first, trivially persistable + testable. **Net-new infra** (no donor provides it). |
| **Storage** | **MMKV** behind a `storage` port, versioned migration-aware persistence; AsyncStorage as compat/import + web fallback (doc 60 §6). | Sync, fast hot-path token reads. **Forces a dev client** — accepted from day one. **Net-new infra.** |
| **Audio** | **`expo-audio`** (NOT `expo-av`). `expo-av` is deprecated in SDK 54 and **removed in SDK 55**. See §1b.1 for the imperative cue-registry design that preserves the sub-300ms `useCelebration` timing contract despite `expo-audio` being hook-based. | Build on a library that survives one SDK forward; keep an imperative `playCue()` facade. |
| **Reminders / notifications** | **`expo-notifications` ONLY. `@notifee/react-native` is DROPPED entirely.** | Verified: lockin declares Notifee but never imports it; our only reminders feature uses `expo-notifications`. Notifee has no first-party Expo config plugin and double-delivers when paired with `expo-notifications`. The dev-client requirement is already forced by MMKV, so Notifee's justification is moot. |
| **Age axes** | Two orthogonal axes — `ageMode` (`young`/`older`) × **`sensoryMode` (`standard`/`lowStim`)** — plus a reduced-motion flag, resolved into one token set + capability flags. **`sensoryMode` is the canonical name** (doc 60's `stimLevel`/`low` is retired). `sensoryMode` is a **per-child field** (added to `ChildSettings` — see §1b.5). | One resolver, no inline branching; calm path composes with both ages and is forced by OS Reduce-Motion. |
| **Age decoupling** | The two highest-churn axes are **independently overridable on top of the `ageMode` default**: `companionStyle` (`cuddly`/`cool`) and `textFirst` (boolean). See §1b.6. | ADHD has high reading-delay comorbidity; a fluent-maturity non-reader (e.g. a 9-yo) must get picture/TTS-first WITHOUT the babyish companion. Decoupling kills the age cliff the binary bundle would re-create. |
| **Dev runtime** | **Dev client from day one** (`expo run:ios`/`run:android`); web (AsyncStorage shim) is **iteration-only, a strict subset** (see §1b.10), never a ship target. | MMKV is a custom native module. |

---

## 1b. Canonical reconciliations (AUTHORITATIVE — supersede docs 60–65)

These fix the cross-doc contradictions the critique found. Each is the single source of truth; the named doc sections are overridden.

### 1b.1 Audio: `expo-audio`, imperative cue registry (supersedes doc 60 §2/§8, doc 61 §9, all `expo-av` references)
- `src/services/sound.ts` pre-instantiates one `AudioPlayer` per named cue **at app start** (after hydration, in a `useEffect` in the root layout) into a module-level ref-backed **cue registry**. `useAudioPlayer` (the hook) is used **only** in that one boot hook to create the players; it is **never** called per-cue.
- The imperative facade is `playCue(cueId)` = `player.seekTo(0)` then `player.play()` on the pre-created player. `useCelebration.ts` (M7) and every other caller use `playCue()` synchronously — preserving the M7/M13 imperative API and the sub-300ms multisensory window.
- Audio session: configure mix-not-hijack via `expo-audio`'s `setAudioModeAsync` (`shouldPlayInBackground:false`, iOS `interruptionMode:'mixWithOthers'`, Android `shouldRouteThroughEarpiece:false`, ducking). Duck-not-stop is verified on a real device in M13.
- **Required `app.json` native config** (added in M0): the `expo-audio` config plugin (if needed for the session category) and iOS `infoPlist.UIBackgroundModes` only if background audio is ever required (it is NOT for MVP — leave out, document the decision).

### 1b.2 Donor status (supersedes the "Key source files to lift" framing in docs 60/62/63/64 for the three reference donors)
- **Code may be grafted ONLY from `lockin`.** Every other donor reference in this plan and docs 60–65 means **read the logic/pattern and re-author it** against our stack. The "PORT" verb for tether/momentum/habit-tracker means "re-implement from the reference," not "copy the file."
- A **per-file provenance manifest** (`PROVENANCE.md`) records, for each grafted/authored source file, its origin (`lockin:<path>` | `reference:<repo>:<path>` | `original`) and a reviewer sign-off that no code came from a non-approved source. Enforced in M15 (see §1b.9).

### 1b.3 Canonical `CelebrationLevel` enum + precedence resolver (supersedes doc 60 §7.2, doc 62 §4/§8, doc 65 §3.3)
- **ONE enum everywhere:** `type CelebrationLevel = 'full' | 'medium' | 'gentle' | 'calm'`. Delete `'max'|'satisfying'` (doc 65) and the 2-value `'full'|'gentle'` (doc 60). `ChildSettings.celebrationIntensity` and the capability flag both use this enum.
- **Celebration magnitude is DECOUPLED from reinforcement phase** (this is also anti-shame fix #11). The resolver is `resolveCelebration({ ageMode, salience, sensoryMode, reducedMotion, calmMode, quietHours })`:
  1. **Salience sets the size:** a routine-complete/level-up/new-collectible is `full`; a single step is `medium` (older) / `full` (young, per the age ceiling). Salience is the ONLY axis that can raise magnitude. An occasional deterministic **bonus** moment may step magnitude UP (never down).
  2. **`ageMode` sets the per-mode ceiling:** `young` ceiling = `full`, `older` ceiling = `medium` for steps (routine-complete may reach `full` in both).
  3. **`sensoryMode==='lowStim'` / `reducedMotion` / `calmMode` / `quietHours` CLAMP DOWN** to `gentle` (or `calm` for calmMode).
- **Reinforcement phase NEVER reduces celebration.** Phase thins only the **bonus-token cadence** (§1b.4), which is invisible to the child. The base token and a salience-appropriate celebration fire on every completion, forever. The single resolver lives in M2 and is consumed by M7/M13.

### 1b.4 `surprise_bonus` is deterministic, never random (supersedes doc 61 §8.3, doc 62 §6/§8 copy)
- The bonus token is a **pure function of completion count** via the fixed every-N cadence in `computeReinforcement` (doc 62 §8). `TokenReason` keeps `surprise_bonus` **only if** it is audit-logged as `bonusEveryN`-derived; otherwise rename to `cadence_bonus`. **No `Math.random()` in any payout path, ever.**
- Copy retone: "occasionally drops to keep it fresh" → "a little extra every so often" framed as a **predictable** treat, never "surprise/luck." A unit test asserts bonus timing is a pure function of completion count; "no randomized payout schedule" is in the M15 grep/test gate.

### 1b.5 `sensoryMode` is a per-child persisted field (supersedes doc 62 §4, doc 60 §7)
- Add to `ChildSettings`: `sensoryMode: 'standard' | 'lowStim'` (default `standard`). This is the resolver's second axis and was previously unpersisted.
- **Precedence:** per-child `sensoryMode==='lowStim'` OR global `ParentSettings.lowStimTheme` OR OS reduced-motion → resolves to the Stillwater/low-stim token set + clamps celebration to `gentle`. `calmMode` (separate, doc 60 §7.1) is the strongest clamp → `calm`. The `(kid)/calm.tsx` route is distinct from all of these (a non-gamified destination, not a theme).
- `stimLevel`/`'low'` naming is retired across the codebase; M14 greps for it.

### 1b.6 Age decoupling: independent companion-style + text-first overrides (supersedes the hard-bound bundle in doc 61 §6.4, doc 62 §9, doc 65 §3.2/§3.3)
- `ageMode` provides **defaults**; these three axes are **independently parent-overridable** (each backed by a granular flag, surfaced in the child-profile settings):
  - `spokenLabelsEnabled` (already independent, doc 62 §4) — keep.
  - **`companionStyle: 'cuddly' | 'cool'`** — NEW independent field on `ChildSettings`; default derived from `ageMode` (young→cuddly, older→cool) but overridable. Drives `companionFraming` + the companion art-variant key.
  - **`textFirst: boolean`** — NEW independent field on `ChildSettings`; default from `ageMode` (young→false, older→true) but overridable. Drives `textPrimary`/`textFirst` token.
- `customizationDepth` (doc 65 §3.3's concatenated string) is **replaced** by independent booleans `canPickColor`, `canPickAccessory`, `canPickTheme` (reconciled with doc 62 `autonomy.canCustomizeCompanion`).
- A precocious non-reader or a cuddly-loving older kid is now expressible without forcing the wrong mode. (A third age band remains a future addition with zero component rewrites.)

### 1b.7 Canonical `CompanionMood` union (supersedes doc 61 §6.3, doc 63 Feature 3, aligns doc 62 §3 repair)
- **ONE union in `src/domain/types.ts`:** `type CompanionMood = 'content' | 'happy' | 'excited' | 'sleepy' | 'celebrating' | 'curious' | 'proud'` (the superset of all positive states across docs; `content` is the canonical resting/default and IS a member). Docs 61/63's `neutral`/`idle`/`cheer`/`glow`/`party` map onto this set (neutral→content, cheer/party→celebrating, glow→happy, idle→content).
- `validateAndRepair` coerces any out-of-set value to **`content`** (which is now a real member). A type-level + unit test asserts no negative member can be added and repair only coerces to a valid positive member.
- **Companion art is selected by a RESOLVED variant key, never by `ageMode` directly** (age-adaptive fix #21): `<BubbleBuddy variant={resolveContent('buddy.artVariant', { companionStyle })} mood={...} />`. `BubbleBuddy` takes `variant` + `mood` + cosmetic props — **never an `ageMode` prop**. This conforms doc 63 §0.1/Feature 3 to the no-fork rule.

### 1b.8 Single onboarding flow with consent + gate-setup (supersedes doc 60 §4.2, doc 62 §3, doc 65 §2, prior M11)
- **THE canonical step list:** `welcome → privacy_consent → parent_gate_setup → child-setup → pick-buddy → first-task → calm-offer → done`.
- `privacy_consent` is a real screen (COPPA-style local acknowledgement; records `privacyConsentAckAt`; states no data leaves the device, analytics/mood OFF by default).
- `parent_gate_setup` is a real screen run **before the child can land in `(kid)`**; it configures `ParentSettings.parentGate` and sets `parentGateConfigured=true`. `OnboardingState.currentStep` + `parentGateConfigured` are now both used (no orphans).
- `parentGate.mode` **must default to a configured challenge** (`pin` for the purchase route, `math` or `longpress` for low-stakes). **`'none'` is dev-only and blocked from production builds** (a build-time assert + M15 gate).

### 1b.9 License: bundled-asset registry + real provenance enforcement (supersedes doc 64 §4, prior M0/M15 license scope)
- **Do NOT lift `lockin/assets/sounds/bubble-pop-06-351337.mp3`** (absent from the donor; only a `Zone.Identifier` ADS survives → downloaded, unknown CC license). **Do NOT ship `collision.mp3` without verified provenance.**
- **`THIRD_PARTY_NOTICES.md` gains a standing `Bundled assets (audio/fonts/images)` section from M0**, populated as assets land: `{ filename, source URL, author, license, commercial-OK }` per file. **All audio** is sourced from CC0 / Pixabay-license / explicitly-royalty-free-commercial origins. **Forbid** CC-BY-NC / CC-Sampling+ / unverifiable licenses (commercially incompatible with a paywalled app).
- **Fonts:** attribute the **real** set — **Fredoka, Lexend (OFL-1.1 via `@expo-google-fonts`) + locally-bundled OpenDyslexic (OFL-1.1)** — each with license text, author, and reserved-font-name note. **NOT Inter** (never shipped; remove the doc 64 §4.2 reference). Locally-bundled fonts/assets are **invisible to `license-checker`** and must be hand-added and reviewed.
- **Apache-2.0/BSD transitives:** preserve the license text **AND any NOTICE file** (not just the text) for every Apache-2.0 dep the scan surfaces (MMKV native is BSD; list whatever the real tree reports).
- **Reference-only enforcement is real, not just grep:** M15 runs a **clone/similarity detector (`jscpd`)** against the `adhd-india` and `adhd-focus-mate` trees and fails on high-similarity hits, PLUS the string grep, PLUS the `PROVENANCE.md` reviewer sign-off (§1b.2). `medtimer` is recorded as **concept-only, zero copyrightable expression**; its upstream license (Futsch1/MedTimer is GPL-3.0-or-later despite the local MIT file) must be reconfirmed before any *code* (never concept) is used. The final `license-checker-rseidelsohn` scan is scoped to **production/runtime deps** (exclude devDependencies).

### 1b.10 Web is a strict subset (supersedes the contradictory web claims in doc 60 §8.3, prior M0/M15)
- **Web-supported subset:** app **boots, navigates, and renders the visual-only celebration** (no haptics, no audio, MMKV→AsyncStorage shim). Web is iteration-only.
- **M0 web acceptance = "renders + navigates" only.** The M15 A–K smoke suite runs on **iOS + Android** (the ship targets); each item is tagged for web as **PASS-subset** (visual/navigation checks) or **N/A on web** (anything needing haptics/audio/MMKV/notifications). The core-loop, persistence, reminders, and sensory items are **N/A on web** by definition.

### 1b.11 Non-punishing premium downgrade (anti-shame; supersedes implicit gating default in doc 62 §12/§13)
- **Hard rule:** anything the child has **equipped or owns stays equipped and owned forever.** Trial-end / decline / downgrade **only blocks NEW unlocks** — it NEVER removes, hides, unequips, greys, or alters anything the child can see. `isPremium()` flipping false changes only what is purchasable, never the buddy's current appearance.
- `FEATURE_GATES.companionThemes`/cosmetics gate *acquisition*, not *retention*. `rewardMenuSize` premium is capped at the **curated ceiling (6), never `'unlimited'`** (curated-autonomy rule + young=3 cap, age fix #27). `multiChild` free=1.
- A test simulates trial expiry with premium cosmetics equipped and asserts **zero visible change** to the buddy.

### 1b.12 Analytics + mood are opt-IN, on-device-only (anti-shame/COPPA; supersedes doc 62 §12 default)
- `ParentSettings.localAnalyticsEnabled` **defaults to `false`** (explicit opt-IN, surfaced in `privacy_consent`). Mood logging (`tb/child/<cid>/moods`) is likewise **opt-in, never required**.
- **Hard invariant + CI gate:** `ActivityEvent` and `MoodLog` **never leave the device.** No network egress path may read `tb/child/<cid>/events` or `.../moods`; M15 greps for any fetch/upload referencing those slices (the same way AI network calls are gated). A future sync layer must explicitly exclude these slices.

### 1b.13 PIN on the purchase route (anti-shame/FTC; supersedes doc 62 §12 gate-mode permissiveness)
- The **paywall/purchase route requires a parent-set PIN** (not arithmetic/long-press). Arithmetic/long-press remains acceptable only for low-stakes settings.
- **Hard rule:** no real payment processor may EVER ship behind the arithmetic/long-press gate. The PIN-on-purchase requirement is in M12 acceptance **now**, even though the MVP purchase is mocked, so the seam is safe by construction.

### 1b.14 Reminder-tone guarantee is copy-provenance, not the type (supersedes doc 62 §12 "type-enforced tone" claim)
- Drop the claim that `toneIsGentle: true` (a literal type) enforces tone — it enforces nothing at runtime. The **real control is the fixed reviewed copy set + the M10 grep gate.** `toneIsGentle` stays as documentation only.
- The fixed reminder/notification copy set **explicitly bans** companion-driven re-engagement strings ("Buddy is back!", "Buddy misses you", "Buddy is waiting") so the buddy-adventure/return mechanic can never become a nag. M10 greps for these.

---

## 2. Target structure (canonical)

```
tiny-bubbles/
  app/                     # expo-router routes ONLY (thin screens)
    _layout.tsx            # fonts, splash, providers, hydration gate, audio cue-registry init, deferred notif register
    index.tsx              # boot redirect: !onboardingComplete -> (onboarding) else (kid)
    (onboarding)/          welcome, privacy-consent, parent-gate-setup, child-setup, pick-buddy, first-task, calm-offer, done
    (kid)/                 _layout (young single-surface / older Tabs, by capability flags), index (runner),
                           celebrate (modal), buddy, rewards, calm
    (parent)/              dashboard, children, tasks, rewards-setup, settings, paywall
    (gate)/parental-gate   # modal challenge before (parent); PIN required before paywall
  components/   buddy/ celebration/ task/ rewards/ progress/ pickers/ ui/ mood/
  src/
    theme/      tokens.ts, ThemeProvider.tsx (+ overrideAgeMode), useThemeTokens.ts, resolveTokens.ts,
                resolveCapabilities.ts, resolveContent.ts, resolveCelebration.ts, breakpoints.ts
    state/      settingsStore, childStore, taskStore, rewardStore, buddyStore, sessionStore
    storage/    mmkv.ts (port), persist.ts, migrations.ts, schemaVersion.ts
    domain/     gamification.ts, streaks.ts, reinforcement.ts, companionMood.ts, tasks.ts, tokens.ts, types.ts
    services/   notifications.ts, tts.ts, haptics.ts, sound.ts (expo-audio cue registry), purchases.ts (MOCK)
    data/       taskTemplates.ts, rewardPresets.ts, buddyCosmetics.ts, copy.ts
    constants/  ageMode, sensoryMode, breakpoints, storageKeys
  assets/  fonts/ (Fredoka, Lexend, OpenDyslexic) sounds/ (CC0/royalty-free only) buddy-svg/
  app.json eas.json babel.config.js metro.config.js tailwind.config.js global.css
  LICENSE THIRD_PARTY_NOTICES.md (incl. Bundled assets section) PROVENANCE.md CONTRIBUTING.md
```

**Principle:** `app/` screens are thin; reusable logic lives in `src/domain` (RN-free, unit-testable) and `src/state`. Components read `useThemeTokens()` + capability flags + resolved content/variant keys, **never** the raw `ageMode`/`sensoryMode` string and **never** an `ageMode` prop.

---

## 3. Milestone overview & checkpoint map

Each milestone is independently buildable and ends runnable. "CP" maps to doc 64's checkpoint letters where applicable.

| ID | Title | Effort | Depends on | CP |
|---|---|---|---|---|
| M0 | Scaffold, toolchain, app boots | M | — | A |
| M1 | Dependency reconciliation + native sandbox (de-risk the REAL risks) | L | M0 | — |
| M2 | Design system + theming/age-adaptive engine + celebration resolver (de-risk) | XL | M0, M1 | C |
| M3 | Storage, persistence & migration layer | M | M0, M1 | — |
| M4 | Data layer: domain logic + Zustand stores + seed data (net-new build) | XL | M3 | — |
| M5 | App shell, navigation & age-mode layout switch | M | M2, M4 | — |
| M6 | Companion "Bubble Buddy" (positive-only) + nurture + mood derivation | L | M2, M5 | — |
| M7 | Core loop: one-step runner + immediate celebration + token | L | M4, M5, M6 | E |
| M8 | Token economy, progress, nurture wiring & caregiver rewards (net-new build) | XL | M4, M7 | — |
| M9 | Parent area + parental gate + task assignment (net-new build) | XL | M5, M4, M2 | — |
| M10 | Few, gentle, point-of-performance reminders | M | M9, M4 | — |
| M11 | Onboarding (consent + gate-setup + parent + child, calm-mode offer) | M | M5, M9, M6 | — |
| M12 | Paywall stub + entitlement gating + PIN-on-purchase | M | M9, M4 | G |
| M13 | Sound (expo-audio), haptics, calm path & celebration polish | M | M7, M2 | — |
| M14 | Age-adaptive + tablet verification pass (cross-cutting) | M | M6, M7, M8, M9, M11 | — |
| M15 | QA + anti-shame ship gate + license/asset/provenance hygiene | L | all | G |

**Front-loaded de-risk:** M1 (the GENUINELY risky native surfaces) and M2 (theming/age + celebration resolver) come before feature work. The app is runnable from M0; M5 makes it navigable; M7 makes the core loop real.

---

## 4. Milestones (detailed)

### M0 — Scaffold, toolchain, app boots
- **Goal:** A fresh Expo SDK 54 project that boots clean on iOS sim + Android emulator (and *renders/navigates* on web), with correct build config and license artifacts in place.
- **Deliverables:** `tiny-bubbles/` via `create-expo-app -t expo-template-blank-typescript`; expo-router + NativeWind v4 + Reanimated v4 + `react-native-worklets` installed; `babel.config.js`, `metro.config.js`, `global.css`, `tailwind.config.js` (kids palette placeholder, no `swiss.red`) copied/retoned from lockin; **`babel.config.js` uses `'react-native-worklets/plugin'`** (NOT `'react-native-reanimated/plugin'`) for Reanimated 4 + worklets 0.5.1; `app.json` (scheme, `typedRoutes:true`, plugins **including the `expo-notifications` config plugin** with icon/sounds/permission setup, `ios.supportsTablet:true`, Android package, portrait — **no Notifee plugin**, **no `UIBackgroundModes`** since no background audio); root `app/_layout.tsx` + `app/index.tsx` placeholder; `tsconfig` strict; `LICENSE` (MIT) + `THIRD_PARTY_NOTICES.md` (lockin ©2025 adhd.dev as the only code donor; a **`Reference patterns`** note for habit-tracker ©2024 takanome-dev + Infinite Red/Ignite, tether ©2025 Aarsh Shah, momentum ©2024 Vishal; a standing **`Bundled assets (audio/fonts/images)`** section, initially empty) + `PROVENANCE.md` (per-file origin manifest) + `CONTRIBUTING.md` (reference-only + provenance rules). **Drop** `expo-ai-kit`, `@google/genai`, `expo-media-library`, `@bacons/apple-targets`, `@expo/ngrok`, `@notifee/react-native`.
- **Key source files to lift (lockin only):** `babel.config.js` (then swap the plugin), `metro.config.js`, `global.css`, `tailwind.config.js` (palette stripped), `app.json` (then add notifications plugin), `eas.json`, `app/_layout.tsx` (structure only), `app/index.tsx` (redirect pattern).
- **Acceptance / how to run:** `npx expo run:ios` and `npx expo run:android` boot a dev client with no red box; `npx expo start --web` **renders + navigates** (subset only); `npm run typecheck` (`tsc --noEmit`) passes. Grep for `swiss` / `@google/genai` / `@notifee` / `react-native-reanimated/plugin` returns zero. (Doc 64 CP A.)
- **Effort:** M

### M1 — Dependency reconciliation + native sandbox (de-risk the REAL risks)
- **Goal:** Prove the genuinely-risky native/animated surfaces (not just the easy pickers) work on SDK 54 / RN 0.81 / Reanimated 4 / New Architecture in a dev client, before any feature depends on them.
- **Deliverables:** installed + pinned: `react-native-mmkv@^3`, `expo-haptics`, **`expo-audio`** (NOT expo-av), `expo-speech`, `expo-crypto`, `expo-notifications`, `expo-dev-client`, `expo-font`, `expo-splash-screen`, `zustand@^5`, `react-native-svg@15.12.1`, `date-fns@3.6` + `date-fns-tz@^3`; UI libs at New-Arch majors: **`@gorhom/bottom-sheet@>=5.1.8`** (5.1.8 is the first Reanimated-4-compatible release — a loose `^5` could resolve below it), `reanimated-color-picker@^4`, `rn-emoji-keyboard@^1.9`, `react-native-circular-progress@^1.4.1`, `@react-native-community/datetimepicker@^8.5`; deferred-to-v1: `react-native-gifted-charts` + `react-native-linear-gradient`, `@shopify/flash-list`. A throwaway `app/_sandbox.tsx` exercising, **in priority order, the things M6/M7 actually depend on**: (a) **an animated `react-native-svg` `Path` `d`/`RadialGradient` driven by a Reanimated shared value** (the BubbleBuddy mouth/gaze/breathe + gradient — most novel, historically fragile on New Arch); (b) **a Modal / router-modal with Reanimated `FadeIn`/`ZoomIn`/`SlideInDown` entering animations** (the M7 celebration); (c) **`Speech.speak()` + `Speech.getAvailableVoicesAsync()`** (TTS + the offline-voice probe); (d) **a tap→haptic+`playCue()` audio latency probe** asserting sub-300ms; plus the proven-but-still-checked surfaces: emoji picker, color picker, bottom sheet, datetime picker, circular progress, an MMKV read/write, an `expo-notifications` schedule.
- **Key source files to lift:** habit-tracker picker *patterns* (re-authored, not copied — donor uses bottom-sheet v4 + color-picker v3 prop shapes; rewrite against v5/v4 APIs); lockin `services/notifications.ts` (pattern).
- **Acceptance / how to run:** open `_sandbox` on a physical Android + iOS dev client; **(a)–(d) all pass** (animated SVG path/gradient runs with no worklet error; modal entering animations run; `getAvailableVoicesAsync()` returns and `speak()` produces audio OR is recorded as needing a fallback; tap→haptic+sound measured <300ms); every picker opens; MMKV value survives reload; a local notification fires. **M6 is gated on (a); M7 is gated on (b) and (d).** Document any lib that fails + its **named New-Arch replacement** — in particular, if `react-native-circular-progress@1.4.x` (unmaintained) fails on RN 0.81 New Arch, the named fallback is a **hand-rolled Reanimated + `react-native-svg` `Circle` `strokeDashoffset` ring** (we own the bubble-fill anyway). Rollback rule: never disable New Arch. Delete `_sandbox` before M15.
- **Effort:** L

### M2 — Design system + theming/age-adaptive engine + celebration resolver (de-risk, most architecturally important)
- **Goal:** One `ThemeProvider` + `useThemeTokens()` that resolves a single token set + capability flags + content/variant keys from `ageMode × sensoryMode × reducedMotion × screen-size`, with the **single celebration resolver**, the **scoped-override provider** for live preview, fonts, palettes, responsive/tablet tokens, and the spoken-label primitive — so no component ever branches on age inline.
- **Deliverables:**
  - `src/theme/tokens.ts` (`ThemeTokens`: `touchTargetMin`, `fontScale`, `radius`, `spacing`, `colors`, `textFirst`, `spokenLabelDefault`, `confetti`, `animationDurationScale`, `haptics`, `soundscapeDefault`, **`contentMaxWidth`, `columns`** for responsive).
  - `resolveTokens.ts` (ageMode base + sensoryMode/reducedMotion reducers + **breakpoint/screen-size dimension** so each age mode has a tablet layout — `breakpoints.ts` defines phone/tablet thresholds, `columns` and `contentMaxWidth` scale up on tablet; young stays single-focal but centered with a max width, older Tabs gain multi-column grids).
  - `resolveCapabilities.ts` (`ttsDefault`, `textPrimary` [from `textFirst` override], `maxChoices` 3|6, `multiStepVisible`, `showNumbersAndCharts`, **`canPickColor`/`canPickAccessory`/`canPickTheme`** [replacing `customizationDepth`], `companionFraming` [from `companionStyle` override], `delegateToChild`, **`canAddTasks`**, `moodCheckin`).
  - `resolveContent.ts` (mode-keyed copy/TTS/**art-variant** incl. **`buddy.artVariant`** keyed on `companionStyle`; typed `ModeKeyed<T>` that the **compiler forces to carry BOTH `young` and `older` variants** so no kid-facing key can ship half-populated).
  - **`resolveCelebration.ts`** — the single celebration resolver per §1b.3 (salience sets size; ageMode ceiling; sensory/calm/quiet-hours clamp; phase NEVER reduces).
  - **`ThemeProvider.tsx` with a scoped `overrideAgeMode` prop** (nests and supplies forced tokens/capabilities/content for a non-active mode) AND consuming hooks accept an optional override (`useThemeTokens(opts?)`, `useCapabilities(opts?)`) — **this is what makes the live side-by-side mode preview buildable** (referenced by M9/M11).
  - `useThemeTokens.ts`, `useReducedMotion.ts`; NativeWind palettes Reef (young/standard), Tide (older/standard + dark), Stillwater (lowStim) wired via CSS-var class set in `global.css`; fonts **Fredoka + Lexend (`@expo-google-fonts/*`) + local OpenDyslexic** loaded at splash; `services/tts.ts` (expo-speech) with **age-driven pitch/rate params** (young: higher/bubblier; older: lower/mellower; resolved from `ageMode`) + `components/ui/SpokenLabel.tsx`; motion tokens.
  - A `app/_theme-gallery.tsx` dev screen showing both modes side-by-side via the override provider.
- **Key source files to lift:** habit-tracker `app/theme/{colors,spacing,typography,timing}.ts` (*structure reference*, re-authored + reskinned); lockin `tailwind.config.js` + `global.css` + `useFonts` splash gate (graftable); momentum `useReducedMotion.ts`, `ThemeProvider.tsx` (*pattern reference*).
- **Acceptance / how to run:** in `_theme-gallery`, toggling young↔older changes touch-target/font-scale/text-first/palette live AND **both modes render simultaneously via `overrideAgeMode`**; an independent `companionStyle`/`textFirst` override changes the buddy framing/text without changing age mode; toggling `lowStim` desaturates + kills confetti + shortens motion; OS Reduce-Motion forces gentle; on a tablet viewport `contentMaxWidth`/`columns` change (no phone-sized UI stretched); SpokenLabel speaks (age-pitched), auto-speaks in young; `resolveCelebration` returns the correct level for every (salience × ageMode × clamp) combo and **never lowers size by phase**; a content key missing one variant is a **type error**. Same component instances, zero inline `if (young)`. (Doc 64 CP C.)
- **Effort:** XL

### M3 — Storage, persistence & migration layer
- **Goal:** A versioned, migration-aware, offline-first persistence layer behind a swappable `storage` port, with safe defaults and no data-loss path. **Net-new infra (no donor provides MMKV/Zustand-persist).**
- **Deliverables:** `src/storage/mmkv.ts` (port: `getString/set/delete`; AsyncStorage shim for web); `persist.ts` (Zustand `persist` adapter, `partialize`, per-store `version`); `schemaVersion.ts` (`SCHEMA_VERSION`, `tb/`-namespaced keys per doc 62 §2); `migrations.ts` (ordered forward-only total migrations + `mergeWithDefaults` + `validateAndRepair` invariants — re-authored from the tether *pattern*, incl. the canonical `CompanionMood` coercion to `content` per §1b.7); one-time AsyncStorage→MMKV import; `StoreHydrationGate.tsx`.
- **Key source files to lift:** tether `GamificationService.ts` load/merge/validate (*pattern reference* — re-author); lockin `getAllKeys`+`multiRemove` reset (graftable); habit-tracker storage API shape (*reference*).
- **Acceptance / how to run:** write a value, force-quit, relaunch → survives; bump a store `version` locally → migration runs, no data loss; corrupt a blob → falls back to defaults, no crash, never a punishing zeroed state; "delete my data" clears only `tb/` keys.
- **Effort:** M

### M4 — Data layer: domain logic + Zustand stores + seed data (net-new build)
- **Goal:** The full forgiving data model, pure domain logic (unit-tested), the persisted stores, and the starter seed library — with no field anywhere that can represent failure/loss/decay/guilt. **This is a net-new build re-authored from reference logic, NOT a graft.**
- **Deliverables:** `src/domain/types.ts` — all per doc 62 with the canonical reconciliations applied:
  - `TaskStatus = 'todo'|'done'|'skipped'` (**no `failed`**); canonical **`CompanionMood`** union (§1b.7); canonical **`CelebrationLevel`** (§1b.3).
  - `ChildSettings` gains **`sensoryMode`** (§1b.5), **`companionStyle`**, **`textFirst`** (§1b.6), `autonomy.canAddTasks` (§age fix #24); `customizationDepth` removed in favor of the three booleans.
  - `Reward` keeps `limitPerWeek`/`cooldownHours` (now wired in M8/M9); `ChildSettings.autoApproveRedeemUnderTokens` (now wired in M8/M9).
  - `ProgressState` gains **`savingTowardRewardId?`** (older goal-bar, §age fix #24).
  - `ParentSettings.localAnalyticsEnabled` **default false** (§1b.12).
  - **Remove `BadgeGrid`/badge engine from MVP** (deferred to v1 per doc 62 §15) — keep a cosmetics/collectibles grid only.
  - `gamification.ts` (`earn()` append-event + cap), `streaks.ts` (timezone-aware, **freeze/pause not zero**), `reinforcement.ts` (`computeReinforcement` dense→thinning→maintenance — **thins ONLY bonus-token cadence; base token + celebration never thinned; bonus is the deterministic every-N, no `Math.random`** §1b.4), **`companionMood.ts`** (the event→mood rules table + decay timing per §age fix; e.g. step done→`celebrating`→decays to `content`; return-after-absence→`excited`), `tasks.ts` (forgiving rollover today→someday), `tokens.ts` (redemption escrow + auto-approve-under-N branch).
  - Stores: `settingsStore`, `childStore`, `taskStore`, `rewardStore`, `buddyStore`, **`sessionStore` (in-memory) + persisted run-progress** so M7's resume-after-kill reconstructs the next incomplete step (§completeness fix).
  - `src/data/` seed packs (15 task templates, 3 routines, 8 rewards, 2 companions) applied once via `seedState`; cosmetics carry a **rarity field + a seasonal-pack data shape + a seed hook** (the novelty-rotation seam named in the risk register, additive-only per §5).
  - Jest-expo unit tests for gamification/streaks/reinforcement/**companionMood**/**bonus-determinism**.
- **Key source files to lift:** tether gamification *logic reference* (re-author against Zustand/MMKV); momentum `streaks.ts`/`dailyRollover.ts`/Mood enum *logic reference*; lockin `types.ts` shape (graftable; **drop `FAILED`/`impact`/`LockedGoal`**).
- **Acceptance / how to run:** `npm test` green; a simulated multi-day gap never yields streak `0`/"broken" (freeze then pause); base token always paid; **celebration size never decreases as a function of completion count** (assert the resolver ignores phase); **bonus timing is a pure function of completion count (no `Math.random` in any payout path)**; redemption escrow holds then refunds on decline with zero net spend; auto-approve-under-N approves without parent; `companionMood` derivation transitions + decays correctly and can never reach a negative state. Grep domain tree for `failed`/`FAILED`/`Math.random` (in payout) → zero.
- **Effort:** XL

### M5 — App shell, navigation & age-mode layout switch
- **Goal:** The correct IA (kid/parent/onboarding/gate), provider order, boot redirect, age-mode shell selection (**by capability flags, not raw mode**) — runnable end-to-end as navigation before features land.
- **Deliverables:** root `app/_layout.tsx` provider stack (`GestureHandlerRootView → SafeAreaProvider → StoreHydrationGate → ThemeProvider → audio cue-registry init → Stack`); `app/index.tsx` boot redirect (`!onboardingComplete` → onboarding); route groups `(onboarding)`, `(kid)`, `(parent)`, `(gate)` with placeholder screens; `(kid)/_layout.tsx` selecting **young single-surface (no tab bar)** vs **older Tabs (Today/Buddy/Rewards/Calm)** from `capabilities.multiStepVisible`/shell flag (not raw `ageMode`); `(gate)/parental-gate.tsx` route stub + in-memory `parentUnlocked` flag cleared on background; deferred notification registration (after onboarding).
- **Key source files to lift:** lockin `app/_layout.tsx` (Stack + GestureHandlerRootView + splash + notif-register pattern, **AIProvider omitted**), `app/index.tsx` (redirect-on-flag pattern).
- **Acceptance / how to run:** fresh install → onboarding placeholder; with onboarding complete → kid home; flipping a child's `ageMode` changes the kid shell (tabbed vs single-surface) with no crash, no data reset; the kid cannot reach `(parent)` except via `(gate)`.
- **Effort:** M

### M6 — Companion "Bubble Buddy" (positive-only) + nurture + mood derivation
- **Goal:** One procedural `<BubbleBuddy>` (SVG + Reanimated) with only positive/neutral/restful states, a **resolved art-variant prop (never `ageMode`)**, **visible nurture progression**, and **runtime mood derivation** — the anti-shame keystone.
- **Deliverables:** `components/buddy/BubbleBuddy.tsx` (squircle body + radial gradient + specular highlight + gaze/blink/breathe via shared values; `mood` shared value drives mouth curve; **takes `variant` + `mood` + cosmetic props — NEVER an `ageMode` prop**, §1b.7); states from the canonical `CompanionMood` union; cuddly ("Bloop") vs cool ("Orbit") art selected by the **`buddy.artVariant`** content key (driven by `companionStyle`, not age); `BuddyRoom.tsx`; customization (`bodyHue`, `finish`, `accessory`, `name`) wired to `buddyStore` (cosmetic shape re-authored from tether *reference*, with rarity); `(kid)/buddy.tsx`; **nurture wiring** — `bondLevel`/`growthStage` derived **monotonically from `lifetimeEarned`** (never decreasing) with a **rendered growth-stage visual change**; **mood derivation** — wire `companionMood.ts` (M4) to real events so completion→`celebrating`→decays to `content`, return-after-absence→`excited` (via a debug control AND real events).
- **Key source files to lift:** lockin `ExecutionSprite.tsx` + `ScannerSprite.tsx` (**architecture only** — shared values, `withRepeat` breathing, gaze logic). **Delete on contact:** `isAngry`, angry-jump, angry-eyes, `MOCKING`/`MockingPhase`, `DEFAULT_INSULTS`, tears, `mockeryText`, `excitementLevel` insults.
- **Acceptance / how to run:** buddy renders + idles (bob/breathe/blink) on `(kid)/buddy`; states cycle via debug control AND via real events; **earning tokens visibly advances the buddy (growth-stage change asserted)**; cuddly vs cool art differs and follows `companionStyle` (not age); cosmetics persist. Grep shipped tree for `isAngry|MOCKING|mockeryText|DEFAULT_INSULTS` → zero, and for an `ageMode` prop passed to `BubbleBuddy` → zero. No code path can set a negative mood (enforced by the canonical `CompanionMood` union).
- **Effort:** L

### M7 — Core loop: one-step runner + immediate celebration + token
- **Goal:** The load-bearing loop — child sees ONE step, taps Done, gets a sub-second multisensory celebration + an immediate token that persists — fully offline.
- **Deliverables:** `components/task/{StepCard,TaskRunner,DoneButton}.tsx` (one step at a time in young, list-visible in older via `capabilities.multiStepVisible`; picture/icon/color + auto-spoken label; **completed steps render a calm "done"/greyed state** in the older list view — never a red "failed" style, §completeness fix; **a kid-facing step-reorder affordance in older** when `autonomy.canReorderSteps`); `components/celebration/CelebrationOverlay.tsx` + `Confetti.tsx` (timeline per doc 61 §8, **size from `resolveCelebration` only**); `hooks/useCelebration.ts` (orchestrates `playCue()`+haptic+overlay+TTS imperatively so the sub-300ms timing is guaranteed); `(kid)/index.tsx` runner + `(kid)/celebrate.tsx` modal; token earn wired through `gamification.earn()` + `reinforcement` (base always paid); step→next advance + **resume-after-kill via the persisted run-progress (M4) — reopen resumes at the next incomplete step**.
- **Key source files to lift:** lockin `VictoryOverlay.tsx` (Modal + `ZoomIn/SlideInDown/FadeIn` structure — retone copy/color/sprite), `MilestoneCard.tsx`/`MilestoneStack.tsx` + `handleCompleteMilestone` advance logic, `focus-timer.tsx` haptics pattern. **No audio asset lifted** (the bubble-pop mp3 is absent/unlicensed — cues come from the M13 CC0/royalty-free set; M7 uses placeholder cues registered in the M13 registry or a verified CC0 pop).
- **Acceptance / how to run:** in airplane mode, tap Done → haptic + sound + visual + token within ~300ms, every time; token balance increments and survives force-quit; **kill mid-routine → reopen → resumes at the next incomplete step**; a non-reader completes a 4-step routine using only pictures + audio; young shows one step, older shows the list with completed steps greyed (never "failed"); sound/haptics each independently respect their toggle (visual + token still fire with both off). (Doc 64 CP E.)
- **Effort:** L

### M8 — Token economy, progress, nurture wiring & caregiver rewards (net-new build)
- **Goal:** Tokens accumulate, drive forgiving cumulative progress + a partly-full bubble meter + the older save-toward-a-goal bar, advance the companion, and redeem (escrowed, parent-gated, refundable, guardrailed) for caregiver-set rewards. **Net-new build re-authored from reference logic.**
- **Deliverables:** `components/progress/{BubbleMeter,StreakRing}.tsx` (endowed-progress: starts partly full, never empty/0; on a paused/restart state **lead with `cumulativeCount` ("you've popped 312 bubbles!"); "best: N" appears ONLY as a non-losable lifetime badge, never adjacent to a smaller current number** §anti-shame fix); **`components/progress/GoalBar.tsx`** (older save-toward-`savingTowardRewardId`, gated by `showNumbersAndCharts`); `components/rewards/{TokenMeter,RewardCard}.tsx` (+ a cosmetics/collectibles grid — **no `BadgeGrid`**, badges deferred); `(kid)/rewards.tsx` (**kid list sliced by `capabilities.maxChoices` — 3 young / 6 older — regardless of how many the parent defined**; affordability framing "3 more bubbles!", never a sales pitch); redemption escrow flow (`heldTokens`, request→approve/decline→refund, **+ auto-approve-under-N branch**); **screen-time/availability guardrails enforced** (`limitPerWeek`/`cooldownHours` — a reward at its limit shows "come back later", never a punishment); **nurture wiring** (lifetimeEarned→bondLevel/growthStage shared with M6); reinforcement **bonus-cadence** thinning wired but invisible to the child (celebration size unchanged); forgiving rollover reconciler on app-open + local midnight.
- **Key source files to lift:** tether spend/affordability *logic reference* (re-author as refundable `redeemReward`); habit-tracker `AnimatedCircularProgress` *reference* (or the M1 hand-rolled ring) → liquid bubble-fill; momentum streak/rollover *logic reference*.
- **Acceptance / how to run:** redeeming holds then spends exactly on approval; declining refunds with zero net change; tokens can never go negative; auto-approve-under-N works; a reward at its weekly limit/cooldown is unavailable ("come back later"); meter starts >0% each day and animates on done; **earning advances bond/growth (shared assert with M6)**; older goal-bar fills toward the saved reward; a simulated gap shows "you've popped N bubbles" + "best: N" as a badge (never a current-vs-best drop, never "0"). Streaks off by default (calm), opt-in only. **No screen on the kid path places current-vs-best as a drop.**
- **Effort:** XL

### M9 — Parent area + parental gate + task assignment (net-new build)
- **Goal:** Everything the parent owns, behind a gate the child can't pass: assign templated tasks in 2–3 taps, manage children + per-child age/sensory/companion-style, set rewards with guardrails, tune settings. **Net-new build (pickers re-authored against v5/v4 APIs, not copied).**
- **Deliverables:** `(gate)/parental-gate.tsx` (randomized arithmetic or timed long-press for low-stakes; **a parent-set PIN is REQUIRED before the paywall/purchase route** §1b.13; no biometric required; degrades gracefully); `(parent)/dashboard.tsx` (kids overview, light progress); `(parent)/children.tsx` (multi-child profiles; per-child `ageMode` toggle **with live side-by-side preview via the M2 `overrideAgeMode` provider**; the **independent `companionStyle` + `textFirst` + `sensoryMode` overrides** §1b.5/§1b.6; always free — never paywalled); `(parent)/tasks.tsx` (templated library → 2–3-tap assign; pickers: emoji/color/day/time — **re-authored against `@gorhom/bottom-sheet@>=5.1.8` + `reanimated-color-picker@4` APIs, not copied from the v4/v3 donor**; add-a-step; **a gated kid task-proposal/approval queue when `autonomy.canAddTasks`** §age fix #24); `(parent)/rewards-setup.tsx` (CRUD 3–6 rewards, cost, screen-time minutes, **`limitPerWeek`/`cooldownHours`**, **`autoApproveRedeemUnderTokens`**); `(parent)/settings.tsx` (sound/haptics per category, **`sensoryMode`/lowStim**, reduced-motion, quiet hours, AI off, calm mode, OpenDyslexic, **local-analytics opt-IN row (default off)**, **mood-logging opt-IN row**, delete data, **parental data review/export** [view what is stored about the child], Licenses row); route guards.
- **Key source files to lift:** habit-tracker settings rows/Link/Toggle *scaffold reference*; create-new-habit picker *pattern* (re-author against v5/v4); momentum add-a-step *pattern*; medtimer gate **concept only** (reimplement in JS — record concept-only in PROVENANCE); lockin onboarding wizard mechanics (no Contract/Goal).
- **Acceptance / how to run:** from kid area, any "grown-ups" affordance routes through the gate; failing it never reaches `(parent)`; backgrounding clears `parentUnlocked`; **the purchase route demands the PIN even though the buy is mocked**; a parent assigns a templated task in ≤3 taps; flipping a child's age mode re-themes the kid shell losslessly with the live preview matching; `companionStyle`/`textFirst`/`sensoryMode` overrides take effect independently; rewards honor limit/cooldown/auto-approve; analytics + mood default OFF and only log when opted in; data-export shows exactly what is stored; settings immediately affect the child experience.
- **Effort:** XL

### M10 — Few, gentle, point-of-performance reminders
- **Goal:** A small number of friendly, schedule-tied reminders that respect quiet hours and a per-day budget, with copy that can never be guilt-toned, on **`expo-notifications` alone**.
- **Deliverables:** `src/services/notifications.ts` (register, schedule, cancel) gated through quiet-hours + `maxPerDay`; `ReminderConfig`/`ReminderAnchor` wired from parent settings; `scheduleRoutineReminders(routine, quietHours)` mapping routine times → scheduled notifications, skipping quiet windows; **fixed friendly copy set** (the real tone control per §1b.14 — **explicitly bans** "Buddy misses you"/"Buddy is back!"/"Buddy is waiting" and any companion re-engagement string); reschedule on app open; deferred permission prompt (post-onboarding). **Note (honest scope):** scheduled OS notifications **cannot auto-speak via `expo-speech`** (it only fires foregrounded). A "spoken reminder" is delivered as a notification **sound**; TTS speaks the routine label only on **tap-through** when the app opens. Doc 65 §5 / doc 63 9(c) over-claim is corrected here.
- **Key source files to lift:** lockin `services/notifications.ts` (`registerForPushNotificationsAsync`, `scheduleNotificationAtDate`, `cancelAllNotifications`) — graftable; momentum quiet-hours model *reference*.
- **Acceptance / how to run:** no reminder is delivered inside a configured quiet-hours window; count is bounded and tied to actual routine times; **grep confirms reminder copy comes only from the fixed friendly set, with zero companion re-engagement / guilt / begging strings**; tap-through speaks the label when the app opens (no claim of background TTS).
- **Effort:** M

### M11 — Onboarding (consent + gate-setup + parent + child, calm-mode offer)
- **Goal:** Fresh install → a configured parent gate + a child with a runnable routine in ~60s, everything spoken, no reading-heavy wizard, the calm path surfaced once, honest framing — using the **single canonical flow** (§1b.8).
- **Deliverables:** `(onboarding)/welcome.tsx` (honest: "builds routines & reduces morning conflict", never "treats ADHD"); **`privacy-consent.tsx`** (COPPA-style local acknowledgement; records `privacyConsentAckAt`; states no data leaves device + analytics/mood default OFF); **`parent-gate-setup.tsx`** (configures `ParentSettings.parentGate`, sets a PIN for the purchase route, sets `parentGateConfigured=true` — **runs before the child can reach `(kid)`**); `child-setup.tsx` (name + age → sets `ageMode`, with override preview via the M2 provider); `pick-buddy.tsx` (name/customize buddy — autonomy); `first-task.tsx` (seed one templated task so the loop is live day one); `calm-offer.tsx` (offer the non-gamified path once); `done.tsx` (write onboarding-complete + `replace('/(kid)')`); everything spoken via TTS with the **offline fallback** (see below).
- **Offline TTS fallback (§missing):** `privacy-consent`/`child-setup` probe `Speech.getAvailableVoicesAsync()`. If no usable voice exists, the onboarding script + seed task spoken-labels play **pre-recorded CC0/royalty-free audio assets** (bundled, registered in THIRD_PARTY_NOTICES assets section), and a **one-time parent prompt** offers to install a TTS voice. The non-reader path never depends solely on runtime TTS.
- **Key source files to lift:** lockin `(onboarding)/index.tsx` (step state, progress dots, persist-then-`replace`) + `components/onboarding/*` (wizard shell only — **discard** GoalInput/Contract/TimeLeft, HeadbuttScene, "CANNOT BE CHANGED").
- **Acceptance / how to run:** time a fresh install to a runnable routine (~60s target); **the parent gate is configured before the child can land in `(kid)`**; a non-reader can complete child-setup via spoken prompts (or pre-recorded fallback if no voice); calm mode is offered exactly once; no over-claiming copy.
- **Effort:** M

### M12 — Paywall stub + entitlement gating + PIN-on-purchase
- **Goal:** A fully designed free/premium paywall + feature gating with the purchase mocked (no processor, no network), behind the **PIN** parent gate, child never sees it, and **no take-away ever reaches the child**.
- **Deliverables:** `(parent)/paywall.tsx` (clear price, 7-day trial with honest end-date, one-tap cancel, visible hardship/pay-what-you-can, NO countdown/urgency); `src/services/purchases.ts` (`mockPurchase(plan)` flips `entitlement.tier='premium'` + `trialEndsAt`; `mockCancel()` reverts; `// TODO: wire RevenueCat` seam); `useEntitlements()`/`isPremium` selector; `<PremiumGate>` wrapper that **gates NEW unlocks only — never removes/hides/unequips anything the child owns or has equipped** (§1b.11); `FEATURE_GATES` (multiChild free=1, **rewardMenuSize capped at the curated ceiling 6 — never `'unlimited'`**, companionThemes free=2 [gates acquisition only], noveltyPipeline/calmSoundscape/advancedInsights premium); **age mode + companionStyle + sensoryMode never gated**; free tier runs the full core loop. The **over-claiming grep gate covers this paywall copy** (§1b.15 below / M15).
- **Key source files to lift:** habit-tracker settings row/scaffold *reference* for layout. (No donor ships billing.)
- **Acceptance / how to run:** core loop fully usable on free tier with no paywall interruptions; **the purchase route requires the parent PIN**; mock subscribe unlocks premium locally + mock cancel reverts in one tap; **simulating trial expiry with premium cosmetics equipped produces ZERO visible change to the buddy** (test); paywall shows honest trial end, no urgency, hardship present, **no "treats/cures/clinically proven" copy**; airplane mode confirms no network/billing call; children never see a purchase prompt. (Doc 64 CP G part.)
- **Effort:** M

### M13 — Sound (expo-audio), haptics, calm path & celebration polish
- **Goal:** The premium sensory layer — cohesive watery/marimba sound that mixes-not-hijacks via **`expo-audio`**, a full haptic cue set that never scolds, the calm/non-gamified path, and the polished celebration/ambience — all toggleable, all from licensed assets.
- **Deliverables:** `src/services/sound.ts` — the **imperative cue registry** (§1b.1): pre-instantiate one `AudioPlayer` per cue at boot, `playCue(id)` = `seekTo(0)+play()`; audio session mix-not-hijack (duck-not-stop); cue set: tap.soft, step.done, token.payout, routine.complete, levelup, reward.redeem, buddy.greet, transition.swoosh, calm.ambient; per-category toggles. **Every audio file is CC0/Pixabay-license/royalty-free-commercial, logged in THIRD_PARTY_NOTICES assets section** — none lifted from lockin. `src/services/haptics.ts` (cue set per doc 61 §10; **never Warning/Error toward a child**); `(kid)/calm.tsx` (soundscape + breathing, non-gamified, no tokens/confetti); background parallax bubbles (standard only); lowStim + quiet-hours celebration variants (single ripple, soft chime, one light haptic, buddy settle); routine-complete vs step celebration **magnitudes from `resolveCelebration` (salience-driven, never phase-driven)**.
- **Key source files to lift:** lockin `expo-haptics` usage *pattern* (remove child-facing Warning). **No audio lifted from lockin.**
- **Acceptance / how to run:** a cue ducks (not stops) background music for ~1s **verified on a real device**; each sensory channel toggle verifiably suppresses its channel app-wide; lowStim/reduced-motion/quiet-hours each soften the celebration; calm path has no tokens/confetti; grep confirms no `Warning`/`Error` haptic in child flows; every shipped audio file appears in the assets license registry.
- **Effort:** M

### M14 — Age-adaptive + tablet verification pass (cross-cutting)
- **Goal:** Confirm age-adaptivity is real across the whole app: every screen reads tokens/flags/resolved-variant-keys (never raw mode, never an `ageMode` prop), both modes work, switching is lossless, older never reads "babyish", **and tablets get real layouts**.
- **Deliverables:** an audit + fixes sweeping `app/` + `components/` for (a) any raw `ageMode`/`sensoryMode`/`stimLevel` branch and (b) **any `ageMode` PROP passed into a component** — replace with tokens/flags/variant keys; older dark-mode pass; calm-mode pass; the parent age-mode switch + **live side-by-side preview verified end-to-end** (via the M2 override provider); the independent `companionStyle`/`textFirst`/`sensoryMode` overrides verified; capability-flag coverage table filled; **content-coverage check** (every kid-facing key has both young+older variants — type-enforced + a CI check); **tablet pass** — run the full loop on an iPad + an Android tablet, confirm `contentMaxWidth`/`columns`/multi-column grids render (no stretched phone UI) in both modes.
- **Key source files to lift:** none new — verification/refactor over M2/M6/M7/M8/M9/M11 output against doc 65 §4–5 tables.
- **Acceptance / how to run:** flip a child young↔older → every kid screen re-themes (target sizes, font scale, text-first, tabs vs single-surface, companion variant, celebration ceiling) with no crash and no token/progress/buddy reset; run both modes through the full loop on phone AND tablet; grep for `=== 'young'`/`=== 'older'`/`stimLevel` in `components/`/`app/` → only in resolvers; grep for `<BubbleBuddy ageMode` or any `ageMode=` prop → zero; the content-coverage check passes.
- **Effort:** M

### M15 — QA + anti-shame ship gate + license/asset/provenance hygiene
- **Goal:** The kid-safety + quality + license gate that must pass before the MVP is callable "done."
- **Deliverables:**
  - The smoke-test suite **A–K** executed on **iOS + Android** (web runs the PASS-subset/N/A tagging per §1b.10). A–I per doc 60 §8.3 **plus**: **J** (reminders: no reminder fires inside quiet hours; count bounded by `maxPerDay`); **K** (escrow: redeem→hold→approve spends exactly; decline→refund nets zero; tokens never negative; reward at limit/cooldown unavailable).
  - **Anti-shame grep/test gate:** `isAngry`, `MOCKING`, `mockeryText`, `FAILED`, "ruthless", angry-eyes, "streak broken", guilt strings, **any `Math.random` in a payout path**, **any companion re-engagement reminder string** → zero; **the trial-expiry-with-equipped-cosmetics test asserts zero visible child change**; **the analytics/mood "never leaves device" CI grep** (no fetch/upload referencing `events`/`moods` slices); **the `parentGate.mode==='none'` production-build block**.
  - **Over-claiming gate extended to ALL surfaces** (welcome, paywall, parent dashboard, in-repo store-listing copy — not just child/onboarding): forbid `treat/cure/clinically proven/fixes focus` everywhere; enforce a **fixed reviewed claims-allowlist** for parent-facing value props ("builds routines", "reduces morning conflict", "on-task behavior"). **Screen-time-as-reward is never promoted/escalated by the app** (verify no copy nudges more screen time; the currency optimizes "done and gone").
  - jest-expo smoke for gamification + streak + reinforcement + companionMood pure functions.
  - **License/asset/provenance hygiene:** `THIRD_PARTY_NOTICES.md` finalized incl. the **Bundled assets** section (every audio/font/image: source, author, license, commercial-OK); **manual asset-license review** (the JS scanner cannot see media) — **forbid CC-BY-NC/CC-Sampling+/unverifiable**; **OpenDyslexic + Fredoka + Lexend OFL-1.1 text + reserved-font-name hand-added** (locally-bundled fonts evade the scanner); `npx license-checker-rseidelsohn` scoped to **production deps only**, clean (no GPL/AGPL/LGPL; **Apache-2.0 NOTICE files preserved, not just license text**; BSD for MMKV native); **`jscpd` clone-similarity scan vs the `adhd-india` + `adhd-focus-mate` trees fails on high-similarity hits** (the string grep alone cannot detect lifted code); the `PROVENANCE.md` per-file sign-off complete (every file is `lockin`/`reference`/`original`); CI/grep guard failing on any `adhd-india`/`adhd-focus-mate` reference.
  - `_sandbox`/`_theme-gallery` dev screens removed; offline E2E of the full parent→child→reward loop; accessibility (triple-coded, ~2cm targets, contrast AA, reduced-motion).
- **Key source files to lift:** none — verification only.
- **Acceptance / how to run:** all of A–K pass on iOS + Android (web subset tagged); anti-shame grep/test gate returns zero; over-claiming gate passes on all surfaces; `npm test` green; `npm run typecheck` clean; **license scan clean (prod deps) + asset registry complete + manual asset review signed off + clone scan clean + provenance signed off**; full loop runs offline (airplane mode) on both platforms; AI off (no provider initialized, no network in core loop). (Doc 64 CP B+G consolidated.)
- **Effort:** L

---

## 5. The anti-shame / kid-safety invariants (enforced at every milestone)

Gate conditions, not features — re-checked at M4, M6, M7, M8, M10, M11, M12, M13, M15:

1. Companion only ever positive/neutral/restful (canonical `CompanionMood` union, §1b.7) — no sad/angry/sick/guilt/dying, no failure state, ever.
2. No streak `0`/"broken"/loss-aversion; progress is cumulative + forgiving (freeze → pause, never zero); a paused state leads with `cumulativeCount` and shows "best: N" only as a non-losable badge, never adjacent as a drop.
3. Base token + a **salience-appropriate** celebration on every completion is never withheld and **never reduced as a function of the child's own success/mastery** (celebration size is decoupled from reinforcement phase, §1b.3). Magnitude varies by salience and occasional deterministic UP only.
4. **No randomized payout schedule** — the bonus is a deterministic every-N, a pure function of completion count, audit-logged, never `Math.random` (§1b.4).
5. Tokens never auto-deduct; the only negatives are explicit, refundable redemptions / parent adjustments.
6. Reminders are few, gentle, quiet-hours-respecting, never guilt-toned, and **never companion-re-engagement nags** (real control = fixed reviewed copy set + grep, §1b.14).
7. Children never see a paywall; **no trial-end/decline/downgrade ever removes, hides, unequips, or alters anything the child owns or sees** — gating blocks NEW unlocks only (§1b.11); the free tier runs the full core loop.
8. **Behavioral analytics + mood logging default OFF (opt-IN), on-device-only, and provably never leave the device** (§1b.12); AI off by default; no surveillance pipelines; no `adhd-india`/`adhd-focus-mate` code shipped.
9. No over-claiming on **any** surface — market routines/behavior/relationship via the reviewed allowlist, never "treats/cures/clinically proven" (§1b.15/M15); screen-time-as-reward is never promoted/escalated.
10. The parent zone is **unreachable until the gate is configured** (§1b.8); the **purchase route requires a PIN**, and no real processor may ever ship behind the arithmetic/long-press gate (§1b.13).
11. Curated autonomy everywhere: 3–6 options (young rewards capped at 3), never an open catalog, never `'unlimited'`; cosmetic rotation is **additive only** — nothing earnable ever disappears or becomes time-limited; no FOMO countdowns; no cosmetic tied to real money.

---

## 6. Risk register (carried + updated)

| Risk | Mitigation | Owner milestone |
|---|---|---|
| The genuinely-novel native surfaces fail on New Arch / Reanimated 4 (animated SVG path/gradient, modal entering animations, TTS, audio latency) | M1 sandbox tests these FIRST and gates M6/M7 on them; named fallbacks (hand-rolled Reanimated/SVG ring for `react-native-circular-progress`) | M1 |
| `expo-av` removed in SDK 55 | Built on `expo-audio` now via imperative cue registry (§1b.1); no SDK-55 migration debt | M1, M13 |
| Offline TTS absent on some Android devices (breaks non-reader + offline promise) | Probe `getAvailableVoicesAsync()`; ship pre-recorded CC0 fallback audio + one-time voice-install prompt | M11 |
| MMKV forces a dev client (no Expo Go) | Accept dev client from day one; `storage` port keeps AsyncStorage as a config switch | M0, M3 |
| Tone debt leaks from lockin | Fresh shell + retone-on-graft + grep/clone gate at every CP; lockin is the ONLY code donor | M6, M15 |
| Novelty cliff (week 4–8) | Cosmetic rarity ladder + **additive-only** seasonal-rotation seam shipped in M4 data shape + M6/M8 hooks; appointment mechanics; "done & gone" | M4, M6, M8 |
| Companion art volume (cuddly + cool packs) | Procedural SVG + one variant prop keeps cost low; art budgeted separately | M6, M14 |
| Reinforcement thinning read as "rewards shrinking" | **Celebration size decoupled from phase** (§1b.3); only the invisible bonus cadence thins; calm mode disables thinning | M2, M4, M8 |
| Web can't run the core loop (haptics/audio) | Web is a strict subset (boot+nav+visual celebration); A–K tagged PASS-subset / N/A on web | M0, M15 |
| Gate is a speed bump, not security | COPPA-baseline by design; **PIN required on the purchase route**; no real processor may ship behind arithmetic | M9, M12 |
| Bundled media licenses untracked | Asset-license registry from M0; CC0/royalty-free only; manual M15 review (scanner is media-blind) | M0, M13, M15 |
| Lifted code from reference-only repos undetectable by grep | `jscpd` clone scan vs adhd-india/adhd-focus-mate + per-file PROVENANCE sign-off | M15 |
| Tablet target is locked but easy to skip | Responsive tokens (`contentMaxWidth`/`columns`/breakpoints) in M2; tablet smoke pass in M14 | M2, M14 |

---

## 7. How to run / verify the whole thing (quick reference)

- **iOS:** `npx expo run:ios` · **Android:** `npx expo run:android` (dev client; MMKV needs a native module).
- **Web (iteration only, strict subset):** `npx expo start --web` — boot + navigation + visual-only celebration; no haptics/audio/MMKV.
- **Typecheck:** `npm run typecheck` (`tsc --noEmit`). **Tests:** `npm test` (jest-expo: gamification + streaks + reinforcement + companionMood + bonus-determinism).
- **Anti-shame gate:** `grep -rE 'isAngry|MOCKING|mockeryText|FAILED|ruthless|streak broken' app components src` → empty; `grep -rE 'Math\.random' src/domain` (payout paths) → empty; `grep -rE 'Buddy (misses|is back|is waiting)' src/data` → empty; `grep -rE '<BubbleBuddy[^>]*ageMode|ageMode=' components app` → empty.
- **Over-claiming gate (all surfaces):** `grep -riE 'treat|cure|clinically proven|fixes focus' app components src/data` → only allowlisted parent value props.
- **Privacy gate:** no network/upload references `tb/child/.*/events` or `.../moods`; `localAnalyticsEnabled` default `false`.
- **License/asset gate:** `npx license-checker-rseidelsohn --production --summary` → no GPL/AGPL/LGPL (Apache-2.0 NOTICE files preserved); `THIRD_PARTY_NOTICES.md` Bundled-assets section complete + manually reviewed; `jscpd` vs `adhd-india`/`adhd-focus-mate` → no high-similarity hits; `grep -rE 'adhd-india|adhd-focus-mate' app components src` → empty; `PROVENANCE.md` signed off.
- **Core-loop smoke (airplane mode):** configure gate → pass gate → assign templated task (≤3 taps) → child taps Done → sub-second celebration + token → balance persists across force-quit → kill mid-routine resumes at next step.
