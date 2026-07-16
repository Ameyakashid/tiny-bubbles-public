# Tiny Bubbles — MVP Feature Implementation Specs (Features 1–11)

*Compiled 2026-06-28. Buildable specs for every MVP feature in `_build/research/01-feature-matrix.md`, grounded in the actual donor code under `_sources/`. Read alongside `00-SYNTHESIS.md` (the loop + the avoid-list) and `50-repo-fit-analysis.md` (assembly order).*

**Platform:** React Native + Expo SDK 54 (base repo `lockin` = byadhddev/lockin26). One codebase: iOS + Android, phones + tablets. Offline-first (AsyncStorage), no account by default.

**Source path prefix (all donor paths below are relative to):** `/Users/ameyakashid/Desktop/adhd india/_sources/`

---

## 0. Shared architecture (read first — every feature depends on this)

### 0.1 Age mode (first-class, NOT an afterthought)
A parent sets a per-child `ageMode: 'young' | 'older'` during setup (default `young`). It is stored per child profile in AsyncStorage and exposed through a `useAgeMode()` context hook that wraps the whole app. **Every screen reads it.** The two modes are not "more/less text" toggles — they swap component variants:

| Concern | `young` (~4–7) | `older` (~8–12) |
|---|---|---|
| Primary representation | picture + icon + color, **spoken label auto-plays** | text label + icon, spoken label on tap |
| Loop shape | one step on screen, one giant tap | step list visible, can reorder, multi-select |
| Companion | cuddly round "Bubble Buddy", big eyes | sleeker avatar/"buddy" variant, customizable identity |
| Autonomy | parent pre-picks; child picks 1-of-3 | child picks task order, 3–6 reward/skin options |
| Copy register | 3–5 words, present tense, warm | short sentences, slightly more grown-up |
| Reading dependency | **zero** (TTS-first) | reading allowed, TTS optional |

