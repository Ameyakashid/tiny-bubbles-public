# 03 — v2 BUILD-GUIDE — FINAL (recursive execution playbook)

*FINALIZED 2026-07-10 (four-lens critique applied): §0 states the §2.3/§8-overrides-workstream-§3 precedence rule;
§2 adds the dual-toolchain install order + composite/moduleNameMapper resolution; §3.1 hardens the evidence-honesty
grep (word boundaries + BARE trademark + marketing) and pins the ONE symbol-manifest path; §8.1 adds the esbuild
deploy-bundling predeploy + the `pingBloop` cold-start smoke-check; §5 adds the native dev-client checkpoint.
The HOW for `_build/spec2/00-MASTER-ROADMAP.md`. Written so an ORDINARY build-agent (no top-tier model) can build
Tiny Bubbles v2 **recursively, one milestone at a time, without re-planning**, and a mid-tier orchestrator can drive
the whole build by copy-pasting the loop below. Every command is real and copy-pasteable. The repo has a SPACE in
its path — **always quote it**: `"/Users/ameyakashid/Desktop/adhd india"`. The monorepo root after M1.0 is that
directory (the git root; the shipped tree lives at `apps/kid/`). Firebase project for deploy:
**`empirical-lens-469401-k0`**.*

**Read order for any agent:** (1) this file §0–§4, (2) `00-MASTER-ROADMAP.md` for the milestone you're assigned
(its card: deps, effort, new surface, acceptance), (3) the ONE workstream spec that milestone names (§4 mapping
below), (4) `02-architecture.md` **only** for the cross-cutting section you're touching (§1 monorepo/tooling, §2
data model + the §8 canonical-decision register, §3 resolvers, §4 Bloop seam, §5 safety). **Do NOT read all eight
workstream specs** — read the one for your milestone. The roadmap already resolved the cross-workstream ordering;
you implement, you don't re-plan.

---

## 0. Ground rules (non-negotiable, apply to every milestone)

- **Additive only, on-device.** `SCHEMA_VERSION` stays `1`; `MIGRATIONS` stays `[]`. Every on-device change is an
  optional field on an existing persisted interface, a union-member widening, or a brand-new independently-persisted
  store slice (`02-architecture.md` §2.2, §7.3). If you think you need a non-additive change, STOP — you're doing it
  wrong; re-read the spec. Firestore evolves additively too (default-fill missing fields on read).
- **Green in, green out — for EVERY workspace you touched.** You start from a green tree and leave it green. The
  verify floor (§2) is per-workspace; run the floor for each workspace your milestone modified (`apps/kid`,
  `apps/parent`, `packages/shared`, `functions`) before declaring done.
- **Never brick the child.** At every boundary the kid app must be **fully functional with network OFF
  (`cloudSyncEnabled:false`, the default) AND LLM OFF (`bloopEnabled:false`, the default; `MockBloopProvider`)**.
  If a change would make the child core depend on Firebase or a model, you're doing it wrong.
- **The model is never the safety boundary.** All guardrails live in `functions/src/bloop/*`. The client renders and
  TTS **only** `ModeratedReply.text`. Never add a client→model call. Never render raw model output. Crisis copy is
  the pre-written region-localized card, never a bare refusal, never a model-invented number.
- **Test count only grows.** Never delete or weaken an existing test to make the floor pass. Add tests; fix the code.
- **One workstream spec = one milestone (or its named sub-milestone).** Do not pull work forward from a later
  milestone. If a later feature "would be easy now," don't — it breaks the green-at-boundary contract and the
  provenance mapping.
- **The spec's §7 acceptance + §4 file list are your contract.** Build exactly what the spec says; its "Open
  assumptions" already made the product calls — follow the chosen baseline. Line numbers in specs are **indicative**
  — locate every edit site by GREPPING the named symbol/string, never by trusting a cited `L###`.
