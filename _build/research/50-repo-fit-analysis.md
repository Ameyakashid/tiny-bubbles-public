# Tiny Bubbles — Repo-Fit Analysis

**Stream:** REPO-FIT
**Date:** 2026-06-27
**Goal:** For a polished, engaging ADHD app **for kids** ("Tiny Bubbles"), decide (a) the best platform to build on given the 16 cloned repos, and (b) for each candidate feature, the best source repo + specific files to lift and how much glue/custom code each needs.
**Inputs:** All 16 inventories in `_build/inventory/` plus targeted code spot-checks under `_sources/`.

---

## 1. Executive recommendation

| Decision | Recommendation |
|---|---|
| **Platform** | **React Native + Expo** (cross-platform iOS + Android, tablet-friendly, offline-first). |
| **Base repo** | **`lockin` (byadhddev/lockin26)** — Expo SDK 54, expo-router v6, NativeWind v4, RN 0.81.5 / React 19, MIT (LICENSE present). |
| **Primary UI donor** | **`habit-tracker-app` (takanome-dev)** — Expo/Ignite RN, MIT — for the component kit, emoji/color pickers, charts, progress rings, settings screen. |
| **Logic donors (cross-stack ports)** | `tether` (gamification engine, TS), `momentum` (streak math + mood UI + micro-steps, TS/React), `sidejot` (AI task-chunking prompt), `ilseon` (mood/energy + reminder tiers, reference), `adhd-india` (state-aware scheduler concept — **reference only, unlicensed**). |

### Why React Native + Expo

1. **It is the only platform where a working companion-character system already exists.** `lockin` ships six Reanimated + `react-native-svg` reactive sprites (`components/dashboard/*Sprite.tsx`). A companion mascot is the single biggest "engaging kids app" differentiator and is a declared **gap in every other repo** (dose, medtimer, ilseon, minimoods, mymoodz, focustide, sidejot, trakit, pomotroid, momentum all note "no companion character"). Building this from scratch in any other stack is the most expensive missing piece — RN/Expo gets it nearly for free.
2. **Two MIT repos in this exact stack** (`lockin` SDK 54 + `habit-tracker-app` SDK 50) jointly cover timer, local notifications, reward celebration, task/milestone breakdown, onboarding, progress widgets, a polished Ignite component kit, emoji/color pickers, and charts.
3. **One codebase → iOS + Android (phones and tablets).** Kids' apps live on both ecosystems and on tablets; RN/Expo maximizes reach without two native teams.
4. **First-class multisensory feedback already wired:** `expo-haptics`, `expo-av` (sounds), `expo-sensors` (tilt play), `expo-notifications` (local reminders), Reanimated animation — all present in `lockin`'s `package.json` and used in its timer/sprites/overlay. These are exactly the "polished and engaging" levers for kids.
5. **Offline-first / privacy-friendly:** both RN repos use AsyncStorage only (no backend, no accounts) — the right default for a children's product.

### Why not the alternatives

- **Native Android (Kotlin/Compose):** the deepest and highest-quality bench — `medtimer` (541★, battle-tested offline reminder engine), `dose-android` (631★, clean architecture + AlarmManager), and especially **`ilseon`**, which is nearly feature-complete for ADHD (visual timer, streak badges, mood/"Fuel Check", tiered reminders, haptics, sub-task breakdown). **If the product were Android-only, `ilseon` would be an excellent base.** But Android-only forfeits iOS, and **no Android repo has a companion mascot** — the most important engaging feature would still be built from scratch in Compose, plus all the playful animation. Keep this as the fallback if iOS is explicitly out of scope and the team is Kotlin-native.
- **Web / PWA (`focustide` Nuxt, `sidejot` Next, `trakit` SvelteKit, `momentum` React, `myndmap` Flask):** strong for timer/streaks/PWA installability, but **no companion**, unreliable background notifications (`sidejot` explicitly: timer fires only while the tab is open; iOS PWA push is limited), and a weaker tappable/haptic/animated experience for children. Best used as a **parent-facing web dashboard**, not the primary kid surface.
- **Desktop (`pomotroid` Tauri, `tether` Electron):** wrong form factor for kids. Mine them for **logic only** — `tether`'s gamification engine (portable TS) and `pomotroid`'s drift-correcting timer/streak SQL (Rust, algorithm reference).
- **iOS-only (`mymoodz` SwiftUI, `adhd-focus-mate` SwiftUI/macOS):** single-platform; `adhd-focus-mate` also carries a license caveat and is a macOS screen-surveillance menu-bar app (inappropriate for kids). `mymoodz`' Android side is a skeleton.

