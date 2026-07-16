# 04 — v2 SPEC CHANGELOG (four-lens critique applied → FINAL)

*Finalized 2026-07-10. This log records how every **BLOCKER** and **MAJOR** from the four review lenses
(completeness · technical feasibility · child/LLM/COPPA safety · buildability · evidence/license) was resolved
across `00-MASTER-ROADMAP.md`, `02-architecture.md`, `03-BUILD-GUIDE.md`, and `workstreams/w1..w8`. Each affected
workstream now opens with a `⟦v2 FINAL reconciliation⟧` banner; the canonical register (`02-architecture.md` §8)
grew from 18 to **33** entries and is authoritative — **§2.3/§8 override any workstream's own §3 (§8 #33).**
Severity in brackets is the original critique rating.*

---

## 0. The single highest-leverage change

`02-architecture.md` **§8 register #19–#33** + the **§2.1 barrel-ownership map** + the **precedence rule (§8 #33)**
resolve the whole class of "stale/duplicate/divergent type" findings at the source: a build agent authors the
§2.3/§8 shape, not the 07-09 workstream draft. Every workstream got a reconciliation banner pointing there.

---

## 1. COMPLETENESS lens

- **[BLOCKER] Parent-app AAC board authoring orphaned (A1/D6).** Added `apps/parent/app/(authoring)/board-builder.tsx`
  + `apps/parent/src/firebase/boards.ts` to **w5's authoring cluster (M4.2)** (w5 §2.4/§4.3/§7). Deleted the phantom
  "w-parent-authoring" dependency (w4 §8.1, w3 scope). Roadmap §1 authoring note + M4.2 card corrected.
