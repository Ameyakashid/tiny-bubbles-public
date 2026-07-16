# 01 — Current State Audit (feature-complete is a DELTA, not a rewrite)

*Compiled from a full read of `tiny-bubbles/` on 2026-07-06. Verified green baseline:
`npx tsc --noEmit` exits 0; `npx jest` = **34 suites / 335 tests passed**.*

Purpose: establish exactly what the shipped app ALREADY does so the feature-complete
spec is written as additive deltas. The core loop, daypart engine, parent mission-control,
streamlined onboarding, companion, token economy, reminders, mock paywall, theming/age
engine, and offline persistence are **built and tested today**. The gaps are a known,
bounded set (research v1/later tiers + the two locked-decision deltas: local
backup/restore and a printable clinician report + real-billing wiring).

Stack in the repo matches the locked target: Expo SDK ~56, RN 0.85.3, React 19.2.3, TS ~6,
zustand ^5, date-fns ^4 (+ date-fns-tz ^3), NativeWind ^4, react-native-svg 15, reanimated
4.3, expo-audio/haptics/speech/notifications, AsyncStorage 2.2. Single git commit ("Initial
commit"); doc 70 (daypart bifurcation) is **already landed** in this commit.

---

## 1. What EXISTS and works

### 1.1 MVP core loop (research features #1–#10) — COMPLETE
The evidence-based loop runs end to end today:

- **One-step-at-a-time runner** — `components/task/TaskRunner.tsx`. Young shell = one focal
  `StepCard` + giant Done + "Skip for now" (free, never penalized); older shell = full
  checklist, complete-in-any-order, calm grey-out (never "failed"), optional reorder when
  `autonomy.canReorderSteps`. Layout chosen from the **resolved** `multiStepVisible` flag,
  never raw `ageMode`.
- **Immediate reward at point of completion** — `completeStep` (`src/state/gameplay.ts`) →
  `childStore.recordCompletion` pays the base token ALWAYS + a deterministic every-N cadence
  bonus (`src/domain/reinforcement.ts`), advances the persisted run, drives companion mood +
  monotonic nurture. `hooks/useCelebration.ts` + `components/celebration/*` fire the sub-300ms
  haptic/sound/TTS burst; the last step routes to the `(kid)/celebrate` milestone modal.
  Celebration SIZE comes from `resolveCelebration` only (never thinned by reinforcement phase).
- **Non-reader support** — every kid entity carries a required `spokenLabel`; `expo-speech`
  TTS via `src/services/tts.ts`; picture/emoji/color labels (`VisualLabel`).
- **Token economy → caregiver real-world rewards** — `src/domain/tokens.ts` escrow math;
  `requestReward`/`approveReward`/`declineReward`/`cancelReward` in gameplay; `rewardStore`
  holds the menu + redemption audit trail. Kid `rewards.tsx` shows the curated menu (sliced
  to `maxChoices` 3/6), a hold-only escrow request, "N more bubbles" framing, weekly-limit /
  cooldown "come back later", and an owned-forever collectibles wall.
- **Forgiving progress, NO punitive streaks** — `src/domain/streaks.ts` (tz-aware, freeze
  tokens, RESTING/paused not "broken", monotonic longest); `src/domain/progressMeter.ts`
  endowed/bubble meter; `StreakRing`/`BubbleMeter`/`GoalBar`/`TokenMeter`. The `TaskStatus`
  union has no failure member and `CompanionMood` has no negative member — structurally
  anti-shame.
- **Dead-simple templated task assignment** — `app/(parent)/tasks.tsx` + `assignTaskFromTemplate`
  / `addStepToRoutine`; 18 starter templates (`src/data/taskTemplates.ts`), 3 starter routines
  (`src/data/routinePresets.ts`), reward presets, companion seeds (`src/data/seed.ts`).
- **Calm, sensory-respecting UI** — `src/theme/*` tokens; low-stim + reduced-motion + OS
  Reduce-Motion composed in `resolveTokens`; calm non-gamified `(kid)/calm.tsx` breathing
  screen + ambient soundscape.
- **Few, gentle reminders** — `src/services/notifications.ts` (expo-notifications only): quiet
  hours (wrap-around aware), per-day budget/anti-flood, point-of-performance from routine
  `timeOfDay`, a FIXED reviewed copy set with a compile/dev-asserted banned-phrase gate (no
  streak/guilt/companion-nag/urgency), reschedule-on-open, tap-through foreground TTS. Deferred
  permission prompt (never on a child's first screen).
- **Parental gate + controls** — `(gate)/parental-gate.tsx` + `src/services/parentGate.ts`:
  math or long-press ENTRY challenge, salted-SHA256 PIN (never cleartext) REQUIRED for the
  purchase route, `effectiveGateMode`/`assertProductionGateMode` coerce dev-only `'none'`.
  `sessionStore.parentUnlocked` clears on app-background (root layout), so the kid can never
  inherit an unlocked parent zone.

### 1.2 Daypart engine + bifurcation (doc 70) — COMPLETE
The doc-70 change spec is fully implemented (this was the last iteration):

- **Pure daypart resolver** — `src/domain/dates.ts`: `getDaypart`/`localHour`/
  `daypartFromSchedule`/`nextDaypart`/`selectionDaypart` + `DEFAULT_DAYPART_WINDOWS`
  (morning 5 / afternoon 12 / evening 17 / night 21; night wraps + shares evening's routine
  list). Tested in `__tests__/domain/daypart.test.ts`.
- **Time-driven, forward-only kid selection** — `app/(kid)/index.tsx` reads the clock +
  child tz, picks the active routine for the current daypart via `selectDaypartRoutine`; NO
  morning fallback. Nothing scheduled → calm `DaypartDonePanel`.
- **Per-day completion marker** — `runProgressStore.completedDayparts` (+
  `markDaypartComplete`/`isDaypartComplete`/`clearDaypartComplete`) with free local-midnight
  rollover (stale day reads as "not done"). This is the fix that stops the old
  finish→re-arm→"back to morning" loop; `TaskRunner` gates re-arm on `isDaypartComplete`.
- **Calm "all done for now" panel** — `components/kid/DaypartDonePanel.tsx` (buddy + running
  balance + "see you this &lt;next&gt;" copy + read-only peek + secondary opt-in "Do it again").
- **Read-only peek** — `app/(kid)/peek.tsx` lists other dayparts' routines/steps as static
  chips; never starts a run.
- **Parent mission-control** — `app/(parent)/dashboard.tsx` uses the pure `summarizeDayparts`
  roll-up: per-child routines grouped Morning/Afternoon/Evening with live today completion +
  "now" highlight, tokens (now/held/earned), pending-redemption Approve/"Not yet" strip
  (wired to escrow decisions), inline routine on/off toggles, deep-link "+ add to daypart",
  Manage rewards. Anti-shame labels only.
- **Consistent grown-ups door** — persistent PIN-gated 🔒 corner control in the kid shell
  (`app/(kid)/_layout.tsx`, both shells), hidden over pushed modals.
- **Grouped chores** — `app/(parent)/tasks.tsx` groups routines by daypart, accepts a
  `daypart` route param.

### 1.3 Companion (research #3, #24) — COMPLETE
`src/state/buddyStore.ts` + `src/domain/companionMood.ts` + `components/buddy/*`
(`BubbleBuddy`, `BuddyRoom`, `buddyVisuals`). Positive-only mood union (content/happy/
excited/sleepy/celebrating/curious/proud) with decay-to-content, MONOTONIC bond/growth from
`lifetimeEarned`, cosmetic ownership kept forever. Art variant resolves from `companionStyle`
(cuddly→bloop / cool→orbit), NEVER `ageMode`. Buddy finishes (plain/sparkle/glass/galaxy).
Aging-up (#24) is served by ageMode + companionStyle + young-stack vs older-tabs shells.

### 1.4 Streamlined onboarding (doc 70 §F) — COMPLETE (4 steps)
`ONBOARDING_ORDER` = welcome(+privacy consent) → parent-gate-setup(PIN+confirm) →
child-setup(+inline calm note, collapsed preview) → done(hand-off). `done.tsx` auto-activates
all three daypart routines + buddy rename + bifurcation teaching. Gate-before-child invariant
preserved; `clampOnboardingStep` maps removed legacy steps (privacy_consent/pick_buddy/
first_task/calm_offer) to safe survivors for resume-after-kill. Tested in
`__tests__/components/onboardingSteps.test.ts`.

### 1.5 Theming / age-adaptive engine (research #8, #24) — COMPLETE
`src/theme/*`: `resolveTokens` (ageMode × sensoryMode × colorScheme → NativeWind palette
class + numeric tokens), `resolveCapabilities` (flags: `multiStepVisible`, `maxChoices`,
`showNumbersAndCharts`, `textPrimary`, `companionFraming`, `canPickColor/Accessory/Theme`,
`delegateToChild`, `canAddTasks`, `moodCheckin`), `resolveContent` (mode-keyed COPY table +
buddy art variant; `ModeKeyed<T>` compiler-forces both variants), `resolveCelebration`
(salience→CelebrationLevel with calm/quiet/reduced-motion clamps). `ThemeProvider` supports
scoped `overrideAgeMode` for the live side-by-side preview. **Golden rule enforced**:
components read tokens/flags/resolved content, never raw ageMode; parent surfaces use
`ageModeLabel`.

### 1.6 Storage / persistence (offline-first) — COMPLETE
`src/storage/*`: swappable `storage` PORT (AsyncStorage default with web localStorage shim;
opt-in MMKV stub, not a dependency); `persist.ts` (`tb/`-namespaced Zustand persist +
hydration-gate coordination); `StoreHydrationGate` blocks first frame until every store
rehydrates; `migrations.ts` (forward-only engine — MIGRATIONS empty at SCHEMA_VERSION 1 —
plus `validateAndRepair` enforcing structural anti-shame invariants: mood coerced to a valid
positive, balances never negative, streaks never lowered, task status never "failed");
`legacyImport.ts` (idempotent no-op seam). Per-child key scoping (`schemaVersion.ts`) supports
precise "delete my data" (`resetAllTbData`/`resetChildData`, `wipeAllChildData`). No servers,
no accounts — all on-device.

### 1.7 Mock paywall / entitlements (research #11) — COMPLETE as a MOCK (real billing deferred)
`src/services/purchases.ts` (mockPurchase/mockCancel, 3 honest plans incl. pay-what-you-can
hardship, `// TODO: wire RevenueCat` seam, NO network/StoreKit) + `src/services/entitlements.ts`
(`FEATURE_GATES` acquisition matrix: multiChild 1→8, rewardMenuSize 3→6-curated-ceiling,
companionThemes 2→24, noveltyPipeline/calmSoundscape/advancedInsights premium flags;
`canAddMore`/`isFeatureUnlocked`; gating blocks NEW acquisition ONLY, never strips owned
content) + `app/(parent)/paywall.tsx` (real trial end-date, one-tap cancel, no
countdown/urgency/anchor pricing, no medical claims) reachable only behind the PIN gate.
`components/parent/PremiumGate.tsx` is the add-button gate.

### 1.8 Reminders, audio, haptics, TTS — COMPLETE
`src/services/`: `notifications.ts` (above), `sound.ts` (cue registry, duck-not-hijack,
calm ambient loop), `haptics.ts`, `playCue.ts`, `tts.ts`, `onboardingVoice.ts`. Root layout
wires reschedule-on-open (post-onboarding only), tap-through TTS, and per-child sound/haptic
mirroring.

### 1.9 Tests — 34 suites / 335 tests green
Domain (daypart, tasks, streaks, tokens, gamification, reinforcement, companionMood,
progressMeter, + edge suites for DST/companion/seed/streaks/tokens/reinforcement), state
(economy, entitlements, gameplay, runProgress), storage (migrations, persist, storage), theme
(capabilities, celebration, content, tokens), services (notifications, parentGate, playCue,
sound, haptics, onboardingVoice), components (onboardingSteps, buddyVisuals), smoke.

---

## 2. Current data model (entity list)

Single source of truth: `src/domain/types.ts` (+ factories in `src/domain/constants.ts`).

**Axis unions:** `AgeMode` (young|older), `SensoryMode` (standard|lowStim), `CompanionStyle`
(cuddly|cool), `CelebrationLevel` (full|medium|gentle|calm), `CompanionMood` (7 positive),
`Daypart` (morning|afternoon|evening|night), `DaypartWindows`.

**Tasks/routines:** `VisualLabel`, `Verification` (mode none|self|photo|parent), `Task`
(incl. `timerSeconds?`, `proposed?`), `TaskSchedule`, `Routine` (incl. `daypart?`, `mode`
gamified|calm, `active`), `RoutineRun`, `StepResult`, `ActiveRunProgress`.

**Economy:** `TokenEntry`/`TokenLedger` (balance/held/lifetimeEarned/lifetimeSpent, capped
entries), `TokenReason`, reinforcement (`ReinforcementConfig`/`HabitReinforcement`/
`ReinforcementState`/`ReinforcementResult`, phase dense|thinning|maintenance).

**Companion:** `CompanionCustomization` (base/accent color, accessories, finish?),
`CompanionState` (species, name, mood, bond, growthStage, unlockedItems, equipped).

**Progress/logs:** `ProgressState` (cumulative, streak, freeze tokens, paused,
savingTowardRewardId?), `ProgressConfig`, `MoodLog` (opt-in), `ActivityEvent` (opt-in).

**Rewards:** `Reward` (category, cost, screenTimeMinutes?, limitPerWeek?, cooldownHours?,
archived?), `RedemptionRequest` (status requested→approved/fulfilled/declined/expired/canceled).

**Child/parent config:** `ReminderAnchor`/`ReminderConfig`, `ChildAutonomy`, `ChildSettings`
(calmMode, celebrationIntensity, sensoryMode, companionStyle, textFirst, sound/haptics/
reducedMotion, spokenLabels, reinforcement, reminders, autoApprove threshold), `ChildProfile`,
`ChildIndexEntry`, `ParentGateConfig`, `ParentSettings` (quietHours, low-stim, analytics/mood
opt-in default OFF, openDyslexicFont).

**Meta/billing/seed:** `Tier`, `MockPurchaseRecord`, `Entitlement` (trial + mockPurchases),
`OnboardingState`, `AppMeta`, `SeedState`, `TaskTemplate`, `RoutineTemplate`, `Cosmetic`
(rarity, unlockCost, premium, seasonalPackId?), `SeasonalPack`, `CompanionSeed`.

### Stores (zustand)
- **Persisted** (all via `createTbPersistOptions`, AsyncStorage): `settingsStore`
  (meta/parentSettings/entitlement), `childStore` (index/profiles/ledgers/progress/
  reinforcement/moods/events/seed), `taskStore` (tasks/routines/runs/lastRolloverDay),
  `rewardStore` (rewards/redemptions), `buddyStore` (companions), `runProgressStore`
  (active/completedDayparts).
- **In-memory:** `sessionStore` (parentUnlocked/activeRunId) — never persisted.
- **Orchestration:** `gameplay.ts` (createChildWithSeed, completeStep/skipStep, redemption
  flow, cosmetic unlock, reconcileChild/rollover, assign/propose/approve tasks,
  wipeAllChildData).

---

## 3. Current screens / IA

- **Boot:** `app/index.tsx` → onboarding-complete ? `/(kid)` : `/(onboarding)`.
- **(onboarding):** index (welcome+privacy) · parent-gate-setup · child-setup · done. [4 steps]
- **(kid):** index (daypart runner / done panel) · buddy · rewards · calm · celebrate (modal) ·
  peek (modal). Shell = single Stack (young) or Tabs Today/Buddy/Rewards/Calm (older) via
  `multiStepVisible`; persistent 🔒 GrownUpsDoor overlay on both.
- **(gate):** parental-gate.
- **(parent):** index→dashboard (mission control) · children · tasks · rewards-setup ·
  settings · paywall. Guarded by `sessionStore.parentUnlocked`.
- **Dev-only (unlinked):** `_sandbox`, `_theme-gallery`.

Settings screen already includes: sound/haptics/reduced-motion/low-stim/OpenDyslexic, calm
mode, reminders + quiet hours, parent gate (entry challenge + purchase PIN), privacy opt-ins,
**"Review what's stored"** (on-device JSON snapshot, selectable text), delete-all, licenses.

---

## 4. GAP LIST toward feature-complete

Legend: **[MISSING]** not present · **[PARTIAL]** data/seam exists, UX/wiring missing ·
**[SEAM]** intentional stub per locked decision · **[N/A]** excluded by hard constraint.

### 4.1 The two locked-decision deltas (highest priority — replace the "cloud portal")
1. **[MISSING] Local backup / restore (export + import a data file).** No export/import
   anywhere. Today's closest surface is Settings → "Review what's stored" (read-only JSON,
   selectable). Need: serialize all `tb/` slices to a shareable file (expo file/share) +
   an import path that validates through `migrateAndRepair` before writing. This is the
   offline-first replacement for a cloud portal's "your data" — data-model-ready, UI absent.
2. **[MISSING] Printable / shareable clinician progress report.** No report generation. All
   source signals exist (ledger `lifetimeEarned`/entries, `ProgressState` streak/cumulative/
   weekCompletions, per-daypart completion, opt-in `MoodLog`), but there is no report
   screen, no on-device render-to-print/PDF, no share. Needs an anti-shame, non-diagnostic
   summary (routines completed, tokens earned, mood trend if enabled) generated on-device.

### 4.2 Billing (locked: spec fully, keep purchase MOCKED)
3. **[SEAM] Real RevenueCat / StoreKit wiring.** `purchases.ts` has the `// TODO: wire
   RevenueCat` seam; call sites (paywall + gates) stay identical. Entitlement classification
   (`FEATURE_GATES`) is complete. Intentionally deferred — spec the paywall/entitlements
   fully, wire the processor later.
4. **[MISSING] Honest trial-end reminder notification.** The paywall copy promises "we'll
   remind you before it ends," but no scheduled local notification implements it. Small delta
   on the existing notifications service (schedule a one-shot near `trialEndsAt`).

### 4.3 Research v1 tier (fast-follow retention/autonomy)
5. **#12 Novelty refresh pipeline — [PARTIAL/SEAM].** Types exist (`SeasonalPack`,
   `Cosmetic.seasonalPackId`, `noveltyPipeline` premium flag) but there is NO rotation logic,
   no seed hook registering packs over time, no quests, and no appointment/"pet adventure"
   mechanics. This is the #1 research risk (4–8 week novelty cliff) and is currently only a
   data seam.
6. **#14 Visual transition timer — [MISSING].** `Task.timerSeconds?` exists in the model but
   no timer component renders in `StepCard`/`TaskRunner`. Need a calm depleting/shrinking
   visual that never hijacks audio.
7. **#16 Mood / energy check-in — [PARTIAL].** Full data path exists (`MoodLog`, `addMood`,
   `moodLoggingEnabled` setting default-off, `moodCheckin` capability flag) but NO emoji/energy
   grid UI is wired into any kid or parent surface.
