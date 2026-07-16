# adhd-india — Source Inventory

> Cloned for reference only. Target slug `adhd-india`; the actual upstream repo is named **ADHD-management-app**.

## Identity / Verification
- **Repo URL:** https://github.com/Ameyakashid/ADHD-management-app
- **Cloned to:** `/Users/ameyakashid/Desktop/adhd india/_sources/adhd-india`
- **Match confidence:** High. Same author (`Ameyakashid`) as the guessed `adhd-india` URL (which 404s). It is an ADHD management app, and the "Sutra" agent named in the task brief appears in `PROJECT_BRIEF.md` line 160: *"CommSkills/SUTRA: Coach, Safety, Boundary, Evaluator, Summarizer"* (a Disco-Elysium-styled personality/skill layer). The "builds apps / sub-projects" framing maps to its "Sequential Builder method" task pipeline under `_build/tasks/`.
- **License:** NONE. No `LICENSE` file, and the GitHub API reports `license: null`. Treat as all-rights-reserved / unlicensed — reference only, do not copy code into a shipped product without contacting the author.
- **Stars:** 0
- **Last activity:** 2026-04-11 (last commit 2026-04-10, "Add comprehensive README…"). Default branch `master`.
- **Repo size:** ~284 KB.

## Tech Stack
- **Language:** Python (Pydantic models, JSON file persistence with atomic `.tmp`+rename writes).
- **Agent framework:** [nanobot-ai](https://github.com/HKUDS) v0.1.5 (alpha) — hook-chain architecture.
- **LLM:** OpenRouter → Claude 3.5 Haiku.
- **Voice:** Kokoro ONNX TTS (`kokoro-onnx`), local, no cloud; audio via `av` (OGG/Opus for Telegram).
- **Primary UI:** Telegram bot.
- **Dashboard:** vanilla HTML/CSS/JS (`dashboard/`), served by a small Python API, tuned for a 1024×600 Fire Tablet.
- **Config:** YAML (`workspace/states.yaml`), Markdown persona files (`SOUL.md`, `USER.md`), `.env`.
- **Tests:** 36 pytest files under `tests/`.

## Top-Level Layout
```
.env.example
requirements.txt          # nanobot-ai, pyyaml, kokoro-onnx, av
start.py                  # entry point
setup_workspace.py        # scaffolds ~/.nanobot workspace
hook_context.py
PROJECT_BRIEF.md          # design doc (mentions SUTRA, 6-state model)
README.md

# State detection
state_detection.py            # 6 cognitive states from message signals
cognitive_state_writer.py     # writes state.json for dashboard
state_response_integration.py # StateResponseHook

# Tasks
task_store.py / task_tools.py # Pydantic Task model + LLM CRUD tools

# Memory
memory_store.py / memory_tools.py / memory_context.py  # persistent memories + injection hook

# Scheduling / check-ins
checkin_schedule.py       # 4 daily check-in definitions
schedule_engine.py        # pure decision layer: fire/defer/modify/suppress per state
scheduling_hook.py        # fires due check-ins

# Buffer system (recurring-obligation pre-loading)
buffer_store.py / buffer_tools.py / buffer_hook.py

# Voice
tts_engine.py / voice_delivery.py / voice_tools.py / voice_trigger_hook.py

dashboard/                # index.html, style.css, app.js (glanceable live UI)
dashboard_api.py          # serves dashboard data
workspace/                # states.yaml, SOUL.md, USER.md, HEARTBEAT.md, MEMORY.md, config template
tests/                    # 36 pytest files
_build/tasks/             # 8-phase "Sequential Builder" task/sub-task plan
```

## Reusable for Tiny Bubbles (kids ADHD)
- **Mood / cognitive-state engine** — `state_detection.py` + `workspace/states.yaml`. YAML-driven, runtime-tunable state model with detection signals, response styles, and transition probabilities. For kids, simplify the 6 adult states (baseline/focus/hyperfocus/avoidance/overwhelm/RSD) into a few kid-friendly moods and reuse the YAML-config-no-code-change pattern. `cognitive_state_writer.py` shows how to surface current mood to a UI.
- **Reminder / check-in scheduler** — `checkin_schedule.py` (named, timed check-ins) + `schedule_engine.py` (pure decision layer returning fire/defer/modify/suppress based on current mood) + `scheduling_hook.py`. This is the strongest reusable piece: a state-aware notification scheduler that suppresses nudges at the wrong moment — directly applicable to gentle kid reminders that back off when the child is overwhelmed.
- **Task model + task-breakdown CRUD** — `task_store.py` (Pydantic `Task` with status pending/in_progress/done, priority low/medium/high, atomic JSON persistence) and `task_tools.py` (natural-language create/list/update/complete). Reuse the data model and "smallest possible first step" / micro-step framing for kid task breakdown; drop the LLM tool wiring if not needed.
- **Reward / streak-style "buffer" system** — `buffer_store.py` / `buffer_tools.py` / `buffer_hook.py`. Pre-loads recurring obligations with a capacity gauge that auto-decrements and shows "banked ahead" framing. The capacity-gauge + positive-framing mechanic is a ready template for a gamified reward/streak meter for kids ("bubbles banked").
- **Glanceable dashboard UI** — `dashboard/` (`index.html`, `style.css`, `app.js`) + `dashboard_api.py`. Color-coded mood banner, task list, schedule panel, activity feed, 30s auto-refresh, no-interaction design. Good base for a kid-facing always-on display / companion screen; restyle panels into playful visuals.
- **Companion-character / persona layer** — `workspace/SOUL.md` + the SUTRA/Disco-Elysium personality concept in `PROJECT_BRIEF.md`. The pattern of authoring a distinct, neuroaffirming, no-shame voice with per-mood tone adaptation maps directly to a friendly bubble mascot that talks differently depending on the kid's mood.
- **Voice output** — `tts_engine.py` / `voice_delivery.py` / `voice_trigger_hook.py`. Local Kokoro TTS that converts responses to audio and decides when to auto-speak (suppressed in high-stress states). Reuse the "speak responses aloud, but only at the right moments" trigger logic for non-readers / younger kids.
- **Memory / context** — `memory_store.py` + `memory_context.py`. Lightweight persistent-memory store with an injection hook; reusable for remembering a child's preferences, wins, and recurring struggles.
- **Atomic JSON persistence pattern** — used across all `*_store.py` files (write `.tmp` then rename). Simple, dependency-free local storage suitable for an offline-first kids app.

### Caveats for reuse
- No open-source license — get author permission before reusing code in a shipped product.
- Built around Telegram + nanobot-ai + OpenRouter; the scheduler, state model, buffer/reward mechanic, task model, and dashboard are the cleanly portable pieces. The bot/LLM glue and Telegram delivery are the least reusable for a kids' native app.
- Adult-oriented content (RSD, clinical state transitions, "rent buffer" examples) needs reframing for children.
