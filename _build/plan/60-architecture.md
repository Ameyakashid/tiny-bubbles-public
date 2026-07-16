# Tiny Bubbles — App Architecture & Scaffolding (Plan 60)

**Status:** Design doc, ready to build against.
**Date:** 2026-06-28.
**Inputs:** `_build/research/00-SYNTHESIS.md`, `_build/research/01-feature-matrix.md`, `_build/research/50-repo-fit-analysis.md`; donor code spot-checked under `_sources/` (real files/props/APIs cited inline). Locked product decisions per the design brief are treated as constraints, not relitigated.

This document specifies *how the app is built*: base-repo strategy, versions, folder layout, navigation/app-shell, state + offline storage, the age-adaptive + low-stim theming engine, and how to bootstrap/run/smoke-test. It is deliberately concrete so the next stream can scaffold without re-deciding.

---

## 0. TL;DR (the decisions)

1. **Scaffold a FRESH `create-expo-app` (SDK 54) and graft `lockin`'s good parts** — do **not** start from the `lockin` tree and retone it in place. Rationale in §1. The shame architecture in `lockin` is structural (it reaches into the sprite state machines, the AI persona, the data model, and the copy), so a clean shell + selective, retoned grafts is *less* total work and *much* lower risk than scrubbing a repo whose core mechanic is the thing we must delete.
2. **Versions:** align to `lockin`'s SDK — **Expo SDK 54, React Native 0.81.5, React 19.1, TypeScript ~5.9, expo-router ~6, NativeWind v4, Reanimated v4 + react-native-worklets.** (Exact pins in §2.)
3. **Navigation:** expo-router with three top-level route groups — `(kid)`, `(parent)`, `(onboarding)` — plus a **parental gate** modal guarding every entry into `(parent)`. Age-mode (`young`/`older`) is a global setting that selects layouts/variants *inside* `(kid)`, not a separate route tree.
4. **State:** **Zustand** stores (not React Context-per-feature like `lockin`, not MobX-State-Tree like `habit-tracker-app`), each persisted via a single storage adapter.
5. **Storage:** **MMKV** as the persistence engine behind a thin `storage` port, with a **versioned, migration-aware persistence layer**. AsyncStorage is the fallback/compat path and the migration source. Offline-first, no account, no backend by default.
6. **Theming:** one **`useThemeTokens()`** hook + a `ThemeProvider` that resolves a single token set from two orthogonal axes — **ageMode** (`young`/`older`) × **stimLevel** (`standard`/`low`) — plus a reduced-motion flag. Components consume tokens; they never branch on age inline.

---

## 1. Base-repo strategy: FRESH shell + graft (recommended)

### 1.1 The two options, honestly

**Option A — Start from `lockin`, retone in place.**
Pro: timer, sprites, notifications, onboarding, NativeWind, router already wired together and known-to-run. Fastest path to *a* running app.

Con (decisive): `lockin`'s shame/"mockery" mechanic is not a skin — it is woven through the architecture we keep:
- `components/dashboard/ScannerSprite.tsx` (the sprite **reused by the celebration overlay**, `VictoryOverlay.tsx`) has a state machine whose states include `'MOCKING'` and a `mockeryText` prop (`ScannerState = 'IDLE' | 'ANALYZING' | 'MOCKING' | 'APPROVED' | ...`). The "you won" moment is rendered by the same component that renders mockery.
- `components/dashboard/ExecutionSprite.tsx` is built around `isAngry` state with an "Angry Jump", shake, and an angry-eyes (`> <`) SVG branch as its primary interaction.
- The AI persona (`contexts/AIContext.tsx` → `services/gemini.ts`) is a "ruthless advisor"; `app/shiny-object.tsx` is a "distraction detector" that judges the user.
- The data model is shame-shaped: `types.ts` has `MilestoneStatus = 'PENDING' | 'ACTIVE' | 'COMPLETED' | 'FAILED'` (a `FAILED` state we must not have) and the whole app assumes **one immutable goal/year** (`AsyncStorage('mainGoal')`, the `(onboarding)` "ContractStep", `LockedGoal`).
- Copy is adult and punitive throughout ("MILESTONE COMPLETE / Objective met. Maintain your focus.", "war-path", "tactical-plan", "Swiss Red" `#FF3B30` palette in `tailwind.config.js`).

Retoning in place means editing ~every file while *also* keeping the app booting — and it is very easy to leave a `FAILED` branch, an angry frame, or a punitive string behind. The synthesis explicitly flags this: "treat tone reversal as a tracked, reviewed workstream, not a find-and-replace" (`00-SYNTHESIS` §6.7).

