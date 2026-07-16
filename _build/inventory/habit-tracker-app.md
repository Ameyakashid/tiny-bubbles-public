# Inventory: takanome-dev/habit-tracker-app

## Identity & verification
- **Repo URL:** https://github.com/takanome-dev/habit-tracker-app
- **Confirmed match:** Yes. React Native + TypeScript habit tracker, MIT license, built on the Infinite Red "Ignite" template. Matches the target description (not a namesake).
- **License:** MIT (`LICENSE`, "Copyright (c) 2024 takanome-dev").
- **Stars:** 46 · **Forks:** 9 · **Open issues:** 23
- **Last activity:** Last commit on `main` is `7b5fd60` dated **2025-04-06** (a dependabot axios bump). Repo metadata `updated_at` 2026-03-24. The app code itself was last meaningfully changed in early 2025.
- **Default branch:** `main` (shallow clone of HEAD succeeded).
- **Local path:** `/Users/ameyakashid/Desktop/adhd india/_sources/habit-tracker-app`

## Tech stack
- **React Native 0.73.4** on **Expo SDK 50** (Expo Router NOT used; classic file/screen structure via Ignite).
- **TypeScript** throughout.
- **Ignite** template (Infinite Red) scaffolding (`ignite/` generators, `app/` layout conventions).
- **State:** MobX-State-Tree (`mobx`, `mobx-state-tree`, `mobx-react-lite`) — but note the `RootStore` is currently EMPTY; screen data is mocked with static arrays.
- **Navigation:** React Navigation (`@react-navigation/native`, `native-stack`, `stack`, `bottom-tabs`).
- **UI / animation:** `react-native-paper`, `@gorhom/bottom-sheet`, `react-native-reanimated`, `expo-linear-gradient`, `@shopify/flash-list`, `@expo-google-fonts/space-grotesk`.
- **Habit-specific libs:**
  - `react-native-circular-progress` (animated progress rings)
  - `react-native-gifted-charts` (bar + pie charts for statistics)
  - `reanimated-color-picker` (per-habit color selection)
  - `rn-emoji-keyboard` (emoji icon selection)
  - `@react-native-community/datetimepicker` + `react-native-date-picker` (time selection)
  - `date-fns` (date formatting, localized)
- **Persistence:** `@react-native-async-storage/async-storage` (thin wrapper in `app/utils/storage/storage.ts`). Habits are NOT yet persisted; storage is wired only for MST root-store rehydration.
- **i18n:** `i18n-js` + `expo-localization`, languages: en, fr, ar, ko.
- **Networking:** `apisauce` API client boilerplate (unused for real endpoints).
- **Tooling:** Jest, Maestro (e2e), EAS build config, Reactotron devtools.

## Top-level layout
```
App.tsx, app.config.ts, app.json      Expo entry + config
babel/metro/tsconfig/jest configs     Build & test config
eas.json                              EAS build profiles
package.json, yarn.lock               Deps (yarn)
LICENSE (MIT), README.md
build-1714823588599.tar.gz            (19MB prebuilt artifact committed to repo)
assets/                               images + icons
ignite/                               Ignite generator templates
plugins/                              Expo config plugins
test/                                 test setup
types/                                ambient type decls
app/
  components/   Button, Card, Text, TextField, Toggle, Icon, Header,
                ListItem, ListView, Screen, EmptyState, AutoImage
  config/       app config
  devtools/     Reactotron
  i18n/         en/fr/ar/ko + translate helpers
  models/       MobX-State-Tree RootStore (empty) + helpers
  navigators/   app-navigator, types, styles, utilities
  screens/      home, create-habit, create-new-habit, edit-habit,
                statistics, settings, profile/*, ErrorScreen/*
  services/api/ apisauce client (boilerplate)
  theme/        colors, spacing, timing, typography
  utils/        storage(AsyncStorage), formatDate, layout, hooks
```

## Reusable for Tiny Bubbles (kids ADHD)
High-value, liftable pieces (all paths under `/Users/ameyakashid/Desktop/adhd india/_sources/habit-tracker-app`):

