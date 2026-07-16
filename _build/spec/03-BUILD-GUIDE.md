# 03 — BUILD-GUIDE (recursive execution playbook)

*The HOW for `_build/spec/00-MASTER-ROADMAP.md`. This guide is written so an ORDINARY build-agent (no
top-tier model) can build feature-complete Tiny Bubbles **recursively, one milestone at a time, without
re-planning**, and a mid-tier orchestrator can drive the whole build by copy-pasting the loop below.
Every command is real. Mind the SPACE in the repo path — always quote it:
`"/Users/ameyakashid/Desktop/adhd india/tiny-bubbles"`.*

**Read order for any agent:** (1) this file §1–§3, (2) `00-MASTER-ROADMAP.md` for the milestone
you're assigned, (3) the ONE feature spec that milestone names, (4) `02-architecture.md` only for the
cross-cutting section you're touching (unions §1.1, fields §1.2, new slices §1.3, resolvers §3,
premium §3.5, hot shared files §5, conflicts §6). Do NOT read all 15 specs — read the one for your
milestone. The roadmap already resolved the cross-feature ordering; you implement, you don't re-plan.

---

## 0. Ground rules (non-negotiable, apply to every milestone)

- **Additive only.** `SCHEMA_VERSION` stays `1`; `MIGRATIONS` stays `[]`. Every change is an optional
  field on an existing persisted interface, a union-member widening, or a brand-new independently-
  persisted store slice (`02-architecture.md` §2). If you think you need a non-additive change, STOP —
  you're doing it wrong; re-read the spec.
- **Green in, green out.** You start a milestone from a green tree and you leave it green. The verify
  floor (§2) must pass before you declare the milestone done.
- **Test count only grows.** Never delete or weaken an existing test to make the floor pass. Add tests;
  fix the code.
- **One feature spec = one milestone.** Do not pull work forward from a later milestone. If a later
  feature "would be easy to add now," don't — it breaks the green-at-boundary contract and the
  provenance mapping.
- **The spec's §7 acceptance criteria + §4 file list are your contract.** Build exactly what the spec
  says. Its "Open assumptions" section already made the product calls; follow the chosen baseline.
- **No new dependency unless the spec explicitly names it** (only `verify-undo` → `expo-image-picker`
  and `clinician-reporting` → `expo-print`/`expo-sharing`/`expo-file-system`/`expo-document-picker`
  introduce deps; everything else reuses the installed stack). Install with `npx expo install <pkg>` so
  the SDK-56 pin is respected, and record it in `THIRD_PARTY_NOTICES.md`.

---

## 1. The recursive per-milestone workflow (implement → verify → fix)

Run this exact loop for each milestone `M`. It is designed to be self-terminating: you either reach a
green tree that satisfies the acceptance criteria, or you surface a blocker.

```
STEP 0 — SETUP
  cd "/Users/ameyakashid/Desktop/adhd india/tiny-bubbles"
  git status                      # confirm clean working tree (or the previous milestone's merged state)
  # confirm you are green BEFORE you start (baseline sanity):
  npx tsc --noEmit && npx jest && npx expo export --platform web   # must pass; if not, fix/rebase first
  # branch (never build on the default branch):
  git checkout -b feat/<milestone-slug>     # e.g. feat/visual-timers

STEP 1 — READ (no code yet)
  - Read 00-MASTER-ROADMAP.md → the milestone card (deps, effort, acceptance, new persisted surface).
  - Read the ONE feature spec named by the milestone (see §4 mapping). Read it fully.
  - Read only the 02-architecture.md sub-sections your milestone touches (unions/fields/slices/
    resolvers/premium/hot-files/conflicts).
  - List the spec's §4 "CREATE" and "MODIFY" files. That list IS your task list.
  - NOTE: **line numbers cited in specs are INDICATIVE, not authoritative** — the shipped tree drifts.
    Locate every edit site by GREPPING the named symbol/string (e.g. `grep -rn "ModeKeyed" src`), not
    by trusting a cited `L###`/`~line`. The named symbol wins; the number is a hint.

