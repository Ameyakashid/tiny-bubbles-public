# Inventory — Emotion / Zones-of-Regulation / Sensory / Calm (v2)

**Category:** emotion / zones-of-regulation / feelings-check-in / breathing-calm / sensory-break
**Target stack (Tiny Bubbles v2):** Expo SDK 56 / React Native / TypeScript, Firebase backend, two apps (Kid + Parent).
**Date:** 2026-07-09
**Scope note:** These tools serve the **kid app's** evidence-based ADHD + AUTISM supports — specifically emotion identification, Zones-of-Regulation-style check-ins, feelings vocabulary, and calming/sensory-break (breathing) activities. None of them include or require the Bloop LLM; they are deterministic, offline-friendly UI/logic donors.

---

## Summary of decisions

| Repo | License | Cloned? | Role |
|---|---|---|---|
| **guideops/stillwave** | MIT | ✅ `_sources2/stillwave` | **Primary calm/breathing donor** — perfect-stack Expo/RN/TS breathing engine + 9 animated visuals + haptics + design tokens. |
| **cakuki/feelings-wheel** | MIT | ✅ `_sources2/feelings-wheel` | **Primary emotion-taxonomy donor** — kid feelings-wheel vocabulary (6 core → 24 → 48), 3 age tiers, 5 languages, core-emotion color palette. |
| TheDormouse/ZOR | NONE (all-rights-reserved) | ❌ reference-only | A real Zones-of-Regulation app (Next.js) — study the flow, do NOT ship its code. |
| SharonBello/zones-of-regulation | NONE | ❌ reference-only | React/Vite Zones-of-Regulation web app (school project) — UI/flow reference only. |
| louiechristie/mood-check-in | NONE | ❌ reference-only | Expo/RN mood "check-in" portfolio app (Redux + victory-native charts) — check-in UX reference only. |
| mmazzarolo/breathly-app | MPL-2.0 (weak copyleft) | ❌ reference-only | The best-known RN breathing app (585★). MPL is file-level copyleft → per task rules, reference-only; stillwave supersedes it and is MIT. |
| stevenGarciaDev/simple-meditation-app-expo-react-native | NONE | ❌ reference-only | 137★ Expo Router meditation UI tutorial, no LICENSE file → reference-only. |
| tiratatp/feelings_wheel | MIT | ❌ (off-stack) | MIT interactive emotion wheel (Kotlin/Android). Permissive alt to cakuki; not cloned because off-stack. |
| Dimm-ddr/My-Feelings-Tracker | MIT | ❌ (off-stack) | MIT Plutchik's-wheel Android tracker. Permissive taxonomy reference. |

---

## 1. guideops/stillwave  — CLONED ✅  (calm / breathing / sensory-break)

- **Repo:** https://github.com/guideops/stillwave
- **Local clone:** `/Users/ameyakashid/Desktop/adhd india/_sources2/stillwave`
- **License:** **MIT** — GitHub API `spdx_id: MIT`. Honest caveat: the checked-in `LICENSE` file is the **Expo starter-template default MIT** (`Copyright (c) 2015-present 650 Industries, Inc. (aka Expo)`) — the author kept the template's MIT header rather than adding their own copyright line. Still genuinely MIT-licensed and safe to reuse/ship with attribution.
- **Stars / activity:** 0★, but freshly built and actively pushed (last push 2026-07-04). Small, clean, real (not vaporware — verified engine + data below).
- **Verified match:** "Calm, pastel breathing-practice app — 9 breathing methods with distinct animations. Expo/React Native, PWA-ready." Confirmed by inspecting `src/data/methods.ts` (typed Phase/Segment/Method model) and `src/engine/useBreathSession.ts` (a real Reanimated-driven breath timing state machine).

### Tech stack (near-identical to Tiny Bubbles v2 target)
- **Expo SDK ~57**, **React Native 0.86**, **React 19.2**, **TypeScript**.
- **expo-router ~57** (file-based routing), **react-native-reanimated 4.5** + **react-native-worklets**, **react-native-svg 15**, **react-native-gesture-handler**.
- **expo-haptics** (breath-phase haptic cues), **expo-linear-gradient**, **expo-keep-awake**, **expo-glass-effect**, **@expo/ui**, **@react-native-async-storage/async-storage** (settings persistence), **react-native-web** (PWA).
- Google Fonts via `@expo-google-fonts/fraunces` + `manrope`.
- No backend, no accounts, no analytics, no AI — purely local. Ideal privacy posture for a kids' surface.