**Option B — Fresh `create-expo-app` (SDK 54 blank-typescript), graft the good parts.** ✅ **Recommended.**
We start with a clean expo-router shell whose *information architecture is correct from line one* (kid/parent/onboarding, age-mode, forgiving data model). We then port, file-by-file, only the donor pieces worth keeping, **retoning each as it lands** (a sprite isn't merged until its anger states are gone; a type isn't merged until `FAILED` is gone). Nothing punitive can survive because it is never copied in.

### 1.2 Why B wins

- **The thing we must delete is `lockin`'s core mechanic.** When the central abstraction is the liability, a clean shell is cheaper than a scrub. We keep `lockin`'s *techniques* (Reanimated sprite pattern, `AppState`-aware timer, `expo-notifications` setup) without inheriting its *intent*.
- **The IA is fundamentally different.** `lockin` is single-user, single-goal, adult. Tiny Bubbles is kid-area + parent-area + parental gate + multi-child + age modes. The router tree, data model, and state stores are new regardless; grafting onto a correct shell avoids fighting `lockin`'s `index.tsx`→`(onboarding)`→`(tabs)` assumptions.
- **We are pulling from four donors with three stacks** (`lockin` SDK 54 RN; `habit-tracker-app` SDK 50 Ignite/MobX; `tether` Electron TS; `momentum` React/Node). There is no single tree to "start from" anyway — `habit-tracker-app`, `tether`, and `momentum` are *all* grafts no matter what. Only `lockin` is a candidate base, and its base value (the wiring) is modest relative to its tone debt.
- **License hygiene is cleaner.** A fresh repo gets a fresh MIT `LICENSE` + a `THIRD_PARTY_NOTICES` attribution file listing each donor's MIT copyright. `adhd-india` (no license) and `adhd-focus-mate` (no LICENSE file) are **reference-only**; a clean shell makes it structurally obvious nothing from them is shipped.

**Cost of B:** we re-wire the app shell (~a day: router groups, providers, fonts, splash, NativeWind/Metro/Babel config — all small, copied near-verbatim from `lockin`'s `_layout.tsx`, `babel.config.js`, `metro.config.js`, `global.css`). This is bounded and front-loaded, versus the unbounded, easy-to-get-wrong scrub of Option A.

### 1.3 Concrete migration / graft plan

Assembly order (extends `50-repo-fit` §4 with the fresh-shell decision):

| Step | Action | Source → Target | Retone gate before merge |
|---|---|---|---|
| 0 | `npx create-expo-app@latest tiny-bubbles -t expo-template-blank-typescript`, then add expo-router, NativeWind v4, Reanimated v4. | — | — |
| 1 | Copy build config verbatim. | `lockin` `babel.config.js`, `metro.config.js`, `global.css`, `tailwind.config.js` → root | Replace `swiss.red` palette with kids tokens (§7). |
| 2 | Stand up the router shell + providers. | adapt `lockin` `app/_layout.tsx` (fonts, `GestureHandlerRootView`, splash, notif registration) → `app/_layout.tsx` | Drop `AIProvider` from the default tree (AI off by default); wrap in our `ThemeProvider` + `StoreHydrationGate` instead. |
| 3 | Build the new IA (empty screens): `(onboarding)`, `(kid)`, `(parent)`, parental-gate modal. | new | n/a |
| 4 | Port the companion sprite *pattern* as `BubbleBuddy`. | `lockin` `components/dashboard/ExecutionSprite.tsx` (Reanimated shared-values + `withRepeat` breathing) | **Delete** `isAngry`, angry-jump, angry-eyes SVG, `MOCKING`/`mockeryText`. Buddy has only neutral/happy/celebrate/sleepy states. Redraw SVG as a bubble. |
| 5 | Port the celebration. | `lockin` `VictoryOverlay.tsx` (`Modal` + `ZoomIn`/`SlideInDown`/`FadeIn`) | Swap `ScannerSprite state="APPROVED"` for `BubbleBuddy state="celebrate"`; replace copy; bright bg not `bg-black/90`. |
| 6 | Port the gamification engine. | `tether` `GamificationService.ts` + `shared/types.ts` (`Badge`,`Quest`,`DockTheme`,`PointEarningEvent`) | Strip `electron`/`fs`/`tsyringe`/`Logger`; reimplement persistence via our `storage` port; **no streak-loss penalties**, points are cumulative-only. |
| 7 | Port streak math. | `momentum` `backend/src/lib/streaks.ts` (timezone-aware, increment-if-yesterday, **never below 1**) | Strip Prisma reads; feed dates in. Frame as forgiving/cumulative; no "streak broken: 0". |
| 8 | Graft UI kit + pickers + charts. | `habit-tracker-app` `app/components/*`, `screens/create-new-habit.tsx` (emoji/color/day/time pickers), `home.tsx` (`AnimatedCircularProgress`), `statistics.tsx` (gifted-charts), `utils/storage/storage.ts` | Re-verify picker libs on SDK 54 (they are SDK 50); reskin terracotta→kids palette. |
| 9 | Wire real notifications. | `lockin` `services/notifications.ts` + `focusNotification.ts` | Few, tunable, quiet-hours-respecting, never guilt-toned (§4 avoid-list). |
| 10 | (later) Mood selector, AI chunking (off by default). | `momentum` `MoodSelector.tsx`; `sidejot` chunking prompt | Kid emoji faces; AI gated behind parent + off by default. |

**License artifacts (do at step 0):** ship our own MIT `LICENSE`; add `THIRD_PARTY_NOTICES.md` crediting `lockin` (©2025 adhd.dev), `habit-tracker-app` (©2024 takanome-dev), `tether` (©2025 Aarsh Shah), `momentum` (©2024 Vishal). Do **not** copy any file from `adhd-india` or `adhd-focus-mate`.

---

## 2. Versions & toolchain

Align to `lockin`'s verified-working SDK 54 set (do not downgrade to `habit-tracker-app`'s SDK 50 — we lift its *components*, not its shell, per `50-repo-fit` §4.4).