STEP 2 — IMPLEMENT (follow the spec's file list top-to-bottom)
  - Do the PURE/domain files first (src/domain/*, src/data/*), then the store, then the resolver/theme
    additions, then the components, then the screen wiring, then the parent controls, then the tests.
    (This order keeps tsc erroring on the smallest surface first — the compiler is your guide.)
  - Let the TypeScript exhaustiveness errors drive union work: after AgeMode/CompanionStyle/etc.
    widen, tsc lists every Record<Union> map you must fill. That list is the checklist.
  - Author BOTH young + older ModeKeyed copy variants (the `satisfies` constraint forces it); add an
    optional `preteen?` override only where the spec names an identity key.
  - Wire every new persisted slice into: (a) its persist registration, (b) gameplay.wipeAllChildData,
    (c) Settings DataReview counts, and (d) the M-A4 migration-forward fixture + schema-roundtrip audit.

STEP 3 — VERIFY (the floor — §2). Run all three + the milestone's grep gates (§3) + its §7 checks.

STEP 4 — FIX LOOP
  while (verify floor OR grep gates OR acceptance criteria fail):
    - read the FIRST failure only (tsc error / failing test / grep hit / export error)
    - make the smallest change that fixes THAT failure
    - re-run the verify floor
  # never batch-guess; fix one failure, re-verify, repeat. This is the whole recursion.

STEP 5 — DONE CHECK (§5 Definition of Done). If all boxes tick:
  - update PROVENANCE.md (§6) for every file you created/modified
  - update THIRD_PARTY_NOTICES.md if you added a dep or a bundled asset
  - git add -A && git commit   (message + Co-Authored-By trailer per repo policy)
  - (orchestrator merges to the integration branch and re-runs the floor before the next milestone)

STEP 6 — (M0 and M-D2 only, or on request) REDEPLOY to Cloud Run (§7).
```

**Recursion contract for the orchestrator:** treat each milestone as an independent, resumable unit.
If an agent stalls in STEP 4 on the same failure twice with no progress, it must STOP and report the
exact failing command + output (do not thrash). The orchestrator then either fixes the blocker or
re-queues the milestone. Never mark a milestone done with a red floor.

---

## 2. The VERIFY FLOOR (run after every change; the gate for every milestone)

These three commands are the hard floor. All three must pass, from the repo root, before a milestone is
done. They are the same three every feature spec's §7 names.

```bash
cd "/Users/ameyakashid/Desktop/adhd india/tiny-bubbles"

npx tsc --noEmit                 # 1) 0 type errors. New unions/fields/copy keys compile; ModeKeyed
                                 #    forces both age variants; Record<Union> maps are exhaustive.

npx jest                         # 2) ALL suites green. Never fewer than the current baseline (335+).
                                 #    Each milestone ADDS suites; the count only grows.
                                 #    (npm test === jest; either works.)

npx expo export --platform web   # 3) web-subset bundle succeeds. Proves offline/web-safe: no
                                 #    native-only import at module scope; audio/haptics/notifications
                                 #    degrade to no-op; report/backup are N/A-on-web but must not crash.
```

Shorthand the orchestrator can paste:
```bash
cd "/Users/ameyakashid/Desktop/adhd india/tiny-bubbles" && npx tsc --noEmit && npx jest && npx expo export --platform web && echo "FLOOR GREEN"
```

If any command fails, that is the FIRST failure to fix in STEP 4. Do not proceed past a red floor.

---

## 3. The GREP GATES (the anti-shame / no-AI / no-raw-ageMode / no-network guards)

Run these after the floor. Each must return the expected result. They are the mechanical enforcement of
the locked constraints. `-n` shows line numbers; `-i` case-insensitive; exclude `__tests__` where noted.
The `no-network` gate is also codified as `__tests__/config/no-network.test.ts` (M-A4).

```bash
cd "/Users/ameyakashid/Desktop/adhd india/tiny-bubbles"

# --- ZERO AI: no LLM/recommender/AI toggle, no RNG in payout/rotation/suggestion paths ---
grep -rniE "openai|anthropic|langchain|genai|\bllm\b|chatbot|gpt-|recommend|for you|adaptive|suggest" \
  src app components | grep -viE "__tests__|// |suggestTask|proposeTask" || echo "OK: no-AI"
grep -rn "Math.random" src/domain src/state components app \
  | grep -viE "__tests__" || echo "OK: no-RNG (rotation/spotlight/prompt/payout are deterministic)"
#   NOTE: novelty/quests/plans/chores/focus MUST have zero Math.random in their domain+store+payout.

# --- ANTI-SHAME: no failure/loss/urgency copy in kid-facing surfaces, copy tables, OR curated data labels ---
grep -rniE "time's up|out of time|too slow|you failed|\bfailed\b|you missed|\bmissed\b|streak (lost|broken)|0[- ]day|hurry|last chance|limited time" \
  app/\(kid\) components/task components/kid components/quests components/plans components/focus components/mood \
  src/theme/resolveContent.ts src/i18n/en.ts \
  src/data/questPool.ts src/data/planTemplates.ts src/data/focusBreaks.ts src/data/moodScale.ts src/data/choreTemplates.ts src/data/soundscapes.ts 2>/dev/null \
  | grep -viE "__tests__" || echo "OK: anti-shame copy"
#   Allowed exceptions: none in kid copy. "not therapy"/"no health claims" is fine in the PARENT paywall.
#   NOTE: word boundaries are load-bearing — `\bmissed\b` (not `missed\b`, which matches "dismissed" used by
#   if-then/multi-child Approve/Dismiss flows) and `\bfailed\b`. src/data/* is IN SCOPE because most curated
#   kid-facing spoken/label copy (quest labels, plan cue/action labels, MOVEMENT_PROMPTS spokenLabels,
#   MOOD_FACES spokenLabels, chore/soundscape scene labels) lives there — a shame phrase in a data label
#   would otherwise ship undetected. Also codified as a unit test: run every curated catalog VisualLabel.
#   spokenLabel through isReminderCopyClean / the banned-phrase list (owned by production-readiness/M-A4).

# --- ZERO-AI MOOD INTERPRETATION: mood surfaces show counts/timelines only, never an emotional label ---
grep -rniE "anxious|sad\b|struggling|worse|concern|risk\b|seems |likely|needs attention|trend(ing)? (down|up)|mostly rough" \
  app/\(parent\)/insights.tsx components/mood src/domain/moodInsight.ts \
  src/theme/resolveContent.ts src/i18n/en.ts 2>/dev/null | grep -viE "__tests__" || echo "OK: no mood interpretation"
#   Parity with reportHtml's banned-word test; enforces mood-checkin §2.5/§7 "no interpretation (ZERO AI)".

# --- NO OVER-CLAIMING: no treatment/medical claims anywhere user-facing or in store assets ---
grep -rniE "treats?|cures?|fixes ADHD|clinically proven|improves attention|reduces anxiety|biofeedback|diagnos" \
  app src/data src/theme/resolveContent.ts src/services/reportHtml.ts store RUN.md 2>/dev/null \
  | grep -viE "not therapy|no health claims|not a medical|non-diagnostic|__tests__" || echo "OK: no over-claim"

# --- NO RAW ageMode in components / no ageMode prop (golden rule) ---
grep -rnE "=== \"(young|older|preteen)\"|=== '(young|older|preteen)'|ageMode=\{" components app \
  | grep -viE "__tests__" || echo "(review) raw-ageMode hits — MUST be only in src/theme resolvers, never components"
grep -rn "ageMode" components | grep -viE "useThemeInputs|ageModeLabel|__tests__|// " \
  || echo "OK: components read ageMode only to FEED a resolver (useThemeInputs), never to branch"
#   The ONLY sanctioned raw-ageMode reads live in src/theme/resolve*.ts and src/domain/constants.ts.
#   Components feed ageMode from useThemeInputs() INTO a resolver; they never `if (ageMode === ...)`.

# --- NO NETWORK EGRESS (offline-first, enforced) ---
grep -rniE "fetch\(|axios|XMLHttpRequest|WebSocket|sendBeacon|https?://[a-z]" app src components \
  | grep -viE "^[^:]+:[0-9]+: *(//|\*)|__tests__|docs.expo.dev|schema|xmlns" || echo "OK: no network egress"

# --- BILLING stays MOCKED (real processor is a later seam, comments only) ---
grep -rniE "revenuecat|react-native-purchases|StoreKit|purchaseProduct|purchasePackage" src app components \
  | grep -viE "// TODO|seam|MOCK|later|__tests__" || echo "OK: purchase stays mocked"

# --- ACQUISITION-ONLY downgrade (never strip owned content): the shipped invariant test must stay green ---
npx jest __tests__/state/entitlements.test.ts   # includes "trial expiry with premium cosmetics EQUIPPED → zero visible change"
```

**Per-milestone grep gates:** each feature spec's §7 "Verify steps" lists any EXTRA greps specific to
that feature (e.g. soundscapes: `setAudioModeAsync` only in `sound.ts`; breathing: no
`recordCompletion`/`CelebrationOverlay` in `calm.tsx`; novelty: no `expires`/`countdown` in the quest
copy; multi-child: no `leaderboard`). Copy those into STEP 3 for that milestone. The generic gates
above run every milestone; the spec-specific ones run for their milestone.

---

## 4. How to reference each feature spec (milestone → spec mapping)

For milestone `M`, open exactly the spec below and treat its §2 (UX), §3 (data model), §4 (files),
§6 (anti-shame/no-AI), §7 (acceptance) as the build contract. All paths are under
`/Users/ameyakashid/Desktop/adhd india/_build/spec/features/`.

| Milestone | Feature spec file | Owns / key deliverable |
|---|---|---|
| M-A1 | `billing-entitlements.md` | classification (SOURCE OF TRUTH) + 4 gate seams + trial reminder + `ifThenPlans` key |
| M-A2 | `aging-up.md` | `AgeMode+preteen`, `CompanionStyle+avatar`, `caps.companionStyle` exposure |
| M-A3 | `accessibility-i18n.md` | canonical `ModeKeyed`, `en` catalog, `AppText`, a11y props, `resolveStatusPresentation` |
| M-A4 | `production-readiness.md` (ws 3/6/7) | migration-forward + schema-roundtrip harness, no-network gate, ErrorBoundary, dev-screen gate |
| M-B1 | `visual-timers.md` | `src/domain/timer.ts` (canonical timer helper) + `VisualTimer` |
| M-B2 | `verify-undo.md` | `undoEarn`/`reverseRedemption`/`photoVerify`; `expo-image-picker` |
| M-B3 | `child-autonomy.md` | wire `canCustomizeCompanion`/`canPickReward`; young "What next?" chooser |
| M-B4 | `mood-checkin.md` | `resolveMoodCheckin`, `mood.tsx`, `moodInsight` (counts only) |
| M-B5 | `multi-child.md` | `choreStore (tb/chores)`, deterministic rotation, fast switcher |
| M-C1 | `soundscapes.md` | `src/services/soundscape.ts` audio-bed layer + `VolumeSlider` + catalog |
| M-C2 | `breathing-regulation.md` | `src/domain/breathing.ts`, `BreathingBubble`, upgrade `calm.tsx` (consumes M-C1 bed) |
| M-C3 | `focus-intervals.md` | `src/domain/focus.ts`, in-memory `focusSessionStore`, `focus.tsx` |
| M-C4 | `novelty-refresh.md` | `questStore (tb/quests)`, deterministic weekly rotation + day-of-year spotlight |
| M-C5 | `if-then-plans.md` | `planStore (tb/plans)`, `planToReminderAnchor`, cue firing |
| M-D1 | `clinician-reporting.md` | `buildReport`/`reportHtml`/`report.ts`/`backup.ts` + report screen |
| M-D2 | `production-readiness.md` (ws 1/2 + closing) | EAS/store metadata, envelope stamp, extend fixtures, perf, ship gate |

When a milestone touches a **hot shared file** (`02-architecture.md` §5 — `TaskRunner.tsx`,
`DaypartDonePanel.tsx`, `calm.tsx`, `resolveCapabilities.ts`, `resolveContent.ts`/`en.ts`,
`app/_layout.tsx`, `gameplay.ts`, `settings.tsx`, `children.tsx`, `dashboard.tsx`,
`app/(kid)/_layout.tsx`): **merge, never fork** — read the current contents, add your additive block,
keep every existing branch. If two milestones ran in parallel worktrees, the orchestrator merges
serially and re-runs the floor.

**COPY-KEY LOCATION RULE (post-M-A3 — supersedes every sibling spec's "add to `resolveContent.COPY`").**
M-A3 (accessibility-i18n) **removes the `resolveContent.COPY` literal** and moves all strings to
`src/i18n/en.ts` (delegating `resolveContent` → `getMessage`). Because the locked build order runs
M-A3 **before** every copy-adding feature (M-B*/M-C*/M-D*), that `COPY` object **no longer exists** at
their build time. So: **for any milestone at or after M-A3, author all `ModeKeyed` copy keys in
`src/i18n/en.ts`** (with both `young`+`older` required and an optional `preteen?` where the spec names
an identity key). The feature specs still literally say "add keys to `resolveContent.COPY`" — treat
that as **"add keys to the canonical catalog," i.e. `en.ts`**, once M-A3 has landed. (If, and only if, a
milestone somehow runs *before* M-A3, author in `resolveContent.COPY`; it then migrates as a pure data
move with zero component edits — `02-architecture.md` §6-C2. In the canonical order this branch does
not occur.) `ModeKeyed<T> = { young; older; preteen? }` is the single canonical type
(`src/i18n/types.ts`, re-exported from `resolveContent`).

---

## 5. DEFINITION OF DONE (per milestone / per feature)

A milestone is DONE only when **every** box below ticks. This is the checklist an agent runs in STEP 5
and the orchestrator re-checks before merge.

- [ ] **Verify floor green** (§2): `tsc --noEmit` = 0, `jest` all suites (count ≥ prior), `expo export
      --platform web` succeeds.
- [ ] **Grep gates pass** (§3): the generic gates + the spec-specific greps from the feature's §7.
- [ ] **The feature spec's §7 acceptance criteria are all met** (asserted by new tests where the spec
      lists them; the CREATE list in §4 includes those test files — write them).