- **[MAJOR] `ReportSnapshotDoc` reader with no writer.** Added `ReportSnapshotDoc` to the canonical schema
  (arch §2.3) + a `computeAndSyncReportSnapshot` **writer** in the w1 sync adapter (arch §2.4, w1 §4.3, M1.2) with
  kid-write/parent-read rules (§8 #21). w3's report primary path now has a real producer.
- **[MAJOR] Regulation/emotion ActivityEvent emission unwired.** Introduced the shared `emitActivity(kind,payload)`
  seam (arch §2.4, w1 §4.3): ALL producers (gameplay + w6 moods/break/breathing/movement + w4 aac aggregate) route
  through it; `cloudSync.test.ts` asserts an emission for **each** of the 11 `ActivityKind`s (M1.2).
- **[MAJOR] SB-243 3-hour break-nudge had no owner.** Built in **w3 (`breakNudge.ts`, M3.1)**, reusing
  `notifications.ts` budget + copy gate; added acceptance (`breakNudge.test.ts`). w7 only displays it.
- **[minor] A11/A12/A13 + `voice` inputMode** explicitly **deferred beyond v2** (roadmap §1).
- **[minor] `config/{global}` seeding** assigned to w1 `seedGlobalConfig` (M6.1), shared-module fallback if unseeded
  (arch §2.3, §8 #21b).
- **[minor] Pre-existing offline v1 child → cloud** link via `pairKidDevice(code, localCid)` (arch §2.4, §8 #21c).

## 2. TECHNICAL FEASIBILITY lens

- **[BLOCKER] `functions/` imports shared runtime but no deploy bundling → dead on deploy.** Added **§1.5 functions
  deploy packaging**: esbuild `--bundle` predeploy inlines `@tiny-bubbles/shared` runtime into `lib/index.js`
  (`firebase-admin`/`-functions` external), wired into `firebase.json` predeploy + BUILD-GUIDE §8.1 + a deployed
  `pingBloop` cold-start smoke-check (§8 #24). w2 §6.2 "types only" → "types + runtime".
- **[MAJOR] App Check not available via Firebase JS SDK.** Real RN path specified: production kid build uses
  `@react-native-firebase/app-check` (App Attest/Play Integrity); default mock/offline build needs none; enforcement
  is native + out-of-band, NOT on the CI floor (arch §1.4/§4.2, §8 #25; M6.1).
- **[MAJOR] Crisis FCM receipt not achievable as drawn.** Per-platform mechanism: Android
  `getDevicePushTokenAsync()` (=FCM); iOS `@react-native-firebase/messaging` (real FCM reg token — an APNs token
  fails `admin.messaging().send()`); store token TYPE; real-device/Expo-Push smoke test (arch §8 #26, w1 `fcmToken.ts`).
- **[MAJOR] Rive/Lottie break web-export/Expo-Go.** Split `BloopCharacter.native.tsx` / `BloopCharacter.web.tsx`
  (fallback pulls no native module) + `metro.config.js` `resolver.assetExts.push("riv")` (w7 §4, M5.1, §8 #25).
- **[minor] Metro `watchFolders` self-contradiction** restated as import-graph-based + a `resolver.blockList` for
  `functions/node_modules` (arch §1.3).
- **[minor] Node-side shared resolution** = TS project references (`composite`) + jest `moduleNameMapper` (arch §1.3).
- **[minor] firebaseConfig `https://` literals** sourced from `EXPO_PUBLIC_*` env (arch §1.4, w1 `firebase.ts`).
- **[minor] "byte-identical"** softened to "behaviorally identical, verified by the 69-suite floor + export" (M1.0).

## 3. CHILD-SAFETY · LLM-SAFETY · COPPA lens

- **[BLOCKER] Output shield is an unbuilt (Model Armor/DLP) assumption.** Made a working **semantic output
  classifier a HARD ship-gate**: regex-only ⇒ chat stays OFF; crisis detector + semantic classifier are a
  non-disableable floor; `output-classifier.test.ts` feeds non-regex unsafe outputs (arch §5.1, §8 #30; M2.1/M6.2).
- **[BLOCKER] No concrete VPC.** `payment-verified` (card auth+void) ships as the real method; `recordConsent`
  rejects `dev_mock` outside the emulator (CI-tested); `provisionChild` requires a non-mock method (arch §5.3, §8
  #29, w1).
- **[BLOCKER] Crisis escalates caregiver-implicated abuse to the abuser.** Differentiated `crisisType`: self-harm/
  distress → parent alert; **abuse/CSAM → child-directed resources, NO parent auto-alert, NCMEC/mandated-reporter
  `safetyReports/{id}`, `legalHold:true` (TTL-exempt)** (arch §5.2/§2.5, §8 #27; launch-blocking psych+legal review).
- **[BLOCKER] Chat callable not server-authoritative.** Proxy derives `childId` from the authed uid, loads
  scope/ageMode/neuro/bloopEnabled/limits server-side; client ctx untrusted; HARD-STOP (no model call) when
  `bloopEnabled=false`; emulator tests added (arch §4.2/§5.1, §8 #28; M2.1).
- **[BLOCKER] DeepSeek PRC hosting.** Gated OFF for child data until non-PRC/self-hosted + signed non-training DPA +
  residency; Vertex non-training config asserted at startup/CI, fail-closed (arch §5.3, §8 #31; M6.2).
- **[MAJOR] Red-team only vs mockModel.** Added a **pre-enablement LIVE-provider red-team** (staging, per locale/
  tier) gate before enablement (arch §5.3, §8 #30; M6.2).
- **[MAJOR] Crisis detection input-only/per-turn/optional.** Now runs on **input AND output AND session level**, and
  is non-disableable by `config.ts` (arch §5.1).
- **[MAJOR] Single-channel FCM crisis alert.** Requires verified push token AND email before enable; dual-channel
  fan-out + unacknowledged re-escalation; no-token path tested (arch §5.2, §8 #26).
- **[MAJOR] PII redaction overclaimed for names/schools.** Free-text is **DLP-gated** for `full_name`/`school_name`;
  chips/AAC PII-free default; fuzz tests extended; "no raw PII survives" not claimed for regex-only cats (arch §2.5).
- **[MAJOR] `no_refusal` masks genuine refusal.** Now **crisis-aware** — re-runs the safety classifier before
  swapping (arch §5.1).
- **[MAJOR] Conversation-context policy undefined.** Single-shot + a server-reconstructed N=4 history window shielded
  as a unit; client never sends history; multi-turn jailbreak cases in the catalog (arch §4.2, §8 #32).
- **[minor] quietHours/sessionMinutes not enforced** → added to the pipeline gate (arch §5.1).
- **[minor] Alert vs transcript TTL** → `AlertDoc.pinnedTurns` copies the redacted window (arch §2.3).
- **[minor] India `reviewed:false`** elevated to launch-critical-path with a named clinical owner (arch §5.2, §8 #16b).

## 4. BUILDABILITY lens

- **[BLOCKER] `packages/shared` barrel collisions** (CrisisCard/CrisisResource/ConsentRecord/OnFailAction). Added the
  **barrel-ownership map** (arch §2.1, §8 #20): one home per symbol; losers deleted; the barrel re-exports the home
  only. w1/w2/w3 banners strike their re-declarations.
- **[BLOCKER] Three incompatible input-mode unions.** ONE canonical `InputMode = aac|chips|freeText|voice` +
  `toInputMode()` mapper (`quickReply→chips`, `freetext→freeText`) (arch §2.3, §8 #19).
- **[BLOCKER] Feature §3 types stale vs the register.** Precedence rule (§8 #33) + a `⟦v2 FINAL reconciliation⟧`
  banner on every workstream + the BUILD-GUIDE §0 override statement; M2.1/M3.x cards say "author §2.3/§8 types".
- **[MAJOR] `redactPii` two homes/owners.** Struck from w1 §4.1/§4.2; M1.2 imports it from `compliance/pii.ts`
  (§8 #7; w1 banner + file list).
- **[MAJOR] retentionDays default 90 vs 30.** 30 everywhere, typed `30|90` (arch §2.5/§8 #10b, w1 §3.2/§3.3a, M1.1).
- **[MAJOR] `PiiCategory` three lists.** Canonical = the §8 #7 superset (email|phone|street_address|url|full_name|
  geolocation|school_name|biometric|gov_id|dob), authored in `compliance/pii.ts` (M1.1/M1.2).
- **[MAJOR] Report primary path no producer.** Resolved with the ReportSnapshot writer (see §1 above).
- **[MAJOR] Theme resolvers + report extraction unassigned.** Named **M1.1b** (extract resolveCapabilities/Tokens/
  Content/Celebration/StatusPresentation + report/renderReportHtml/moodInsight to `packages/shared`, one module/
  commit) so M3.x can import them (roadmap §1 + M1.1b card).
- **[MAJOR] Symbol-license gate scans the wrong path.** ONE canonical manifest = `apps/kid/assets/symbols/
  manifest.json`; the divergent `src/data/aacSymbolManifest.ts` / `assets/aac/symbols/` dropped; gate + test + grep
  all target it + a **completeness assertion** (arch §8 #22, w4/w8, M4.1).
- **[MAJOR] Cleared symbol set an unsourced task.** Marked `[HUMAN]`; M4.1 ships a small original/placeholder set +
  its manifest rows so the renderer/gate go green non-vacuously; final Mulberry-CC-BY-SA/CC0/original before ship
  (w4 banner, M4.1).
- **[minor] `ActivityKind`/`ConsentMethod` divergence** → canonical superset/enum (§8 #6/#17).
- **[minor] functions verify-command drift + undefined `test:emulator`** → standardized on the `emulators:exec "npm
  test"` form (w2 §9-C).
- **[minor] `verify:all` vs empty parent shell** → M1.0 gives the parent one trivial route + smoke test + parent to
  the floor (M1.0 acceptance).
- **[minor] Install order** documented (root `npm install`, then `npm --prefix functions install`; BUILD-GUIDE §2).

## 5. EVIDENCE-HONESTY + LICENSE lens

- **[BLOCKER] License gate wired to the wrong path (vacuous pass).** Same ONE-manifest fix as buildability MAJOR
  above + **completeness assertion** (orphan/renamed NC asset FAILS) (arch §8 #22, BUILD-GUIDE §3.1, w4/w8).
- **[MAJOR] Evidence-honesty gate permitted the BARE trademark.** `evidenceHonesty.ts` now bans **bare**
  `zones of regulation` + `social stor(y|ies)` independent of an efficacy word, plus the AAC near-miss
  `may (increase|improve|help).*speech`; word boundaries (`\bcure(s|d)?\b`, `therap(y|ies) (for|that|works)`);
  every downstream grep matches (arch §8 #23, w8 §4.2, BUILD-GUIDE §3.1, M1.1).
- **[MAJOR] en-US crisis card seeded `reviewed:true` from a research doc.** Every card — incl. en-US — ships
  `reviewed:false` until a recorded psychologist `CRISIS_REVIEW_SIGNOFF` (arch §5.2/§8 #16b, w8 §4.3, roadmap M1.1).
- **[MAJOR] Two divergent `SymbolLicense` types/manifest shapes.** Canonical in `compliance/symbolLicense.ts` (w8);
  w4 imports/extends with `user`/`unknown` = never-ship (arch §8 #22).
- **[MAJOR] DeepSeek processor/residency treated as assumption.** Promoted to a ship-gate decision (default OFF until
  DPA + non-PRC + residency) (arch §5.3/§8 #31).
- **[MAJOR] No gate on marketing/store copy.** `docs/store-listing.md` is in-repo and runs through the same
  evidence-honesty gate + a SHIP-GATE "marketing reviewed" row (arch §5.3/§8 #23b, w8 §4.6, BUILD-GUIDE §3.1/§3.2).
- **[minor] Provenance split** → root is canonical (aggregating apps/kid) for the ship-gate reviewer.
- **[minor] narrativeDraft scope** → its own broader parent-authenticated topic-scope (prep/medical in-scope), same
  shields (w5 §6/§8).
- **[minor] CC-BY-SA share-alike on tinted Mulberry** → adapted set re-published CC-BY-SA or prefer CC0/original
  (w4/w8).
- **[minor] "may increase speech" / stillwave MIT header** → banned copy near-miss added; stillwave license verified
  against author grant or reimplemented (w6 banner).
- **[minor] grep word boundaries on cure/therapy** → added (BUILD-GUIDE §3.1).

---

## 6. Register entries added (`02-architecture.md` §8)

#19 InputMode (one union + mapper) · #20 barrel-ownership map · #21 ReportSnapshotDoc producer / #21b config seeding
/ #21c v1-child link · #22 symbol manifest path + license + completeness · #23 evidence-honesty bare-trademark +
#23b marketing gate · #24 functions deploy bundling · #25 RN App Check · #26 FCM receipt mechanism · #27 crisis-type
differentiation + legal hold · #28 server-authoritative proxy · #29 real VPC + dev_mock rejection · #30 semantic
output classifier HARD ship-gate + non-disableable crisis floor · #31 non-training config + DeepSeek gate · #32
conversation-context policy · #33 §2.3/§8-overrides-workstream-§3 precedence. Existing #10 gained 10b (retention 30);
#16 gained 16b (crisis review incl. en-US); #17 clarified (payment-verified VPC).

## 7. Deferred (noted, not built in v2)

- **A11 (AAC beyond requesting), A12 (work-system view), A13 (parent AAC analytics), `voice` inputMode** — union
  members/stubs exist; the engines are out of v2 scope (roadmap §1).
- **The bespoke `.riv` art + reactive tuning** and **the final cleared symbol art** remain `[HUMAN]` deliverables;
  the agent lands the deterministic seams + placeholder/original sets so gates pass non-vacuously (w4/w7, M4.1/M5.1).
- **Native-only validation** (Rive render, FCM receipt, App Check attestation, kid custom-token sign-in) is a
  one-time dev-client/EAS checkpoint at M5.x/M6.x, explicitly **not** on the tsc/jest/emulator/web-export floor.