### Layout (all under `_sources2/stillwave/src/`)
```
app/
  _layout.tsx            root Expo Router layout
  +html.tsx              web/PWA shell
  index.tsx              method list / home
  method/[id].tsx        method detail
  practice/[id].tsx      live guided breathing session screen
components/
  MethodCard.tsx, MethodGlyph.tsx, PatternBar.tsx, PressableScale.tsx, Icon.tsx
  visuals/               9 animated breathing visuals + shared helpers
    AuroraVisual, BloomVisual, BoxVisual, EmberVisual, FeatherVisual,
    LotusVisual, MoonVisual, OceanVisual, WaveVisual, common.ts, index.tsx
constants/theme.ts       full pastel design-token system + per-method palettes
data/methods.ts          typed breathing-method catalog (9 methods, phases/segments)
engine/
  useBreathSession.ts    breath-session state machine (Reanimated shared values)
  haptics.ts             phase-boundary haptic cues
hooks/useStorage.ts      AsyncStorage hook
```

### Reusable for Tiny Bubbles v2 — concrete pointers
- **Breathing / calm-down / sensory-break activity (drop-in, in-stack):**
  - `src/engine/useBreathSession.ts` — the core reusable asset. A typed inhale/hold/exhale/holdOut timing loop with `status` (`ready|countdown|running|paused|complete`), per-phase countdown, cycle/duration/`untilTap` (breath-retention) handling, breath counter, and overall progress — all on Reanimated shared values. Feed it a `Segment[]` and it drives any visual. Lift nearly as-is for Tiny Bubbles' "calm corner / take-a-breath" tool.
  - `src/data/methods.ts` — typed `Method`/`Segment`/`Phase` model with 9 ready patterns (box breathing, etc.), `durationOptions`, categories (`foundations|balance|advanced|sessions`). Trim to 2–3 kid-appropriate patterns (e.g. box, "smell the flower / blow the candle") and shorten durations.
  - `src/components/visuals/*` — **9 self-contained Reanimated + SVG breathing animations** (Bloom, Box, Feather, Moon, Wave, Lotus, Ocean, Ember, Aurora). Pick one (Bloom/Ocean/Wave read as friendly "expanding bubble") and rethemed it as the Tiny Bubbles "breathing bubble." Each takes a normalized breath progress value — clean integration surface with `useBreathSession`.
  - `src/engine/haptics.ts` — multisensory (haptic) breath cues; pairs with the autism sensory-support goal.
- **Design system for the calm/sensory surfaces:** `src/constants/theme.ts` — `ink`, `canvas`, `radius`, `space`, `fonts`, `softShadow`, and a typed `MethodPalette` (per-activity light→deep pastel gradients). A ready pastel token set to reskin into the Tiny Bubbles palette; good base for low-arousal, sensory-friendly screens.
- **Session UI patterns:** `src/app/practice/[id].tsx` (live session lifecycle, keep-awake), `src/components/PatternBar.tsx` (visualize the inhale/hold/exhale rhythm), `MethodCard.tsx` (activity picker cards).
- **Local persistence:** `src/hooks/useStorage.ts` — AsyncStorage pattern for saving last-used method / preferences on-device before any Firestore sync.

### Gaps (not provided — build in Tiny Bubbles)
- No emotion/feelings identification, no Zones check-in (use feelings-wheel below for vocabulary).
- No Firebase/Firestore sync (add for parent transcript/monitoring; keep breathing itself offline).
- No parent-visibility layer, no companion (Bloop) integration.

---

## 2. cakuki/feelings-wheel  — CLONED ✅  (emotion identification / feelings vocabulary / zones-adjacent)

