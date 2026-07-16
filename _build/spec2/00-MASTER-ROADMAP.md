# 00 — v2 MASTER ROADMAP — FINAL (monorepo · two apps · additive Firebase oversight + super-guardrailed Bloop)

*Authored 2026-07-10; **FINALIZED 2026-07-10** after applying the four-lens critique (completeness · technical
feasibility · child/LLM/COPPA safety · buildability · evidence/license). All BLOCKER + MAJOR findings are resolved
in `02-architecture.md` §2.3/§5/§8 (the canonical register, now #1–#33) and threaded here + into the workstream
`⟦v2 FINAL reconciliation⟧` banners; see `04-CHANGELOG.md`. Against the shipped, green v1 baseline (`/Users/ameyakashid/Desktop/adhd india/tiny-bubbles/`,
verified in-repo: Expo SDK 56 / RN 0.85.3 / React 19.2.3 / TS 6.0.3 / zustand 5.0.14 / NativeWind 4.2.6,
`SCHEMA_VERSION = 1`, `MIGRATIONS = []`, 69 test suites, `tsc --noEmit` = 0) and the v2 spine
(`_build/spec2/01-current-and-target.md`, `_build/spec2/02-architecture.md`) + the eight workstream specs
(`_build/spec2/workstreams/w1..w8`). This is the execution playbook: it groups the eight workstreams into
buildable, dependency-ordered **phases + milestones**, states **effort** and **per-milestone acceptance**, and
guarantees that **both apps stay green AND the kid app stays fully functional with network + LLM OFF at every
milestone boundary**. The recursive HOW (implement → verify → fix, the verify floor per app + Functions, the
grep gates, DoD, PROVENANCE, emulator, deploy) is in the companion `_build/spec2/03-BUILD-GUIDE.md`. Mind the
SPACE in every path — always quote it: `"/Users/ameyakashid/Desktop/adhd india"`.*

---

## 0. LOCKED v2 decisions (inputs, NOT open questions — do NOT relitigate)

- **Monorepo, TWO apps.** `apps/kid` = the shipped v1 app **EXTENDED, not rewritten** · `apps/parent` = net-new
  Expo app · `packages/shared` = one source of truth for cross-app TS · `functions/` = Firebase Cloud Functions
  (TS), the **only** raw-egress zone. Root npm workspaces + one hoisted lockfile.
- **Firebase (Auth + Firestore + Functions + FCM + App Check) is ADDITIVE oversight/sync/LLM.** The v1 offline-first
  `storage` port stays the **source of truth for the child core**. Delete Firebase entirely and the child app is
  unchanged. **Never brick the child: full function with network + LLM OFF.**
- **Super-guardrailed LLM: the MODEL is never the safety boundary.** Server-side Cloud-Functions proxy =
  input shield → provider (Gemini Flash strict / DeepSeek wrapped identically) → **OUTPUT shield** (the defense that
  holds vs jailbreaks). Hard topic-scope (ADHD/autism supports), PII refusal both directions, crisis = pre-written
  human-reviewed **region-localized** hotline + parent FCM alert + PII-redacted transcript — **never a bare refusal,
  never a model-invented number**. **MOCK-FIRST `bloopProvider` seam** (app green/offline, CI never hits network).
  **Chat is OFF by default + parent-gated.**
- **Bloop = TWO layers.** (A) always-on DETERMINISTIC character (Rive/Lottie + shipped `BubbleBuddy` fallback,
  baby-schema, **never withers/sulks/guilt-trips** — compile-enforced positive-only union) + (B) off-by-default,
  parent-gated, server-moderated chat. **The product fully works with the LLM disabled.**
- **`neuroProfile` axis** (autism = predictable/low-stim · ADHD = novelty/bright · both = deterministic core +
  opt-in previewed novelty) joins `ageMode` as a **resolver input**; per-child override; **never a raw component
  read.**
- **Evidence-honesty.** Build GENERIC mechanisms; NO Zones-of-Regulation™/Social-Stories™ efficacy claim (not EBPs),
  NO AAC speech-gain promise (promise *communication access*), NO SI/therapy/cure claim. **Scaffolds, not therapy.**
- **COPPA-2025 + UK Children's Code as hard law:** verifiable parental consent, retention TTL, PII redaction before
  storage, **NO ad/analytics SDKs in the kid app**, LLM provider bound as a **non-training processor**.
- **License clean.** Ship only MIT/Apache/BSD + CC-BY/public-domain/original. GPL/AGPL (cboard/CoughDrop/
  OpenAAC-flutter/otsimo) = **reference-only**. **ARASAAC (CC-BY-NC-SA) + Sclera (CC-BY-NC) are NON-COMMERCIAL →
  excluded**; ship a cleared symbol set. Keep v1's anti-shame + provenance discipline.
- **Stack:** Expo SDK 56 / RN 0.85 / React 19.2 / TS 6 / zustand v5 / NativeWind v4; Firebase JS SDK (apps) +
  firebase-admin/firebase-functions (functions); providers = Gemini Flash default / DeepSeek alternative.

**The single most important structural fact (carried from v1):** every v2 **on-device** addition is a **purely
additive delta**. `SCHEMA_VERSION` stays **1** and `MIGRATIONS` stays **[]**. Every on-device change is one of
exactly three additive shapes — an optional field on an existing persisted interface, a union-member widening, or a
brand-new independently-persisted store slice (`02-architecture.md` §2.2, §7.3). The parent app + Firestore evolve
**additively too** (default-fill missing fields on read; `functions/` is a separate Node toolchain, never bundled by
Metro). No milestone below changes the shape or meaning of any existing persisted field.

---

## 1. The eight workstreams → six phases (grouping)

The eight workstream specs map onto **six phases**, each a set of milestones. **w8 is deliberately split**: its
shared primitives (the `neuroProfile` axis + the compliance data modules) land **early** (P1) because everyone
consumes them; its ship-gates + red-team + deploy land **last** (P6). Each phase leaves both apps green and the kid
core fully functional offline/LLM-off.

| Phase | Theme | Workstream(s) | Milestones |
|---|---|---|---|
| **P0** | Baseline gate | *(none — verify shipped v1 is green)* | M0 |
| **P1** | Monorepo + backend + auth | **w0** migration · **w8**(primitives) · **w1** | M1.0, M1.1, M1.1b, M1.2 |
| **P2** | LLM proxy, mock-first | **w2** | M2.0, M2.1 |
| **P3** | Parent app | **w3** | M3.0, M3.1 |
| **P4** | Kid autism toolkit | **w4** · **w5** · **w6** | M4.1, M4.2, M4.3 |
| **P5** | Bloop | **w7** | M5.1, M5.2 |
| **P6** | Safety-hardening + deploy | **w8**(gates) · providers · deploy | M6.1, M6.2 |

> **Why P2 (proxy, mock-first) precedes P4 (autism toolkit) even though the architecture builds autism engines
> before the real proxy.** The proxy is **mock-first behind a seam**: P2 ships the `bloopProvider` port +
> `MockBloopProvider` + the proxy pipeline running against a `mockModel`, wiring **no** real provider. It does not
> block the autism toolkit (which has no model in the loop) and it front-loads the safety contract + red-team
> harness so P5 (Bloop chat) can consume a proven port. The **real** Gemini/DeepSeek providers are only wired in
> **M6.2**. This is a valid topological order (see §2); the autism engines land in P4 and the one soft edge
> (w5's parent-side `narrativeDraft` convenience) degrades gracefully if P2 were reordered.

**Parent-app authoring note (resolves the w3↔w5 overlap + the orphaned A1/D6 authoring):** the parent app's
**core** oversight surfaces (auth/consent/dashboard/timeline/transcripts/report/controls/alerts/data-rights) are
**P3 (w3)**. **ALL** parent-app **authoring builders** — schedule/first-then/narrative/video **AND the AAC
board-builder (A1/D6)** — ship **with their kid-side features in P4 (M4.2, w5's authoring cluster)**, under
`apps/parent/app/(authoring)/` (`board-builder.tsx` writes cleared-`assetKey` boards to Firestore; there is **no
phantom "w-parent-authoring" workstream**). So P3 delivers a complete, usable parent app; M4.2 adds every authoring
tab to it.

**Explicitly DEFERRED beyond v2 (not forgotten — descoped):** feature-matrix **A11** (AAC-beyond-requesting),
**A12** (work-system view), **A13** (parent AAC vocabulary analytics), and the **`voice` inputMode** (the union
member exists; the STT/biometric pipeline is out of v2 scope — w2 §9.9). In v2, AAC authoring is the on-device
custom-tile sheet (w4 §2.2) + the parent board-builder (M4.2); AAC input to chat is chips/AAC-symbol only.

**Shared-extraction milestone M1.1b (folds into P1):** the RN-free v1 modules the parent app + resolvers depend on
are extracted to `packages/shared` as part of P1 — `resolveCapabilities`/`resolveTokens`/`resolveContent`/
`resolveCelebration`/`resolveStatusPresentation`, `domain/report.ts` (`buildReport`/`ReportModel`),
`services/reportHtml.ts` (`renderReportHtml`), `domain/moodInsight.ts` — one module per commit (BUILD-GUIDE §4
extraction discipline), kid suite green each step. Named so M3.0/M3.1 can `import` them from `@tiny-bubbles/shared`.

---

## 2. Dependency graph (hard edges → ordering)

From `02-architecture.md` §6. **HARD** = blocks (must land first); **SOFT** = degrades gracefully if later.

```
                         ┌───────────────────────────────────────────────┐
                         │  w0  MONOREPO MIGRATION  (M1.0)                │
                         │  git mv → apps/kid · root workspaces ·         │
                         │  tsconfig.base + Metro aliases · packages/     │
                         │  shared skeleton · functions/ toolchain ·      │
                         │  RETARGET no-egress gate                       │
                         └───────────────┬───────────────────────────────┘
                                         │ (HARD prerequisite for ALL)
        ┌────────────────────────────────┼────────────────────────────────┐
        ▼                                ▼                                 ▼
┌─────────────────┐            ┌────────────────────────┐      (feature workstreams pull
│ w8 SHARED PRIMS │            │ w1 BACKEND / DATA      │       from w8 + w1 as they land)
│ NeuroProfile +  │◀── pii/ ──▶│ Firestore schema · Auth│
│ resolveNeuro-   │   crisis/  │ + COPPA consent · sync │
│ Preset ·        │   consent  │ adapter · redactPii ·  │
│ compliance/* ·  │            │ verifyIdToken ·        │
│ CI gate scaffs  │            │ sendParentAlert · rules│
│ (M1.1)          │            │ · TTL   (M1.2)         │
└──────┬──────────┘            └───────────┬────────────┘
       │                                   │ provides functions/ scaffold + interceptor
       │                                   ▼ + redactPii + sendParentAlert
       │                        ┌────────────────────────────┐
       │                        │ w2 LLM PROXY / GUARDRAILS   │  imports w8 crisis/pii/evidence;
       │                        │ port+MockBloopProvider(M2.0)│  extends w1 interceptor;
       │                        │ shields·persona·crisis·model│  authors functions/__tests__/redteam
       │                        │ (mock-first)         (M2.1) │  (cases ← w8)
       │                        └──────┬───────────────┬──────┘
       │            provides port+mock │               │ writes transcripts/alerts + FCM
       ▼                               ▼               ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌────────────────────────────┐
│ w4 AAC (M4.1)│ │ w6 REGUL.    │ │ w7 BLOOP     │ │ w3 PARENT APP (M3.0/M3.1)  │
│ owns Symbol/ │ │ (M4.3) emo · │ │ char+chat    │ │ auth · consent · dashboard │
│ Board prim.  │ │ sensory ·    │ │ (M5.1/M5.2)  │ │ · transcripts · controls · │
│              │ │ break · calm │ │ consumes w2  │ │ alerts · data-rights       │
└──────┬───────┘ └──┬───────────┘ │ port+mock;   │ │ (reader of w1/w2)          │
       │ Symbol/    │ shares B5    │ shares B5    │ └────────────────────────────┘
       │ Board      │ panel w/ w7  │ panel w/ w6  │
       ▼            └──────────────┘──────────────┘
┌────────────────────┐
│ w5 VISUAL SUPPORTS │  consumes w4 Symbol/Board; adds narrativeDraft intent into w2's proxy
│ (M4.2) schedule/   │
│ first-then/trans/  │
│ video/narrative    │
└────────────────────┘
```

| Milestone (WS) | HARD depends on | SOFT depends on |
|---|---|---|
| **M1.0** w0 | — | — |
| **M1.1** w8-prims | M1.0 | — |
| **M1.1b** shared extraction | M1.1 | — |
| **M1.2** w1 | M1.0, M1.1 (`compliance/pii` import — redactPii) | M1.1b (report modules for the snapshot writer) |
| **M2.0** w2 contract+seam | M1.0, M1.2 (functions scaffold), M1.1 (pii/crisis/evidence) | — |
| **M2.1** w2 pipeline | M2.0 | — |
| **M3.0** w3 shell+consent | M1.0, M1.2, M1.1 (consent/disclosure copy) | — |
| **M3.1** w3 monitoring/controls | M3.0 | M2.1 (transcripts/alerts), M4.1/M4.2 (authoring types) |
| **M4.1** w4 AAC | M1.0, M1.1 (neuroProfile + symbol-license gate) | M1.2 (sync) |
| **M4.2** w5 visual supports | M1.0, M4.1 (Symbol/Board), M1.1 (neuroProfile) | M1.2 (sync/Storage/rules), M2.1 (narrativeDraft) |
| **M4.3** w6 regulation | M1.0, M1.1 (neuroProfile — coordinate ThemeProvider thread) | M4.1 (break tile), M1.2 (sync) |
| **M5.1** w7 character | M1.0, M1.1 (neuroProfile) | M4.3 (shared panel + neuro thread) |
| **M5.2** w7 chat surface | M5.1, M2.0 (port+mock) | M3.1 (`bloopEnabled` gate), M4.1 (AAC input) |
| **M6.1** w8 ship gates | M1.1 and every prior milestone (gates scan all trees) | — |
| **M6.2** providers + deploy | M2.1, M6.1 | — |

**Coordinate-once seams (do them once, in the earliest milestone that touches them):** the `NeuroProfile` union +
`ChildProfile.neuroProfile?` field placement + the `ThemeProvider` `neuroProfile` thread is **w8-owns-the-axis /
w6-owns-the-field-placement** — landed in **M1.1** and consumed everywhere; if a later WS needs it before its
milestone it adds the union defensively and w8 reconciles (one definition). The Sensory & autonomy **B5 panel** is
shared by w6 (M4.3) + w7 (M5.1) — one panel, two owners. `functions/src/index.ts` + `interceptors/verifyIdToken.ts`
are co-owned (w1 base in M1.2, w2 extends in M2.1).

---

## 3. The milestone cards

Each card names its **workstream spec** (the ONE spec the build-agent reads for that milestone), **effort**,
**HARD deps**, the **new persisted/Firestore/functions surface**, and **per-milestone acceptance**. Every card's
acceptance ends with the **standing invariant**: *both apps green + kid core fully functional with network + LLM
OFF*. Full verify commands + grep gates are in `03-BUILD-GUIDE.md` §2–§3; the spec's own §7 is the detailed contract.

---

### M0 — Baseline gate *(no spec; verify the shipped v1 tree)*
- **Effort:** S. **Deps:** —.
- **Do:** confirm the shipped `tiny-bubbles/` tree is green **before** any migration:
  `tsc --noEmit` = 0, `jest` = 69 suites, `npx expo export --platform web` succeeds; note the exact baseline suite
  count (the floor may only grow). Confirm `SCHEMA_VERSION = 1`, `MIGRATIONS = []`.
- **Acceptance:** the three-command floor is green on the untouched v1 tree; baseline recorded. **Nothing built.**

---

## PHASE P1 — Monorepo + backend + auth  (w0 · w8-primitives · w1)

### M1.0 — Monorepo migration (w0)  *(spec: `01-current-and-target.md` §2, `02-architecture.md` §1)*
- **Effort:** M. **Deps:** M0. **Surface:** repo layout; no app-logic change.
- **Do (Phase 2A, ZERO app-code change first):** `git mv tiny-bubbles/ → apps/kid/`; add root `package.json`
  (`"workspaces": ["apps/*","packages/*","functions"]`, `"private": true`) + hoisted root `package-lock.json`;
  rename `apps/kid/package.json` → `@tiny-bubbles/kid`; the ONE file that must change is `apps/kid/metro.config.js`
  (monorepo `watchFolders=[root]` + `nodeModulesPaths` + `disableHierarchicalLookup` +
  `resolver.assetExts.push("riv")` + `resolver.blockList` for `functions/node_modules` (+ the other app's), keeping
  `withNativeWind({ input: "./global.css" })`; the client-bundle guarantee is import-graph-based, not a watchFolders
  exclusion — §arch 1.3). **Then (Phase 2B):** add `tsconfig.base.json` (the `@tiny-bubbles/shared` path map) +
  Metro `extraNodeModules`; scaffold `packages/shared` (`package.json` `"main":"src/index.ts"`, `tsconfig.json`
  **`composite:true`**, `src/index.ts` barrel) and the `functions/` toolchain (own `package.json` + `node_modules`
  + `tsconfig.json` that **`references` `packages/shared`** + jest `moduleNameMapper` for the alias); scaffold
  `apps/parent` with **one trivial route + a passing smoke test** (config mirrors kid). **Retarget**
  `apps/kid/__tests__/config/no-network.test.ts` to scan `apps/kid/{app,src,components}` +
  `apps/parent/{app,src,components}` and **exclude `functions/`**. First-run install: `npm install` (root) then
  `npm --prefix functions install`.
- **Acceptance:**
  - Phase-2A checkpoint: `npm -w @tiny-bubbles/kid run typecheck` = 0 and `npm -w @tiny-bubbles/kid test` = the
    baseline suites (69) green, Expo Go boots. **No app source touched → behaviorally identical to v1, verified by
    the re-run 69-suite floor + `expo export` (hoisting to one lockfile may dedupe transitive versions, so "byte-
    identical lockfile" is not claimed — behavior is).**
  - `npm -w @tiny-bubbles/shared run typecheck` = 0 (empty barrel), `functions/` `tsc -b` = 0.
  - `@tiny-bubbles/shared` resolves in `tsc` (app: `paths`; Node: project references), Metro (`extraNodeModules`),
    and jest (functions/shared `moduleNameMapper`).
  - **`apps/parent` is itself green:** `npm -w @tiny-bubbles/parent run typecheck`+`test`+`export:web` pass, so
    `npm run verify:all` (the STEP-0 baseline) is green from M1.0 onward.
  - Retargeted no-egress gate green; `functions/` excluded.
  - **Standing invariant:** kid app fully functional offline/LLM-off (unchanged from v1).

### M1.1 — Shared primitives: the neuroProfile axis + compliance modules + CI gate scaffolds (w8-primitives)  *(spec: `w8-safety-compliance-neuroprofile.md` §3–§4)*
- **Effort:** M. **Deps:** M1.0. **Surface:** `packages/shared/src/domain/types.ts` (union widening +
  `neuroProfile?`), `packages/shared/src/theme/resolveNeuroPreset.ts`, `packages/shared/src/compliance/*`.
- **Do:** extract the v1 domain **types** to `packages/shared/src/domain/types.ts` (first extraction, per §2B) and
  add `NeuroProfile`/`NoveltyMode`/`FeedbackTempo`/`NeuroPreset` + the optional `neuroProfile?` field; author
  `resolveNeuroPreset` (`NEURO_PRESETS`, `NEUTRAL_PRESET`, absent ⇒ neutral) and thread `neuroProfile` into
  `resolveCapabilities`/`resolveTokens`/`resolveContent` (precedence: explicit override > preset > ageMode base;
  OS Reduce-Motion always clamps) + the `ThemeProvider` `ThemeInputs`/`DEFAULT_INPUTS = "both"` thread (the
  coordinate-once seam). Author the compliance modules: `compliance/evidenceHonesty.ts` (bans the **BARE**
  trademarks + speech near-misses, word-bounded — §8 #23), `compliance/pii.ts` (the SINGLE PII taxonomy — the §8 #7
  **superset** incl. `gov_id`/`dob`/`school_name`/`geolocation` — + `redactPii`), `compliance/crisisResources.ts`
  (`SAFE_MESSAGING` + `CRISIS_RESOURCES` seed with **EVERY card `reviewed:false` — including `en-US`/988 — until a
  psychologist `CRISIS_REVIEW_SIGNOFF`**, §8 #16b; `resolveCrisisCard(locale, crisisType)`; `GENERIC_FALLBACK_CARD`)
  + `compliance/crisisReview.ts`, `compliance/retention.ts` (`defaultDays:30`), `compliance/consent.ts`,
  `compliance/symbolLicense.ts` (canonical `SymbolLicense`/`SymbolAssetManifestEntry` + `assertSymbolManifestClean`
  incl. completeness). Scaffold the CI gates under `packages/shared/__tests__/gates/` (`neuro-golden-rule`,
  `evidence-honesty`, `crisis-review`, `symbol-license`, `no-invented-hotline`) — they may pass **vacuously** now
  (no feature copy / empty symbol manifest yet) and tighten as features land; the aggregate `scripts/ship-gate.sh`
  is scaffolded but finalized in M6.1.
- **Acceptance:**
  - `npm -w @tiny-bubbles/shared run typecheck` = 0; `resolveNeuroPreset.test.ts` asserts each preset + **absent ⇒
    NEUTRAL**; `resolveCapabilities.test.ts` proves **omitting `neuroProfile` ⇒ output byte-identical to pre-w8**.
  - `pii.test.ts` redacts every `PiiCategory` incl. `full_name`/`school_name` fuzz (records the category, never the
    value); `retention.test.ts` `computeTtlAt` correct (default 30); `evidence-honesty.test.ts` rejects the BARE
    `zones of regulation`/`social stor(y|ies)` (no efficacy word needed) and word-bounded cure/therapy;
    `crisis-review.test.ts` proves `resolveCrisisCard` **never invents a number** (unknown → `GENERIC_FALLBACK_CARD`)
    + `SAFE_MESSAGING` has no means/method + `assertCrisisTableReviewed` blocks on any `reviewed:false` launch locale
    (incl. en-US pre-sign-off).
  - `apps/kid` migration-forward fixture extended with `neuroProfile?` → **`SCHEMA_VERSION` still 1, `MIGRATIONS`
    []**; kid suite green; `neuro-golden-rule` gate = 0 raw `neuroProfile ==|===|!==` in render paths.
  - **Standing invariant:** the axis resolves entirely on-device; kid app fully functional offline/LLM-off; existing
    children (no `neuroProfile`) behave byte-identically to v1.

### M1.1b — Extract the RN-free v1 resolvers + report modules to `packages/shared` (w0/w8)  *(spec: `02-architecture.md` §2.1, `03-BUILD-GUIDE.md` §4 extraction discipline)*
- **Effort:** S–M. **Deps:** M1.1. **Surface:** move (one module per commit, re-export from `apps/kid`) the RN-free
  resolvers + report domain into `packages/shared/src/theme/*` + `domain/report.ts` + `services/reportHtml.ts` +
  `domain/moodInsight.ts`.
- **Do:** extract `resolveCapabilities`/`resolveTokens`/`resolveContent`/`resolveCelebration`/
  `resolveStatusPresentation` + `buildReport`/`ReportModel`/`renderReportHtml`/`moodInsight` (all pure, RN-free) to
  `packages/shared`; leave a thin re-export in the old `apps/kid` path so kid imports are unbroken; kid suite green
  each commit. This is what M3.0/M3.1 `import` from `@tiny-bubbles/shared` (the parent Report + Timeline reuse).
- **Acceptance:** each moved module has a passing shared test; `npm -w @tiny-bubbles/kid test` green after each
  commit (bisectable); `npm -w @tiny-bubbles/shared` green; no `apps/kid` behavior change.
  **Standing invariant:** kid app fully functional offline/LLM-off; extraction is behavior-preserving.

### M1.2 — Backend + data model + auth/consent + sync adapter (w1)  *(spec: `w1-backend-data.md`)*
- **Effort:** H. **Deps:** M1.0 (+ M1.1 for `compliance/pii` import). **Surface:** `functions/src/{firebaseAdmin,
  auth,consent,data,retention,alerts,interceptors}`, `firestore.rules`/`storage.rules`/`firestore.indexes.json`/
  `firebase.json`; `packages/shared/src/firestore/types.ts` + `sync/types.ts`; `apps/kid/src/sync/*` (the ONE kid
  egress module) + `tb/sync` slice; `apps/kid` `no-analytics` gate.
- **Do:** author the canonical Firestore doc types (`02-architecture.md` §2.3, incl. **`ReportSnapshotDoc`**) in
  `packages/shared/src/firestore/types.ts` + `paths.ts`. Build `functions/`: `beforeUserCreated` (COPPA gate),
  `onParentCreated`, `provisionChild` (seeds `settings.controls.bloopEnabled=false`), `pairKidDevice(code,
  localCid?)` (links a pre-existing offline child, §8 #21c), `recordConsent` (**rejects `dev_mock` outside the
  emulator; requires a real VPC — `payment-verified` ships**, §8 #29), `seedGlobalConfig`, **`deleteChildData`
  (SKIP `legalHold` docs)**, `ttlSweep` + `onRetentionChange` (both skip `legalHold`), `sendParentAlert` (FCM +
  email fallback + unacknowledged re-escalation, §8 #26), `interceptors/verifyIdToken` (server-authoritative:
  `childId===uid`, loads settings). **Import `redactPii` from `@tiny-bubbles/shared/compliance/pii` — do NOT
  author it here** (§8 #7). Author `firestore.rules` from the donor **locked default** (`allow read,write: if
  false`), opened per-collection by ownership + guardian-link + role claim; transcripts/alerts admin-only-write +
  parent-read; **`reports` kid-write own child / parent-read** (§8 #21). Build the kid **sync adapter**
  (`apps/kid/src/sync/{firebase,cloudSync,syncQueue,fcmToken,settingsSync}.ts`; `firebaseConfig` from
  `EXPO_PUBLIC_*` env, §1.4) behind a dynamic import gated by `cloudSyncEnabled` (default false): one-way-UP
  activity via the **shared `emitActivity` seam (ALL producers, every `ActivityKind`)** + `computeAndSyncReportSnapshot`
  → `reports/{rangeKey}` + two-way settings. Per-platform FCM token registration (Android
  `getDevicePushTokenAsync`=FCM; iOS `@react-native-firebase/messaging`; record token TYPE, §8 #26). `retentionDays`
  default **30**. Add the `tb/sync` slice; wire `gameplay.completeStep`/`completeScheduleStep` → `emitActivity`,
  `wipeAllChildData` → clear `tb/sync`. Add the `no-analytics` gate. `functions/package.json` gets the
  `build:deploy` esbuild bundling script (§1.5, exercised at M6.2).
- **Acceptance:**
  - `functions/` `tsc -b` = 0; `firebase emulators:start --only auth,firestore,functions,storage` boots.
  - `rules.test.ts` (emulator): default-deny holds; parent reads/writes only own `users`+`children/*`; kid can
    **create** own `activity` + own `reports/{rangeKey}` but cannot read/write `transcripts`, cannot write
    `settings.controls`, cannot read `alerts`; transcripts/alerts admin-only-write + parent-read. `auth.test.ts`:
    `provisionChild` rejected without `consentVerified` AND without a non-mock VPC method; **`recordConsent` rejects
    `dev_mock` under a prod-like config** (§8 #29); kid uid blocked without a provisioned child. `redactPii.test.ts`
    (imported shared): no raw PII survives (incl. name/school fuzz) + the doc has no raw-PII field. `retention.test.ts`:
    `expiresAt` stamping (default 30) + `onRetentionChange` re-stamp + `ttlSweep` + **`legalHold` docs are NOT
    swept/deleted**.
  - `apps/kid`: `cloudSync.test.ts` (offline outbox queues; online drain idempotent; settings LWW; **an emission for
    EACH `ActivityKind` incl. non-gameplay mood/break/breathing/movement**, §8 #6; `computeAndSyncReportSnapshot`
    writes a PII-free `ReportSnapshotDoc`); **no-egress gate green** (`src/sync/**` + Firebase SDK only, no
    `https://` literal — env config); **no-analytics gate green**; migration-forward fixture extended with `tb/sync`
    → **`SCHEMA_VERSION` still 1**; `npx expo export` succeeds with `cloudSyncEnabled:false` (a no-Firebase build).
  - **Standing invariant:** with `cloudSyncEnabled:false` (default) the kid core is fully functional offline/LLM-off;
    Firebase is provably additive.

---

## PHASE P2 — LLM proxy, mock-first  (w2)

### M2.0 — Shared bloop contract + mock-first kid seam (w2)  *(spec: `w2-llm-proxy-guardrails.md` §4, §6.1, §6.3)*
- **Effort:** M. **Deps:** M1.0, M1.2. **Surface:** `packages/shared/src/bloop/{provider,moderation,topics,
  transcript,quickReplies,mock,index}.ts`; `apps/kid/src/services/{bloopProvider,bloopProxyProvider}.ts` +
  `src/config/flags.ts` `BLOOP_PROXY_ENABLED`.
- **Do:** author the `BloopProvider` port + `BloopTurnInput`/`BloopContext`/`ModeratedReply`/`ModeratedReplyStatus`/
  `QuickReply`, the **ONE canonical `InputMode` union + `toInputMode()` mapper** (§8 #19), the moderation taxonomy
  (`ModerationCategory`/`ScanStage`/`OnFailAction` enum/`ModerationFlag`), `TopicCategory`+`ALL_TOPICS`,
  transcript/`BloopConfig` types (**`CrisisCard`/`CrisisResource` are IMPORTED from `compliance/crisisResources.ts`,
  not re-declared** — §8 #20), the curated `quickReplies` catalog, and **`MockBloopProvider`** (deterministic,
  offline, exercises **every** `status` incl. crisis/PII/off-scope). Author the mock-first client seam mirroring `src/services/purchases.ts`: `bloopProvider.ts` selects
  `MockBloopProvider` by default, the real `bloopProxyProvider` (Firebase SDK `httpsCallable("bloopTurn")`, no raw
  `fetch`/URL literal) only under `EXPO_PUBLIC_TB_BLOOP_PROXY=1`.
- **Acceptance:**
  - `npm -w @tiny-bubbles/shared run typecheck` = 0; `npm -w @tiny-bubbles/kid test` green incl.
    `bloopProvider.test.ts` (**mock is the default**, every `status` reachable **offline**, real provider only under
    the flag).
  - **No-egress gate green:** no `fetch(`/`https://` literal anywhere in `apps/kid`; grep proves all `sendTurn` call
    sites go through `services/bloopProvider.ts`. `npx expo export` succeeds; the bundle contains **no `functions/`
    code**. No on-device schema bump (`SCHEMA_VERSION` stays 1).
  - **Standing invariant:** with the mock provider the app is green/offline; the child core is untouched.

### M2.1 — Proxy pipeline (functions) + crisis + red-team scaffold, mock-first (w2)  *(spec: `w2-llm-proxy-guardrails.md` §3, §5, §6.2)*
- **Effort:** H. **Deps:** M2.0. **Surface:** `functions/src/bloop/*` (pipeline, shields, persona, scripted
  branches, on-fail, crisis, rateLimit, redact, transcript, config, providers/`mockModel`), the callable `bloopTurn`
  + transcript `onWrite` trigger + TTL cron; `functions/__tests__/{shields,pipeline,crisis,redteam}`.
- **Do:** build the turn pipeline (`auth[server-authoritative: childId===uid, load settings server-side; HARD-STOP
  if bloopEnabled=false — NO model call] → quietHours+sessionMinutes+rate-limit → INPUT SHIELD → topic-scope →
  crisis detect → scripted branch else MODEL CALL (against `mockModel` only in this milestone; input spotlighted
  over the N=4 history window) → OUTPUT SHIELD [SEMANTIC classifier — Model Armor/DLP or bundled; regex-only ⇒ chat
  stays OFF] + output crisis re-check + crisis-aware no-refusal → on-fail → PII-redacted transcript write`). Port
  llm-guard regex/substring scanners 1:1 to TS; author the persona (B3), scripted branches, the `OnFailAction`
  state machine (fail-safe: any error ⇒ REFRAIN), the **differentiated** crisis pathway (§8 #27): self-harm/distress
  → `resolveCrisisCard` + `alerts` doc + `sendParentAlert` (FCM+email, re-escalation); **abuse/CSAM → child-directed
  resources + `safetyReports/{id}` (NCMEC/mandated-reporter), NO parent auto-alert, `legalHold:true`**;
  belt-and-suspenders `onWrite`. Crisis detector + semantic classifier are a **non-disableable floor**. Providers
  sit behind one `ModelProvider.generate` interface; **only `mockModel` is wired** (Gemini/DeepSeek are M6.2, and
  DeepSeek stays gated OFF, §8 #31). Author the C10 red-team suite from w8's case catalog (incl. multi-turn +
  semantically-unsafe-non-regex output cases).
- **Acceptance:**
  - `functions/` `tsc -b` = 0; `functions` unit tests green: each scanner; `pipeline.test.ts` asserts the §3 order,
    an **unsafe `mockModel` reply is caught by the output shield** (REFRAIN), and any thrown error ⇒ fail-safe canned
    line (never raw output). **Server-authoritative (§8 #28):** callable returns `disabled` with **NO model call**
    when server `bloopEnabled=false`; a client passing wider scope/older ageMode/foreign childId is **overridden**.
    **Semantic classifier (§8 #30):** `output-classifier.test.ts` — non-regex semantically-unsafe outputs → REFRAIN/
    FILTER; chat cannot enable without a working classifier; crisis+classifier are non-disableable by `config.ts`.
    Grep: **no hotline literal outside** `crisis/resources.ts` (which imports the shared reviewed table); the model
    reply is **never a return path** unshielded.
  - `crisis/*.test.ts`: recall-biased detection **on input AND output AND session level** (indirect ideation/abuse/
    method-seeking) → locale-correct **reviewed** card (US→988, `en-IN`→India table, unknown→generic), safe-messaging
    has **no means/method**. **Differentiation (§8 #27):** self-harm/distress → `alerts` (`severity:"crisis"`) +
    FCM+email + re-escalation; **abuse/CSAM → `safetyReports/{id}` (NCMEC/mandated-reporter), NO parent auto-alert,
    transcript `legalHold:true` (NOT swept)**. Emulator: transcript PII-redacted + `expiresAt`; parent-offline still
    returns the child a safe response.
  - **Red-team gate** `redteam.test.ts` passes all cases (indirect ideation→crisis+alert; method-seeking→blocked;
    abuse→abuse-crisis+NCMEC no-parent-alert; "hide from mom"→no-secrecy+alert; persona-override & invisible-unicode
    & **multi-turn split-payload**→blocked/stripped; PII inbound→refused, no raw PII stored; off-scope→redirect no
    model call; poisoned + **semantically-unsafe-non-regex** reply→output FILTER/REFRAIN).
  - **Standing invariant:** `apps/kid` still green with the **mock** provider (default); no client egress added; the
    child core is fully functional offline/LLM-off (chat still OFF by default).

---

## PHASE P3 — Parent app  (w3)

### M3.0 — Parent app shell + auth + COPPA consent gate + dashboard (w3)  *(spec: `w3-parent-app.md` §2 S0–S5, §4.1–§4.4)*
- **Effort:** H. **Deps:** M1.0, M1.2, M1.1. **Surface:** `apps/parent/` config + `src/firebase/*` + `src/services/
  {consent,children,fcm}.ts` + `src/state/{authStore,childrenStore}.ts` + `app/(auth)/*` + `app/(app)/{dashboard,
  onboarding/add-child}.tsx`.
- **Do:** scaffold the Expo SDK 56 app (expo-router; monorepo Metro identical to kid; **no** ad/analytics SDK).
  Port the donor auth (JS→TS, **scrub committed demo creds**): boot/route-dispatch, login, register, forgot-password.
  Build the COPPA consent screen (renders w8's `CURRENT_AGREEMENT`; granular opt-in; verifiable step → append-only
  `ConsentRecord`). Build add-child (first-name only, `ageMode`/`neuroProfile`/sensory selectors via labels, seeds
  `settings.controls` with **chat OFF**). Build the dashboard (children cards, glanceable activity strip, chat-status
  pill, alert badge, persistent AI-disclosure banner) on Firestore `onSnapshot`. Register the device FCM token.
- **Acceptance:**
  - `npm -w @tiny-bubbles/parent run typecheck` = 0; `npm -w @tiny-bubbles/parent test` green
    (`authStore.test.ts` routes signed-out→login, no-consent→consent, consent+0→add-child, consent+children→
    dashboard; `consent.test.ts` produces a valid append-only record + gates child creation).
  - `npx expo export --platform web` for `apps/parent` succeeds (FCM push degrades gracefully on web).
  - **Retargeted no-egress gate** over `apps/parent/{app,src,components}` = 0 raw egress (all networking via the
    Firebase JS SDK); **no-analytics** grep = 0; **scrubbed-creds** grep = 0; **no raw age axis** in render paths.
  - **Standing invariant:** `apps/kid` untouched and green; the parent app builds and runs; with chat OFF (default)
    everything works (Transcripts shows the calm "chat is off" state).

### M3.1 — Monitoring + controls + alerts + data-rights + SB-243 break-nudge (w3)  *(spec: `w3-parent-app.md` §2 S6–S9, §3.5, §4.5)*
- **Effort:** H. **Deps:** M3.0. **Soft:** M2.1 (real transcripts/alerts). **Surface:** `apps/parent/app/(app)/
  child/[childId]/{timeline,transcripts,transcript/[sessionId],report,controls}.tsx`, `alerts.tsx`,
  `alert/[alertId].tsx`, `settings.tsx`; `src/services/{monitoring,controls,report,dataRights,breakNudge}.ts`;
  components.
- **Do:** build the per-child hub (Timeline reusing `resolveStatusPresentation` triple-coding, anti-shame;
  read-only `react-native-gifted-chat` transcript view with flag highlighting + input toolbar hidden; Report reusing
  the **shared** `buildReport`/`renderReportHtml` from the **w1-produced** PII-free `ReportSnapshotDoc`
  (`reports/{rangeKey}`, real producer §8 #21)), the Controls form (writes `settings/current.controls`: chat master
  switch, input mode, topic scope, per-feature toggles, limits, quiet hours, retention, crisis locale), the Alerts
  inbox (acknowledge/resolve; **always FREE**), the Data & account screen (review + PIN-gated delete-all + withdraw
  consent), and the **SB-243 3-hour break-nudge scheduler** (`breakNudge.ts`, D7, owned HERE — reuses the v1
  `notifications.ts` budget + `isReminderCopyClean` gate; per-3h when chat is on, quiet-hours-gated; §8 fix).
  Reconcile all field names to the canonical Firestore contract (`02-architecture.md` §8: `bloopEnabled`,
  `limits{perMinute,perDay,sessionMinutes}`, `expiresAt`, `crisisLocale`, severity `info|concern|crisis`, etc.;
  `caps.bloopChatAvailable` bound to canonical `bloopEnabled` end-to-end).
- **Acceptance:**
  - Parent typecheck = 0; tests green incl. `controls.test.ts` (defaults seed `bloopEnabled:false`, full topicScope;
    patches stamp `updatedAt/updatedBy`; limits never "unlimited"), `parentReportInput.test.ts`
    (`ReportSnapshotDoc`→shared `buildReport` → anti-shame model; `renderReportHtml` has no `missed|failed|0-day`
    and no external `<script>`/URL), `transcriptMapping.test.ts` (turns → `IMessage[]`, flagged bubbles, **no send
    affordance**), `breakNudge.test.ts` (per-3h nudge scheduled when chat on, quiet-hours + copy-gated, cancelled
    when off; web no-op), `controlsAlias.test.ts` (`caps.bloopChatAvailable` ← canonical `bloopEnabled`, §8 #15).
  - **Grep gates:** `<PremiumGate` = 0 on transcripts/alerts screens (safety never gated); evidence-honesty copy gate
    = 0; no raw age axis in render paths.
  - With the mock proxy (CI) the transcript screen shows the empty state (parent tests never hit the network).
  - **Standing invariant:** kid app green + fully functional offline/LLM-off; parent app is a **reader** of activity/
    transcripts/alerts and a **writer** of consent/children/controls; it never calls an LLM.

---

## PHASE P4 — Kid autism toolkit  (w4 · w5 · w6)

### M4.1 — AAC communication board (w4)  *(spec: `w4-aac-communication.md`)*
- **Effort:** H. **Deps:** M1.0, M1.1. **Soft:** M1.2 (sync). **Surface:** `packages/shared/src/aac/*` (the shared
  Symbol/Board primitive; imports `SymbolLicense` from `compliance/symbolLicense.ts`), `apps/kid/{app/(kid)/talk.tsx,
  components/aac/*, src/state/boardStore.ts (tb/boards), src/theme/resolveAac.ts, src/services/aacSpeech.ts,
  src/data/aacAssets.ts, assets/symbols/* + assets/symbols/manifest.json}`; Firestore `boards`/`symbols`.
- **Do:** author the shared `AacSymbol`/`AacBoard`/`GridSize`/`BoardKind`/`UtteranceItem`/provenance primitive
  (owned here, consumed by w5; **imports/extends the canonical `SymbolLicense`**, does not re-declare — §8 #22),
  `coreVocab`, `defaultBoards`, `.obf` parser, `phrase`. Build the kid renderer (AacQuickAccess ≤1-tap from
  anywhere, board grid, SentenceBar with Speak/Backspace/Clear, folder navigation, parent-gated custom photo/record
  tiles **on-device-only**), the `tb/boards` slice (nav + sentence bar `partialize`d OUT), `resolveAacPresentation`
  (AAC **exempt** from the 3/6 cap; `celebrateUtterance` hard-`false`), and the AAC copy through `ModeKeyed` + the
  speech-gain/cure copy gate (bans the near-miss "may increase speech", §8 #23). Ship a **`[HUMAN]` cleared symbol
  set at the ONE canonical path** — a small original/placeholder set (via `generatePlaceholderSymbols.js`) + its
  rows in `apps/kid/assets/symbols/manifest.json` so the renderer + gate go green NON-vacuously (final
  Mulberry-CC-BY-SA-with-attribution / CC0 / original art before ship). **Do NOT create `src/data/
  aacSymbolManifest.ts` or `assets/aac/symbols/`** (§8 #22). Wire `gameplay` `seedChild`/`removeChild`/
  `wipeAllChildData`.
- **Acceptance:**
  - kid + shared typecheck = 0; unit tests green: `obf.test.ts`, `phrase.test.ts`, `resolveAac.test.ts` (autism ⇒
    stablePositions + celebrateUtterance:false + minimal animation; never a maxChoices-capped vocabulary; **absent
    neuroProfile ⇒ neutral**, §8 #13), `boardStore.test.ts` (nav/sentence-bar `partialize`d OUT), **provenance test
    = `assertSymbolManifestClean(assets/symbols/manifest.json, assets/symbols/)`** (no `NC|ND|GPL|AGPL`; every
    CC-BY/BY-SA has attribution; **completeness** — every file under `assets/symbols/` has a clean row, §8 #22),
    **copy-gate test** (bans speech-gain + near-miss phrases), **spokenLabel invariant**.
  - Migration-forward fixture includes `tb/boards` → **`SCHEMA_VERSION` still 1**; `collectTbSlices()` round-trips
    `tb/boards`. No-egress gate green (AAC is 100% offline); grep: no raw `ageMode`/`neuroProfile`/`sensoryMode` in
    `components/aac/**` (must go through `resolveAac`). `npx expo export` succeeds; `/talk` reachable in ≤1 tap.
  - **Standing invariant:** the **entire** AAC surface works with network + LLM OFF (a non-speaking child's voice is
    never bricked, never celebrated-as-a-task, never premium-gated).

### M4.2 — Visual supports: schedule · first-then · transition · video · narrative (w5)  *(spec: `w5-visual-supports.md`)*
- **Effort:** H. **Deps:** M1.0, M4.1 (Symbol/Board), M1.1. **Soft:** M1.2 (sync/Storage), M2.1 (narrativeDraft).
  **Surface:** `packages/shared/src/domain/visualSupports.ts`; `apps/kid/{src/domain/{schedule,narrative}.ts,
  src/state/{scheduleStore(tb/schedules),narrativeStore(tb/narratives)}.ts, src/services/videoModel.ts,
  components/{schedule,firstThen,narrative}/*, app/(kid)/{schedule,first-then,narrative}.tsx}`; `apps/parent/app/
  (authoring)/{board-builder,schedule-builder,first-then-builder,narrative-builder,video-capture}.tsx` +
  `apps/parent/src/firebase/boards.ts`; `functions/src/bloop/intents/narrativeDraft.ts`.
- **Do:** author the shared `Schedule`/`ScheduleStep`/`TransitionConfig`/`VideoRef`/`SocialNarrative` types; build
  the kid **player** (always-visible now/next strip reusing `TaskRunner`/`StepCard`/`VisualTimer`/`DoneButton`; **no
  auto-advance** — `caps.autoAdvanceSteps` hard-false for ALL profiles; `completeScheduleStep` reuses the shipped
  celebration path, no new token math), **first-then** (re-skin `plans.ts`/`planStore` — one component, two framings;
  card pays no tokens), **transition priming** (reuse `timer.ts`; "I'm ready" tap; timer **rests**, never "time's
  up"), **video-on-step** (feature-detected `videoModel.ts`; missing/offline clip **hides** the button, never blocks
  the step), **narrative viewer** (renders **approved-only**). Build the parent-app **authoring builders — incl. the
  AAC `board-builder.tsx` (A1/D6, resolves the orphaned parent AAC authoring; writes cleared-`assetKey` boards,
  never a child photo)**; add the `narrativeDraft` **intent** to w2's proxy (parent-authenticated, **identical
  shields but its OWN broader topic-scope** for prep situations like dentist/medical, §8; draft lands in the parent
  editor, requires **Approve** before it can sync — the child never receives a draft). Enforce the copy gate (bare
  trademark). Add the two new slices; wire `wipeAllChildData`.
- **Acceptance:**
  - kid + shared + functions typecheck = 0; kid suite green (schedule/first-then/transition/narrative render + domain
    tests). A2: now/next strip (current enlarged, done greyed **never red**), `caps.scheduleUpcomingCount` resolver-
    only, **`autoAdvance` proven hard-false**. A3: two-cell card, no tokens, reuses `assemblePlanPhrase`. A4:
    priming + "I'm ready", calm rest, low-stim forces 1 Hz + no chime. A8: button hidden when offline+uncached, step
    still completable; video is a Storage object never an AsyncStorage blob. A9: kid viewer renders **approved-only**
    (a `bloop`-drafted unapproved narrative renders **nothing**); `assertNarrativeCopyClean` = 0 (bare `social
    stor(y|ies)|zones of regulation|therapy|cure`, §8 #23). **A1/D6 board-builder:** writes reference **only cleared
    `assetKey`s** (no child photo), kid `tb/boards` pull renders it (`board-builder.test.ts`).
  - Migration-forward + schema-roundtrip include `tb/schedules`, `tb/narratives`, `Task.video`, `Task.transition`,
    `ChildSettings.neuroProfile` → **`SCHEMA_VERSION` still 1**. No-egress gate green (video/sync/draft egress lives
    only in `functions/` or the sanctioned sync seam). Functions emulator: `narrativeDraft` requires auth, off-scope
    → refusal, output shield strips disallowed content, PII redacted before write.
  - **Standing invariant:** the player/first-then/transition/narrative-viewing all work **fully from cache** with
    network + LLM OFF; the child-facing player has **no model in the loop, ever**.

### M4.3 — Regulation: emotion-ID · sensory profile · break · breathing/movement (w6)  *(spec: `w6-regulation.md`)*
- **Effort:** M–H. **Deps:** M1.0, M1.1 (coordinate the ThemeProvider `neuroProfile` thread — done once in M1.1;
  extend here). **Soft:** M4.1 (AAC break tile), M1.2 (sync). **Surface:** `packages/shared/src/emotion/taxonomy.ts`;
  `apps/kid/{src/domain/emotion.ts, src/data/emotionStrategies.ts, src/theme/{resolveEmotionCheckin,
  resolveSensoryProfile}.ts, components/kid/{EmotionWheel,EmotionStrategyMenu,BreakButton,DimScrim,visuals/*}.tsx,
  app/(kid)/{emotions,break}.tsx}`; additive `MoodLog`/`ChildSettings.sensoryProfile`/`ChildProfile.neuroProfile`
  fields. **No `functions/` changes.**
- **Do:** port the MIT `feelings-wheel` taxonomy to typed `EMOTIONS` + PALETTE (desaturated). Build emotion-ID +
  strategy menu (age-tiered 6→24→48; intensity + arousal-color off by default for autism; **generic mechanism, not
  Zones™**; logs extend the existing `moods` slice), the persistent **BreakButton** overlay (mirrors `GrownUpsDoor`)
  + break menu (breathe/sounds/move/dim), the guided **movement/wiggle break** (deterministic `nextMovementPrompt`,
  no RNG), the **sensory profile** + low-stim master + `dim` scrim (in-app, no native permission), and the breathing
  **enrichment** (port `stillwave` SVG skins driven by the SAME `breathPhaseAt().scale`; engine unchanged). Author
  the `resolveEmotionCheckin`/`resolveSensoryProfile` resolvers + the **regulation copy gate** (no "Zones of
  Regulation"/therapy/cure/SI).
- **Acceptance:**
  - kid + shared typecheck = 0; suite green (`resolveEmotionCheckin`/`resolveSensoryProfile` exhaustive age×neuro×
    sensory tables; `emotion.test.ts` tier/arousal-softening + banned-interpretation gate). BreakButton on every kid
    surface, hidden over pushed modals. Wiggle break rotates deterministically (no RNG). Low-stim master forces the
    pastel palette + kills particles + mutes pacing haptics, **never disables a parent-enabled channel**; OS
    Reduce-Motion still clamps.
  - `regulation-copy-clean.test.ts` = 0 `zones of regulation|sensory integration therapy|clinically proven|cure`.
    Migration-forward fixture: an old profile without `sensoryProfile`/`neuroProfile` + an old MoodLog without
    emotion fields merge cleanly → **`SCHEMA_VERSION` still 1**. Existing children behave byte-identically.
  - **Standing invariant:** the entire workstream is **LLM-off by construction** — no proxy call, no egress, no
    crisis path here; every feature works fully offline. ("Tell a grown-up" is a warm in-app prompt, **not** the
    crisis pipeline.)

---

## PHASE P5 — Bloop  (w7)

### M5.1 — Bloop deterministic character layer (w7)  *(spec: `w7-bloop-character.md` §2.2, §2.4–§2.5, §3.4)*
- **Effort:** H (art is `[HUMAN]`-authored; the agent lands the deterministic seam). **Deps:** M1.0, M1.1. **Soft:**
  M4.3 (shared B5 panel + neuro thread). **Surface:** `packages/shared/src/bloop/character.ts` (pure
  `resolveBloopState` + `RiveInputContract`); `apps/kid/{src/theme/resolveBloopPresentation.ts, components/bloop/
  {BloopCharacter.native,BloopCharacter.web,useBloopRive,SensoryAutonomyPanel}.tsx, assets/rive/bloop.riv
  (stand-in), src/state/bloopChatStore.ts (in-memory)}` + `metro.config.js` (`assetExts.push("riv")`); reuses
  `tb/buddy` + `tb/quests` unchanged; additive `ChildSettings` Bloop fields.
- **Do:** author the **pure, deterministic** `resolveBloopState(stimulus, ctx)` (no `Math.random`, no `Date.now()`
  inside; `now` passed) → a `BloopCharacterState` with **no negative member** (compile-enforced); the
  `RiveInputContract`; **SPLIT `BloopCharacter.native.tsx` (Rive/Lottie import — native only) + `BloopCharacter.web.tsx`
  (`BubbleBuddy`, NO native import)** so `expo export --platform web` + Expo-Go boot stay green (§8 #25); add
  `resolver.assetExts.push("riv")` to `metro.config.js`; both share the `smile ≥ 0` never-frown clamp;
  `resolveBloopPresentation` (Reduce-Motion
  clamps amplitude + particles unconditionally); the shared **B5 Sensory & autonomy panel** (per-channel toggles +
  presets + bounded autonomy: name Bloop, pick a look from 3–6, Calm Mode, "keep familiar"); the B4 novelty layer
  reusing `questStore` (opt-in, previewed, suppressed under autism/`keepFamiliar`). Fire Bloop **Celebrate** on
  step/routine complete (additive; no change to `onDone`/token logic). Mount `BloopCharacter` at the buddy room +
  celebration sites. `[HUMAN]` scaffolds the `.riv` art + reactive tuning with the sample `blinko.riv` + TODO markers.
- **Acceptance:**
  - kid + shared typecheck = 0; suite green: `bloopCharacter.test.ts` proves **determinism** (same stimulus+ctx ⇒
    same state) + **no negative member reachable** + **no-RNG** grep; `resolveBloopPresentation.test.ts` exhaustive +
    Reduce-Motion clamp; the character renders positive (Rive or `BubbleBuddy` fallback) and **never a frown**.
    `bloop-copy-clean.test.ts` = 0 `always (be )?here|best friend|our secret|AI friend|withering|disappointed|
    miss(es)? you`. B4 novelty suppressed by default under autism/`keepFamiliar`, previewed, no FOMO/expiry copy.
  - Migration-forward fixture: an old `ChildSettings` with no Bloop field merges cleanly → **`SCHEMA_VERSION` still
    1**; the in-memory `bloopChatStore` has zero migration surface. **`npx expo export --platform web` succeeds AND
    Expo-Go boots — proving the `.web`/`.native` split keeps Rive/Lottie off the web/Expo-Go import graph** (§8 #25);
    a `.riv` asset resolves (metro `assetExts`). Grep: no raw `ageMode`/`neuroProfile` in `components/bloop/**`.
  - **Native dev-client checkpoint (§8 #25, not on the web floor):** a one-time Expo dev-client / EAS smoke build
    verifies the Rive character actually renders + `gifted-chat` mounts on RN-0.85/New-Arch (pinned via
    `npx expo install`); reported, not CI-gated.
  - **Standing invariant:** the character has **no model in the loop, ever** — identical on/off, fully functional
    offline; existing children (no Bloop settings) behave byte-identically.

### M5.2 — Bloop chat surface (off-by-default, mock-first) (w7)  *(spec: `w7-bloop-character.md` §2.1, §2.3, §3.3, §3.5)*
- **Effort:** M. **Deps:** M5.1, M2.0 (port+mock). **Soft:** M3.1 (`bloopEnabled` gate), M4.1 (AAC input).
  **Surface:** `apps/kid/{components/bloop/{BloopChat,BloopComposerGate}.tsx, app/(kid)/bloop.tsx}`;
  `resolveCapabilities` gains `bloopChatAvailable`/`bloopInputMode`/`bloopFreeTextAllowed`.
- **Do:** build the `react-native-gifted-chat` surface (`renderAvatar`=`BloopCharacter`, `QuickReplies`/AAC as the
  default input, `TypingIndicator`→**Thinking** state, a **gated** free-text `Composer`). The surface + `bloop` route
  **only render when `caps.bloopChatAvailable`** (parent set `bloopEnabled=true`; **default false**). Wire the turn
  lifecycle to `bloopProvider.sendTurn` (default `MockBloopProvider`): render **only** `ModeratedReply.text`, TTS
  **only** that text, append to the **in-memory** `bloopChatStore`, render `reply.quickReplies` as next chips, render
  every `status` warmly (crisis additionally shows w2's `CrisisCard`). Provide back `caps.bloopInputMode`/
  `bloopFreeTextAllowed` (w2 reads them into `BloopContext`). Clear `bloopChatStore` on wipe/child-switch.
- **Acceptance:**
  - kid typecheck = 0; suite green: `resolveCapabilities.bloop.test.ts` (defaults + gates), `bloopChatStore.test.ts`
    (only approved text stored; cleared on end/switch), `bloop.render.test.tsx` (**chat hidden when
    `bloopChatAvailable=false`** — the default; with chat on + mock provider, turns resolve **offline** and only
    `reply.text` renders). Input mode follows caps (young/autism ⇒ chips/AAC only; free-text only when
    `bloopFreeTextAllowed`). TTS voices `reply.text` only.
  - **No-egress gate green** (the only online path is w2's SDK callable); grep: all `sendTurn` call sites through the
    seam. No on-device schema bump.
  - **Standing invariant:** **chat is OFF by default**; with it off the character is fully present and the chat route
    does not exist; with the mock provider chat is offline + CI-green; the child core is untouched.

---

## PHASE P6 — Safety-hardening + deploy  (w8-gates · providers · deploy)

### M6.1 — Safety hardening: red-team CI + ship gate + written compliance program (w8-gates)  *(spec: `w8-safety-compliance-neuroprofile.md` §4.6, §6, §7)*
- **Effort:** M–H. **Deps:** M1.1 + every prior milestone (gates scan all trees). **Surface:** finalize
  `packages/shared/__tests__/gates/*`; `scripts/ship-gate.sh` + root `"ship-gate"` script; `COMPLIANCE.md`,
  `RETENTION-POLICY.md`, `SHIP-GATE.md`, `docs/dpa/llm-processor-terms.md`; `PROVENANCE.md`/`THIRD_PARTY_NOTICES.md`
  consolidation; App Check enforcement + native Firestore TTL policy config (documented ops).
- **Do:** tighten every cross-cutting gate now that all copy/symbols/features exist: evidence-honesty (bans the
  **BARE** trademarks + speech near-misses, word-bounded, §8 #23) over **all** resolved copy in both apps +
  `functions/src/bloop/persona*` + **`docs/store-listing.md`** (the FTC marketing surface, §8 #23b); crisis-review
  (`assertCrisisTableReviewed` over the **launch locales** — an unreviewed number, **including en-US**, **blocks
  ship** until psychologist sign-off, §8 #16b); symbol-license (`assertSymbolManifestClean` over the ONE
  `assets/symbols/manifest.json` + **completeness**, §8 #22); no-invented-hotline; neuro-golden-rule over both
  apps. Wire the aggregate `scripts/ship-gate.sh` (all workspace typecheck+test → emulator suite incl.
  server-auth/semantic-classifier/VPC-dev_mock-rejected/crisis-differentiation → cross-cutting gates → no-egress
  (w1/w2) → no-ad/analytics (w1) → v1 anti-shame grep → red-team suite (w2) → provenance sign-off). Author the
  **written** COPPA program docs + the DPA terms (incl. the **DeepSeek non-PRC/non-training** decision + the
  **marketing-reviewed** row); record the psychologist sign-off (crisis copy + **abuse/CSAM differentiation**) +
  legal sign-off (consent/DPA/marketing) in `SHIP-GATE.md`. Enable App Check — **native path: production kid build
  = `@react-native-firebase/app-check` (App Attest/Play Integrity); NOT the JS SDK, NOT the CI floor** (§8 #25) —
  + create native Firestore TTL policies out-of-band (TTL/purge **exempts `legalHold` docs**, §8 #27).
- **Acceptance:**
  - `npm run ship-gate` (root) is green end-to-end: every workspace typecheck+test, the emulator suite, the five
    cross-cutting gates, the no-egress gates, the no-ad/analytics grep, the v1 anti-shame grep, and the red-team
    suite. **Any red = no ship.** `crisis-review` passes only when every launch locale's card (incl. en-US) is
    `reviewed:true` with a recorded psychologist sign-off; India/Mexico review is a named launch-critical-path item.
  - `PROVENANCE.md` has a ship-gate sign-off row (neuroProfile/compliance modules `original`; cleared symbol set
    only; crisis table reviewed; additive-only `SCHEMA_VERSION` 1 / `MIGRATIONS` []). Written `COMPLIANCE.md` +
    `RETENTION-POLICY.md` + DPA terms + `docs/store-listing.md` exist and pass the evidence-honesty gate.
  - **Standing invariant:** every gate is LLM-independent or exercised via the **mock** provider — the whole safety
    layer is proven green **before** a single real model call; the kid core stays fully functional offline/LLM-off.

### M6.2 — Wire real providers + deploy (providers · Functions to Firebase · web to Cloud Run)  *(spec: `w2-llm-proxy-guardrails.md` §7, §10; `03-BUILD-GUIDE.md` §8)*
- **Effort:** M. **Deps:** M2.1, M6.1. **Surface:** `functions/src/bloop/providers/{gemini,deepseek}.ts`;
  `firebase.json`/`.firebaserc`; deploy configs.
- **Do:** wire the real providers behind the existing `ModelProvider` interface — **Gemini Flash (Vertex,
  processor-terms path) with explicit `BLOCK_LOW_AND_ABOVE` on every HarmCategory** (Gemini default is OFF) as
  default; a **startup assertion + CI check that the non-training config is real** (Vertex not consumer API,
  prompt-logging off) — **fail closed** if unverifiable (§8 #31). **DeepSeek stays GATED OFF for child data** until
  a signed non-training DPA + verified non-PRC/self-hosted endpoint + residency are recorded (§8 #31). **Build the
  functions deploy bundle** (`build:deploy` esbuild — inlines `@tiny-bubbles/shared` runtime, §1.5/§8 #24), wired
  into `firebase.json` predeploy. Keep the mock as the CI/default build. Deploy **Functions + rules + TTL + App
  Check to `empirical-lens-469401-k0`** with a **post-deploy `pingBloop` smoke-check** (proves cold-start module
  resolution); deploy the **web previews of both apps to Cloud Run**. Before flipping chat on for a locale/tier,
  run the **pre-enablement LIVE red-team** (real provider behind real shields, staging, pass threshold, §8 #30).
  Flip `EXPO_PUBLIC_TB_BLOOP_PROXY=1` only for a real-proxy native build.
- **Acceptance:**
  - With the real provider behind the flag, an emulator/staging turn runs the full shields and returns only shielded
    text; the non-training config assertion passes (else chat is disabled); the CI red-team suite (mockModel) +
    the **staging LIVE red-team** both pass before enablement; the app default build stays on the mock (CI never
    hits the network).
  - `npm --prefix functions run build:deploy` bundles shared runtime; `firebase deploy --only functions,firestore:
    rules,firestore:indexes,storage` targets `empirical-lens-469401-k0` successfully; **`pingBloop` smoke-check
    returns `{ok:true}`** (no `Cannot find module`); native TTL policies (legalHold-exempt) + App Check
    (`@react-native-firebase/app-check`) verified in console. Web previews of `apps/kid`/`apps/parent` deploy to
    Cloud Run and smoke-boot.
  - **Standing invariant:** the shipped default build keeps chat OFF + mock provider; a family who never enables chat
    has a fully functional offline kid app; enabling chat routes through the server output shield, never the model.

---

## 4. The ordered build sequence (the locked topological order)

```
P0:  M0    baseline gate (verify shipped v1 green)
P1:  M1.0  w0  monorepo migration (HARD prereq; green parent shell; metro assetExts/blockList; composite shared)
     M1.1  w8  shared primitives (neuroProfile axis + compliance modules incl. redactPii + gate scaffolds)
     M1.1b     extract RN-free resolvers + report/moodInsight to packages/shared (parent app depends on them)
     M1.2  w1  backend/data + auth/consent(VPC) + sync(emitActivity seam + ReportSnapshot writer) + rules + FCM
P2:  M2.0  w2  bloop contract + MockBloopProvider + mock-first kid seam
     M2.1  w2  proxy pipeline + shields + crisis + red-team (mock-first; mockModel only)
P3:  M3.0  w3  parent shell + auth + COPPA consent gate + dashboard
     M3.1  w3  monitoring + transcripts + report + controls + alerts + data-rights
P4:  M4.1  w4  AAC board (owns the Symbol/Board primitive) + cleared symbol set
     M4.2  w5  visual supports (schedule/first-then/transition/video/narrative) + parent authoring + narrativeDraft
     M4.3  w6  regulation (emotion-ID + sensory profile + break + breathing/movement)
P5:  M5.1  w7  Bloop deterministic character (seam; art is [HUMAN]) + B5 panel + B4 novelty
     M5.2  w7  Bloop chat surface (off-by-default, mock-first)
P6:  M6.1  w8  ship gates + red-team CI + written COPPA program + App Check + TTL policies
     M6.2       wire real Gemini/DeepSeek behind the flag + DEPLOY (Functions → empirical-lens-469401-k0; web → Cloud Run)
```

**Parallelization (if an orchestrator runs worktrees):** after M1.0+M1.1+M1.2 land, **M2.x**, **M3.x**, and **M4.1**
can proceed in parallel (M3.1's transcript view soft-depends on M2.1; degrades to the empty state if M2.1 is later).
Within P4, **M4.1 → M4.2** is a hard edge (Symbol/Board); **M4.3** is independent of M4.1/M4.2 (soft break-tile
edge). **M5.1 → M5.2** is a hard edge; M5.2 needs M2.0. **M6.1** must run after every feature milestone (its gates
scan all trees); **M6.2** is last. Merge serially and re-run the floor after each merge (hot-file merges:
`resolveCapabilities.ts`, `gameplay.ts`, `functions/src/index.ts`, `ThemeProvider.tsx`, `app/(kid)/_layout.tsx`,
`no-network.test.ts`, `types.ts`).

---

## 5. Green-at-every-boundary contract (the load-bearing guarantee)

At **every** milestone boundary, all of the following hold (the BUILD-GUIDE §2 floor + §3 gates enforce them):

1. **Both apps green.** `npm -w @tiny-bubbles/kid run typecheck`+`test`+`expo export`, `npm -w @tiny-bubbles/parent`
   (once it exists), `npm -w @tiny-bubbles/shared`, and `functions/` build+unit(+emulator) all pass. Suite counts
   only grow.
2. **Kid core fully functional with network OFF.** `cloudSyncEnabled:false` (default) → the child core reads/writes
   only the `storage` port; activity queues silently in the outbox; nothing bricks.
3. **Kid core fully functional with LLM OFF.** `bloopEnabled:false` (default) → no chat surface, no proxy call, no
   transcript; the deterministic character + AAC + schedules + first-then + emotion + regulation + token loop all run
   with **zero** model and **zero** egress. The default build uses `MockBloopProvider`; CI never hits the network.
4. **Additive-only on-device.** `SCHEMA_VERSION` stays **1**, `MIGRATIONS` stays **[]**; every new slice is wired
   into backup (`collectTbSlices`), `wipeAllChildData`, `DataReview`, and the migration-forward fixture.
5. **No client egress outside the sanctioned seams.** Kid: `src/sync/**` + the Firebase SDK callable only. Parent:
   the Firebase JS SDK only. All raw egress (LLM providers, DLP, FCM) lives **solely in `functions/`**.
6. **The safety boundary is server-side.** The client renders/TTS only `ModeratedReply.text`; the output shield, not
   the model, holds; crisis is a pre-written region-localized card, never a bare refusal or a model-invented number.
7. **Every v1 invariant carries forward.** Anti-shame (no failure/streak-loss/guilt; positive-only companion),
   curated autonomy, acquisition-only downgrade, no-raw-`ageMode`/`neuroProfile`, TTS-everywhere, triple-coded
   status, offline-first core, provenance discipline.

---

## 6. One-line takeaway

v2 ships in six dependency-ordered phases on the intact green v1 kid app: **P1** lifts it into a monorepo and bolts
on the additive Firebase backend + the `neuroProfile` axis + the compliance modules; **P2** stands up the
super-guardrailed proxy **mock-first** behind the `bloopProvider` seam; **P3** builds the parent oversight app; **P4**
adds the autism toolkit by **re-skinning v1 engines** (AAC + schedules + first-then + transitions + emotion-ID +
regulation); **P5** adds the two-layer Bloop (deterministic character + off-by-default moderated chat); and **P6**
hardens the safety gates, wires the real Gemini/DeepSeek providers, and deploys Functions to
`empirical-lens-469401-k0` + web previews to Cloud Run — where at **every** milestone boundary both apps are green
and the kid core is fully functional with network + LLM OFF, `SCHEMA_VERSION` stays **1**, and the CI ship-gate
blocks any regression.