Implementation: a single `<AgeModeProvider>` at the app root (new file `contexts/AgeModeContext.tsx`, modeled on lockin's existing `contexts/AIContext.tsx` pattern). Components branch with `const { mode } = useAgeMode()`. Where art differs, sprites take an `ageMode` prop (see Feature 3).

### 0.2 Data model (AsyncStorage, offline-first)
Keys (namespaced per child, e.g. `child:<id>:tasks`):
- `children` → `ChildProfile[]` `{ id, name, ageMode, companionName, companionSkin, avatarConfig }`
- `child:<id>:tasks` / `routines` → `Task[]` (port of lockin `types.ts` `Milestone` + momentum subtask shape; see Feature 4/5)
- `child:<id>:gamification` → `GamificationData` (ported from tether `app/src/shared/types.ts`)
- `child:<id>:rewards` → caregiver-set backup rewards `Reward[]` (new, Feature 2)
- `child:<id>:streak` → `{ streakDays, lastCompletionDate }` (momentum streak shape, Feature 6)
- `settings` → quiet hours, sound/haptic toggles, low-stim, parent gate config (Feature 8/9/10)
- `entitlements` → `{ tier: 'free'|'premium', trialEndsAt }` (Feature 11, mock)

### 0.3 Mandatory `lockin` retone (applies across features — see per-feature §(d))
1. **Delete shame mechanics entirely.** `components/dashboard/ExecutionSprite.tsx` `isAngry`/angry-jump; `components/dashboard/ScannerSprite.tsx` `MOCKING` state + `MockingPhase` (`'LAUGH'|'SHOUT'|'CLAP'`) + `DEFAULT_INSULTS = ["Bruh.","Seriously?","Nah.","Try Again.","Weak."]`. These are removed, not toned down.
2. **Replace the "ruthless advisor" AI** in `services/gemini.ts` (`getStrategyResponse` `systemPrompt` = "ruthless, high-performance strategic commander… NOT let them breathe"; `analyzeShinyObject`; `getDailyMotivation` "Stay hard. Stay focused."). AI is **OFF by default** for the kids product (Feature spec defers all AI to later tier #23); for MVP, gut the Gemini calls and ship curated, fixed, friendly copy. Drop `expo-ai-kit` + `@google/genai` from the runtime path.
3. **Replace the rigid "one immutable goal per year" model** (`CountdownTimer.tsx` year countdown, `MotivationCard.tsx` "SIGNED CONTRACT"/"THE PLEDGE"/lock icon) with flexible short-horizon tasks.
4. **Repalette:** `tailwind.config.js` ships only `swiss.red #FF3B30` / black / gray. Replace with a bright, playful kids palette + a low-stim variant (Feature 8).

### 0.4 LICENSE hard rule
Ship code only from MIT donors: `lockin`, `habit-tracker-app`, `tether`, `momentum` (+ `medtimer` for *pattern reference only* on the parent gate). **Never ship `adhd-india` or `adhd-focus-mate` code** (no/unverified license) — concept reference only.

### 0.5 Expo native modules already in `lockin/package.json` (SDK 54)
`expo-haptics ~15`, `expo-av ~16`, `expo-notifications ^0.32`, `@notifee/react-native ^9`, `expo-sensors ^15`, `expo-device`, `expo-media-library`, `expo-sharing`, `expo-secure-store`, `react-native-reanimated ~4`, `react-native-svg 15.12`, `@react-native-async-storage/async-storage 2.2`.
**Must add:** `expo-speech` (TTS for non-readers — not currently a dep), `react-native-circular-progress` + `reanimated-color-picker` + `rn-emoji-keyboard` (lift with habit-tracker pieces), and optionally `expo-local-authentication` (parent gate). All are Expo-managed-compatible.

---

## Feature 1 — Immediate reward at point-of-completion

**One tap "done" → sub-second multisensory celebration (animation + sound + haptic) + immediate token payout.** This is the load-bearing mechanism (delay-discounting science).

### (a) User-facing behavior + screens/components
- On the child Home/Routine screen, the active step shows one big "done" target (~2cm+). Tap fires, in this order, all within <300ms: (1) `Haptics.notificationAsync(Success)`, (2) a celebration sound via `expo-av`, (3) a confetti/burst + companion happy reaction overlay, (4) the token counter increments with a count-up animation, (5) TTS speaks "Yay! You did it!" (young) / chosen praise line (older).
- Screens: `app/(tabs)/index.tsx` (Home/Routine — refit from lockin dashboard), a new `<CelebrationOverlay>` (refit of lockin `VictoryOverlay.tsx`), token badge in header.

### (b) Donor files to LIFT / PORT + glue
- **Celebration overlay (LIFT + retone):** `lockin/components/dashboard/VictoryOverlay.tsx` — keep the `Modal` + Reanimated `ZoomIn/SlideInDown/FadeIn` choreography. **Retone:** replace copy `"MILESTONE COMPLETE"` / `"Objective met. Maintain your focus."` with age-mode praise; replace `<ScannerSprite state="APPROVED" />` with the happy Bubble Buddy (Feature 3); replace `bg-swiss-red`/`bg-black` with bright palette.
- **Token engine (PORT):** `tether/app/src/electron/services/GamificationService.ts` `awardPoints(points, type, description, metadata)` (lines ~294–337) + level calc. **Port glue:** strip Electron (`app.getPath`, `fs`), persist to AsyncStorage under `child:<id>:gamification`; keep the `PointEarningEvent`/`Achievement` shapes from `tether/app/src/shared/types.ts`. Replace the `window.electron.gamification` IPC in `tether/app/src/ui/hooks/useGamification.ts` with direct service calls (it becomes a thin React hook over the ported service).
- **Haptics/sound pattern (LIFT):** `lockin/app/focus-timer.tsx` already calls `Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)` (line 70) and `Haptics.impactAsync(Medium)` (line 121) — reuse this exact pattern. Add an `expo-av` `Audio.Sound` play for the chime (lockin has `expo-av` but uses it minimally; wire a `playCelebration()` helper).
- **Confetti:** no RN confetti in donors; add a lightweight Reanimated burst (concept ref only: minimoods `AboutActivity.showConfetti()` is Android/Kotlin — do not port, reimplement in RN-SVG/Reanimated).
- **New glue:** `services/rewards.ts` (token award + celebration trigger), `hooks/useCelebration.ts` (orchestrates haptic+sound+overlay+TTS in one call so timing is guaranteed).

### (c) Age-adaptive
- **young:** celebration is bigger/longer (~1.2s), louder default chime, TTS auto-plays praise, token shown as a big glowing bubble "+1". Single confirmation, no "are you sure".
- **older:** snappier (~0.6s), praise line is one of a rotating curated set, token count-up is subtler, optional "tap to dismiss".

### (d) Anti-shame / anti-dark-pattern
- Reward is **immediate and unconditional on the tap** — never gated behind a delay, an ad, or a paywall. No variable-ratio "sometimes you get nothing" slot mechanic (synthesis §2.2: do not build a compulsion engine). Magnitude can vary for novelty (Feature 12) but a token always lands.
- No loss: a completed tap can be undone (Feature 17 v1) but never *clawed back* as punishment.

### (e) Acceptance criteria
- Tapping "done" produces haptic + sound + visual + token within 300ms on a mid-range device, every time, offline.
- Token total persists across app restarts (AsyncStorage).
- Sound and haptics each independently respect the Settings toggles (Feature 8); with both off, the visual + token still fire.
- Works with zero text read by the child (TTS speaks the result).

### (f) Expo modules
`expo-haptics`, `expo-av` (chime), `expo-speech` (praise TTS), Reanimated (burst). No notifications needed here.

---

## Feature 2 — Token economy → caregiver-set real-world backup rewards

**Tokens accumulate and redeem for parent-defined real-world rewards (screen time, outings).** Textbook token economy: immediate secondary reinforcer bridging to a backup reward.

### (a) User-facing behavior + screens/components
- **Parent (behind gate, Feature 10):** a "Rewards" setup screen lists 3–6 caregiver-defined rewards, each `{ icon, label, costTokens, type: 'screenTime'|'outing'|'item'|'custom' }`. Parent adds/edits with a 2–3 tap flow.
- **Child:** a "Reward Shop"/"Treasure" screen shows the curated rewards as big cards with token cost + an affordability state. Tapping an affordable reward → confirm → tokens deducted → a "redeemed!" celebration + a parent-facing "owes/give reward" record. Unaffordable rewards show a calm "X more bubbles" progress, never a hard lock with a sales pitch.

### (b) Donor files to LIFT / PORT + glue
- **Spend/unlock logic (PORT):** `tether/app/src/electron/services/GamificationService.ts` `unlockTheme(themeId)` (lines ~499–511, checks `points >= unlockCost`, deducts, records) is the exact "spend tokens to redeem" primitive — generalize it to `redeemReward(rewardId)` that decrements `points` and pushes a `RedemptionEvent`. Reuse the `getThemes()` affordability pattern (`canAfford: points >= unlockCost`, lines ~527–533) for reward affordability.
- **Reward store UI (LIFT + reskin):** `tether/app/src/ui/pages/Rewards/components/ThemesTab.tsx` is a card grid with cost, rarity badge, "Unlock"/"Not Enough Points" buttons, and a points header — directly reskinnable into the kid Reward Shop. **Port:** it's web React (`div`/Tailwind) → convert to RN `View`/NativeWind; replace `window.electron.gamification.unlockTheme` calls with the ported service.
- **Backup-reward menu (NEW glue):** the caregiver reward CRUD is new — but reuse `habit-tracker-app/app/screens/create-new-habit.tsx` emoji picker (`rn-emoji-keyboard`) + the bottom-sheet pattern for the "add reward" form (icon + label + cost slider). Cost slider: tether `app/src/ui/components/common/Slider` (port) or RN slider.

### (c) Age-adaptive
- **young:** rewards shown as 3 big picture cards, spoken aloud; cost shown as a row of bubble icons, not a number; redemption is parent-confirmed.
- **older:** up to 6 rewards, numeric token costs, child can "save up" with a visible goal bar toward a chosen reward, more self-directed redemption.

### (d) Anti-shame / anti-dark-pattern
- Curated autonomy: **3–6 options, never an open catalog** (avoid choice overload).
- No real-money or premium currency anywhere in the child reward loop — tokens are earned only by doing tasks, never bought (keeps it out of loot-box/FTC territory).
- Unaffordable = encouraging progress framing ("3 more bubbles!"), never "buy more" or a countdown-pressure prompt.

### (e) Acceptance criteria
- Parent can create/edit/delete a reward in ≤3 taps; changes persist offline.
- Redeeming deducts the exact token cost, records a redemption the parent can see, and cannot drive tokens negative (port tether's `validateAndMigrate` clamp `points < 0 → 0`).
- Child sees only parent-defined rewards (no defaults that imply purchases).

### (f) Expo modules
None native-critical; `expo-haptics`/`expo-av`/`expo-speech` reused for the redemption celebration.

---

## Feature 3 — Nurtured companion / virtual pet (never punishing)

**A named, customizable, responsive companion ("Bubble Buddy") that reacts joyfully to progress and is NEVER sad/sick/angry/guilt-tripping.** The single biggest retention object.

### (a) User-facing behavior + screens/components
- The companion lives on Home and reacts to: app open (happy idle), step done (bounce/cheer), token earned (glow), reward redeemed (party). It has a name (child/parent chosen) and cosmetic skins/accessories unlocked with tokens.
- Screens: Home (`app/(tabs)/index.tsx`), a "My Buddy" customization screen (skins/accessories), naming during onboarding.

### (b) Donor files to LIFT / PORT + glue
- **Sprite system (LIFT the architecture, REDRAW art):** `lockin/components/dashboard/*Sprite.tsx`. The reusable engine is the Reanimated + `react-native-svg` reactive-character pattern. Best donors:
  - `ScannerSprite.tsx` — richest state machine (`IDLE/ANALYZING/APPROVED/SEARCHING/POINTING/SEALING/TYPING/VALIDATING/WITNESSING` + reaction `excitementLevel 0–4`, `reactionTrigger`). **LIFT** the positive states (`IDLE`, `APPROVED`, `WITNESSING` celebration glow/bounce at `excitementLevel>=3`, `TYPING` reaction bounce). **DELETE** `MOCKING` state, `MockingPhase`, `DEFAULT_INSULTS`, tear animation, and all insult rendering.
  - `ExecutionSprite.tsx` — simple breathing/idle loop (`scaleX/scaleY withRepeat`). **LIFT** the idle breathe; **DELETE** `isAngry`, the angry-jump in `handlePress`, angry-eyes SVG, and the red "angry mark".
  - `WorkoutSprite.tsx` / `JourneySprite.tsx` — additional happy motion + `expo-sensors` tilt-bounce (JourneySprite) reusable as a playful tactile interaction.
- **Skin/accessory unlock (PORT):** reuse tether `GamificationService` `DOCK_THEMES` (rarity + `unlockCost`) and `unlockTheme/setDockTheme` as the model for companion skins/accessories (`COMPANION_SKINS`).
- **New glue:** redraw all SVG paths as a friendly round Bubble Buddy (two art sets — see age-adaptive). Define a `CompanionState = 'idle'|'cheer'|'glow'|'party'` enum (a *positive-only* subset; no failure states exist). A `<Companion ageMode state name skin />` wrapper component selects art + animation.

### (c) Age-adaptive
- **young:** cuddly, round, big-eyed "Bubble Buddy"; exaggerated bounce; auto-emotes; name spoken aloud.
- **older:** a sleeker, less "childish" buddy/avatar variant (addresses Joon's age cliff); more accessory/identity customization; subtler reactions. Same animation engine, different SVG art set selected by `ageMode`.

### (d) Anti-shame / anti-dark-pattern
- **Hard rule: the companion has NO negative states.** It never gets sick, sad, hungry, dying, or disappointed; it never sends guilt notifications ("Buddy misses you"). This is the explicit inversion of lockin's shame design and synthesis pitfall #1.
- Lapses change nothing about the companion's wellbeing — it is always well/happy. Progress is cumulative only.

### (e) Acceptance criteria
- Grep proves removal: no `MOCKING`, `isAngry`, `DEFAULT_INSULTS`, `MockingPhase`, insult/tear code path ships.
- Companion reacts within 300ms to a step-done event and returns to a calm idle.
- Two distinct art sets render correctly per `ageMode`; skins persist and apply offline.
- No code path can put the companion in a negative/guilt state (positive-only `CompanionState` enum enforced by types).

### (f) Expo modules
`react-native-svg`, Reanimated, `expo-sensors` (optional tilt play), `expo-haptics` on tap, `expo-speech` (companion name/encouragement).

---

## Feature 4 — Picture/icon/color + spoken-label task steps for non-readers (one step at a time)

**Each routine step = picture + icon + color + auto-spoken label; child runs the whole routine without reading.** Task chunking lowers working-memory load.

### (a) User-facing behavior + screens/components
- Routine = ordered list of `Step { id, icon/emoji, color, label, imageUri?, done }`. The child runs it **one step on screen at a time** (young) or as a visible checklist (older). Each step auto-speaks its label; a big "done" advances to the next; finishing the routine triggers a bigger celebration (Feature 1).
- Screens: `app/(tabs)/index.tsx` Home → routine runner (refit of lockin focus-zone one-step flow), step detail.

### (b) Donor files to LIFT / PORT + glue
- **One-step-at-a-time flow (LIFT + retone):** `lockin/components/dashboard/MilestoneCard.tsx` (single big "current objective" card with `onComplete` callback) and `MilestoneStack.tsx` (ordered ACTIVE/COMPLETED grid). Refit `MilestoneCard` into a `StepCard` (big icon + color + spoken label + done button). **Retone:** drop `daysLeft`/`DEADLINE`/`PRIORITY: IMMEDIATE`/swiss-red; copy → warm. Reuse the active→completed→next progression logic from `lockin/app/(tabs)/index.tsx` `handleCompleteMilestone` (lines ~170–195: mark current COMPLETED, find next PENDING, set ACTIVE, persist) — this is exactly the routine advance loop.
- **Step data type (PORT):** lockin `types.ts` `Milestone`/`todos` shape → `Routine`/`Step`. Add `parentStepId`/ordering from momentum `tasks` (subtask) module for "add a step".
- **Icon + color authoring (LIFT):** habit-tracker `app/screens/create-new-habit.tsx` `EmojiPicker` (`rn-emoji-keyboard`, `selectedEmoji`) + `ColorPicker` (`reanimated-color-picker`, in a `@gorhom/bottom-sheet`) — used by the parent to build steps (Feature 5).
- **TTS (NEW glue):** add `expo-speech`; a `speak(label, ageMode)` helper auto-fires on step focus (young) or on a speaker-button tap (older). Localize voice/lang from settings.
- **Image steps:** optional `imageUri` (e.g. parent photo of "toothbrush") rendered above the icon — supports the Goally-style "video/photo of the task" ask. Use `expo-media-library`/image picker for parent to attach.

### (c) Age-adaptive
- **young:** exactly ONE step fills the screen; huge picture; label auto-spoken on appear; single done tap; no list visible.
- **older:** the full step list is visible (checklist), child can choose order (Feature 13), label spoken on tap, can multi-complete.

### (d) Anti-shame / anti-dark-pattern
- Skipping/leaving a step mid-routine is fine — no "incomplete!" penalty; unfinished steps roll forward (Feature 6), never marked failed.
- Everything spoken aloud → no child is ever blocked by inability to read.

### (e) Acceptance criteria
- A non-reader can complete a 4-step routine using only pictures + audio (no text decode required), verified by a no-text walkthrough.
- young mode shows exactly one step at a time; older shows the list.
- Advancing steps persists offline and resumes mid-routine after an app kill.

### (f) Expo modules
`expo-speech` (core), `react-native-svg`/image rendering, `expo-haptics`, `expo-av`.

---

## Feature 5 — Dead-simple parent setup + task assignment (2–3 taps, templated)

**Parent assigns small concrete tasks/routine steps from templates in 2–3 taps.** PTBM is the generalization layer; setup must be effortless or it negates the product.

### (a) User-facing behavior + screens/components
- First run: a short parent onboarding (create child profile → set `ageMode` → name companion → pick a starter routine template). Ongoing: a "+" assigns a task — parent picks from a **templated library** (e.g. "Morning routine", "Brush teeth", "Get dressed", "Homework", "Bedtime") then lightly customizes (icon/color/time/which child). 2–3 taps to assign a templated task; full custom is available but never required.
- Screens: parent onboarding wizard, "Assign task" sheet, task library.

### (b) Donor files to LIFT / PORT + glue
- **Onboarding wizard scaffold (LIFT + repurpose):** `lockin/components/onboarding/*` (`GoalInputStep`, `MotivationStep`, `TimeLeftStep`, `ContractStep`) + `app/(onboarding)/`. **Repurpose** the multi-step wizard shell; **discard** the "one immutable year goal / signed contract / time-left" semantics (`ContractStep`, `TimeLeftStep`) — replace with child-profile + ageMode + companion-name + starter-template steps.
- **Task authoring UI (LIFT):** habit-tracker `app/screens/create-new-habit.tsx` — frequency day selector (`days` array + `handleSelectFrequency`), `DateTimePicker` for time, `EmojiPicker`, `ColorPicker`, and the reminder preset list (`reminders` array: "At the habit time / 5/10/15/30 min before"). This is the customization layer behind a template.
- **Add-a-step micro UX (PORT):** momentum `frontend/src/features/tasks/components/SubtaskForm.tsx` (one-tap "add a step") + `TaskItem`/`TaskList` — port to RN for building multi-step routines.
- **NEW glue:** a `TASK_TEMPLATES` constant (curated, age-appropriate routines with default icons/colors/steps) — this is the 2-tap accelerator and has no donor; it's new content/data.

### (c) Age-adaptive
- The parent picks the child's `ageMode` here (drives the whole app). Templates are tagged by age band; young templates default to single-step, picture-heavy; older templates allow multi-step routines and time-of-day scheduling.

### (d) Anti-shame / anti-dark-pattern
- No heavy/reading-heavy onboarding (synthesis pitfall #2: Habitica loses users *during* onboarding). Progressive disclosure; everything skippable to a working default.
- No nag to "assign more tasks"; the app works with a single task.

### (e) Acceptance criteria
- A parent can go from fresh install to "child has a runnable routine" in under ~60s.
- Assigning a templated task takes ≤3 taps; full customization is reachable but optional.
- Multiple children supported at the data level (profiles), even if rich multi-child management is v1 (Feature 15).

### (f) Expo modules
None native-critical; uses pickers (`rn-emoji-keyboard`, `reanimated-color-picker`, `@react-native-community/datetimepicker`).

---

## Feature 6 — Forgiving progress — NO punitive streaks

**Opt-in streaks, freeze/grace days, cumulative (not consecutive) counts, "3 of 5 — great job!" framing.** The #1 emotional landmine inverted.

### (a) User-facing behavior + screens/components
- Default progress is **cumulative** ("you've popped 47 bubbles!"), not a fragile consecutive streak. Streaks are **opt-in** (parent setting). When on, they use grace days and never show "Streak broken: 0". A missed day rolls incomplete tasks forward instead of failing them. Daily summary uses partial-credit framing ("3 of 5 today — great job!").
- Screens: progress widgets on Home + a calm progress/history view.

### (b) Donor files to LIFT / PORT + glue
- **Streak math (PORT, strip Prisma):** momentum `backend/src/lib/streaks.ts` `calculateTaskStreak` (timezone-aware: same-day = no change, yesterday = +1, gap = reset). **Port glue:** replace the Prisma `user` lookup with a pure function `calcStreak({ lastCompletionDate, streakDays }, tz)` reading/writing AsyncStorage `child:<id>:streak`; keep `date-fns` + `date-fns-tz` (`toZonedTime`, `startOfDay`, `differenceInDays`). **Soften:** add a `graceDays` parameter so a single-day gap does not reset (forgiving variant — momentum resets after >1 day; we extend the threshold and never surface a "0").
- **Forgiving rollover (PORT):** momentum `backend/src/jobs/dailyRollover.ts` — incomplete TODAY tasks move to SOMEDAY (not "failed"), TOMORROW promotes to TODAY. **Port glue:** reimplement as a local on-app-open / `node-cron`-equivalent check (run on launch + a daily local check), no server. This is the literal "no shame spiral" mechanic.
- **Progress visualization (LIFT + reskin):** lockin `components/dashboard/YearProgressWidget.tsx` / `DayProgressWidget(Cat).tsx` dot-grid + `MilestoneStack.tsx` completed-dots. **Reskin** from "days passed/left in the year" to a forgiving cumulative bubble grid; **remove** the year-deadline countdown framing.

### (c) Age-adaptive
- **young:** no streak numbers shown at all by default — pure cumulative "bubbles collected" visual; today shown as filled bubbles out of today's steps.
- **older:** optional streak counter (opt-in), shown with grace-day forgiveness; "best ever" framed as a non-losable record.

### (d) Anti-shame / anti-dark-pattern
- **Never** render "Streak broken", "0 days", or loss-aversion countdowns. No consecutive-loss collapse. Cumulative progress only; partial credit celebrated. (Synthesis pitfall #1, reframed around emotional reactivity.)
- Streaks are off by default and opt-in (a vocal segment rejects them entirely).

### (e) Acceptance criteria
- With streaks off (default), no consecutive-streak UI appears anywhere.
- A simulated multi-day gap never produces a "0"/"broken" message; incomplete tasks roll to SOMEDAY/TODAY correctly across timezones (port momentum's tz tests).
- Daily summary always uses partial-credit positive copy.

### (f) Expo modules
None native; pure logic + Reanimated visuals.

---

## Feature 7 — One-tap done + visual progress feedback (filling "bubble" meter)

**A filling/popping "bubble" meter that starts partly full and grows with each done.** Goal-gradient + endowed-progress: never confront a child with a vast empty bar.

### (a) User-facing behavior + screens/components
- Each routine/day has a progress meter visualized as bubbles filling/popping. It **starts partly full** (endowed progress), and each "done" tap visibly advances it with a satisfying pop. At 100% → routine celebration.
- Screens: meter on Home + per-routine.

### (b) Donor files to LIFT / PORT + glue
- **Progress ring (LIFT):** habit-tracker `app/screens/home.tsx` uses `AnimatedCircularProgress` (`react-native-circular-progress`) with per-item `fill`/`tintColor` (the `DayCard` + `checkIns` cards). Lift directly for a circular bubble-fill meter.
- **Bubble-fill reskin (REPURPOSE):** lockin `components/dashboard/CountdownTimer.tsx` — repurpose its animated numeric display into a bubble meter, OR replace wholesale with a Reanimated SVG bubble-fill. **Discard** its end-of-year countdown logic entirely.
- **Endowed-progress glue (NEW):** initialize the meter at a small non-zero fill (e.g. show 1 pre-filled bubble) per `40-ux §8`.

### (c) Age-adaptive
- **young:** big, few bubbles (e.g. 3–5), each pop is loud/animated; no percentages.
- **older:** finer-grained ring/meter, optional percentage, multiple meters (per routine).

### (d) Anti-shame / anti-dark-pattern
- Meter only ever goes up or resets gently to a partly-full state for a new day — never empties to "0/everything to do" as a guilt cue.
- No "you're behind" framing.

### (e) Acceptance criteria
- Meter starts > 0% on a fresh day; each done tap animates an increment within 300ms.
- Reaching 100% triggers the Feature 1 celebration exactly once.
- Meter state persists offline.

### (f) Expo modules
Reanimated + `react-native-circular-progress`/`react-native-svg`; `expo-haptics`/`expo-av` on pop.

---

## Feature 8 — Calm, uncluttered, sensory-respecting UI

**Progressive disclosure, grey-out done, ~2cm targets, toggleable sound/haptics, low-stim theme.** Stimulating moments inside a calm frame.

### (a) User-facing behavior + screens/components
- Calm default canvas (lots of whitespace, few elements, large touch targets), with stimulating moments **only** at celebration. Settings expose: sound on/off, haptics on/off, low-stim mode (reduces animation/brightness), reduce-motion. Completed items grey out rather than vanish.
- Screens: applies app-wide; Settings screen hosts the toggles.

### (b) Donor files to LIFT / PORT + glue
- **Theming (LIFT + repalette):** lockin NativeWind setup (`tailwind.config.js`, `global.css`) — **replace** `swiss.red/black/gray` with a bright kids palette + a `lowStim` palette variant. Cross-reference habit-tracker `app/theme/colors.ts` (semantic tokens, `spacing.ts`, `typography.ts`) for a token structure to copy.
- **Reduce-motion (PORT concept):** momentum `frontend/src/hooks/useReducedMotion.ts` + `use-media-query.ts` — port the reduce-motion hook to gate Reanimated intensity (RN exposes `AccessibilityInfo.isReduceMotionEnabled`).
- **Component primitives (LIFT):** habit-tracker `app/components/*` (Button, Card, Text, Toggle, ListItem, Screen) — Ignite-quality bases; reskin to large, rounded, high-contrast kid targets. Toggles for the settings.
- **Settings toggles (LIFT scaffold):** habit-tracker `app/screens/settings.tsx` `Link`/row pattern + `Toggle` (dark-mode row shows the toggle wiring) → host sound/haptic/low-stim/reduce-motion.
- **NEW glue:** a `useUiPrefs()` context reading the toggles; sound/haptic helpers check it before firing.

### (c) Age-adaptive
- **young:** larger targets, simpler single-column layouts, fewer simultaneous elements, icon-only nav.
- **older:** slightly denser allowed (lists, more options), but same calm baseline + low-stim available.

### (d) Anti-shame / anti-dark-pattern
- No notification floods or attention-grabbing pulses on the calm canvas (only celebration is high-stim).
- No dark-pattern friction; settings are honest and reachable (but the *child* shouldn't change reward/difficulty — those sit behind the parent gate, Feature 10).

### (e) Acceptance criteria
- Sound off / haptics off / reduce-motion each verifiably suppress their channel app-wide.
- Low-stim mode measurably reduces animation count/brightness.
- All primary touch targets ≥ ~2cm; completed items grey (not removed).

### (f) Expo modules
`expo-haptics`/`expo-av` (gated by prefs), `AccessibilityInfo` (reduce motion). No native add beyond base.

---

## Feature 9 — Few, tunable, point-of-performance reminders

**A small number of gentle, schedule-tied reminders that respect quiet hours and never use guilt tone.**

### (a) User-facing behavior + screens/components
- Reminders fire at the child's routine times ("Time for morning bubbles!"), not on a retention schedule. Parent sets quiet hours (school/sleep) where nothing fires. Tone is always friendly/neutral, never begging or guilt.
- Screens: parent reminder settings (per routine + quiet hours).

### (b) Donor files to LIFT / PORT + glue
- **Notification engine (LIFT):** lockin `services/notifications.ts` — `registerForPushNotificationsAsync()` (permissions + Android channel), `schedulePushNotification(title, body, seconds)`, `scheduleNotificationAtDate(title, body, date)`, `cancelAllNotifications()`. Drop-in. Uses `expo-notifications`.
- **Live/persistent timer notification (LIFT, optional):** lockin `services/focusNotification.ts` (`@notifee/react-native` chronometer) — only if a visible routine timer notification is wanted; otherwise skip for MVP.
- **Quiet-hours model (PORT):** momentum `SettingsPage` + `backend/src/modules/user/service.ts` (`notificationsEnabled`, quiet-hours times) — port the quiet-hours data shape; gate scheduling so no reminder is scheduled inside quiet hours.
- **NEW glue:** a `scheduleRoutineReminders(routine, quietHours)` that maps routine times → `scheduleNotificationAtDate`, skipping quiet windows; **rewrite copy** to fixed friendly strings (no LLM, no guilt). Reschedule on app open.
- **Retone:** lockin's notification copy/emoji ("🔥 Focus Session", "Stay focused!") → warm kid copy.

### (c) Age-adaptive
- **young:** reminder copy is short + the notification can speak/show the companion; aimed at the parent-with-child ("Time for bubbles with Buddy!").
- **older:** can be addressed to the child directly; child may (parent-permitting) tune their own reminder times.

### (d) Anti-shame / anti-dark-pattern
- **No nagging, no floods, no guilt** ("Buddy is waiting…" is banned). Few, tunable, point-of-performance only. Respect quiet hours absolutely. (Synthesis pitfall #3.)
- Easy global off; reminders serve the routine, not engagement.

### (e) Acceptance criteria
- No reminder is delivered inside a configured quiet-hours window.
- Reminder count is bounded and tied to actual routine times (not arbitrary re-engagement pings).
- All reminder copy is from a fixed friendly set; no guilt/anthropomorphic-begging strings exist.

### (f) Expo modules
`expo-notifications` (+ `expo-device` for permission), optionally `@notifee/react-native`.

---

## Feature 10 — Parental gate + parental controls

**A gate that keeps the child out of rewards/difficulty/settings; parent owns configuration.** COPPA/child-safety baseline + operationalizes PTBM.

### (a) User-facing behavior + screens/components
- Any "parent" area (reward setup, difficulty, age mode, subscription, settings, AI) sits behind a gate. The gate is a **math/long-press challenge** (App-Store-compliant "parental gate" pattern: e.g. "tap and hold 3s" for young families, or a simple multiplication a child can't easily do), optionally upgraded to device biometrics. Parent settings: rewards, reminder/quiet hours, sound/haptic defaults, age mode, low-stim, reset.
- Screens: a `<ParentGate>` modal wrapper + a Parent Dashboard/Settings.

### (b) Donor files to LIFT / PORT + glue
- **Settings scaffold (LIFT):** habit-tracker `app/screens/settings.tsx` (`generalLinks`/`aboutLinks` rows + `Link` component + `Toggle`) → reskin into the Parent Dashboard sections.
- **Parent gate pattern (REFERENCE → reimplement):** medtimer `app/src/main/java/com/futsch1/medtimer/Biometrics.kt` shows the biometric-prompt pattern (`BiometricPrompt`, success/failure callbacks). It is **Android/Kotlin — do NOT port directly.** For cross-platform Expo, implement the gate in JS: a math/long-press challenge by default, with optional `expo-local-authentication` (Face/Touch ID / device passcode) for the biometric upgrade. The research note explicitly says "math-challenge gate is simplest" — ship that as the default.
- **Settings persistence (LIFT):** habit-tracker `app/utils/storage/storage.ts` AsyncStorage helpers (`load`/`save`).
- **NEW glue:** `<ParentGate onSuccess>` modal; a `useEntitlements`/`useParentSettings` context; route guards on parent screens.

### (c) Age-adaptive
- The gate challenge can scale (young: a 4-digit-ish math or 3s long-press that a 4–7yo won't pass; older: a harder math problem or biometric), so older kids can't trivially bypass it.

### (d) Anti-shame / anti-dark-pattern
- The gate protects the child (can't change rewards/difficulty), and ensures money/subscription actions are parent-only (FTC enforcement context).
- No surveillance: drop all of tether's activity/keystroke monitoring and lockin's "shiny object" AI surveillance — parental controls here are config only.

### (e) Acceptance criteria
- A child cannot reach reward setup, difficulty, age mode, or subscription without passing the gate.
- Gate works offline on iOS + Android; biometric path degrades gracefully to the math challenge.
- Parent settings persist and immediately affect the child experience.

### (f) Expo modules
`expo-local-authentication` (optional biometric), AsyncStorage. No biometric is required (math gate is the floor).

---

## Feature 11 — Usable free tier + transparent subscription (MOCK purchase)

**Build the full free/premium gating + a designed paywall, with the purchase STUBBED (no real processor for MVP).** 7-day trial, honest renewal reminder, one-tap cancel, hardship option.

### (a) User-facing behavior + screens/components
- A genuinely usable **free tier** (the core loop works free) + **premium** unlocks (e.g. more reward slots, extra companion skins, multi-child, novelty packs — gate cosmetics/depth, never the safety/core loop). A designed paywall screen: clear price, 7-day trial with honest end-date, **one-tap cancel**, a visible **hardship / pay-what-you-can** option, no countdown pressure. **Purchase is mocked** — tapping "subscribe" flips a local `entitlements.tier='premium'` flag (and sets `trialEndsAt`); no RevenueCat/StoreKit/Play Billing wired.
- Screens: Paywall, Manage Subscription (behind parent gate, Feature 10), feature-locked upsell cards.

### (b) Donor files to LIFT / PORT + glue
- **Entitlement gating (NEW glue):** no donor ships billing. Build `services/entitlements.ts` (AsyncStorage `entitlements`) + `useEntitlements()` returning `tier`/`isPremium`/`trialDaysLeft`; a `<PremiumGate feature>` wrapper for locked cosmetics.
- **Paywall/settings UI (LIFT scaffold):** habit-tracker `app/screens/settings.tsx` row/`Link` pattern + Ignite `Button`/`Card` components for the Manage-Subscription and paywall layout.
- **Mock purchase:** a stub `mockPurchase(plan)` that sets `tier='premium'`, `trialEndsAt = now + 7d`; `mockCancel()` reverts. Leave a clear `// TODO: wire RevenueCat` seam so a real processor drops in later.

### (c) Age-adaptive
- Paywall is **parent-facing only** (behind the gate) — not shown to the child regardless of age mode. No age branching in the child loop; premium just unlocks more cosmetics/options that the parent enables.

### (d) Anti-shame / anti-dark-pattern
- **No dark patterns:** no surprise auto-renew, no hard-to-find cancel, no fake urgency/countdown, no guilt. Honest trial-end reminder, one-tap cancel, transparent price, hardship option (synthesis §3; FTC/COPPA context).
- **Free tier must actually work** — never gate the child's core safety loop (tasks, celebration, tokens, companion) behind pay.
- Children never see purchase prompts (gate-protected).

### (e) Acceptance criteria
- Core loop (assign → run → celebrate → token → companion) is fully usable on the free tier with no paywall interruptions.
- Mock subscribe flips entitlement and unlocks premium features locally; mock cancel reverts in one tap; both behind the parent gate.
- Paywall shows trial end date honestly; no countdown/urgency UI; hardship option present.
- A clean seam exists to drop in a real processor later (no real network/billing calls in MVP).

### (f) Expo modules
None (mocked). Future: a billing SDK (RevenueCat) — explicitly out of MVP scope.

---

## Appendix — Assembly order & cross-cutting checklist

1. **Base:** stand up `lockin` (SDK 54) shell; strip shame mechanics (Feature 3 §e grep gate), gut `services/gemini.ts` AI, remove year-goal model, repalette `tailwind.config.js`.
2. **Component kit:** graft habit-tracker pickers/rings/charts/settings + theme tokens (re-verify picker libs against SDK 54; habit-tracker is SDK 50 — lift components, not its app shell).
3. **Engine:** port tether `GamificationService` → AsyncStorage (Features 1, 2, 3 skins, 12 later).
4. **Streaks/rollover/mood:** port momentum `streaks.ts` + `dailyRollover.ts` (Feature 6) + `MoodSelector` (v1 #16).
5. **Age mode + TTS:** wire `AgeModeProvider` (§0.1) and `expo-speech` everywhere (Features 3, 4, 1).
6. **Safety gates:** parent gate (10) + entitlements/paywall mock (11) + reminder quiet hours (9).
7. **Ship-gate review:** verify the anti-shame / anti-dark-pattern rules per feature §(d) and the §0.4 LICENSE rule before any release.