- **Repo:** https://github.com/cakuki/feelings-wheel
- **Local clone:** `/Users/ameyakashid/Desktop/adhd india/_sources2/feelings-wheel`
- **License:** **MIT** — `LICENSE` file present, `Copyright (c) 2026 Can Kinay`; GitHub API `spdx_id: MIT`. Clean and safe to ship. (`ATTRIBUTION.md` present — preserve it.)
- **Stars / activity:** 0★, actively maintained (last push 2026-07-06).
- **Verified match:** "Free, printable multi-language feelings wheel + monthly emotion tracker to help kids name what they feel — in their own language, at their own age." Confirmed by inspecting `languages/en.toml` (structured 6-core → 24-nuanced → 48-leaf taxonomy) and `README.md` (explicit age tiers).
- **What it is:** a **content generator**, not an app — Python build scripts (`gen_wheel.py`, `build_html.py`, `build_site.py`) emit printable SVG/PDF/HTML wheels. So the *code* is not stack-relevant, but the **emotion taxonomy, age-tiering model, wording, and color palette are directly reusable data** for the kid app's emotion/Zones features.

### Tech stack
- Python 3 build/generation scripts; TOML language data; SVG/HTML/PDF outputs. Small `fit_check.js` node helper and `tests/`.
- Multi-language data: **English, German, Spanish, French, Turkish** (`languages/{en,de,es,fr,tr}.toml`).

### The emotion model (verified from `languages/en.toml`)
- **6 core emotions** in canonical order with a **shared color palette** (defined in `languages.py:15`):
  `PALETTE = ["#F4C430" Happy, "#E8833A" Surprised, "#DB504A" Angry, "#9B6FB0" Scared, "#4F8FCB" Sad, "#56B27E" Calm]`
- **3 age tiers** (choose by ring count): **1 ring** = 6 core (ages 4–9); **2 rings** = core + 24 nuanced (ages 9–12); **3 rings** = full 48 fine-grained (ages 12+).
- Each core has 4 `feelings` (ring 2) and, per feeling, a `[a, b]` `leaves` pair (ring 3). Example: `Happy → Cheerful/Excited/Proud/Grateful → Playful/Joyful, Eager/Lively, …`.
- Kid-facing copy already written: `subtitle` "Which feeling is inside you today? Find it on the wheel and point to it.", `howto_body`, and a "My Feelings Calendar" monthly-tracker prompt ("color the circle with the feeling you had the most").

### Reusable for Tiny Bubbles v2 — concrete pointers
- **Emotion-identification vocabulary (port to a TS constant):** `languages/en.toml` (and `de/es/fr/tr`) — lift the `[[emotion]]` blocks into a typed `EMOTIONS` array `{ core, color, feelings[], leaves[][] }`. This is a ready, age-appropriate, clinician-plausible feelings taxonomy for the emotion check-in — saves authoring it from scratch and gives instant i18n. `languages.py` shows the exact parse/normalize shape to mirror.
- **Zones-of-Regulation mapping (design pointer):** the 6 core colors map cleanly onto Zones' 4-color scheme — **Green = Calm** (`#56B27E`, "in the green zone"), **Blue = Sad** (`#4F8FCB`), **Red = Angry** (`#DB504A`), **Yellow = Happy/heightened** (`#F4C430`), with Surprised/Scared as amber/purple accents. Reuse `PALETTE` as the canonical zone/emotion color source of truth so the wheel, the Zones check-in, and the calendar all agree.
- **Age-tiered disclosure = ADHD/autism support:** the 1/2/3-ring model is a built-in complexity ramp — start a young or dysregulated child at 6 core faces, reveal nuance later. Reuse this tiering to gate how many options appear in the check-in (fewer options = lower cognitive/sensory load).
- **Emotion calendar / mood log:** the "My Feelings Calendar" concept + prompts (`cal_title`, `cal_subtitle`, `cal_note` in each `.toml`) is a ready daily emotion-log design; back it with Firestore for parent visibility.
- **Copy/microtext:** `title/subtitle/howto_*/center` strings per language are usable, warm, first-person kid copy for the emotion screens.
- **Printable/parent artifacts:** `assets/preview-*.png` and the generator can produce a fridge-printable wheel — a nice parent-app "download & print" extra.

