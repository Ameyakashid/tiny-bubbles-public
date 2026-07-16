# Tether — Source Inventory

- **Repo URL:** https://github.com/SeallLab/Tether
- **Description:** A dock created with React, TypeScript, Electron and Flask to support software engineers (SWEs) with ADHD. Provides ambient local activity monitoring, AI assistance (RAG chatbot), and gamified focus rewards. All data stays local.
- **License:** MIT (Copyright (c) 2025 Aarsh Shah) — confirmed in `LICENSE`
- **Stars:** ~20
- **Last activity:** Last commit 2026-03-24 (`d85fca6 fix: review fixes`); repo metadata `updated_at` 2026-06-24
- **Local clone:** `/Users/ameyakashid/Desktop/adhd india/_sources/tether`
- **Related paper:** "Tether: A Personalized Support Assistant for Software Engineers with ADHD" (arXiv:2509.01946)

## Tech Stack
- **Frontend / Desktop:** React 19, TypeScript ~5.8, Electron 36, Vite 6, Tailwind CSS 4, tsyringe (DI), Heroicons, uuid
- **Backend (RAG server):** Python / Flask, flask-cors, LangChain + LangGraph, langchain-google-genai (Gemini), FAISS (faiss-cpu), pypdf, gunicorn, SQLite checkpointing
- **AI:** Google Generative AI (`@google/generative-ai`) client-side; Gemini via LangChain server-side
- **Packaging:** electron-builder

## Top-Level Layout
```
app/      # Electron + React desktop application (TypeScript)
  src/electron/   # Main process: managers, monitors, services, handlers, DI container, preload
  src/ui/         # Renderer: React pages (ChatWindow, Rewards, Settings), components, hooks
  src/shared/     # Shared types.ts + constants.ts (IPC channels, data models)
server/   # Flask RAG backend (chat, sessions, conversation repo, vector store)
  routes/         # admin, conversation, health, info, session
  services/       # rag_service, conversation_repository, database
rag/      # PDF knowledge base (pdfs/) indexed into FAISS
.github/  # CI / workflows
LICENSE   # MIT
README.md
```

### Key files
- `app/src/electron/services/` — GamificationService.ts, FocusRewardService.ts, NotificationService.ts, NotificationTracker.ts, ActivityLogger.ts, ActivityMonitoringService.ts, WorkPatternAnalyzer.ts, SettingsService.ts, ChatService.ts, LLMService.ts, PythonServerService.ts
- `app/src/electron/managers/` — AppManager, WindowManager, TrayManager, NotificationManager
- `app/src/electron/monitors/` — BaseMonitor, IdleMonitor, WindowMonitor
- `app/src/ui/pages/Rewards/` — RewardsPage + BadgesTab, QuestsTab, StatsTab, ThemesTab
- `app/src/ui/hooks/` — useGamification.ts, useActivityMonitoring.ts
- `app/src/ui/components/common/` — Button, Card, ChecklistRenderer, Input, MarkdownRenderer, Slider, StatusBadge, Toggle
- `app/src/shared/types.ts`, `app/src/shared/constants.ts` — data models (Badge, Quest, Achievement, DockTheme, PointEarningEvent) and IPC channels

## Reusable for Tiny Bubbles (kids ADHD)

- **Gamification / reward engine** — `app/src/electron/services/GamificationService.ts`
  - Self-contained points/badges/quests/achievements engine persisted to a local JSON file (no server needed). Defines `DOCK_THEMES` with `unlockCost` + rarity tiers — directly adaptable to kid-friendly unlockable themes/skins. Pair with `app/src/shared/types.ts` (`GamificationData`, `Badge`, `Quest`, `Achievement`, `DockTheme`, `QuestReward`, `PointEarningEvent`).
- **Reward UI (gamification screens)** — `app/src/ui/pages/Rewards/components/`
  - `BadgesTab.tsx` (earned/locked badges grid), `QuestsTab.tsx` (active quests/challenges), `StatsTab.tsx` (progress stats), `ThemesTab.tsx` (theme unlock/purchase store). Reskin with playful visuals for kids.
  - `app/src/ui/hooks/useGamification.ts` — React hook wiring the reward state to the UI.
- **Focus-reward trigger logic** — `app/src/electron/services/FocusRewardService.ts`
  - Periodic (interval-based) checker that awards points/badges when goals are met. The "detect good behavior -> grant reward + positive notification" loop maps onto kids completing tasks/timers. Strip the SWE work-pattern coupling.
- **Notification / reminder system** — `app/src/electron/services/NotificationService.ts` + `NotificationTracker.ts` + `managers/NotificationManager.ts`
  - Cross-platform system notifications with rate-limiting/throttling (`shouldSendNotification`, cooldowns). Reusable as a gentle reminder/encouragement scheduler for kids; swap LLM-driven copy for fixed friendly messages.
- **Idle / activity timing primitives** — `app/src/electron/monitors/IdleMonitor.ts`, `BaseMonitor.ts`
  - `IdleMonitor` + `BaseMonitor` provide a clean start/stop interval-monitor pattern. Useful skeleton for a focus-timer / break-reminder engine (the `WindowMonitor` keystroke/app-tracking surveillance is NOT appropriate for kids — drop it).
- **Settings / theming infrastructure** — `app/src/electron/services/SettingsService.ts`, `app/src/ui/pages/Settings/`, `app/src/ui/types/settings.ts`
  - Local persisted settings service + tabbed Settings UI (`TabNavigation.tsx`) and theme application. Good base for parental controls + theme picker.
- **Reusable common React components** — `app/src/ui/components/common/`
  - `Button`, `Card`, `Toggle`, `Slider`, `Input`, `StatusBadge`, `MarkdownRenderer`, and especially `ChecklistRenderer.tsx` (renders checkable step lists — reusable for kid task breakdowns / "small steps").
- **Task-breakdown / step guidance** — `ChecklistRenderer.tsx` + ChatWindow (`app/src/ui/pages/ChatWindow/ChatWindow.tsx`)
  - The chat surfaces "small, manageable steps" rendered as checklists. The rendering/UX is reusable; the Gemini/LangGraph RAG backend (`server/`, `rag/`) is heavyweight and ADHD-research-PDF specific — likely overkill for a kids app and would need replacing with simpler, safe, curated content.
- **Local-first data model** — `app/src/shared/types.ts`, `app/src/shared/constants.ts`
  - Strong privacy posture (all data local) and clear IPC channel + type definitions; reusable architecture pattern for a kids app where privacy matters most.

### Notes / cautions
- The **activity surveillance** features (`WindowMonitor`, `ActivityLogger`, `WorkPatternAnalyzer`) track foreground apps/keystrokes — not suitable for children; reuse only the interval/monitor scaffolding, not the data collection.
- The **RAG/LLM stack** (Flask + LangChain + Gemini + FAISS over ADHD PDFs) is the heaviest dependency and tailored to adult SWEs. For Tiny Bubbles, the gamification, notification, settings, and common UI layers are the high-value lifts; the AI backend is largely skippable/replaceable.
