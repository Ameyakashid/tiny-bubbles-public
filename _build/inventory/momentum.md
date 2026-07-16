# Momentum — Inventory

## Identity
- **Repo URL:** https://github.com/vishalhjoshi/momentum
- **Description:** "A calm, forgiving task and journal app designed for ADHD brains—focused on showing up, not perfection." Combines task management (with micro-step breakdown, no-guilt completion) and a daily journal with mood/energy tracking.
- **License:** MIT (`LICENSE`, Copyright (c) 2024 Vishal) — confirmed.
- **Stars:** 1
- **Created:** 2026-01-10 · **Last activity (pushed):** 2026-01-13 (commit `bc72918`, default branch `main`)
- **Status:** In development (README says Phase 0); core feature code for tasks/journal/auth/analytics is present and substantial.
- **Disambiguation:** This is the ADHD task-manager + journal "Momentum" framed around "showing up, not perfection" (README line 3 and Design Principle #7 "Celebrate Effort — Reward showing up, not perfection"). NOT MomentumDash, Momentum Habit Tracker, or other namesakes.

## Tech Stack
- **Frontend:** React 18 + TypeScript + Vite + Tailwind CSS; TanStack Query (React Query); React Router; lucide-react icons. Feature-module layout.
- **Backend:** Node.js + TypeScript + Fastify + Prisma ORM + PostgreSQL. Zod validation, JWT auth (`@fastify/*` helmet/cors/rate-limit), bcryptjs, pino logging, node-cron for scheduled jobs, date-fns / date-fns-tz for timezone-aware logic.
- **Monorepo:** pnpm workspaces (`pnpm-workspace.yaml`), Docker + docker-compose for full stack, nginx for frontend serving.

## Top-Level Layout
```
momentum/
├── frontend/                 # React 18 + Vite + Tailwind app
│   └── src/
│       ├── app/              # App shell + pages (Home, Journal, Settings, Analytics, DesignSystem)
│       ├── features/         # auth, tasks, journal, analytics (each: components/hooks/types)
│       ├── components/ui/    # Shared UI kit (Button, Card, Modal, Toast, Toggle, calendar, etc.)
│       ├── lib/              # api client, queryClient, theme, utils
│       ├── hooks/            # use-media-query, useReducedMotion
│       └── styles/           # index.css (Tailwind, design tokens)
├── backend/                  # Fastify + Prisma API
│   ├── src/
│   │   ├── modules/          # auth, tasks, journal, user, analytics (routes/schemas/service)
│   │   ├── lib/              # prisma, logger, errors, streaks.ts
│   │   └── jobs/             # dailyRollover.ts (cron)
│   └── prisma/               # schema.prisma + migrations
├── installer/                # packaging/installer
├── docker-compose.yml / .prod.yml, *.Dockerfile, nginx.conf
└── docs: README, TECH_STACK, IMPLEMENTATION_ROADMAP, DEPLOYMENT*, ENV_VARS, SETUP, CONTRIBUTING
```

## Reusable for Tiny Bubbles (kids ADHD)
- **Habit/streak engine (high value):** `backend/src/lib/streaks.ts` — timezone-aware task & journal streak calculation (increment if done yesterday, reset only after a gap). Pure, forgiving logic that maps directly to a kids "daily streak" reward. Pair with the streak fields on the `User` model in `backend/prisma/schema.prisma`.
- **Forgiving task rollover / reminder scheduler:** `backend/src/jobs/dailyRollover.ts` + `node-cron` setup in `backend/src/index.ts` (`cron.schedule('0 * * * *', ...)`). Incomplete TODAY tasks roll to SOMEDAY instead of being marked "failed", and TOMORROW promotes to TODAY — exactly the "no shame spiral" mechanic for kids. Reuse the hourly per-timezone job pattern for reminder scheduling too.
- **Task-breakdown / micro-steps logic:** `frontend/src/features/tasks/components/SubtaskForm.tsx` (one-tap "add a step"), `TaskItem.tsx`, `TaskList.tsx`, `CreateTaskModal.tsx`, `RescheduleMenu.tsx`, and `frontend/src/features/tasks/hooks/useTaskQueries.ts`. Backend: `backend/src/modules/tasks/` (routes/schemas/service) with parentTaskId subtasks. Great basis for "break a big task into tiny bubbles".
- **Mood logging UI + prompts:** `frontend/src/features/journal/components/MoodSelector.tsx`, `JournalEditor.tsx`, `TodayJournalPanel.tsx`, `JournalHistory.tsx`, and the prompt bank `frontend/src/features/journal/data/prompts.ts` (gentle reflection prompts — easily swapped for kid-friendly ones). `Mood` enum + `JournalEntry` model in `prisma/schema.prisma`.
- **Reward/progress visualization:** `frontend/src/features/analytics/components/MoodChart.tsx` and `StatCard.tsx` + `useAnalyticsQueries.ts`; backend `backend/src/modules/analytics/`. Useful for kid-facing progress charts / "look how many bubbles you popped" stats.
- **Calendar / streak surface:** `frontend/src/components/ui/fullscreen-calendar.tsx` for a habit-streak calendar view.
- **Theming & accessibility (kid-skinnable):** `frontend/src/lib/theme/ThemeProvider.tsx` + `frontend/src/components/ui/ThemeProvider.tsx`, `frontend/tailwind.config.js`, `frontend/src/styles/index.css`. Dark-mode-by-default tokens, plus `frontend/src/hooks/useReducedMotion.ts` and `use-media-query.ts` — reskin to bright/playful for kids while keeping reduced-motion/contrast support.
- **Settings / preferences pattern:** `frontend/src/app/pages/SettingsPage.tsx` + `backend/src/modules/user/service.ts` (notificationsEnabled, quiet-hours times, theme). Drop-in pattern for parental/kid preference toggles.
- **Notification plumbing:** `NotificationSubscription` model in `prisma/schema.prisma` + `notificationsEnabled` preference — scaffolding for reminder/notification opt-in (note: push delivery itself is not yet fully implemented).
- **Shared UI kit:** `frontend/src/components/ui/` (Button, Card, Modal, Toast/Toaster/ToastProvider, Toggle, Input, glowing-card, slider-number-flow) — a ready, accessible component set to accelerate a polished kids UI. Immediate "you did it!" feedback via the Toast system fits the gamified reward loop.
- **Companion character:** No companion/mascot component exists in this repo — would need to be built new for Tiny Bubbles.

## Notes
- Repo is early-stage (1 star, README marked Phase 0) but the tasks/journal/auth/analytics modules contain real, working code — the streak engine, forgiving rollover job, and subtask/task-breakdown flows are the highest-value, most directly liftable pieces.
- Backend logic is PostgreSQL/Prisma-coupled; the streak and rollover algorithms are portable, but a kids app on a different stack would reimplement the data layer.
- No `npm install` / `pod install` / `gradle` was run — clone + inspection only, per instructions.
