# Tiny Bubbles — Stitching / Assembly Plan

**Doc 64 · Assembly mechanics for combining the donor repos**
*Compiled 2026-06-28. Companion to `00-SYNTHESIS.md`, `01-feature-matrix.md`, `50-repo-fit-analysis.md`. Every file/version/prop reference below was verified against the actual code under `/Users/ameyakashid/Desktop/adhd india/_sources/`.*

This is the concrete "how to physically combine the four repos" plan: assembly order, dependency reconciliation, what to strip, license attribution, and a low-risk integration sequence with runnable checkpoints. It assumes the locked product decisions (RN+Expo, offline-first, no account by default, age-adaptive `young`/`older`, never-punishing token economy, designed-but-stubbed paywall).

---

## 0. The four repos at a glance (verified)

| Repo | Role | Stack (verified from package.json) | What we take | What we DROP |
|---|---|---|---|---|
| **lockin** (`_sources/lockin`) | **BASE** | Expo `^54.0.0`, RN `0.81.5`, React `19.1.0`, expo-router `~6.0.21`, NativeWind `^4`, Reanimated `~4.1.1` + worklets `0.5.1`, react-native-svg `15.12.1`, AsyncStorage `2.2.0` | Router shell, companion sprites, focus timer, milestone/task UI, onboarding scaffold, notifications, NativeWind theming | Shame/mockery sprite states, "ruthless advisor" Gemini AI, rigid one-goal model, war/tactical framing, swiss-red palette |
| **habit-tracker-app** (`_sources/habit-tracker-app`) | UI DONOR | Expo `^50.0.0`, RN `0.73.4`, React `18.3.1`, Reanimated `~3.6.0`, svg `14.1.0`, MobX-State-Tree, react-navigation v6 (Ignite) | Ignite component kit, emoji/color/time pickers, progress rings, charts, settings scaffold, theme tokens | The app SHELL (MST stores, react-navigation, i18n, reactotron, apisauce) — lift components, not the shell |
| **tether** (`_sources/tether`) | LOGIC DONOR | Electron + plain TS (Node `fs`, `tsyringe`, `electron`) | `GamificationService.ts` (points/badges/quests/themes), gamification types, Rewards tab UIs, `useGamification` shape | **All** surveillance: `monitors/*`, `ActivityLogger`, `ActivityMonitoringService`, `WorkPatternAnalyzer`, `NotificationTracker`, `ChatService`, `LLMService`, `PythonServerService`, `server/` (Flask), `rag/` |
| **momentum** (`_sources/momentum`) | LOGIC DONOR | Monorepo: React+Vite frontend, Fastify+Prisma backend | `lib/streaks.ts` math, `MoodSelector.tsx`, `SubtaskForm.tsx` | **Entire backend** (Prisma/Fastify/JWT/bcrypt), auth, analytics server, react-query plumbing |

**Net architecture:** lockin stays the app (expo-router, NativeWind, new-architecture/Reanimated 4). habit-tracker contributes *components ported up to SDK 54*. tether + momentum contribute *pure logic + reskinned leaf components* — no Electron, no server, no Prisma ever ships.

---

## 1. Exact step-by-step ASSEMBLY ORDER

> Each numbered phase ends at a **CHECKPOINT** where the app must still launch and run on both iOS and Android. Do not start phase N+1 until phase N's checkpoint passes. See §5 for the full checkpoint protocol.

### Phase 0 — Base bring-up (lockin as-is)
1. Fork/copy `_sources/lockin` to the new project root `tiny-bubbles/`. Pick ONE package manager (lockin ships both `bun.lock` and `package-lock.json` — delete one; recommend **npm** for Expo tooling parity, delete `bun.lock`).
2. `npm install`, then `npx expo install --fix` to pin every Expo-managed dep to the exact SDK 54 version.
3. Boot it (`npx expo start`, run iOS + Android). → **CHECKPOINT A: lockin runs unmodified.**

### Phase 1 — Strip & retone lockin (remove shame/AI/rigid-goal BEFORE adding anything)
Do the destructive cleanup first, so we never build on top of code we will delete (see §3 for the exact file list). After this phase the app is a calm, neutral skeleton with positive-only sprites and flexible tasks. → **CHECKPOINT B: stripped lockin still runs; no mockery/AI/"cannot be changed" paths reachable.**

