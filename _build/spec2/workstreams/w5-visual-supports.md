# Workstream w5 — Visual Supports (Kid app)

*Durable, buildable workstream spec. Authored 2026-07-09 against the SHIPPED, green v1 app
(`/Users/ameyakashid/Desktop/adhd india/tiny-bubbles/`, verified: Expo SDK 56 / RN 0.85.3 / React 19.2.3 /
TS 6 / zustand 5 / NativeWind 4, `SCHEMA_VERSION = 1`, `MIGRATIONS = []`, 69 test suites) and the authoritative
v2 docs: `_build/research2/00-SYNTHESIS2.md`, `_build/research2/01-v2-feature-matrix.md` (rows **A2, A3, A4, A8,
A9**), `_build/spec2/01-current-and-target.md`, and the v1 spec `_build/spec/{00-MASTER-ROADMAP,02-architecture}.md`
+ `_build/spec/features/{visual-timers,if-then-plans}.md`. Donor code under
`/Users/ameyakashid/Desktop/adhd india/_sources2/`. Mind the SPACE in every path.*

> **Scope of this workstream (the "visual supports" cluster of the autism module):**
> - **A2 — Visual-schedule BUILDER (parent) + PLAYER (kid)** — reuse the routine/daypart engine + the
>   symbol/`VisualLabel` model; add always-visible "now / next".
> - **A3 — First-Then card** — RE-SKIN the shipped if-then plans engine (`plans.ts` / `planStore`) as a
>   two-cell visual first-then for non-reading kids.
> - **A4 — Transition warnings + priming** — REUSE the shipped visual-timers (`src/domain/timer.ts` +
>   `VisualTimer.tsx`); add an advance-warning / "I'm ready" priming layer; **never abrupt auto-advance**.
> - **A8 — Video modeling on steps** — parent records/attaches a short clip via `expo-image-picker` (shipped)
>   → **Firebase Storage**; the kid plays it on a step. STRONG EBP.
> - **A9 — Social-narrative BUILDER** — parent assembles a first-person picture+TTS narrative;
>   **Bloop can DRAFT from parent facts, parent APPROVES before the child sees it** (the SAFE LLM use).
>   WEAK evidence → preparation aid only, never therapy.
>
> **NOT in this workstream** (owned elsewhere, consumed here): AAC board (A1) and its `Board`/`Symbol`
> primitive + cleared symbol art; sensory profile / break button (A5); emotion-ID (A7); the Bloop character
> layer + chat surface + the guardrail proxy (B*/C*); Firebase auth/consent/Parent-app shell + the sync
> adapter substrate (D1–D3, D8–D9). See §8 for the exact cross-workstream contracts.

