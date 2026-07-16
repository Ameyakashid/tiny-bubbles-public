# Tiny Bubbles

**A calm, non-AI routine app for kids — built for families and clinics.**

Tiny Bubbles helps children (roughly ages 4–12) build everyday routines through
small, one-step-at-a-time tasks, immediate positive celebration, and a friendly
virtual pet they nurture over time. It is designed around the way many kids with
ADHD actually engage: short steps, instant reinforcement, no shame, no nagging,
and a parent who stays in control behind a gate.

> Tiny Bubbles supports **building routines and reducing morning conflict**. It is
> **not** a medical or therapeutic product and makes no clinical claims.

## What it is (and is not)

- **It is** an offline-first, age-adaptive, parent-configured routine + token +
  companion app. No account required; nothing leaves the device by default.
- **It is NOT an AI product.** There is **zero** AI anywhere — no chatbot, no
  assistant, no LLM, no AI task-breakdown, no AI suggestions, and no "AI" setting.
  The companion is a **non-AI procedural virtual pet**. (No network call is made
  in the core loop; analytics and mood logging are opt-IN and on-device only.)

## The loop (evidence-informed, never punishing)

1. **Parent assigns** small templated tasks in 2–3 taps, behind a parental gate.
2. **Child runs** a routine **one step at a time** — each step shows a
   picture/icon/color and is **spoken aloud** (works for pre- and emerging readers).
3. **Every "Done"** fires an **immediate multisensory celebration** (visual +
   sound + haptic, sub-second) and pays a **token** — always, forever.
4. **Tokens nurture** the companion ("Bubble Buddy"), which only ever shows
   positive/restful moods, and can be **redeemed** (parent-approved, escrowed,
   refundable, guardrailed) for caregiver-set real-world rewards.
5. **Reinforcement starts dense, then thins** — but only an invisible bonus
   cadence thins; the base token and a salience-appropriate celebration are
   **never reduced as the child gets better at a routine**.

### Anti-shame is a hard invariant, not a setting

No failure states, no streak-loss / "streak broken", no loss-aversion, no dying
or guilt-tripping pet, no notification floods, no dark-pattern paywall, no
take-aways. Progress is **cumulative and forgiving** (freeze → pause, never zero).
Children never see a paywall, and **nothing a child owns or has equipped is ever
removed, hidden, or unequipped** — premium gating blocks NEW unlocks only. These
rules are enforced by unit tests and CI grep gates (see `THIRD_PARTY_NOTICES.md`,
`PROVENANCE.md`, and the gates in `RUN.md`).

## Age-adaptive by design

A parent sets a per-child age mode (`young` ~4–7 / `older` ~8–12). Components
never branch on the raw mode — they read resolved **theme tokens, capability
flags, and content/variant keys**, so one codebase renders a single-focal,
picture-first, auto-spoken surface for younger kids and a tabbed, more text-rich
surface for older kids, with independent overrides for companion style, text-first,
and a low-stimulation sensory mode. Phones and tablets both get real layouts.

## Feature-complete capabilities

Beyond the core loop, Tiny Bubbles ships a full, additive feature set — all
offline, all anti-shame, all age-adaptive via resolvers:

- **Aging-up** — a `preteen` tier + an `avatar` companion style, always free.
- **Accessibility + i18n** — a canonical English copy catalog, Dynamic-Type-capped
  text, triple-coded status (icon + shape + label, never red/green), OS
  Reduce-Motion honored end-to-end, and OpenDyslexic plumbing (the toggle is hidden
  until the font binaries are bundled — never a silent no-op).
- **Visual transition timers** — a wall-clock, never-red step timer (smooth, or 1 Hz
  under Reduce-Motion); optional soft end-chime, off by default.
- **Light verify + quick undo** — Done always pays and advances (verify never gates);
  a short, blameless undo window; an OPTIONAL parent-enabled photo-verify whose
  photos stay on-device and are deleted on re-verify/wipe/restore.
- **Mood / energy check-in** — opt-in, per-child consent, counts/timelines only
  (never an interpretation); a premium trend behind the paywall.
- **Multi-child + rotating chores** — a fast child switcher and deterministic chore
  rotation; per-child data is fully isolated; no leaderboards or comparison.