### Phase 2 — Rebrand + age-mode foundation (first-class, not an afterthought)
4. Replace the `swiss` palette in `tailwind.config.js` with the bright "bubble" palette; rename token usages.
5. Introduce an **`AgeModeContext`** (`young` ~4–7 / `older` ~8–12), parent-set per child, persisted in AsyncStorage. Establish the convention NOW: every component grafted later accepts/consumes age mode (icon-first + `expo-speech` spoken labels for `young`; more text/customization for `older`). → **CHECKPOINT C: app themed; toggling age mode visibly changes label/text density on the home screen.**

### Phase 3 — Graft the habit-tracker-app component kit + pickers + charts + settings
6. Vendor `app/theme/{colors,spacing,typography,timing}.ts` (reskin colors to the bubble palette) and a tiny `translate` shim (replace Ignite's i18n-js with a passthrough so `tx`/`text` props work without dragging i18n).
7. Lift only the leaf components actually needed — `Button, Card, Text, TextField, Toggle, Screen, Header, EmptyState, Icon, ListItem` (from `app/components/`). Strip every `reactotron`/MST/`apisauce` import; these components depend on theme tokens + the translate shim only, **not** on the MST root store.
8. Install + verify the picker/chart libs at SDK-54-compatible versions (see §2). Wire them into a throwaway sandbox screen first.
9. Lift `create-new-habit.tsx`'s picker pattern (emoji via `rn-emoji-keyboard`, color via `reanimated-color-picker`, day-of-week + `@react-native-community/datetimepicker`) into the parent task-builder; lift `home.tsx`'s `AnimatedCircularProgress` for the bubble-fill ring; lift `settings.tsx` as the settings scaffold; charts (`statistics.tsx`, `react-native-gifted-charts`) are v1 fast-follow. → **CHECKPOINT D: pickers, a progress ring, and the settings scaffold render and respond inside the running app.**

### Phase 4 — Port the tether gamification engine to AsyncStorage
10. Copy `GamificationService.ts` and the gamification slice of `shared/types.ts`. Rewrite persistence: replace `electron` `app.getPath('userData')` + `fs.readFile/writeFile` with `AsyncStorage.getItem/setItem('gamification', JSON)`; replace `tsyringe` `@injectable`/DI with a plain singleton module; delete the `Logger` import (use `console`); replace `uuid` with `expo-crypto`'s `Crypto.randomUUID()`.
11. Re-tone the seed content for kids/token-economy: `DOCK_THEMES` → companion skins/accessories with `unlockCost`+`rarity`; `DEFAULT_BADGES`/`DEFAULT_QUESTS` → kid-friendly, **never** time-shaming (drop "Night Owl 2h after 9PM"); rename `points` semantics to "bubbles/tokens"; keep `awardPoints`, `unlockTheme`, `setDockTheme`, level math.
12. Re-implement `useGamification.ts` against the local service: it currently calls `window.electron.gamification.*` over IPC — swap each call for a direct `await gamificationService.*` (keep the same hook surface: `data, awardPoints, unlockTheme, applyTheme, ...`).
13. Reuse lockin's `VictoryOverlay.tsx` (verified `ZoomIn`/`SlideInDown`/`FadeIn` modal) as the celebration moment + add a confetti lib. Reskin the Rewards tabs (`BadgesTab/QuestsTab/StatsTab/ThemesTab`) to RN/NativeWind from their Electron CSS. → **CHECKPOINT E: tapping "done" awards a token, fires the celebration, and the balance persists across an app restart.**

### Phase 5 — Port momentum streak / mood / add-a-step
14. Lift `lib/streaks.ts` as a **pure function**: it currently does two `prisma.user.findUnique`/`update` reads. Refactor to `computeStreak({ lastCompletionDate, currentStreak }, tz): { streakDays, wasReset }` using the existing `date-fns` + `date-fns-tz` `toZonedTime`/`startOfDay`/`differenceInDays` logic; the caller reads/writes AsyncStorage. **Apply the forgiving rule here:** never surface `wasReset` as "Streak broken: 0" — use cumulative/"3 of 5" framing and grace days (see §3).
15. Port `MoodSelector.tsx` (web `<button>`/Tailwind → RN `Pressable`/NativeWind; keep the 4-mood model, swap to kid emoji faces, add spring tap + spoken label in `young` mode). Port `SubtaskForm.tsx`'s one-tap "add a step" affordance (drop `useCreateTaskMutation`/react-query/toast; use local state + the milestone store). → **CHECKPOINT F: forgiving streak counter, mood check-in, and "add a step" all work and persist.**

### Phase 6 — Wire the core loop + monetization stub + license hygiene
16. Assemble the loop end to end: parent assigns templated task → child runs one-step-at-a-time routine (lockin `MilestoneCard/MilestoneStack`) → "done" tap → `VictoryOverlay` + `awardPoints` token → token nurtures companion (sprite) / redeems for caregiver-set backup rewards (new glue on the tether engine) → reinforce-dense-then-thin schedule setting.
17. Add the parental gate (math challenge) in front of reward/difficulty/age-mode/AI settings; build the **designed** free/premium paywall + gating UI with a **mock purchase** (no real processor — a stubbed `purchasePremium()` that flips a local entitlement flag).
18. Generate `THIRD_PARTY_NOTICES.md` / `NOTICE` and run the dependency license scan (§4). → **CHECKPOINT G: full loop works offline E2E; paywall gates premium; NOTICES file present and license scan clean.**

---

## 2. DEPENDENCY RECONCILIATION (SDK 50 / RN 0.73 → SDK 54 / RN 0.81)

**The headline conflict:** lockin runs **Reanimated 4** (`~4.1.1`) + `react-native-worklets`, which only works on the **New Architecture** (Fabric/TurboModules). habit-tracker-app runs **Reanimated 3** (`~3.6.0`) and explicitly **disables** New Arch (`app.json` → `expo-build-properties` `newArchEnabled:false`, plus the FlashList legacy-name shim in `react-native.config.js`). Resolution: **keep lockin's New-Arch + Reanimated 4 environment; do NOT import habit-tracker's app shell or build config; upgrade each lifted UI library to its New-Arch-compatible major.** Re-verify each picker/chart on New Arch.

### 2.1 Version conflict table

| Library | habit-tracker (SDK 50) | lockin / target (SDK 54) | Action |
|---|---|---|---|
| `expo` | `^50.0.0` | `^54.0.0` | Use lockin's. |
| `react-native` | `0.73.4` | `0.81.5` | Use lockin's. |
| `react` / `react-dom` | `18.3.1` | `19.1.0` | Use lockin's (React 19). Safe because we drop MST/Paper shell. |
| `react-native-reanimated` | `~3.6.0` | `~4.1.1` (+ `react-native-worklets 0.5.1`) | Use lockin's R4. **Every lifted animated component must be R4/New-Arch verified.** |
| `react-native-svg` | `14.1.0` | `15.12.1` | Use lockin's 15.x (back-compatible for circular-progress + gifted-charts). |
| `@react-native-async-storage/async-storage` | `1.23.1` | `2.2.0` | Use lockin's 2.x. |
| `@react-native-community/datetimepicker` | `^8.0.0` | `^8.5.1` | Already in lockin — no add needed. |
| `react-native-gesture-handler` | `~2.14.0` | `~2.28.0` | Use lockin's. |
| `react-native-safe-area-context` | `4.10.3` | `~5.6.0` | Use lockin's; lifted `Screen` must use v5 API. |
| `react-native-screens` | `~3.29.0` | `~4.16.0` | Use lockin's. |
| `date-fns` | `2.30.0` (ht) / `3.x` (momentum) | `3.6.0` | Standardize on **3.6.0**; add `date-fns-tz@^3` for momentum streaks. |

### 2.2 Exact packages to INSTALL (SDK 54-aligned)

Run picker/chart adds with explicit New-Arch-capable majors; let Expo pin the rest:

```
# UI donor libs (upgraded majors for Reanimated 4 / New Architecture)
npm i @gorhom/bottom-sheet@^5            # v4 (ht) is Reanimated 2/3; v5 supports R4/New Arch
npm i reanimated-color-picker@^4         # v3 (ht) is Reanimated 3; v4 supports R4
npm i rn-emoji-keyboard@^1.9.0           # verify Reanimated 4 on New Arch in the sandbox
npm i react-native-circular-progress@^1.4.1   # svg-based; peer react-native-svg (15.x ok)
npm i react-native-gifted-charts@^1.4.41      # v1 fast-follow (charts)
npx expo install react-native-linear-gradient # gifted-charts peer dep
npx expo install @shopify/flash-list          # SDK 54 ships FlashList 2.x (New-Arch ready); replaces ht's 1.6.4 + its red-box shim

# Loop essentials not in any donor
npx expo install expo-speech             # TTS spoken labels for non-readers (young mode)
npx expo install expo-crypto             # Crypto.randomUUID() — replaces tether's `uuid`
npm i react-native-confetti-cannon@^1.5.2     # celebration confetti (or a Reanimated/Skia particle)
npm i date-fns-tz@^3                      # momentum streak timezone math
```

### 2.3 Packages to REMOVE from lockin for the MVP
- `@google/genai`, `expo-ai-kit` — AI is OFF by default; remove the off-device data path entirely for MVP (re-add behind a parent gate later, doc 23/feature-matrix).
- `@expo/ngrok` — dev tunneling, not needed.
- `@bacons/apple-targets` — iOS widgets; defer (optional, not MVP).
- Re-audit `expo-media-library` after removing the ViewShot "share your goal" flow; keep only if a save-image feature survives.

### 2.4 Re-verify each lifted lib on New Arch (sandbox before wiring)
- `reanimated-color-picker@4`, `rn-emoji-keyboard`, `@gorhom/bottom-sheet@5`: all use Reanimated worklets → smoke-test gestures/animations on a physical Android + iOS device on New Arch.
- `react-native-gifted-charts` + `react-native-linear-gradient`: confirm gradient renders under prebuild (not Expo Go) since linear-gradient is native.
- Ignite components are mostly `StyleSheet`-based and styling-system-agnostic; NativeWind and `StyleSheet` coexist fine — no need to convert them, just feed reskinned theme tokens.

---

## 3. Exactly what to STRIP (shame/mockery + ruthless AI + rigid goal + surveillance)

### 3.1 lockin — shame / mockery (HARD rule: no anger, no insults, no tears)
- `components/dashboard/ExecutionSprite.tsx` — remove `isAngry` state, the "Angry Jump", the angry `> <` eyes (lines ~96–101), and the red "Angry Mark" SVG (~111–121). Replace the press handler with a **happy** reaction (bounce + sparkle).
- `components/dashboard/ScannerSprite.tsx` — delete the `'MOCKING'` state, the `MockingPhase` type (`LAUGH`/`SHOUT`/`CLAP`), `DEFAULT_INSULTS` (line 30: "Bruh.", "Weak."…), the laugh-tears, the shout `X` eyes, and all mockery-text rendering. KEEP `IDLE`/`APPROVED`/`WITNESSING` (positive) and repurpose `APPROVED` as the celebration face.
- `app/shiny-object.tsx` — **delete the whole screen** (it is an AI "distraction/threat detector" that drives the sprite into `MOCKING` with an `INSULTS` array, line 19). Remove its route from `app/_layout.tsx` (line 66) and the launch button in `app/(tabs)/index.tsx` (~222).
- `components/dashboard/VictoryOverlay.tsx` — retone copy ("Objective met. Maintain your focus." → kid celebration) and swap `bg-swiss-red`.

### 3.2 lockin — "ruthless advisor" AI (keep AI OFF by default)
- `services/gemini.ts` — remove/neutralize `getStrategyResponse` (system prompt: *"ruthless, high-performance strategic commander… do NOT let them breathe"*, lines 145–164), `analyzeShinyObject`, `generateTodosForMilestone` (military/tactical tone), `getDailyMotivation` ("Stay hard."). Delete `DEFAULT_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY` usage.
- `contexts/AIContext.tsx` + `hooks/useOnDeviceAI.ts` — for MVP, remove the provider plumbing and the auto-`initialize()` on mount; default to `'none'`. (If kept for a later parent-gated feature, it must default OFF and never auto-call out.)

### 3.3 lockin — rigid one-immutable-goal-per-year model
- `types.ts` — replace `LockedGoal {title, motivation}` with a flexible task/routine model (per-child, short-horizon, editable).
- `components/onboarding/GoalInputStep.tsx` — remove "ONE YEAR. ONE GOAL.", the "⚠ THIS CANNOT BE CHANGED LATER." warning (line ~444), and the violent `HeadbuttScene` (a character headbutts/shatters the number "1"). Replace with parent/child setup.
- `components/onboarding/{ContractStep,MotivationStep,TimeLeftStep}.tsx` — drop the "contract/lock" framing; rebuild as a calm 2–3-tap parent setup.
- War/tactical surfaces — `app/war-path.tsx`, `app/tactical-plan.tsx`, `app/edit-focus-plan.tsx`, `app/focus-zone/*` (campaign/war-room/tactical), `components/war-room/*`: keep the *milestone/ordered-task mechanics* but retone all copy (no "WAR PATH", "THREAT", "LOCKED", "MISSION"). Remove the `id="war-room-tabs"` etc.
- Palette: replace `swiss.red #FF3B30` / dark theme in `tailwind.config.js` with the bright bubble palette; `swiss-red` appears across ~20 files (focus-timer, tabs, profile, debrief, war-path…) — do a tracked rename, not a blind find-replace.

### 3.4 Donor surveillance — DROP entirely (privacy is a feature for a kids product)
- **tether:** never copy `app/src/electron/monitors/{BaseMonitor,IdleMonitor,WindowMonitor}.ts` (window/title polling via `child_process exec`), `services/{ActivityLogger,ActivityMonitoringService,WorkPatternAnalyzer,NotificationTracker,ChatService,LLMService,PythonServerService}.ts`, `services/providers/*`, `hooks/useActivityMonitoring.ts`, the `server/` Python Flask app, and `rag/`. From `shared/types.ts` take ONLY the gamification interfaces (`GamificationData, Badge, Quest, QuestReward, Achievement, DockTheme, PointEarningEvent`) — leave `ActivityLog/TypingData/MouseData/ScreenData/WindowData/AmbientNoiseData` behind.
- **momentum:** never copy `backend/` (Prisma, Fastify, JWT, bcrypt, node-cron), auth, or analytics server. Only the three named UI/logic files.
- **lockin:** `services/focusNotification.ts` (`@notifee` live timer notification) is fine to keep, but enforce the no-nagging rule — point-of-performance only, quiet hours, never guilt-toned.

---

## 4. LICENSE ATTRIBUTION plan

All four shipped donors are **MIT with a verified LICENSE file** (confirmed by reading each file). MIT requires that the copyright + permission notice travel with the distribution; since we modify and merge, we collect them in a `THIRD_PARTY_NOTICES.md` (a.k.a. `NOTICE`) bundled in the app and linked from an in-app "Licenses" row in Settings.

### 4.1 `THIRD_PARTY_NOTICES.md` — donor section (exact copyrights, verified)

```
This product, "Tiny Bubbles", includes source code adapted from the
following MIT-licensed open-source projects. Each is used under the
MIT License; the original copyright and permission notices are reproduced
below in full.

- lockin (byadhddev/lockin26)      — Copyright (c) 2025 adhd.dev (https://x.com/adhd_paws)
- habit-tracker-app (takanome-dev) — Copyright (c) 2024 takanome-dev
- tether (Aarsh Shah)              — Copyright (c) 2025 Aarsh Shah
- momentum (Vishal)                — Copyright (c) 2024 Vishal

[full MIT license text reproduced once, applicable to all of the above]
```

- **Also attribute Infinite Red / Ignite:** habit-tracker-app's component kit + theme is the Ignite boilerplate (`app.json` → `"ignite": {"version":"9.6.2"}`). Ignite is MIT (© Infinite Red, Inc.). Since we lift those components, add an Ignite/Infinite Red MIT entry too.

### 4.2 Transitive / framework licenses
- Run a real scan on the FINAL tree and append the results:
  `npx license-checker-rseidelsohn --summary` then `--csv > licenses.csv`.
- Expected non-MIT but permissive items to attribute:
  - **Apache-2.0** transitive libs (the synthesis flagged DGCharts/konfetti/MPAndroidChart, but those live in `mymoodz`/`minimoods`, which we are NOT shipping). Our actual RN/Expo tree will surface its own Apache-2.0/BSD deps — list whatever the scan reports (Apache-2.0 needs the license text + any NOTICE file preserved; no copyleft expected).
  - **SIL OFL-1.1 fonts** — `@expo-google-fonts/inter` (the Inter font) is OFL-1.1 and **requires attribution**; include it.
- Confirm the scan shows **no GPL/AGPL/LGPL** before shipping (none detected in any recommended donor).

### 4.3 HARD exclusion (do NOT ship; reference-only)
- **adhd-india** — no LICENSE (`license: null`, all-rights-reserved). Ship NONE of its code; concepts only.
- **adhd-focus-mate** — README claims MIT but has **no LICENSE file** (`license: null`); unverified, and it is a macOS screen-surveillance app. Ship NONE of its code.
- Enforce mechanically: add a CI/grep guard that fails the build if any path or import references `adhd-india` or `adhd-focus-mate`, and document the prohibition in `CONTRIBUTING`.

---

## 5. Repeatable, low-risk INTEGRATION SEQUENCE (checkpoints where the app still runs)

**Principle:** one donor concern per branch; each branch ends green (app launches on iOS + Android, no red screen). Commit a tag at every checkpoint so any phase can be reverted independently.

| CP | After phase | Gate — must all pass | Quick verification |
|---|---|---|---|
| **A** | 0 Base | lockin boots unmodified on iOS + Android | `npx expo start`; open both simulators |
| **B** | 1 Strip | No mockery/AI/"cannot be changed" path reachable; app still boots | grep for `MOCKING`/`isAngry`/`INSULTS`/`ruthless` returns nothing in shipped code; manual nav of all screens |
| **C** | 2 Rebrand+AgeMode | Bubble palette applied; age-mode toggle changes label/text density | flip `young`↔`older`; confirm spoken-label path stubbed |
| **D** | 3 Component graft | Pickers, progress ring, settings render & respond on New Arch | sandbox screen: pick emoji/color/time; ring animates |
| **E** | 4 Gamification | "done" → token awarded + celebration; persists across restart | tap done; kill app; reopen; balance intact in AsyncStorage |
| **F** | 5 Streak/Mood/Step | Forgiving streak (no "0 broken"), mood, add-a-step persist | skip a day → see "3 of 5", not reset shame; add step inline |
| **G** | 6 Loop+paywall+license | Full loop offline E2E; paywall gates premium (mock buy); NOTICES present; license scan clean | run the whole parent→child→reward loop; tap mock purchase; open in-app Licenses |

**Per-checkpoint hygiene at every CP:** `npx tsc --noEmit` (typecheck) + `npx expo start` clean boot on both platforms + a 60-second manual smoke of the touched surface. Because lockin ships **no tests**, add a minimal smoke test (jest-expo) for the gamification service and the streak pure-function at CP E/F — these are the two pieces with real logic to regress.

**Rollback rule:** if a donor lib fails New-Arch verification (§2.4), stop at that sub-step, pin the previous green tag, and either (a) find a New-Arch-capable replacement or (b) defer that feature to v1 — never disable New Arch (that would break lockin's Reanimated 4 + the whole sprite system).

---

## 6. Risks / open questions
- **New-Arch picker compatibility is the top integration risk.** `reanimated-color-picker`, `rn-emoji-keyboard`, and `@gorhom/bottom-sheet` must be verified on Reanimated 4 + Fabric; if any fails, swap for a New-Arch-native equivalent rather than downgrading lockin.
- **gifted-charts needs native `react-native-linear-gradient`** → requires a prebuild/dev-client (not Expo Go). Charts are v1, so this can lag the MVP.
- **`react-native-paper`** (an ht dependency) is only needed if a lifted component pulls it in; prefer porting the handful of Ignite leaf components without Paper to avoid a heavy React-19/New-Arch dependency. Confirm during Phase 3.
- **Final license scan is authoritative** over this doc's expected-list; whatever `license-checker` reports on the real `node_modules` must be reconciled into NOTICES before ship (esp. any Apache-2.0 NOTICE files and the OFL font).
- **Age-adaptive must be threaded through every grafted component** (props/context), not bolted on; if a donor component resists (e.g., fixed adult copy), retone at lift time, not later.