| Layer | Pin | Source / note |
|---|---|---|
| Expo SDK | `expo` `~54.0.0` | matches `lockin` |
| React Native | `0.81.5` | matches `lockin` |
| React / React DOM | `19.1.0` | matches `lockin` |
| TypeScript | `~5.9.2` (strict) | matches `lockin` |
| expo-router | `~6.0` (`typedRoutes: true`) | matches `lockin` `app.json` experiments |
| NativeWind | `^4.0` + `tailwindcss ^3.4` | `lockin` `tailwind.config.js` + `metro.config.js` `withNativeWind` |
| Reanimated | `~4.1` + `react-native-worklets 0.5.1` | sprite/timer animations; Babel plugin required |
| react-native-svg | `15.12.1` | sprite art |
| gesture-handler / screens / safe-area / pager | `~2.28` / `~4.16` / `~5.6` / `^8.0` | router + sprite interactions |
| Storage | **`react-native-mmkv` ^3** (primary) + `@react-native-async-storage/async-storage 2.2.0` (compat/migration) | §6 |
| State | **`zustand` ^5** | §5 |
| Multisensory | `expo-haptics ~15`, `expo-av ~16`, `expo-speech` (TTS for non-readers — **add**, not in `lockin`), `expo-sensors ^15` | celebration + spoken labels |
| Notifications | `expo-notifications ^0.32`, `@notifee/react-native ^9` | `lockin` services |
| Pickers/charts | `rn-emoji-keyboard`, `reanimated-color-picker`, `@react-native-community/datetimepicker ^8.5`, `react-native-circular-progress`, `react-native-gifted-charts` | from `habit-tracker-app`; re-verify on SDK 54 |
| Dev client | `expo-dev-client ~6.0` | needed for `@notifee/*` + MMKV (custom native modules → cannot use stock Expo Go for those; see §8) |