- **Soundscapes** — a mix-not-hijack looping audio bed (free calm scene + volume);
  extra beds + focus-during-tasks are premium (acquisition-only).
- **Breathing / regulation** — curated breathing patterns with a calm grow visual;
  no tokens, no measurement, no biofeedback claims.
- **Focus intervals + active breaks** — older-only, token-neutral focus sessions with
  deterministic movement prompts.
- **Novelty & quests** — a deterministic weekly quest rotation + a daily spotlight
  (no RNG, no countdowns/expiry); premium seasonal packs only ever add.
- **If-then plans** — curated "when X, I will Y" implementation-intention plans; time
  cues fire quiet-hours-aware reminders; first 2 free, up to 8 premium.
- **Clinician report + local backup/restore** — the offline "cloud portal"
  replacement: an on-device PDF/printable progress report and a full JSON
  export/import, all behind the parent PIN. Nothing is uploaded.

Everything premium is **acquisition-only**: flipping premium off never removes,
hides, or alters anything a child owns or has equipped. Purchases are **mocked**
behind a seam (`src/services/purchases.ts`) for v1; children never see a paywall.

### Nothing leaves the device — including via the OS

No app-code network egress (enforced by a CI grep gate), **and** no OS-cloud backup
of the data container or photo files (`android.allowBackup:false` + iOS
backup-excluded photo cache), so the store "No data collected / No data shared"
answer is honest. The optional camera is parent-enabled, off by default, and never
uploads. See `store/privacy-policy.md`.

## How it's built

Expo **SDK 56** (React Native 0.85, React 19.2, TypeScript 6), expo-router,
NativeWind v4, Reanimated 4, Zustand v5, date-fns v4. Audio via **expo-audio**;
TTS via **expo-speech**; local notifications via **expo-notifications**. The
default storage port is **AsyncStorage**, so the app runs in **Expo Go** with no
native build (MMKV is a documented optional perf upgrade behind the same port).

```
app/        expo-router screens (onboarding / kid / parent / gate) — thin
components/  buddy, task, celebration, progress, rewards, parent, ui
src/domain/  pure, RN-free, unit-tested logic (tokens, reinforcement, streaks, mood…)
src/state/   Zustand stores (settings, child, task, reward, buddy, session, run-progress)
src/theme/   resolvers (tokens / capabilities / content / celebration) + provider
src/services/ tts, sound (cue registry), haptics, notifications, parentGate, purchases (mock)
src/storage/ port + persist + migrations
src/data/    seed packs (task templates, routines, rewards, cosmetics)
```

### Reused from MIT-licensed open source

Tiny Bubbles grafts code **only** from **lockin** (MIT, © 2025 adhd.dev) — its
router shell, companion-sprite architecture, milestone/celebration UI, and
notification helpers — with all shame/mockery, "ruthless advisor" AI, and
rigid one-goal mechanics **removed**. Patterns from **habit-tracker-app**
(MIT, with Infinite Red / Ignite), **tether** (MIT), and **momentum** (MIT) were
**re-authored** against this stack (no code copied). `adhd-india` and
`adhd-focus-mate` are reference-only and **no line of either ships**. Per-file
origins are recorded in `PROVENANCE.md`.

## Run it

```sh
npm install
npx expo start          # then scan the QR with Expo Go (primary target)
npx expo start --web    # iteration-only web subset (boot + nav + visual celebration)
```

Full run / verification details, the dev diagnostic screens, and the on-device
acceptance checklist are in **`RUN.md`**.

### Verify

```sh
npx tsc --noEmit                 # type safety
npm test                         # jest-expo unit tests
npx expo export --platform web   # web bundle
```

## License posture

Tiny Bubbles itself is **MIT** (`LICENSE`). Third-party code, fonts, and bundled
audio are attributed in **`THIRD_PARTY_NOTICES.md`**, which also records the
production dependency-license scan (no GPL/AGPL/LGPL; the only GPL token is a
dual `BSD-3-Clause OR GPL-2.0` dep for which we elect BSD). All bundled audio is
**project-authored CC0**; fonts (Fredoka, Lexend, optional OpenDyslexic) are
**OFL-1.1**. Provenance and the reference-only prohibition are enforced by
`jscpd` clone scans + string greps + the per-file `PROVENANCE.md` sign-off.
