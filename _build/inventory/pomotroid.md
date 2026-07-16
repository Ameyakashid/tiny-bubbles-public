# Pomotroid — Source Inventory

- **Repo URL:** https://github.com/Splode/pomotroid
- **Homepage:** https://pomotroid.app
- **License:** MIT (Copyright (c) 2018 Christopher Murphy / "Splode") — see `_sources/pomotroid/LICENSE`
- **Stars:** ~5,296
- **Last activity:** Actively maintained — last commit 2026-06-19, last push 2026-06-22 (current release v1.7.1)
- **Local clone:** `/Users/ameyakashid/Desktop/adhd india/_sources/pomotroid` (shallow, `--depth 1`)

## Disambiguation / verification

Confirmed the correct repo (not a namesake): GitHub description "Simple and visually-pleasing Pomodoro timer", MIT license, Rust as primary language, Tauri + Svelte stack, ~5.3k stars — matches the target description exactly.

## Tech stack

- **Desktop shell:** Tauri 2 (Rust backend). NOTE: this current version has migrated OFF the older Electron/Vue stack mentioned in the brief — it is now **Tauri 2 + Svelte 5 + TypeScript + Vite + SvelteKit (adapter-static)**.
- **Frontend:** Svelte 5 (runes), SvelteKit, TypeScript, Vite 8.
- **Backend (Rust, `src-tauri`):** SQLite via `rusqlite` (sessions/stats/settings/themes persistence), `rodio` (audio), `tauri-plugin-notification`, `tauri-plugin-log`, global-shortcut + tray.
- **i18n:** Inlang / Paraglide-JS, 8 locales (`src/messages/{en,de,es,fr,ja,pt,tr,zh}.json`).
- **Theming:** 38 bundled JSON color themes + user custom themes with hot-reload (file watcher).

## Top-level layout

```
src/                      Svelte/TS frontend
  app.css, app.html
  lib/
    components/           Timer.svelte, TimerDial, TimerDisplay, TimerFooter,
                         MiniControls, Titlebar, Tooltip(Info),
                         ShortcutInput, LocalShortcutInput,
                         settings/ (SettingsToggle, SettingsTitlebar, sections/),
                         stats/ (DailyView, WeeklyView, YearlyView)
    stores/              settings.ts, theme.ts, timer.ts
    utils/               locale.ts, localShortcuts.ts, platform.ts, theme.ts
    ipc/                 index.ts (typed Tauri command bindings)
    locale.svelte.ts, types.ts
  messages/              8 locale JSON files
  routes/                +page.svelte (main), settings/, stats/
src-tauri/               Rust backend
  src/
    timer/               engine.rs (drift-correcting timer), sequence.rs (round sequencing), mod.rs
    db/                  migrations.rs, queries.rs (sessions, stats, heatmap, streaks), mod.rs
    themes/              mod.rs, watcher.rs (hot-reload)
    audio/               mod.rs (rodio playback, embedded + custom cues)
    notifications/       mod.rs (cross-platform desktop notifications)
    settings/            mod.rs, defaults.rs
    shortcuts/           mod.rs (global shortcuts)
    tray/                mod.rs (system tray)
    websocket/           mod.rs
    commands.rs, lib.rs, main.rs
  Cargo.toml, tauri.conf.json, capabilities/, icons/
static/                  audio/ (4 mp3 cues), themes/ (38 JSON), fonts/, app-icon.png
scripts/, openspec/, project.inlang/
README.md, CHANGELOG.md, THEMES.md, CONTRIBUTING.md, SECURITY.md, CLAUDE.md
```

## Reusable for Tiny Bubbles (kids ADHD)

Strong, directly liftable pieces (timer + persistence + theming + feedback are production-quality):

- **Timer engine (core focus/break engine):** `src-tauri/src/timer/engine.rs` — drift-correcting monotonic timer on a dedicated thread with Start/Pause/Resume/Reset/Skip plus OS sleep/wake handling. Ideal robust base for a kids focus timer. Paired frontend store: `src/lib/stores/timer.ts`.
- **Round sequencing / task-segmentation logic:** `src-tauri/src/timer/sequence.rs` — work → short-break → long-break cycling with configurable counts. Can be repurposed to break a kid's task into work bursts + reward breaks (closest existing analog to "task-breakdown").
- **Habit-streak calendar + streaks (gamification primitives):** `src-tauri/src/db/queries.rs` — `get_heatmap_data()` (GitHub-style daily activity calendar) and `get_streak()` (current/longest consecutive-day streaks). These are the readiest base for streak/reward gamification. Frontend: `src/lib/components/stats/{DailyView,WeeklyView,YearlyView}.svelte` and `src/routes/stats/+page.svelte`.
- **Session persistence + stats schema:** `src-tauri/src/db/migrations.rs` (SQLite `sessions` table: started_at/ended_at/round_type/duration/completed) and `queries.rs` (daily/weekly/all-time aggregates). Reusable foundation for tracking a child's completed sessions and progress.
- **Theming / settings UI (polish + engagement):** `src-tauri/src/themes/` + `static/themes/*.json` (38 themes) + `src/lib/stores/theme.ts` + hot-reload `themes/watcher.rs`. Swap palettes for bright kid-friendly themes; theme schema is just named CSS custom properties. Settings UI scaffolding: `src/lib/components/settings/` (`SettingsToggle.svelte`, sections/).
- **Audio cue / reward-sound system:** `src-tauri/src/audio/mod.rs` + `static/audio/*.mp3` — embedded + user-replaceable per-cue sounds. Reuse for cheerful reward chimes on task completion.
- **Notification / reminder dispatcher:** `src-tauri/src/notifications/mod.rs` — cross-platform (macOS/Windows/Linux) notification send. Base for gentle reminders/prompts.
- **Timer visuals (engaging UI):** `src/lib/components/{TimerDial,TimerDisplay,Timer,MiniControls}.svelte` — animated radial dial + display; a strong starting point for a playful kids timer face (e.g. a filling "bubble").
- **i18n scaffolding:** `src/messages/*.json` + Paraglide setup — multi-language support if Tiny Bubbles ships beyond English.
- **Typed IPC layer:** `src/lib/ipc/index.ts` — clean pattern for frontend↔Rust command bindings to copy.

### Gaps (NOT present — would need to be built for Tiny Bubbles)

- No companion/mascot character.
- No mood-logging UI.
- No explicit reward/points/badge system (only streaks + heatmap exist as gamification primitives).
- No multi-step task-breakdown feature (only fixed Pomodoro round sequencing).
- UI is adult/minimalist — kid-friendly visual design, larger touch targets, and playful copy must be added.

### Note on platform fit

Pomotroid is a **desktop** (Tauri) app. If Tiny Bubbles targets mobile/tablet (common for kids apps), the Rust modules (timer engine, sequencing, stats/streak SQL, theming logic) are portable as logic/algorithms, but the Svelte UI and Tauri desktop shell (tray, global shortcuts, desktop notifications) would need reworking for a mobile runtime. Tauri 2 does support mobile (iOS/Android — note `src-tauri/icons/android` and `ios`), so a Tauri-mobile path is viable.
