# Workstream w1 — Backend + Data Model (Firebase Auth · Firestore · retention · sync · rules)

*Authored 2026-07-09. Durable, buildable workstream spec. Owns the **Firebase Auth model** (parent
accounts, guardian↔child link, COPPA verifiable-consent flow), the **Firestore schema** (families,
children, activity events, companion transcripts, progress, controls) with **retention TTL + PII
redaction**, the **additive offline→cloud sync adapter** (v1 storage port stays source of truth; sync
is one-way-up activity + two-way settings), the **security rules**, and the **no-ad/analytics-SDK**
guarantee in the kid app.*

**Authoritative inputs (read, grounded in-repo):** `_build/research2/00-SYNTHESIS2.md` (§2.1, §4.3,
§4.4, §5.6), `_build/research2/01-v2-feature-matrix.md` (§C1, §C7, §C8, §D1–D5, D8, D9), the target-state
`_build/spec2/01-current-and-target.md` (§1.3, §3.4, §3.5), the v1 architecture `_build/spec/02-architecture.md`
(§2, §3.3), inventory `_build/inventory2/firebase-rn-starter.md`, and the donor code under `_sources2/`.
Mind the SPACE in every path (`/Users/ameyakashid/Desktop/adhd india/…`).

> **This workstream is the DATA + AUTH + PERSISTENCE substrate.** It defines the schema, the auth/consent
> gates, the retention/redaction contract, the sync adapter, and the security rules. It does **NOT** own the
> LLM moderation pipeline (input/output shields, crisis *detection*, persona) — that is the **Bloop-proxy
> workstream** — but it **provides the transcript/alert schema, the `redactPii` pre-storage chokepoint, the
> alert-doc + FCM push mechanism, and the auth interceptor contract** those depend on. It does **NOT** own the
> parent-app UI screens or the autism-module kid UI — those **consume** this workstream's schema + services.

