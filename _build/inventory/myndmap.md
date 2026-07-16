# MyndMap — Source Inventory

## Identity
- **Repo URL:** https://github.com/JJMugenyi/myndmap
- **Description:** Web application to help individuals with **ADHD** improve focus and productivity, with AI-driven task recommendations, task organization, an ADHD self-assessment, and a dashboard. Matches the target (ADHD-focused web productivity tool, AI task recommendations, MIT license, explicitly early/not production-ready).
- **License:** MIT (Copyright (c) 2023 Jordan J. Mugenyi, Jake Haines) — confirmed in `LICENSE`.
- **Stars:** 48 (forks: 3, open issues: 0)
- **Last activity:** Last code push **2023-08-24** (created 2023-05-06). Single visible commit in shallow clone: "Update to dashboards". Effectively dormant.
- **Maturity:** README states "MyndMap is still in early development and is not ready for use yet." Confirmed by inspection — it is a UI/template prototype.

## Tech Stack (as actually implemented vs. aspirational)
**Implemented (the real app):**
- **Python / Flask** backend (`main.py`, `front/__init__.py`, `front/views.py`) — but views only `render_template` static pages; no DB, no auth logic, no AI.
- **Jinja2 HTML templates** styled with **Bootstrap (4.5 / 5.1)**, **jQuery**, **FullCalendar 3.x/4.x**, **Chart.js**, **animate.css**, and **WOW.js**.
- `front/models.py` and `front/auth/models.py` are **empty** — no data models implemented.

**Aspirational / scaffold only (NOT implemented):**
- README "desired" stack: React frontend + Flask backend; GCP, Postgres, Hadoop, Airflow. None present.
- `mynd-map/` is an **untouched default Next.js 13 + React 18 + Tailwind scaffold** (`src/app/page.js` is the boilerplate landing page). No app logic.
- `myndmap/` is an **empty directory**. Root `package.json` is a 2-line stub.

> Net: this is a **front-end UI/UX prototype** (HTML/CSS/JS pages served by a thin Flask shell). There is no working timer, reward system, notification scheduler, persistence, or real AI.

## Top-Level Layout
```
myndmap/
├── LICENSE                 # MIT
├── README.md               # vision, MVP + long-term features, frameworks
├── main.py                 # Flask entrypoint (app.run debug)
├── package.json            # trivial stub (root)
├── front/                  # >>> the actual implemented app <<<
│   ├── __init__.py         # create_app() Flask factory
│   ├── views.py            # routes -> render_template only
│   ├── models.py           # EMPTY
│   ├── auth/               # models.py EMPTY (auth not implemented)
│   ├── static/             # css/ js/ images/ fonts/ (Bootstrap, animate.css, WOW.js, logos)
│   └── templates/          # 20 Jinja2/HTML pages (the real UI)
├── mynd-map/               # default Next.js 13 scaffold (unused boilerplate)
│   ├── package.json        # next 13.4, react 18.2, tailwind 3.3
│   └── src/app/            # boilerplate page.js / layout.js / globals.css
└── myndmap/                # EMPTY dir
```

### Key templates (`front/templates/`)
- `index.html` (landing, 872 lines), `pricing.html`, `about.html`, `contact.html`, `privpol.html`, `tos.html` (empty), `404.html`
- `login.html`, `signup.html`, `forgot_pass.html` (UI only, no backend)
- `onboard1.html` / `onboard2.html` / `onboard3.html` — multi-step welcome flow
- `adhd_ai.html` / `adhd_ai_2.html` — ADHD self-assessment (Likert 1–5)
- `results.html` — SVG severity-gauge result screen
- `dashboard.html` (`/home`), `tasks.html`, `calendar.html`, `settings.html`

## Reusable for Tiny Bubbles (kids ADHD)
These are **front-end patterns and static assets** worth lifting; there is no reusable engine/backend logic here.

- **Assessment / check-in UI (best reuse)** — `front/templates/adhd_ai.html` (lines ~136–162) and `adhd_ai_2.html`: a Likert "circle 1–5" selector with `.selected` state and a fade-in "Next" button revealed on choice (vanilla JS, no deps). Easily restyled into a **kid mood/feelings check-in** ("How do you feel today?" with emoji bubbles).
- **Progress/score meter** — `front/templates/results.html`: self-contained **SVG gauge** ("horseshoe scale") with `zoomOut` + `fadeIn` CSS keyframe animations. Adaptable into a playful **progress/level meter** or daily-score dial for kids.
- **Multi-step onboarding flow** — `front/templates/onboard1.html` / `onboard2.html` / `onboard3.html`: staged fade-in welcome screens with sequential "Next" navigation. Good skeleton for a **kid/parent onboarding wizard**.
- **Task-completion chart** — `front/templates/tasks.html` (lines ~192–242): **Chart.js** line chart of weekly completion rate. Repurpose as a **habit-streak / stars-earned-over-time** chart.
- **Calendar view** — `front/templates/calendar.html` (443 lines) + `tasks.html`/`dashboard.html` use **FullCalendar**. Basis for a **habit-streak / reward calendar**.
- **Task-list + card dashboard layout** — `front/templates/dashboard.html`, `tasks.html`: card-based (`.container-card`) task list + dropdown user menu. Layout scaffold for a **kid task board** with task-breakdown cards.
- **Settings scaffold** — `front/templates/settings.html`: settings/profile page skeleton → adapt for **parental controls + theming/difficulty**.
- **Theming & motion assets** — consistent warm dark palette (`#1a1a1a` bg / `#F7E8D3` accent) + reusable animation libs: `front/static/css/animate.css`, `front/static/css/ud-styles.css`, `front/static/css/styles.css`, `front/static/js/wow.min.js`, `front/static/js/main.js`. Reusable for an **engaging animated kids theme** (fade/slide/zoom micro-interactions).

### NOT available here (build fresh for Tiny Bubbles)
- No **timer/Pomodoro engine** (mentioned nowhere in code).
- No **reward/gamification system** (README lists it only as a *long-term* goal).
- No **notification/reminder scheduler** (UI mentions reminders; no implementation).
- No **companion character**, no **task-breakdown logic**, no **mood logging persistence**.
- No real **AI** — the "AI assistant" is unbuilt.

## Notes
- Confirmed correct repo (not a namesake): JJMugenyi/myndmap is the ADHD AI productivity tool; landing site myndmap.net / Product Hunt corroborate. MIT license verified in-repo.
- Value for Tiny Bubbles is primarily **UI/UX inspiration and small self-contained front-end widgets**, not backend or systems code.
