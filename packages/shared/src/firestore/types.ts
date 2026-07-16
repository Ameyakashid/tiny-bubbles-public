/**
 * packages/shared/src/firestore/types.ts — the CANONICAL Firestore document
 * contract (w1 OWNS this schema — 02-architecture §2.3, authored per the §8
 * register; the w1/w3 §3 drafts are superseded wherever they differ, §8 #33).
 *
 * ONE source for kid app, parent app, and `functions/`. Canonical picks
 * honored here (02-architecture §8):
 *   #6   ActivityKind = the 11-member union (w1 base + w6 additions).
 *   #8   Transcript = the w2 COMBINED-turn model (childText + replyText).
 *   #9   Verdicts = `ModerationFlag` (imported from bloop/moderation).
 *   #10  TTL field name = `expiresAt`; #10b retention default 30, type 30|90.
 *   #11  AlertSeverity = info|concern|crisis; AlertStatus = new|seen|
 *        acknowledged|resolved.
 *   #19  `InputMode` imported from bloop/provider (never re-declared).
 *   #20  `ConsentRecord` / `CrisisResource` / `PiiCategory` imported from
 *        compliance/* (never re-declared).
 *   #21  `ReportSnapshotDoc` (producer = the w1 kid sync adapter).
 *   #26  fcmTokens record the token TYPE (fcm/apns/expo), per platform.
 *   #27  crisis differentiation + `legalHold` (abuse/csam ⇒ NO parent
 *        auto-alert; TTL/purge-exempt).
 *
 * Pure types; RN-free; no Firebase SDK import — `Ts` is a STRUCTURAL
 * Timestamp so admin-SDK and JS-SDK Timestamps both satisfy it without this
 * package depending on either.
 */
import type { CrisisType } from "../compliance/crisisResources";
import type { ConsentRecord } from "../compliance/consent";
import type { RetentionDays } from "../compliance/retention";
import type { PiiCategory } from "../compliance/pii";
import type { InputMode, ModeratedReplyStatus } from "../bloop/provider";
import type { ModerationCategory, ModerationFlag, OnFailAction } from "../bloop/moderation";
import type { TopicCategory } from "../bloop/topics";
import type { AgeMode, EpochMs, NeuroProfile } from "../domain/types";
import type { ReportModel, ReportRangeKey } from "../domain/report";

// ---------------------------------------------------------------------------
// Timestamp abstraction (structural — admin + client SDK compatible).
// ---------------------------------------------------------------------------

/**
 * A Firestore `Timestamp`, structurally. Both `firebase/firestore` and
 * `firebase-admin/firestore` Timestamps satisfy this; shared code never
 * imports an SDK. Writers construct real SDK Timestamps at the write site
 * (`Timestamp.fromMillis`) — the on-device outbox carries `EpochMs` wire
 * forms until drain (see `sync/types.ts`).
 */
export interface Ts {
  readonly seconds: number;
  readonly nanoseconds: number;
  toMillis(): number;
}

export type { EpochMs };

// ---------------------------------------------------------------------------
// users/{parentUid}
// ---------------------------------------------------------------------------

/**
 * One push target. §8 #26: iOS via the JS-SDK/expo-notifications path yields
 * an APNs token `admin.messaging().send()` REJECTS — the TYPE is recorded so
 * `sendParentAlert` routes fcm → FCM, apns/expo → Expo Push/APNs.
 */
export interface FcmTokenRecord {
  token: string;
  type: "fcm" | "apns" | "expo";
  platform: "android" | "ios" | "web";
  updatedAtMs: EpochMs;
}

export interface ParentUserDoc {
  uid: string;
  role: "parent";
  /** adult PII — allowed, access-controlled; the crisis EMAIL fallback channel (§8 #26) */
  email: string;
  displayName?: string;
  /** append-only audit trail (compliance/consent.ts — §8 #20) */
  consent: ConsentRecord[];
  /** crisis push targets, token TYPE recorded (§8 #26) */
  fcmTokens: FcmTokenRecord[];
  /** DEFAULT 30 (COPPA-min, §8 #10b); per-child override on settings.controls */
  retentionDays: RetentionDays;
  /** BCP-47 — selects the reviewed CRISIS_RESOURCES table (§8 #16) */
  crisisLocale: string;
  createdAt: Ts;
  updatedAt: Ts;
}

// ---------------------------------------------------------------------------
// children/{childId}   (childId === kid Firebase Auth uid — §8 #28)
// ---------------------------------------------------------------------------

export interface ChildDoc {
  childId: string;
  /** the authoritative guardian link */
  parentUid: string;
  /** FIRST NAME / nickname only — no further PII (COPPA data minimization) */
  displayName: string;
  /** resolver input; per-child; ABSENT on-device ⇒ neutral preset (§8 #13) */
  neuroProfile: NeuroProfile;
  ageMode: AgeMode;
  createdAt: Ts;
  updatedAt: Ts;
}

// ---------------------------------------------------------------------------
// children/{childId}/settings/current  (the two-way merge surface — §8 #1)
// ---------------------------------------------------------------------------