- [ ] **New tests exist** for every new pure domain module, store, and resolver the spec names (never
      ship a new `src/domain/*` or store without its `__tests__/*`).
- [ ] **Additive-only confirmed:** `SCHEMA_VERSION` still `1`, `MIGRATIONS` still `[]`. Any new
      persisted field is optional (or seeded via `defaultChildSettings`/`defaultParentSettings` so
      `mergeWithDefaults` backfills it). Any new slice hydrates from its own `partialize` default.
- [ ] **New persisted slice fully wired** (if any): registered persist store, cleared by
      `gameplay.wipeAllChildData`, counted in Settings `DataReview`, and covered by the M-A4
      `migration-forward.test.ts` fixture + `schema-roundtrip.test.ts` (extend both this milestone).
- [ ] **Premium/free classification honored** (`billing-entitlements.md` §8 is authoritative): gate
      ONLY through `src/services/entitlements.ts` (`isFeatureUnlocked`/`canAddMore`) — no scattered
      `entitlement.tier === 'premium'`. Never wrap a FREE/accessibility/core-loop control in
      `<PremiumGate>`. Downgrade is acquisition-only (nothing owned is stripped).
- [ ] **Age-adaptive via resolvers only:** no raw `ageMode` branch in a component, no `ageMode` prop;
      copy through `resolveContent`/`getMessage` with both age variants; status via
      `resolveStatusPresentation`.
