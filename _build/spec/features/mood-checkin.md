# Feature Spec — Mood / Energy Check-in (`mood-checkin`)

Status: ready to build (additive delta on the shipped app). Research tier: v1 (#16).
Premium/free: **core kid check-in + calm-corner tie-in = FREE**; **multi-week parent
trend/insight = PREMIUM (`advancedInsights`, mock-gated)**.

Hard rules preserved throughout (do not relitigate):
**ZERO AI** (no suggestions, no interpretation, no chatbot — a mood is stored and shown
verbatim, never analyzed by a model). **ANTI-SHAME** (a check-in is never required, never
scored, never "missed"; a "rough" mood earns warmth + an OPTIONAL calm activity, never a sad
pet / lost tokens / streak break). **OFFLINE / on-device only** (mood logs live in the
existing `childStore.moods` AsyncStorage slice; nothing is ever uploaded; opt-IN, default OFF).
**Age-adaptive ONLY via `src/theme` resolvers + capability flags** — no component reads raw
`ageMode`, no `ageMode` prop. **Expo Go / web-safe** (pushed-modal route, no native-only APIs,
animations gated on `t.motion`).

Verify every milestone with: `npx tsc --noEmit`, `npm test`, `npx expo export --platform web`.

---

## 1. Overview + user value

A **kid-friendly, opt-in emoji/energy check-in**: the child taps one of a few big weather-face
moods (and, optionally, an energy level), it is stored on-device, and it powers two things —
a **calm-corner tie-in** (a "rough" or "okay" mood gently offers calm breaths) and a
**parent insight** (a read-only, non-diagnostic glance at what the child shared, with a
premium multi-week trend). It is low-friction, never blocks the loop, and is never used to
shame.

**Why (honest, cited):**
- **Market/community demand.** Mood/energy state drives ADHD task capacity; a "calm corner"
  and gentle parent insight are asks in the community + UX streams
  (`_build/research/01-feature-matrix.md` #16; `00-SYNTHESIS.md` §2.3 "calm mode"; `40` §6).
  A vocal neurodivergent segment rejects reward-only framing and wants a non-gamified,
  emotion-aware path (`30` §3.6) — mood check-in serves that path.
- **Verified science, stated modestly.** Per the adversarial fact-check, **mood logging is
  supportive UX, not a core-symptom efficacy claim** (`01-feature-matrix.md` #16: "keep
  low-friction and optional… not a core efficacy claim"). We therefore make **zero** clinical
  claims in copy, keep it optional, and frame it around emotion-regulation support only. The
  calm tie-in reuses the already-shipped self-paced breathing (`app/(kid)/calm.tsx`), which is
  the "safe, no-hardware, regulate-then-proceed" version the fact-check endorses
  (`01-feature-matrix.md` #19).
- **Anti-dark-pattern.** No streak on check-ins, no guilt for skipping, no daily nag popup —
  consistent with the must-avoid list (`00-SYNTHESIS.md` §4.1/§4.3).

**Donor grounding (concept only, retoned — no code copied):** the 4-level weather-emoji mood
scale and the 3-level color energy pattern named in `_build/plan/62-data-model.md` §11
(momentum `MoodSelector.tsx` `ROUGH/OKAY/GOOD/GREAT`; ilseon `EnergyLevel.kt` 3-level;
mymoodz `MoodGridView` spring-tap). The `MoodLog`/`Mood` types + `childStore.addMood` +
`MOODS_CAP` + the `moodCheckin` capability flag + `moodLoggingEnabled` parent setting **already
exist** in the repo — this feature adds the missing UI + resolvers + wiring, not the data path.

---

## 2. UX behavior, screen-by-screen

### 2.0 The opt-in gate (parent-owned, on-device)

The single master switch is the EXISTING `parentSettings.moodLoggingEnabled`
(`src/domain/types.ts` L601, default `false`, shown today in Settings → Privacy →
"Mood check-ins", `app/(parent)/settings.tsx` L255-265). When OFF: **no** kid entry point
renders, **no** parent insight renders, **nothing** is logged. When ON: the kid entry points +
parent insight appear. Components never read this flag raw — it is wired into the resolved
`moodCheckin` capability (see §4), so screens gate on `useCapabilities().moodCheckin`.

**Per-child consent (child-data hygiene — mood is the most sensitive slice).** Because
`moodLoggingEnabled` is parent-**global**, enabling it for one child would silently enable emotional
logging for EVERY profile on the device (including siblings the parent didn't intend). To make consent
explicit and per-child, the resolved `moodCheckin` grant is computed as
**`moodLoggingEnabled && (child.settings.moodCheckinEnabled ?? true)`** — the global switch is the
master, and an optional per-child `ChildSettings.moodCheckinEnabled?` (additive, default `true` so the
global switch behaves as today when unset) lets a parent turn mood check-ins OFF for a specific child
without affecting siblings. The settings copy for the global toggle also states it "applies to every
child unless you turn it off for one." (Additive optional field → no `SCHEMA_VERSION` bump; §3.)

Deliberately **no auto-popup / no daily prompt** — the child (or parent) taps to check in.
This is the anti-nag rule (`00-SYNTHESIS.md` §4.3): a check-in is offered, never demanded.

### 2.1 Kid entry points (only when `caps.moodCheckin`)

1. **Calm corner (primary home).** `app/(kid)/calm.tsx` gains a gentle, low-emphasis
   "Check in" affordance near the title (below "A quiet place to slow down and breathe"). This
   is the natural home per the brief ("supports a calm corner + parent insight"). Tapping
   pushes `/(kid)/mood`.
2. **Daypart done / empty panel (secondary).** `components/kid/DaypartDonePanel.tsx` gains an
   OPTIONAL, low-emphasis "How are you feeling?" chip (peer of the existing "See what's later"
   peek), shown only when `caps.moodCheckin`. Never the primary focus, never auto-fires.

Both entry points are reachable in BOTH shells: older (tabs) reaches Calm via its tab; young
(single Stack) reaches Calm via its in-screen navigation; the done-panel chip covers the young
"all done" state directly.

### 2.2 The check-in screen — `app/(kid)/mood.tsx` (pushed modal, both shells)

A deliberately **UN-gamified** surface, modeled on `calm.tsx` and `peek.tsx` (no tokens, no
confetti, no celebration, no streak). Layout is resolver-driven (§4), never `ageMode`-branched.

Structure (top → bottom):
- **Header + close (✕).** Same close pattern as `peek.tsx` (router.back()). Title from
  `resolveContent("mood.prompt", { ageMode })` — young "How do you feel?", older "How are you
  feeling?".
- **Mood grid** (`components/mood/MoodGrid.tsx`): the 4 weather faces from `MOOD_FACES`
  (`src/data/moodScale.ts`) — 🌧️ rough · ☁️ okay · 🌤️ good · ☀️ great — each a big touch
  target (>= `t.touchTargetMin`), each carrying a `spokenLabel`. Tapping a face selects it
  (a calm scale/opacity confirm; animation only when `t.motion.loopsEnabled`, so lowStim /
  Reduce-Motion get an instant, static select — no spring).
- **Energy grid (optional, skippable)** (`components/mood/EnergyGrid.tsx`): shown only when
  `resolveMoodCheckin(...).showEnergy` is true. Young = 3 cells (😴 low · 🙂 ok · ⚡ high);
  older = 5 cells (a low→high ramp). Each cell has a `spokenLabel`. Skipping energy is fine —
  it is never required.
- **Confirm.** One tap on a mood logs immediately (energy included if chosen) and shows a warm
  line from `resolveContent("mood.thanks", …)` — young "Thanks for sharing! 💛", older "Thanks
  for checking in." No score, no "you're X% happy", no history shoved back at the child.
- **Calm tie-in (anti-shame core).** If the selected mood is `rough` or `okay`, a gentle,
  OPTIONAL offer appears: `resolveContent("mood.calmOffer", …)` ("Want some calm breaths?")
  → routes to `/(kid)/calm`. For `good`/`great`, no offer (nothing to fix). Choosing to skip
  the offer simply closes. A rough mood NEVER triggers a negative reaction anywhere (companion
  mood is untouched; there is structurally no negative mood — `CompanionMood` has no negative
  member).
- **Skip.** A "Maybe later" text button (`resolveContent("mood.skip", …)`) closes without
  logging.

TTS: for `young` (pervasive-TTS default) the prompt + the tapped mood's `spokenLabel`
auto-speak via the existing `speak()` / `SpokenLabel` seam (same pattern as `peek.tsx`
L72-77). For `older`, spoken on tap only. Respect `settings.spokenLabelsEnabled`.

Writing the log: gated a second time defensively — the screen calls `childStore.addMood` only
when `moodLoggingEnabled` is on (the screen shouldn't be reachable otherwise, but the write is
guarded so a stale deep-link can never log against an opted-out family).

### 2.3 YOUNG vs OLDER differences (via `resolveMoodCheckin` + capability flags)

| Derived (resolver/flag) | `young` | `older` |
|---|---|---|
| Prompt copy | `resolveContent("mood.prompt")` young variant | older variant |
| Mood tiles | 4 faces, extra-large, `autoSpeakPrompt: true` | 4 faces, standard, `autoSpeakPrompt: false` |
| Energy grid | 3 cells (`energyLevels: 3`), `energyScaleMax: 3` | 5 cells (`energyLevels: 5`), `energyScaleMax: 5` |
| Entry emphasis | done-panel chip + calm-corner button (no tab) | Calm tab + calm-corner button |
| Parent glance visibility | n/a (kid surface identical in structure) | n/a |

No component reads `ageMode` — the table above is entirely produced by
`resolveMoodCheckin({ ageMode, sensoryMode })` and `resolveContent(...)`.

### 2.4 Low-stim / calm variants

- `sensoryMode === "lowStim"` OR OS Reduce-Motion: `resolveMoodCheckin` returns
  `animateSelect: false` → tap-select is instant (no spring/scale loop); the grid uses the
  desaturated palette automatically (tokens already resolve lowStim). No drifting-bubble
  background here (unlike `calm.tsx`), keeping the surface quiet.
- `calmMode` (the non-gamified child): mood check-in is fully compatible and, if anything, more
  at-home here — still no tokens/celebration (the screen never had any). The calm tie-in button
  is the same.

### 2.5 Parent insight — `app/(parent)/insights.tsx` + dashboard glance

Only rendered when `moodLoggingEnabled`. Strictly **read-only, descriptive, non-diagnostic**.

- **FREE — dashboard glance.** `app/(parent)/dashboard.tsx` `ChildCard` gains a compact
  "Recent check-ins" strip (only when `moodLoggingEnabled`): the last ~5 moods as emoji chips
  with their day, newest first, plus a link "See check-ins →" to `insights.tsx`. Neutral
  framing ("Ana shared: 🌤 ☀️ 🌧 ☁️ 🌤"), no averages-as-scores, no red/green judgment.
  **Empty state (zero logs):** when `moodLoggingEnabled` is on but the child has no `MoodLog`
  entries yet, the strip shows a single calm line — copy key `mood.glanceEmpty`
  ({young/older: "No check-ins yet — they'll appear here."}) — never a blank row or a "0 moods"
  scoreboard.
- **PREMIUM — `insights.tsx` trend.** A dedicated screen (linked from the dashboard management
  Card and the glance) showing a simple, on-device multi-week view: an emoji timeline
  (`components/mood/MoodTrend.tsx`) + energy-by-daypart summary, computed by the pure
  `src/domain/moodInsight.ts` selectors. The **trend** section is wrapped in the existing
  `<PremiumGate>` / `isFeatureUnlocked("advancedInsights", …)` (mock entitlement). Free users
  see the recent list + an honest "Plus shows trends over time" upsell row (no urgency, no
  medical claim). Copy is descriptive only — e.g. "Most check-ins this week were 🌤/☀️" —
  and NEVER interpretive ("your child seems anxious"), which would be an implicit AI/clinical
  claim. All numbers are counts of what the child literally tapped.

**Empty state — `insights.tsx` with zero logs:** when the screen is reached but the child has no
`MoodLog` entries in range, it renders a calm forward-framed line (copy key `mood.insightsEmpty`,
{young/older: "No check-ins yet — this fills in as your child checks in."}) instead of an empty
timeline/chart. Never a blank screen or a blaming "nothing logged".

**Mechanical banned-interpretation gate (ZERO-AI enforcement — parity with `reportHtml.test.ts`).**
The "no emotional label / no interpretation" invariant is not left to prose. Add
`__tests__/domain/moodInsight.test.ts` assertions + a copy/grep gate over the mood surfaces that
**fails** on any interpretive token: `anxious|sad|struggling|worse|better|concern|risk|seems|
likely|needs|trending? (down|up)|mostly rough|needs attention`. It scopes `app/(parent)/insights.tsx`,
`components/mood/MoodTrend.tsx`, `components/mood/*`, and the `mood.*` copy keys, and runs every
`moodInsight.ts` selector's *output* through the banned-token check (the selectors return counts/
timelines only — never a label). Listed in §7 and BUILD-GUIDE §3.

Parent surfaces stay dense/utilitarian, behind the PIN gate, and use `ageModeLabel` (no raw
`ageMode`).

---

## 3. Data-model additions (exact types + store + migration)

**Store:** the EXISTING `childStore.moods: Record<string, MoodLog[]>`
(`src/state/childStore.ts` L72), written by the EXISTING `addMood` (L269-274), capped by
`MOODS_CAP = 500` (`src/domain/constants.ts` L32), persisted in the `children` slice
(`partialize` L300-309), key-scoped under `tb/child/<cid>/moods`
(`src/storage/schemaVersion.ts` L52). **No new store, no new persisted key.**

**Type change (`src/domain/types.ts`, `MoodLog` at L417-427) — ADDITIVE, all OPTIONAL:**

```ts
export interface MoodLog {
  id: string;
  childId: string;
  ts: EpochMs;
  day: IsoDay;
  mood?: Mood;                 // existing: 'rough' | 'okay' | 'good' | 'great'
  energy?: number;             // existing: young 1-3, older 1-5 (see energyScaleMax)
  note?: string;               // existing (unused by this UI; kept)
  context?: "morning" | "after_school" | "bedtime" | "adhoc"; // existing (kept, back-compat)
  // --- ADDITIVE (this feature) ---
  daypart?: Daypart;           // NEW: daypart at log time (aligns with the daypart engine,
                               //      cleaner grouping than the legacy `context`)
  energyScaleMax?: number;     // NEW: the energy scale used at log time (3 young / 5 older),
                               //      so parent-insight normalizes across an ageMode switch
  source?: "kid" | "parent";   // NEW: who logged it (default 'kid'); reserved for a future
                               //      parent-logged entry. Absent => treat as 'kid'.
}
```

`addMood` needs no signature change — its `Omit<MoodLog,"id"|"childId">` payload already
accepts the new optional fields. The check-in screen passes
`{ ts, day: isoDay(now, tz), daypart, mood, energy?, energyScaleMax, source: "kid" }`.

**Also additive on `ChildSettings` (`src/domain/types.ts`) — per-child consent (§2.0):**
`moodCheckinEnabled?: boolean` (absent ⇒ `true`, so the parent-global `moodLoggingEnabled` behaves
exactly as today until a parent opts a specific child out). Optional → no `SCHEMA_VERSION` bump; the
resolved `moodCheckin` grant ANDs it with the global switch (§4.1). A parent per-child toggle lives in
`app/(parent)/children.tsx` (mood row) so siblings can be handled independently.

**Migration notes (additive → no version bump).** All three new fields are OPTIONAL, so
existing persisted `MoodLog[]` remain valid; `mergeWithDefaults`/`validateAndRepair`
(`src/storage/migrations.ts`) preserve them untouched (they carry no new invariant). Therefore
**`SCHEMA_VERSION` stays 1** and `MIGRATIONS` stays empty for this feature. If a LATER change
makes `daypart` required, bump `SCHEMA_VERSION` and add a migration that backfills
`daypart` from `ts` via `getDaypart(ts, tz)` (or from legacy `context`) — the engine is ready
(`migrations.ts` §runMigrations). Document this in the migration entry, not now.

No anti-shame invariant is added or weakened: a `MoodLog` cannot represent failure/loss; the
repair layer needs no new rule (a stray `mood`/`energy` value is simply ignored by the
descriptive UI, never coerced into a punishing state).

---

## 4. Age-adaptation: the new resolver + capability wiring

### 4.1 Capability flag — reuse `moodCheckin`, wire the grant

`resolveCapabilities` already exposes `moodCheckin` (`src/theme/resolveCapabilities.ts` L40,
default `false` for both ages, grant-overridable L128). `CapabilityGrants` already includes
`moodCheckin` (`src/theme/ThemeProvider.tsx` L39). The ONLY missing wire is feeding the parent
opt-in into the grant.

**MODIFY `app/_layout.tsx` `ThemedRoot`** (the `value` memo, L183-200): read
`moodLoggingEnabled` from settings and pass it as a grant so `useCapabilities().moodCheckin`
reflects the opt-in end-to-end:

```ts
const moodLoggingEnabled = useSettingsStore((s) => s.parentSettings.moodLoggingEnabled);
// per-child consent (§2.0): the global switch is the master; a child may be opted out individually.
const perChildMood = activeProfile?.settings.moodCheckinEnabled ?? true;
// …inside the memo, in the `grants` object (currently L198):
grants: { ttsDefault: cs.spokenLabelsEnabled, moodCheckin: moodLoggingEnabled && perChildMood },
```

Now every kid/parent surface gates on the resolved flag (`caps.moodCheckin`), never on the raw
setting and never on `ageMode`. The grant ORs the global opt-in with the per-child
`moodCheckinEnabled` (default `true`), so mood logging can be disabled for one child without
affecting siblings. (Add `moodLoggingEnabled` + the active child's `moodCheckinEnabled` to the memo
dep array.)

### 4.2 New pure resolver — `src/theme/resolveMoodCheckin.ts`

Same shape/discipline as `resolveCelebration.ts` (pure, unit-tested, `ageMode`+`sensoryMode`
in → config out; no React, no store):

```ts
import type { AgeMode, SensoryMode } from "../domain/types";

export interface MoodCheckinConfig {
  energyLevels: 3 | 5;      // young 3, older 5
  energyScaleMax: 3 | 5;    // stored on the log for normalization
  showEnergy: boolean;      // true both modes; a single knob if we later hide it for young
  autoSpeakPrompt: boolean; // young true (pervasive TTS), older false
  animateSelect: boolean;   // false in lowStim (OS Reduce-Motion clamps separately in the UI)
  tileScale: number;        // young larger (e.g. 1.15), older 1.0
}

export function resolveMoodCheckin(input: {
  ageMode: AgeMode;
  sensoryMode: SensoryMode;
}): MoodCheckinConfig { /* young vs older table above; lowStim => animateSelect:false */ }
```

The screen also composes OS Reduce-Motion via `t.motion.loopsEnabled` (like `calm.tsx` L39)
so the final "animate?" decision is `cfg.animateSelect && t.motion.loopsEnabled`.

### 4.3 New copy keys — `src/theme/resolveContent.ts`

Add to `COPY` (each MUST carry BOTH `young` + `older`; the
`satisfies Record<string, ModeKeyed<string>>` constraint enforces it at compile time — see
`__typetests__/content-typetest.ts`):

```
"mood.prompt"       { young: "How do you feel?",        older: "How are you feeling?" }
"mood.thanks"       { young: "Thanks for sharing! 💛",   older: "Thanks for checking in." }
"mood.energyPrompt" { young: "How much energy?",         older: "Energy level" }
"mood.calmOffer"    { young: "Want some calm breaths?",  older: "Try the calm corner?" }
"mood.skip"         { young: "Maybe later",              older: "Skip" }
"mood.checkIn"      { young: "Check in",                 older: "Check in" }
```

Kid-facing content (mood faces, energy cells) lives in DATA, not the component (§5).

---

## 5. Files to CREATE and MODIFY (real paths under `tiny-bubbles/`)

### CREATE
1. `src/data/moodScale.ts` — content module (like `taskTemplates.ts`). Exports
   `MOOD_FACES: { mood: Mood; emoji: string; spokenLabel: string; color: string }[]`
   (rough 🌧️ / okay ☁️ / good 🌤️ / great ☀️, with warm, non-judgmental colors) and
   `ENERGY_CELLS_YOUNG` (3) / `ENERGY_CELLS_OLDER` (5), each `{ value, emoji, spokenLabel }`.
2. `src/theme/resolveMoodCheckin.ts` — the pure age/sensory resolver (§4.2).
3. `components/mood/MoodGrid.tsx` — kid-facing 4-face grid; props `{ selected, onSelect,
   config, animate, ttsEnabled }`; uses `SpokenLabel`; no `ageMode`.
4. `components/mood/EnergyGrid.tsx` — optional energy grid (3/5 cells) from the resolver.
5. `app/(kid)/mood.tsx` — the pushed-modal check-in screen (§2.2). Thin: resolves active
   child, composes the grids, writes via `childStore.addMood`, offers the calm tie-in.
6. `src/domain/moodInsight.ts` — PURE, unit-testable selectors over `MoodLog[]`:
   `recentMoods(logs, n)`, `moodCountsInRange(logs, fromDay, toDay)`,
   `energyByDaypart(logs)`, `moodTimeline(logs, days)`. NO interpretation/labels — counts and
   groupings only (no-AI). `now`/`tz` passed in (deterministic, like the rest of `src/domain`).
7. `components/mood/MoodTrend.tsx` — parent-side read-only emoji timeline + energy-by-daypart,
   fed by `moodInsight.ts`. Descriptive only.
8. `app/(parent)/insights.tsx` — parent mood/energy insight screen (free recent list +
   premium trend behind `<PremiumGate>`), reachable only inside the PIN-gated `(parent)` group.
9. Tests: `__tests__/theme/resolveMoodCheckin.test.ts`, `__tests__/domain/moodInsight.test.ts`;
   EXTEND `__tests__/theme/resolveContent.test.ts` (new keys resolve both variants) and
   `__tests__/theme/resolveCapabilities.test.ts` (grant flips `moodCheckin`).

### MODIFY
1. `src/domain/types.ts` — `MoodLog`: add optional `daypart`, `energyScaleMax`, `source` (§3).
2. `src/theme/resolveContent.ts` — add the 6 `mood.*` copy keys (§4.3).
3. `app/_layout.tsx` (`ThemedRoot`) — wire `grants.moodCheckin` from `moodLoggingEnabled`
   (§4.1); add to the memo deps.
4. `app/(kid)/_layout.tsx` — register `mood` as a pushed **modal** route in BOTH `YoungStack`
   (`<Stack.Screen name="mood" options={{ presentation: "modal" }} />`) and `OlderTabs`
   (`<Tabs.Screen name="mood" options={{ href: null }} />`, like `peek`/`celebrate`); add
   `"mood"` to `GrownUpsDoor`'s hide list (L104) so the door doesn't overlap the modal.
5. `app/(kid)/calm.tsx` — add the low-emphasis "Check in" affordance (only when
   `caps.moodCheckin`) routing to `/(kid)/mood`.
6. `components/kid/DaypartDonePanel.tsx` — add the optional "How are you feeling?" chip (only
   when `caps.moodCheckin`), a peer of the existing peek link.
7. `app/(parent)/dashboard.tsx` — `ChildCard`: compact "Recent check-ins" strip + "See
   check-ins →" link (only when `moodLoggingEnabled`); add a "Check-ins" row to the management
   Card linking to `insights.tsx`.
8. `app/(parent)/_layout.tsx` — **no change needed**: it renders a bare `<Stack>` (verified
   L21) that auto-registers any file under `app/(parent)/`, so `insights.tsx` is guarded by the
   existing `parentUnlocked` redirect automatically.
9. `app/(parent)/settings.tsx` — minor: extend the existing "Mood check-ins" hint (L257) to
   "Off by default. Optional emoji check-in for kids + a private, on-device parent view."
10. `src/theme/index.ts` — export `resolveMoodCheckin`; `src/domain/index.ts` — export
    `moodInsight` selectors (barrel consistency).

---

## 6. Reused prebuilt libraries

Prefer existing deps — **no new dependency is required.**

- **State/persistence:** `childStore.moods` + `addMood` + `zustand` persist (existing).
- **Domain time:** `date-fns` / `date-fns-tz` via `src/domain/dates.ts` (`isoDay`, `getDaypart`,
  `selectionDaypart`) — existing, web-safe.
- **Animation:** `react-native-reanimated` (already used in `calm.tsx`) for the calm tap-select
  confirm, gated on `t.motion`.
- **TTS:** `expo-speech` via `src/services/tts.ts` + `components/ui/SpokenLabel.tsx`.
- **Emoji:** plain Unicode in `RN.Text` (matches `MOOD_FACES`, `taskTemplates.ts`) — no
  `rn-emoji-keyboard` needed (that is the authoring picker, not a display grid).
- **Premium gate:** `components/parent/PremiumGate.tsx` + `src/services/entitlements.ts`
  (`isFeatureUnlocked("advancedInsights", …)`), existing.
- **Parent UI kit:** `components/parent/ui.tsx` (`Card`, `SectionTitle`, `SettingRow`, etc.).

**New MIT libs:** none. (No charting lib — the trend is a lightweight emoji timeline + counts,
avoiding an Apache/heavy dep and keeping it web-safe.)

---

## 7. Anti-shame + no-AI rules that apply here

- **Never required, never nagged.** No auto-popup, no daily reminder for check-ins, no badge/
  count of "missed" check-ins. Skipping is silent and free (`00-SYNTHESIS.md` §4.3).
- **No streak, no score, no tokens.** Checking in earns nothing and breaks nothing; the token
  economy and streak state are untouched by this feature.
- **A "rough" mood is met with warmth, not correction.** The only response is an OPTIONAL calm
  offer; the companion is never sad/sick/disappointed (structurally impossible —
  `CompanionMood` has no negative member; this feature does not call any negative event).
- **No interpretation anywhere (ZERO AI).** The app stores and displays exactly what the child
  tapped. Parent insight shows counts/timelines of literal taps — NEVER a computed emotional
  label, risk flag, "seems anxious", or suggestion. No LLM, no heuristic "diagnosis", no
  AI toggle (there is nothing to toggle).
- **On-device only.** Mood logs never leave the device; the parent view is local; the feature
  is off by default and appears only after explicit parent opt-in (`moodLoggingEnabled`).
- **Non-diagnostic, no clinical claims** in any copy (kid or parent), consistent with the
  fact-check ("supportive UX, not a core efficacy claim").
- **Age-adaptive via resolvers only** — `resolveMoodCheckin` + `resolveContent` + the
  `moodCheckin` flag; no component branches on raw `ageMode`, no `ageMode` prop.

---

## 8. Acceptance criteria + verify steps

**Acceptance criteria**
1. With `moodLoggingEnabled = false` (default), NO mood entry point renders on any kid surface
   and NO parent insight renders; `useCapabilities().moodCheckin === false`.
2. Turning ON "Mood check-ins" in Settings makes: the Calm-corner "Check in" button + the
   done-panel chip appear (kid), and the dashboard "Recent check-ins" strip + Insights link
   appear (parent).
3. `/(kid)/mood` shows 4 weather faces; tapping one logs a `MoodLog` with
   `{ mood, day, ts, daypart, source:"kid" }` into `childStore.moods[cid]`, shows the warm
   "thanks" line, and (for `rough`/`okay`) offers a calm-breaths button routing to `/(kid)/calm`.
4. Young shows 3 energy cells + auto-speaks the prompt; older shows 5 energy cells + no
   auto-speak — **produced only** by `resolveMoodCheckin` / `resolveContent`, with no `ageMode`
   read in any component (grep proves it).
5. lowStim / OS Reduce-Motion: tap-select is instant (no spring); verified via
   `resolveMoodCheckin(...).animateSelect === false` and `t.motion` gating.
6. Skipping the check-in (close/"Maybe later") logs nothing and never alters tokens, streak, or
   companion mood.
7. Parent insight is read-only and descriptive: the FREE recent list renders for all tiers; the
   multi-week TREND is behind `<PremiumGate>` (`advancedInsights`) and shows an honest,
   no-urgency upsell when free. No interpretive text anywhere — enforced by the **mechanical
   banned-interpretation gate** (§2.5): a grep/test over `insights.tsx` + `components/mood/*` +
   `mood.*` copy + every `moodInsight.ts` selector output finds zero interpretive tokens
   (`anxious|sad|struggling|worse|concern|risk|seems|likely|needs|trend(ing)? (down|up)`).
8b. Empty states: `moodLoggingEnabled` on with zero logs shows the calm `mood.glanceEmpty` /
   `mood.insightsEmpty` lines, never a blank/blaming surface. Per-child: turning
   `moodCheckinEnabled` off for one child leaves siblings' check-ins working.
8. Mood logs are included in the Settings → "Review what's stored" snapshot (already counts
   `moodLogs` via `sumLen(child.moods)`, `settings.tsx` L335/L346) and in any local
   backup/export (cross-ref §9) — nothing is uploaded.
9. New optional `MoodLog` fields do not require a schema bump; existing logs still load.

**Verify steps an agent runs**
- `npx tsc --noEmit` → 0 errors (the `mood.*` copy keys satisfy `ModeKeyed`; the `MoodLog`
  additions type-check through `addMood`).
- `npm test` → all suites green, including the new `resolveMoodCheckin` +`moodInsight` suites
  and the extended `resolveContent` / `resolveCapabilities` suites (target: >= 337 tests,
  never fewer than the current 335).
- `npx expo export --platform web` → succeeds (no native-only API; modal route + reanimated
  are web-safe).
- Manual (Expo Go / web): toggle `moodLoggingEnabled`, run a young + an older child, confirm the
  §2 flows, the calm tie-in, and the parent glance/trend gating.
- `grep -rn "ageMode" components/mood app/(kid)/mood.tsx` returns **no raw reads** (only
  resolver/`ageModeLabel` usage in parent surfaces).

---

## 9. Dependencies on other feature specs + premium/free classification

**Depends on (all already shipped in the repo):**
- **Theming / age engine** — `resolveCapabilities` (`moodCheckin` flag), `resolveContent`
  (`ModeKeyed` copy), `ThemeProvider` grants, `useThemeTokens`. (Hard dependency.)
- **Daypart engine** — `src/domain/dates.ts` (`getDaypart`/`selectionDaypart`/`isoDay`) for the
  optional `daypart` tag + parent grouping. (Soft — degrades gracefully if absent.)
- **Calm corner** — `app/(kid)/calm.tsx` is the tie-in target for a rough/okay mood.
- **Mock paywall / entitlements** — `advancedInsights` gate + `<PremiumGate>` for the trend.
  (Purchase stays MOCKED behind the existing seam.)

**Cross-refs (other feature specs should include mood data):**
- **Local backup / restore** spec — the export/import MUST include `tb/child/<cid>/moods`
  (it is part of the `children` slice already; just ensure the serializer covers it).
- **Printable / shareable clinician report** spec — the report's optional "mood trend if
  enabled" section consumes `src/domain/moodInsight.ts` selectors (reuse, don't re-derive), and
  must stay non-diagnostic.

**Premium/free classification**
- **FREE (core-loop-adjacent, accessibility/emotional-support — never gated):** the entire kid
  check-in (grids, logging, calm tie-in) and the parent "Recent check-ins" glance. Rationale:
  emotion support + a calm path are safety/accessibility, in the same never-gated category as
  calm mode / sensory / reminders (`entitlements.ts` NEVER-GATED note). The core loop is always
  free.
- **PREMIUM (`advancedInsights`, mock-gated):** only the multi-week mood/energy TREND view in
  `insights.tsx`. This matches the existing `FEATURE_GATES.advancedInsights` flag; no new gate
  key is introduced. Gating blocks the trend view only — it never removes or hides any already-
  logged mood (retention untouched, `entitlements.ts` §1b.11).

---

## 10. Open assumptions

1. **Opt-in granularity — RESOLVED to per-child.** `moodLoggingEnabled` remains the parent-GLOBAL
   master switch, but an additive optional `ChildSettings.moodCheckinEnabled?` (default `true`) is now
   ANDed with it when computing the `moodCheckin` grant (§2.0/§4.1), so enabling mood logging does NOT
   silently opt in siblings a parent didn't intend — a parent can turn it off per child. Additive,
   default-true → behaves exactly as the old global-only switch until used.
1b. **Wellbeing-vs-monetization tension (explicit product decision).** The multi-week mood/energy TREND
   is gated behind `advancedInsights` while the app markets the clinician report as a trust asset —
   charging for a longitudinal view of a child's emotional check-ins is ethically brittle. The decision
   here (and in billing §8): keep **raw logs, the free recent-check-ins list, AND the 7d/30d clinician
   report's mood card FREE**; gate only the *dedicated multi-week trend screen* depth (a utility view,
   same `advancedInsights` axis as report range-depth), and never remove or hide any logged mood.
   Documented as a deliberate call so it can be revisited if it reads as "paywalling my kid's mood data."
2. **Energy scale = 3 (young) / 5 (older).** The data-model doc mentioned "older 0-10", but a
   0-10 slider is not a "kid-friendly grid"; a 5-cell grid is the buildable interpretation.
   `energyScaleMax` is stored so this can change without breaking old logs.
3. **No auto-prompt.** We assume the anti-nag rule outweighs "prompt once per day". If product
   later wants a gentle once-daily offer, it must be dismissible, quiet-hours-aware, and still
   never required — spec that separately.
4. **Parent-logged moods deferred.** `source: "kid" | "parent"` is reserved; only kid-logged
   entries are written now. A parent "log for my child" flow is out of scope.
5. **Trend richness.** The premium trend is an emoji timeline + energy-by-daypart counts (no
   charting lib). If a graphical chart is later desired, evaluate an MIT, web-safe, RN chart
   lib then — not now.
6. **`context` vs `daypart`.** New logs write `daypart`; the legacy `context` field is left in
   place for back-compat and simply not populated by this UI. Insight selectors read `daypart`
   (falling back to deriving from `ts` when absent) so old and new logs both group cleanly.