/** CANONICAL sensory shape (w6 core + w1 channels — §8 #4). */
export interface SensoryProfile {
  lowStim: boolean;
  motionLevel: "full" | "reduced" | "off";
  /** 0..0.6 in-app scrim */
  dimLevel: number;
  soundEnabled: boolean;
  hapticsEnabled: boolean;
  voiceEnabled: boolean;
  celebrationEnabled: boolean;
}

export interface ChildControls {
  /** DEFAULT false — chat/LLM OFF until the parent flips it (canonical name, §8 #15) */
  bloopEnabled: boolean;
  /** canonical union (§8 #19) */
  inputMode: InputMode;
  /** allow-list subset of ALL_TOPICS (§8 #3) */
  topicScope: TopicCategory[];
  perFeature: {
    aac: boolean;
    schedules: boolean;
    firstThen: boolean;
    emotion: boolean;
    breathing: boolean;
    movement: boolean;
    socialNarratives: boolean;
  };
  /** canonical superset (§8 #2) */
  limits: { perMinute: number; perDay: number; sessionMinutes: number };
  quietHours: { enabled: boolean; startMin: number; endMin: number };
  retentionDays: RetentionDays;
  crisisLocale: string;
  updatedAt: Ts;
  updatedBy: "parent";
}

export interface ChildPreferences {
  sensory: SensoryProfile;
  companionName?: string;
  /** one of 3–6 curated ids */
  companionLook?: string;
  sensoryPreset?: "lowSensory" | "standard" | "lively";
  /** Bloop prefs (w7) */
  celebrationIntensity?: number;
  animationIntensity?: number;
  keepFamiliar?: boolean;
  updatedAt: Ts;
  updatedBy: "parent" | "kid";
}

export interface ChildSettingsDoc {
  /** PARENT-AUTHORITATIVE (rules: only the parent writes this map) */
  controls: ChildControls;
  /** TWO-WAY (field-level LWW on updatedAt) */
  preferences: ChildPreferences;
}

// ---------------------------------------------------------------------------
// children/{childId}/boards|schedules  (Firestore PROJECTIONS of the w4/w5
// primitives — §8 #4b/#5; the owning on-device types land in M4.x. Child
// photos/audio (file:// URIs) are NEVER synced.)
// ---------------------------------------------------------------------------

export interface SymbolDoc {
  id: string;
  label: string;
  /** cleared-license asset key ONLY (manifest-gated, §8 #22) — never a child photo */
  assetKey: string;
  category: string;
  isCore: boolean;
  backgroundColor?: string;
}

export interface BoardDoc {
  id: string;
  name: string;
  /** folder tree */
  parentId: string | null;
  /** ordered */
  symbolIds: string[];
  gridSize: { cols: number; rows: number };
  kind: "aac" | "choice" | "firstthen" | "schedule";
  updatedAt: Ts;
}

export interface ScheduleStepDoc {
  id: string;
  label: string;
  symbolId?: string;
  /** Storage ref (A8 video modeling) — pulled to a local cache on first play */
  videoRef?: { path: string; durationMs?: number };
  spokenLabel?: string;
}

export interface ScheduleDoc {
  id: string;
  name: string;
  steps: ScheduleStepDoc[];
  /** A4: no auto-advance, ever (§8 #14) */
  transition: { warnSeconds: number; requireReadyTap: boolean };
  updatedAt: Ts;
}

/** Parent-authored narrative; the kid pulls APPROVED-only (w5). */
export interface NarrativeDoc {
  id: string;
  title: string;
  pages: { text: string; symbolId?: string }[];
  /** unset ⇒ NOT visible to the kid device */
  approvedAt?: Ts;
  updatedAt: Ts;
}

// ---------------------------------------------------------------------------
// children/{childId}/activity/{eventId}  — one-way-UP, append-only mirror
// ---------------------------------------------------------------------------

/** CANONICAL 11-member union (w1 base + w6 additions — §8 #6). */
export type ActivityKind =
  | "step_done"
  | "routine_complete"
  | "token_earned"
  | "mood_log"
  | "emotion_logged"
  | "break_taken"
  | "breathing_done"
  | "movement_break"
  | "aac_utterance_summary"
  | "firstthen_done"
  | "schedule_step_done";

/** Runtime mirror of `ActivityKind` (tests iterate it; `satisfies` pins it). */
export const ALL_ACTIVITY_KINDS = [
  "step_done",
  "routine_complete",
  "token_earned",
  "mood_log",
  "emotion_logged",
  "break_taken",
  "breathing_done",
  "movement_break",
  "aac_utterance_summary",
  "firstthen_done",
  "schedule_step_done",
] as const satisfies readonly ActivityKind[];

/** Compile-time guard: a union member missing above is a type error. */
type _AllKindsCovered =
  Exclude<ActivityKind, (typeof ALL_ACTIVITY_KINDS)[number]> extends never
    ? true
    : ["missing ActivityKind member in ALL_ACTIVITY_KINDS"];
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _allKindsCovered: _AllKindsCovered = true;

