# Sidejot — Source Inventory

AI-powered Pomodoro planner: privacy-focused, ADHD-friendly, accessible. Breaks down vague daily goals into actionable 25-minute (one-pomodoro) tasks.

## Repository

- **Canonical URL**: https://github.com/Illyism/sidejot
- **Alias (redirects to canonical)**: https://github.com/sidejot/sidejot
- **Homepage**: https://sidejot.com/
- **License**: MIT (confirmed via SPDX `MIT`; `LICENSE.md` contains the MIT permission text, "Copyright (c) 2025 Sidejot"; README also states MIT)
- **Stars**: 96 | **Forks**: 15
- **Last activity**: 2026-06-15 (HEAD commit `eb31181`, "refactor: enhance OpenRouter API key handling…")
- **Archived**: No
- **Topics**: adhd, pomodoro, task-scheduler, todo
- **Cloned to**: `/Users/ameyakashid/Desktop/adhd india/_sources/sidejot` (shallow, depth 1, branch `main`)

## Tech Stack

- **Framework**: Next.js 16 (App Router, React 19, Turbopack) — README says "Next.js 15", package.json pins `next@^16`
- **Language**: TypeScript 5.9
- **Styling**: Tailwind CSS v4 + shadcn/ui (Radix primitives), `next-themes` for dark/light
- **State**: Zustand (per README) + Jotai (`jotai` in deps); `react` hooks in practice
- **Local DB / persistence**: Dexie.js (IndexedDB), `dexie-react-hooks` `useLiveQuery` (local-first, offline)
- **AI**: Vercel AI SDK 5 (`ai`, `@ai-sdk/react`) via OpenRouter (`@openrouter/ai-sdk-provider`), default model `google/gemini-2.5-flash`. User supplies their own API key (stored locally, sent only as request header).
- **Other libs**: framer-motion, lucide-react (icons), date-fns, zod (schema), sonner (toasts), vaul (drawer), react-textarea-autosize, `@libsql/client`
- **Package manager**: Bun (`bun.lock`)
- **Tooling**: ESLint, Prettier, changesets, Plausible analytics, Vercel deploy

## Top-Level Layout

```
app/                  Next.js App Router
  (app)/              main app route (layout.tsx, page.tsx)
  api/
    chat/route.ts            AI chat streaming
    diff/route.ts            generates a short title by diffing plan versions
    tasks/generate/route.ts  core AI task-breakdown endpoint (+ schema.ts)
  layout.tsx
components/
  app/                active-session.tsx, plan-history.tsx, plan-input.tsx, settings.tsx
  ui/                 shadcn/ui primitives (button, card, dialog, drawer,
                      progress, select, time-picker, tooltip, sonner, …)
  main-nav, mobile-nav, mode-switcher, theme-switcher, providers,
  site-header, site-footer, icons, plausible
config/               nav.ts, site.ts
hooks/                use-config.ts, use-debounce.ts, use-meta-color.ts
lib/                  ai.ts, config.ts, db.ts, fetch.ts, session-manager.ts, utils.ts
public/_static/       Hero.aiff (timer-complete sound), favicons
LICENSE.md  README.md  package.json  next.config.ts  tsconfig.json  components.json
```

## Reusable for Tiny Bubbles (kids ADHD)

- **Pomodoro timer engine** — `lib/db.ts` (`TimerSession`, `startTimerSession`, `completeTimerSession`, `getActiveSession`, `TimerType` work/break, default 25/5 min) + `components/app/active-session.tsx` (countdown loop, progress bar, auto work→break transition, completion detection). For kids: shorten durations, swap the tab-title/favicon feedback for a big animated character. Solid, self-contained timer logic to lift.
- **Multi-sensory completion feedback** — in `active-session.tsx`: `navigator.vibrate([200,100,200])`, plays `public/_static/Hero.aiff`, animated favicon emoji (🎯/☕/✅). Directly reusable as the basis for kid reward chimes/haptics; replace asset + emoji with bubble-pop animation/sound.
- **Task-breakdown logic (AI)** — `app/api/tasks/generate/route.ts` + `schema.ts` (zod `generatePlanSchema`: reasoning, tasks, backlog, notes; each task = one 25-min chunk, concise 2-7 words, ADHD tags like `focus`/`adhd`/`important`). Prompt is the reusable IP; re-tune wording for kid-level tasks and shorter chunks. Streaming via `streamObject`/`createTextStreamResponse`.
- **AI provider plumbing** — `lib/ai.ts` (`getOpenRouter`, header-based API key, `createApiKeyRequiredResponse`) + `lib/config.ts` (`AI_CONFIG` model registry). Drop-in pattern for wiring any LLM with bring-your-own-key privacy posture.
- **Local-first storage / privacy model** — `lib/db.ts` Dexie schema (`plans`, `timerSessions`, `chatHistory`) with `useLiveQuery` reactive reads. Ideal privacy-by-default base for a kids app (no server data); add a streak/reward table alongside.
- **Settings / theming UI** — `components/app/settings.tsx` (working-hours `TimePicker`, model field, API-key field; persists to plan `preferences`) + `components/theme-switcher.tsx`, `mode-switcher.tsx`, `next-themes` provider in `components/providers.tsx`, `hooks/use-meta-color.ts`. Reusable settings dialog + dark/light theming scaffold; kid-ify with parental-controls section.
- **History / "what changed" feed** — `components/app/plan-history.tsx` (`useLiveQuery` over `chatHistory`, relative timestamps via date-fns) + `app/api/diff/route.ts` (AI-generated change summaries). Adaptable into a kid-friendly "what you did today" recap / progress journal.
- **shadcn/ui component library** — `components/ui/*` (button, card, dialog, drawer, progress, select, skeleton, sonner toasts, time-picker, tooltip) on Tailwind v4. Ready-made, themeable, accessible primitives to restyle with playful kid visuals.
- **Session/device coordination** — `lib/session-manager.ts` (device + tab UUIDs, heartbeat-based abandoned-session detection in `db.ts`). Useful if Tiny Bubbles needs multi-device or parent/child shared state, otherwise optional.
- **Plan input UX** — `components/app/plan-input.tsx` (free-form natural-language intent capture feeding the AI). Pattern reusable for a simplified kid/parent "what do you want to do today?" input.

### Gaps vs. Tiny Bubbles needs (build new)
- No gamification/reward system, habit-streak calendar, mood logging, companion character, or push-notification/reminder scheduler (timer only fires while a tab is open — no background notifications). These would need to be added.
- Web-only (Next.js PWA-ish); no native mobile shell.
