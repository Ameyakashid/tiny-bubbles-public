# Workstream w3 — Parent App (`apps/parent`)

*Authored 2026-07-09. Durable, buildable workstream spec for the **net-new** `apps/parent` Expo app in the
Tiny Bubbles v2 monorepo. Grounds every reuse claim in a real path. Authoritative inputs:
`_build/research2/00-SYNTHESIS2.md` (§2.6, §4.5, §5.6), `_build/research2/01-v2-feature-matrix.md` (§D rows
D1–D8), `_build/spec2/01-current-and-target.md` (§3.1, §3.4, §4E), the shipped v1 app under
`/Users/ameyakashid/Desktop/adhd india/tiny-bubbles/`, and donor code under
`/Users/ameyakashid/Desktop/adhd india/_sources2/`. Mind the SPACE in every path.*

> ## Scope of THIS workstream (do not expand)
> `apps/parent` (net-new Expo SDK 56 / RN 0.85 / TS app) delivering:
> 1. **Firebase Auth login** (email/password) + auth-gated shell.
> 2. **COPPA verifiable-consent flow** (the gate that lets a child account/data exist).
> 3. A **monitoring DASHBOARD**: per-child **activity timeline** + **every companion transcript** (read-only
>    `react-native-gifted-chat` view) + **progress reports** reusing the v1 report logic.
> 4. **CONTROLS**: companion chat on/off (master LLM switch) + usage limits + per-feature toggles + quiet hours
>    + retention window + crisis locale.
> 5. **Crisis ALERTS** (FCM push inbox + acknowledge/resolve).
> 6. **Data rights**: parent review + delete child data; persistent AI-disclosure notice.
>
> **Reuses** `packages/shared` (theme + resolvers + kid-safe UI primitives + report/mood domain + Firestore
> doc contract). **Donors:** `expo-firebase-boilerplate-v2` (MIT), `react-native-gifted-chat` (MIT).
>
> **OUT of scope (other workstreams):** the Cloud Functions guardrail proxy / crisis detection / FCM *sender* /
> auth-blocking / TTL cleanup / security rules (**w-functions**); the kid-app extensions + sync adapter
> (**w-kid**); the monorepo migration + `packages/shared` extraction + Firestore data-model source-of-truth
> (**w-shared**); **board/schedule/social-narrative AUTHORING** — this now lands in **w5's authoring cluster
> (M4.2)**, under `apps/parent/app/(authoring)/`, NOT a phantom "w-parent-authoring" (§8 fix; see w4/w5). This app
> is a **reader** of `activity`/`transcripts`/`alerts`/`reports` and a **writer** of `consent`/`children`/
> `settings`. It NEVER writes transcripts (the proxy does) and NEVER calls an LLM.

