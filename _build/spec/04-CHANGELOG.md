# 04 — CHANGELOG (feature-complete SPEC finalization)

*Records every spec change made to resolve the multi-lens critique and bring the feature-complete
SPEC set to a build-ready state. Authored 2026-07-06. Scope: `_build/spec/` — `00-MASTER-ROADMAP.md`,
`02-architecture.md`, `03-BUILD-GUIDE.md`, and `features/*.md`. Every BLOCKER and MAJOR issue is
resolved; real gaps filled; the noted MINORs fixed. Grouped by severity, then by lens.*

---

## BLOCKERS (3) — resolved

1. **Orphaned research feature #18 (Co-play / body-doubling) had no disposition.**
   → Added an explicit **DEFERRED / out-of-scope** disposition (real-time co-presence implies a sync
   server, violating OFFLINE-FIRST; partial offline coverage via companion co-presence + breathing
   "Breathe with me" + multi-child hand-off). `02-architecture.md` §6-C13; `00-MASTER-ROADMAP.md` §1
   (dispositions block). Mirrors how #23/#25 are handled.

2. **Contradictory canonical `ModeKeyed<T>` across two Wave-A specs (i18n dropped `preteen?`).**
   → `accessibility-i18n.md` §4.1 + §5 CREATE #1/#16 now define
   `ModeKeyed<T> = { young: T; older: T; preteen?: T }` (matching `aging-up.md` §3.4 + arch §1.7/§6-C2),
   with an explicit "preserve the `preteen?` member M-A2 added on migration" note and a
   `content-typetest` extension (a preteen-only key still errors; `young`+`older` compile-required).

3. **"Nothing leaves the device / No data collected" claim was technically FALSE** (iOS iCloud
   Backup / Android Auto Backup sweep the AsyncStorage container + verify-undo photo files off-device).
   → New **production-readiness §2.7 "OS-level backup exclusion"** workstream: `android.allowBackup:false`,
   iOS backup-exclusion of the photo dir (cache/`NSURLIsExcludedFromBackupKey`), a `backup-exclusion.test.ts`
   that BLOCKS the M-D2 store gate until green. Cross-referenced in arch §3.3, `00-MASTER-ROADMAP.md`
   M-D2 + §6 invariant #9, and gated the Data-Safety answer in §2.2.

---

## MAJORS — resolved

### Completeness / coverage
- **Parent-tunable daypart windows (orphaned):** explicitly **DEFERRED** with rationale (defaults serve
  the routines; the type is forward-compatible). production-readiness §2.9; roadmap §1.
- **OpenDyslexic font activation (advertised free no-op):** now **OWNED** — M-A3 wires `src/theme/fonts.ts`
  plumbing (`accessibility-i18n.md` §2.7 + §5 MODIFY #15); binaries are an out-of-band orchestrator
  prerequisite; M-D2 ship-gate hides/disables the toggle if binaries aren't bundled (production-readiness
  §2.9). Never advertise a no-op control.

### Technical feasibility
- **Mandated `.test.tsx` render-tests had no wired tooling:** new **production-readiness §2.8** test-tooling
  harness (Reanimated jest mock in `jest.setup.js` + a `react-test-renderer` helper — NO new dep),
  front-loaded into **M-A4** before M-B1/M-C2 consume it. Roadmap M-A4 updated.
- **verify-undo added camera but no permission config:** `verify-undo.md` §4 now registers the
  `expo-image-picker` **config plugin in `app.json`** with honest `cameraPermission`/`photosPermission`
  strings; production-readiness §2.1 reconciled ("no camera in v1" note replaced — M-B2 IS in scope, so
  camera lands now, with usage strings, Data-Safety disclosure, and a Kids-Category decision).

### Anti-shame / ZERO-AI / child-safety
- **Camera/photo Kids-Category + retention:** production-readiness §2.1c/§2.2 add the child-camera decision
  + Data-Safety disclosure; `verify-undo.md` makes photo deletion a **GUARANTEE** (`deletePhoto` on
  re-verify, `wipeAllChildData`/`removeChild`, and restore-replace) with photos stored in an
  excluded-from-backup dir + a "wiped child leaves no orphaned photo files" test.
- **Export/restore/delete-all were gated only by the entry challenge, not the PIN:** `clinician-reporting.md`
  §2.3 routes all three through a new **`mode:'sensitive'` PIN posture**; acceptance added; arch §3.3 +
  roadmap §6 invariant #10 record it.