- **The canonical register (`02-architecture.md` §2.3 + §8) OVERRIDES each workstream's own §3 "exact TS types"
  where they differ (§8 #33).** The workstream specs were authored 07-09; the register was reconciled 07-10. When
  your milestone's spec §3 disagrees with §2.3/§8 — author the **§2.3/§8 shape**, not the stale draft. Each
  affected workstream now opens with a **⟦v2 FINAL reconciliation⟧** banner listing its specific corrections; read
  it first. Canonical picks include: `bloopEnabled` not `bloopChatEnabled`; `expiresAt` not `ttlAt`;
  `limits{perMinute,perDay,sessionMinutes}`; settings doc `children/{cid}/settings/current` with `controls`+
  `preferences`; `TopicCategory` = w2's enum; PII taxonomy + `redactPii` = `compliance/pii.ts` (import, don't
  re-author); ONE `InputMode` union (§8 #19); `ActivityKind` = the 11-member superset; `ReportSnapshotDoc`
  producer = w1 sync; symbol manifest = `apps/kid/assets/symbols/manifest.json`; retentionDays default 30; barrel
  = one-home-per-symbol (§8 #20). Use the canonical name.
- **No new dependency unless the spec explicitly names it.** Install app deps with `npx expo install <pkg>` (respects
  the SDK-56 pin); install `functions/` deps with `npm --prefix functions install <pkg>`. Record every dep + bundled
  asset in the root `THIRD_PARTY_NOTICES.md` + `PROVENANCE.md`. **License-clean only** (MIT/Apache/BSD + CC-BY/PD/
  original; ARASAAC/Sclera/any-NC and GPL/AGPL are excluded from the shipped tree).

---

## 1. The recursive per-milestone workflow (implement → verify → fix)

Run this exact loop for each milestone `M`. It is self-terminating: you reach a green tree that satisfies the
acceptance criteria, or you surface a blocker.

```
STEP 0 — SETUP
  cd "/Users/ameyakashid/Desktop/adhd india"     # the monorepo root (after M1.0)
  git status                                     # clean tree (or the previous milestone's merged state)
  # confirm you are green BEFORE you start (baseline sanity) — the floor for the workspaces you'll touch (§2):
  npm run verify:all        # or the per-workspace subset; must pass. If not, fix/rebase first.
  git checkout -b feat/<milestone-slug>          # e.g. feat/m1.2-backend-data ; NEVER build on the default branch

STEP 1 — READ (no code yet)
  - Read 00-MASTER-ROADMAP.md → the milestone card (deps, effort, new surface, per-milestone acceptance).
  - Read the ONE workstream spec named by the milestone (see §4 mapping). Read it FULLY.
  - Read only the 02-architecture.md sub-sections your milestone touches (layout §1, data model §2 + §8 register,
    resolvers §3, Bloop seam §4, safety §5).
  - List the spec's §4 "CREATE" and "MODIFY" files. That list IS your task list.
  - NOTE: cited line numbers are INDICATIVE — locate every edit site by GREPPING the named symbol/string.

STEP 2 — IMPLEMENT (follow the spec's file list; shared → server → app → tests)
  - Order within a milestone: packages/shared PURE types/logic first, then functions/ server code, then the
    app store/resolver, then components, then screen wiring, then parent-app screens, then the tests.
    (This keeps tsc erroring on the smallest surface first — the compiler is your guide.)
  - Let TypeScript exhaustiveness errors drive union work: after widening NeuroProfile/etc., tsc lists every
    Record<Union> map you must fill. That list is the checklist.
  - Author BOTH young + older ModeKeyed copy variants (the `satisfies` constraint forces it); add a `preteen?` /
    `literal?` override only where the spec names one.
  - Wire every new persisted kid slice into: (a) its persist registration + partialize, (b)
    gameplay.wipeAllChildData / removeChild, (c) Settings DataReview counts, (d) the migration-forward fixture +
    schema-roundtrip audit. Runtime-only state (nav, sentence bar, chat) is partialized OUT.
  - functions/ code NEVER imports from apps/*; apps/* NEVER import from functions/. Both import types from
    @tiny-bubbles/shared. The kid app's ONLY egress is src/sync/** + the bloopProvider SDK callable.

STEP 3 — VERIFY (the floor — §2). Run the per-workspace floor for every workspace you touched, plus the milestone's
  grep gates (§3) and its spec §7 acceptance checks. For any milestone touching functions/, run the emulator suite (§5).

STEP 4 — FIX LOOP
  while (verify floor OR grep gates OR acceptance criteria fail):
    - read the FIRST failure only (tsc error / failing test / grep hit / emulator error / export error)
    - make the smallest change that fixes THAT failure
    - re-run the affected floor command
  # never batch-guess; fix one failure, re-verify, repeat. This is the whole recursion.

STEP 5 — DONE CHECK (§6 Definition of Done). If all boxes tick:
  - update PROVENANCE.md (§7) for every file created/modified; update THIRD_PARTY_NOTICES.md for new deps/assets
  - git add -A && git commit   (message + Co-Authored-By trailer per repo policy)
  - (orchestrator merges to the integration branch and re-runs the floor before the next milestone)

STEP 6 — (M6.1/M6.2, or on request) run `npm run ship-gate` (§3.2) and/or DEPLOY (§8).
```

**Recursion contract for the orchestrator:** treat each milestone as an independent, resumable unit. If an agent
stalls in STEP 4 on the same failure twice with no progress, it must STOP and report the exact failing command +
first-failure output (do not thrash). The orchestrator then fixes the blocker or re-queues the milestone. Never mark
a milestone done with a red floor; never skip a hard-edge dependency (roadmap §2).

---

## 2. The VERIFY FLOOR (per workspace; the gate for every milestone)

**First-run install order (the dual toolchain, §arch 1.3):** `npm install` at the monorepo root (hoists
`apps/*` + `packages/shared` into the single root lockfile), **then** `npm --prefix functions install` (the
separate Node/server toolchain with its own `node_modules`). `packages/shared` is `composite:true` (TS project
references); the Node side (`functions/` + shared's own jest) resolves `@tiny-bubbles/shared` via those references
+ a jest `moduleNameMapper`, NOT the app-side `paths` alias.

The floor is **per workspace**. Run it for every workspace your milestone modified. Add these root scripts to the
root `package.json` in M1.0 (they fan out to the workspaces):

```jsonc
// root package.json "scripts" (author in M1.0):
{
  "kid:verify":    "npm -w @tiny-bubbles/kid run typecheck && npm -w @tiny-bubbles/kid test && npm -w @tiny-bubbles/kid run export:web",
  "parent:verify": "npm -w @tiny-bubbles/parent run typecheck && npm -w @tiny-bubbles/parent test && npm -w @tiny-bubbles/parent run export:web",
  "shared:verify": "npm -w @tiny-bubbles/shared run typecheck && npm -w @tiny-bubbles/shared test",
  "fns:verify":    "npm --prefix functions run build && npm --prefix functions test",
  "verify:all":    "npm run shared:verify && npm run kid:verify && npm run parent:verify && npm run fns:verify"
}
```

### 2.1 App workspaces (`apps/kid`, `apps/parent`) — three commands
```bash
cd "/Users/ameyakashid/Desktop/adhd india"

npm -w @tiny-bubbles/kid run typecheck        # 1) tsc --noEmit = 0. New unions/fields/copy keys compile; ModeKeyed
                                              #    forces both age variants; Record<Union> maps are exhaustive.
npm -w @tiny-bubbles/kid test                 # 2) ALL suites green, count only grows (>= 69 baseline for kid).
npm -w @tiny-bubbles/kid run export:web       # 3) npx expo export --platform web succeeds. Proves offline/web-safe:
                                              #    no native-only import at module scope; audio/haptics/Rive/video
                                              #    degrade to no-op or the BubbleBuddy fallback; a no-Firebase build
                                              #    still exports (sync is behind a dynamic import).
```
Substitute `@tiny-bubbles/parent` for the parent app (once it exists, M3.0+). `export:web` = `expo export --platform
web` (add the script to each app's `package.json`).

### 2.2 `packages/shared` — two commands
```bash
npm -w @tiny-bubbles/shared run typecheck     # tsc = 0 (RN-free logic; pure types + resolvers + compliance data)
npm -w @tiny-bubbles/shared test              # unit tests (ts-jest/node): resolveNeuroPreset, redactPii,
                                              # resolveCrisisCard, isEvidenceHonest, resolveBloopState, aac/obf, ...
```

### 2.3 `functions/` — build + unit + (when touched) emulator
```bash
npm --prefix functions run build              # tsc = 0 (Node target; NOT bundled by Metro)
npm --prefix functions test                   # unit: each scanner, pipeline order, on-fail fail-safe, crisis, redteam
# emulator suite (any milestone touching functions/ — see §5):
cd functions && firebase emulators:exec --only auth,firestore,functions,storage "npm test" && cd ..
```

**Shorthand the orchestrator can paste (touched-workspaces subset, e.g. a functions milestone):**
```bash
cd "/Users/ameyakashid/Desktop/adhd india" && npm run shared:verify && npm run kid:verify && npm run fns:verify && echo "FLOOR GREEN"
```

If any command fails, that is the FIRST failure to fix in STEP 4. Do not proceed past a red floor.

---

## 3. The GREP GATES + the aggregate SHIP GATE

Run the generic gates (§3.1) after the floor, every milestone. The aggregate ship gate (§3.2) is finalized in M6.1
and is the release blocker. Copy the spec-specific greps from your milestone's workstream §7 into STEP 3.

### 3.1 The standing generic gates (mechanical enforcement of the locked constraints)

```bash
cd "/Users/ameyakashid/Desktop/adhd india"

# --- NO CLIENT NETWORK EGRESS (kid + parent app trees; functions/ is the ONLY egress zone) ---
grep -rniE "fetch\(|axios|XMLHttpRequest|WebSocket|sendBeacon|https?://[a-z]" \
  apps/kid/{app,src,components} apps/parent/{app,src,components} \
  | grep -viE "^[^:]+:[0-9]+: *(//|\*)|__tests__|docs.expo.dev|schema|xmlns" || echo "OK: no client egress"
#   The kid app's ONLY sanctioned egress = apps/kid/src/sync/** + the bloopProvider Firebase SDK callable
#   (no raw fetch/URL literal appears — the SDK attaches App Check + ID token). The parent app = Firebase JS SDK only.
#   Also codified as apps/*/__tests__/config/no-network.test.ts (retargeted in M1.0).

# --- NO CLIENT→LLM CALL / all sendTurn goes through the seam ---
grep -rn "sendTurn" apps/kid/src | grep -viE "services/bloopProvider|__tests__" \
  || echo "OK: all sendTurn call sites go through services/bloopProvider (the w2 seam)"

# --- NO AD/ANALYTICS SDKS in either app (COPPA) ---
grep -rniE "firebase/analytics|@react-native-firebase/analytics|expo-.*analytics|segment|amplitude|mixpanel|posthog|admob|react-native-google-mobile-ads|facebook" \
  apps/kid/{app,src,components} apps/parent/{app,src,components} | grep -viE "__tests__" || echo "OK: no ad/analytics SDK"

# --- ANTI-SHAME: no failure/loss/urgency copy in kid-facing surfaces + curated data labels (v1 gate, carried) ---
grep -rniE "time's up|out of time|too slow|you failed|\bfailed\b|you missed|\bmissed\b|streak (lost|broken)|0[- ]day|hurry|last chance|limited time" \
  apps/kid/app/\(kid\) apps/kid/components apps/kid/src/i18n apps/kid/src/data 2>/dev/null \
  | grep -viE "__tests__" || echo "OK: anti-shame copy"
#   word boundaries load-bearing (\bmissed\b excludes "dismissed"). "not therapy"/"no health claims" is fine in PARENT copy.

# --- EVIDENCE-HONESTY: no therapy/cure/efficacy/speech-gain claim + BARE trademark, incl. marketing (w8 gate §8 #23) ---
#   word boundaries load-bearing (\bcure\b excludes secure/procure; therap(y|ies) (for|that|works) spares "occupational therapy");
#   BARE "zones of regulation"/"social stor(y|ies)" are trademark hits INDEPENDENT of an efficacy word; store copy IS scanned.
grep -rniE "\bcure(s|d)?\b|\btreats?\b|therap(y|ies) (for|that|works)|clinically proven|zones of regulation|social stor(y|ies)|speech gain|learn to (talk|speak)|will talk|may (increase|improve|help)[a-z ]*speech|does not inhibit speech|talk more|sensory integration (therapy|delivered)" \
  apps packages functions docs/store-listing.md --include=*.ts --include=*.tsx --include=*.md \
  | grep -viE "__tests__|compliance/evidenceHonesty|assertNarrativeCopyClean|assertAacCopyClean|not a doctor|not therapy|occupational therap(y|ist)|CITED-EVIDENCE" || echo "OK: evidence-honest"

# --- NO MODEL-INVENTED HOTLINE: a phone/988 literal may live ONLY in the reviewed shared table (w8 gate) ---
grep -rnE "\b988\b|[0-9]{3}-[0-9]{3,}" apps packages functions --include=*.ts --include=*.tsx \
  | grep -viE "packages/shared/src/compliance/crisisResources.ts|__tests__" || echo "OK: no invented hotline"

# --- NO RAW age/neuro axis in components (golden rule; w1+w8 gate) ---
grep -rnE "\b(ageMode|neuroProfile)\s*(===|==|!==)" \
  apps/kid/{app,components} apps/parent/{app,components} | grep -viE "__tests__" \
  || echo "OK: axes read only via resolvers (never a raw branch in a component)"

# --- DETERMINISM: no RNG in payout/rotation/resolver/character paths ---
grep -rn "Math.random" apps/kid/src/domain apps/kid/src/state apps/kid/src/theme packages/shared/src \
  | grep -viE "__tests__" || echo "OK: no RNG (novelty/quests/resolveBloopState/payout are deterministic)"

# --- LICENSE: no non-commercial / copyleft symbol art in the shipped tree (w4+w8 gate) ---
#   The per-asset CANONICAL manifest is apps/kid/assets/symbols/manifest.json (§8 #22); assertSymbolManifestClean
#   ALSO enforces completeness (every file under assets/symbols/ has a clean row — an orphan/renamed NC asset fails).
grep -rniE "ARASAAC|Sclera|CC-?BY-?NC|-NC-|AGPL|GPL-3" apps/kid/assets packages/shared/src/aac \
  | grep -viE "__tests__|reference-only|excluded" || echo "OK: symbol art is license-clean"

# --- SCRUBBED CREDS: no committed Firebase secret; firebaseConfig comes from EXPO_PUBLIC_* env (§1.4) ---
grep -rniE "apiKey|AIza|serviceAccount" apps functions | grep -viE "__tests__|process.env|EXPO_PUBLIC|config template|// " \
  || echo "OK: no committed secret"
```

Each gate prints `OK: …` when clean. A gate that prints hits is the FIRST failure to fix (STEP 4). Word boundaries
and exclusion patterns are load-bearing — do not loosen them to pass. The `no-network` gate is also codified as
`apps/*/__tests__/config/no-network.test.ts`; the w8 cross-cutting gates are codified under
`packages/shared/__tests__/gates/*`.

### 3.2 The aggregate v2 SHIP GATE (`scripts/ship-gate.sh`, finalized M6.1)

The release blocker. Scaffolded in M1.1 (may pass vacuously early), finalized in M6.1. Runs, in order, everything
below; **any red = no ship**:

```bash
npm run ship-gate     # === scripts/ship-gate.sh ===
# 1) every workspace: typecheck + test        (shared, kid, parent, functions)
# 2) functions emulator suite (rules, auth, redactPii, retention, pipeline, crisis[+differentiation §8 #27],
#    server-authoritative[§8 #28], semantic-output-classifier[§8 #30], VPC dev_mock-rejected[§8 #29], redteam)
# 3) cross-cutting gates: evidence-honesty (incl. BARE trademark + docs/store-listing.md, §8 #23) ·
#    crisis-review (assertCrisisTableReviewed(LAUNCH_LOCALES); EVERY locale incl. en-US needs a sign-off, §8 #16b) ·
#    symbol-license (assertSymbolManifestClean over the ONE manifest + completeness, §8 #22) ·
#    no-invented-hotline · neuro-golden-rule
# 4) no-egress gates (kid + parent) · no-ad/analytics grep · v1 anti-shame grep
# 5) the red-team suite (functions/__tests__/redteam, mockModel in CI) as a release blocker; the LIVE-provider
#    pre-enablement red-team (§8 #30) is a per-locale/tier gate run in staging before chat is flipped on
# 6) print the PROVENANCE + human sign-off checklist (SHIP-GATE.md): psychologist (crisis copy + abuse/CSAM
#    differentiation), legal (consent/DPA + DeepSeek non-PRC/non-training + marketing/store copy), license reviewer
#    (symbols). crisis-review FAILS the build for any launch locale whose card is reviewed:false.
```

---

## 4. How to reference each workstream spec (milestone → spec mapping)

For milestone `M`, open exactly the spec below and treat its §2 (UX), §3 (data model), §4 (files), §6 (safety/
anti-shame/COPPA), §7 (acceptance) as the build contract. All paths are under
`/Users/ameyakashid/Desktop/adhd india/_build/spec2/workstreams/`.

| Milestone | Workstream spec | Owns / key deliverable |
|---|---|---|
| **M1.0** | *(none — `01-current-and-target.md` §2 + `02-architecture.md` §1)* | monorepo migration: `git mv → apps/kid`, workspaces, Metro, `packages/shared`+`functions/` scaffold, retarget no-egress |
| **M1.1** | `w8-safety-compliance-neuroprofile.md` (§3, §4.1–§4.5) | `NeuroProfile` axis + `resolveNeuroPreset` + resolver/ThemeProvider thread; `compliance/*` (pii/evidenceHonesty/crisisResources/retention/consent/symbolLicense); gate scaffolds |
| **M1.2** | `w1-backend-data.md` | Firestore schema + `functions/` auth/consent/data/retention/alerts/interceptor; rules; the kid sync adapter + `tb/sync`; `redactPii`/`sendParentAlert`/`verifyIdToken`; no-analytics gate |
| **M2.0** | `w2-llm-proxy-guardrails.md` (§4, §6.1, §6.3) | `bloop/*` shared contract + `MockBloopProvider`; the mock-first `bloopProvider` client seam |
| **M2.1** | `w2-llm-proxy-guardrails.md` (§3, §5, §6.2) | `functions/src/bloop/*` pipeline + shields + persona + crisis + on-fail + transcript; red-team suite (mockModel only) |
| **M3.0** | `w3-parent-app.md` (§2 S0–S5, §4.1–§4.4) | `apps/parent` shell + auth + COPPA consent gate + add-child + dashboard + FCM token |
| **M3.1** | `w3-parent-app.md` (§2 S6–S9, §3.5, §4.5) | timeline + read-only transcripts + report reuse + controls + alerts inbox + data-rights |
| **M4.1** | `w4-aac-communication.md` | the shared `AacSymbol`/`AacBoard` primitive + kid AAC renderer + `tb/boards` + cleared symbol set + manifest |
| **M4.2** | `w5-visual-supports.md` | schedule/first-then/transition/video/narrative (kid) + parent authoring builders + `narrativeDraft` intent |
| **M4.3** | `w6-regulation.md` | emotion-ID + strategy menu + sensory profile + break button + breathing/movement enrichment |
| **M5.1** | `w7-bloop-character.md` (§2.2, §2.4–§2.5, §3.4) | deterministic `resolveBloopState` + `BloopCharacter`/`BubbleBuddy` fallback + B5 panel + B4 novelty |
| **M5.2** | `w7-bloop-character.md` (§2.1, §2.3, §3.3, §3.5) | `react-native-gifted-chat` surface (off-by-default) + `bloopProvider` wiring + caps keys |
| **M6.1** | `w8-safety-compliance-neuroprofile.md` (§4.6, §6, §7) | finalize all cross-cutting gates + `scripts/ship-gate.sh` + written COPPA program + App Check + TTL policies |
| **M6.2** | `w2-llm-proxy-guardrails.md` (§7, §10) + this guide §8 | wire real Gemini/DeepSeek behind the flag; deploy Functions → `empirical-lens-469401-k0`; web → Cloud Run |

**Hot shared files — merge, never fork.** When a milestone touches one of these, read its current contents, add your
additive block, keep every existing branch: `apps/kid/src/theme/{resolveCapabilities,resolveTokens,resolveContent,
ThemeProvider}.ts`, `apps/kid/src/state/gameplay.ts`, `apps/kid/src/domain/types.ts` (or the shared one),
`apps/kid/app/(kid)/_layout.tsx`, `apps/kid/__tests__/config/no-network.test.ts`, `apps/kid/__tests__/storage/
migration-forward.test.ts`, `functions/src/index.ts`, `functions/src/interceptors/verifyIdToken.ts`,
`packages/shared/src/index.ts` (the barrel), `PROVENANCE.md`/`THIRD_PARTY_NOTICES.md`. If two milestones ran in
parallel worktrees, the orchestrator merges serially and re-runs the floor.

**Shared-extraction discipline (when moving a v1 module into `packages/shared`):** move ONE module per commit,
re-export from the old location OR update kid imports in one pass, run the kid suite, commit — so any regression is
bisectable. **Never** move RN-native or kid-only store-coupled code (only pure TS: types, tokens, RN-free resolvers,
pure domain).

---

## 5. Running the Firebase emulator locally (any milestone touching `functions/`)

The emulator suite proves the backend without a live project. `firebase.json` (authored in M1.2) wires the auth +
firestore + functions + storage emulators.

### 5.1 One-time setup
```bash
npm i -g firebase-tools            # or: npx firebase-tools@latest ... (no global install)
cd "/Users/ameyakashid/Desktop/adhd india/functions"
npm install                        # functions/ has its OWN node_modules (server toolchain)
firebase --version                 # sanity
# login is NOT required for the emulator; it IS required for deploy (§8).
```

### 5.2 Start the emulators (interactive dev)
```bash
cd "/Users/ameyakashid/Desktop/adhd india/functions"
npm run build                                                   # tsc the functions first
firebase emulators:start --only auth,firestore,functions,storage
#   Emulator UI on http://localhost:4000 ; ports from firebase.json. Ctrl-C to stop.
#   The kid/parent app can point at the emulator by setting EXPO_PUBLIC_TB_USE_EMULATOR=1 (wire connectAuthEmulator/
#   connectFirestoreEmulator/connectFunctionsEmulator in apps/*/src/*firebase* behind that flag) — dev only.
```

### 5.3 Run the emulator test suites (CI-style; boots + tears down automatically)
```bash
cd "/Users/ameyakashid/Desktop/adhd india/functions"
firebase emulators:exec --only auth,firestore,functions,storage "npm test"
#   Covers (per w1 §7 + w2 §9): rules.test.ts (default-deny; parent-only reads; kid cannot read transcripts/write
#   controls; transcripts/alerts admin-only-write), auth.test.ts (provisionChild gated on consentVerified; kid uid
#   blocked without a provisioned child), redactPii.test.ts (no raw PII survives), retention.test.ts (expiresAt +
#   ttlSweep), pipeline.test.ts (§3 order; unsafe mockModel reply → REFRAIN; error → fail-safe), crisis/*.test.ts
#   (recall-biased detect; locale-correct reviewed card; no means/method; alert+FCM stubbed), redteam.test.ts.
```

Notes:
- **Native Firestore TTL policies + App Check enforcement are NOT emulator-testable** — configure them out-of-band
  (`gcloud firestore fields ttls` / Firebase console) as part of project setup (M6.1) and document, don't unit-test.
- The `functions/` tree is the **only** raw-egress zone. Never import `functions/` code into an app; never import
  app code into `functions/`. Both import types from `@tiny-bubbles/shared` (functions ALSO imports its runtime,
  bundled at deploy — §8.1/§8 #24).
- CI must run the emulator suite (it is a release blocker via §3.2 step 2 + 5).
- **The tsc/jest/emulator/web-export floor does NOT cover native concerns.** Rive rendering, FCM receipt
  (`getDevicePushTokenAsync`/`@react-native-firebase/messaging`, §8 #26), App Check attestation (§8 #25), and
  on-device kid custom-token sign-in are validated at a **one-time Expo dev-client / EAS smoke build** — the
  M5.x/M6.x checkpoint (add to those milestone acceptances). Do not claim these paths green from the web floor;
  crisis-alert delivery gets a real-device / Expo-Push-sandbox integration smoke test outside the emulator.

---

## 6. DEFINITION OF DONE (per milestone)

A milestone is DONE only when **every** box below ticks. This is the checklist an agent runs in STEP 5 and the
orchestrator re-checks before merge.

- [ ] **Verify floor green for every workspace touched** (§2): each modified workspace's `typecheck` = 0, `test` all
      suites (count ≥ prior), and (apps) `export:web` succeeds; (`functions`) build + unit + emulator green.
- [ ] **Grep gates pass** (§3.1) + the spec-specific greps from the milestone's workstream §7.
- [ ] **The workstream spec's §7 acceptance criteria are all met** (asserted by new tests where the spec lists them;
      the CREATE list in §4 includes those test files — write them).
- [ ] **Green-at-boundary invariant holds** (roadmap §5): kid app fully functional with `cloudSyncEnabled:false`
      (network OFF) AND `bloopEnabled:false` / `MockBloopProvider` (LLM OFF); no client egress outside the sanctioned
      seams; the safety boundary stays server-side.
- [ ] **New tests exist** for every new pure domain module, store, resolver, scanner, and function the spec names
      (never ship a new `src/domain/*`, store, resolver, or `functions/src/*` without its `__tests__/*`).
- [ ] **Additive-only confirmed (on-device):** `SCHEMA_VERSION` still `1`, `MIGRATIONS` still `[]`; any new persisted
      field is optional; any new slice hydrates from its own `partialize` default and is wired into
      `collectTbSlices()` backup, `gameplay.wipeAllChildData`, `DataReview`, and the migration-forward +
      schema-roundtrip fixtures. Runtime-only state is `partialize`d OUT.
- [ ] **Firestore/functions additive:** new docs default-fill missing fields on read; no non-additive Firestore
      change; `functions/` stays out of every client bundle (Metro `watchFolders` excludes it).
- [ ] **Canonical names used** (`02-architecture.md` §8 register): `bloopEnabled`, `expiresAt`, `crisisLocale`,
      `limits{perMinute,perDay,sessionMinutes}`, settings `.../settings/current`, `TopicCategory` = w2's enum, PII
      taxonomy = `compliance/pii.ts`, etc.
- [ ] **Premium/free honored:** gate ONLY through `apps/kid/src/services/entitlements.ts`
      (`isFeatureUnlocked`/`canAddMore`). **Never** wrap a FREE/accessibility/safety control (AAC, regulation,
      transcripts, alerts, controls, the character, chat availability, the neuroProfile axis) in `<PremiumGate>`.
      Downgrade is acquisition-only (nothing owned is stripped).
- [ ] **Axes via resolvers only:** no raw `ageMode`/`neuroProfile` branch in a component, no such prop; copy through
      `resolveContent`/`ModeKeyed` with both age variants; status via `resolveStatusPresentation`.
- [ ] **All v2 invariants hold** (the spec's §6): anti-shame, no client→model call, no raw model render, PII redacted
      before storage, crisis = reviewed region-localized card, license-clean, no ad/analytics, deterministic character.
- [ ] **Deps + assets recorded** in `THIRD_PARTY_NOTICES.md`; **`PROVENANCE.md` updated** (§7) for every created/
      modified source file.
- [ ] **App runnable at the boundary:** a clean checkout would boot both apps green; `functions/` builds.

If any box is unchecked, the milestone is NOT done — return to STEP 4.

---

## 7. Keeping PROVENANCE.md updated (per milestone)

The root `PROVENANCE.md` is the per-file origin manifest that gates the ship reviewer sign-off ("no code from a
non-approved source"). Every new/changed source file must be recorded, grouped by milestone.

**Procedure (STEP 5 of the loop):**
1. Add a section header for your milestone, e.g. `## M4.1 — AAC communication board (w4)`.
2. For every file CREATED or MODIFIED, add a row `| File | Origin | Notes |`. Choose the **origin** honestly:
   - `original` — net-new code authored for Tiny Bubbles (the default).
   - `donor:<repo>:<path> (<LICENSE>)` — ported/adapted from a **ship-safe** donor under `_sources2/` (MIT/Apache/
     BSD). Note the license; for Apache donors (Lottie) **preserve `LICENSE`/`NOTICE`**; for CC-BY/BY-SA symbol art
     record attribution (+ share-alike). e.g. `donor:speakeasy-aac:src/types/index.ts (MIT)`.
   - `reference:<repo>:<path>` — re-authored against our stack from a **reference-only** repo's *pattern* (no code
     copied). Used for the Python guardrail donors (llm-guard/nemo-guardrails/guardrails-ai → patterns to TS) and any
     GPL/AGPL/unlicensed UX reference (cboard, CoughDrop, PromptProof). Note which pattern.
   - **NEVER** ship GPL/AGPL code or ARASAAC/Sclera/any-NC art (hard prohibition; the §3.1 + §3.2 license gates fail).
3. For a MODIFIED shipped file, keep its original row and add a "(modified) …" note.
4. **M6.1 (ship gate):** add a reviewer sign-off row confirming: neuroProfile/compliance modules `original`; cleared
   symbol set only (no NC art); crisis table reviewed (psychologist sign-off); consent/DPA reviewed (legal sign-off);
   additive-only (`SCHEMA_VERSION` 1, `MIGRATIONS` []). Re-run the license/no-egress/evidence-honesty gates.

**Rule of thumb:** if `git status` shows a `.ts`/`.tsx` file created or changed this milestone and it has no
PROVENANCE row for this milestone, the milestone is not done.

---

## 8. DEPLOY (Functions → Firebase on GCP; web previews → Cloud Run)

Two deploy targets. **Functions/rules/TTL/App Check → the user's Firebase project `empirical-lens-469401-k0`.**
**Web previews of both apps → Cloud Run** (mirrors the shipped v1 `deploy-web/` Express-static pattern). Deploy after
M6.2 (final) or on orchestrator request. Prereqs: `gcloud auth login` + `firebase login` done; the Cloud Run +
Cloud Build + Firestore + Cloud Functions APIs enabled on the project. If a deploy fails on auth/project, **STOP and
report** — do not guess credentials.

### 8.1 Firebase Functions + rules + indexes + Storage rules → `empirical-lens-469401-k0`
```bash
cd "/Users/ameyakashid/Desktop/adhd india/functions"

# 0) one-time: bind the Firebase project (writes .firebaserc)
firebase use --add empirical-lens-469401-k0      # alias it "default"

# 1) build + BUNDLE + gate BEFORE deploy (never deploy a red tree)
#    build:deploy = `tsc -b && esbuild src/index.ts --bundle --platform=node --target=node20 \
#      --external:firebase-admin --external:firebase-functions --external:@google-cloud/vertexai --outfile=lib/index.js`
#    This INLINES all @tiny-bubbles/shared RUNTIME (redactPii/resolveCrisisCard/computeTtlAt/OnFailAction) into
#    lib/index.js — WITHOUT it, the deployed function fails `Cannot find module @tiny-bubbles/shared` at cold start
#    (the workspace symlink resolves only in the emulator; Cloud Build reinstalls functions/package.json alone). §8 #24.
npm --prefix functions run build:deploy && firebase emulators:exec --only auth,firestore,functions,storage "npm --prefix functions test"
#    firebase.json wires it: "functions": { "source": "functions", "predeploy": ["npm --prefix functions run build:deploy"] }

# 2) set provider secrets (M6.2; never commit them) — bound as VERIFIED NON-TRAINING processors (§8 #31)
firebase functions:secrets:set GEMINI_API_KEY        # Vertex AI (processor-terms path, prompt-logging OFF) — assert non-training config
# DeepSeek stays GATED OFF for child data until a signed non-training DPA + non-PRC/self-hosted endpoint + residency
# are recorded in docs/dpa/llm-processor-terms.md (§8 #31). Do NOT set DEEPSEEK_API_KEY until that row exists.

# 3) deploy functions + security rules + indexes + storage rules
firebase deploy --only functions,firestore:rules,firestore:indexes,storage \
  --project empirical-lens-469401-k0

# 3b) POST-DEPLOY SMOKE-CHECK (proves cold-start module resolution — the bundling fix is real, not assumed):
#     invoke the deployed no-op `pingBloop` callable; a non-200 / "Cannot find module" = STOP and report (§1.5).
firebase functions:call pingBloop --project empirical-lens-469401-k0   # expect { ok: true }

# 4) out-of-band project config (documented in COMPLIANCE.md / SHIP-GATE.md — not code):
#    - create native Firestore TTL policies on transcripts.expiresAt, activity.expiresAt, alerts.expiresAt:
gcloud firestore fields ttls update expiresAt --collection-group=transcripts --enable-ttl --project=empirical-lens-469401-k0
gcloud firestore fields ttls update expiresAt --collection-group=activity     --enable-ttl --project=empirical-lens-469401-k0
gcloud firestore fields ttls update expiresAt --collection-group=alerts       --enable-ttl --project=empirical-lens-469401-k0
#    - enable App Check enforcement for Firestore + Functions (Firebase console; App Attest iOS / Play Integrity
#      Android; debug provider for dev).
```
Notes:
- The **default shipped build keeps chat OFF + the `MockBloopProvider`** (CI never hits the network). The real
  provider path is only exercised when a build sets `EXPO_PUBLIC_TB_BLOOP_PROXY=1` AND a parent enabled
  `bloopEnabled`. The red-team suite runs against `mockModel` in CI and stays a release blocker.
- Deploying Functions does **not** brick the child: the kid core is offline-first; Firebase is additive.

### 8.2 Web previews → Cloud Run (per app; mirrors the shipped v1 `deploy-web/` pattern)
```bash
# --- KID web preview ---
cd "/Users/ameyakashid/Desktop/adhd india/apps/kid"
npx expo export --platform web                       # writes ./dist (offline/web-safe subset; BubbleBuddy fallback)
rm -rf deploy-web/dist && cp -R dist deploy-web/dist  # deploy-web/ = the Express static server (carried from v1)
gcloud run deploy tiny-bubbles-kid --source deploy-web --region us-central1 \
  --project empirical-lens-469401-k0 --allow-unauthenticated

# --- PARENT web preview (same pattern; add apps/parent/deploy-web mirroring the kid one) ---
cd "/Users/ameyakashid/Desktop/adhd india/apps/parent"
npx expo export --platform web
rm -rf deploy-web/dist && cp -R dist deploy-web/dist
gcloud run deploy tiny-bubbles-parent --source deploy-web --region us-central1 \
  --project empirical-lens-469401-k0 --allow-unauthenticated
```
Notes:
- Each app's `deploy-web/` is an Express static server over `deploy-web/dist` with an SPA fallback (copy the shipped
  v1 `deploy-web/{server.js,package.json}`; pins `express` + `node >=20`, `start: node server.js`). `deploy-web/dist`
  is a build artifact — never hand-edit it; regenerate every redeploy.
- The command prints the service URL — smoke it: the app boots, the kid loop / parent dashboard renders, navigation
  works (native audio/haptics/Rive/FCM are N/A on web by design and degrade gracefully; the kid character falls back
  to `BubbleBuddy`).
- **Do not** wire EAS Update / `expo-updates` into the web deploy (offline-first, no phone-home). Cloud Run static
  hosting is the only web surface; native builds ship via EAS as today.

---

## 9. Orchestrator driver (copy-pasteable pseudo-loop)

Drive the whole build by iterating the milestone list from `00-MASTER-ROADMAP.md` §4 in order. Each `run milestone`
dispatches the §1 loop to a build-agent.

```
MILESTONES = [M0,
              M1.0, M1.1, M1.2,          # P1 monorepo + backend + auth
              M2.0, M2.1,                # P2 LLM proxy, mock-first
              M3.0, M3.1,                # P3 parent app
              M4.1, M4.2, M4.3,          # P4 kid autism toolkit
              M5.1, M5.2,                # P5 Bloop
              M6.1, M6.2]                # P6 hardening + deploy

cd "/Users/ameyakashid/Desktop/adhd india"
assert floor_green(baseline)              # §2 on the shipped tree before starting (M0)

for M in MILESTONES:
    open 00-MASTER-ROADMAP.md → card(M)   # deps, effort, new surface, acceptance
    open the ONE workstream spec for M    # §4 mapping
    branch feat/<M-slug>
    run milestone M via §1 (implement → verify → fix)   # agent iterates STEP 2–4 until green
    assert floor_green(touched_workspaces)  # §2
    assert grep_gates_pass(M)               # §3.1 generic + spec-specific
    assert emulator_green(M) if touches functions/   # §5
    assert acceptance_met(M)                # workstream §7
    assert definition_of_done(M)            # §6
    update PROVENANCE.md                     # §7
    commit + merge to integration branch
    assert floor_green(touched_workspaces)  # §2 again on the merged tree (catches hot-file merge breaks)

# at M6.1:
assert `npm run ship-gate` green            # §3.2 the release blocker
# at M6.2:
deploy_functions()                          # §8.1 → empirical-lens-469401-k0
deploy_web_previews()                       # §8.2 → Cloud Run

report: "v2: 16 milestones green (M0 + 15); SCHEMA_VERSION=1, MIGRATIONS=[]; both apps green; kid core fully
         functional offline/LLM-off at every boundary; ship-gate green; deployed."
```

**If a milestone stalls** (same failure twice, no progress in STEP 4): the agent STOPS and reports the exact failing
command + first-failure output. The orchestrator fixes the blocker or re-queues M. Never merge a red tree; never skip
a hard-edge dependency (roadmap §2).

---

## 10. Quick reference — the commands you will paste most

```bash
ROOT="/Users/ameyakashid/Desktop/adhd india"

# --- verify floor (per workspace; run for each you touched) ---
cd "$ROOT" && npm run shared:verify && npm run kid:verify && npm run fns:verify && echo FLOOR_GREEN
cd "$ROOT" && npm run verify:all && echo ALL_GREEN            # every workspace

# --- run one new test suite while iterating ---
npm -w @tiny-bubbles/kid test -- <name>                      # e.g. -- resolveAac
npm --prefix functions test -- <name>                        # e.g. -- pipeline

# --- functions emulator suite ---
cd "$ROOT/functions" && firebase emulators:exec --only auth,firestore,functions,storage "npm test"

# --- the standing grep gates (see §3.1 for the full set) ---
grep -rniE "fetch\(|axios|https?://[a-z]" apps/kid/{app,src,components} apps/parent/{app,src,components} | grep -viE "//|__tests__|xmlns|schema"   # no client egress
grep -rn "sendTurn" apps/kid/src | grep -viE "services/bloopProvider|__tests__"                          # sendTurn via the seam
grep -rnE "\b(ageMode|neuroProfile)\s*(===|==|!==)" apps/kid/{app,components} apps/parent/{app,components} | grep -v __tests__   # no raw axis branch
grep -rnE "\b988\b|[0-9]{3}-[0-9]{3,}" apps packages functions --include=*.ts* | grep -viE "crisisResources.ts|__tests__"        # no invented hotline

# --- install a spec-named dep ---
npx expo install <package>                 # app deps (SDK-56 pinned); then record in THIRD_PARTY_NOTICES.md
npm --prefix functions install <package>   # functions deps (server toolchain)

# --- ship gate (M6.1) ---
cd "$ROOT" && npm run ship-gate

# --- deploy (M6.2) ---
cd "$ROOT/functions" && firebase deploy --only functions,firestore:rules,firestore:indexes,storage --project empirical-lens-469401-k0
cd "$ROOT/apps/kid" && npx expo export --platform web && rm -rf deploy-web/dist && cp -R dist deploy-web/dist && gcloud run deploy tiny-bubbles-kid --source deploy-web --region us-central1 --project empirical-lens-469401-k0
```

---

## 11. One-line takeaway

For each milestone: branch → read the one named workstream spec → implement its §4 file list (shared → functions →
app → tests) → run the per-workspace verify floor + the grep gates + (functions) the emulator + the spec's §7
acceptance in a fix loop until green → tick the Definition of Done → update PROVENANCE → commit/merge → keep BOTH apps
green and the kid core fully functional with network + LLM OFF at every boundary. Additive-only (`SCHEMA_VERSION` 1,
`MIGRATIONS` []), no client→model call, no raw model render, no shame, no raw `ageMode`/`neuroProfile`, no client
egress outside the sanctioned seams, license-clean — enforced by the floor, the greps, the emulator, and the
aggregate ship gate, not by memory. Deploy Functions to `empirical-lens-469401-k0`; web previews to Cloud Run.