---

## 2. Feature → source-repo → files mapping

All paths are relative to `/Users/ameyakashid/Desktop/adhd india/_sources/`. "In-stack" = already RN/Expo TS, drops in with light edits. "Port" = different stack, lift the algorithm/pattern and reimplement in RN. Glue scale: **Low** (re-theme/copy edits), **Medium** (decouple + adapt + reskin), **High** (substantial rework).

| Feature | Best lift (repo · files) | Stack fit | Glue | Notes / what to change |
|---|---|---|---|---|
| **Focus timer** | **lockin** · `app/focus-timer.tsx`, `app/(focus)/index.tsx`, `app/(focus)/debrief.tsx`, `components/dashboard/CountdownTimer.tsx` | In-stack | **Low–Med** | Full session lifecycle with `AppState` background handling, `expo-haptics`, elapsed-seconds loop, ViewShot share. Shorten durations to kid blocks, replace adult `MOTIVATIONAL_QUOTES`, swap visuals for a filling "bubble." Algorithm references for robustness: `focustide` `components/ticker.ts` + `stores/schedule.ts` (adaptive ticking); `pomotroid` `src-tauri/src/timer/engine.rs` (drift-correcting). |
| **Rewards / gamification engine** | **tether** · `app/src/electron/services/GamificationService.ts` (618 lines: points/badges/quests/achievements, JSON-persisted, `DOCK_THEMES` w/ `unlockCost`+rarity) + `app/src/shared/types.ts` + `app/src/ui/pages/Rewards/components/{BadgesTab,QuestsTab,StatsTab,ThemesTab}.tsx` + `app/src/ui/hooks/useGamification.ts`. **Celebration UI (in-stack):** **lockin** `components/dashboard/VictoryOverlay.tsx` (verified: `ZoomIn`/`SlideInDown`/`FadeIn` modal) + `MotivationCard.tsx`. | Port (engine is plain TS) + in-stack UI | **Med** | The engine is the best self-contained reward system in the set. Strip `electron`/`fs`/`tsyringe`/`Logger` and persist via AsyncStorage. Reuse `VictoryOverlay` for the "you did it!" moment; for confetti use a RN lib (concept from `minimoods` `AboutActivity.showConfetti()` + konfetti). Tie unlockable themes to points (see Theming). |
| **Mood logging** | **momentum** · `frontend/src/features/journal/components/MoodSelector.tsx` (+ `data/prompts.ts`, `Mood` enum). **Pattern refs:** **mymoodz** `iOS/.../Source/Home/MoodGridView.swift` (emoji grid + spring scale tap) + `Service/Mood/SelectedMoodColor.swift` (emoji→color); **ilseon** `data/EnergyLevel.kt` (High/Med/Low + color, verified) + `ui/screen/FuelCheckScreen.kt`; **minimoods** `moods/MoodSelectionUseCase.kt` (tap / tap-again-to-clear). | Port (momentum React → RN is closest) | **Med** | No RN repo ships mood logging. Port `momentum`'s `MoodSelector` JSX to RN (structurally near-identical), adopt `mymoodz`' spring-animated emoji-grid feel and `ilseon`'s 3-level color mapping. Swap to kid emoji faces; keep prompts kid-friendly. |
| **Reminder / notification scheduler** | **lockin** · `services/notifications.ts` (verified: `expo-notifications`, Android channels, `schedulePushNotification`) + `services/focusNotification.ts` (Notifee live persistent timer notification). | In-stack | **Low** (basic) / **Med** (state-aware) | Direct drop-in for local reminders. For "back off when the child is overwhelmed," borrow the **decision-layer pattern** from `adhd-india` `schedule_engine.py` (fire/defer/modify/suppress — **reference only, unlicensed**) and tiered nudging from `ilseon` `notifications/ReminderManager.kt`/`NotificationTier.kt`. Heavy-duty offline scheduling reference: `medtimer` `feature/reminders/scheduling/*`; per-timezone cron reference: `trakit` `src/lib/server/scheduler.ts`. |
| **Habit-streak calendar** | **Streak math (port):** **momentum** `backend/src/lib/streaks.ts` (verified: timezone-aware increment-if-yesterday / reset-after-gap, pure TS). **Calendar/grid UI (in-stack base):** **lockin** `components/dashboard/{YearProgressWidget,DayProgressWidget,DateWidget}.tsx` (dot-grid). | Port logic + in-stack UI | **Med** | Lift `momentum`'s streak function as-is (strip the two Prisma reads, feed it dates). For the grid, start from `lockin`'s dot-grid widgets; richer heatmap references: `trakit` `src/lib/components/CalendarGrid.svelte`, `medtimer` `feature/ui/statistics/calendar/*`, `mymoodz` `Source/Hub/Timeline/CalendarView.swift`, `pomotroid` `src-tauri/src/db/queries.rs` (`get_heatmap_data`/`get_streak`). `ilseon` `ui/components/StreakIndicator.kt` (verified tiered Star→pulse@5→Mastery@7 badge) is a great "level-up" reskin idea. |
| **Companion character** | **lockin** · `components/dashboard/*Sprite.tsx` — `ExecutionSprite.tsx` (verified: idle breathing via `withRepeat`, press reactions), `ScannerSprite.tsx` (state machine incl. `state="APPROVED"`), `WorkoutSprite`, `JourneySprite`, `BoatingSprite`, `FocusLogSprite`. Reanimated + `react-native-svg`. | In-stack | **Med–High** | **The decisive reuse — only repo with a real mascot.** Keep the animation architecture (shared values, sequences, state-driven expressions). **MUST rework:** sprites currently express **anger/shame/mockery** (`isAngry`, angry-jump) — replace with purely positive reactions. Redraw SVG art as a friendly "bubble buddy." Personality/voice concept reference: `adhd-india` `workspace/SOUL.md` (per-mood tone) — **unlicensed, reference only**. |
| **Task breakdown into micro-steps** | **lockin** · `components/dashboard/{MilestoneCard,MilestoneStack}.tsx`, `app/focus-zone/*` (`edit-milestone.tsx`, `review.tsx`, draggable via `react-native-draggable-flatlist`) + `TacticalPlanDrawer.tsx`. **UX/logic refs:** **momentum** `frontend/src/features/tasks/components/SubtaskForm.tsx` (one-tap "add a step") + `backend/src/modules/tasks/` (parentTaskId subtasks); **tether** `app/src/ui/components/common/ChecklistRenderer.tsx` (checkable step list); **sidejot** `app/api/tasks/generate/route.ts` + `schema.ts` (AI: one chunk per task). | In-stack base + ports | **Med** | Use `lockin`'s ordered, draggable milestone UI as the base; layer `momentum`'s "add a step" affordance and `tether`'s checklist render. If you want auto-breakdown, lift `sidejot`'s chunking prompt but **re-tone for kids** (and prefer keeping AI off by default — see §3). `lockin`'s own AI (`contexts/AIContext.tsx`, `services/gemini.ts`) uses a "ruthless advisor" tone that must be fully rewritten. |
| **Settings / parental controls** | **habit-tracker-app** · `app/screens/settings.tsx` (dark-mode, notifications, language, about rows — Ignite RN). **Refs:** **momentum** `frontend/src/app/pages/SettingsPage.tsx` (quiet-hours, notif prefs) + `backend/src/modules/user/service.ts`; **sidejot** `components/app/settings.tsx`; **parent gate:** `medtimer` `app/.../Biometrics.kt` (biometric lock — concept). | In-stack (donor) | **Low–Med** | Use `habit-tracker-app`'s RN settings screen as scaffold; add a **parental gate** (math challenge or biometric) before reward/difficulty/AI settings. `momentum`'s quiet-hours model maps to "no reminders during school/sleep." |
| **Theming / design-system** | **lockin** · NativeWind setup `tailwind.config.js`, `global.css`, `components/BentoCard.tsx`, `ui/DynamicAlert.tsx`, `AnimatedSplashScreen.tsx`. **+ habit-tracker-app** · `app/theme/{colors,spacing,typography,timing}.ts` + Ignite kit `app/components/*` (Button, Card, Text, Toggle, ListItem, TextField, Header, EmptyState, Screen, Icon — verified). | In-stack | **Low** | NativeWind config from `lockin` + design tokens & component library from `habit-tracker-app`; reskin both palettes (lockin "swiss-red"/dark, Ignite muted terracotta) to a bright, playful kids palette. **Gamify it:** adopt `tether`'s `DOCK_THEMES` unlockable-theme model (rarity/`unlockCost`); theme-token-schema reference: `pomotroid` 38 JSON themes (named CSS vars). |