8. **#17 Light task verification + quick undo — [PARTIAL].** `Verification` model (none/self/
   photo/parent) exists; all seeded tasks inherit `mode:"none"`. No self/photo-verify UI and
   no undo affordance on a token grant (skip exists; undo does not). `TokenReason` already
   includes `"undo"`.
9. **#15 Multi-child — [PARTIAL].** Multi-profile is DONE (index, children.tsx, `multiChild`
   gate free 1 / premium 8). Missing: **chore rotation/assignment between siblings**
   (the documented Joon white-space). Cross-device sync is deliberately OUT (offline-first).

### 4.4 Research later tier (differentiators — mostly not started)
10. **#19 Breathing-gated "stay calm to proceed" mini-game — [PARTIAL].** `(kid)/calm.tsx`
    has a breathing visual + ambient soundscape, but it is not a gated "regulate then proceed"
    loop.
11. **#20 Premium calm/focus soundscape pack — [PARTIAL].** Basic ambient toggle works;
    `calmSoundscape` premium flag exists but no premium pack content is wired.
12. **#18 Co-play / body-doubling — [MISSING].**
13. **#21 If-then "when X, I will Y" plans — [MISSING].**
14. **#22 Adjustable focus intervals + active breaks (Pomodoro) — [MISSING].**
15. **#23 Auto task-breakdown (AI) — [N/A].** Hard-excluded by the ZERO-AI constraint. Not a
    gap; a locked non-goal. Task chunking is served manually by routine steps + templates.