- **Daily completion progress rings** — `app/screens/home.tsx` uses `AnimatedCircularProgress` (`react-native-circular-progress`) with per-item `fill`/`color`. Ideal for kid-friendly "bubble fill" / progress-ring visuals.
- **Task / habit checklist with check-off** — `app/screens/home.tsx` (`tasks` array of `{emoji, name, time, finished}` + `Toggle`). Directly adaptable to a daily kids task list.
- **Emoji icon picker** — `app/screens/create-new-habit.tsx` (`rn-emoji-keyboard`, `selectedEmoji` state). Fun, kid-appropriate way to pick an icon per task.
- **Per-habit color picker** — `app/screens/create-new-habit.tsx` (`reanimated-color-picker`, `colorPicked` state inside a bottom sheet). For personalizing/color-coding tasks.
- **Day-of-week frequency selector** — `app/screens/create-new-habit.tsx` (`days` array + `handleSelectFrequency`). Reusable weekly routine scheduler UI.
- **Reminder scaffold + time picker** — `app/screens/create-new-habit.tsx` (`reminders` preset list "at time / 5/10/15/30 min before" + `DateTimePicker` for `habitTime`). NOTE: this is UI-only — no `expo-notifications` scheduling is implemented; you must wire actual local-notification scheduling yourself.
- **Statistics / progress charts** — `app/screens/statistics.tsx` (`BarChart` + `PieChart` from `react-native-gifted-charts`, with Day/Week/Month/3M/6M/Year filters). Basis for kid progress visuals.
- **Bottom-sheet modal pattern** — `app/screens/home.tsx` & `create-new-habit.tsx` (`@gorhom/bottom-sheet` with custom backdrop). Reusable for pickers/dialogs.
- **Theming system** — `app/theme/colors.ts` (palette + semantic tokens), `spacing.ts`, `typography.ts`, `timing.ts`. Central place to swap in a bright kids palette (current palette is muted/adult terracotta).
- **Reusable UI component library** — `app/components/*` (Ignite-quality `Button`, `Card`, `Text`, `TextField`, `Toggle`, `ListItem`, `Header`, `EmptyState`, `Screen`, `Icon`). Solid base primitives.
- **AsyncStorage helpers** — `app/utils/storage/storage.ts` (`load`/`save`/`loadString`/`saveString`/`remove`/`clear`). Drop-in local persistence.
- **Localized date formatting** — `app/utils/formatDate.ts` (`date-fns` + locale).
- **Settings screen scaffold** — `app/screens/settings.tsx` (dark-mode toggle, notifications, language, about, rate-us rows). Good base for a parental/settings page.
- **Navigation scaffold** — `app/navigators/*` (bottom tabs + nested stacks, typed routes).
- **Error boundary** — `app/screens/ErrorScreen/ErrorBoundary.tsx` + `ErrorDetails.tsx`.
- **i18n scaffolding** — `app/i18n/*` for multi-language support.

## Caveats / gaps (what is NOT here)
- **No real data layer:** habits/tasks/checkins are hard-coded mock arrays; `RootStore` is empty — no CRUD, no streak calculation, no persistence of habits.
- **No working reminders/notifications:** reminder options and a "Notifications" settings link exist as UI only; `expo-notifications` is not a dependency and nothing is scheduled.
- **No gamification / rewards system, no companion character, no mood logging, no task-breakdown logic, no streak-calendar** — all of these would need to be built from scratch.
- **Styling targets adults** (Space Grotesk font, muted terracotta palette) — needs re-theming for a polished, playful kids experience.
- A large prebuilt artifact (`build-1714823588599.tar.gz`, ~19MB) is committed in the repo root and can be ignored.

## Bottom line
A clean, well-structured Ignite/Expo RN+TS habit-tracker UI. Best reused as a **UI/screen and component starting point** (progress rings, emoji/color pickers, charts, theming, components, navigation, storage helpers) rather than as a finished engine — core logic (persistence, streaks, real reminders, gamification) is absent and must be implemented for Tiny Bubbles.