> ## ⟦v2 FINAL reconciliation — read `02-architecture.md` §2.3/§8 FIRST; it OVERRIDES this §3 (§8 #33)⟧
> This 07-09 draft is superseded by the 07-10 canonical register where they differ. For w1 specifically:
> - **redactPii/PII taxonomy live in `@tiny-bubbles/shared/compliance/pii.ts` (w8, M1.1), NOT here** (§8 #7, #20).
>   **DELETE** the `redactPii` impl from §4.1 and the `firestore/redaction.ts` CREATE from §4.2; M1.2 **imports**
>   `redactPii` + `PiiCategory` (the superset `email|phone|street_address|url|full_name|geolocation|school_name|
>   biometric|gov_id|dob`). Drop w1 §3.1's `ModerationVerdict`/`PiiCategory`/`OnFailAction` re-decls — import
>   `ModerationFlag`/`OnFailAction`(enum) from `bloop/moderation.ts`, `PiiCategory` from `compliance/pii.ts`.
> - **retentionDays default = 30 everywhere** (not 90), type `30|90` (§8 #10b). Fix §3.2 `ParentUserDoc.retentionDays`
>   + §3.3a `retentionDays?` comment.
> - **ActivityKind = the 11-member canonical union** (§2.3, §8 #6): add `emotion_logged`/`movement_break`, use
>   `breathing_done`.
> - **AlertSeverity = `info|concern|crisis`** (not `info|warn|crisis`); **ConsentMethod = §8 #29**.
> - **Sync outbox is fed by a shared `emitActivity` seam (ALL producers), not only gameplay** (§2.4, §4.3 below).
> - **w1 OWNS the `ReportSnapshotDoc` writer** (`computeAndSyncReportSnapshot`, §2.4/§4.3) + `config/{global}`
>   seeding + the `pairKidDevice(code, localCid)` link for a pre-existing offline child (§8 #21).
> - **VPC is real:** `recordConsent` rejects `dev_mock` outside the emulator; `provisionChild` requires a non-mock
>   verified method (`payment-verified` ships) (§8 #29). Non-training provider config is asserted, not documented.

---

## 1. Overview + user value + verified evidence

### 1.1 What this workstream delivers

A Firebase (GCP) backend that is **purely additive oversight/sync** on top of the shipped, green,
offline-first v1 kid app. Concretely:

1. **Parent accounts** (email/password) with custom claims `role: "parent"`, and **server-provisioned
   child identities** (`role: "kid"`, `parentUid`, `childId`) that can exist **only under a verified
   parent** — the COPPA verifiable-parental-consent gate.
2. A **Firestore data model** (`users`, `children` + subcollections `settings`/`boards`/`schedules`/
   `activity`/`transcripts`/`alerts`, and a global `config`) that is the **system of record for oversight**
   — never the source of truth for the child's core tools.
3. **Retention TTL** (native Firestore TTL policies + a scheduled backstop sweep) and **PII redaction
   before storage** (a single admin-only write chokepoint for transcripts guarantees redaction).
4. An **additive offline→cloud sync adapter** in the kid app: **one-way-up** for activity/progress
   (append-only mirror for parent monitoring) and **two-way** for settings/controls (parent-authoritative
   controls pushed down; child sensory/autonomy prefs merged up). The **v1 `storage` port stays the source
   of truth** for the child core (AAC, schedules, first-then, emotion, token loop).
5. **Security rules** (default-deny, opened per-collection by ownership + guardian-link + role claim).
6. A **hard no-ad/analytics-SDK guarantee** in the kid app, enforced by a CI grep gate.

### 1.2 User value

- **Parents** get a trustworthy oversight layer (activity glance, transcripts, crisis alerts, controls,
  review+delete) without the app ever phoning home behind their back.
- **Children** keep a fully-functional app **with the network and the LLM OFF** — sync/oversight/chat are
  strictly additive. This is the load-bearing "don't brick the child" lesson from Moxie
  (`market-teardown.md` §D1; SYNTHESIS §Framing).
- **The product** becomes legally shippable to under-13s: verifiable consent, data minimization, retention
  limits, PII redaction, no ad/analytics tracking, LLM provider bound as a non-training processor.

### 1.3 Verified evidence (cited honestly)

Backend/data is mostly a **law + safety requirement** (`n/a` on the EBP scale), not a therapeutic claim.

- **COPPA 2025 amendments** and the **UK Children's Code (Age-Appropriate Design Code)** require verifiable
  parental consent, data minimization, no indefinite retention, and no behavioural ad/analytics tracking of
  children — **strong (law)** (SYNTHESIS §2.6; feature-matrix §D2, §D8).
- **Parent-is-the-human-in-the-loop** is the structural safety advantage Character.AI lacked — every serious
  child product ships a caregiver oversight layer (`market-teardown.md` §F8; SYNTHESIS §2 decision 5). **n/a
  (design/safety).**
- **Offline-first graceful degradation** — Moxie bricked children's companions on server shutdown; the child
  core must never depend on the cloud (`market-teardown.md` §D1). **n/a (design lesson).**
- **No EBP/therapeutic claim is made by this workstream.** It stores generic activity/mood events as
  descriptive counts only (v1 `moodInsight` is counts, never interpretation — interpretation would be AI). No
  Zones/Social-Stories efficacy claim, no speech-gain promise, no therapy/cure framing rides on this data.

---

## 2. UX behavior — the surfaces this workstream owns or gates

Most screens are owned by sibling workstreams (parent-app UI, autism-module, Bloop-character). This
workstream owns the **data contract** for all of them plus a small set of **data-rights / consent / sync-status**
surfaces. Every difference below is expressed through the v1 **resolver machinery** — **no component ever
reads raw `ageMode` or `neuroProfile`** (v1 golden rule; spec2/01 §1.2); those are only ever **synced data
fields fed into `resolveCapabilities`/`resolveTokens`/`resolveContent`**.

### 2.1 Consent + child-provisioning flow (Parent app; data owned here)

1. **Parent sign-up / sign-in** — email/password. On first sign-in, custom claim `role:"parent"`,
   `consentVerified:false` is stamped by the `beforeUserCreated` blocking function; a `users/{parentUid}`
   doc is created by an `onCreate` trigger.
2. **Verifiable parental consent screen** — before ANY child can be created, the parent completes a
   verifiable-consent step (see §6.2 for the mechanism decision). On success, a callable `recordConsent`
   writes a `ConsentRecord` into `users/{parentUid}.consent[]` and sets custom claim `consentVerified:true`.
   Until then, `provisionChild` is rejected.
3. **Add a child** — the parent provides only a **first name / nickname** (no PII beyond a first name;
   birth-date used transiently for age-band only, never stored raw beyond `ageMode`). A callable
   `provisionChild` (parent-authed + `consentVerified`) creates `children/{childId}` (deterministic
   `childId == kidUid`), seeds `children/{childId}/settings` with **`bloopEnabled:false`** (LLM OFF by
   default), and returns a **short-lived pairing code**.
4. **Pair the kid device** — the kid app calls `pairKidDevice(code)`; the server mints a **custom token**
   with claims `{ role:"kid", parentUid, childId }`. The kid device signs in with it. `beforeUserCreated`
   allows a kid uid **only if** a `children/{uid}` doc already exists under a `consentVerified` parent.

### 2.2 Kid app: sync-status + degraded states (owned here)

- **Fully offline / LLM-off is the default and the floor.** The child core reads/writes the v1 `storage`
  port only. A tiny **sync badge** (non-blocking, low-emphasis, triple-coded icon+shape+label via
  `resolveStatusPresentation`) shows `synced` / `pending` / `off` — **never** an error/red/nag state
  (anti-shame invariant). If sync is off/unreachable, activity queues in a persisted outbox and the child
  notices nothing.
- **`neuroProfile` / `ageMode` / low-stim** ride in as **synced settings fields**, then flow through the
  resolvers exactly as in v1. Autism preset → the settings sync pulls `neuroProfile:"autism"` down and the
  resolver yields low-novelty/no-auto-advance/sound+haptics-off; ADHD → brighter/faster; **both** →
  deterministic core + opt-in previewed novelty. This workstream guarantees the **field plumbing +
  offline-cached copy**, not the rendering.
- **Predictability guarantee:** a settings pull **never surprise-changes** Bloop's look/voice or the UI
  mid-session (autism invariant, SYNTHESIS §3.3 rule 5). Pulled control changes apply at the next calm
  boundary (app cold-start or explicit settings open), never mid-flow.

### 2.3 Parent app: data-rights + controls (schema owned here, UI in parent-app workstream)

- **Controls** (`children/{childId}/settings.controls`) — Bloop master on/off, per-category topic scope,
  free-text-vs-chips, usage/time limits, **retention window (30/90d)**, crisis-resource locale. **Parent is
  the only writer** (rules-enforced); these pull DOWN to the kid device read-only.
- **Review + delete** — "what's stored" reads `children/{childId}/{activity,transcripts,alerts}`; a
  `deleteChildData` callable purges the child subtree + kid Auth identity + Storage videos. Mirrors v1's
  PIN-gated `wipeAllChildData` discipline, now extended cloud-side.
- **Persistent AI-disclosure** — "Bloop is an AI helper, not a person or a doctor" is a required, always-on
  banner surfaced from `config/{global}` copy (rendered by parent-app + kid-app workstreams; the string
  source lives in `config`).

---

## 3. DATA MODEL (exact TS types)

Two homes: **(a)** additive on-device state (v1 `tb/*` slices + one new `tb/sync` slice + additive
`ChildSettings` fields — `SCHEMA_VERSION` **stays 1**, `MIGRATIONS` **stays `[]`**), and **(b)** the
Firestore documents. All shared types live in `packages/shared` so both apps + `functions/` import one source.

### 3.1 Shared enums + unions (`packages/shared/src/firestore/types.ts`)

```ts
// Role + consent
export type Role = "parent" | "kid";
export type ConsentStatus = "pending" | "verified" | "revoked";
export type ConsentMethod =
  | "credit_card_auth"      // small auth+refund (COPPA-approved VPC)
  | "gov_id_check"          // 3rd-party ID verification
  | "knowledge_based"       // KBA quiz
  | "signed_form"           // uploaded/e-signed consent form
  | "dev_mock";             // emulator/CI only — NEVER a production path (§6.2)

// Neuro axis (joins v1 AgeMode; resolver input, never a raw component read)
export type NeuroProfile = "adhd" | "autism" | "both";

// Activity mirror (one-way-up; PII-minimal aggregates only)
export type ActivityKind =
  | "step_done" | "routine_complete" | "token_earned"
  | "mood_log" | "break_taken" | "breathing_done"
  | "aac_utterance_summary" | "firstthen_done" | "schedule_step_done";

// Moderation verdict shape (verdict TYPES are shared; the SCANNERS live in the proxy workstream)
export type OnFailAction = "REASK" | "REFRAIN" | "FILTER" | "CUSTOM"; // guardrails-ai OnFailAction (§5)
export interface ModerationVerdict {
  scanner: string;            // e.g. "toxicity" | "ban_topics" | "pii" | "crisis"
  valid: boolean;
  score: number;              // 0..1
  action?: OnFailAction;
}

// Crisis alerts
export type AlertSeverity = "info" | "warn" | "crisis";
export type AlertStatus = "new" | "seen" | "acknowledged" | "resolved";

// PII redaction (the pre-storage contract; deterministic layer owned here)
export type PiiCategory =
  | "email" | "phone" | "street_address" | "full_name" | "url"
  | "geo" | "gov_id" | "dob" | "biometric";
export interface RedactionResult {
  redactedText: string;       // safe to store; PII replaced with [redacted:<category>]
  found: PiiCategory[];       // categories detected (store the FACT, never the value)
  changed: boolean;
}
```

### 3.2 Firestore document types (`packages/shared/src/firestore/types.ts`)

`EpochMs = number`; `Ts` = Firestore `Timestamp` (admin/client SDK). Client-facing docs never carry
server-only fields (donor client/firestore model split, `_sources2/firebase-cloud-functions-typescript-example`).

```ts
// users/{parentUid}
export interface ParentUserDoc {
  uid: string;
  role: "parent";
  email: string;                 // parent email (adult PII — allowed, access-controlled)
  displayName?: string;
  consent: ConsentRecord[];      // append-only audit trail (ConsentRecord from compliance/consent.ts, §8 #20)
  fcmTokens: { token: string; type: "fcm" | "apns" }[];  // crisis push targets; token TYPE recorded (§8 #26)
  email: string;                 // verified — the crisis email fallback channel (§8 #26)
  retentionDays: 30 | 90;        // DEFAULT 30 (COPPA-min, §8 #10b); applied to child transcripts/activity
  crisisLocale: string;          // e.g. "US" | "IN" | "GB" — selects the hotline table
  createdAt: Ts;
  updatedAt: Ts;
}
export interface ConsentRecord {
  status: ConsentStatus;
  method: ConsentMethod;
  verifiedAt: Ts;
  ip?: string;                   // COPPA audit; short-retention, never shared
  version: string;              // consent-policy version accepted
}

// children/{childId}   (childId === kid Firebase Auth uid)
export interface ChildDoc {
  childId: string;
  parentUid: string;             // the guardian link (authoritative)
  displayName: string;           // FIRST NAME / nickname only — no further PII
  neuroProfile: NeuroProfile;    // resolver input; per-child override
  ageMode: "young" | "older" | "preteen";
  createdAt: Ts;
  updatedAt: Ts;
}

// children/{childId}/settings/{doc="current"}   — the two-way merge surface
export interface ChildSettingsDoc {
  // CONTROLS — parent-authoritative (rules: only parent writes this map)
  controls: {
    bloopEnabled: boolean;       // DEFAULT false (LLM OFF by default)
    inputMode: "aac" | "chips" | "freetext" | "voice";
    topicScope: string[];        // allow-list category ids
    limits: { perMinute: number; perDay: number; sessionMinutes: number };
    retentionDays: 30 | 90;      // per-child override of parent default
    crisisLocale: string;
    updatedAt: Ts;
    updatedBy: "parent";
  };
  // PREFERENCES — two-way (field-level last-writer-wins; child may edit within curated caps)
  preferences: {
    sensory: SensoryProfile;     // §3.3
    companionName?: string;
    companionLook?: string;      // one of 3–6 curated ids
    reducedMotion?: boolean;
    updatedAt: Ts;
    updatedBy: "parent" | "kid";
  };
}
export interface SensoryProfile {
  soundEnabled: boolean;
  hapticsEnabled: boolean;
  animationIntensity: "low" | "standard" | "lively";
  celebrationEnabled: boolean;
  voiceEnabled: boolean;
  lowStim: boolean;              // maps to v1 SensoryMode "lowStim"
}

// children/{childId}/boards/{boardId}   (speakeasy-aac Symbol/Board primitive)
export interface BoardDoc {
  id: string;
  name: string;
  parentId: string | null;       // folder tree
  symbolIds: string[];           // ordered
  gridSize: { cols: number; rows: number };
  kind: "aac" | "choice" | "firstthen" | "schedule";
  updatedAt: Ts;
}
export interface SymbolDoc {
  id: string;
  label: string;
  imageUrl: string;              // Storage URL — cleared-license asset only (§5.7)
  category: string;
  isCore: boolean;
  backgroundColor?: string;
}

// children/{childId}/schedules/{scheduleId}
export interface ScheduleDoc {
  id: string;
  name: string;
  steps: ScheduleStep[];
  transition: { warnSeconds: number; requireReadyTap: boolean }; // A4 no-auto-advance
  updatedAt: Ts;
}
export interface ScheduleStep {
  id: string;
  label: string;
  symbolId?: string;
  photoUrl?: string;
  videoRef?: string;             // Storage ref (A8 video modeling)
  ttsText?: string;
}

// children/{childId}/activity/{eventId}   — one-way-UP mirror (append-only)
export interface ActivityEventDoc {
  id: string;                    // client-generated ULID (idempotent upsert)
  kind: ActivityKind;
  at: Ts;                        // event time
  payload: Record<string, number | string | boolean>; // AGGREGATE/COUNTS ONLY — no free text, no PII
  createdAt: Ts;
  expiresAt: Ts;                 // TTL (createdAt + retentionDays)
}

// children/{childId}/transcripts/{turnId}   — admin-only write (proxy). PII-REDACTED.
export interface TranscriptTurnDoc {
  id: string;
  role: "child" | "bloop";
  redactedText: string;          // NEVER raw child text — passed through redactPii (§4/§6)
  pii: { found: PiiCategory[] };  // the FACT of PII, never the value
  verdicts: ModerationVerdict[]; // from the proxy pipeline
  model?: "gemini-flash" | "deepseek" | "mock" | "scripted";
  flagged: boolean;
  createdAt: Ts;
  expiresAt: Ts;                 // TTL
}

// children/{childId}/alerts/{alertId}   — admin-only write (crisis trigger). → FCM.
export interface AlertDoc {
  id: string;
  severity: AlertSeverity;
  reason: string;                // e.g. "self_harm_signal" | "abuse_disclosure"
  transcriptWindow: string[];    // ids of the surrounding turns (already redacted)
  status: AlertStatus;
  createdAt: Ts;
  expiresAt: Ts;                 // longer TTL than transcripts (parent must act)
}

// config/{global}   — read-only to clients; admin-only write
export interface GlobalConfigDoc {
  moderationThresholds: Record<string, number>;
  scopeCategories: { id: string; label: string }[];
  crisisResources: Record<string /*locale*/, CrisisResource[]>; // PRE-WRITTEN, human-reviewed
  aiDisclosure: string;          // the persistent "Bloop is an AI helper…" copy
  version: string;
}
export interface CrisisResource {
  locale: string;
  name: string;
  phone: string;                 // human-reviewed, region-localized (988 = US only)
  text?: string;
  hours?: string;
}
```

### 3.3 On-device additive state (kid app — `SCHEMA_VERSION` stays 1)

**(a) Additive optional fields on the existing `ChildSettings`** (`apps/kid/src/domain/types.ts`;
same additive pattern as the shipped `moodCheckinEnabled?`/`soundscape?` fields — merges through
`mergeWithDefaults`/`validateAndRepair` with **no bump**):

```ts
// widen the age axis with the neuro axis (union add — additive, no bump; spec2/01 §1.2)
export type NeuroProfile = "adhd" | "autism" | "both";

interface ChildSettings {
  // …existing v1 fields…
  neuroProfile?: NeuroProfile;        // absent ⇒ resolver default by ageMode
  bloopEnabled?: boolean;             // absent ⇒ false (LLM OFF by default)
  bloopInputMode?: "aac" | "chips" | "freetext" | "voice";
  bloopTopicScope?: string[];
  bloopLimits?: { perMinute: number; perDay: number; sessionMinutes: number };
  retentionDays?: 30 | 90;            // absent ⇒ parent default (30, COPPA-min, §8 #10b)
  crisisLocale?: string;              // absent ⇒ device locale → nearest supported
  cloudSyncEnabled?: boolean;         // absent ⇒ false (additive; never bricks the core)
  firestoreChildId?: string;          // local cid ↔ Firestore childId link (set on pairing)
}
```

**(b) One new persisted store slice `tb/sync`** (`apps/kid/src/state/syncStore.ts`) — follows the shipped
`registerPersistedStore` + `createTbPersistOptions({ name, partialize })` pattern, auto-covered by backup
(`getAllKeys`), cleared by `wipeAllChildData`, counted in `DataReview`, added to the migration fixture:

```ts
export interface OutboxItem {
  localId: string;               // ULID; idempotency key (== Firestore doc id)
  childId: string;               // Firestore childId
  collection: "activity";        // one-way-up only ever appends activity
  doc: ActivityEventDoc;         // already PII-minimal; NEVER carries transcript/free text
  attempts: number;
  enqueuedAt: EpochMs;
}
export interface SyncState {
  linkage: Record<string /*localCid*/, { childId: string; parentUid: string }>;
  outbox: OutboxItem[];          // survives offline; drains when online + consented
  cursors: Record<string /*collection*/, string>; // last pulled doc id/ts per child
  lastPushAt?: EpochMs;
  lastPullAt?: EpochMs;
  status: "off" | "pending" | "synced" | "paused";
}
```

**Migration story:** every addition above is (1) an optional field on an existing persisted interface,
(2) a union widening, or (3) a brand-new independent slice — the exact three additive shapes the shipped
engine handles with **no migration entry** (v1 architecture §2.2). `SCHEMA_VERSION` **stays 1**;
`MIGRATIONS` **stays `[]`**; extend `__tests__/storage/migration-forward.test.ts` with the new fields +
slice (spec2/01 §1.10, §2.5).

### 3.4 Offline-first + additive sync semantics

- **Source of truth = the v1 `storage` port** for the child core. The Firestore mirror is derived, never
  authoritative for AAC/schedules/first-then/emotion/token loop. Delete Firebase entirely and the child
  app is unchanged (Moxie invariant).
- **One-way-UP (activity/progress):** the sync adapter observes store commits (a thin subscription on the
  gameplay orchestrator's completion events), builds a PII-minimal `ActivityEventDoc`, appends to the
  `tb/sync` outbox, and drains it to `children/{childId}/activity` when online + `cloudSyncEnabled` +
  consent. **Idempotent** (`localId == docId`, `set` with merge). Never deletes/updates upstream.
- **Two-way (settings):** `children/{childId}/settings.controls` is **parent-authoritative** (rules block
  child writes) → pulled down read-only into `ChildSettings`. `settings.preferences` is **field-level
  last-writer-wins** on `updatedAt` — the child may edit sensory/autonomy within v1 curated caps and those
  push up; a parent edit wins if newer. Conflict policy is per-field, server-timestamp-ordered; no
  three-way merge, no lost writes beyond the deliberate LWW.
- **The sync adapter is the ONLY egress module in the kid app** (§4) — everything else stays egress-free.

---

## 4. EXACT files to CREATE / MODIFY (real monorepo paths)

Paths assume the completed monorepo migration (spec2/01 §2). The monorepo scaffold (`git mv tiny-bubbles →
apps/kid`, root workspaces, `packages/shared` skeleton, `functions/` toolchain) is a **dependency** on the
monorepo-migration workstream; this workstream authors the files **inside** that layout.

### 4.1 `functions/` — CREATE (net-new, TS; the only egress zone)

```
functions/
├── package.json                              CREATE  firebase-admin, firebase-functions, express; own node_modules
├── tsconfig.json                             CREATE  (donor firebase-cloud-functions-typescript-example)
├── src/
│   ├── index.ts                              CREATE  export all functions (donor index.ts pattern; MyClaims → Role)
│   ├── firebaseAdmin.ts                      CREATE  admin.initializeApp(); shared db/auth/messaging handles
│   ├── auth/
│   │   ├── beforeUserCreated.ts              CREATE  COPPA gate: stamp role:parent; allow kid uid ONLY if children/{uid} exists under a consentVerified parent
│   │   ├── onParentCreated.ts                CREATE  onDocumentCreated? no — auth onCreate → seed users/{uid} doc
│   │   ├── provisionChild.ts                 CREATE  callable: parent+consentVerified → create children/{childId} + seed settings (bloopEnabled:false) + pairing code
│   │   ├── pairKidDevice.ts                  CREATE  callable: exchange pairing code → custom token {role:kid,parentUid,childId}
│   │   └── setClaims.ts                       CREATE  helper: admin.auth().setCustomUserClaims
│   ├── consent/
│   │   └── recordConsent.ts                  CREATE  callable: capture verifiable consent → ConsentRecord + claim consentVerified
│   ├── data/
│   │   ├── (redactPii.ts)                    DO NOT CREATE — import redactPii from @tiny-bubbles/shared/compliance/pii (§8 #7)
│   │   ├── seedGlobalConfig.ts               CREATE  idempotent admin write mirroring shared compliance → config/{global} (§8 #21b; run M6.1)
│   │   ├── computeReportSnapshot.ts          CREATE  server-side helper shape; the kid adapter (§4.3) is the writer of reports/{rangeKey}
│   │   ├── models/                           CREATE  client/firestore split for Child/Settings/Transcript/Alert (donor model pattern)
│   │   └── deleteChildData.ts                CREATE  callable: parent review+delete — purge child subtree + kid Auth user + Storage (SKIP legalHold docs, §2.5)
│   ├── retention/
│   │   ├── ttlSweep.ts                       CREATE  onSchedule daily: backstop delete of expiresAt<now + orphan Storage videos (donor delete-unused-accounts-cron)
│   │   └── onRetentionChange.ts              CREATE  onDocumentUpdated users/{uid}: re-stamp expiresAt when retentionDays shrinks
│   ├── alerts/
│   │   └── sendParentAlert.ts                CREATE  FCM push helper (donor fcm-notifications) — INVOKED by the proxy's crisis trigger
│   └── interceptors/
│       └── verifyIdToken.ts                  CREATE  port of donor verify-idtoken-interceptor.ts (+ App Check + load child settings/bloopEnabled)
├── firestore.rules                           CREATE  §5 (start from donor locked-default)
├── firestore.indexes.json                    CREATE  §3.2 query indexes
├── storage.rules                             CREATE  parent-write / owner-read for board/schedule/video assets
├── firebase.json                             CREATE  functions + firestore + storage + emulators (donor firebase.json)
└── __tests__/
    ├── rules.test.ts                         CREATE  @firebase/rules-unit-testing against firestore.rules
    ├── redactPii.test.ts                     CREATE  asserts every PiiCategory redacted; no raw PII survives
    ├── auth.test.ts                          CREATE  emulator: kid-uid blocked without verified parent; provision flow
    └── retention.test.ts                     CREATE  emulator: expiresAt stamping + sweep
```

> **Shared with the Bloop-proxy workstream (do NOT duplicate):** the proxy authors
> `functions/src/bloop/*` (input/output shields, persona, crisis *detection*, model call) and the transcript
> `onWrite` crisis trigger. It **imports** `redactPii`, `verifyIdToken`, `sendParentAlert`, and the
> transcript/alert models from **this** workstream. Coordinate on `functions/src/index.ts` exports.

### 4.2 `packages/shared/` — CREATE

```
packages/shared/src/
├── firestore/
│   ├── types.ts        CREATE  §2.3 CANONICAL doc types + ReportSnapshotDoc — one source for kid, parent, functions
│   ├── paths.ts        CREATE  collection-path helpers (userDoc, childDoc, activityCol, transcriptCol, reportCol, …)
│   └── (redaction.ts)  DO NOT CREATE — PiiCategory/RedactionResult/redactPii are w8 compliance/pii.ts (§8 #7, #20)
├── sync/
│   └── types.ts        CREATE  OutboxItem, SyncState, ActivityEventDoc re-export
└── domain/
    └── (NeuroProfile)  imported from domain/types.ts (w8 owns the axis, §8 #12) — no separate neuroProfile.ts
```

### 4.3 `apps/kid/` — CREATE / MODIFY

```
apps/kid/src/
├── sync/                                    CREATE  ← the ONLY egress module in the kid tree
│   ├── firebase.ts                          CREATE  initializeApp + Auth + Firestore handles; firebaseConfig from EXPO_PUBLIC_* env (NO https:// literal, §1.4); @react-native-firebase/app-check on native prod build only (§8 #25)
│   ├── cloudSync.ts                         CREATE  exports emitActivity(kind,payload) — the SHARED activity-emit seam (ALL producers, §2.4); drain up; pull settings/boards/schedules/narratives down; computeAndSyncReportSnapshot → reports/{rangeKey}
│   ├── syncQueue.ts                         CREATE  persisted outbox ops over the storage port
│   ├── fcmToken.ts                          CREATE  register push token per platform (Android=getDevicePushTokenAsync=FCM; iOS=@react-native-firebase/messaging FCM reg token) + record token TYPE (§8 #26)
│   └── settingsSync.ts                      CREATE  two-way settings merge (parent-authoritative controls; LWW prefs)
├── state/
│   └── syncStore.ts                         CREATE  tb/sync slice (§3.3b)
├── domain/types.ts                          MODIFY  add NeuroProfile + additive ChildSettings fields (§3.3a); retentionDays 30|90 default 30
├── state/gameplay.ts                        MODIFY  completeStep/completeScheduleStep → emitActivity(...); wipeAllChildData → clear syncStore. NON-gameplay producers (w6 moods/break/breathing/movement, w4 aac aggregate) ALSO call emitActivity — one seam, every ActivityKind (§2.4)
├── storage/schemaVersion.ts                 MODIFY  (comment only) note tb/sync store slice; NO version bump
app/(parent-not-here)                        —       parent screens are the parent-app workstream
apps/kid/__tests__/
├── config/no-network.test.ts                MODIFY  allowlist src/sync/** + firebase SDK import; ADD no-analytics ban (§5.4/§7)
├── config/no-analytics.test.ts              CREATE  ban firebase/analytics, ad SDKs, Segment/Amplitude/etc in apps/kid
├── storage/migration-forward.test.ts        MODIFY  extend fixture with new fields + tb/sync slice
└── sync/cloudSync.test.ts                   CREATE  offline-outbox + idempotency + LWW settings merge (mock Firestore)
```

### 4.4 `apps/parent/` — CREATE (data-layer only; screens = parent-app workstream)

```
apps/parent/src/services/
├── firebase.ts            CREATE  SDK init (Auth + Firestore + App Check)
├── consent.ts             CREATE  calls recordConsent
├── childProvisioning.ts   CREATE  calls provisionChild / pairing code display
├── dataRights.ts          CREATE  calls deleteChildData; export child data
└── (hooks useChildActivity/useTranscripts/useAlerts — thin real-time readers, may be authored by parent-app workstream against these services)
```

---

## 5. Reused donor parts (repo · license · files)

All **ship-safe** (MIT/Apache-2.0). Guardrail donors are Python and belong to the proxy workstream (patterns
only). GPL/AGPL = **reference-only**, none enters this tree.

| Donor (under `_sources2/`) | License | Reused for | Concrete files |
|---|---|---|---|
| **firebase-cloud-functions-typescript-example** | **MIT** ✅ | CF backbone (already TS) | `functions/src/api/interceptors/verify-idtoken-interceptor.ts` → `interceptors/verifyIdToken.ts`; controller/trigger pattern; `event-triggers/by-document/*` `onDocument*` → alert trigger; `core/data/models/*/{client,firestore}/` split → our model split; **`firestore.rules` locked default** → §5 start; `firebase.json` (functions+firestore+emulators) → our `firebase.json`; `functions/src/index.ts` `MyClaims` typing → `Role` custom claims |
| **firebase-functions-samples** | **Apache-2.0** ✅ | auth lifecycle · FCM · cron cleanup | `Node/quickstarts/auth-blocking-functions/functions/index.js` (`beforeUserCreated`/`beforeUserSignedIn` + `HttpsError` reject) → `auth/beforeUserCreated.ts` COPPA gate; `Node/fcm-notifications/functions/index.js` (`getMessaging().send`, tokens→push) → `alerts/sendParentAlert.ts`; `Node/delete-unused-accounts-cron/functions/index.js` (`onSchedule` + `PromisePool`) → `retention/ttlSweep.ts`; `Python/quickstarts/firestore-sync-auth` (Auth↔Firestore mirror) → `auth/onParentCreated.ts` concept |
| **expo-firebase-boilerplate-v2** | **MIT** ✅ (port JS→TS) | app-side Auth/Firestore/Storage/push wiring | `src/firebase/config.js` → `apps/*/src/services/firebase.ts` (**scrub committed demo creds**); `src/scenes/{login,registration,initial}` → parent auth; `src/routes/.../RootStack.js` → auth-gated routing; `src/context/UserDataContext.js` → real-time monitoring provider; **`follow/` + `follower/` → the guardian-of parent↔child link**; Expo push-token→Firestore `tokens` → FCM crisis targets |

**Not this workstream (referenced only):** `llm-guard` (MIT), `nemo-guardrails` (Apache), `guardrails-ai`
(Apache) — Python guardrail patterns → the **proxy** workstream. This workstream only reuses the **verdict
type shapes** (`ModerationVerdict`, `OnFailAction`) as TS types so transcripts/alerts have a stable schema.
`speakeasy-aac` (MIT) `Symbol`/`Board` model → the **autism-module** workstream defines the on-device board
types; this workstream mirrors them into `BoardDoc`/`SymbolDoc` for Firestore.

---

## 6. SAFETY + anti-shame + COPPA rules that apply

### 6.1 PII redaction before storage (the enforceable chokepoint)

- **Single write path = enforceable redaction.** Transcripts are **admin-only writes** (rules: `write: if
  false`); only the proxy writes them, and the proxy MUST call `redactPii(childText)` first and store
  `redactedText` + `pii.found` — **never raw text**. Because there is exactly one writer, redaction is
  provable (`redactPii.test.ts` asserts no raw PII survives across a fixture of emails/phones/addresses/
  names/URLs; a transcript-schema test asserts the raw field does not exist).
- `redactPii` (owned here) is the **deterministic** layer (regex: email, phone, street address, URL, gov-id,
  DOB, coarse geo, full-name heuristic) ported 1:1 from `llm-guard`'s `regex.py`/`ban_substrings.py`
  taxonomy to TS. Heavy ML PII (Presidio-class) is **delegated to GCP DLP / Model Armor** by the proxy
  workstream; the two compose — deterministic first (free), ML for ambiguity.
- **Both directions:** inbound child PII is refused/scrubbed before the model call; outbound model PII is
  scrubbed before render/store. Log the **fact** of a refusal, never the PII value (COPPA data minimization).
- **Activity events carry no free text** — `payload` is aggregates/counts only (`ActivityKind` is a closed
  set), so the one-way-up mirror cannot leak an utterance.

### 6.2 COPPA-2025 + UK Children's Code (hard law)

- **Verifiable parental consent BEFORE a child exists.** `provisionChild` is rejected unless the parent's
  token carries `consentVerified:true`; `beforeUserCreated` allows a kid uid only if `children/{uid}` was
  already provisioned by a verified parent. This is age-assurance-beyond-attestation.
- **Data minimization:** child docs store a **first name only**; birth-date is used transiently for the
  age-band and only `ageMode` persists; no biometric/voiceprint stored (categories reserved in
  `PiiCategory` for a future voice feature — refused, not stored).
- **Retention TTL:** native Firestore TTL policies on `transcripts.expiresAt`, `activity.expiresAt`,
  `alerts.expiresAt` (parent-configurable 30/90d). `expiresAt = createdAt + retentionDays` stamped at write;
  `onRetentionChange` re-stamps when a parent shortens the window; `ttlSweep` is the daily backstop and also
  purges orphan Storage videos TTL cannot reach. A **written retention policy** accompanies the code.
- **No ad/analytics SDKs in the kid app** (see §5.4 test): no `firebase/analytics`, no ad SDK, no
  Segment/Amplitude/Mixpanel; Firebase telemetry minimized. The store claim "no behavioural tracking of
  children" must be TRUE.
- **LLM provider bound as a non-training processor:** Vertex AI / provider configured with a processor DPA,
  data residency, and prompt-logging disabled — enforced as **project config**, documented in the retention
  policy, and the proxy workstream sets the SDK flags. No third-party data sharing (separate-opt-in answer:
  none).
- **Parent review + delete:** `deleteChildData` is a hard requirement (parent right to erasure).

### 6.3 Anti-shame invariants (carried from v1)

- The sync/data layer **never** introduces a failure/red/nag state: the sync badge is `off/pending/synced`
  only; a stuck outbox is silent + retried, never surfaced as an error to the child.
- Activity/mood data is **descriptive counts only** — no computed emotional label, no "you missed" — because
  interpretation would be AI and would reintroduce shame (v1 `moodInsight` invariant).
- Downgrade is acquisition-only cloud-side too: turning sync/Bloop off never deletes owned boards/schedules
  or the child's local core data.

### 6.4 Never-list (data layer)

- **Never** client→LLM-provider calls (egress is functions-only; the kid app's only network surface is the
  allowlisted `src/sync/` Firebase channel + the Functions proxy).
- **Never** store a model-invented crisis number — `AlertDoc`/in-chat crisis copy is **pre-written,
  human-reviewed, region-localized** from `config.crisisResources` (the proxy renders it; this workstream
  stores + serves it). 988 is US-only; `crisisLocale` selects the right table (India etc. need their own).
- **Never** promise secrecy — transcripts are parent-visible by design; the child is told grown-ups can see
  chats (copy owned by proxy/kid workstreams, backed by this schema).

---

## 7. ACCEPTANCE CRITERIA + verify steps

### 7.1 App tree (apps/kid, apps/parent, packages/shared)

- **`tsc` = 0** across every workspace: `npm -w @tiny-bubbles/kid run typecheck`, `-w @tiny-bubbles/parent`,
  `-w @tiny-bubbles/shared`. New types compile; `NeuroProfile`/`ChildSettings` additions type-check.
- **jest green** — kid suite still passes (69 baseline + new): `npm -w @tiny-bubbles/kid test`.
  - `migration-forward.test.ts` passes with the extended fixture (new fields present-with-default, `tb/sync`
    hydrates, no existing value lost, anti-shame invariants intact) → **proves `SCHEMA_VERSION` stays 1**.
  - `cloudSync.test.ts`: offline → events queue in outbox; online → drain is idempotent (`localId==docId`,
    no dupes on retry); settings LWW merge (parent controls win; newer child pref wins for prefs; parent
    controls never overwritten by child). **`emitActivity` produces an outbox entry for EACH canonical
    `ActivityKind`** (gameplay + non-gameplay: `mood_log`/`emotion_logged`/`break_taken`/`breathing_done`/
    `movement_break`/`aac_utterance_summary`) — §2.4. `computeAndSyncReportSnapshot` writes a PII-free
    `ReportSnapshotDoc` to `reports/{rangeKey}` (rules: kid-write own child / parent-read).
- **no-egress gate green** — `no-network.test.ts` passes with `src/sync/**` + the Firebase SDK import as the
  ONLY allowlisted egress; a raw `fetch(`/`http://` anywhere else still fails the build.
- **no-analytics gate green** — `no-analytics.test.ts` greps `apps/kid/{app,src,components}` and FAILS on any
  import of `firebase/analytics`, `@react-native-firebase/analytics`, `expo-*analytics*`, ad SDKs
  (`react-native-google-mobile-ads`, AdMob, Facebook), or `segment`/`amplitude`/`mixpanel`/`posthog`.
- **expo export** — `npx expo export -p ios --output-dir /tmp/kid-export` (and web) succeeds for apps/kid;
  the sync adapter is behind a dynamic import so a no-Firebase build still exports. Verify the child core
  loads with `cloudSyncEnabled:false` (offline, LLM off) — full function.

### 7.2 Functions (emulator + unit)

- **Emulator boots:** `firebase emulators:start --only auth,firestore,functions,storage` (ports from
  `firebase.json`).
- **`functions/tsc` = 0**; `npm --prefix functions run build`.
- **Security rules tests** (`rules.test.ts`, `@firebase/rules-unit-testing`):
  - default-deny holds for an unauthenticated client;
  - parent reads/writes only their own `users/{uid}` + their `children/*`; cannot read another parent's tree;
  - kid token (`role:kid`, matching `childId`) can **create** `activity` (own child) but cannot read/write
    `transcripts`, cannot write `settings.controls`, cannot read `alerts` internals;
  - child cannot write `settings.controls` (parent-authoritative); can write `settings.preferences`;
  - `transcripts`/`alerts` are `write: if false` (admin-only) and parent-readable.
- **Auth/consent tests** (`auth.test.ts`): `provisionChild` rejected without `consentVerified`;
  `beforeUserCreated` rejects a kid uid with no provisioned `children/{uid}`; accepts after provisioning;
  claims correctly stamped. **VPC (§8 #29):** `recordConsent` rejects `dev_mock` under a prod-like config
  (`FIREBASE_AUTH_EMULATOR_HOST` unset) and only sets `consentVerified` after a `payment-verified`/
  `signed-form-email-verified` flow; `provisionChild` requires a non-mock verified method. **Reachable-channel
  gate (§8 #26):** enabling `bloopEnabled` requires a verified FCM token AND parent email.
- **Deploy packaging (§1.5, §8 #24):** `functions/` `build:deploy` (esbuild `--bundle`) inlines all
  `@tiny-bubbles/shared` runtime into `lib/index.js` (`firebase-admin`/`-functions` external); a deployed-callable
  smoke-check (`pingBloop`) proves cold-start module resolution. `pairKidDevice(code, localCid)` links a
  pre-existing offline child without destructive migration (§8 #21c).
- **Redaction tests** (`redactPii.test.ts`): every `PiiCategory` sample is redacted; `redactedText` contains
  no raw sample; `found` lists the right categories; a transcript built from redacted output has no raw PII
  field (schema-level assertion).
- **Retention tests** (`retention.test.ts`): writes stamp `expiresAt = createdAt + retentionDays`;
  `onRetentionChange` re-stamps on shrink; `ttlSweep` deletes `expiresAt < now` docs + orphan Storage videos.
  (Native TTL policy config is verified manually via `gcloud firestore fields ttls` / console — documented,
  not unit-testable in the emulator.)
- **Grep floors:** no committed Firebase credentials/keys in the tree (`git grep -iE 'apiKey|AIza|serviceAccount'`
  returns only config templates/env references, never a live secret).

---

## 8. Dependencies · premium/free · LLM-on/off behavior

### 8.1 Dependencies on other workstreams

- **Monorepo-migration workstream (BLOCKS this):** must land the `git mv → apps/kid`, root npm workspaces +
  hoisted lockfile, `tsconfig.base.json` aliases, monorepo Metro config, `packages/shared` skeleton, and the
  net-new `functions/` toolchain (excluded from Metro `watchFolders`) **before** this workstream's files have
  a home (spec2/01 §2). This workstream then **retargets** `no-network.test.ts` to the app trees.
- **Bloop-proxy / guardrails workstream (SHARES `functions/`):** owns the input/output shields, persona,
  crisis *detection*, model call, and the transcript `onWrite` crisis trigger. **Consumes** this workstream's
  `redactPii`, `verifyIdToken` interceptor, `sendParentAlert`, and transcript/alert models. This workstream
  ships the **mock-first `bloopProvider` seam contract** (in `packages/shared`) so the kid app stays
  green/offline while the proxy is stubbed (C9); the proxy provides the real impl.
- **Parent-app UI workstream (CONSUMES):** builds dashboard/transcript/controls/authoring screens on top of
  this schema + the `apps/parent/src/services/*` data layer.
- **Autism-module workstream (CONSUMES):** defines the on-device `Board`/`Symbol`/`Schedule` types
  (speakeasy-aac); this workstream mirrors them into `BoardDoc`/`ScheduleDoc` for parent authoring + kid pull.
- **Bloop-character workstream (INDEPENDENT):** deterministic character needs no backend; only the chat layer
  touches this schema.

### 8.2 Premium / free

- **FREE (never gated — core/accessibility/safety):** parent account + login, COPPA consent gate, guardian
  link, **1 child**, activity monitoring, transcript visibility, **all crisis alerts + FCM** (safety is never
  paywalled), controls (Bloop on/off, scope, limits, retention, locale), review+delete, offline-first sync of
  the core loop. The child core works fully free, offline, LLM-off.
- **PREMIUM (reuse v1 `FEATURE_GATES`, acquisition-only downgrade):** additional children
  (`multiChild` 2–8), and any **extended cloud insight depth** (multi-week activity/transcript analytics)
  maps to the existing `advancedInsights` gate. **No safety feature is ever premium.** Gate only through
  `src/services/entitlements.ts` (`isFeatureUnlocked`/`canAddMore`) — no scattered tier checks.

### 8.3 LLM-on / LLM-off behavior

- **LLM OFF (default):** `bloopEnabled:false`. No transcripts written, no proxy calls, no alerts from chat.
  Activity mirror + settings sync + monitoring **still work** (they are independent of the LLM). The child
  core is fully functional. This is the shipped state until a parent explicitly enables chat.
- **LLM ON (parent-gated):** the proxy path activates; transcripts (PII-redacted, TTL'd) + crisis alerts +
  FCM engage. This workstream's schema/redaction/retention/rules are what make that path storable and legal.
- **Network OFF (any time):** activity queues in the persisted outbox; settings pulls are skipped; the child
  core is untouched. Nothing bricks.

---

## 9. Open assumptions

1. **Verifiable-consent mechanism is a product/legal decision.** `ConsentMethod` enumerates COPPA-approved
   options (credit-card auth, gov-ID, KBA, signed form); the actual integration (e.g. a 3rd-party VPC vendor)
   is out of scope here — this workstream ships the schema, the `recordConsent` callable, and the enforcement
   gate, with `dev_mock` for emulator/CI **never** reachable in production.
2. **Kid identity model = server-minted custom-token Firebase Auth users** (`kidUid == childId`), never client
   signup. If the product prefers *no* kid Auth account (kid device authenticates as a restricted parent-scoped
   token), the rules `request.auth.uid == childId` checks change — flag before build. Chosen model gives clean
   per-child rules + App Check + rate-limiting.
3. **App Check enforcement** is enabled at the project level for Firestore + Functions (not expressible in
   rules). Provider = App Attest (iOS) / Play Integrity (Android); debug provider for dev.
4. **Native Firestore TTL** is the primary deletion path; `ttlSweep` is the backstop for shortened windows +
   Storage assets. TTL policies must be created out-of-band (`gcloud`/console) as part of project setup —
   documented, not code.
5. **Sync conflict policy = field-level last-writer-wins** on server timestamp, with `controls` parent-only
   (rules-enforced). No CRDT/three-way merge; acceptable for low-frequency settings. Revisit only if
   simultaneous multi-device parent editing becomes common.
6. **The kid app gains ONE sanctioned egress surface** (`src/sync/` + the Firebase SDK), reconciling the v1
   "no-egress" invariant: LLM-provider egress stays functions-only; the sync channel is App-Check + Auth +
   consent + flag gated and additive. If the locked decision requires *zero* client Firestore access (all
   kid↔cloud via Functions), route activity through a `syncActivity` callable instead — flag before build.
7. **`config/{global}` crisis tables must be authored + human-reviewed per launch locale** (988 = US only).
   India + any other launch locale need their own reviewed numbers before Bloop chat ships in that region.
8. **Parent email is adult PII and is stored** (allowed, access-controlled); only *child* PII is minimized to
   a first name. If a stricter reading is required, move parent email to a separate access-scoped doc.
