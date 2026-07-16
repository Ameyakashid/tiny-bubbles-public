# 00 — MASTER ROADMAP (feature-complete Tiny Bubbles)

*Authored 2026-07-06 against the shipped, green baseline (`_build/spec/01-current-state.md`:
`npx tsc --noEmit` = 0, `npx jest` = 34 suites / 335 tests) and the consolidated architecture
(`_build/spec/02-architecture.md`) + all 15 feature specs in `_build/spec/features/*.md`. This is
the execution playbook: it groups the 15 features into buildable **milestones**, gives an **ordered
build sequence** that honors the dependency graph, states **effort** and **per-milestone acceptance
criteria**, and guarantees the app stays **runnable / green at every milestone boundary**. The
recursive HOW (implement → verify → fix, the verify floor, the greps, DoD, PROVENANCE, redeploy) is
in the companion `_build/spec/03-BUILD-GUIDE.md`. Mind the SPACE in the repo path
`/Users/ameyakashid/Desktop/adhd india/tiny-bubbles`.*

---

## 0. Locked decisions (do NOT relitigate — these are inputs, not open questions)

- **OFFLINE-FIRST.** No accounts, no cloud backend. All data on-device via AsyncStorage behind the
  `storage` port. The cloud-portal replacement = **local backup/restore** (export/import a JSON file)
  + an **on-device printable/shareable clinician report**. No servers.
- **BILLING MOCKED.** Spec the paywall/entitlements FULLY; the purchase stays mocked behind
  `src/services/purchases.ts` (`// TODO: wire RevenueCat`). Every feature is classified premium vs
  free; the core loop is always free. Real StoreKit/RevenueCat is a later wiring step behind the seam.
- **ZERO AI.** No chatbot/LLM/assistant/AI-suggestions/AI-toggle. Companion is a NON-AI pet.
- **ANTI-SHAME.** No failure/streak-loss/guilt states; incomplete is fine. `TaskStatus` has no
  `failed` member; `CompanionMood` is positive-only; monotonic totals never regress.
- **CURATED AUTONOMY.** Bounded choices (3/6 caps; reward ceiling 6, never "unlimited").
- **AGE-ADAPTIVE ONLY via `src/theme` resolvers + capability flags.** Never a raw `ageMode` read in a
  component; never an `ageMode` prop. Parent surfaces use `ageModeLabel`.
- **Expo Go compatible, offline, web-safe.** Bundled assets, no network egress, wall-clock domain math.
- **STACK (verified in `package.json`):** Expo SDK ~56, RN 0.85, React 19.2, TS ~6, zustand ^5,
  date-fns ^4 (+ date-fns-tz ^3), NativeWind ^4, react-native-svg 15, reanimated 4.3, expo-audio/
  haptics/speech/notifications, AsyncStorage 2.2.

**The single most important structural fact:** feature-complete is a **purely additive delta**.
`SCHEMA_VERSION` stays **1** and `MIGRATIONS` stays **empty**. Every addition is one of exactly three
additive shapes (optional field on an existing persisted interface, union-member widening, or a
brand-new independently-persisted store slice) — see `02-architecture.md` §2. No milestone below
changes the shape or meaning of any existing persisted field.

---

## 1. The 15 features → milestones (grouping)

**16 work items map across 17 milestones (M0 + 16).** `production-readiness` is ONE spec split across
two milestones (M-A4 front-load + M-D2 ship-gate), so 16 work items = 16 feature milestones, and with
the M0 baseline gate that is **17 milestone cards** (M0 + M-A1..M-D2). **One feature spec ≈ one
milestone** (plus two production-hardening bookends and a baseline gate) — deliberately, so a recursive
build-agent reads exactly one `_build/spec/features/<slug>.md` per milestone with no cross-planning.
Two "locked-decision deltas" (local backup/restore, printable clinician report) live inside
`clinician-reporting`; the billing delta (trial reminder + gate seams + classification, incl. the NEW
`ifThenPlans` gate key) is `billing-entitlements`.