### Component & infra extras worth lifting (RN, in-stack)

- **Emoji icon picker + per-item color picker + day-of-week frequency + time picker:** `habit-tracker-app` `app/screens/create-new-habit.tsx` (verified: `rn-emoji-keyboard`, `reanimated-color-picker`, `@react-native-community/datetimepicker`, `days`/`reminders` arrays). Fun, kid-appropriate task personalization. Note: its reminder rows are **UI-only** — wire real scheduling via `lockin`'s `expo-notifications`.
- **Progress rings:** `habit-tracker-app` `app/screens/home.tsx` (verified `AnimatedCircularProgress` with per-item `fill`) — good base for a "bubble fill" ring.
- **Onboarding wizard:** `lockin` `components/onboarding/*` + `app/(onboarding)/` (multi-step) or `habit-tracker-app` patterns. Adapt to a kid/parent setup flow.
- **Charts (progress dashboards):** `habit-tracker-app` `app/screens/statistics.tsx` (`react-native-gifted-charts`). Keep visuals simple for kids; richer reference: `mymoodz` DGChart wrappers, `minimoods` MPAndroidChart.
- **Local persistence:** AsyncStorage helpers `habit-tracker-app` `app/utils/storage/storage.ts`; both base repos are AsyncStorage-only (no backend).