16. **#25 HSA/FSA + published study — [MISSING/non-code].** Business/regulatory workstream.

### 4.5 Production / clinic hardening
17. **[PARTIAL] OpenDyslexic font.** Setting persists (`openDyslexicFont`) but the app-wide
    font swap is inert until the bundled OpenDyslexic binaries ship (`src/theme/fonts.ts`).
18. **[MISSING] Parent-tunable daypart windows.** `DaypartWindows` is typed as tunable but
    only `DEFAULT_DAYPART_WINDOWS` is used; no settings control.
19. **[MISSING] Migrations for future schema bumps.** `MIGRATIONS` is empty at
    `SCHEMA_VERSION 1` (correct now); the engine + `validateAndRepair` are ready, but any new
    persisted shape needs a migration entry.
20. **[MINOR] Demo-companion fallback in `(kid)/buddy.tsx`.** A pre-onboarding `DEMO_ID`
    companion path lingers; harmless but dead in the real (onboarded) flow — candidate cleanup.
21. **[MISSING/non-code] App-store readiness:** privacy policy doc, store metadata/screenshots,
    final icon/splash review, and (once billing is real) product IDs. Notifications are local-
    only with documented Expo Go/web caveats.

### 4.6 Hard-constraint conformance (already satisfied — keep as guardrails, not work)
- **ZERO AI:** no chatbot/LLM/assistant/AI-toggle anywhere; Settings explicitly notes there is
  no "AI off" toggle because there is no AI. Companion is a non-AI pet.