> ## ⟦v2 FINAL reconciliation — `02-architecture.md` §2.3/§8 OVERRIDE this §3.2 (§8 #33)⟧
> - **Use the canonical Firestore contract (§2.3), not this §3.2 draft:** `bloopEnabled` (not `bloopChatEnabled`),
>   path `settings/current` (not `settings/controls`), `limits{perMinute,perDay,sessionMinutes}` (map
>   `dailyTurnCap`→`perDay`, `sessionMinutesCap`→`sessionMinutes`), `TopicCategory` = w2's enum (`aac`→
>   `communication`, `socialStories`→`social`), `SensoryProfile` = w6 canonical shape, `AlertSeverity=
>   info|concern|crisis`, `crisisLocale` (not `crisisRegion`), `ActivityEvent` counts-only (no free-text
>   `summary`), `ConsentRecord`/`ConsentMethod` from `compliance/consent.ts` (§8 #17/#20). `ModerationVerdict`
>   string-union is dropped for `ModerationFlag`.
> - **`ReportSnapshotDoc` has a REAL producer now** (w1 sync adapter `computeAndSyncReportSnapshot`, §8 #21) — the
>   primary report path reads `reports/{rangeKey}`, no longer orphaned.
> - **Controls form binds `caps.bloopChatAvailable` end-to-end to the canonical `bloopEnabled`** — add a test that
>   the alias mapping is correct (§8 #15).
> - **FCM receipt (§8 #26):** Android push token = `getDevicePushTokenAsync()` (that IS the FCM token); iOS needs
>   `@react-native-firebase/messaging` for a real FCM registration token (an APNs token fails
>   `admin.messaging().send()`). Store the token TYPE. Require a verified push token AND email before chat enable.
> - **SB-243 3-hour break-nudge is BUILT HERE** (w3 §4/§7, M3.1), reusing `notifications.ts` budget + copy gate —
>   no longer deferred to a non-owner (§8 fix). Evidence-honesty greps match the §8 #23 bare-trademark standard.

---

## 1. Overview + user value + verified evidence

### 1.1 What it is
The parent-facing half of the two-app product. The child never signs in; the **parent** creates the account,
grants verifiable consent, and thereby brings a child profile into existence. From then on the parent app is the
**human-in-the-loop oversight surface**: it shows what the child did (activity timeline), everything the child and
Bloop said to each other (transcripts), calm progress reports, and it is where the parent turns the LLM companion
on/off and tunes every guardrail. Crisis alerts arrive as FCM push and land in an inbox.

### 1.2 User value
- **Trust through transparency.** The parent can see *every* Bloop conversation (no secrecy) and every moderation
  flag — the structural advantage Character.AI lacked (`00-SYNTHESIS2.md` §2, market-teardown §D2).
- **Control.** Chat is **OFF by default and parent-gated**; the parent decides scope, limits, quiet hours, and
  retention. The child core (AAC, schedules, first-then, regulation, token loop) works fully with chat OFF.
- **Safety.** Crisis alerts reach the parent immediately with a transcript window; the parent is the escalation
  target, never a bare bot refusal.
- **Progress without shame.** Reports reuse the v1 anti-shame framing (resting/active streak, monotonic totals,
  no "missed/failed").

### 1.3 Verified evidence (cite honestly)
This workstream is **oversight infrastructure**, so most rows are `n/a` (safety/legal requirement) rather than an
EBP claim. The evidence that IS load-bearing:
- **Parent-in-the-loop / caregiver oversight is mandated, not optional.** APA (Nov 2025) requires "rigorously
  tested crisis-escalation pathways" + human contact; SB 243 requires minor AI-disclosure + break nudges; Common
  Sense Media: under-18s should avoid *unsupervised* AI companions (`kid-llm-safety.md` §0; `companion-design.md`
  §1). The monitored-copilot posture is the only evidence-supported way to ship a kid companion
  (Papadopoulos 2025, DOI 10.1177/27546330251370657).
- **Verifiable parental consent + data minimization are law** (COPPA 2025 amendments; UK Children's Code). Consent
  before data, TTL retention, PII redaction, no ad/analytics SDKs, LLM provider bound as non-training processor
  (`00-SYNTHESIS2.md` §2.6).
- **The progress report content is evidence-honest by reuse** — it stands on the v1 practices (token economy,
  routines) and never derives a deficit. **No efficacy claim** for Zones-of-Regulation™ / Social-Stories™, **no
  speech-gain promise**, **no therapy/cure claim** (`01-current-and-target.md` §3.6). These are **scaffolds**;
  the parent copy is gated by the same banned-phrase discipline as v1's reminders.

**Weak-evidence flag:** any parent-facing text that *summarizes* the child's emotional state must stay
**descriptive** (counts/timelines from `moodInsight`), never an interpreted label ("anxious", "at risk") — an
interpreted label would be an AI inference and is banned (v1 mood no-interpretation gate, `moodInsight.ts` is
counts-only).

---

## 2. UX behavior — screen by screen (incl. neuroProfile / ageMode / low-stim)

**Router:** `expo-router` (same as `apps/kid`, so `packages/shared` theme/components drop in unchanged). The donor
uses React Navigation; its flows are **ported to expo-router** groups (see Open Assumptions if the team prefers RN
Navigation — either is acceptable, expo-router chosen for shared-spine consistency).

**neuroProfile / ageMode note (critical, carries the v1 golden rule):** the parent app renders **parent-facing
chrome**, so most of it is adult UI (never age-adapted). Where it renders a **child-context preview** (e.g. the
report header, a transcript avatar, a controls preview of "what the child sees"), it MUST route through the shared
resolvers (`resolveContent`/`resolveCapabilities`/`resolveStatusPresentation`/`ageModeLabel`) and **never read raw
`ageMode`/`neuroProfile`**. `neuroProfile` (`"adhd"|"autism"|"both"`) and `ageMode` are **displayed and edited** on
the child profile/controls screens as parent-editable settings (via labeled selectors using `ageModeLabel` and a
`neuroProfileLabel`), then written to Firestore for the kid app + proxy to consume. The parent app's own low-stim
behavior: honor OS reduce-motion/reduce-transparency (shared `useReducedMotion`/`useReduceTransparency`) so an
autistic-friendly-preference parent isn't over-stimulated, but the parent chrome does not itself switch on the
child's `neuroProfile`.

### S0 — Boot / auth bootstrap (`app/index.tsx`, `app/_layout.tsx`)
- Initialize Firebase (Auth persistence via AsyncStorage), subscribe to `onAuthStateChanged`.
- Signed-out → redirect to `(auth)/login`. Signed-in but **no consent record** → redirect to `(auth)/consent`.
  Signed-in + consent + ≥1 child → `(app)/dashboard`. Signed-in + consent + 0 children →
  `(app)/onboarding/add-child`.
- Register the device FCM push token → `users/{uid}.fcmTokens[]` (port `RootStack.js` token-registration block;
  swap Expo-push for the native device push token used by FCM). Attach a foreground notification handler + a
  tap-handler that deep-links a crisis notification straight to `(app)/child/[childId]/alerts`.
- Calm loading state (shared `ErrorScreen`/placeholder patterns); a thrown boot error shows the shared
  `RootErrorBoundary` equivalent ("Let's try that again"), never a red stack.

### S1 — Login (`app/(auth)/login.tsx`)
- Email + password, `signInWithEmailAndPassword`. Port donor `scenes/login/Login.js` → TS. "Forgot password"
  (`sendPasswordResetEmail`) and a link to Register. Errors are gentle inline notes, never alerts with raw
  Firebase error objects.

### S2 — Register (`app/(auth)/register.tsx`)
- Parent name + email + password (+ confirm). `createUserWithEmailAndPassword` → write `users/{uid}` `ParentUser`
  (`role:"parent"`, empty `consent`, `retentionDays:30`, `locale:"en"`, `crisisRegion` inferred from device
  locale, editable). Port donor `scenes/registration/Registration.js` → TS. **Registration alone does NOT create a
  child** — the consent gate does.

### S3 — COPPA consent flow (`app/(auth)/consent.tsx`)
- A short, plain-language screen: what data is collected (activity summaries, PII-redacted transcripts if chat is
  enabled), retention (30/90 days, parent-set), that **no ads/analytics** run, that the LLM provider is a bound
  non-training processor, and that **grown-ups can see all chats** (no secrecy). Granular opt-in switches:
  `transcripts`, `activity`, `llmChat` (chat defaults OFF regardless). A **verifiable** step beyond mere
  attestation (see §6 + Open Assumptions for the exact method) → on success append a `ConsentRecord` to
  `users/{uid}.consent[]` (append-only, versioned `agreementVersion`).
- Consent is the **precondition** the auth-blocking function (w-functions) enforces before any
  `children/{childId}` doc may be created. Withdrawing consent (a Settings action) blocks new child creation and
  offers delete-all.

### S4 — Add child (`app/(app)/onboarding/add-child.tsx`)
- First name only (no PII beyond first name), `ageMode` selector (young/older/preteen via `ageModeLabel`),
  `neuroProfile` selector (adhd/autism/both), initial `SensoryProfile` presets. Writes `children/{childId}`
  (`parentUid` = current uid) + `children/{childId}/settings/controls` seeded with **chat OFF**, `inputMode:"chips"`,
  full `topicScope`, all per-feature toggles ON, default limits + quiet hours. Premium-gated beyond the 1st child
  (`multiChild`).

### S5 — Dashboard / overview (`app/(app)/dashboard.tsx`)
- List of children (cards). Each card: name, a **glanceable activity strip** (last N `ActivityEvent`s, e.g.
  "Finished morning routine · 3 bubbles · 1 check-in"), a **chat status pill** (On/Off), and an **alert badge**
  if any `alerts` with `status:"new"`. A top **AI-disclosure banner** ("Bloop is an AI helper, not a person or a
  doctor") persists app-wide. A global **Alerts** entry (crisis inbox) with an unread count.
- Real-time via Firestore `onSnapshot` (port the `UserDataContext` real-time-provider idea to a typed
  `childrenStore`). Empty/offline states are calm ("check back soon" / "you're offline — showing the latest saved
  view").

### S6 — Per-child hub (`app/(app)/child/[childId]/_layout.tsx`)
Tabs/sections: **Timeline · Transcripts · Report · Controls**.

- **S6a Timeline (`timeline.tsx`)** — a reverse-chronological, grouped-by-day list of `ActivityEvent`s
  (step_done, routine_complete, token_earned, mood_log, break_taken, breathing, aac_utterance_summary). Each row is
  descriptive + **anti-shame** (reuse `resolveStatusPresentation` triple-coding icon+shape+label; never
  red/"missed"). Mood rows show the face + optional energy, **never an interpreted label**. Paginated (`limit` +
  `startAfter`).
- **S6b Transcripts (`transcripts.tsx` + `transcript/[sessionId].tsx`)** — list of chat **sessions** (grouped by
  `sessionId`, newest first, with the first line + a flag chip if any turn was `redirected/filtered/crisis`).
  Opening a session renders the turns in a **read-only `react-native-gifted-chat`** view: map `TranscriptTurn[]` →
  `IMessage[]`, child on one side, Bloop on the other, `createdAt` from `ts`. Turns with a non-`pass` `verdict`
  get a highlighted bubble + a flag label (custom `renderBubble`). Input toolbar is **hidden** (parent cannot
  send). If chat is OFF or no turns exist: calm empty state ("No chats yet — companion chat is off for {name}").
  All text is already **PII-redacted** server-side; the parent never sees raw PII.
- **S6c Report (`report.tsx`)** — reuse v1 report logic (see §3.5). Range selector 7d/30d free; 90d/custom +
  per-routine + multi-child-combined behind `advancedInsights` (`<PremiumGate>`). Renders the calm
  `ReportModel` (cumulative-first, resting/active streak). "Share PDF" hands the shared `renderReportHtml(model)`
  output to the OS share sheet (via `expo-print`/`expo-sharing`, same as v1). Age-adaptation = the resolved
  `showNumbersAndCharts` flag + `ageModeLabel` header, never raw `ageMode`.
- **S6d Controls (`controls.tsx`)** — see §S7.

### S7 — Controls (per-child, `app/(app)/child/[childId]/controls.tsx`)
Writes `children/{childId}/settings/controls` (`ChildControls`). Each control is a labeled `SettingRow`/`Toggle`/
`Segmented`/`Stepper` (ported shared parent-UI primitives):
- **Companion chat master switch** (`bloopChatEnabled`, default OFF). When OFF, a note: "Bloop the character still
  plays; the talking chat is off." Turning ON shows the disclosure + confirmation.
- **Input mode** (`inputMode`): AAC board / quick-reply chips / free text (age-gated advisory) / voice.
- **Topic scope** (`topicScope[]`): per-category allow-list checkboxes (emotions, calming, focus, schedules, aac,
  socialStories, encouragement).
- **Per-feature toggles** (`perFeature`): aac, schedules, firstThen, emotion, breathing, movement, socialNarratives.
- **Limits** (`limits`): daily turn cap + session-minutes cap (Steppers, curated ranges, never "unlimited").
- **Quiet hours** (`quietHours`): enabled + start/end minutes-of-day (reuse the v1 quiet-hours mental model;
  the *proxy* enforces).
- **Retention window** (`retentionDays`: 30/90) + **crisis region** (`crisisRegion`) selector (localized hotline
  table; 988 = US, India needs its own — the resource copy itself lives server-side, human-reviewed).
- Every write stamps `updatedAt` + `updatedBy` (audit). The proxy (w-functions) reads these on every turn; the kid
  app pulls them via the sync adapter (w-kid). Changing chat ON→OFF takes effect on the next kid-app sync/turn.

### S8 — Alerts inbox (`app/(app)/alerts.tsx` + `alert/[alertId].tsx`)
- All `alerts` across the parent's children, newest first, `status:"new"` emphasized (calm emphasis, not alarming
  red-panic). Opening an alert shows severity, a **non-clinical** reason, and the **transcript window** (the
  `turnIds`, rendered read-only) for context, plus guidance ("check in with {name}; here are support resources").
  Acknowledge → `status:"acknowledged"` (`acknowledgedAt`/`acknowledgedBy`); Resolve → `"resolved"`. **Crisis
  alerts + transcript visibility are ALWAYS FREE** (safety is never gated).

### S9 — Account & data (`app/(app)/settings.tsx`)
- Parent profile (name/email/password reset), household `locale`, default `crisisRegion`, `retentionDays` default,
  **Tiny Bubbles Plus** row (premium), **withdraw consent**, and **Data rights**: "Review what's stored" +
  **Delete all data for {child}** / **Delete my account** — both behind the shared **PIN posture**
  (`parentGate` `mode:"sensitive"`), with a mandatory confirm. Delete triggers a client delete of the
  `children/{id}` subtree (+ a w-functions recursive-delete callable for server-side subcollections). Persistent
  AI-disclosure notice restated here.

---

## 3. Data model (exact TS types; slices/collections; migration; offline/sync)

### 3.1 Where state lives
- **The parent app is Firestore-backed, not offline-first** in the v1 sense (it is inherently an online monitoring
  app). It relies on **Firestore's built-in local persistence** for graceful offline read (last-synced view) and
  optimistic control writes. It does **not** use the `tb/` AsyncStorage keyspace or `SCHEMA_VERSION`/`MIGRATIONS`
  (those are the kid app's on-device source of truth).
- **Parent-app local state** = thin zustand stores fed by Firestore listeners (mirror the donor's real-time
  provider): `authStore` (auth status + `ParentUser`), `childrenStore` (subscribed `ChildDoc`s + controls), and
  per-screen listener hooks for `activity`/`transcripts`/`alerts`. No persisted schema of its own.

### 3.2 The Firestore doc contract (shared, `packages/shared/src/firestore/types.ts`)
These are the **cross-workstream contract** consumed by `apps/parent` + `functions/` (and `apps/kid` sync).
Ownership of the *file* is `packages/shared` (w-shared); this workstream **defines/uses** them and lists them under
`dataModelAdditions`. `EpochMs = number`.

```ts
export type NeuroProfile = "adhd" | "autism" | "both";        // union widening on kid domain types (additive)

export type TopicCategory =
  | "emotions" | "calming" | "focus" | "schedules" | "aac" | "socialStories" | "encouragement";

export interface SensoryProfile {
  sound: boolean; haptics: boolean; motion: boolean; brightness: "dim" | "normal"; lowStim: boolean;
}

export interface ConsentRecord {                              // append-only history in users/{uid}.consent[]
  method: "signed-form" | "email-verified" | "payment-verified";  // COPPA verifiable method (see Open Assumptions)
  grantedAt: EpochMs;
  parentName: string;
  agreementVersion: string;                                   // which consent text the parent agreed to
  region?: string;                                            // coarse ISO country for locale; NOT precise geo
  scope: { transcripts: boolean; activity: boolean; llmChat: boolean };
}

export interface ParentUser {                                 // users/{parentUid}
  uid: string; role: "parent"; email: string; displayName?: string;
  createdAt: EpochMs;
  consent: ConsentRecord[];
  fcmTokens: string[];                                        // device push tokens for crisis FCM
  retentionDays: 30 | 90;                                     // default TTL; per-child override in controls
  locale: string;                                             // "en"
  crisisRegion: string;                                       // ISO country → hotline table (server-side copy)
}

export interface ChildDoc {                                   // children/{childId}
  childId: string; parentUid: string;
  displayName: string;                                        // FIRST NAME ONLY — no PII
  neuroProfile: NeuroProfile;
  ageMode: "young" | "older" | "preteen";
  sensory: SensoryProfile;
  createdAt: EpochMs;
}

export interface ChildControls {                             // children/{childId}/settings/controls
  bloopChatEnabled: boolean;                                  // MASTER LLM switch; default false
  inputMode: "aac" | "chips" | "freeText" | "voice";         // default "chips"
  topicScope: TopicCategory[];
  perFeature: {
    aac: boolean; schedules: boolean; firstThen: boolean;
    emotion: boolean; breathing: boolean; movement: boolean; socialNarratives: boolean;
  };
  limits: { dailyTurnCap: number; sessionMinutesCap: number };
  quietHours: { enabled: boolean; startMin: number; endMin: number };  // minutes-of-day (0..1439)
  retentionDays: 30 | 90;                                     // per-child override
  crisisRegion: string;                                       // per-child override of hotline locale
  updatedAt: EpochMs; updatedBy: string;                      // audit (parentUid)
}

export type ActivityKind =
  | "step_done" | "routine_complete" | "token_earned"
  | "mood_log" | "break_taken" | "breathing" | "aac_utterance_summary";

export interface ActivityEvent {                             // children/{childId}/activity/{eventId}
  eventId: string; ts: EpochMs; kind: ActivityKind;
  summary: string;                                           // NON-PII aggregate ("Finished morning routine")
  daypart?: "morning" | "afternoon" | "evening";
  count?: number;                                            // aggregate only; never raw AAC text
}

export type ModerationVerdict = "pass" | "redirected" | "filtered" | "crisis" | "refused";

export interface TranscriptTurn {                            // children/{childId}/transcripts/{turnId}
  turnId: string; sessionId: string; ts: EpochMs;
  role: "child" | "bloop";
  text: string;                                             // PII-REDACTED before storage (server-side)
  verdict: ModerationVerdict;
  flags: string[];                                          // e.g. ["pii_inbound","topic_offscope"]
  scores?: Record<string, number>;
  model?: "gemini-flash" | "deepseek" | "mock";
  ttlAt: EpochMs;                                           // Firestore TTL delete field (w-functions policy)
}

export type AlertSeverity = "info" | "concern" | "crisis";
export type AlertStatus = "new" | "acknowledged" | "resolved";

export interface CrisisAlert {                              // children/{childId}/alerts/{alertId}
  alertId: string; ts: EpochMs; severity: AlertSeverity;
  reason: string;                                           // human-readable, NON-clinical
  transcriptWindow: string[];                               // turnIds for context
  status: AlertStatus; acknowledgedAt?: EpochMs; acknowledgedBy?: string;
}

// PII-FREE report snapshot the kid app syncs up for the parent to render (see §3.5):
export interface ReportSnapshotDoc {                        // children/{childId}/reports/{rangeKey}
  rangeKey: "7d" | "30d" | "90d";
  model: import("../domain/report").ReportModel;            // reuse the SHARED ReportModel verbatim
  generatedAt: EpochMs;
}
```

### 3.3 Additive-versioned migration
- **Firestore has no `SCHEMA_VERSION` migration engine** — evolve docs additively (new optional fields, tolerate
  missing fields with defaults on read). The parent app's readers MUST default-fill any missing field
  (`controls.inputMode ?? "chips"`, `retentionDays ?? 30`, `topicScope ?? []`) so an older/newer writer never
  crashes the reader. Add a `schemaRev?: number` to `ChildControls`/`ChildDoc` for future non-additive changes
  (default 1) — the parent reader treats unknown revs forward-compatibly (render what it knows).
- **NeuroProfile** is a **union widening** on the kid domain types (`src/domain/types.ts`) — additive, existing
  `ageMode`/`companionStyle` values stay valid, **no `SCHEMA_VERSION` bump** in the kid app (`01-current-and-target.md`
  §1.2, §3.2).

### 3.4 Offline-first vs additive-sync (the boundary)
- **Kid core stays the source of truth on-device** (v1 `storage` port). The parent app **reads** the Firestore
  mirror the w-kid sync adapter writes (`activity`, `reports` snapshot) and the w-functions proxy writes
  (`transcripts`, `alerts`). The parent app **writes** `users` (consent/profile), `children` (create), and
  `settings/controls`; the kid app **pulls** controls down on next sync. Never brick the child: with the network
  or LLM off, the kid keeps working; the parent app simply shows the last-synced view.

### 3.5 Progress-report reuse (concrete)
- **Primary path (COPPA-cleanest):** the kid app computes the anti-shame `ReportModel` on-device via the **shared**
  `buildReport(BuildReportInput)` and syncs the **PII-free** snapshot to `children/{id}/reports/{rangeKey}` (only
  the calm aggregate leaves the device — no raw ledger/PII). The parent app reads `ReportSnapshotDoc.model` and
  renders it with the **shared** `renderReportHtml(model)` (for PDF/share) + native cards mirroring
  `app/(parent)/report.tsx` from v1. This is literal "reuse v1 report logic": same `ReportModel`,
  `renderReportHtml`, `streakDisplay`, and `MOOD_EMOJI` mapping.
- **Recompute path (premium/custom ranges):** the parent app maps mirrored `activity`/`mood` docs into a
  `BuildReportInput` via a small `parentReportInput.ts` adapter and calls the **shared** `buildReport` +
  `moodInsight` selectors directly. Requires the sync adapter to mirror the needed signals (dependency on w-kid;
  see Open Assumptions). The report stays anti-shame by construction (the pure functions guarantee it).

---

## 4. Exact files to CREATE / MODIFY (real monorepo paths)

### 4.1 CREATE — `apps/parent/` app config (mirror `apps/kid` config; monorepo Metro per `01-current-and-target.md` §2.1)
- `apps/parent/package.json` — `"name": "@tiny-bubbles/parent"`; deps: `expo` (SDK 56), `expo-router`,
  `firebase` (JS SDK), `expo-notifications`, `expo-print`, `expo-sharing`, `@tiny-bubbles/shared`, `nativewind`,
  `react-native-gifted-chat`, `zustand`. **No** ad/analytics SDK.
- `apps/parent/app.json` — Expo config (bundle ids, notifications plugin, `google-services.json`/APNs for FCM,
  optional App Check; **no** analytics). `android.allowBackup:false` carried for hygiene.
- `apps/parent/metro.config.js` — monorepo config (watchFolders repo root + `nodeModulesPaths` +
  `disableHierarchicalLookup` + `extraNodeModules` for `@tiny-bubbles/shared`) wrapped in `withNativeWind`.
- `apps/parent/babel.config.js`, `apps/parent/tailwind.config.js`, `apps/parent/global.css`,
  `apps/parent/tsconfig.json` (`extends ../../tsconfig.base.json`), `apps/parent/jest.config.js`,
  `apps/parent/jest.setup.js`.

### 4.2 CREATE — Firebase + services
- `apps/parent/src/firebase/config.ts` — port donor `src/firebase/config.js` → TS (`initializeApp`,
  `initializeAuth` w/ `getReactNativePersistence(AsyncStorage)`, `getFirestore`, `getStorage`, App Check init).
  **Scrub the donor's committed demo `firebaseKey`; read from app config/env.**
- `apps/parent/src/firebase/collections.ts` — typed collection refs + `FirestoreDataConverter`s for
  `ParentUser`/`ChildDoc`/`ChildControls`/`ActivityEvent`/`TranscriptTurn`/`CrisisAlert`/`ReportSnapshotDoc`.
- `apps/parent/src/services/fcm.ts` — register/refresh device push token → `users/{uid}.fcmTokens[]`; foreground
  handler; notification-tap deep-link (crisis → child alerts). (Port `RootStack.js` token block.)
- `apps/parent/src/services/consent.ts` — `writeConsent(record)`, `hasValidConsent(user)`, `withdrawConsent()`.
- `apps/parent/src/services/controls.ts` — `updateControls(childId, patch)`, `seedDefaultControls()`.
- `apps/parent/src/services/children.ts` — `createChild(...)` (consent-gated), `deleteChildData(childId)` (client
  subtree + call the w-functions recursive-delete callable), `subscribeChildren(uid)`.
- `apps/parent/src/services/monitoring.ts` — `subscribeActivity`, `subscribeSessions`,
  `subscribeTranscript(sessionId)`, `subscribeAlerts`, `acknowledgeAlert`, `resolveAlert`.
- `apps/parent/src/services/report.ts` — thin wrapper: read the w1-produced `ReportSnapshotDoc`
  (`children/{id}/reports/{rangeKey}`, §8 #21); recompute via shared `buildReport` for custom ranges;
  `shareReportPdf(model)` via shared `renderReportHtml` + `expo-print`/`expo-sharing`.
- `apps/parent/src/services/parentReportInput.ts` — maps mirrored Firestore docs → shared `BuildReportInput`.
- `apps/parent/src/services/breakNudge.ts` — **SB-243 3-hour break-nudge scheduler (D7, owned HERE; §8 fix).**
  Reuses the v1 `notifications.ts` budget + `isReminderCopyClean` copy gate. When a child's `bloopEnabled` is on,
  schedules a per-3h local break reminder ("time for a wiggle break?") gated by `quietHours` + the copy gate;
  cancels when chat is disabled. The 3-hour cadence is the SB-243 mandate; the copy is anti-shame (no urgency/
  guilt). Native-notification path degrades gracefully on web (no crash).

### 4.3 CREATE — state
- `apps/parent/src/state/authStore.ts` (zustand: `status`, `parentUser`), `apps/parent/src/state/childrenStore.ts`
  (subscribed children + controls). Real-time hooks: `apps/parent/src/hooks/useChildActivity.ts`,
  `useTranscript.ts`, `useAlerts.ts`.

### 4.4 CREATE — routes (`apps/parent/app/`, expo-router)
- `app/_layout.tsx` (Firebase init + auth gate + FCM handler), `app/index.tsx` (route dispatch).
- `app/(auth)/_layout.tsx`, `app/(auth)/login.tsx`, `app/(auth)/register.tsx`, `app/(auth)/consent.tsx`,
  `app/(auth)/forgot-password.tsx`.
- `app/(app)/_layout.tsx` (signed-in shell + persistent AI-disclosure banner), `app/(app)/dashboard.tsx`,
  `app/(app)/alerts.tsx`, `app/(app)/alert/[alertId].tsx`, `app/(app)/settings.tsx`,
  `app/(app)/onboarding/add-child.tsx`.
- `app/(app)/child/[childId]/_layout.tsx`, `.../timeline.tsx`, `.../transcripts.tsx`,
  `.../transcript/[sessionId].tsx`, `.../report.tsx`, `.../controls.tsx`.

### 4.5 CREATE — components (`apps/parent/components/`)
- `TranscriptView.tsx` (read-only `react-native-gifted-chat` wrapper: `TranscriptTurn[]→IMessage[]`, custom
  `renderBubble` for flag highlighting, input toolbar hidden), `ActivityTimeline.tsx`, `AlertCard.tsx`,
  `ChildCard.tsx`, `ControlsForm.tsx`, `ConsentForm.tsx`, `DisclosureBanner.tsx`, `SensoryProfileEditor.tsx`.

### 4.6 MODIFY — shared + root (owned jointly with w-shared; this workstream contributes)
- `packages/shared/src/firestore/types.ts` — **CREATE** the §3.2 doc contract (if w-shared hasn't; else consume).
- `packages/shared/src/index.ts` — re-export the Firestore types + ensure `buildReport`/`renderReportHtml`/
  `moodInsight`/theme resolvers/`AppText`/`ErrorScreen`/`parentGate`/`ageModeLabel` are exported for the parent app.
- `packages/shared/src/domain/types.ts` — add `NeuroProfile` union (additive) + a `neuroProfileLabel` in the copy
  resolver (parent labels).
- Root `THIRD_PARTY_NOTICES.md` / `PROVENANCE.md` — add `react-native-gifted-chat` (MIT),
  `expo-firebase-boilerplate-v2` (MIT, ported), `firebase` JS SDK.
- `__tests__` / no-egress gate config — **retarget** the no-network gate to include `apps/parent/{app,src,components}`
  with the Firebase-SDK exception (see §7).

### 4.7 CREATE — tests (`apps/parent/__tests__/`)
- `services/consent.test.ts`, `services/controls.test.ts`, `state/authStore.test.ts`,
  `report/parentReportInput.test.ts` (Firestore docs → `BuildReportInput` → shared `buildReport` shape),
  `components/transcriptMapping.test.ts` (`TranscriptTurn[]→IMessage[]` + flag rendering), and the retargeted
  `config/no-network.test.ts` scan of the parent tree.

---

## 5. Reused donor parts (repo · license · files)

| Donor (local `_sources2/…`) | License | Ship? | What we reuse |
|---|---|---|---|
| **`expo-firebase-boilerplate-v2`** | **MIT** (© 2024 Toshiaki Shirakura) | ✅ ship (port JS→TS) | `src/scenes/login/Login.js` → `login.tsx`; `src/scenes/registration/Registration.js` → `register.tsx`; `src/scenes/initial/Initial.js` → the boot/route-dispatch pattern; `src/routes/navigation/rootstack/RootStack.js` → auth-gate + **push-token→Firestore** registration + notification listeners; `src/context/UserDataContext.js` → the **real-time Firestore provider** pattern (→ `childrenStore`); `src/firebase/config.js` → `firebase/config.ts` (**scrub committed demo creds**; add App Check). **Strip** the social `post/`,`detail/`,`follow/`,`follower/` scenes (the `follow/follower` graph is only a *conceptual* reference for the guardian-of link, which is expressed here directly as `children.parentUid`). |
| **`react-native-gifted-chat`** | **MIT** (© 2019 Farid) | ✅ ship | `GiftedChat` + the `IMessage`/`User` model (`src/Models.ts`) + custom `renderBubble` for the **read-only transcript view** with moderation-flag highlighting. `QuickReplies`/`TypingIndicator`/`InputToolbar` are the KID side (w-kid) — the parent view **hides input**. Map `TranscriptTurn`→`IMessage` (`_id=turnId`, `text`, `createdAt=ts`, `user` = child vs bloop). |
| **`firebase-cloud-functions-typescript-example`** | **MIT** (© 2023 Rodrigo Bertotti) | ✅ ship (reference for THIS app) | `firestore.rules` **locked-default** (`allow read,write: if false`) — the security-rules baseline this app depends on (owned by w-functions); the **client-vs-firestore model split** discipline (`functions/src/core/data/models/*/{client,firestore}/`) informs the §3.2 shared doc contract so the parent never sees server-only fields. The *functions themselves* are w-functions. |
| **v1 shipped app** (`tiny-bubbles/`) | project | ✅ reuse via `packages/shared` | `src/domain/report.ts` (`buildReport`, `ReportModel`, `makeRange`), `src/services/reportHtml.ts` (`renderReportHtml`), `src/domain/moodInsight.ts`, theme resolvers (`resolveContent`/`resolveCapabilities`/`resolveStatusPresentation`/`ageModeLabel`), `components/ui/{AppText,AppTextInput,ErrorScreen}.tsx`, `components/parent/ui.tsx` primitives (`ParentScreen`,`Card`,`Toggle`,`SettingRow`,`Segmented`,`Stepper`,`Chip`,`PrimaryButton`,`Note`), `src/services/parentGate.ts` (PIN `mode:"sensitive"`), the `BANNED_REMINDER_PATTERNS` copy gate (`src/i18n/en.ts`). |

**No GPL/AGPL code enters this workstream.** No symbol-art assets are used here (parent app has no AAC board).
Guardrail donors (`llm-guard`/`nemo-guardrails`/`guardrails-ai`) are **not** touched by this workstream (they live
in `functions/`).

---

## 6. Safety + anti-shame + COPPA rules that apply

1. **Consent before data (COPPA verifiable parental consent).** No `children/{childId}` doc, no activity, no
   transcript exists until a valid `ConsentRecord` is written AND the auth-blocking function (w-functions) confirms
   it. Consent must be **beyond self-attestation** — the exact verifiable method (signed form + email verification /
   nominal payment-card verification / knowledge-based) is a legal/product decision captured in `ConsentRecord.method`
   (Open Assumption). Withdrawal blocks new child creation + offers delete-all.
2. **Data minimization + PII redaction.** The parent NEVER sees raw PII — transcripts are **redacted server-side
   before storage**; the parent app only ever renders `TranscriptTurn.text` (already scrubbed). `ChildDoc.displayName`
   is **first name only**. `ActivityEvent` carries **aggregate summaries**, never raw AAC utterances. No precise geo
   — only coarse `region`/`crisisRegion`.
3. **Retention / TTL.** The parent sets `retentionDays` (30/90); the actual TTL delete is enforced by w-functions
   (Firestore TTL on `TranscriptTurn.ttlAt` + activity). The parent app must display retention honestly and offer
   **review + delete-all** (PIN-gated).
4. **No secrecy.** The parent sees **every** transcript; the child is told (in the kid app) grown-ups can see chats.
   The parent app never hides or filters turns from the parent (flags are surfaced, not suppressed).
5. **No ad/analytics SDKs** — not even in the parent app (the child's data flows through it). No raw network egress
   in app code; **all** networking is via the Firebase JS SDK (see §7 grep gate). Crisis FCM is **sent** by
   w-functions (`admin.messaging()`), not by the parent app — the parent only **registers its token** and
   **receives** push.
6. **LLM provider bound as non-training processor** — a contractual/config constraint (w-functions/legal); the
   parent consent copy states it. The parent app makes no model calls.
7. **Anti-shame in every parent-facing surface.** The timeline + report reuse the v1 invariants: resting/active
   streak (`streakDisplay`), monotonic totals, no "missed/failed/0-day", `resolveStatusPresentation` triple-coding
   (never red↔green / color-only). The mood surfaces show **descriptive counts only** — no interpreted emotional
   label (that would be an AI inference; banned). Crisis alerts are framed **supportively** ("your child may need
   support"), never punitively toward the child.
8. **Evidence-honesty copy gate.** All parent-facing copy passes the banned-phrase discipline: **no** efficacy
   claim for Zones-of-Regulation™ / Social-Stories™, **no** AAC speech-gain promise (say *communication access*),
   **no** sensory-integration / therapy / cure claims. Scaffolds, not therapy.
9. **Persistent AI-disclosure** ("Bloop is an AI helper, not a person or a doctor") shown app-wide (APA + SB 243)
   and set as the child-facing disclosure the kid app renders.
10. **Sensitive-action PIN.** Delete-all / delete-account / withdraw-consent use the shared `parentGate`
    `mode:"sensitive"` PIN posture + a mandatory confirm.
11. **Least-privilege reads (security-rules dependency).** A parent reads only their own children's
    `activity`/`transcripts`/`alerts`/`settings`; cannot read another parent's data; a child account cannot read
    moderation internals. Enforced by Firestore rules (w-functions); the parent app assumes and is tested against them.

---

## 7. Acceptance criteria + verify steps

**Green floor (run from repo root):**
- `npm -w @tiny-bubbles/parent run typecheck` (i.e. `tsc --noEmit`) = **0 errors**.
- `npm -w @tiny-bubbles/parent test` = all suites green (count only grows). Includes:
  - `consent.test.ts` — writing consent produces a valid append-only `ConsentRecord`; `hasValidConsent` gates child
    creation; withdrawal blocks new children.
  - `controls.test.ts` — default controls seed with `bloopChatEnabled:false`, `inputMode:"chips"`, full topicScope;
    a patch stamps `updatedAt`/`updatedBy`; limits never emit "unlimited".
  - `parentReportInput.test.ts` — Firestore mirror → `BuildReportInput` → shared `buildReport` returns a
    `ReportModel` with resting/active streak + monotonic totals for a seeded fixture; `renderReportHtml` output has
    **no** `missed|failed|broken|0-day` and no external `<script>`/URL.
  - `transcriptMapping.test.ts` — `TranscriptTurn[]→IMessage[]` maps roles/timestamps; a non-`pass` verdict yields a
    flagged bubble; the parent view exposes **no** send/input affordance.
  - `authStore.test.ts` — auth transitions route correctly (signed-out→login, no-consent→consent, consent+0
    children→add-child, consent+children→dashboard).
  - `breakNudge.test.ts` — with `bloopEnabled` on, a per-3h break nudge is scheduled (SB-243, D7), gated by
    `quietHours` + the copy gate, cancelled when chat is disabled; copy passes `isReminderCopyClean` (no urgency/
    guilt); web degrades to no-op.
  - `controlsAlias.test.ts` — `caps.bloopChatAvailable` is driven by the canonical `bloopEnabled` end-to-end
    (Firestore `controls.bloopEnabled` → on-device settings → cap); the `bloopChatEnabled` alias maps correctly
    and defaults to false when absent (§8 #15).
- `npx expo export --platform web` for `apps/parent` succeeds (note: FCM push is native-only; web build degrades the
  push path gracefully — no crash).

**Grep / policy gates (CI):**
- **Retargeted no-egress gate** — `config/no-network.test.ts` scans `apps/parent/{app,src,components}` for raw
  `fetch(`/`axios`/`XMLHttpRequest`/`WebSocket`/`sendBeacon`/`https?://` and returns **zero** (all networking goes
  through the Firebase JS SDK, whose internals live in `node_modules`, excluded; `functions/` is the only sanctioned
  egress zone). The donor's `axios`-based `SendNotification.js` is **NOT ported** (crisis FCM is server-side).
- **No ad/analytics** — grep `apps/parent` for `analytics|firebase/analytics|amplitude|segment|facebook|admob` →
  zero.
- **Evidence-honesty copy gate** — grep parent copy for `cure|treats|therapy|clinically proven|zones of
  regulation|social stor(y|ies) work|speech gain` → zero.
- **Safety-never-gated** — grep the transcript + alerts screens for `<PremiumGate` → zero (only `report.tsx`
  90-day/custom and the 2nd+ child may be gated).
- **No raw age axis** — grep `apps/parent/{app,components}` for `neuroProfile ===`/`ageMode ===` in a render path →
  zero (must route through resolvers/labels).
- **Scrubbed creds** — grep for the donor's demo `apiKey`/`projectId` string → zero.

**Firestore rules dependency (verified in w-functions' emulator suite, referenced here):** using the Firestore
emulator + `@firebase/rules-unit-testing`, assert parent-A cannot read parent-B's `children/*/transcripts`, a
child token cannot read `alerts`/moderation fields, and a parent can read/ack their own `alerts`. This workstream's
CI **may** include a lightweight emulator smoke against the shared rules file.

---

## 8. Dependencies · premium/free · LLM on/off

### 8.1 Dependencies on other workstreams
- **w-shared (HARD):** `packages/shared` must export the Firestore doc contract (§3.2), the theme resolvers +
  kid-safe UI primitives, `parentGate`, and the report/mood domain (`buildReport`/`renderReportHtml`/`moodInsight`).
  The monorepo tooling (workspaces, `tsconfig.base.json` paths, monorepo Metro) must exist first
  (`01-current-and-target.md` §2).
- **w-functions (HARD):** writes `transcripts` + `alerts`, **sends** crisis FCM, enforces the **auth-blocking
  COPPA gate**, runs **TTL cleanup**, and owns the **Firestore security rules**. The parent app reads what it
  writes and writes controls the proxy reads. Without it, transcripts/alerts are empty and the consent gate is
  advisory-only (the app still builds + shows activity/reports).
- **w-kid (SOFT/contract):** the **sync adapter** mirrors `activity` + the `ReportSnapshotDoc` up and **pulls
  controls down**; the kid app consumes `neuroProfile`/`ageMode`/`sensory`. Contract is the shared types; if
  w-kid lands later, the parent app shows empty timelines/reports but still functions (auth/consent/controls).
- **w-authoring (SEPARATE, not this workstream):** board/schedule/social-narrative authoring (feature-matrix D6).

### 8.2 Premium / free
- **FREE (never gated — safety + core oversight):** parent login, COPPA consent, **1 child**, activity timeline,
  **full transcript visibility**, **crisis alerts**, all controls (chat on/off + limits + per-feature toggles +
  quiet hours + retention + crisis locale), basic **7d/30d single-child report** + PDF/share, data review + delete.
- **PREMIUM (reuse existing gates):** `multiChild` (2nd–8th child), `advancedInsights` (90-day/custom + per-routine
  + multi-child-combined report + multi-week mood trend). Gate ONLY via shared `isFeatureUnlocked`/`useIsPremium`
  + `<PremiumGate>`; **transcripts/alerts/controls are NEVER premium** (safety must not be paywalled). Downgrade is
  acquisition-only (nothing owned is removed).

### 8.3 LLM on / off behavior
- The parent app **has no LLM** and makes no model calls — it is LLM-agnostic infrastructure.
- **Chat OFF (default):** the kid runs the deterministic Bloop character only; the proxy serves nothing; **no
  transcript docs are written**. The parent app fully works — timeline, reports, controls, alerts (activity-based)
  all render; the Transcripts screen shows the calm "chat is off" empty state; the Controls master switch is the
  thing that flips it on.
- **Chat ON (parent-enabled):** the proxy writes `transcripts` (real Gemini-Flash/DeepSeek turns) + may raise
  `alerts`; the parent app renders them read-only with flag highlighting.
- **Mock provider (dev/CI):** the kid app's mock `bloopProvider` is offline and writes no Firestore transcripts, so
  the parent app shows an empty transcript state in CI — **the parent app's own tests never hit the network** and
  stay green offline (no LLM dependency anywhere in this tree).

---

## 9. Open assumptions
1. **Router choice.** Chosen **expo-router** for shared-spine consistency with `apps/kid`; the donor is React
   Navigation. If the team prefers React Navigation for the parent app (per `01-current-and-target.md` §2.2, "RN
   Navigation is fine for the Parent app"), the screen inventory maps 1:1 to stacks/tabs — a one-time swap, no data
   model impact.
2. **Verifiable-consent method.** COPPA "beyond self-attestation" mechanism (signed form + email verification vs.
   nominal payment-card verification vs. knowledge-based) is a legal/product decision. Spec captures the
   `ConsentRecord` + gate; `ConsentRecord.method` is the seam. Assumed **email-verified + signed agreement** for v1.
3. **FCM requires a native dev/prod build** (google-services.json / APNs key) — **Expo Go cannot receive FCM push**.
   Assumed the parent app ships as a dev-client/EAS build; the web export degrades the push path. If Expo push is
   preferred over FCM, swap `services/fcm.ts` + the functions sender (locked decision says FCM).
4. **Report reuse plumbing.** Primary path assumes the kid app syncs a **PII-free `ReportSnapshotDoc`**; the
   recompute path assumes the sync adapter mirrors enough `activity`/`mood` to rebuild `BuildReportInput`. Which
   signals the mirror carries is a w-kid contract — if only aggregates sync, the parent uses the snapshot path only
   (custom-range premium recompute may be limited).
5. **Transcript grouping** assumed by `sessionId` (a conversation), newest first. If the proxy writes flat per-turn
   docs without `sessionId`, add a derived session grouping by day/gap in `monitoring.ts`.
6. **Firestore doc field names** are the cross-workstream contract in `packages/shared`; if w-functions or w-kid
   land first with different names, align the shared types (single source of truth) — this workstream consumes, not
   redefines, once shared owns them.
7. **App Check** on the parent app is assumed optional (the proxy App Check requirement is on the *kid* app). If
   enforced, add it to `firebase/config.ts`.
8. **Parent app is not offline-first** in the v1 sense — it relies on Firestore local persistence for last-synced
   reads. Acceptable because it is an oversight app, not the child's core tool (which stays offline-first on-device).