---

## 3. License audit

| Repo | License | Verdict |
|---|---|---|
| **adhd-india** | **NONE** (no LICENSE; API `license: null`) — verified | **Reference only. Do NOT ship its code.** All-rights-reserved. Use only as concept/pattern inspiration (scheduler decision-layer, SOUL persona, buffer/reward framing). |
| **adhd-focus-mate** | **MIT declared in README, but NO `LICENSE` file** (API `license: null`) — verified missing | **Caution.** Treat MIT as unverified-by-file; confirm with author before shipping any code. (Also: macOS/Swift screen-surveillance app — low fit anyway.) |
| **dose-android** | MIT (LICENSE present) | OK |
| **focustide** | MIT (LICENSE present) | OK |
| **habit-tracker-app** | MIT (LICENSE, ©2024 takanome-dev) — verified | OK — primary UI donor. |
| **ilseon** | MIT (LICENSE) | OK |
| **lockin** (byadhddev/lockin26) | MIT (LICENSE, ©2025 adhd.dev) — verified | OK — **recommended base.** README's canonical `adhdpaws/lockin` 404s; the cloned `byadhddev/lockin26` carries the MIT LICENSE. |
| **medtimer** | MIT (LICENSE) | OK |
| **minimoods** | MIT (LICENSE) | OK |
| **momentum** | MIT (LICENSE) | OK |
| **mymoodz** | MIT (LICENSE) | OK — note iOS charts use **DGCharts (Apache-2.0)**; vendor/attribute separately. |
| **myndmap** | MIT (LICENSE) | OK (prototype; UI/static assets only). |
| **pomotroid** | MIT (LICENSE) | OK |
| **sidejot** | MIT (`LICENSE.md`) | OK |
| **tether** | MIT (LICENSE) | OK — gamification-engine donor. |
| **trakit** | MIT (LICENSE) | OK |