/** AGGREGATE/COUNTS ONLY — a closed value type; no free text, no PII. */
export type ActivityPayload = Record<string, number | string | boolean>;

export interface ActivityEventDoc {
  /** client ULID = doc id (idempotent upsert; `set` with merge) */
  id: string;
  kind: ActivityKind;
  /** event time */
  at: Ts;
  payload: ActivityPayload;
  createdAt: Ts;
  /** TTL = createdAt + retentionDays (§8 #10/#10b) */
  expiresAt: Ts;
}

// ---------------------------------------------------------------------------
// children/{childId}/transcripts/{turnId}  — admin-only write (the proxy is
// the ONE writer; redactPii runs BEFORE the write — §2.5), PII-REDACTED, TTL
// ---------------------------------------------------------------------------

export interface TranscriptTurnDoc {
  turnId: string;
  childId: string;
  sessionId: string;
  /** PII-REDACTED before write — NEVER raw child text */
  childText: string;
  inputMode: InputMode;
  /** the approved (post-shield) reply only */
  replyText: string;
  status: ModeratedReplyStatus;
  model: "mock" | "scripted" | "gemini-flash" | "deepseek";
  inputFlags: ModerationFlag[];
  outputFlags: ModerationFlag[];
  /** the FACT of PII, never the value */
  pii: { found: PiiCategory[] };
  onFail?: OnFailAction;
  flagged: boolean;
  /** abuse/csam preservation — exempt from TTL/purge until cleared (§8 #27) */
  legalHold?: boolean;
  createdAt: Ts;
  expiresAt: Ts;
}

// ---------------------------------------------------------------------------
// children/{childId}/alerts/{alertId}  — admin-only write (crisis), TTL, → FCM
// ---------------------------------------------------------------------------

/** canonical (warn/flag ⇒ concern — §8 #11) */
export type AlertSeverity = "info" | "concern" | "crisis";
export type AlertStatus = "new" | "seen" | "acknowledged" | "resolved";

export interface AlertDoc {
  id: string;
  childId: string;
  parentUid: string;
  /** §5.2 differentiation — abuse/csam ⇒ NO parent auto-alert (§8 #27) */
  crisisType?: CrisisType;
  severity: AlertSeverity;
  /** human-readable, NON-clinical */
  reason: string;
  categories?: ModerationCategory[];
  /** redacted turn ids for context */
  transcriptWindow: string[];
  /**
   * COPY of the redacted window — survives the transcript's shorter TTL so
   * the alert keeps its context (§2.3).
   */
  pinnedTurns: { childText: string; replyText: string; at: Ts }[];
  /** abuse/csam ⇒ TTL/purge-exempt (§2.5, §8 #27) */
  legalHold?: boolean;
  status: AlertStatus;
  /** §8 #26 dual channel + unacknowledged re-escalation */
  deliveredFcm: boolean;
  deliveredEmail: boolean;
  reEscalatedAt?: Ts;
  acknowledgedAt?: Ts;
  acknowledgedBy?: string;
  createdAt: Ts;
  /** longer TTL than transcripts (the parent must act) */
  expiresAt: Ts;
}

// ---------------------------------------------------------------------------
// safetyReports/{reportId}  — the mandated-reporter queue (§8 #27). Admin-only
// read AND write; never parent- or kid-visible; legal-hold companion record.
// ---------------------------------------------------------------------------

export interface SafetyReportDoc {
  id: string;
  childId: string;
  crisisType: Extract<CrisisType, "abuse" | "csam">;
  /** redacted turn ids under legal hold */
  transcriptWindow: string[];
  status: "open" | "reported" | "cleared";
  createdAt: Ts;
  clearedAt?: Ts;
}

// ---------------------------------------------------------------------------
// children/{childId}/reports/{rangeKey}  — kid-synced PII-FREE report snapshot
// (producer = the w1 sync adapter `computeAndSyncReportSnapshot` — §8 #21;
// reader = the parent Report screen, M3.1). Rules: kid-write own / parent-read.
// ---------------------------------------------------------------------------

export interface ReportSnapshotDoc {
  rangeKey: ReportRangeKey;
  /** the SHARED anti-shame ReportModel, verbatim (descriptive counts only) */
  model: ReportModel;
  generatedAt: Ts;
  expiresAt: Ts;
}

// ---------------------------------------------------------------------------
// config/{global}  — read-only to clients; admin-only write; SEEDED by w1's
// `seedGlobalConfig` deploy step (§8 #21b — shared-module fallback if absent).
// ---------------------------------------------------------------------------

export interface GlobalConfigDoc {
  moderationThresholds: Record<string, number>;
  scopeCategories: { id: TopicCategory; label: string }[];
  /**
   * PRE-WRITTEN, human-reviewed crisis tables (mirror of the w8
   * `CRISIS_RESOURCES` cards keyed by locale) — NEVER model-generated.
   */
  crisisResources: Record<string, { label: string; contact: string; note?: string }[]>;
  /** the persistent "Bloop is an AI helper…" disclosure copy */
  aiDisclosure: string;
  version: string;
}
