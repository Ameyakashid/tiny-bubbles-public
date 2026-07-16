# FocusTide — Source Inventory

- **Repo URL:** https://github.com/Hanziness/FocusTide
- **License:** MIT (© 2022 Imre Gera and contributors) — confirmed in `LICENSE`
- **Stars:** ~399
- **Last activity:** Last commit 2024-11-22 (`439d430` "refactor: Update dependencies"); repo metadata updated 2026-06-23. Project is mature/stable.
- **Identity:** Browser-based, customizable Pomodoro / focus timer. `package.json` name is `another-pomodoro` (the project was formerly *AnotherPomodoro*; also referenced as PomoFocus/ZeroPomodoro), now branded **FocusTide**. Matches target description.
- **Local clone:** `/Users/ameyakashid/Desktop/adhd india/_sources/focustide`

## Tech Stack
- **Framework:** Nuxt 3 + Vue 3 (`nuxt ^3.13`, `vue ^3.5`)
- **State:** Pinia (`pinia ^2.2`, `@pinia/nuxt`) with `store-persist.client.ts` (localStorage persistence)
- **Styling:** TailwindCSS 3 + SCSS/PostCSS
- **Icons:** `@tabler/icons-vue`
- **i18n:** `vue-i18n` (en, es, fr, hr, hu, pt, zh) + Crowdin
- **PWA:** Workbox service worker (offline / installable)
- **Tooling:** Vite, TypeScript, ESLint, Stylelint, yarn 4
- **Deploy target:** static site generation (`nuxi generate`), Netlify config present

## Top-Level Layout
```
app.vue, error.vue            # root app + error page
nuxt.config.ts                # Nuxt config
tailwind.config.js            # theme tokens
assets/                       # css, scss, transitions, mixins, settings (timerPresets, adaptiveTicking)
components/                   # base/ timer/ schedule/ todoList/ settings/ setup/ tutorial/ socialButtons/ error/
  components/ticker.ts        # core timer loop (useTicker composable)
stores/                       # Pinia stores (see below)
plugins/                      # i18n.ts, store-persist.client.ts
modules/build/                # pwa.ts, icon_resize.ts (build-time)
platforms/                    # web.ts, mobile.ts platform abstraction
layouts/                      # default.vue, timer.vue
i18n/                         # locale JSON files
public/                       # audio/ (musical, sharp sound sets), img, icons, manifest
```

### Key Pinia stores (`stores/`)
- `schedule.ts` — timer state machine (`TimerState`: STOPPED/RUNNING/PAUSED/COMPLETED), schedule series of work/short-pause/long-pause sections
- `settings.ts` — all config: theme colors (per-section RGB), dark mode, sound set, volume, timer presets, adaptive ticking, permissions
- `tasklist.ts` — to-do list with priority, section, and `TaskState` (waiting/inProgress/complete)
- `notifications.ts` — browser Notification permission wrapper
- `events.ts` — event log (timer start/pause/finish, focus gain/lost) — analytics-ready
- `tutorials.ts` — onboarding/tutorial gating state
- `loading.ts`, `openpanels.ts` — UI state

## Reusable for Tiny Bubbles (kids ADHD)

- **Timer engine (highest value):** `components/ticker.ts` (`useTicker` reactive tick loop) + `stores/schedule.ts` (state machine + section series) + `stores/settings.ts` timer length logic. Framework-agnostic-ish core; drop-in for any focus/activity timer.
- **Adaptive ticking (battery/perf):** `stores/settings.ts` adaptive-tick logic + `assets/settings/adaptiveTickingMultipliers.ts` — slows the tick when the tab is hidden. Useful for a mobile kids app to save battery.
- **Timer presets:** `assets/settings/timerPresets.ts` — easy/default/advanced presets. For kids, replace with short, age-appropriate presets (e.g. 5/10 min "bubbles").
- **Multiple timer visualizations:** `components/timer/display/` (`timerTraditional`, `timerApproximate`, `timerPercentage`, `timerComplete`, `_timerSwitch`) + `components/timer/timerProgress.vue` + `components/timer/splashScreen.vue`. The percentage/approximate visuals are good bases for a playful "bubble filling up" progress animation.
- **Task-breakdown / to-do logic:** `stores/tasklist.ts` + `components/todoList/` (`todoList`, `todoDisplay`, `todoItem`, `addTask`). Priority + per-section tasks map directly to breaking a chore into small kid-friendly steps.
- **Schedule / "what's next" UI:** `components/schedule/` (`scheduleDisplay`, `scheduleItem`) — a visual upcoming-sessions strip, reusable as a kid's visual routine/agenda.
- **Notification + sound reminders:** `stores/notifications.ts` (permission handling) + `public/audio/musical` & `public/audio/sharp` sound sets + per-section end sounds in `settings.ts`. Swap audio for child-friendly chimes; the section-end-action flow (`SectionEndAction`) is reusable.
- **Theming / color system:** `components/settings/theme/` (`themeSettings`, `themePreview`, `colorChanger`, `colorUtils.ts`, `prebuiltThemes.ts`) + per-section RGB theme in `settings.ts` + `tailwind.config.js`. Strong base for bright, customizable kid themes and a "pick your color" UI.
- **Settings panel framework:** `components/settings/` (`settingsPanel`, `settingsItem`, `aboutTab`) + `exportButton`/`importButton` (settings JSON export/import). Reusable settings scaffold incl. parent-facing config + data export.
- **Reusable UI kit:** `components/base/` (`uiButton`, `uiToggle`, `uiProgress`, `uiOption`, `optionGroup`, `popupSheet`, `uiOverlay`, `inputNumber`, `inputTime`, `uiDivider`). Generic, theme-aware primitives to bootstrap the kids UI fast.
- **Onboarding / tutorial flow:** `components/tutorial/` (`tutorialOnboarding`, `_tutorialView`) + `stores/tutorials.ts` + `components/setup/step.vue`. Good base for a first-run guided experience for kids/parents.
- **Persistence:** `plugins/store-persist.client.ts` — auto-saves Pinia stores to localStorage. Reuse so a child's progress/settings survive reloads.
- **Event log (foundation for gamification/streaks):** `stores/events.ts` records timer completions with timestamps. NOTE: there is **no built-in reward/gamification, mood logging, habit-streak calendar, or companion character** — these must be built fresh, but the event log + completion events are the data hook to build streaks/rewards on top of.
- **PWA / offline + i18n:** `modules/build/pwa.ts`, Workbox config, and `i18n/` locales — installable offline app with multi-language support out of the box.

### Gaps (NOT present — build new for Tiny Bubbles)
- Reward / points / sticker gamification system
- Mood logging UI
- Habit-streak calendar
- Companion / mascot character
- Kid-oriented visual design (current UI is minimal/adult productivity)