**Other notes**
- **Transitive deps:** Apache-2.0 libs appear in `mymoodz` (DGCharts), `minimoods` (konfetti, MPAndroidChart) — permissive, just attribute. No copyleft (GPL/AGPL) detected in the inventories.
- **AI / privacy for children:** `lockin`, `ilseon`, `sidejot`, `tether`, `adhd-focus-mate`, `adhd-india` bundle Google Gemini (`@google/genai` / Gemini / OpenRouter). AI is **optional in all of them** and sends data off-device and/or needs API keys — **keep AI off by default** for a kids product (privacy/safety), or heavily guardrail it. Drop the surveillance pipelines entirely (`adhd-focus-mate` screenshots, `tether` `WindowMonitor`/`ActivityLogger`).

---

## 4. Build strategy & caveats for the `lockin` base

**Assemble:** base = `lockin` (router, sprites, timer, notifications, milestones, onboarding, NativeWind) → graft `habit-tracker-app`'s Ignite component kit + pickers + charts + settings screen → port `tether`'s gamification engine (AsyncStorage-backed) → port `momentum`'s streak math + mood selector + "add a step" UX → optionally port `sidejot`'s task-chunking prompt (re-toned, AI off by default).

**Must rework before shipping to kids:**
1. **Tone reversal.** `lockin` is built on a **shame/"mockery" accountability mechanic** (sprites get angry; AI is a "ruthless advisor") — verified in `ExecutionSprite.tsx` (`isAngry`, angry-jump). Replace every negative reaction with positive reinforcement.
2. **Goal model.** `lockin`'s "one immutable goal per year, app won't let you change it" rigidity is not kid-appropriate — replace with flexible, short-horizon goals/tasks.
3. **Art + copy.** Redraw SVG sprites as a friendly bubble buddy; replace adult motivational copy with kid-friendly language; brighten the dark "swiss-red" palette.
4. **SDK alignment.** `habit-tracker-app` is **Expo SDK 50 / RN 0.73** vs `lockin`'s **SDK 54 / RN 0.81** — lift its **components and screens** (mostly portable), not its app shell; re-verify the picker libs against the newer SDK.
5. **Add what no repo provides natively:** persistence/sync beyond AsyncStorage if multi-device parent/child is needed, a test suite (lockin has none), and `BOOT_COMPLETED` reschedule if you later adopt Android AlarmManager patterns.

---

## 5. One-line per-feature verdict (the mapping at a glance)

- **Focus timer →** lockin `app/focus-timer.tsx` (+`(focus)/`,`CountdownTimer`) · in-stack · Low–Med.
- **Rewards/gamification →** tether `GamificationService.ts`+Rewards tabs (port) + lockin `VictoryOverlay.tsx` (in-stack) · Med.
- **Mood logging →** momentum `MoodSelector.tsx` (port) + mymoodz `MoodGridView.swift` + ilseon `EnergyLevel.kt` patterns · Med.
- **Reminders/notifications →** lockin `services/notifications.ts`+`focusNotification.ts` · in-stack · Low (Med for state-aware, ref adhd-india/ilseon/medtimer/trakit).
- **Habit-streak calendar →** momentum `streaks.ts` (port) + lockin dot-grid widgets; refs trakit/medtimer/pomotroid/ilseon `StreakIndicator.kt` · Med.
- **Companion character →** lockin `components/dashboard/*Sprite.tsx` · in-stack · Med–High (retone art+behavior).
- **Task micro-steps →** lockin `MilestoneCard/Stack`+`focus-zone/*` + momentum `SubtaskForm.tsx` + tether `ChecklistRenderer.tsx` + sidejot AI prompt · Med.
- **Settings/parental controls →** habit-tracker-app `settings.tsx` + momentum quiet-hours + medtimer biometric gate · Low–Med.
- **Theming/design-system →** lockin NativeWind + habit-tracker-app `app/theme/*`+component kit; gamify via tether `DOCK_THEMES` · Low.