- **Anti-shame:** no failure status, no streak-loss/0-day, no negative mood, "finish later" /
  "see you this afternoon" copy; reminder banned-phrase gate; `validateAndRepair` coerces any
  corrupt value to a safe positive.
- **Curated autonomy:** `maxChoices` caps (3/6), reward menu capped at curated ceiling 6.
- **Age-adaptive via resolvers only:** no component reads raw `ageMode`; no `ageMode` prop.
- **Offline / Expo-Go / web-safe:** AsyncStorage default, pure `now`/`tz`-passed domain, no
  native clock, notifications wrapped no-throw.

---

## 5. One-line takeaway
The MVP loop, daypart engine, parent mission-control, companion, token economy, forgiving
progress, reminders, mock paywall, theming/age engine, and offline persistence are **shipped
and green**. Feature-complete = additive deltas: **(a)** local backup/restore + a printable
clinician report (the offline replacement for a cloud portal), **(b)** wire the real purchase
processor behind the existing mock seam + a trial-end reminder, and **(c)** the research
v1/later features that are currently data-model seams without UX — chiefly the novelty
pipeline (#12), visual timer (#14), mood check-in (#16), light verify+undo (#17), and sibling
chore rotation (#15) — plus small production hardening (OpenDyslexic activation, tunable
daypart windows, store readiness).
