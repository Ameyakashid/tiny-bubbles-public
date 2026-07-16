# LockIn — Source Inventory

## Identity
- **Repo URL:** https://github.com/byadhddev/lockin26
- **Name / tagline:** LockIn — "One Year. One Goal." A psychology-first goal-tracking app with a companion sprite that holds you accountable. Built with ADHD brains in mind.
- **License:** MIT (`LICENSE`, Copyright (c) 2025 adhd.dev / @adhd_paws) — confirmed.
- **Stars:** ~10
- **Last activity:** last commit / push 2025-12-31; repo metadata updated 2026-04-26.
- **Primary language:** TypeScript

> Note: The README points to a canonical clone URL `https://github.com/adhdpaws/lockin.git`, but that repo returns HTTP 404 (private/renamed). The matching public repo is **byadhddev/lockin26**, which fits the description exactly (Expo + RN + TS, companion sprite, focus timer, accountability, MIT, ADHD focus). Cloned successfully.

## Tech Stack
- **Framework:** Expo SDK 54 (managed + dev-client), `expo-router` v6 (file-based navigation)
- **Runtime:** React Native 0.81.5, React 19.1
- **Language:** TypeScript 5.9 (strict)
- **Styling/theming:** NativeWind v4 (Tailwind CSS) — `tailwind.config.js`, `global.css`
- **Animation:** React Native Reanimated v4 + `react-native-worklets`; `react-native-svg` for sprite art
- **Storage:** AsyncStorage (no backend / offline-first)
- **Notifications:** `expo-notifications` + `@notifee/react-native` (live persistent timer notification)
- **Sensors / haptics:** `expo-sensors` (tilt interactions), `expo-haptics`, `expo-av` (sounds)
- **AI:** On-device via `expo-ai-kit` with `@google/genai` (Gemini) fallback
- **Other UI:** `react-native-draggable-flatlist`, `react-native-tab-view` / pager, `react-native-view-shot`, date-fns
- **Package manager:** Bun (`bun.lock`) and npm (`package-lock.json`) both present

## Top-Level Layout
```
app/                      Expo Router screens
  (onboarding)/           first-time goal setup flow
  (tabs)/                 dashboard, journey, profile
  (focus)/                focus session + debrief
  focus-zone/             milestone management (tabs: index/campaign/manual, edit, review)
  focus-timer.tsx         standalone focus timer screen
  shiny-object.tsx        AI distraction detector
  tactical-plan.tsx / war-path.tsx
components/
  dashboard/              sprites (companion chars) + widgets (progress, countdown, milestones, victory)
  onboarding/             multi-step onboarding (goal/motivation/time-left/contract)
  ui/                     shared UI (DynamicAlert)
  war-room/               campaign timeline + tactical cards
  AnimatedSplashScreen.tsx, BentoCard.tsx
services/                 gemini.ts (AI), notifications.ts, focusNotification.ts
contexts/                 AIContext.tsx
hooks/                    useOnDeviceAI.ts
types.ts                  shared TS types (Goal, Milestone, ChatMessage, etc.)
assets/                   icons, images, sounds/
config: app.json, eas.json, babel.config.js, metro.config.js, tailwind.config.js, tsconfig.json
```

## Reusable for Tiny Bubbles (kids ADHD)
- **Companion character / mascot system** — `components/dashboard/*Sprite.tsx` (`BoatingSprite`, `ExecutionSprite`, `FocusLogSprite`, `JourneySprite`, `ScannerSprite`, `WorkoutSprite`). Reanimated + SVG reactive characters that respond to user state. Strongest reuse candidate — swap art for a kid-friendly "bubble buddy" and keep the reactive-animation pattern.
- **Focus / Pomodoro timer engine** — `app/focus-timer.tsx`, `app/(focus)/index.tsx` + `app/(focus)/debrief.tsx`, and `components/dashboard/CountdownTimer.tsx`. Session lifecycle, countdown, and a post-session "debrief" screen. Adapt durations to short kid-sized blocks.
- **Notification / reminder scheduler** — `services/notifications.ts` (expo-notifications permission registration + scheduling, Android channels) and `services/focusNotification.ts` (live, updating persistent timer notification via Notifee). Drop-in reminder/notification engine.
- **Habit-streak / progress visualization** — `components/dashboard/YearProgressWidget.tsx` + `YearProgressWidgetCat.tsx`, `DayProgressWidget(.../Cat).tsx`, `DateWidget.tsx`, `GreetingWidget.tsx`. Dot-grid "days passed/left" calendar = ready-made streak/progress visuals.
- **Reward / gamification & celebration** — `components/dashboard/VictoryOverlay.tsx` (win celebration overlay) and `MotivationCard.tsx`. Reuse for sticker/reward moments when a kid completes a task.
- **Task-breakdown / milestone logic** — `components/dashboard/MilestoneCard.tsx`, `MilestoneStack.tsx`, `app/focus-zone/*` (milestone CRUD, `edit-milestone.tsx`, `review.tsx`, `manual.tsx`, `campaign.tsx`), `TacticalPlanDrawer.tsx`. Pattern for breaking a goal into ordered, draggable sub-steps (uses `react-native-draggable-flatlist`).
- **Multi-step onboarding flow** — `components/onboarding/` (`GoalInputStep`, `MotivationStep`, `TimeLeftStep`, `ContractStep`) + `app/(onboarding)/`. Reusable wizard scaffold; adapt to a parent/kid setup flow.
- **AI task-planning / breakdown** — `contexts/AIContext.tsx`, `hooks/useOnDeviceAI.ts`, `services/gemini.ts`. On-device-first (with Gemini fallback) generation that turns a goal into milestones and detects "distractions." Reusable to auto-generate kid-sized task lists. CAUTION: prompts are tuned to a "ruthless advisor / mockery" tone — must be fully rewritten to gentle, positive language for children.
- **Sensor-driven playful interaction** — `app/(tabs)/journey.tsx` + `JourneySprite` use `expo-sensors` tilt to make milestones physically bounce. Engaging, tactile mechanic well-suited to kids.
- **Theming / design-system primitives** — NativeWind/Tailwind setup (`tailwind.config.js`, `global.css`), `components/BentoCard.tsx` (card layout), `components/ui/DynamicAlert.tsx`, `components/AnimatedSplashScreen.tsx`. Reusable polished UI shell and theming foundation.

### Adaptation caveats for a kids' app
- The accountability model is built on a **shame/"mockery" mechanic** (sprite laughs/shouts/slow-claps on failure) — explicitly NOT appropriate for children; replace with purely positive reinforcement.
- The **"one immutable goal per year, app won't let you change it"** rigidity is not kid-appropriate; Tiny Bubbles needs flexible, short-horizon goals.
- No backend (AsyncStorage only) and no test suite — fine for a fresh build, but expect to add persistence/sync and tests.
