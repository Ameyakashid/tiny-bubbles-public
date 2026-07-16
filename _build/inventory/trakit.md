# Trakit — Source Inventory

- **Repo URL:** https://github.com/tylxr59/Trakit
- **Homepage:** https://gettrakit.app
- **License:** MIT (LICENSE — Copyright (c) 2026 tylxr)
- **Stars:** 2 (small/early-stage project, but exactly the described tool — not a namesake)
- **Last activity:** last push 2026-02-05; repo metadata updated 2026-05-26
- **Local clone:** `/Users/ameyakashid/Desktop/adhd india/_sources/trakit` (shallow `--depth 1`, branch `main`)
- **Version:** 0.2.1

## Verified match
Self-hosted SvelteKit + TypeScript + PostgreSQL habit tracker with a GitHub-style
contribution calendar, custom-session auth, Material 3 UI, and Docker deployment under
the MIT license — matches the target description exactly.

## Tech stack
- **Framework:** SvelteKit 2 + Svelte 5 (runes), TypeScript, Vite 7
- **Styling:** Tailwind CSS 4, Material 3 (`@material/material-color-utilities`), Iconify (Material Symbols)
- **DB:** PostgreSQL via `pg`, migrations via `node-pg-migrate`
- **Auth/security:** `@node-rs/argon2` (password hashing), `@oslojs/crypto` + `@oslojs/encoding` (custom sessions), CSRF tokens, rate limiting
- **Notifications:** Web Push (`web-push`, VAPID) + ntfy; cron scheduling via `node-cron`; timezone math via `luxon`
- **PWA:** `vite-plugin-pwa` (manifest, service worker, installable)
- **Email:** `nodemailer` (verification)
- **Deploy:** Docker / docker-compose, Caddy (auto-HTTPS), `adapter-node`

## Top-level layout
```
admin.sh, setup.sh          # ops/admin shell scripts
Caddyfile                   # reverse proxy / auto-HTTPS
docker-compose.yml, Dockerfile, .env.example
migrations/                 # node-pg-migrate SQL/JS migrations (schema, frequency, CSRF, notif prefs)
scripts/generate-notification-keys.mjs   # VAPID key generation
static/                     # PWA icons + manifest.webmanifest
gettrakit.app/              # marketing site assets
src/
  lib/
    components/             # CalendarGrid, ColorPicker, HabitCard, HabitRow (.svelte)
    server/                # db, sessions, validation, rateLimit, encryption, email,
                           #   notifications, scheduler, habitUtils, logger
    stores/theme.svelte.ts # dark/light theme store
    dateUtils.ts           # week/month key helpers
    swr.svelte.ts          # stale-while-revalidate auto-refetch
  routes/
    +layout / +page        # main dashboard
    habit/[id]/            # per-habit detail
    login, signup, logout, settings
    api/                   # habit, stamp, reorder, notifications/{subscribe,preferences,test,ntfy-url}
```

## Reusable for Tiny Bubbles (kids ADHD)

- **Habit-streak calendar (GitHub-style heatmap)** — `src/lib/components/CalendarGrid.svelte`
  Color-coded completion grid with theme-aware level palette and percentage/aggregate
  coloring. Directly reusable as a visual "look how many days you bubbled!" reward grid.
- **Streak / frequency logic** — `src/lib/server/habitUtils.ts` (`calculateStreak`, week/month
  aggregation) + `src/lib/dateUtils.ts` (`getWeekKey`, `getMonthKey`).
  Timezone-aware daily/weekly/monthly streak counting — the backbone of a kid streak/reward engine.
- **Reminder / notification scheduler** — `src/lib/server/scheduler.ts` (per-user-timezone
  `node-cron` job) + `src/lib/server/notifications.ts` (Web Push + ntfy, `createReminderMessage`)
  + `scripts/generate-notification-keys.mjs`. Reusable as the "time to do your task" nudge
  scheduler — central to ADHD reminders.
- **Notification preferences API + subscribe flow** — `src/routes/api/notifications/*`
  (`subscribe`, `preferences`, `test`, `ntfy-url`). Wiring for opt-in/test push, reusable for
  parent-configured reminders.
- **Habit card / row UI + "stamp today" interaction** — `src/lib/components/HabitCard.svelte`,
  `HabitRow.svelte`, `src/routes/api/stamp/+server.ts`, `src/routes/api/reorder/+server.ts`.
  The toggle-complete-today + drag-reorder task list maps onto a kid task list / task-breakdown UI.
- **Theming + color picker** — `src/lib/stores/theme.svelte.ts` (dark/light store, cookie-persisted),
  `src/lib/components/ColorPicker.svelte`, `tailwind.config.js`, Material 3 color utilities.
  Reusable for per-kid bubble colors and playful theming / settings.
- **PWA shell** — `static/manifest.webmanifest`, PWA icons, `vite-plugin-pwa` config in
  `vite.config.ts`. Installable offline-capable app shell, good base for a kids home-screen app.
- **Stale-while-revalidate refresh** — `src/lib/swr.svelte.ts`. Auto-refetch on focus/reconnect
  keeps streaks/state fresh across a parent + kid device.
- **Auth / session / safety primitives** — `src/lib/server/{sessions,validation,rateLimit,encryption,email}.ts`,
  `src/routes/{login,signup,logout,settings}`. Mostly relevant for a parent/guardian account layer;
  password hashing + sessions reusable, though a kids app likely needs a lighter/parental-gate flow.
- **Data model reference** — `migrations/` (habits, completion "stamps", frequency, notification
  preferences). Useful schema starting point for tasks + completions + reminder settings.

### Less reusable / kids-app gaps to build new
No gamification/reward visuals beyond the calendar, no companion character, no mood logging,
no timer engine, and no task-breakdown logic — these would be new for Tiny Bubbles. The streak
engine, calendar, reminder scheduler, theming, and PWA shell are the strongest lifts.