- **Anti-shame grep didn't scan `src/data/*`:** BUILD-GUIDE §3 anti-shame grep now includes
  `questPool`/`planTemplates`/`focusBreaks`/`moodScale`/`choreTemplates`/`soundscapes` + a unit-test note.
- **Mood "no interpretation" invariant had no mechanical gate:** `mood-checkin.md` §2.5/§7 add a
  **banned-interpretation gate** (grep + selector-output test over `insights.tsx`/`components/mood/*`/
  `moodInsight.ts`); codified in BUILD-GUIDE §3.
- **Trial-end billing notification visible to a child on the shared device:** `billing-entitlements.md`
  §2.4/§6 make the **visible notification GENERIC/non-billing** ("A grown-up note is ready in Settings.");
  the honest billing detail lives only in the PIN-gated Settings row. `assertBillingCopyClean()` now also
  bans `trial|plus|charge|subscribe|price` on the visible surface.

### Buildability by ordinary agents
- **Soundscape premium `.wav` files can't be authored by a code-agent (broke `expo export`):**
  `soundscapes.md` §4 adds a prominent **BUILD DEFAULT** — register ONLY scenes whose asset exists
  (ship free `waves` reusing `calm-ambient.wav`); premium loops are an out-of-band prerequisite; never
  `require()` a missing file; a test asserts every catalog `assetKey` has a `require()`.
- **clinician-reporting required fetching external v56 web docs:** BUILD-AGENT NOTE + §5 + §9.1 **pin the
  exact stable API** (`expo-file-system/legacy` `readAsStringAsync`/`writeAsStringAsync`/`deleteAsync`/
  `cacheDirectory`/`documentDirectory` + literal print/share/picker calls) — no docs-fetch; buildable
  offline. Imports isolated + Platform-guarded in `report.ts`/`backup.ts`; web-export smoke added.

### Scope coherence / dependencies
- **Classification authority (billing §8) contradicted the roadmap on `if-then-plans`:** added the
  `ifThenPlans {kind:"count",free:2,premium:8}` KEY to §3.4 + §2.5 seam + two §8 rows (free firing + first
  2 / premium 3rd–8th); corrected open-assumption #4.
- **Classification wrong on `novelty-refresh`:** split the §8 row into **base rotation + spotlight (Free)**
  and **seasonal packs + premium quest pool (Premium/`noveltyPipeline`)**.
- **Copy-key location stale in every post-A3 spec (`resolveContent.COPY` removed by M-A3):** added the
  **COPY-KEY LOCATION RULE** to BUILD-GUIDE §4 + roadmap §2 (M-A3 hard edge) — post-A3, author all
  `ModeKeyed` keys in `src/i18n/en.ts`; treat sibling specs' "add to `resolveContent.COPY`" as "add to the
  canonical catalog."

---

## MINORS — fixed

- **Milestone count** corrected everywhere: "16 work items across **17 milestones** (M0 + 16)" — roadmap
  §1 intro + §5 total; BUILD-GUIDE §8 report line.
- **Stray EOF artifacts** stripped: `</content>`/`</invoke>` from `accessibility-i18n.md`,
  `billing-entitlements.md`, `production-readiness.md`; dangling ```` ``` ```` from `novelty-refresh.md`.
- **Broken/noisy verify greps:** `multi-child.md` §7 `ai` → `\bai\b|leaderboard|compare|rank(ed|ing)|…`;
  BUILD-GUIDE §3 `missed\b`/`failed\b` → `\bmissed\b`/`\bfailed\b` (no longer matches `dismissed`).
- **Empty states** added: mood dashboard glance (`mood.glanceEmpty`) + `insights.tsx` (`mood.insightsEmpty`)
  at zero logs (`mood-checkin.md`); `chores.tsx` zero-chores (`chore.empty`, `multi-child.md`); `VerifyQueue`
  hidden-when-empty + dangling `photoUri` renders nothing (`verify-undo.md` §2.4).
- **Cross-device restore reconciliation:** `clinician-reporting.md` §3.5 clears in-memory
  `sessionStore`/`focusSessionStore`, `deletePhoto`s outgoing photos, and re-derives the trial reminder;
  a missing `photoUri` renders nothing (no broken-image icon). Arch §6-C9 updated.
- **Energy scale drift:** `clinician-reporting.md` §2.2/§3.2 use `energyScaleMax` (3/5), not the stale 0–10.
- **VolumeSlider ownership:** single owner = soundscapes M-C1; removed from the accessibility-i18n
  created-files bullet (arch §1.5 + §1.7).
- **DataReview wiring:** `multi-child.md` counts `tb/chores`; `novelty-refresh.md` counts `tb/quests`.
- **focus-intervals** suppresses "Focus blocks today: 0" (shows only the neutral close at N=0).
- **buddy Name free-text (PII):** `child-autonomy.md` §2.2 caps length, adds an on-device offline profanity
  filter, and OMITS the name from the clinician report.
- **Per-child mood consent:** `mood-checkin.md` adds optional `ChildSettings.moodCheckinEnabled?` (default
  true), ANDed with the global `moodLoggingEnabled`; arch §1.2 + roadmap M-B4/M-D2 updated.
- **Wellbeing-vs-monetization tension** documented as an explicit product decision (`mood-checkin.md` §10;
  raw logs + recent list + the 30-day report mood card stay FREE).
- **Line numbers are indicative:** BUILD-GUIDE §1 STEP-1 note — grep the named symbol, don't trust `L###`.
- **no-network jest gate** replicates the BUILD-GUIDE §3 exclusion set (comments/`docs.expo.dev`/`schema`/
  `xmlns`) so generated report HTML/SVG namespaces don't false-positive (production-readiness §2.5/§4;
  BUILD-GUIDE §9 egress grep updated).