- [ ] **Anti-shame + no-AI + offline invariants hold** (the feature's §6): no failure/loss/urgency
      copy, no negative companion state, no LLM/recommender/`Math.random` payout, no network path.
- [ ] **Deps + assets recorded:** any new `npx expo install`ed dep and any bundled CC0/original asset
      is listed in `THIRD_PARTY_NOTICES.md`.
- [ ] **PROVENANCE.md updated** (§6) for every created/modified source file.
- [ ] **App runnable at the boundary:** the tree is green and a clean checkout would boot (M0/M-D2 also
      confirm the web redeploy builds).

If any box is unchecked, the milestone is NOT done — return to STEP 4.

---

## 6. Keeping PROVENANCE.md updated (per milestone)

`PROVENANCE.md` is the per-file origin manifest that gates the M15/ship reviewer sign-off ("no code
from a non-approved source"). Every new/changed source file must be recorded. The format is the table
already in the file, grouped by milestone.

**Procedure (STEP 5 of the loop):**

1. Add a new section header for your milestone, e.g. `## M-B1 — Visual transition timers`.
2. For every file you CREATED or MODIFIED, add a row:
   ```
   | File | Origin | Notes |
   | --- | --- | --- |
   | `src/domain/timer.ts` | `original` | Pure wall-clock timer helpers; net-new for Tiny Bubbles. |
   | `components/task/TaskRunner.tsx` | `original` | (modified) additive VisualTimer mount on active step. |
   ```
3. Choose the **origin code** honestly (definitions are at the top of `PROVENANCE.md`):
   - `original` — net-new code authored for Tiny Bubbles (the default for all feature-complete work).
   - `lockin:<path>` — grafted/adapted from the **lockin** repo (the ONLY approved graft donor, MIT).
     Shame/AI/rigid-goal mechanics removed on graft. Rare in feature-complete work.
   - `reference:<repo>:<path>` — re-authored against our stack from a reference-only repo's *pattern*
     (no code copied). Note which pattern.
   - **NEVER** `adhd-india` / `adhd-focus-mate` (unlicensed — a hard ship prohibition).
4. For a MODIFIED shipped file, keep its original row and add a short "(modified) …" note, or add a new
   row under the milestone section — either is fine as long as the change is attributed.
5. **M-D2 (ship gate):** add a final reviewer sign-off row to the table at the top:
   ```
   | Milestone | Reviewer | Date | "No code from a non-approved source" |
   | --- | --- | --- | --- |
   | M-A1…M-D2 (feature-complete) | feature-complete ship-gate audit | <date> | CONFIRMED — only lockin (MIT) grafted; rest original/re-authored; jscpd + grep clean |
   ```
   and re-run the mechanical gates the manifest names: `jscpd` clone-similarity of `app/ components/
   src/` against the prohibited trees (→ 0 cross-tree clones) and
   `grep -rE 'adhd-india|adhd-focus-mate' app components src` (→ 0).

**Rule of thumb:** if `git status` shows a `.ts`/`.tsx` file created or changed this milestone and it
has no PROVENANCE row for this milestone, the milestone is not done.

---

## 7. REDEPLOY to Cloud Run (rebuild web → copy dist → gcloud deploy)

The web build is served on Cloud Run from `deploy-web/` (an Express static server over `deploy-web/dist`
with an SPA fallback — see `deploy-web/server.js`). Redeploy after M0 (sanity) and after M-D2 (final),
or whenever the orchestrator wants a live preview. All commands quote the space in the path.

```bash
cd "/Users/ameyakashid/Desktop/adhd india/tiny-bubbles"

# 1) Rebuild the web bundle (offline/web-safe subset; must succeed as part of the verify floor).
npx expo export --platform web            # writes ./dist

# 2) Copy the fresh build into the Cloud Run service dir (it serves deploy-web/dist).
rm -rf deploy-web/dist
cp -R dist deploy-web/dist

# 3) Deploy from source (Cloud Build packs deploy-web/, installs express, runs `node server.js`).
gcloud run deploy tiny-bubbles \
  --source deploy-web \
  --region us-central1 \
  --allow-unauthenticated       # public preview; drop if the service is meant to be private

# 4) The command prints the service URL. Smoke it: open the URL, confirm the app boots, the kid loop
#    renders, and navigation works (audio/haptics/notifications are N/A on web by design).
```

Notes for the agent:
- Prereqs (assumed already configured on the deploy machine): `gcloud` authenticated
  (`gcloud auth login`), a project set (`gcloud config set project <PROJECT_ID>`), and the Cloud Run +
  Cloud Build APIs enabled. If a deploy fails on auth/project, STOP and report — do not guess
  credentials.
- `deploy-web/package.json` pins `express` + `node >=20` and `start: node server.js`; Cloud Run's
  source deploy uses that automatically. Do not add other build steps to `deploy-web`.
- Keep `deploy-web/dist` as a COPY of `dist` (step 2). Never edit `deploy-web/dist` by hand — it is a
  build artifact, regenerated every redeploy.
- **Do not** wire EAS Update / `expo-updates` into the web deploy (offline-first, no phone-home — see
  `production-readiness.md` §2.1/§2.5). The Cloud Run static host is the only web surface.

---

## 8. Orchestrator driver (copy-pasteable pseudo-loop for a mid-tier orchestrator)

Drive the whole build by iterating the milestone list from `00-MASTER-ROADMAP.md` §3 in order. Pseudo-
code an orchestrator can execute (each `run milestone` dispatches the §1 loop to a build-agent):

```
MILESTONES = [M0, M-A1, M-A2, M-A3, M-A4,
              M-B1, M-B2, M-B3, M-B4, M-B5,
              M-C1, M-C2, M-C3, M-C4, M-C5,
              M-D1, M-D2]

cd "/Users/ameyakashid/Desktop/adhd india/tiny-bubbles"
assert floor_green()                      # §2 on the shipped tree before starting

for M in MILESTONES:
    open 00-MASTER-ROADMAP.md → card(M)   # deps, effort, acceptance, new-persisted-surface
    open the ONE feature spec for M       # §4 mapping
    branch feat/<M-slug>
    run milestone M via §1 (implement → verify → fix)   # agent iterates STEP 2–4 until green
    assert floor_green()                  # §2
    assert grep_gates_pass(M)             # §3 generic + spec-specific
    assert acceptance_met(M)              # feature spec §7
    assert definition_of_done(M)          # §5 checklist
    update PROVENANCE.md                  # §6
    commit + merge to integration branch
    assert floor_green()                  # §2 again on the merged tree (catches hot-file merge breaks)

# after M0 and after M-D2:
redeploy_cloud_run()                      # §7

report: "feature-complete: 17 milestones green (M0 + 16); SCHEMA_VERSION=1, MIGRATIONS=[]; floor green; deployed"
```

**If a milestone stalls** (same failure twice, no progress in STEP 4): the agent STOPS and reports the
exact failing command + first-failure output. The orchestrator fixes the blocker or re-queues M. Never
merge a red tree; never skip a hard-edge dependency (§2 of the roadmap lists them).

---

## 9. Quick reference — the commands you will paste most

```bash
# --- verify floor (after every change) ---
cd "/Users/ameyakashid/Desktop/adhd india/tiny-bubbles" && npx tsc --noEmit && npx jest && npx expo export --platform web && echo FLOOR_GREEN

# --- run just one new test suite while iterating ---
npx jest __tests__/domain/<name>.test.ts

# --- install a spec-named dep (SDK-56 pinned) ---
npx expo install <package>        # then add it to THIRD_PARTY_NOTICES.md

# --- the four standing grep gates (see §3 for the full set) ---
grep -rn "Math.random" src app components | grep -v __tests__            # payout/rotation must be deterministic
grep -rnE "=== \"(young|older|preteen)\"" components app | grep -v __tests__   # no raw ageMode in components
grep -rniE "fetch\(|axios|XMLHttpRequest|WebSocket|sendBeacon|https?://[a-z]" app src components | grep -viE "//|__tests__|docs.expo.dev|schema|xmlns"   # no egress (exclude SVG xmlns + doc URLs)
npx jest __tests__/state/entitlements.test.ts                            # acquisition-only downgrade holds

# --- redeploy web to Cloud Run (§7) ---
cd "/Users/ameyakashid/Desktop/adhd india/tiny-bubbles" && npx expo export --platform web && rm -rf deploy-web/dist && cp -R dist deploy-web/dist && gcloud run deploy tiny-bubbles --source deploy-web --region us-central1
```

---

## 10. One-line takeaway

For each milestone: branch → read the one named feature spec → implement its §4 file list pure-first →
run the verify floor + grep gates + its §7 acceptance in a fix loop until green → tick the Definition of
Done → update PROVENANCE → commit/merge → keep the tree green; redeploy web to Cloud Run at M0 and M-D2.
Additive-only, `SCHEMA_VERSION` 1, no AI, no shame, no raw `ageMode`, no network — enforced by the floor
and the greps, not by memory.