### Gaps (not provided — build in Tiny Bubbles)
- No app UI/interaction (it renders static wheels) — build the tap-a-feeling RN component yourself (interaction reference: TheDormouse/ZOR and tiratatp/feelings_wheel below).
- No first-then / social-stories / AAC (separate categories).
- No breathing/sensory activity (use stillwave above).

---

## Reference-only repos (NOT cloned — license or fit)

> Per task rules: copyleft, unlicensed, or unclear-license repos are recorded as reference-only and are **not** cloned to ship. Study behavior/flow; do not copy code.

- **TheDormouse/ZOR** — https://github.com/TheDormouse/ZOR — **License: NONE (all-rights-reserved).** A genuine, sizeable **Zones-of-Regulation** app (Next.js: `app/`, `components/`, `lib/`, `middleware.js`, Tailwind). The best real-world Zones *flow/interaction* reference in the search (color-zone selection, check-in). **Do NOT lift code**; reimplement the flow originally in RN.
- **SharonBello/zones-of-regulation** — https://github.com/SharonBello/zones-of-regulation — **License: NONE.** React + Vite + SASS + react-router Zones web app (a "creative-thinking" course project). UI/flow reference only.
- **louiechristie/mood-check-in** — https://github.com/louiechristie/mood-check-in — **License: NONE** (3★). Expo/React Native **mood "check-in"** portfolio app (Redux, react-native-paper, react-navigation, victory-native charts; back-end mocked/ephemeral). Closest in-stack *check-in UX + charting* reference — but unlicensed, so pattern-only.
- **mmazzarolo/breathly-app** — https://github.com/mmazzarolo/breathly-app — **License: MPL-2.0** (585★, TypeScript RN). The most established OSS breathing app. MPL-2.0 is **file-level (weak) copyleft**: modified MPL files must stay MPL + source-disclosed. Per task's "copyleft → reference-only" rule it is not cloned to ship; **stillwave (MIT) supersedes it** for our needs. Excellent *reference* for breathing-technique catalogs and RN breath animation.
- **stevenGarciaDev/simple-meditation-app-expo-react-native** — https://github.com/stevenGarciaDev/simple-meditation-app-expo-react-native — **License: NONE** (137★). Polished Expo Router meditation UI tutorial (FlatList, LinearGradient, modals, tab bars). No LICENSE file → reference-only; good Expo Router UI patterns.
- **tiratatp/feelings_wheel** — https://github.com/tiratatp/feelings_wheel — **License: MIT** (Kotlin/Android). A real *interactive* emotion wheel ("Name your feelings with a beautiful, interactive emotion wheel"). Permissive and on-topic, but **off-stack (Android)** so not cloned; strong *interaction-design* reference for the tap-through wheel and a second permissive emotion taxonomy.
- **Dimm-ddr/My-Feelings-Tracker** — https://github.com/Dimm-ddr/My-Feelings-Tracker — **License: MIT** (Kotlin/Android). Tracks daily emotions via **Plutchik's wheel**. Permissive taxonomy/reference; off-stack.

---

## Coverage map for this category

| Sub-need | Best source | Ship-safe? |
|---|---|---|
| Breathing / calm-down / sensory-break activity | **stillwave** `engine/useBreathSession.ts` + `components/visuals/*` + `data/methods.ts` | ✅ MIT, in-stack |
| Multisensory (haptic) cue for sensory support | **stillwave** `engine/haptics.ts` | ✅ MIT |
| Pastel low-arousal design tokens | **stillwave** `constants/theme.ts` | ✅ MIT |
| Emotion-identification vocabulary (6→24→48, i18n) | **feelings-wheel** `languages/*.toml` + `languages.py` | ✅ MIT (data) |
| Zones-of-Regulation color mapping | **feelings-wheel** `PALETTE` (`languages.py:15`) | ✅ MIT (data) |
| Age-tiered complexity ramp (ADHD/autism load control) | **feelings-wheel** ring model | ✅ MIT (concept) |
| Emotion calendar / daily mood log | **feelings-wheel** calendar prompts | ✅ MIT (concept) |
| Zones/emotion **interaction flow** in-app | TheDormouse/ZOR, tiratatp/feelings_wheel, louiechristie/mood-check-in | ⚠️ reference-only (reimplement) |