**Drop from `lockin`'s deps:** `expo-ai-kit`, `@google/genai`, `expo-media-library` (surveillance-adjacent), `@bacons/apple-targets`, `@expo/ngrok`. Keep AI fully out of the default dependency graph; if/when the (later) AI chunking feature ships, it's parent-gated and off by default (`feature-matrix` #23).

**Babel/Metro (copy from `lockin`):**
```js
// babel.config.js
presets: [["babel-preset-expo", { jsxImportSource: "nativewind" }], "nativewind/babel"],
plugins: ["react-native-reanimated/plugin"],   // must be last
// metro.config.js
module.exports = withNativeWind(getDefaultConfig(__dirname), { input: "./global.css" });
```

---

## 3. Folder layout (full)

expo-router file-based routing. New, kid-correct IA; donor code lands under `src/` (logic) and `components/` (UI), keeping `app/` as pure routing.

```
tiny-bubbles/
  app/                              # expo-router routes ONLY (thin screens)
    _layout.tsx                     # root: fonts, splash, providers, hydration gate, notif register
    index.tsx                       # boot router → onboarding | kid home (reads onboarding flag)
    (onboarding)/
      _layout.tsx
      welcome.tsx                   # parent-facing intro (honest, no over-claiming)
      child-setup.tsx               # name, age → sets ageMode; pick/name the buddy
      first-task.tsx                # seed 1 templated task so the loop works on day 1
      done.tsx
    (kid)/                          # CHILD AREA — calm canvas, default landing after onboarding
      _layout.tsx                   # picks young/older shell via ageMode (Tabs vs single-surface)
      index.tsx                     # "today's bubbles" — one-step-at-a-time routine runner
      celebrate.tsx                 # full-screen reward moment (modal route)
      buddy.tsx                     # the companion + its room/cosmetics
      rewards.tsx                   # redeem tokens for caregiver-set rewards (curated 3-6)
      calm.tsx                      # non-gamified / calm path (soundscape, breathing)
    (parent)/                       # PARENT AREA — gated (see (gate))
      _layout.tsx
      dashboard.tsx                 # kids overview, light progress
      children.tsx                  # multi-child profiles, per-child ageMode
      tasks.tsx                     # assign/templated tasks (2-3 taps)
      rewards-setup.tsx             # define real-world backup rewards + token costs
      settings.tsx                  # stim level, sound/haptics, quiet hours, AI off, data
      paywall.tsx                   # DESIGNED free/premium gate (mock purchase, no processor)
    (gate)/
      parental-gate.tsx             # modal: math/long-press challenge before (parent)
  components/
    buddy/                          # BubbleBuddy.tsx (+ states), BuddyRoom.tsx  [from lockin sprites, retoned]
    celebration/                    # CelebrationOverlay.tsx, Confetti.tsx       [from lockin VictoryOverlay]
    task/                           # StepCard.tsx, TaskRunner.tsx, DoneButton.tsx, AddStep.tsx
    rewards/                        # TokenMeter.tsx, RewardCard.tsx, BadgeGrid.tsx [tether tabs, reskinned]
    progress/                       # BubbleMeter.tsx (endowed-progress), StreakRing.tsx
    pickers/                        # EmojiPicker.tsx, ColorPicker.tsx, TimePicker.tsx [habit-tracker-app]
    ui/                             # Button, Card, Text, Toggle, Screen, SpokenLabel [Ignite kit + TTS]
    mood/                           # MoodSelector.tsx [momentum, later]
  src/
    theme/                          # tokens.ts, ThemeProvider.tsx, useThemeTokens.ts   (§7)
    state/                          # zustand stores: childStore, taskStore, rewardStore,
                                    #   settingsStore, buddyStore, sessionStore           (§5)
    storage/                        # mmkv.ts (adapter), persist.ts (zustand middleware),
                                    #   migrations.ts, schemaVersion.ts                    (§6)
    domain/                         # pure logic (no RN imports):
                                    #   gamification.ts [tether port], streaks.ts [momentum port],
                                    #   tasks.ts, tokens.ts, types.ts (forgiving model)
    services/                       # notifications.ts, focusNotification.ts [lockin],
                                    #   tts.ts [expo-speech], haptics.ts, sound.ts,
                                    #   purchases.ts (MOCK — stub IAP), audio assets
    data/                           # task templates, reward presets, buddy cosmetics, copy strings
    constants/                      # ageMode, stimLevel, storage keys
  assets/                           # icons, images, sounds/, buddy svg sources
  app.json  eas.json  babel.config.js  metro.config.js  tailwind.config.js
  global.css  tsconfig.json  LICENSE  THIRD_PARTY_NOTICES.md
```

Principle: **`app/` screens are thin** (layout + hooks into stores); all reusable logic lives in `src/domain` (RN-free, unit-testable) and `src/state`. This is the opposite of `lockin`, which puts business logic directly in screens and feature-local contexts (`app/focus-zone/_context.tsx`) — a structure that made its tone debt hard to excise.

---

## 4. Navigation & app shell

### 4.1 Route groups & the gate

Three top-level groups under the root `Stack` (modeled on `lockin`'s `app/_layout.tsx` Stack, restructured):

```
Stack (headerShown:false)
├─ index               → boot redirect
├─ (onboarding)        → first-run parent+child setup
├─ (kid)               → DEFAULT landing; child-safe; no exit to parent without gate
├─ (gate)/parental-gate→ presentation:'modal' (challenge)
└─ (parent)            → presentation:'modal' or pushed AFTER gate passes
```

- **Boot (`app/index.tsx`)** mirrors `lockin`'s pattern (read a flag from storage, `<Redirect>`), but reads from our hydrated `settingsStore`: if `!hasOnboarded` → `(onboarding)`; else → `(kid)`. The child always lands in the kid area.
- **The kid cannot reach the parent area without the gate.** Any "for grown-ups" affordance in `(kid)` routes to `(gate)/parental-gate` first. On success the gate sets a short-lived in-memory `parentUnlocked` flag (cleared on app background / after N minutes) and navigates to `(parent)`. The gate is intentionally *not* a real auth wall — it is a COPPA-baseline "are you a grown-up" speed bump (`feature-matrix` #10). Implementation: a randomized arithmetic challenge ("what is 7 + 4?") or a timed long-press, concept from `medtimer` `Biometrics.kt`; **no biometrics required** so it works offline/no-account.

### 4.2 Onboarding flow

Reuse `lockin`'s multi-step wizard *mechanics* (`app/(onboarding)/index.tsx`: local `step` state, progress dots, `handleNext`/`handleBack`, persist-then-`router.replace`) but replace the content entirely (no "lock in one immutable goal/year ContractStep"). New steps:
1. **welcome** — honest framing ("helps build routines & reduce morning conflict"; *never* "treats ADHD", per avoid-list #6).
2. **child-setup** — child name + **age → sets `ageMode`** (`4-7`→`young`, `8-12`→`older`); name/customize the buddy (autonomy, SDT).
3. **first-task** — seed one templated task so the core loop is live on first open (beats the empty-state cliff).
4. **done** — write `hasOnboarded=true` to `settingsStore`, `router.replace('/(kid)')`.

Everything is **spoken aloud** via `services/tts.ts` so a non-reader child can participate in child-setup.

### 4.3 How age-mode flows through navigation/layouts

Age-mode is **one global (per-child) value**, not a parallel route tree. `(kid)/_layout.tsx` reads `ageMode` from the active child and chooses the *shell*:

- **`young` (~4-7):** single-surface, **no tab bar** (reduce navigation load) — the routine runner *is* the home; buddy + rewards reached via 1-2 oversized icon buttons. One step on screen at a time, picture/icon/color + spoken label first. Simplest one-step loop.
- **`older` (~8-12):** a small `Tabs` shell (Today / Buddy / Rewards / Calm), more text allowed, more customization surfaces, a less "childish" buddy variant.

Crucially, the **same screen components** (`TaskRunner`, `CelebrationOverlay`, `RewardCard`) render in both modes; they pull sizing/copy/voice-first behavior from theme tokens (§7), so age-mode is an *architectural input to layout/theme*, not a fork of screens. Switching a child's age mode (parent setting) re-renders the kid shell with no data migration.

### 4.4 Root providers (order matters)

```
GestureHandlerRootView
└─ SafeAreaProvider
   └─ StoreHydrationGate            # blocks UI until MMKV-persisted zustand stores rehydrate
      └─ ThemeProvider              # resolves tokens from ageMode × stimLevel × reducedMotion
         └─ Stack (expo-router)
```
`AIProvider` from `lockin` is **omitted** from this tree (AI off by default). Notification registration (`registerForPushNotificationsAsync`) runs in a `useEffect` in the root layout exactly as `lockin` does, but is **deferred until after onboarding** so a child's first screen is not a permission prompt.

---

## 5. State management

### 5.1 What the donors do (and why we don't copy it)

- **`lockin`:** React Context per feature (`AIContext`, `focus-zone/_context.tsx`) + **ad-hoc `AsyncStorage` reads/writes scattered across screens** (e.g. `(onboarding)/index.tsx` writes `mainGoal`/`motivation`/`hasOnboarded`; `_context.tsx` hand-rolls `milestoneStack`/`activeMilestone` JSON). Works, but state is implicit, untyped at the boundary, and duplicated — hard to test and hard to retone.
- **`habit-tracker-app`:** MobX-State-Tree, but its `RootStore` is **empty** (screens use mock arrays) — no real pattern to inherit.
- **`tether`:** plain-TS service classes + a `useGamification` hook (good *engine* shape, Electron-bound).
- **`momentum`:** TanStack Query against a server (not applicable offline-first).

### 5.2 Recommendation: Zustand + persist middleware

Use **Zustand** (small, hook-first, no provider boilerplate, trivial to persist and to unit-test the actions). One store per bounded context, each persisted through our storage adapter (§6):

| Store | Owns | Persisted keys |
|---|---|---|
| `settingsStore` | `hasOnboarded`, `ageMode` default, `stimLevel`, sound/haptics on, quiet hours, `aiEnabled=false`, premium/entitlement (mock) | `tb.settings` |
| `childStore` | child profiles `[{id,name,ageMode,buddyId,...}]`, `activeChildId` | `tb.children` |
| `taskStore` | task templates instantiated per child, today's steps, completion log | `tb.tasks` |
| `rewardStore` | tokens balance, caregiver-set rewards, redemptions, badges/quests/themes (tether engine state) | `tb.rewards` |
| `buddyStore` | buddy name, cosmetics owned/equipped, mood (never sad/dying) | `tb.buddy` |
| `sessionStore` | **in-memory only** — current step index, `parentUnlocked` flag, timer runtime | not persisted |

The **domain logic stays pure** in `src/domain/*` (e.g. `gamification.awardTokens(state, event)` returns new state); stores are thin wrappers that call domain functions and persist. This makes the retoned `tether`/`momentum` ports testable without RN and keeps the "never punishing" invariants in one place (e.g. `streaks.ts` clamped to a 1-floor, no `FAILED` status anywhere in `domain/types.ts`).

---

## 6. Offline-first storage, persistence & migration

### 6.1 Engine: MMKV (primary), AsyncStorage (compat/migration)

Both base repos use **AsyncStorage only**. We upgrade to **`react-native-mmkv`** as the primary engine because:
- It's synchronous and ~30x faster — important for a kid app that reads tokens/steps on every "done" tap and must feel instant (multisensory feedback is sub-second per the science).
- Synchronous reads let `StoreHydrationGate` hydrate without async flicker.
- Trade-off: MMKV is a custom native module, so it needs a **dev/EAS build** (cannot run in stock Expo Go — see §8). We accept this because `@notifee/react-native` (live timer notification) *already* forces a dev client.

We hide the engine behind a single port so it can be swapped:
```ts
// src/storage/mmkv.ts
export const storage = {
  getString(k): string | null
  set(k, v: string): void
  delete(k): void
}  // wraps MMKV; an AsyncStorage-backed shim implements the same shape for web/fallback
```
`habit-tracker-app`'s `utils/storage/storage.ts` (`load`/`save`/`loadString`/...) is the API shape to mirror, but backed by MMKV.

### 6.2 Persistence: zustand `persist` over the port

Each persisted store uses Zustand's `persist` middleware with our adapter as `storage`, a `name` (the `tb.*` key), and a **`version`** number. `partialize` excludes ephemeral fields.

### 6.3 Versioned migration strategy

- A top-level **`schemaVersion`** key (`tb.schemaVersion`) plus per-store `version` in the persist config.
- **`src/storage/migrations.ts`** exports an ordered list of pure migration functions `(oldState, fromVersion) => newState`. Zustand's `migrate` callback runs them on rehydrate. Each migration is forward-only and total (handles missing fields).
- **One-time AsyncStorage→MMKV import** at first launch: if `tb.schemaVersion` is absent but legacy AsyncStorage keys exist, copy them across, then stamp the version. (This also future-proofs OTA users coming from any earlier prototype.)
- **Safety:** migrations never delete a child's tokens/progress (forgiving/cumulative is a product invariant); on a corrupt/unparseable blob, fall back to defaults rather than crash, and never reset to a "punishing" zeroed state silently.

### 6.4 No backend by default

No account, no network calls in the core loop (privacy posture for a kids' product, `00-SYNTHESIS` §5). The mock purchase (§ paywall) writes an entitlement flag to `settingsStore` locally — no payment processor in MVP. Optional future sync (multi-device, `feature-matrix` #15) is an additive layer behind the same `storage` port, not a rewrite.

---

## 7. Age-adaptive + low-stim theming engine

The single most architecturally important concern (age-adaptive is first-class). One component must render `young` vs `older` vs low-stim **without inline branching**.

### 7.1 Two orthogonal axes + reduced-motion

- **`ageMode`**: `'young' | 'older'` (per active child).
- **`stimLevel`**: `'standard' | 'low'` (a parent/child accessibility toggle — the "calm/non-gamified-friendly" visual mode; distinct from the `(kid)/calm.tsx` route).
- **`reducedMotion`**: boolean (honor OS setting; pattern from `momentum` `hooks/useReducedMotion.ts`).

These compose into **one resolved token set**. 2 × 2 = a small, enumerable matrix, not a combinatorial explosion, because tokens are derived, not hand-authored per combo.

### 7.2 Token shape

```ts
// src/theme/tokens.ts
interface ThemeTokens {
  // scale — young is bigger/chunkier
  touchTargetMin: number;        // young ~64 (≈2cm+), older ~48
  fontScale: number;             // young 1.25, older 1.0
  radius: number; spacing: (n:number)=>number;
  // surface — low-stim is calmer/lower-contrast, fewer accents
  colors: { canvas; surface; primary; accent; success; text; textDim; tokenGold };
  // behavior flags consumed by components
  textFirst: boolean;            // older true; young false (icon/picture first)
  spokenLabelDefault: boolean;   // young true (auto-speak); older false
  showLabels: boolean;           // young: minimal text
  celebrationIntensity: 'full' | 'gentle';   // low-stim & reducedMotion → 'gentle'
  confetti: boolean;             // false when stimLevel='low' or reducedMotion
  animationDurationScale: number;// reducedMotion → 0 (instant), low → 0.7
  haptics: 'rich' | 'light' | 'off';
  soundscapeDefault: boolean;
}
```

### 7.3 Resolution & consumption

```ts
// src/theme/useThemeTokens.ts
export function useThemeTokens(): ThemeTokens {
  const { stimLevel } = useSettings();
  const ageMode = useActiveChild(s => s.ageMode);
  const reducedMotion = useReducedMotion();      // OS + manual
  return useMemo(() => resolveTokens({ ageMode, stimLevel, reducedMotion }), [ageMode, stimLevel, reducedMotion]);
}
```
`resolveTokens` starts from an `ageMode` base, then *applies* `stimLevel='low'` and `reducedMotion` as **reducers** (dampen colors, kill confetti, shorten/zero animations, soften haptics). A single source of truth.

**Component rule:** components call `useThemeTokens()` and read values; they **never** read `ageMode`/`stimLevel` directly. Example — the same `DoneButton`:
```tsx
const t = useThemeTokens();
<Pressable style={{ minHeight: t.touchTargetMin, borderRadius: t.radius }}
           onPress={() => { fireCelebration(t.celebrationIntensity); if (t.haptics!=='off') haptic(t.haptics); }}>
  {t.textFirst ? <Text>Done!</Text> : <BigCheckIcon/>}
  {t.spokenLabelDefault && <SpokenLabel text="Done!" autoSpeak/>}
</Pressable>
```
`CelebrationOverlay` reads `t.confetti`/`t.celebrationIntensity`/`t.animationDurationScale` to scale the ported `VictoryOverlay` animations down to "gentle" for low-stim/reduced-motion — same component, no `if (young)` anywhere.

### 7.4 NativeWind integration

Tailwind config defines the **kids palette** (replacing `lockin`'s `swiss.red`). Color *values* per mode are exposed as CSS variables in `global.css` and swapped by a top-level class set by `ThemeProvider` (e.g. `tb-young tb-stim-low`), so NativeWind utility classes resolve to mode-correct colors while numeric tokens (sizes/durations) come from `useThemeTokens()`. This keeps styling ergonomic (className) while the hook drives behavior/scale.

### 7.5 Spoken-label architecture (non-readers)

`services/tts.ts` wraps `expo-speech`. A `<SpokenLabel>` primitive (and an `onPress`-speak affordance on every interactive element) reads its label aloud; in `young`/`spokenLabelDefault` it can auto-speak on focus. This makes "everything spoken aloud" a *component-level* guarantee, not per-screen wiring. `expo-speech` is a **new dependency** (not in any donor) and is part of the theming/age-mode system.

---

## 8. Bootstrap, run, and smoke-test

### 8.1 Bootstrap

```bash
npx create-expo-app@latest tiny-bubbles -t expo-template-blank-typescript
cd tiny-bubbles
npx expo install expo-router react-native-safe-area-context react-native-screens \
  react-native-gesture-handler react-native-reanimated react-native-worklets \
  expo-haptics expo-av expo-speech expo-notifications expo-dev-client expo-font expo-splash-screen
npm i nativewind tailwindcss@^3.4 zustand react-native-mmkv react-native-svg \
  @notifee/react-native @react-native-async-storage/async-storage date-fns
npx tailwindcss init    # then paste lockin's tailwind.config.js (kids palette) + babel/metro/global.css
```
Set `app.json`: `expo.scheme`, `experiments.typedRoutes:true`, `plugins:["expo-router","expo-font","expo-notifications"]`, `ios.supportsTablet:true` (kept from `lockin`), Android `package`, portrait. `main` stays `expo-router/entry`.

### 8.2 Run targets

- **iOS simulator:** `npx expo run:ios` (dev client — required because MMKV + Notifee are custom native modules; stock Expo Go won't load them).
- **Android emulator:** `npx expo run:android`.
- **Physical device:** build a **dev client** (`eas build --profile development` or `expo run:*` once) then `npx expo start --dev-client` and scan. *Plain Expo Go works only if MMKV/Notifee are temporarily stubbed*; plan for a dev client from day one.
- **Web:** `npx expo start --web` (Metro web, kept from `lockin` `app.json`). Web uses the AsyncStorage/in-memory shim behind the `storage` port (MMKV has no web backend) and degrades haptics/notifications gracefully — useful for fast UI iteration on the theming engine, **not** the target runtime.
- **EAS:** keep `lockin`'s `eas.json` profiles (development/preview/production) as a starting point.

### 8.3 Smoke-test plan

A. **Boots clean** on iOS sim, Android emulator, and web; custom splash → onboarding (first run) → kid home (subsequent runs). No red box; `npm run typecheck` passes.
B. **Core loop works offline (airplane mode):** parent (after passing the gate) assigns a templated task in ≤3 taps → child sees one step with icon + spoken label → tapping **Done** fires *immediately* (sub-second) an animation + sound + haptic + token payout (`CelebrationOverlay`) → token balance increments and persists.
C. **Persistence/migration:** complete a task, force-quit, relaunch → tokens, buddy, and progress survive (MMKV rehydrate); bump a store `version` locally and confirm the migration runs without data loss.
D. **Parental gate:** from kid area, the "grown-ups" affordance always routes through the challenge; failing it does not reach `(parent)`; backgrounding clears `parentUnlocked`.
E. **Age-mode:** flip a child `young↔older` in parent settings → kid shell changes (tabbed vs single-surface), touch targets/font scale change, text-first toggles — **same screens**, no crash, no data reset.
F. **Low-stim & reduced-motion:** enabling low-stim (or OS reduce-motion) removes confetti, dampens colors, and shortens/zeros animations across celebration + transitions; sound/haptics respect their toggles.
G. **Anti-shame invariants (the critical kid-safety gate):** grep the shipped tree for forbidden remnants — `isAngry`, `MOCKING`, `mockeryText`, `FAILED`, "ruthless", angry-eyes SVG — must return **zero**. Miss a task day → no "streak broken: 0", buddy never sad/sick/dying, no guilt notification. Tokens never decrease except via an explicit, child-initiated reward redemption.
H. **AI off by default:** no AI provider initialized, no network call in the core loop (verify with airplane mode + no `@google/genai` in the dependency graph).
I. **Mock paywall:** premium gate renders, "purchase" is a stub that flips a local entitlement flag — no real processor, no network.

---

## 9. Open risks / decisions to revisit

1. **MMKV vs Expo Go DX.** MMKV forces a dev client. If a stakeholder needs zero-build Expo-Go demos, keep an AsyncStorage build flag behind the `storage` port (the port makes this a config switch, not a rewrite). Recommendation: accept dev client (Notifee needs it anyway).
2. **Picker libs on SDK 54.** `habit-tracker-app`'s `rn-emoji-keyboard` / `reanimated-color-picker` / `datetimepicker` are SDK-50-era; re-verify against SDK 54 / RN 0.81 / Reanimated v4 at graft time (step 8); have simple fallbacks ready.
3. **Sprite art volume.** Redrawing `lockin`'s SVG sprites into a friendly `BubbleBuddy` with young/older variants is real design work (`feature-matrix` rates companion Med–High). Keep the *animation architecture* (shared values, `withRepeat` breathing, state-driven expression) and budget art separately.
4. **Web is iteration-only.** MMKV/Notifee/haptics degrade on web; do not treat web as a shippable target — it exists for fast theming/age-mode iteration.
5. **Gate strength.** The arithmetic/long-press gate is a COPPA-baseline speed bump, not security; if a future requirement needs real protection, the modal can be upgraded to a parent PIN without touching the route structure.
6. **Multi-child + sync (post-MVP).** The store/`storage`-port design anticipates `feature-matrix` #15, but cross-device sync is explicitly out of MVP scope; revisit when retention is proven.
```