**Dispositions of the remaining research/current-state gaps (so "feature-complete" is verifiable — no
silent omissions, mirroring how #23/#25 are handled):**
- **#18 Co-play / body-doubling — DEFERRED / out-of-scope for feature-complete.** Real-time
  co-presence implies a **sync server / shared live session**, which violates the LOCKED OFFLINE-FIRST,
  no-servers architecture. Partial offline coverage already ships via companion co-presence + breathing
  "Breathe with me" + the multi-child hand-off. A networked co-play mode is post-v1 (would require
  lifting the no-server constraint). (`02-architecture.md` §6-C13.)
- **OpenDyslexic font activation (#17) — OWNED (M-A3 wiring + M-D2 ship-gate).** M-A3 wires
  `src/theme/fonts.ts` so the FREE toggle takes effect when the binaries are bundled; the font binaries
  are an out-of-band orchestrator prerequisite. M-D2 ship-gate: if binaries aren't bundled, the toggle
  is hidden/disabled (never advertise a no-op). (`production-readiness.md` §2.9, `accessibility-i18n.md`
  §2.7/§5.)
- **Parent-tunable daypart windows (#18-prod) — DEFERRED (explicit, with rationale).** The default
  windows serve the target routines; `DaypartWindows` is already forward-compatible (a future optional
  `ParentSettings.daypartWindows?` + settings row is additive). Low-value settings expansion, deferred.
  (`production-readiness.md` §2.9.)
- **Demo-companion `DEMO_ID` cleanup (#20) — OWNED (M-D2 one-line cleanup).**
  (`production-readiness.md` §2.9.)
- **#23 auto-breakdown (ZERO-AI [N/A]) and #25 HSA/FSA (non-code)** remain dispositioned as before.

| Milestone | Feature spec(s) | Wave |
|---|---|---|
| **M0** Baseline gate | *(none — verify shipped app is green)* | — |
| **M-A1** Billing classification + gate seams + trial reminder | `billing-entitlements.md` | A |
| **M-A2** Aging-up (`preteen` tier + `avatar` companion) | `aging-up.md` | A |
| **M-A3** Accessibility pass + i18n scaffolding | `accessibility-i18n.md` | A |
| **M-A4** Production hardening I (migration harness, ErrorBoundary, empty states, dev-screen gate) | `production-readiness.md` (workstreams 3/6/7 + parts of 4/5) | A |
| **M-B1** Visual transition timers | `visual-timers.md` | B |
| **M-B2** Light verify + quick undo | `verify-undo.md` | B |
| **M-B3** Child autonomy ("be the boss") | `child-autonomy.md` | B |
| **M-B4** Mood / energy check-in | `mood-checkin.md` | B |
| **M-B5** Multi-child switcher + rotating chores | `multi-child.md` | B |
| **M-C1** Focus / calm soundscapes (audio-bed layer) | `soundscapes.md` | C |
| **M-C2** Breathing / regulation mini-game | `breathing-regulation.md` | C |
| **M-C3** Adjustable focus intervals + active breaks | `focus-intervals.md` | C |
| **M-C4** Novelty & reward-refresh pipeline | `novelty-refresh.md` | C |
| **M-C5** If-then "when X, I will Y" plans | `if-then-plans.md` | C |
| **M-D1** Clinician reporting + local backup/restore | `clinician-reporting.md` | D |
| **M-D2** Production hardening II (ship gate: backup-envelope stamp, extend fixtures, perf/virtualize, EAS + store metadata, no-egress over new code) | `production-readiness.md` (workstreams 1/2 + final pass of 4/5/6) | D |

`production-readiness.md` is split across **M-A4** (lands the test harness + safety nets early so
every later "additive, no bump" claim is guarded) and **M-D2** (the final ship-gate pass over all the
new code). Both cite the same spec; M-A4 does the front-loadable half, M-D2 does the closing half.

---

## 2. Dependency graph (hard edges → ordering)

```
SHIPPED FOUNDATION  (theme resolvers • zustand stores • storage+migration engine • core loop •
                     daypart engine • mock entitlements/paywall • notifications • companion)
        │
        ▼   [M0: verify green + build/deploy sanity]
        │
WAVE A — cross-cutting foundations (land FIRST; they unblock the rest)
  M-A1 billing ────────── owns the premium/free CLASSIFICATION + the 4 gate seams + the ifThenPlans key
  M-A2 aging-up ───────── widens AgeMode(+preteen)/CompanionStyle(+avatar) unions; exposes caps.companionStyle
  M-A3 a11y-i18n ──────── ModeKeyed canonical + catalog + AppText + a11y props + resolveStatusPresentation
  M-A4 production-I ───── migration-forward + schema-roundtrip harness + no-network gate + ErrorBoundary
        │                  + empty states + dev-screen gating   (its harness guards every later slice)
        ▼
WAVE B — independent v1 features (need only FOUNDATION + Wave A)
  M-B1 visual-timers ──── owns src/domain/timer.ts (the canonical timer helper)
  M-B2 verify-undo ────── undoEarn / reverseRedemption / photoVerify (dep: expo-image-picker)
  M-B3 child-autonomy ── consumes caps.companionStyle (do the exposure ONCE in M-A2); canPickReward/master gate
  M-B4 mood-checkin ──── wires the moodCheckin grant; premium trend via advancedInsights (needs M-A1)
  M-B5 multi-child ───── choreStore (tb/chores) + rotation; multiChild gate (shipped)
        │
        ▼
WAVE C — features that CONSUME a Wave-A gate or a Wave-B primitive
  M-C1 soundscapes ───── owns src/services/soundscape.ts audio-bed layer; calmSoundscape gate (needs M-A1)
  M-C2 breathing ─────── CONSUMES soundscapes' bed (free `waves` scene); calmSoundscape for extra beds
  M-C3 focus-intervals ─ soft-reuses visual-timers' formatMSS; in-memory focusSessionStore
  M-C4 novelty ───────── questStore (tb/quests) + spotlight; noveltyPipeline+companionThemes gates (M-A1)
  M-C5 if-then-plans ─── planStore (tb/plans); reuses notifications budget; ifThenPlans gate (M-A1)
        │
        ▼
WAVE D — capstone aggregators (depend on many upstream slices)
  M-D1 clinician ─────── report (reads ledger/runs/progress/MoodLog/breathing events/multi-child) +
  │                       LOCAL BACKUP/RESTORE (auto-covers all tb/ slices via getAllKeys)
  M-D2 production-II ─── ship gate: envelope schemaVersion stamp, extend migration fixture with EVERY
                          new slice, virtualize/memoize new lists, no-egress over new code, store metadata
```

**Hard edges (must not be reordered):**
- **M-A1 before** M-B4, M-C1, M-C4, M-C5, M-D1 — they wire gate keys (`advancedInsights`,
  `calmSoundscape`, `noveltyPipeline`, `companionThemes`, and the NEW `ifThenPlans`) that M-A1 defines.
- **M-A2 before** M-B3 — the `caps.companionStyle` exposure + `CompanionStyle += "avatar"` widening is
  owned by aging-up and consumed by child-autonomy; do the resolver change ONCE (arch §6-C1).
- **M-A2 before** the other `Record<AgeMode>` additions (M-B4 `resolveMoodCheckin`, M-C3
  `AGE_CAP_BASE.focusIntervalsAvailable`) — the `+ "preteen"` widening makes the compiler force each
  new age map to fill a `preteen` branch (arch §6-C8). Landing aging-up early turns the compiler into
  the checklist.
- **M-A3 before every copy-adding milestone (canonical order) — COPY-KEY LOCATION RULE.** M-A3
  **removes the `resolveContent.COPY` literal** and moves all strings to `src/i18n/en.ts` (delegating
  `resolveContent`→`getMessage`). Since the locked order runs M-A3 before all of B/C/D, **that `COPY`
  object no longer exists at their build time**: every post-A3 milestone MUST author its `ModeKeyed`
  copy keys in **`src/i18n/en.ts`**, not `resolveContent.COPY`. The sibling specs still literally say
  "add to `resolveContent.COPY`" — read that as "add to the canonical catalog (`en.ts`)" once M-A3 has
  landed (`03-BUILD-GUIDE.md` §4, arch §6-C2). `ModeKeyed<T> = { young; older; preteen? }` is the
  single canonical type (`src/i18n/types.ts`); `young`+`older` compile-required, `preteen` optional
  (falls back to `older`). M-A3 also wires `resolveStatusPresentation` (triple-coding) + the `fonts.ts`
  OpenDyslexic plumbing.
- **M-A4 before / alongside** every new-slice milestone — the migration-forward fixture +
  schema-roundtrip audit are the shared regression harness each later slice extends. M-A4 also
  **front-loads the render-test harness** (Reanimated jest mock + `react-test-renderer` helper,
  production-readiness §2.8) that M-B1/M-C2's mandated `.test.tsx` render-tests need, and the
  **OS-backup-exclusion flags** (§2.7). **M-A4 must land AFTER M-A1/M-A2/M-A3 within Wave A** (not
  fully parallel): its golden fixture + round-trip audit must enumerate M-A1's
  `Entitlement.trialEndReminderAt`, M-A2's `AgeMode`/`CompanionStyle` union widenings, and M-A3's
  `ParentSettings.locale` — so A4 is the *last* Wave-A milestone.
- **M-C1 before M-C2** — soundscapes owns `src/services/soundscape.ts`; breathing's "one free bed" is
  soundscapes' free `waves` scene (arch §6-C3). Do not add a parallel audio toggle.
- **M-B1 before M-C3** (soft) — focus-intervals soft-reuses `src/domain/timer.ts` `formatMSS`; if M-B1
  hasn't landed, focus re-authors the tiny helper (no block).
- **M-D1 last of the feature work** — backup export enumerates the whole `tb/` keyspace via
  `storage.getAllKeys()`, so it auto-covers `tb/plans`/`tb/chores`/`tb/quests`; building it after the
  new stores exist means its round-trip test covers them. (Soft: `getAllKeys` covers late-added slices
  regardless.)
- **No cycles.** Soft edges (clinician reads mood/breathing/chore/quest data) degrade gracefully — a
  card simply doesn't render if the upstream feature ships later.

---

## 3. Ordered build sequence (the canonical order an orchestrator runs)

```
M0  →  M-A1  →  M-A2  →  M-A3  →  M-A4
    →  M-B1  →  M-B2  →  M-B3  →  M-B4  →  M-B5
    →  M-C1  →  M-C2  →  M-C3  →  M-C4  →  M-C5
    →  M-D1  →  M-D2
```

Within a wave, milestones are independent and MAY run in parallel worktrees IF the orchestrator merges
serially and re-runs the verify floor after each merge (the hot shared files in `02-architecture.md`
§5 — `TaskRunner.tsx`, `DaypartDonePanel.tsx`, `calm.tsx`, `resolveCapabilities.ts`,
`resolveContent.ts`, `_layout.tsx`, `gameplay.ts`, `settings.tsx`, `children.tsx`, `dashboard.tsx` —
must be MERGED, never forked). The serial order above is the safe default for a mid-tier orchestrator:
each milestone starts from a green tree and ends on a green tree. **Wave-A caveat:** M-A4 is NOT fully
parallelizable with A1/A2/A3 — its migration fixture + round-trip audit must reflect their additions
(`Entitlement.trialEndReminderAt`, the `AgeMode`/`CompanionStyle` widenings, `ParentSettings.locale`),
so **A4 runs last within Wave A**. Likewise the render-test harness (M-A4 §2.8) must exist before
M-B1/M-C2 author their `.test.tsx` render-tests.

**Green-at-every-boundary contract:** a milestone is DONE only when, from a clean tree,
`npx tsc --noEmit` = 0, `npm test` = all suites green (test count only ever grows), and
`npx expo export --platform web` succeeds — plus the milestone's own grep gates and acceptance
criteria pass. See `03-BUILD-GUIDE.md` §2 (verify floor) and §3 (grep gates).

---

## 4. Milestones in detail

Each milestone lists: **feature spec** to read, **depends on**, **effort** (S ≈ ≤1 day, M ≈ 1–2 days,
L ≈ 3–4 days, XL ≈ 5+ days for a mid-tier build-agent), **acceptance** (the boundary gate — drawn from
each spec's §7/§8), and any **new persisted surface** (which the M-A4 harness must be extended for).

---

### M0 — Baseline gate (no feature build)
- **Read:** `01-current-state.md`, `02-architecture.md`, `03-BUILD-GUIDE.md`.
- **Depends on:** — (the shipped tree).
- **Effort:** S.
- **Do:** run the verify floor on the untouched tree and the redeploy sanity (build web + confirm
  `deploy-web/dist` copy step works). Confirm `npx tsc --noEmit` = 0, `npm test` = 34 suites / 335
  tests, `npx expo export --platform web` succeeds. Confirm `PROVENANCE.md` reviewer table exists.
- **Acceptance:** the three verify-floor commands are green on the shipped tree; the orchestrator can
  produce `dist/` and knows the redeploy path (`03-BUILD-GUIDE.md` §7). No code changed.
- **New persisted surface:** none.

---

### M-A1 — Billing classification + gate seams + honest trial-end reminder
- **Read:** `billing-entitlements.md` (it is the SINGLE SOURCE OF TRUTH for premium/free classification).
- **Depends on:** M0.
- **Effort:** M.
- **Do:** (A) lock the classification contract — keep `FEATURE_GATES` as the machine-readable form of
  §8, no `'unlimited'`, reward ceiling ≤6; (B) implement the honest trial-end reminder (one-shot at
  `trialEndsAt − 24h`, quiet-hours-shifted, `BILLING_REMINDER_DATA_KIND`, `assertBillingCopyClean`,
  canceled on `mockCancel`); (C) wire the four unconsumed gate seams (`companionThemes`,
  `noveltyPipeline`, `calmSoundscape`, `advancedInsights`) so their content owners in later milestones
  just import `isFeatureUnlocked`/`canAddMore`; (D) add the "Tiny Bubbles Plus" Settings row; (E) add
  the NEW `ifThenPlans { kind:"count", free:2, premium:8 }` gate key (consumed by M-C5); (F) optional
  `repairEntitlement` hardening. **Purchase stays mocked — no processor import.**
- **Acceptance:** starting a mock trial schedules exactly ONE reminder at `trialEndsAt−1d`
  (quiet-hours-shifted); its **visible** title/body are the GENERIC non-billing copy (billing §2.4
  shared-device decision — a child on the shared device sees only "a grown-up note is ready in
  Settings," never a Plus/trial/charge string), asserted by `assertBillingCopyClean()`
  (`isReminderCopyClean` AND no `trial|plus|charge|subscribe|price`); the honest billing detail lives
  only in the PIN-gated Settings "Tiny Bubbles Plus" row; a <1-day trial schedules none; `mockCancel`
  cancels it without touching routine reminders; PIN-on-purchase still enforced; a downgrade with
  premium cosmetics equipped strips/hides NOTHING (existing `entitlements.test.ts` stays green);
  **`FEATURE_GATES.ifThenPlans {kind:"count",free:2,premium:8}` exists + `canAddMore` union +
  `PremiumGate.COUNT_FEATURES` include it** (M-C5 hard-depends on it); grep for
  `revenuecat|StoreKit|purchaseProduct|purchasePackage` matches only seam comments; paywall/reminder
  copy has no urgency/countdown/anchor/medical strings; `unlimited` absent from `entitlements.ts`.
  Verify floor green.
- **New persisted surface:** optional `Entitlement.trialEndReminderAt?` (additive, no bump). **Its
  optional field must be added to the M-A4 migration-forward fixture.**

---

### M-A2 — Aging-up: `preteen` tier + `avatar` companion (do the union widening EARLY)
- **Read:** `aging-up.md`.
- **Depends on:** M0.
- **Effort:** M.
- **Do:** widen `AgeMode += "preteen"`, `CompanionStyle += "avatar"`, `BuddyArtVariant += "nova"`; fill
  every forced `Record<AgeMode>`/`Record<CompanionStyle>` map; **expose the resolved
  `caps.companionStyle` on `ModeCapabilities` ONCE** (replaces the `companionFraming` round-trip that
  cannot reach `avatar` — arch §6-C1); add `defaultCompanionStyle`/`defaultTextFirst`; add `preteen`
  Tide palette/type/responsive; add identity copy overrides + `ModeKeyed`'s optional `preteen?`
  (falls back to `older`); add the Nova seed; 3-way age & companion Segmenteds in
  `children.tsx`/`child-setup.tsx`/`ChildModePreview`. The MODE is always FREE (never `<PremiumGate>`).
- **Acceptance:** `resolveTokens("preteen")` → Tide + `textFirst:true`; `resolveCapabilities("preteen")`
  → `multiStepVisible/showNumbersAndCharts:true`, `maxChoices:6`, `companionStyle:"avatar"`,
  `companionFraming:"identity"`, `delegateToChild:true`; `resolveContent("buddy.artVariant",
  {companionStyle:"avatar"}) === "nova"`; preteen copy falls back to `older` where no override;
  toggling a child young→older→preteen→young leaves ledger/progress/streak/cosmetics/growth
  UNCHANGED; `grep "companionFraming === \"care\""` → zero (round-trips removed); no `<BubbleBuddy
  ageMode=>` prop. Verify floor green.
- **New persisted surface:** none (union widenings only — existing values stay valid).

---

### M-A3 — Accessibility pass + i18n scaffolding (ships English)
- **Read:** `accessibility-i18n.md`.
- **Depends on:** M0 (coordinate with M-A2 for the `ModeKeyed` `preteen?` addition — one definition).
- **Effort:** L.
- **Do:** create `src/i18n/*` (canonical `ModeKeyed<T>`, `en` catalog migrated from `resolveContent.COPY`
  + new `a11y.*`/`reminder.*` keys, `getMessage`/`formatCount`, `useLocale`/`useCopy`); delegate
  `resolveContent` to `getMessage` (signatures unchanged); create `src/a11y/{announce,props}.ts`;
  `components/ui/{AppText,AppTextInput}.tsx` (1.3× Dynamic-Type cap); `useReduceTransparency`,
  `useOSFontScale`, `contrast.ts`, `resolveStatusPresentation` (triple-coding — every status is
  icon+shape+label, blue↔gold never red↔green); **fix the effective-reduced-motion bug** (wire
  persisted `settings.reducedMotion` + `parentSettings.reducedMotionDefault` into `useThemeTokens`);
  wire core-loop screen-reader announcements (step-done, token counter live region, celebration announce,
  buddy state label); add the Language Settings row. 100% FREE, no gate key.
- **Acceptance:** `contrast.test.ts` passes AA for all palettes; `resolveStatusPresentation` gives
  icon+shape+label for done/todo/skipped + per-daypart; toggling "Reduced motion" (OS off) zeroes
  motion/confetti end-to-end; `getMessage` resolves age variants + `{param}` + English plural, missing
  locale → `en`, missing key → key echo; `content-typetest` still forces both age variants;
  catalog-sourced reminder copy still passes `isReminderCopyClean`; `grep "announceForAccessibility"`
  now non-zero; test count ≥ 345. Verify floor green.
- **New persisted surface:** optional `ParentSettings.locale?` (additive, no bump). Also owns the
  `src/theme/fonts.ts` OpenDyslexic plumbing (§2.9 disposition) — toggle hidden/disabled until binaries.

---

### M-A4 — Production hardening I (safety nets that guard every later slice)
- **Read:** `production-readiness.md` (workstreams 3, 6, 7, 8-flags, **9 render-harness** + the front-loadable parts of 4 & 5).
- **Depends on:** M0 — but **must land LAST within Wave A** (after M-A1/M-A2/M-A3) so the fixture
  reflects their additions (`Entitlement.trialEndReminderAt`, `AgeMode`/`CompanionStyle` widenings,
  `ParentSettings.locale`).
- **Effort:** M.
- **Do:** create the migration-forward golden fixture + schema-roundtrip audit
  (`__tests__/storage/migration-forward.test.ts`, `schema-roundtrip.test.ts`) — the fixture MUST
  already enumerate M-A1's `trialEndReminderAt` + M-A3's `locale` (not only the A2 widenings); the
  no-network CI gate (`__tests__/config/no-network.test.ts`, **replicating the BUILD-GUIDE §3 exclusion
  set** — comments/`docs.expo.dev`/`schema`/`xmlns`); the dev-screen gating (`src/config/flags.ts`
  `DEV_SCREENS_ENABLED`, per-screen `<Redirect>` guard, conditional `<Stack.Screen>` registration,
  `dev-screens-gated.test.ts`); the global `RootErrorBoundary` + `components/ui/ErrorScreen.tsx` (calm,
  no telemetry) + router `ErrorBoundary`; the hydration ~4s max-wait fallback; per-screen empty states;
  bound the `DataReview` dump. **Also front-load: (a) the render-test harness** (§2.8 — wire the
  Reanimated jest mock in `jest.setup.js` + a `react-test-renderer` helper, NO new dep) so M-B1/M-C2's
  mandated `.test.tsx` render-tests are authorable; **(b) the OS-backup-exclusion flag**
  `android.allowBackup:false` + the `backup-exclusion.test.ts` scaffold (§2.7, completed at M-D2).
- **Acceptance:** migration-forward fixture round-trips through `migrateAndRepair(fixture, 1)` — no
  throw, defaults filled, no value lost, anti-shame invariants intact, and it **includes A1/A2/A3's new
  fields**; schema-roundtrip passes for every store; no-network gate returns zero (and doesn't
  false-positive on a doc URL / SVG `xmlns`); dev screens redirect when `DEV_SCREENS_ENABLED` false; a
  thrown render error shows `ErrorScreen`; empty states calm; **a trivial component render-test runs
  under the wired Reanimated mock without a thrown worklet**. Verify floor green.
- **New persisted surface:** optional `AppMeta.lastRecoveredAt?` (additive, no bump).

---

### M-B1 — Visual transition timers
- **Read:** `visual-timers.md`.
- **Depends on:** M-A2 (age copy), M-A3 (recommended — copy/status), M-A4 (harness for the optional
  `stepTimerStartedAt` field).
- **Effort:** M.
- **Do:** create the canonical `src/domain/timer.ts` (`timerRemainingMs`/`timerFraction`/`formatMSS` —
  M-C3 soft-reuses it); `components/task/VisualTimer.tsx` (wedge young / bar older, wall-clock anchored,
  smooth `withTiming` vs 1 Hz stepping under Reduce-Motion, never red/danger, never flash); wire into
  `TaskRunner` active step for both shells; add the curated duration control (Off/30s/1m/2m/5m/10m) to
  the parent assign sheet; optional decoupled `timer.done` chime (default OFF). `timerSeconds` already
  in the model.
- **Acceptance:** a timed step shows a depleting timer on the active step in both shells; discrete 1 Hz
  under Reduce-Motion; wall-clock correct across background/foreground/resume; empty = calm rested (no
  auto-advance, no token/celebration change, no red/flash, no sound unless the toggle is ON → exactly
  one ducking chime); numeric readout only when `showNumbersAndCharts`; `grep "time's up|out of
  time|too slow"` → zero; no raw `ageMode` in `VisualTimer`/`TaskRunner`. Verify floor green.
- **New persisted surface:** optional `ActiveRunProgress.stepTimerStartedAt?` +
  `ParentSettings.timerSoundEnabled?` (additive, no bump). **Extend the M-A4 fixture.**

---

### M-B2 — Light verify + quick undo
- **Read:** `verify-undo.md`.
- **Depends on:** M-A2/M-A3 (copy), M-A4 (harness).
- **Effort:** M.
- **Do:** add `RedemptionStatus += "reversed"`; `UNDO_WINDOW_MS`; pure `undoEarn`/`latestEarnFor`
  (`gamification.ts`), `reverseRedemption` (`tokens.ts`), `needsParentVerify`/
  `stepsAwaitingParentVerify` (`tasks.ts`); `runProgressStore.unmarkStepResolved`; gameplay
  orchestrators (`undoStep`/`verifyStep`/`reverseRedemption`); `UndoBar`, `VerifyPrompt`, `VerifyQueue`,
  `photoVerify.ts` (feature-detected `expo-image-picker`; photos stored in an **excluded-from-backup**
  dir, `deletePhoto` on re-verify/wipe/restore); wire the runner (UndoBar after non-last Done,
  VerifyPrompt by mode, `undoTaskId` to celebrate), rewards (auto-approve undo window), dashboard
  (VerifyQueue — **hidden when nothing awaits verify**; a missing `photoUri` renders nothing, no
  broken-image icon), assign sheet ("Ask to verify?" segmented). **Register the `expo-image-picker`
  config plugin in `app.json`** with honest `cameraPermission`/`photosPermission` strings (reconciles
  with production-readiness §2.1 — this feature-complete set DOES add camera). FREE.
- **Acceptance:** verify NEVER gates (Done pays + advances immediately regardless of
  `verification.mode`); self-verify is token-neutral; photo degrades safely when unavailable; step undo
  restores balance + task status + run pointer but leaves `lifetimeEarned`/`cumulativeCount`/streak/
  buddy growth UNCHANGED; last-step undo clears the daypart mark + re-arms; redemption reverse refunds +
  flips to `reversed` + guardrail recovers; no Warning/Error haptic; no network reads `photoUri`;
  **`wipeAllChildData`/`removeChild` `deletePhoto`s every child photo (no orphaned files)**; VerifyQueue
  hidden when empty; no raw `ageMode`. Verify floor green.
- **New persisted surface:** `RedemptionStatus` widening (additive). New dep: `expo-image-picker`
  (feature-detected) + its **`app.json` config plugin + permission strings** (for the M-D2 store build).

---

### M-B3 — Child autonomy ("be the boss")
- **Read:** `child-autonomy.md`.
- **Depends on:** **M-A2** (consumes `caps.companionStyle`; do the exposure once there).
- **Effort:** S–M.
- **Do:** wire the dormant grants — `canCustomizeCompanion` (master gate: false forces
  canPickColor/Accessory/Theme off, Name stays ungated) and `canPickReward` (false →
  "Ask a grown-up 💛", menu still visible, save-toward still works) into `resolveCapabilities` +
  `ThemeProvider.grants` + `ThemedRoot`; add young "What next?" chooser
  (`NextStepChooser` + `runProgressStore.chooseNextStep`, per-run only); surface all four autonomy
  toggles in `children.tsx` (relabel reorder → "choose step order"); optional reward favorites. FREE.
- **Acceptance:** `resolveCapabilities({canCustomizeCompanion:false})` → all three canPick* false;
  flipping the master grant hides Color/Finish/Accessory but keeps Name and strips no owned cosmetic;
  `canPickReward:false` → "Ask a grown-up", no lock/greyed state; young "What next?" moves the chosen
  step to front of the uncompleted run portion (persisted), no-op for unknown/resolved ids, routine
  untouched; older ▲/▼ still permanently reorders; reward slice still capped at `maxChoices`; no
  `Math.random`, no raw `ageMode`. Verify floor green.
- **New persisted surface:** optional `ChildSettings.rewardFavorites?` (additive, no bump).

---

### M-B4 — Mood / energy check-in
- **Read:** `mood-checkin.md`.
- **Depends on:** M-A1 (advancedInsights gate for the premium trend), M-A2 (`preteen` in
  `resolveMoodCheckin`), M-A3 (copy/status), M-A4 (harness).
- **Effort:** M.
- **Do:** wire the `moodCheckin` grant as `moodLoggingEnabled && (child.moodCheckinEnabled ?? true)`
  (**per-child consent** — enabling the global switch no longer silently opts in siblings) in
  `ThemedRoot`; create `resolveMoodCheckin.ts`, `src/data/moodScale.ts`, `MoodGrid`/`EnergyGrid`,
  `app/(kid)/mood.tsx` (pushed modal), `src/domain/moodInsight.ts` (counts/timelines only — NO
  interpretation), `MoodTrend`, `app/(parent)/insights.tsx`; entry points on calm + done-panel (only
  when `caps.moodCheckin`); dashboard "Recent check-ins" glance (FREE, with a calm `mood.glanceEmpty`
  zero-state) + premium trend (`advancedInsights`); `insights.tsx` zero-log empty state
  (`mood.insightsEmpty`). **Add the mechanical banned-interpretation gate** (grep/test over
  `insights.tsx`+`components/mood/*`+`moodInsight.ts` output for `anxious|seems|risk|trend down|…`).
  FREE core; PREMIUM trend only.
- **Acceptance:** with `moodLoggingEnabled` off (default) no entry point + no insight renders +
  `caps.moodCheckin === false`; turning it on surfaces the kid affordances + parent glance; per-child
  `moodCheckinEnabled:false` disables it for one child without affecting siblings; tapping a face logs a
  `MoodLog{mood,day,ts,daypart,energyScaleMax,source:"kid"}` + warm thanks + calm offer for rough/okay;
  young 3 energy cells + auto-speak vs older 5 + no auto-speak (resolver only, no raw `ageMode`);
  lowStim = instant select; skipping logs nothing / never touches tokens/streak/mood; premium trend
  behind `<PremiumGate>`; **no interpretive text anywhere (banned-interpretation gate returns zero)**;
  zero-log surfaces show the calm empty lines, never blank. Verify floor green.
- **New persisted surface:** optional `MoodLog.{daypart,energyScaleMax,source}?` +
  `ChildSettings.moodCheckinEnabled?` (additive, no bump). **Extend the M-A4 fixture.**

---

### M-B5 — Multi-child switcher + rotating chores
- **Read:** `multi-child.md`.
- **Depends on:** M-A2/M-A3 (copy), M-A4 (harness — this adds a NEW slice `tb/chores`).
- **Effort:** L.
- **Do:** pure `src/domain/chores.ts` (deterministic rotation + `choreTaskFor` materialisation +
  `rotationPreview`); persisted `choreStore` (`tb/chores`, parent-global) + `CHORE_TEMPLATES`;
  `app/(parent)/chores.tsx`, `switch-child.tsx`, `ChildSwitcher`, `RotationPreview`,
  `ChildHandoffButton` (opt-in `quickChildSwitch`); gameplay `switchActiveChild`/`removeChild`(prunes
  rosters)/chore CRUD + materialise-in-`reconcileChild` + `perCompletion` advance in `completeStep` +
  `wipeAllChildData` clears `tb/chores`; dashboard "Switch" + "today's turn" row. FREE once ≥2 children
  (gated only transitively by the `multiChild` count gate).
- **Acceptance:** per-child isolation (completing/spending as A leaves B byte-identical); fast switch
  re-themes + clears active run + reconciles; rotation is deterministic (daily/weekly/perCompletion/
  manual, mod-safe, DST-safe); exactly ONE chore task materialises for the holder (idempotent), none
  for non-holders, stale ones archived; a materialised chore earns tokens/celebration/nurture via the
  unchanged `completeStep`; removing a child prunes rosters + deactivates <2-member chores;
  `wipeAllChildData` empties `tb/chores`; no leaderboard/comparison/AI/failure copy. Verify floor green.
- **New persisted surface:** NEW slice `tb/chores`; optional `Task.{choreId,choreHolderDay}?` +
  `ParentSettings.quickChildSwitch` (additive, no bump). **Extend the M-A4 fixture + roundtrip audit +
  backup `DataReview`.**

---

### M-C1 — Focus / calm soundscapes (owns the audio-bed layer)
- **Read:** `soundscapes.md`.
- **Depends on:** M-A1 (`calmSoundscape` gate seam), M-A3 (VolumeSlider a11y + copy), M-A4 (harness).
- **Effort:** L.
- **Do:** create `src/services/soundscape.ts` (scene-switchable, volume-controllable looping-bed player,
  SEPARATE from the one-shot cue registry, reuses the shipped `duckOthers` session — mix-not-hijack, no
  background); `src/domain/soundscapes.ts` (resolver + `isSceneAvailable` ownership-honoured);
  **`components/ui/VolumeSlider.tsx` (M-C1 is its single owner — a11y consumes it, arch §1.5)**;
  `components/kid/SoundscapePicker.tsx`; `src/data/soundscapes.ts` catalog. **BUILD DEFAULT (green with
  zero new assets):** register ONLY scenes whose `.wav` exists — ship the free `waves` scene reusing
  `calm-ambient.wav`; the ~6 premium CC0 loops are an **out-of-band orchestrator prerequisite** (a
  code-agent can't author audio) — do NOT write a `require()` for a missing file (it fails `expo
  export`); add each premium entry when its file lands (soundscapes §4 BUILD DEFAULT). Upgrade `calm.tsx`
  toggle into the picker; older-only in-runner focus toggle + focus-bed lifecycle; parent Soundscapes
  card; `validateAndRepair` clamps. FREE: ≥1 calm scene + on/off + volume; PREMIUM: expanded pack +
  focus-during-tasks (acquisition-only).
- **Acceptance:** calm corner offers curated scenes (sliced by `maxChoices`) + working persisted 0..1
  volume + on/off; focus bed plays during a routine and stops on done/leave/background; mix-not-hijack
  (podcast ducks, never stops; session unchanged — `setAudioModeAsync` only in `sound.ts`); premium
  gating acquisition-only (a selected premium scene keeps playing after trial expiry); opt-in default
  OFF; every bundled loop listed in `THIRD_PARTY_NOTICES.md`; no `ai|recommend|for you` in the service;
  no raw `ageMode`. Verify floor green.
- **New persisted surface:** optional `ChildSettings.soundscape?` (additive, no bump). **Extend the
  M-A4 fixture.**

---

### M-C2 — Breathing / regulation mini-game (consumes the soundscape bed)
- **Read:** `breathing-regulation.md`.
- **Depends on:** **M-C1** (uses the free `waves` bed via `soundscape.ts`, not a parallel toggle —
  arch §6-C3), M-A2/M-A3 (copy), M-A4 (harness).
- **Effort:** M–L.
- **Do:** pure `src/domain/breathing.ts` (3 curated patterns + deterministic `breathPhaseAt`/`growStage`);
  `BreathingBubble` + `CalmGarden`; add `breathingChoice` HARD-CEILING capability (young false / older
  true); upgrade `calm.tsx` in place (pattern chooser when `breathingChoice`, grow visual resetting on
  leave, older-only cycle readout); non-blocking "Take a breath" + regulation-step "Breathe with me" in
  the runner; young "Calm 🌊" entry on the done panel; opt-in pacing haptic + optional session event
  (gated by `localAnalyticsEnabled`). NO measurement/biofeedback/efficacy claims. FREE (only extra beds
  are `calmSoundscape` premium).
- **Acceptance:** breathing bubble follows the active pattern (young one default + no chooser, older
  3-pattern chooser); phase labels resolve both variants + stay in sync via `breathPhaseAt`; grow
  advances one stage per cycle then rests, resets on leave (nothing losable); completing a set fires NO
  token/confetti/celebration (only a positive `rest` mood); the runner offers are non-blocking;
  Reduce-Motion = static pose + 1 Hz stepped label; soundscape ducks not stops; `grep "reduces anxiety|
  biofeedback|sensor|measure|heart rate"` → zero; `grep "recordCompletion|CelebrationOverlay"` in
  calm.tsx → zero; no raw `ageMode`. Verify floor green.
- **New persisted surface:** optional `ChildSettings.{breathingPatternId,breathingPacingHaptics}?`
  (additive, no bump). **Extend the M-A4 fixture.**

---

### M-C3 — Adjustable focus intervals + active breaks
- **Read:** `focus-intervals.md`.
- **Depends on:** M-B1 (soft-reuse `timer.ts`), M-A2/M-A3 (copy + `preteen` in `AGE_CAP_BASE`), M-A4.
- **Effort:** M.
- **Do:** pure `src/domain/focus.ts` (curated option arrays + wall-clock helpers +
  `nextMovementPrompt` deterministic rotation); `src/data/focusBreaks.ts` (fixed movement prompts);
  in-memory `focusSessionStore` (NOT persisted — a killed session drops); `app/(kid)/focus.tsx` +
  `FocusSession`/`FocusRing`/`MovementBreakCard`; add `focusIntervalsAvailable` HARD-CEILING capability
  (young false / older true); DaypartDonePanel launcher (only when available && enabled); parent Focus
  card in `children.tsx`. Token-neutral. FREE.
- **Acceptance:** entry point only for older + parent toggle on, absent otherwise (capability, no raw
  `ageMode`); setup picks curated focus (10/15/20/25) + break (3/5/10); ring depletes smoothly /
  discrete 1 Hz under Reduce-Motion; wall-clock correct across background; block empty = no
  auto-complete/token change/red/alarm, at most one ducking `transition.swoosh` when `chime`; movement
  prompt from deterministic rotation (no `Math.random`); pause/resume keeps remaining; `done` shows no
  score/streak/target; `grep "time's up|failed|gave up|lost focus|adhd|proven"` → zero. Verify floor green.
- **New persisted surface:** optional `ChildSettings.focusIntervals?` (additive, no bump); `FocusSession`
  is in-memory (no persisted surface). **Extend the M-A4 fixture for the config field.**

---

### M-C4 — Novelty & reward-refresh pipeline
- **Read:** `novelty-refresh.md`.
- **Depends on:** M-A1 (`noveltyPipeline` + `companionThemes` gates), M-A2/M-A3 (copy), M-A4 (harness —
  NEW slice `tb/quests`).
- **Effort:** L.
- **Do:** pure `src/domain/quests.ts` + `src/domain/novelty.ts` (deterministic ISO-week rotation +
  day-of-year spotlight — NO `Math.random`); `TokenReason += "quest_reward"`; `isoWeekKey`/`dayOfYear`
  in `dates.ts`; `src/data/questPool.ts` + `src/data/seasonalPacks.ts` (register via existing
  `registerSeasonalPack`, `availableFrom` only — no expiry); persisted `questStore` (`tb/quests`);
  `QuestBoard`/`QuestCard`/`NoveltyBadge`; gameplay quest signals + spotlight magnitude + `rotateQuests`
  in `reconcileChild` + `wipeAllChildData` clears `tb/quests`; optional `ChildSettings.questsEnabled?`
  (default `!calmMode`); rewards-surface board + calm-mode suppression. FREE base rotation + spotlight;
  PREMIUM seasonal packs + premium quest pool (acquisition-only).
- **Acceptance:** `activeQuestsFor` deterministic per `weekKey` across "devices"; `featuredDaypartFor`
  stable per local day; `grep "Math.random"` in quests/novelty/questStore → zero; weekly tz-aware
  rotation preserves `everCompleted`; reaching target auto-grants exactly `rewardTokens` once + steps
  celebration up; spotlight grants exactly `FEATURED_DAYPART_BONUS`; seasonal packs only ADD (no
  `availableUntil`); no countdown/expiry/urgency copy; calm mode / `questsEnabled:false` hides the whole
  layer; trial-expiry with a seasonal cosmetic owned = zero visible change + `everCompleted` unchanged;
  young 1 auto-spoken card / older ≤3 with numerals; no raw `ageMode` in `components/quests/**`.
  Verify floor green.
- **New persisted surface:** NEW slice `tb/quests`; `TokenReason` widening; optional
  `ChildSettings.questsEnabled?` (additive, no bump). **Extend the M-A4 fixture + roundtrip audit +
  backup `DataReview`.**

---

### M-C5 — If-then "when X, I will Y" plans
- **Read:** `if-then-plans.md`.
- **Depends on:** M-A1 (the NEW `ifThenPlans` gate key defined there), M-A2/M-A3 (copy), M-A4 (harness —
  NEW slice `tb/plans`).
- **Effort:** M–L.
- **Do:** additive types (`PlanCue`/`PlanAction`/`Plan`/templates); pure `src/domain/plans.ts`
  (`assemblePlanPhrase`, `planToReminderAnchor`, selectors, `assertPlanCopyClean`);
  `src/data/planTemplates.ts` (curated cue/action/situation — no free-text); persisted `planStore`
  (`tb/plans`); `PlanCard`/`PlanCuePanel`/`PlanAuthor`; `app/(parent)/plans.tsx` +
  `app/(kid)/plans.tsx`; wire time-cues into `rescheduleReminders` (inherits quiet-hours + budget +
  banned-phrase gate), after-step cues in the runner (non-blocking), after-routine cues on the done
  panel; `wipeAllChildData` clears `tb/plans` + `DataReview` counts plans. FREE firing + first 2 plans;
  PREMIUM 3→8 via `ifThenPlans`.
- **Acceptance:** author a plan in ≤4 taps (persisted, survives kill); a time plan fires a notification
  suppressed in quiet hours + counted in `maxPerDay` + copy-clean; an afterStep plan surfaces
  `PlanCuePanel` at step completion with no confetti/token/block; afterRoutine on the done panel;
  situational self-checked only (never auto-fired) with a positive-only "I did it!" nod (no
  tokens/streak/negative); `ifThenPlans` gate blocks the 3rd free plan with a calm upsell, premium
  raises to 8, downgrade removes nothing; plans in `DataReview` + cleared by delete-all; `grep
  Math.random` in plans → zero; no raw `ageMode`. Verify floor green.
- **New persisted surface:** NEW slice `tb/plans`; NEW `FEATURE_GATES.ifThenPlans` key (M-A1); optional
  `Plan.proposed?`/`authoredBy?` (on a new type). **Extend the M-A4 fixture + roundtrip audit + backup
  `DataReview`.**

---

### M-D1 — Clinician reporting + local backup/restore (the offline cloud-portal replacement)
- **Read:** `clinician-reporting.md` (BUILD-AGENT NOTE: the SDK-56 file/print/share/picker API is
  **PINNED to `expo-file-system/legacy`** + the literal print/share/picker calls — **no web-docs fetch
  required**; buildable offline).
- **Depends on:** ALL new slices ideally exist (M-B5 `tb/chores`, M-C4 `tb/quests`, M-C5 `tb/plans`) so
  the backup round-trip test covers them; M-A1 (`advancedInsights` gate); M-B4 (mood card, soft);
  M-C2 (breathing events, soft); M-A4 (schemaVersion stamp discipline); **M-B2 (`deletePhoto` for
  restore-replace photo cleanup)**.
- **Effort:** L–XL.
- **Do:** pure `src/domain/report.ts` (`buildReport`/`makeRange`, deterministic, streak-safe framing;
  **mood energy averaged against `energyScaleMax` 3/5, never the stale 0–10**; **omits the free-text
  buddy name** — child-autonomy PII caveat); pure `src/services/reportHtml.ts` (self-contained HTML,
  SVG `xmlns` is a string literal not egress, no `<script>`/external URL, anti-shame copy +
  non-diagnostic disclaimer); `src/services/report.ts` (`expo-print`/`expo-sharing`, Platform-guarded
  lazy imports, web-degrades); `src/services/backup.ts` (`collectTbSlices` via `getAllKeys` → whole
  `tb/` keyspace → envelope with `schemaVersion` stamp → share; import → validate → `repairBackupSlices`
  → mandatory confirm-replace → per-store `setState` → **reconcile: clear in-memory `sessionStore`/
  `focusSessionStore`, `deletePhoto` outgoing photos, re-derive the trial reminder**); `report.tsx` +
  dashboard "Progress report" row + Settings "Back up / Restore" rows. **Export, restore, and delete-all
  demand the parent PIN (`mode:'sensitive'`, NOT the math/long-press entry challenge).** `backup.test.ts`
  **`jest.mock()`s the four native modules** (incl. `expo-file-system/legacy`) + does a web-export smoke
  right after install. FREE: 7d+30d single-child report + PDF/print/share + ALL backup/restore; PREMIUM:
  90-day/custom + per-routine + multi-child combined via `advancedInsights`.
- **Acceptance:** `buildReport` returns exact counts for a seeded child; a multi-day gap renders
  "resting" + "best ever" + cumulative (never "0"/"broken"); mood energy displays against `energyScaleMax`
  (not 0–10); `showNumbersAndCharts` gates the chart extras (no raw `ageMode`; header uses
  `ageModeLabel`); calm-path leads with cumulative; PDF + share work offline (airplane mode);
  export→wipe→import round-trips to byte-equality after repair-normalisation **and clears in-memory
  session/focus stores + re-derives the trial reminder**; a foreign/empty/canceled file touches nothing;
  a hand-edited negative balance imports repaired UP; **export/restore/delete-all require the PIN**;
  90-day shows a ✨Plus affordance; `reportHtml` has no `missed|failed|broken|0-day` + no external
  URL/`<script>` + no AI/network import (SVG `xmlns` excepted). Verify floor green.
- **New persisted surface:** optional `ParentSettings.lastBackupAt?` (additive, no bump). New deps:
  `expo-print`, `expo-sharing`, `expo-file-system` (use `/legacy`), `expo-document-picker` (all MIT,
  Expo-Go-bundled). New gate mode `'sensitive'` on the parent gate (PIN posture).

---

### M-D2 — Production hardening II (ship gate)
- **Read:** `production-readiness.md` (workstreams 1, 2, 8-store-gate + the closing pass of 4/5/6).
- **Depends on:** all feature milestones.
- **Effort:** M.
- **Do:** confirm the backup envelope stamps `schemaVersion`; **extend the migration-forward fixture +
  schema-roundtrip audit with EVERY new slice/field** that landed (chores/quests/plans + every optional
  field incl. `moodCheckinEnabled`); virtualize/memoize the new lists; re-run the no-egress gate over
  ALL new code; complete EAS profiles (`env`/`channel`/`submit` placeholders, dev-screen env only on
  dev/preview). **OS-backup store gate (BLOCKER — the "nothing leaves the device" fix, §2.7):** set
  `android.allowBackup:false`, exclude the photo dir from iOS backup, ship `backup-exclusion.test.ts`
  green — **only then** may the Data-Safety answer be "No data collected/shared." **Camera (§2.1,
  reconciled):** confirm the `expo-image-picker` config plugin + honest camera/photo usage strings are
  in `app.json`; record the Kids-Category child-camera decision. **OpenDyslexic ship-gate (§2.9):** if
  the font binaries are bundled + `fonts.ts` wired, ship the working toggle; else hide/disable it.
  **DEMO_ID cleanup (§2.9).** Write `store/privacy-policy.md`; fill the `RUN.md` store-metadata
  checklist; append all new bundled assets + Expo modules to `THIRD_PARTY_NOTICES.md`; final
  `PROVENANCE.md` reviewer sign-off row.
- **Acceptance:** the fixture + roundtrip audit cover every persisted slice/field added and stay green;
  no-network gate returns zero over the whole tree (no false-positive on report SVG `xmlns`);
  **`android.allowBackup === false` + photos excluded from OS backup (`backup-exclusion.test.ts` green)**
  so the Data-Safety "no data collected/shared" claim is honest; `app.json` has the camera usage strings;
  the OpenDyslexic toggle either works or is hidden (never a no-op); EAS profiles complete (production
  has NO dev-screen env); `store/privacy-policy.md` matches actual behavior; `grep "treats?|cure|fixes
  ADHD|clinically proven" store/ RUN.md` → zero; `THIRD_PARTY_NOTICES.md` complete; PROVENANCE reviewer
  table has a feature-complete row. Verify floor green. **Final redeploy to Cloud Run per §7.**
- **New persisted surface:** none.

---

## 5. Effort roll-up

| Wave | Milestones | Rough effort |
|---|---|---|
| A (foundations) | M-A1 M, M-A2 M, **M-A3 L–XL**, M-A4 M | ~8–10 agent-days |
| B (independent v1) | M-B1 M, M-B2 M, M-B3 S–M, M-B4 M, M-B5 L | ~8–11 agent-days |
| C (consumers) | M-C1 L, M-C2 M–L, M-C3 M, M-C4 L, M-C5 M–L | ~11–15 agent-days |
| D (capstone) | **M-D1 L–XL**, M-D2 M | ~6–7 agent-days |
| **Total** | **17 milestones (M0 + 16 feature milestones)** | **~33–43 agent-days** |

**Sizing note (re-graded):** **M-A3** (accessibility-i18n) is L–XL — it bundles the full COPY→`en.ts`
catalog migration + `getMessage`/plural/interpolation + `resolveContent` delegation + AppText/
AppTextInput sweep + AA-contrast audit + `resolveStatusPresentation` triple-coding + the
effective-reduced-motion bug fix + `fonts.ts` OpenDyslexic plumbing + core-loop screen-reader
announcements; an orchestrator MAY split its i18n-catalog half from its a11y-primitives half.
**M-D1** (clinician) is L–XL — `buildReport` + `reportHtml` + expo-print/sharing/file-system(legacy)/
document-picker IO + the backup collect/validate/repair/confirm-replace/reconcile round-trip.

Estimates assume a mid-tier build-agent working recursively per `03-BUILD-GUIDE.md`, starting from and
returning to a green tree each milestone. Parallelizing within a wave (separate worktrees, serial
merge) can compress wall-clock time but does not reduce total effort.

---

## 6. Global invariants that hold at EVERY boundary (the guardrails, not work)

These are asserted continuously by the verify floor + grep gates (`03-BUILD-GUIDE.md` §2–§3); they are
never "done," they are "kept":

1. **`SCHEMA_VERSION` stays 1; `MIGRATIONS` stays empty.** The FIRST non-additive change would trigger
   the documented bump-to-2 procedure (arch §2.6) — no milestone here needs it.
2. **Green floor:** `npx tsc --noEmit` = 0; `npm test` all suites (count only grows, never < 335);
   `npx expo export --platform web` succeeds — after every milestone.
3. **No network egress** anywhere in `app/`/`src/`/`components/` (the `no-network.test.ts` gate).
4. **ZERO AI:** no LLM/AI/recommender/`Math.random` in any payout/rotation/suggestion path.
5. **Anti-shame is structural:** no `failed` `TaskStatus`, no negative `CompanionMood`, monotonic totals
   never regress, reminder/plan/billing copy passes the banned-phrase gate.
6. **No raw `ageMode`** read in a component and no `ageMode` prop — every age difference flows through a
   resolver/flag; parent surfaces use `ageModeLabel`.
7. **Acquisition-only downgrade:** flipping premium off blocks only NEW acquisition; nothing owned/
   equipped/selected/generated is ever removed, hidden, unequipped, greyed, or altered.
8. **Every new persisted slice** is (a) registered, (b) auto-covered by the whole-`tb/`-keyspace backup,
   (c) cleared by `wipeAllChildData`, (d) counted in `DataReview`, and (e) added to the M-A4
   migration-forward fixture + schema-roundtrip audit.
9. **Nothing leaves the device — including via the OS.** No app-code egress (invariant 3) AND no
   OS-cloud-backup of the data container or photo files (`android.allowBackup:false` + iOS backup
   exclusion, production-readiness §2.7) — the load-bearing precondition for the store "No data
   collected/shared" claim. Child photo files are guaranteed-deleted on re-verify/wipe/restore.
10. **The most sensitive actions demand the PIN, not just the entry challenge.** Export, restore-replace,
   and delete-all use the PIN posture (`mode:'sensitive'`); a child passing the math/long-press entry
   challenge cannot export or destroy the family dataset. Billing detail is never shown on the shared
   lock screen (the trial reminder is generic; detail is behind the PIN).
11. **Copy authored in the canonical catalog.** Post-M-A3, every `ModeKeyed` copy key lives in
   `src/i18n/en.ts` (`{young;older;preteen?}`, `young`+`older` compile-required); the anti-shame +
   no-mood-interpretation grep gates also scan `src/data/*` curated labels (BUILD-GUIDE §3).

---

## 7. One-line takeaway

Build the four Wave-A foundations first (they widen the unions, define the gates, ship the a11y/i18n
catalog, and stand up the migration safety net), then the five independent Wave-B features, then the
five Wave-C consumers, then the Wave-D capstone (report + backup/restore) and the ship-gate — one
feature spec per milestone, additive-only, green at every boundary, and redeployed to Cloud Run per the
BUILD-GUIDE.