> ## ⟦v2 FINAL reconciliation — `02-architecture.md` §8 additions (§8 #33)⟧
> - **The parent-app AAC BOARD-BUILDER now lives in THIS authoring cluster (M4.2)** — resolving the orphaned
>   feature-matrix A1/D6 "parents author and extend boards" (§8 fix). Added to §2.4, §4.3, §7 below. It consumes
>   the w4 shared `AacBoard`/`AacSymbol` primitive and writes cleared-`assetKey` boards to Firestore (never a child
>   photo). Full free-form board authoring beyond this builder + the on-device custom tiles (w4 §2.2) is the only
>   AAC-authoring surface in v2; A11/A12/A13 stay deferred (roadmap §1).
> - **`neuroProfile` absent-default = NEUTRAL on-device** (byte-identical v1 back-compat), NOT `"adhd"` (§8 #13).
>   Fix §3.5's "absent ⇒ adhd"; `"both"` is only the *recommended new-child pick* at onboarding.
> - **`narrativeDraft` has its OWN parent-authenticated topic-scope**, BROADER than the child-chat allow-list
>   (dentist/haircut/fire-drill/medical-prep are in-scope for parent-approved drafts), still PII-redacted +
>   output-shielded (§8; resolves w5 §9 #7). "identical *shields*" — NOT "identical topic-scope."

---

## 1. Overview, user value, and the VERIFIED evidence

### 1.1 What this delivers

A predictable, low-stim, **non-reading-first, TTS-everywhere** set of visual supports that lets an autistic
and/or ADHD child (a) *see the shape of the day* and what is **now / next** (visual schedule), (b) understand
"first this, then that" (first-then), (c) be **primed for transitions** instead of yanked through them, (d)
**watch a short model video** of a step, and (e) be **prepared** for an upcoming novel situation (haircut,
dentist, fire drill) via a first-person picture narrative. The parent authors all of it in `apps/parent`; the
child *uses* it offline in `apps/kid`. Completions ride the **shipped v1 reward loop unchanged** — no new token
engine, no new celebration engine.

### 1.2 User value (why these five, in this cluster)

The market keeps **splitting the comorbid child in two** (AAC apps are autism-only; reward-loop apps are
ADHD-only — `market-teardown.md` §G5). Visual supports are the autism-side keystone that the shipped v1
ADHD reward loop lacks. Premium schedule/first-then products (Choiceworks, First-Then Visual Schedule, Tiimo)
are closed-source and often iOS-only; cross-platform + affordable + video-modeling in one place is open white
space (`autism-visual-supports.md` §TL;DR, §4).

### 1.3 The VERIFIED evidence (cited honestly; weak features flagged as scaffolds)

| Feature | Strength | Verified basis (from `autism-science.md` / feature-matrix) | Honesty rule |
|---|---|---|---|
| **A2 Visual schedule** | **STRONG** | Visual Supports is a named EBP; visual activity schedules meet EBP criteria (Knight, Sartini & Spriggs 2015, *J Autism Dev Disord* 45(1):157–178). Mechanism: **intolerance of uncertainty (IU)** is elevated in autism and strongly predicts anxiety (Jenkinson 2020, *Autism* 24(8):1933–1944, pooled r=0.62) — making "next" visible reduces meltdown-driving uncertainty. Caveat (Mouzakes 2025): a scaffold, pair with prompting/reinforcement. | Stand on the *practice* (visual supports), never "treats autism." |
| **A3 First-Then** | **STRONG** (behavioral principle) | Premack principle under Antecedent-Based Intervention + Reinforcement (both EBPs). | Frame as a support, not therapy. |
| **A4 Transition priming** | **MODERATE** | Dettmer 2000; application of Visual Supports + ABI + the IU mechanism. Transitions are a top trigger for challenging behavior. | Moderate — do not over-claim. |
| **A8 Video modeling** | **STRONG** | Video Modeling is a named EBP; strong effects + good maintenance/generalization (Bellini & Akullian 2007 meta-analysis). Directly answers the Goally-praised "video of someone doing the task" community ask. | Strong EBP — may state "video modeling," never "cure." |
| **A9 Social narrative** | **MIXED — the WEAKEST link** | Social Narratives is an EBP *category*, but **"Social Stories™" specifically is mixed-to-null** (Qi 2018; umbrella review PMC10791792 did not support them for social skills/behavior). | **Preparation / predictability aid ONLY.** NEVER claim Social-Stories efficacy; NEVER brand "Social Stories™". Enforced by a copy-gate (§6). |

**Cross-cutting honest-marketing rule (carried from v1, reinforced `market-teardown.md` §E):** build the
**generic mechanism**; never claim therapy/cure; never promise AAC speech gains; never brand or claim
Zones-of-Regulation™ / Social-Stories™ efficacy; scaffolds, not therapy.

---

## 2. UX behavior — screen by screen (via resolvers/capability flags, never a raw axis read)

**Golden rule (v1, preserved):** no component reads raw `ageMode` **or** raw `neuroProfile`; every difference
flows through `resolveCapabilities` / `resolveTokens` / `resolveContent` / `resolveCelebration` /
`resolveStatusPresentation`. Components read the child's axes only to *feed* a resolver (the sanctioned
`useThemeInputs()` pattern). The new `NeuroProfile` axis (§3.2) is a **resolver input**, never a prop.

The **three presets** this workstream honors (from `00-SYNTHESIS2.md` §1.0, resolved by `resolveCapabilities`):
- **autism** (default = predictable/low-stim): always-visible now/next, transition warnings ON, **no
  auto-advance ever**, sound/haptics/particles OFF by default, identical layout every time, literal-language
  copy variant, minimal upcoming-step count.
- **adhd** (novelty/bright): brighter palette, faster/bigger celebration, more upcoming steps visible, opt-in
  previewed novelty; still **no abrupt auto-advance** (hard rule for BOTH).
- **both**: deterministic core + **opt-in, previewed** novelty layer.
- Orthogonally, `SensoryMode = "lowStim"` (shipped) dampens animation amplitude, disables particles, forces
  discrete 1 Hz timer stepping, and silences chimes — layered on top of any neuroProfile.

### 2.1 KID — Visual-schedule Player (`app/(kid)/schedule.tsx` + `components/schedule/SchedulePlayer.tsx`)

- **Now/Next strip (`NowNextStrip.tsx`) — always visible, table stakes.** A horizontal strip of symbol tiles
  (each a `VisualLabel`: emoji/icon/photo + color + `spokenLabel`); the **current step is enlarged + haloed**,
  upcoming steps trail to the right, done steps are calmly greyed (never red/"failed"). The count of visible
  "next" steps is `caps.scheduleUpcomingCount` (young **1**, older/preteen **3**, adhd may show +1). TTS speaks
  the step on focus (`tts.speak(step.label.spokenLabel)`); the whole strip is screen-reader labeled via
  `resolveStatusPresentation` (icon+shape+label triple-coding, blue↔gold, never red↔green).
- **Focal step card** reuses the shipped `components/task/StepCard.tsx` presentation; a giant **Done** button
  (`DoneButton.tsx`) marks the step. On Done: `completeScheduleStep` (new thin orchestrator, §3.4) reuses the
  SHIPPED celebration path (`resolveCelebration` → `useCelebration` sub-300 ms burst → buddy nurture); size is
  resolver-only. **No auto-advance:** the next step becomes focal only after the child taps Done or "I'm ready"
  (never a timer-driven jump). Partial completion is celebrated; skipping is free and never penalized.
- **Watch-how button (`StepVideoButton.tsx`, A8)** appears on a step **only when** a `videoRef` is attached
  **and** the clip is playable now (cached locally, or online). Tapping opens a calm full-screen player
  (`expo-video`), autoplay off, replayable, "done" returns to the step. If the clip is not cached and the
  device is offline, the button is **hidden** (never a broken affordance, never blocks the step).
- **Transition primer (`TransitionPrimer.tsx`, A4)** — when `caps.transitionPrimingEnabled` (autism default
  true) and the step carries a `TransitionConfig`, a calm advance-warning surfaces ("2 more minutes" → "almost
  done" → "next: brush teeth") anchored to the shipped `VisualTimer.tsx` wall-clock math. On depletion the
  timer **rests** (`remaining === 0`, never "time's up"), optionally a single gentle chime **only if
  `parentSettings.timerSoundEnabled`** (shipped toggle, default OFF; low-stim forces off), then an **"I'm
  ready" tap** to advance. Never auto-advances, never flashes, never turns red.
- **First-Then overlay (A3, when the step links a first-then)** — see §2.2; it can also be a standalone route.
- **Low-stim variant:** static timer, no particles, no chime, dampened halo; identical layout to standard so
  nothing "changes" on the child.

### 2.2 KID — First-Then card (`components/firstThen/FirstThenCard.tsx`, A3)

A **two-cell** visual card: left = **First** (the required step, a `VisualLabel` tile), right = **Then** (the
chosen preferred/next, a `VisualLabel` tile), an arrow between, TTS reads "First brush teeth, then bubbles."
- **The child PICKS the "then"** from a **curated set** (curated autonomy — `caps.maxChoices` cap 3/6, never
  unlimited) drawn from a parent-authored 2-cell `Board` (the shared `Board`/`Symbol` primitive from the AAC
  workstream) or a small preferred-activity list. Picking is the only interaction; it is autonomy, not a gate.
- Completing the **First** step pays tokens through the normal loop (via `PlanAction.linkedTaskId` if linked);
  the first-then card itself pays **no tokens** (it is a framing, not a currency). This is the shipped
  `if-then-plans` invariant re-skinned (a Plan's `cue` = First, `action` = Then).
- Surfaced three ways (reusing shipped plan surfaces): standalone `app/(kid)/first-then.tsx` modal, as an
  `afterStep` overlay inside `TaskRunner`/`SchedulePlayer` via the shipped `components/plans/PlanCuePanel.tsx`
  interaction shell, or from the daypart-done panel.
- Copy is `ModeKeyed` (young literal "First… then…" auto-spoken; older adds text). No raw `ageMode`.

### 2.3 KID — Social-narrative Viewer (`app/(kid)/narrative.tsx` + `components/narrative/NarrativeViewer.tsx`, A9)

- **Read-only page-turner.** Each page = one image + one **short first-person sentence** + TTS; big calm
  Next/Back; a progress dot row (triple-coded). Autoplay OFF (predictability). No quiz, no score, no tokens,
  no "did you learn it." A footer chip: "A story to get ready" (ModeKeyed) — **framed as preparation**.
- **Only APPROVED narratives are visible** to the child (`SocialNarrative.approvedAt != null`); a
  parent-drafted-but-unapproved narrative (incl. any Bloop draft) NEVER renders in the kid app.
- Low-stim: no page-turn animation (cross-fade → cut), no chime.

### 2.4 PARENT — Builders (in `apps/parent`, PIN/consent-gated)

- **Board builder (`app/(authoring)/board-builder.tsx`, A1/D6 — resolves the orphaned parent AAC authoring):**
  create/rename a child's `AacBoard`s and add/remove/reorder `AacSymbol` tiles picked from the **cleared library**
  (by `assetKey`; the same cleared set the kid renders) or a captured photo that stays a Storage/asset reference —
  **never a child photo** (those stay on-device only, w4 §2.2). Set `gridSize`, category color, `partOfSpeech`,
  and folder (`isCategory`) navigation; core tiles keep fixed positions (motor-planning invariant). Preview renders
  the exact kid grid via the shared `resolveAacPresentation`. Saves to Firestore `children/{childId}/boards|symbols`
  (rules: guardian-parent write, owning-kid read); the sync adapter pulls it **down** into `tb/boards`. AAC tiles
  never fire tokens/celebration (w4 anti-shame invariant). Copy passes `assertAacCopyClean` (no speech-gain, §8 #23).
- **Schedule builder (`app/(authoring)/schedule-builder.tsx`, A2):** compose an ordered list of steps; each
  step picks a symbol (from a `Board`/`Symbol` set or a captured photo), an optional `spokenLabel` (defaults to
  the symbol label), an optional per-step **timer + TransitionConfig**, and an optional **video** (§2.5).
  Assign a `daypart` (morning/afternoon/evening) so the player slots into the shipped daypart flow. Reorder by
  drag. Preview renders the exact kid strip. Saves to Firestore `children/{childId}/schedules/{id}`; the sync
  adapter mirrors it to the kid device's `tb/schedules` cache.
- **First-Then builder (`app/(authoring)/first-then-builder.tsx`, A3):** pick the **First** (a required
  step/task) and the curated **Then** set (2–6 preferred tiles the child may choose among). Persists as a
  shipped `Plan` (cue=First, action=Then) via the shipped `planStore` (`tb/plans`) + Firestore mirror.
- **Video capture (`app/(authoring)/video-capture.tsx`, A8):** record (or pick) a ≤ ~30 s clip via
  `expo-image-picker` (`mediaTypes: ['videos']`), preview, attach to a schedule step → upload to Firebase
  Storage; store a `VideoRef` (Storage path + duration + optional poster). Delete/replace removes the Storage
  object. Honest camera/microphone permission strings.
- **Narrative builder (`app/(authoring)/narrative-builder.tsx`, A9):** add pages (image + first-person
  sentence + TTS); reorder; preview. **Bloop-draft button** (opt-in, LLM-gated): the parent enters plain facts
  ("Mia is getting a haircut Saturday; the clippers buzz; it doesn't hurt; she can hold a fidget"); the app
  calls the guardrail proxy's **`narrativeDraft` intent** (§8) which runs the SAME input/output shields and
  returns a suggested page set. **The draft lands in the parent's editor, NEVER the child's app**; the parent
  edits and must tap **Approve** (sets `approvedAt`) before it can sync to the child. A persistent notice:
  "A story to help your child get ready — not therapy or advice." With the LLM disabled/offline the draft
  button is hidden and the parent authors manually (feature fully usable).

### 2.5 The neuroProfile / ageMode / low-stim matrix (resolver-driven)

| Concern | autism (default) | adhd | both | lowStim overlay |
|---|---|---|---|---|
| now/next upcoming count (`caps.scheduleUpcomingCount`) | young 1 / older 3 | +1 | older 3 | unchanged |
| transition warnings (`caps.transitionPrimingEnabled`) | **ON** | off (opt-in) | ON | ON |
| auto-advance (`caps.autoAdvanceSteps`) | **false (hard ceiling)** | **false** | **false** | false |
| celebration (`resolveCelebration`) | gentle/calm | full/medium | gentle | forced ≤ gentle, no particles |
| palette (`resolveTokens`) | low-arousal pastel (stillwave tokens) | brighter Tide | pastel core | flatten transparency |
| chime on timer rest | off unless `timerSoundEnabled` | opt-in | off default | forced off |
| novelty layer | off | previewed opt-in | previewed opt-in | off |

All rows are produced inside resolvers from `{ ageMode, neuroProfile, sensoryMode }`; **no component branches
on the raw axes.**

---

## 3. Data model (exact TS types; slice/collection; additive migration; offline-first + additive-sync)

### 3.1 Where the types live

Per the migration doc (`spec2/01-current-and-target.md` §2.2, "board/schedule schema born shared"), the new
visual-support types are authored in **`packages/shared/src/domain/visualSupports.ts`** and re-exported by
`apps/kid/src/domain/types.ts` (so the kid app and the parent authoring app share one source). `NeuroProfile`
is a union widening of the shipped axis set.

### 3.2 New unions / axis (additive widening — no `SCHEMA_VERSION` bump)

```ts
// packages/shared/src/domain/visualSupports.ts  (re-exported from apps/kid/src/domain/types.ts)
import type { VisualLabel, Daypart, EpochMs, IsoDay } from "./types"; // reuse the SHIPPED primitives

/** The novelty-vs-sameness axis. Joins ageMode as a RESOLVER INPUT (never a component prop). */
export type NeuroProfile = "adhd" | "autism" | "both";

export type TransitionWarningStyle = "chime" | "visualOnly" | "voice";
export type VideoRefStatus = "uploading" | "ready" | "failed";
```

### 3.3 New domain entities

```ts
/** A short model clip attached to a schedule step (A8). NEVER stored in AsyncStorage as bytes. */
export interface VideoRef {
  /** Firebase Storage object path: `children/{childId}/videos/{id}.mp4` */
  storagePath: string;
  status: VideoRefStatus;
  durationMs?: number;
  posterUri?: string;            // optional local/remote still frame
  /** last known LOCAL cache file:// (set by the kid device after download; absent => must fetch) */
  cachedUri?: string;
  createdAt: EpochMs;
}

/** Advance-warning config for a step (A4). Reuses the SHIPPED Task.timerSeconds math via timer.ts. */
export interface TransitionConfig {
  /** seconds of visual countdown before the step's transition (reuses timer.ts wall-clock helpers) */
  warnSeconds: number;
  style: TransitionWarningStyle;  // autism default 'visualOnly'
  /** show "next: ___" priming of the upcoming step's label */
  showNextPreview: boolean;
  /** REQUIRED explicit "I'm ready" tap to advance — never auto-advances */
  requireReadyTap: boolean;       // hard true for autism; default true always
}

/** One step of a visual schedule. A superset of a v1 Task step, autism-tuned. */
export interface ScheduleStep {
  id: string;
  label: VisualLabel;             // SHIPPED primitive: spokenLabel(req)/text/emoji/icon/color/pictureUri
  /** optional visual transition timer budget (reuses Task.timerSeconds semantics) */
  timerSeconds?: number;
  transition?: TransitionConfig;  // A4
  video?: VideoRef;               // A8
  /** optional link to a shipped Task so completion pays tokens through the normal loop */
  linkedTaskId?: string | null;
  /** optional first-then Plan id shown as an overlay on this step (A3) */
  firstThenPlanId?: string | null;
}

/** A parent-authored visual schedule (A2). Rendered by the kid; ordered = source of truth for now/next. */
export interface Schedule {
  id: string;
  childId: string;
  label: VisualLabel;             // "Morning" etc.
  steps: ScheduleStep[];          // ordered
  daypart?: Daypart;              // slots into the SHIPPED daypart flow; absent => any time
  active: boolean;
  createdAt: EpochMs;
  updatedAt: EpochMs;
  archived: boolean;
}

/** One page of a social narrative (A9). */
export interface NarrativePage {
  id: string;
  /** first-person sentence, shown + spoken */
  label: VisualLabel;            // spokenLabel required (TTS everywhere)
  imageUri?: string;             // local file:// or Storage URL (cached)
}

export interface SocialNarrative {
  id: string;
  childId: string;
  title: VisualLabel;
  pages: NarrativePage[];
  /** provenance of the draft; 'bloop' MUST be parent-approved before the child sees it */
  authoredBy: "parent" | "bloop";
  /** set ONLY by an explicit parent Approve tap; child sees the narrative ONLY when non-null */
  approvedAt?: EpochMs;
  createdAt: EpochMs;
  updatedAt: EpochMs;
  archived: boolean;
}
```

**First-Then (A3) reuses the SHIPPED `Plan` type unchanged** (`src/domain/types.ts` `Plan`): `cue` = the
"First" (required) tile, `action` = the "Then" (chosen) tile; persisted in the shipped `planStore` (`tb/plans`).
A first-then is a *presentation* of a Plan, not a new persisted shape — one component, two framings
(`00-SYNTHESIS2.md` §1.1 #3). The curated "then" choice set is a 2-cell `Board` (AAC workstream's shared
`Symbol`/`Board` primitive), not a new type.

### 3.4 Stores, slices, and the completion orchestrator

- **`scheduleStore` (`tb/schedules`, per-child)** — NEW persisted slice, mirrors the shipped
  `runProgressStore`/`planStore` pattern (`createTbPersistOptions({ name:"schedules", partialize })` +
  `registerPersistedStore`). Shape: `{ schedules: Record<childId, Schedule[]> }` + CRUD
  (`addSchedule/updateSchedule/archiveSchedule/setActive`) + `clearChild`. Hydrates from `{ schedules:{} }`
  on first run (nothing to migrate). This is the **offline source of truth** the player reads; the sync
  adapter WRITES into it from Firestore (pull) but the player never blocks on the network.
- **`narrativeStore` (`tb/narratives`, per-child)** — NEW persisted slice, same pattern:
  `{ narratives: Record<childId, SocialNarrative[]> }` + CRUD + `clearChild`. The kid viewer filters to
  `approvedAt != null`.
- **First-then uses the SHIPPED `planStore` (`tb/plans`)** — no new slice.
- **`gameplay.ts` gains `completeScheduleStep(cid, scheduleId, stepId)`** — a thin orchestrator that REUSES
  the shipped pure primitives (`gamification.earn` for `linkedTaskId`/step token, `resolveCelebration`,
  buddy nurture via the same path `completeStep` uses, and `childStore.addEvent` for an `ActivityEvent`).
  **No new token math, no new celebration engine.** If a step has a `linkedTaskId`, it delegates to the
  shipped `completeStep` for that task; otherwise it fires a token-neutral celebration (positive-only).
- **`wipeAllChildData` (gameplay.ts) MODIFY** — clear `tb/schedules` + `tb/narratives` (setState empty),
  matching the shipped v1 invariant #8 (every new slice cleared on wipe).

### 3.5 Additive fields on shipped interfaces (all optional → no migration)

| Interface (store) | New field | Type | Notes |
|---|---|---|---|
| `Task` (tasks) | `video?` | `VideoRef` | lets a plain routine step (not just a Schedule) carry a model video |
| `Task` (tasks) | `transition?` | `TransitionConfig` | advance-warning on a routine step (A4 also works in the shipped runner) |
| `ChildSettings` (children/profile) | `neuroProfile?` | `NeuroProfile` | per-child axis; absent ⇒ `"adhd"` (v1 default) or parent-set at onboarding |

All three are `?`-optional → `mergeWithDefaults` backfills, `validateAndRepair` coerces unknown
`neuroProfile`/`VideoRefStatus` strings to their safe default (never throws). **`SCHEMA_VERSION` stays `1`,
`MIGRATIONS` stays `[]`** — every addition is one of the three sanctioned additive shapes
(`02-architecture.md` §2.2). Extend the M-A4 migration-forward fixture + schema-roundtrip audit with
`tb/schedules`, `tb/narratives`, `Task.video`, `Task.transition`, `ChildSettings.neuroProfile`.

### 3.6 Firestore data model (parent-authored system of record; on-device stays source of truth for the child)

```
children/{childId}/schedules/{scheduleId}     Schedule (parent-authored); kid caches → tb/schedules, renders offline
children/{childId}/narratives/{narrativeId}   SocialNarrative (+ approvedAt gate); kid caches approved-only → tb/narratives
children/{childId}/activity/{eventId}         mirrored kid completions (schedule step done) for parent monitoring
Firebase Storage: children/{childId}/videos/{id}.mp4   parent-recorded model clips (A8)
```

- **Offline-first + additive-sync (the "never brick the child" law, `00-SYNTHESIS2.md` §D9):** the on-device
  `tb/schedules` / `tb/narratives` / `tb/plans` caches are the **source of truth for the player**. A thin sync
  adapter (owned by the sync workstream, §8) **pulls** parent-authored schedules/narratives/videos down and
  **pushes** completion `ActivityEvent`s up **when online**; with network OFF the player, first-then,
  transitions, and narrative viewing all work fully from cache. Video is the only feature needing a first
  online fetch (then cached); it degrades gracefully (§2.1), never blocking a step.
- **Security rules** start from the donor locked default (`allow read, write: if false`) and open
  per-collection: a `schedules`/`narratives` doc is writable only by the guardian parent (`role:parent` +
  guardian-of link) and readable by that parent + the owning kid; `activity` is kid-write/parent-read; Storage
  video objects are parent-write, owning-kid-read. (Rules authored in the Firebase/backend workstream; this
  workstream supplies the collection shapes + the per-collection rule requirements.)

---

## 4. EXACT files to CREATE / MODIFY (real monorepo paths)

Paths assume the completed monorepo migration (`spec2/01-current-and-target.md` §2). Pre-migration equivalents
drop the `apps/kid/` prefix. `functions/` and `apps/parent/` are net-new packages.

### 4.1 `packages/shared`
- **CREATE** `packages/shared/src/domain/visualSupports.ts` — the types in §3.2–§3.3 (`NeuroProfile`,
  `VideoRef`, `TransitionConfig`, `ScheduleStep`, `Schedule`, `NarrativePage`, `SocialNarrative`).
- **MODIFY** `packages/shared/src/index.ts` — export the above.

### 4.2 `apps/kid` (the extended v1 app)
- **MODIFY** `apps/kid/src/domain/types.ts` — re-export the shared visual-support types; add optional
  `Task.video?`, `Task.transition?`, `ChildSettings.neuroProfile?`.
- **CREATE** `apps/kid/src/domain/schedule.ts` — pure selectors: `nowStep`, `nextSteps(count)`,
  `scheduleProgress`, `stepHasVideo`, transition-priming helpers built on the shipped `timer.ts`
  (`timerRemainingMs`/`timerFraction`). RN-free, `now` passed in.
- **CREATE** `apps/kid/src/domain/narrative.ts` — pure page selectors + `assertNarrativeCopyClean` (routes copy
  through the shipped reminder banned-phrase gate + a Social-Stories-efficacy word ban, §6).
- **CREATE** `apps/kid/src/state/scheduleStore.ts` — `tb/schedules` slice (§3.4).
- **CREATE** `apps/kid/src/state/narrativeStore.ts` — `tb/narratives` slice (§3.4).
- **MODIFY** `apps/kid/src/state/gameplay.ts` — add `completeScheduleStep`; clear the two new slices in
  `wipeAllChildData`.
- **CREATE** `apps/kid/src/services/videoModel.ts` — the ONE isolating, feature-detected, no-throw wrapper for
  video capture (`expo-image-picker` `mediaTypes:['videos']`) + Firebase Storage upload/download + local cache
  (mirrors the shipped `photoVerify.ts` seam discipline; guarded `require`, degrades to no-op/`null` when
  unavailable so web/Expo-Go stay green). Playback via `expo-video` behind the same guard.
- **CREATE** `apps/kid/components/schedule/SchedulePlayer.tsx` — reuses `StepCard`, `VisualTimer`,
  `DoneButton`, `DaypartDonePanel`, `useCelebration`, `CelebrationOverlay`.
- **CREATE** `apps/kid/components/schedule/NowNextStrip.tsx` — always-visible now/next (§2.1).
- **CREATE** `apps/kid/components/schedule/TransitionPrimer.tsx` — A4 advance-warning + "I'm ready" tap.
- **CREATE** `apps/kid/components/schedule/StepVideoButton.tsx` — A8 "Watch how" playback affordance.
- **CREATE** `apps/kid/components/firstThen/FirstThenCard.tsx` — A3 two-cell card (reuses `assemblePlanPhrase`
  + the shipped `PlanCuePanel` interaction).
- **CREATE** `apps/kid/components/narrative/NarrativeViewer.tsx` — A9 read-only page-turner.
- **CREATE** `apps/kid/app/(kid)/schedule.tsx` — pushed route hosting `SchedulePlayer`.
- **CREATE** `apps/kid/app/(kid)/first-then.tsx` — pushed route hosting `FirstThenCard` (standalone).
- **CREATE** `apps/kid/app/(kid)/narrative.tsx` — pushed route hosting `NarrativeViewer`.
- **MODIFY** `apps/kid/app/(kid)/_layout.tsx` — register the three routes as pushed modals; add each to the
  `GrownUpsDoor` hide-list.
- **MODIFY** `apps/kid/components/task/TaskRunner.tsx` — mount `TransitionPrimer` (when `caps.transitionPrimingEnabled`
  + `step.transition`), `StepVideoButton` (when `step.video`), and `FirstThenCard`/`PlanCuePanel` on
  `afterStep` — all **additive, non-blocking**; `onDone`/token/celebration logic unchanged.
- **MODIFY** `apps/kid/src/theme/resolveCapabilities.ts` — add `neuroProfile` to `ResolveCapabilitiesInput`;
  add output flags `scheduleUpcomingCount:number`, `transitionPrimingEnabled:boolean`,
  `autoAdvanceSteps:false` (hard ceiling), `previewNovelty:boolean`; derive from `{ageMode,neuroProfile,sensoryMode}`.
- **MODIFY** `apps/kid/src/theme/resolveTokens.ts` (+ `tokens.ts`) — map `neuroProfile:"autism"` to the
  low-arousal pastel token set (stillwave donor tokens).
- **MODIFY** `apps/kid/src/i18n/en.ts` — new `ModeKeyed` copy keys: `schedule.*`, `firstThen.*`,
  `transition.*`, `video.*`, `narrative.*` (autism literal-language variants; `young`+`older` required,
  `preteen?` optional).
- **MODIFY** `apps/kid/app.json` — add the `expo-video` config plugin + honest camera/microphone usage
  strings (the shipped `expo-image-picker` plugin already exists; extend for video capture).
- **MODIFY** `apps/kid/package.json` — add `expo-video` (Expo SDK 56 first-party, MIT); add the Firebase JS
  SDK Storage import only in the sync/video path (kept out of the no-egress app tree — see §6/§8: the actual
  upload/download runs through the sanctioned client-Storage seam, not `fetch`).
- **CREATE** tests (§7): `__tests__/domain/schedule.test.ts`, `narrative.test.ts`,
  `__tests__/state/scheduleStore.test.ts`, `narrativeStore.test.ts`,
  `__tests__/render/SchedulePlayer.test.tsx`, `FirstThenCard.test.tsx`, `TransitionPrimer.test.tsx`,
  `NarrativeViewer.test.tsx`; **extend** `__tests__/storage/migration-forward.test.ts` +
  `schema-roundtrip.test.ts`; **extend** `__tests__/config/no-network.test.ts` exclusions only if the
  video/sync seam is added (prefer keeping egress out of the app tree entirely).

### 4.3 `apps/parent` (net-new authoring)
- **CREATE** `apps/parent/app/(authoring)/board-builder.tsx` (A1/D6, §2.4), `schedule-builder.tsx`,
  `first-then-builder.tsx`, `narrative-builder.tsx`, `video-capture.tsx` (§2.4).
- **CREATE** `apps/parent/src/firebase/boards.ts` — Firestore CRUD for `children/{id}/boards|symbols`
  (cleared `assetKey`s only; never a child photo), consuming the w4 `AacBoard`/`AacSymbol` primitive.
- **CREATE** `apps/parent/src/firebase/schedules.ts`, `narratives.ts` — Firestore CRUD (donor:
  `expo-firebase-boilerplate-v2` profile/Storage patterns, port JS→TS).
- **CREATE** `apps/parent/src/services/bloopDraft.ts` — calls the guardrail proxy `narrativeDraft` intent
  (§8), returns a draft for the parent editor; hidden when the LLM is disabled/offline.

### 4.4 `functions/` (net-new; the only egress zone)
- **CREATE** `functions/src/bloop/intents/narrativeDraft.ts` — a parent-authenticated, topic-scoped generation
  that runs the SAME input+output shields as chat and returns a suggested narrative; the child never receives
  it directly (parent-approval gate on the client). Wires into the Bloop proxy owned by the guardrail
  workstream (§8) — this workstream contributes the intent + its scope/output contract, not the proxy itself.
- **CONTRIBUTE** to `firestore.rules` / `storage.rules` — the `schedules`/`narratives`/`activity`/`videos`
  collection rules (§3.6), added in the backend workstream from this workstream's shapes.

---

## 5. Reused donor parts (repo + license + files; GPL = reference-only)

**Ship-safe (permissive) vs reference-only is a hard line. No GPL/AGPL code enters the shippable tree.**

| Donor (`_sources2/`) | License | Role in w5 | Concrete parts |
|---|---|---|---|
| **`speakeasy-aac`** | **MIT** ✅ ship | The `Symbol`/`Board` primitive behind the first-then 2-cell picker + schedule symbol tiles | `src/types/index.ts` `Symbol {id,label,imageUrl,category,isCore,backgroundColor}` / `Board {id,parentId,symbolIds[],gridSize}` — adopt as the shared primitive (owned by AAC workstream; consumed here). `src/stores/boardStore.ts` drill-down pattern (port to Firestore-backed zustand). **Bundled `public/symbols/*` are placeholder SVGs — not production art.** |
| **`aac-native`** (Leeloo) | **MIT** ✅ ship | Board content schema + i18n seed + tap-to-speak/sentence-strip UX for tiles | `data/languages/card_*.json` (`{title,slug,parents[],color,phrases}` — proven i18n board content model + per-group color); `components/{card,announcer}.js` tap-to-speak + sentence-strip pattern (rework in RN Reanimated); `data/images/` 158 symbol PNGs = starter set **but verify art provenance before ship — swap ARASAAC CC-BY-NC-SA / non-cleared art for a cleared CC-BY/PD/original set**. |
| **`stillwave`** | **MIT** ✅ ship | Low-arousal palette tokens for the autism preset | `src/constants/theme.ts` pastel low-arousal tokens → feed `resolveTokens` for `neuroProfile:"autism"`. |
| **`expo-firebase-boilerplate-v2`** | **MIT** ✅ ship | Firestore + **Storage** + upload patterns for the parent builders + video (A8) | `src/firebase/config.js` (Firestore+Storage init — **scrub the committed demo creds**); `src/scenes/edit/Edit.js` avatar/Storage **upload** pattern → the model-video upload; port JS→TS. |
| **`react-native-gifted-chat`** | **MIT** ✅ ship (ref for A9 draft surface) | Rich-media message shells if the narrative-draft is surfaced conversationally | `MessageImage/Video.tsx` rich-media patterns (only if the parent-side draft uses a chat surface; otherwise N/A). |
| **`firebase-cloud-functions-typescript-example`** | **MIT** ✅ ship | Backbone for the `narrativeDraft` Cloud Function intent | controller + `verify-idtoken-interceptor.ts` auth gate (the proxy skeleton is owned by the guardrail workstream; this intent plugs into it). |
| `cboard` | **GPL-3.0** ⚠️ **ref-only** | Board-builder + schedule UX study | Study category color-coding + board-builder UX for the schedule/first-then builders. **Do NOT copy code.** |
| Dedicated schedule/first-then/social-story repos (`Maxacl/autism-visual-schedule-board`, `harsha-rao1/visual-schedule-generator`, `mahtabb90/autism-companion-ai`) | **No license** ⚠️ **ref-only** | UX/flow inspiration only (all-rights-reserved) | `mahtabb90/autism-companion-ai` = social-story flow concept reference only. |
| **`expo-video`** (npm, Expo SDK 56 first-party) | **MIT** ✅ ship | A8 kid-side clip playback | first-party module; add to `apps/kid`. |

Append every new bundled asset + module to the root `THIRD_PARTY_NOTICES.md` + `PROVENANCE.md` (v1 discipline).

---

## 6. SAFETY + anti-shame + COPPA rules that apply

**Anti-shame (carried from v1, enforced structurally + by grep gates):**
1. **No auto-advance, ever** (A2/A4) — the schedule/transition never yanks the child forward; advance requires
   a Done or "I'm ready" tap. A depleted timer **rests** (`remaining===0`), never "time's up"/red/flash/alarm.
   Grep gate: no `time's up|out of time|too slow|failed|missed` in the schedule/transition surfaces.
2. **First-then is a framing, not a currency** — the card pays no tokens; only the linked step pays, through
   the shipped loop. No adherence/streak/nag on first-then or narratives (reuses the shipped
   `if-then-plans` invariant: no "missed", only a positive-only "I did it!" nod).
3. **Completions are monotonic + positive-only** — `completeScheduleStep` reuses `gamification.earn` +
   `resolveCelebration`; the companion never withers/frowns (shipped `CompanionMood` positive-only union).
4. **Skipping is free**; partial completion is celebrated; done steps grey calmly (never red).
5. **Video/narrative never quiz or score the child** — no pass/fail, no comprehension test.

**Evidence-honesty copy gates (new, enforced like `BANNED_REMINDER_PATTERNS`):**
- **A9 social narrative:** `assertNarrativeCopyClean` bans branded/efficacy claims —
  grep `social story|social stories|zones of regulation|therapy|treat|cure|clinically proven|evidence-based
  treatment` returns **zero** across `narrative.*` copy + `src/data` narrative templates + the parent
  builder disclosure. Kid-facing framing is "a story to get ready" (preparation aid).
- **A8:** may state "video modeling" (a real EBP) but never "cure/therapy."
- Cross-cutting: no AAC speech-gain promise, no SI/therapy/cure claims anywhere in w5 copy.

**LLM safety (A9 Bloop-draft — the only LLM touchpoint, and it is parent-facing):**
- The draft is generated **server-side through the guardrail proxy** (input shield → topic-scope → provider →
  **output shield**), never a client→model call. **`narrativeDraft` has its OWN parent-authenticated topic-scope
  — BROADER than the child-chat allow-list** (dentist/haircut/fire-drill/medical-body-prep ARE in-scope for
  parent-approved drafts, which the child-chat `medical_advice`/off-scope shields would otherwise reject);
  "identical **shields**" (input+output PII + safety), NOT "identical topic-scope" (§8; resolves §9 #7). PII
  refusal both directions (the parent's facts are scrubbed of identifiers before storage; the child's name may
  pass only via the sanctioned vault pattern if at all).
- **The model is never the safety boundary**; the output shield is. The draft **cannot reach the child** — it
  lands in the parent editor and requires an explicit **Approve** (`approvedAt`) before it can sync. The kid
  viewer renders **approved-only** (`approvedAt != null`).
- With the LLM OFF (default), the draft button is hidden; the parent authors manually. The child-facing player
  has **no model in the loop, ever**.

**COPPA-2025 + UK Children's Code (hard law):**
- **No ad/analytics SDKs in the kid app** — the schedule/video/narrative surfaces emit no telemetry.
- **PII redaction before storage** — narrative facts and any transcript of the draft request are PII-redacted
  in `functions/` before any Firestore write (log the *fact*, not the PII).
- **Retention TTL** — draft-request transcripts and orphaned video objects follow the parent-configurable
  Firestore TTL / Storage-cleanup cron; a parent **review + delete** removes schedules/narratives/videos.
- **Verifiable parental consent** — schedules/narratives/videos are authored only under a **verified parent**
  (the auth-blocking COPPA gate from the backend workstream); child accounts are sub-resources of a verified
  parent.
- **LLM provider bound as a non-training processor**; the video Storage bucket is not shared with any third
  party; **separate opt-in for any third-party sharing (answer: none)**.
- **No-egress in the app tree** — all network (Firestore sync, Storage up/download, the draft call) runs
  through the sanctioned Firebase client seam / `functions/`, kept out of the `no-network.test.ts`-scanned
  `apps/kid/{app,src,components}` tree except the explicitly-excluded sync/video seam module.

---

## 7. Acceptance criteria + verify steps

**Verify floor (green at every boundary, from a clean tree):**
- `npm -w @tiny-bubbles/kid run typecheck` → `tsc --noEmit` = 0.
- `npm -w @tiny-bubbles/kid test` → all suites green, count only grows (never < the current 69-suite baseline).
- `npm -w @tiny-bubbles/kid run web` / `npx expo export --platform web` → succeeds (web-safe; video/sync
  degrade gracefully on web).
- **Functions:** `npm -w functions run build` = 0; `npm -w functions test` (unit) green; Firebase **emulator**
  test of the `narrativeDraft` intent (auth required, off-scope input → refusal, output shield strips
  disallowed content, PII redacted before the transcript write).

**Feature acceptance:**
1. **A2 player:** a parent-authored `Schedule` renders a now/next strip with the current step enlarged, done
   steps greyed (never red); `caps.scheduleUpcomingCount` shows young 1 / older 3 (resolver-only, no raw
   `ageMode`/`neuroProfile` in the component — grep both to zero in `components/schedule/**`); tapping Done
   fires the SHIPPED celebration + advances only on tap (**no auto-advance** — grep `autoAdvance` code path
   proves the ceiling is hard-false); wall-clock timer correct across background/foreground/resume.
2. **A3 first-then:** the two-cell card shows First + a chosen Then from a ≤`maxChoices` curated set; picking
   the Then is the only interaction; the card pays **no tokens** (only the linked step pays through
   `completeStep`); reuses `assemblePlanPhrase` (TTS: "First …, then …"); no `ageMode` branch.
3. **A4 transition:** with `transitionPrimingEnabled` (autism) a step shows an advance-warning + "next: ___"
   preview + **"I'm ready" tap**; timer empty = calm rest (no red/flash/sound unless `timerSoundEnabled`, then
   exactly one ducking chime); low-stim forces discrete 1 Hz + no chime; `transitionPrimingEnabled=false`
   (adhd) hides the warning. Grep no shame/urgency copy.
4. **A8 video:** the "Watch how" button appears only when `step.video` is attached **and** playable now;
   offline + uncached → **hidden** (never a broken affordance, never blocks the step — a render test proves the
   step is still completable); `videoModel.ts` degrades to no-op on web/absent module (like `photoVerify`);
   captured/uploaded video is a Storage object, never an AsyncStorage byte blob.
5. **A9 narrative:** the kid viewer renders **approved-only** narratives (a drafted-but-unapproved narrative,
   incl. `authoredBy:"bloop"` with `approvedAt` unset, renders **nothing** in the kid app — assert in a render
   test); page-turner has no quiz/score/token; `assertNarrativeCopyClean` grep for `social story|social
   stories|therapy|treat|cure|clinically proven|zones of regulation` = **zero**; with the LLM disabled the
   parent builder's draft button is hidden and manual authoring works.
5b. **A1/D6 board builder (parent):** `board-builder.tsx` creates/edits an `AacBoard`, adds cleared-library tiles
   (by `assetKey`, never a child photo), reorders, sets grid/folder; writes `children/{id}/boards|symbols`; a test
   asserts the written board references **only cleared `assetKey`s** (no `pictureUri`/`file://`), and the kid
   `tb/boards` pull renders it; copy passes `assertAacCopyClean` (§8 #23).
6. **Persistence:** `tb/schedules` + `tb/narratives` hydrate from empty defaults; `wipeAllChildData` clears
   both (test); the M-A4 migration-forward fixture + schema-roundtrip audit include both slices +
   `Task.video`/`Task.transition`/`ChildSettings.neuroProfile` and round-trip through `migrateAndRepair(_,1)`
   with no throw, defaults filled, no value lost, `SCHEMA_VERSION` still 1.
7. **No-egress:** `no-network.test.ts` over `apps/kid/{app,src,components}` returns zero (the video/sync seam is
   the only excluded module, and it routes through the Firebase client SDK, not raw `fetch`/`axios`); the
   narrative-draft egress lives solely in `functions/`.

---

## 8. Dependencies on other workstreams · premium/free · LLM on/off

### 8.1 Cross-workstream dependencies (hard edges)
- **Monorepo foundation** (`G0.x`, `spec2/01-current-and-target.md` §2) — **hard prerequisite**: the
  `apps/kid` lift-and-shift, `packages/shared` scaffold, npm-workspaces + tsconfig paths, retargeted
  `no-network.test.ts`. w5 uses post-migration paths.
- **AAC workstream** (A1) — provides the shared **`Symbol`/`Board`** primitive (first-then 2-cell picker +
  schedule symbol tiles) and the **cleared symbol art set** (ARASAAC/Sclera excluded). w5 consumes; does not
  own the board primitive.
- **Firebase backend + Parent app** (D1–D3, D6, D8–D9) — provides parent auth, the **COPPA consent gate**,
  the `children/*` collection ownership + guardian-link **security rules**, the **sync adapter substrate**
  (pull authored content down / push activity up), Firebase **Storage** setup, and TTL/retention crons. w5
  supplies the `schedules`/`narratives`/`activity`/`videos` shapes + per-collection rule requirements.
- **Guardrail proxy / Bloop** workstream (C1–C9) — provides the server-side proxy + shields + the
  **`bloopProvider` mock-first seam**; w5 adds the **`narrativeDraft` intent** (A9) that plugs into it. With
  the mock provider, the draft returns deterministic offline copy so CI never hits the network.
- **Soft:** sensory/break workstream (A5) — the "I need a break" affordance may be reachable from the schedule
  player, but w5 does not require it (degrades gracefully if it ships later).

### 8.2 Premium / free (authoritative gate = `src/services/entitlements.ts`; core loop always free)
- **FREE (accessibility/core — must NEVER be `<PremiumGate>`-wrapped):** the schedule **player**, first-then
  **card**, transition warnings/priming, narrative **viewing**, and **video playback** — these are the child's
  accessibility tools. First authored schedule + first-then + narrative are free.
- **PREMIUM (acquisition-only, if billing confirms — see open assumptions):** a larger **video-storage quota**
  and/or **library depth** (many schedules/narratives/stored clips) behind a NEW count gate
  (e.g. `visualSupportsLibrary {kind:"count", free:N, premium:M}`) — **acquisition-only**: a downgrade blocks
  only NEW authoring; nothing authored/owned/attached is ever removed, hidden, or greyed (v1 invariant #7).
- **Never gate** an accessibility affordance (TTS, viewing an existing schedule/narrative/video, the now/next
  strip, transition safety).

### 8.3 LLM on/off + network on/off behavior
- **LLM OFF (default) + network OFF:** the schedule player, first-then, transition priming, and narrative
  **viewing** work **fully from the `tb/*` cache** — the child core is never bricked. The child app has **no
  model in the loop at any point** in this workstream.
- **LLM OFF + network ON:** identical for the child; the parent can still author everything manually and upload
  videos; only the A9 Bloop-**draft convenience** (parent-side) is hidden.
- **LLM ON (parent-enabled):** the parent-facing narrative **draft** button appears; drafts are generated
  server-side through the full guardrail pipeline, land in the parent editor, and require an explicit
  **Approve** before syncing to the (already offline-capable) child viewer. The mock `bloopProvider` keeps CI
  and offline builds green.

---

## 9. Open assumptions

1. **Schedule vs Routine reuse.** This spec defines a first-class `Schedule`/`ScheduleStep` (parent-authored in
   Firestore, carries video + transition + full-day sequencing) and reuses the shipped `TaskRunner` *primitives*
   (StepCard/VisualTimer/celebration) rather than the `Routine`/`Task` *entities*. If the build-agent finds that
   modeling a schedule as a shipped `Routine` (+ the additive `Task.video`/`Task.transition` fields) is simpler
   and covers "now/next", it MAY collapse `Schedule` onto `Routine` — the additive fields already support that.
   Recommendation: keep the new `Schedule` type (matches `00-SYNTHESIS2.md` §3.2's `tb/schedules` slice) but
   share the rendering primitives. Confirm with the AAC workstream so the `Board`/`Symbol` primitive and the
   schedule step model don't diverge.
2. **`neuroProfile` default.** Assumed per-child, set at parent onboarding; absent ⇒ `"adhd"` (v1's implicit
   default, brighter). Confirm with the onboarding/parent workstream whether autism should be the safer default.
3. **First-then persistence.** Assumed to reuse the shipped `planStore` (`tb/plans`) with a first-then
   presentation. If the parent/first-then UX needs a distinct entity, a dedicated tiny `tb/firstThen` slice is a
   drop-in additive alternative — but reuse is preferred (`00-SYNTHESIS2.md` §1.1 #3, "one component, two
   framings").
4. **Video dep + playback.** Assumed `expo-video` (Expo SDK 56 first-party, MIT) for kid-side playback and
   `expo-image-picker` (`mediaTypes:['videos']`, shipped) for capture. If the target SDK lacks `expo-video`,
   fall back to `expo-av` Video (also first-party) behind the same `videoModel.ts` guard.
5. **Video storage/egress boundary.** Assumed the Firebase client Storage SDK (used only in the excluded
   sync/video seam module) performs up/download; if policy requires it, route uploads through a `functions/`
   signed-URL endpoint instead so the app tree stays 100% egress-free. Confirm with the backend workstream.
6. **Premium classification (§8.2).** Whether video-storage quota / library depth is premium (and the exact
   free/premium counts + gate key) is owned by the billing workstream; w5 keeps the child-facing tools free
   regardless. Flagged for confirmation.
7. **`narrativeDraft` intent contract.** The exact request/response shape and topic-scope of the A9 draft
   intent must be co-designed with the guardrail workstream (it must run the identical input+output shields as
   chat; it is parent-authenticated, not child-authenticated). Assumed here as a scoped generation returning a
   page set for parent approval.
8. **Sync adapter ownership.** The pull/push mechanics (`children/*` → `tb/schedules`/`tb/narratives`; activity
   up) are assumed owned by the Firebase/backend workstream; w5 depends on it but ships fully functional from
   local cache if the adapter lands later (the parent can also seed content on the same device).