- **Notification firing** acceptance labeled dev-client-only manual (billing §7, if-then §8); the automated
  floor asserts the mocked scheduler + `SchedulableTriggerInputTypes.DATE` trigger shape (SDK-56 type-safe).
- **backup.test.ts** must `jest.mock()` the four native modules (incl. `expo-file-system/legacy`).
- **Sizing re-grade:** M-A3 and M-D1 → L–XL; roll-up total ~33–43 agent-days (roadmap §5).
- **A4-is-last within Wave A:** M-A4 must reflect A1/A2/A3 additions (fixture enumerates
  `trialEndReminderAt` + `locale`); roadmap §2 hard edge + §3 caveat + M-A4 card.

---

## Files touched

- `00-MASTER-ROADMAP.md` — §1 dispositions + milestone count; §2 copy-key rule + A4-last edge; §3 caveat;
  M-A1/M-A4/M-B2/M-B4/M-C1/M-D1/M-D2 cards; §5 roll-up + sizing; §6 invariants 9–11.
- `02-architecture.md` — §1.2 (`moodCheckinEnabled?`); §1.5/§1.7 (VolumeSlider owner); §3.3 (OS-backup,
  sensitive-PIN, photo boundary); §6-C9 (photo lifecycle), §6-C12 (energy scale ref), §6-C13 (co-play).
- `03-BUILD-GUIDE.md` — §1 STEP-1 (line-numbers note); §3 (anti-shame `src/data` scope + word boundaries +
  mood-interpretation gate); §4 (COPY-KEY LOCATION RULE); §8 report line; §9 egress grep.
- `features/accessibility-i18n.md` — ModeKeyed `preteen?`; OpenDyslexic `fonts.ts` ownership.
- `features/billing-entitlements.md` — `ifThenPlans` key (§2.5/§3.4/§8); novelty split; trial-reminder
  shared-device generic copy; DateTrigger shape; open-assumption #4.
- `features/verify-undo.md` — `app.json` camera plugin; guaranteed `deletePhoto`; dangling-photoUri render;
  §9.3/§9.4 resolved.
- `features/clinician-reporting.md` — pinned `expo-file-system/legacy` API; `mode:'sensitive'` PIN;
  restore reconciliation; energy scale; jest mocks; web-export smoke.
- `features/mood-checkin.md` — banned-interpretation gate; empty states; per-child consent; monetization note.
- `features/multi-child.md` — grep word boundaries; DataReview chores; chores empty state.
- `features/novelty-refresh.md` — DataReview quests; stray-fence removed.
- `features/focus-intervals.md` — suppress "0 blocks" shaming zero.
- `features/soundscapes.md` — BUILD DEFAULT (register only existing assets).
- `features/child-autonomy.md` — buddy-Name PII caveat.
- `features/production-readiness.md` — §2.1 camera reconcile; §2.2 Data-Safety honesty; §2.5 exclusions;
  §2.7 OS-backup; §2.8 render harness; §2.9 known-gap dispositions; §4 tables.
- `features/if-then-plans.md` — dev-client firing note + trigger shape.
- `04-CHANGELOG.md` — this file (new).

*No BLOCKER or MAJOR left open. All changes are documentation-only edits to the spec set; the additive,
`SCHEMA_VERSION`-1, no-migration, offline-first, ZERO-AI, anti-shame contract is preserved throughout.*
