/**
 * src/storage/migrations.ts — forward-only migrations + safe load + invariant repair.
 *
 * Re-authored from the PATTERN in tether's `GamificationService` (doc 62 §3,
 * doc 66 §1b.7) — NOT copied. tether's `load()` does: read -> parse ->
 * `mergeWithDefaults()` -> `validateAndMigrate()`. We generalise that into:
 *
 *   1. `safeParse` / `loadSlice` — never crash on a corrupt blob; fall back to
 *      safe defaults (and NEVER to a punishing/zeroed state).
 *   2. `runMigrations` — ordered, forward-only, total migrations between schema
 *      versions; unknown keys are preserved through the spread-merge so a newer
 *      build's data is not silently dropped by an older build (doc 62 §3).
 *   3. `mergeWithDefaults` — fill missing fields with safe defaults, preserving
 *      any unknown keys (forward-safe).
 *   4. `validateAndRepair` — clamp/coerce values to enforce the structural
 *      anti-shame invariants (doc 62 §3, doc 66 §5): companion mood is always a
 *      VALID POSITIVE member (coerced to `content`), balances never negative,
 *      streaks never below 0 / `longest` never lowered, task status never
 *      `failed`.
 *
 * This module deliberately does NOT import M4's full data model (it does not
 * exist yet). It operates on loose structural views (`Raw*`) and tolerates
 * missing fields, so it is forward-compatible: M4 extends the slices and these
 * invariants keep holding.
 */
import { isSoundscapeId } from "../data/soundscapes";
import { getBreathPattern } from "../domain/breathing";
import {
  BREAK_MINUTE_OPTIONS,
  DEFAULT_FOCUS_INTERVALS,
  FOCUS_MINUTE_OPTIONS,
  nearestMinuteOption,
} from "../domain/focus";
import type { CompanionMood } from "../domain/types";

import { SCHEMA_VERSION } from "./schemaVersion";

// ---------------------------------------------------------------------------
// Canonical anti-shame constants (doc 66 §1b.7 / §5).
// ---------------------------------------------------------------------------

/**
 * Runtime allow-list of valid companion moods. `satisfies` ties it to the
 * `CompanionMood` type so a renamed/removed member is a compile error here.
 */
export const VALID_COMPANION_MOODS = [
  "content",
  "happy",
  "excited",
  "sleepy",
  "celebrating",
  "curious",
  "proud",
] as const satisfies readonly CompanionMood[];

/** Compile-time guard: fails to type-check if a `CompanionMood` member is missing above. */
type _AllMoodsCovered =
  Exclude<CompanionMood, (typeof VALID_COMPANION_MOODS)[number]> extends never
    ? true
    : ["missing CompanionMood member in VALID_COMPANION_MOODS"];
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _allMoodsCovered: _AllMoodsCovered = true;

/** The canonical resting/default mood any out-of-set value is coerced to. */
export const DEFAULT_COMPANION_MOOD: CompanionMood = "content";

/** The only valid task statuses. There is NO `failed` — by design (doc 62 §5). */
export const VALID_TASK_STATUSES = ["todo", "done", "skipped"] as const;
export type ValidTaskStatus = (typeof VALID_TASK_STATUSES)[number];

// ---------------------------------------------------------------------------
// Loose structural views of the persisted slices (invariant-bearing fields
// only). Extra/unknown fields are always preserved.
// ---------------------------------------------------------------------------

export interface RawCompanion {
  mood?: unknown;
  bondLevel?: unknown;
  growthStage?: unknown;
  [k: string]: unknown;
}

export interface RawLedger {
  balance?: unknown;
  heldTokens?: unknown;
  lifetimeEarned?: unknown;
  lifetimeSpent?: unknown;
  entries?: unknown;
  [k: string]: unknown;
}

export interface RawProgress {
  cumulativeCount?: unknown;
  currentStreakDays?: unknown;
  longestStreakDays?: unknown;
  paused?: unknown;
  [k: string]: unknown;
}

export interface RawTask {
  status?: unknown;
  [k: string]: unknown;
}

export interface RawChildSlices {
  companion?: RawCompanion;
  ledger?: RawLedger;
  progress?: RawProgress;
  tasks?: RawTask[];
  /** loose view of the profile slice (its `settings.soundscape` is repaired). */
  profile?: { settings?: Record<string, unknown>; [k: string]: unknown };
  [k: string]: unknown;
}

/** Loose view of persisted per-child `SoundscapeSettings` (soundscapes §3.4). */
export interface RawSoundscape {
  volume?: unknown;
  calmSceneId?: unknown;
  focusSceneId?: unknown;
  focusDuringTasks?: unknown;
  [k: string]: unknown;
}

/** Loose view of persisted per-child `FocusIntervalConfig` (focus-intervals §3.5). */
export interface RawFocusIntervals {
  enabled?: unknown;
  focusMinutes?: unknown;
  breakMinutes?: unknown;
  movementBreaks?: unknown;
  chime?: unknown;
  [k: string]: unknown;
}

export interface RawMeta {
  schemaVersion?: unknown;
  activeChildId?: unknown;
  [k: string]: unknown;
}

/** Loose view of the persisted `Entitlement` (billing-entitlements §3.3). */
export interface RawEntitlement {
  tier?: unknown;
  source?: unknown;
  trialStartedAt?: unknown;
  trialEndsAt?: unknown;
  premiumSince?: unknown;
  mockPurchases?: unknown;
  trialEndReminderAt?: unknown;
  updatedAt?: unknown;
  [k: string]: unknown;
}

export interface RawState {
  meta?: RawMeta;
  childIndex?: Array<{ id?: unknown; [k: string]: unknown }>;
  children?: Record<string, RawChildSlices>;
  /** app/parent-global settings slice may travel alongside (backup/roundtrip). */
  entitlement?: RawEntitlement;
  [k: string]: unknown;
}

// ---------------------------------------------------------------------------
// Small JSON-data helpers.
// ---------------------------------------------------------------------------

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/** Deep clone of JSON-able data (our persisted data is JSON-able by design, doc 62 §1). */
export function clone<T>(value: T): T {
  if (value === undefined) return value;
  return JSON.parse(JSON.stringify(value)) as T;
}

/** A finite number, or the fallback. */
function num(v: unknown, fallback: number): number {
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}

/** A non-negative finite number floored at 0. */
function nonNeg(v: unknown, fallback = 0): number {
  return Math.max(0, num(v, fallback));
}

// ---------------------------------------------------------------------------
// Safe parse + load (corruption-proof).
// ---------------------------------------------------------------------------

/**
 * JSON-parse a stored string. On ANY failure (corrupt JSON, null, wrong type)
 * return a deep clone of `fallback` — never throw. This guarantees a corrupt
 * blob can never crash hydration.
 */
export function safeParse<T>(raw: string | null | undefined, fallback: T): T {
  if (raw == null) return clone(fallback);
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (parsed == null) return clone(fallback);
    return parsed as T;
  } catch {
    return clone(fallback);
  }
}

/**
 * Load one slice from its stored string: safe-parse, then fill missing fields
 * from `defaults`. The result always has the full default shape (a corrupt or
 * partial blob can never leave a slice half-populated).
 */
export function loadSlice<T>(raw: string | null | undefined, defaults: T): T {
  return mergeWithDefaults(safeParse<unknown>(raw, defaults), defaults);
}

// ---------------------------------------------------------------------------
// mergeWithDefaults (tether mergeWithDefaults/mergeBadges PATTERN, generalised).
// ---------------------------------------------------------------------------

/**
 * Recursively fill missing fields of `loaded` from `defaults`, preserving any
 * unknown keys present in `loaded` (forward-safe per doc 62 §3). Arrays and
 * primitives from `loaded` replace defaults wholesale; nested plain objects are
 * merged key-by-key. Shape mismatches (e.g. loaded primitive where a default
 * object is expected) fall back to the default shape.
 */
export function mergeWithDefaults<T>(loaded: unknown, defaults: T): T {
  if (loaded === undefined || loaded === null) return clone(defaults);

  if (isPlainObject(defaults)) {
    if (!isPlainObject(loaded)) return clone(defaults); // shape mismatch -> safe default
    // Start from loaded so unknown keys survive; overlay each known default key.
    const out: Record<string, unknown> = { ...loaded };
    for (const key of Object.keys(defaults)) {
      out[key] = mergeWithDefaults(loaded[key], (defaults as Record<string, unknown>)[key]);
    }
    return out as T;
  }

  if (Array.isArray(defaults)) {
    return (Array.isArray(loaded) ? loaded : clone(defaults)) as T;
  }

  // primitive default: keep loaded only if it is also a primitive of a value.
  return loaded as T;
}

// ---------------------------------------------------------------------------
// validateAndRepair — structural anti-shame invariants (doc 62 §3, doc 66 §5).
// ---------------------------------------------------------------------------

/** Coerce any out-of-set companion mood to the canonical positive default `content`. */
export function repairCompanion(companion: RawCompanion): RawCompanion {
  const out: RawCompanion = { ...companion };
  if (typeof out.mood !== "string" || !VALID_COMPANION_MOODS.includes(out.mood as CompanionMood)) {
    out.mood = DEFAULT_COMPANION_MOOD;
  }
  // bond/growth are monotonic & cosmetic: never lowered by repair, but garbage -> 0.
  if (out.bondLevel !== undefined) out.bondLevel = nonNeg(out.bondLevel);
  if (out.growthStage !== undefined) out.growthStage = nonNeg(out.growthStage);
  return out;
}

/**
 * Ledger invariants (doc 62 §3/§6): no field may ever go negative; the only way
 * tokens leave is an explicit spend. `balance` is recomputed from the monotonic
 * lifetime totals when it is non-finite/garbage, and is floored at 0. Held
 * tokens can never exceed the balance (you cannot reserve what you do not have).
 */
export function repairLedger(ledger: RawLedger): RawLedger {
  const out: RawLedger = { ...ledger };
  out.lifetimeEarned = nonNeg(out.lifetimeEarned);
  out.lifetimeSpent = nonNeg(out.lifetimeSpent);

  // Recompute balance from monotonic lifetime totals when it is missing/garbage
  // OR negative. A negative balance is corruption — recomputing RESTORES the
  // child's rightful earned tokens (non-punishing) rather than zeroing them.
  const recomputed = Math.max(0, (out.lifetimeEarned as number) - (out.lifetimeSpent as number));
  out.balance =
    typeof out.balance === "number" && Number.isFinite(out.balance) && out.balance >= 0
      ? out.balance
      : recomputed;

  out.heldTokens = Math.min(nonNeg(out.heldTokens), out.balance as number);
  if (!Array.isArray(out.entries)) out.entries = [];
  return out;
}

/**
 * Progress invariants (doc 62 §3/§10): a streak can never be negative, and
 * `longestStreakDays` is never lowered by repair (it is a non-losable lifetime
 * best). There is no "broken/0 punishing" repair path — clamping to >= 0 is the
 * floor; the never-show-0 rule is enforced in the UI layer.
 */
export function repairProgress(progress: RawProgress): RawProgress {
  const out: RawProgress = { ...progress };
  out.cumulativeCount = nonNeg(out.cumulativeCount);
  out.currentStreakDays = nonNeg(out.currentStreakDays);
  const longest = nonNeg(out.longestStreakDays);
  out.longestStreakDays = Math.max(longest, out.currentStreakDays as number);
  if (out.paused !== undefined) out.paused = Boolean(out.paused);
  return out;
}

/** Coerce any stray task status to `todo` — the `failed` state does not exist (doc 62 §5). */
export function repairTask(task: RawTask): RawTask {
  const out: RawTask = { ...task };
  if (
    typeof out.status !== "string" ||
    !VALID_TASK_STATUSES.includes(out.status as ValidTaskStatus)
  ) {
    out.status = "todo";
  }
  // visual-timers §3.3: a negative/NaN `timerSeconds` means "no timer" — coerce to
  // undefined (never throw, never invent a deadline). A valid positive budget stays.
  if ("timerSeconds" in out) {
    const ts = out.timerSeconds;
    if (typeof ts !== "number" || !Number.isFinite(ts) || ts <= 0) {
      out.timerSeconds = undefined;
    }
  }
  return out;
}

/** The valid `Entitlement.source` members (coherence guard for repair). */
export const VALID_ENTITLEMENT_SOURCES = ["none", "trial", "mock_purchase"] as const;

/**
 * Entitlement coherence repair (billing-entitlements §3.3). Entitlement carries
 * NO shame-bearing field, so this is coherence-only — it can NEVER strip an owned
 * cosmetic (those live in `buddyStore.unlockedItems`, never here; the §1b.11 test
 * asserts equipped cosmetics survive a free flip). Rules:
 *   - `mockPurchases` coerced to an array if corrupt (never delete real history).
 *   - a corrupt "premium with no basis" (`tier:'premium'` + `source:'none'` + an
 *     absent/expired trial + no `premiumSince`) is coerced DOWN to a clean free
 *     record. Never RAISES to premium; never deletes `mockPurchases`.
 */
export function repairEntitlement(
  entitlement: RawEntitlement,
  now: number = Date.now(),
): RawEntitlement {
  const out: RawEntitlement = { ...entitlement };
  if (!Array.isArray(out.mockPurchases)) out.mockPurchases = [];

  const trialEndsAt =
    typeof out.trialEndsAt === "number" && Number.isFinite(out.trialEndsAt)
      ? out.trialEndsAt
      : 0;
  const hasPremiumSince =
    typeof out.premiumSince === "number" && Number.isFinite(out.premiumSince);

  // "premium with no basis": expired/absent trial AND no paid marker -> free.
  if (
    out.tier === "premium" &&
    out.source === "none" &&
    trialEndsAt <= now &&
    !hasPremiumSince
  ) {
    out.tier = "free";
    out.trialStartedAt = undefined;
    out.trialEndsAt = undefined;
    out.premiumSince = undefined;
    out.trialEndReminderAt = undefined;
  }
  return out;
}

/**
 * Soundscape coherence repair (soundscapes §3.4) — coherence-only, never punitive:
 * clamp `volume` to `[0,1]` (NaN/garbage → the default 0.55); coerce a scene id
 * that references a NON-EXISTENT catalog scene back to `'waves'` / `null` (a
 * premium-LOCKED scene is NOT invalid — it is preserved; ownership is a separate
 * check); coerce `focusDuringTasks` to a boolean.
 */
export function repairSoundscapeSettings(s: RawSoundscape): RawSoundscape {
  const out: RawSoundscape = { ...s };
  out.volume =
    typeof out.volume === "number" && Number.isFinite(out.volume)
      ? Math.min(1, Math.max(0, out.volume))
      : 0.55;
  if (!isSoundscapeId(out.calmSceneId)) out.calmSceneId = "waves";
  if (out.focusSceneId != null && !isSoundscapeId(out.focusSceneId)) out.focusSceneId = null;
  out.focusDuringTasks = Boolean(out.focusDuringTasks);
  return out;
}

/**
 * Focus-interval coherence repair (focus-intervals §3.5) — coherence-only, never
 * punitive: coerce `focusMinutes`/`breakMinutes` to the NEAREST curated option
 * (garbage → the default), and coerce the three flags to booleans (garbage → the
 * defaults). Never throws. Absent ⇒ the read-time resolver fills defaults anyway.
 */
export function repairFocusIntervals(f: RawFocusIntervals): RawFocusIntervals {
  const out: RawFocusIntervals = { ...f };
  out.focusMinutes = nearestMinuteOption(
    out.focusMinutes,
    FOCUS_MINUTE_OPTIONS,
    DEFAULT_FOCUS_INTERVALS.focusMinutes,
  );
  out.breakMinutes = nearestMinuteOption(
    out.breakMinutes,
    BREAK_MINUTE_OPTIONS,
    DEFAULT_FOCUS_INTERVALS.breakMinutes,
  );
  out.enabled =
    typeof out.enabled === "boolean" ? out.enabled : DEFAULT_FOCUS_INTERVALS.enabled;
  out.movementBreaks =
    typeof out.movementBreaks === "boolean"
      ? out.movementBreaks
      : DEFAULT_FOCUS_INTERVALS.movementBreaks;
  out.chime = typeof out.chime === "boolean" ? out.chime : DEFAULT_FOCUS_INTERVALS.chime;
  return out;
}

/** Repair every slice of one child. */
export function repairChildSlices(child: RawChildSlices): RawChildSlices {
  const out: RawChildSlices = { ...child };
  if (isPlainObject(out.companion)) out.companion = repairCompanion(out.companion);
  if (isPlainObject(out.ledger)) out.ledger = repairLedger(out.ledger);
  if (isPlainObject(out.progress)) out.progress = repairProgress(out.progress);
  if (Array.isArray(out.tasks)) out.tasks = out.tasks.map(repairTask);
  // Repair the optional soundscape + breathing prefs on the profile slice
  // (assembled/backup shape). Absent ⇒ nothing to do; the read-time resolver fills
  // defaults anyway. Coherence-only, never punitive.
  if (isPlainObject(out.profile) && isPlainObject(out.profile.settings)) {
    const settings = { ...out.profile.settings };
    let changed = false;
    if (isPlainObject(settings.soundscape)) {
      settings.soundscape = repairSoundscapeSettings(settings.soundscape as RawSoundscape);
      changed = true;
    }
    // breathing-regulation §3.4: an unknown/removed pattern id coerces to undefined
    // (falls back to the resolved age default); a non-boolean pacing flag → undefined.
    const bpid = settings.breathingPatternId;
    if (bpid !== undefined && (typeof bpid !== "string" || !getBreathPattern(bpid))) {
      settings.breathingPatternId = undefined;
      changed = true;
    }
    if (
      settings.breathingPacingHaptics !== undefined &&
      typeof settings.breathingPacingHaptics !== "boolean"
    ) {
      settings.breathingPacingHaptics = undefined;
      changed = true;
    }
    // focus-intervals §3.5: coerce a present focus-interval config to safe curated
    // values; absent ⇒ leave undefined (the resolver falls back to defaults).
    if (isPlainObject(settings.focusIntervals)) {
      settings.focusIntervals = repairFocusIntervals(settings.focusIntervals as RawFocusIntervals);
      changed = true;
    }
    if (changed) out.profile = { ...out.profile, settings };
  }
  return out;
}

/**
 * Repair the whole assembled state. Preserves unknown keys; enforces every
 * structural anti-shame invariant. Pure — returns a repaired copy.
 */
export function validateAndRepair(state: RawState, now: number = Date.now()): RawState {
  const out: RawState = { ...state };

  // children: repair each child's slices.
  if (isPlainObject(out.children)) {
    const children: Record<string, RawChildSlices> = {};
    for (const [cid, slices] of Object.entries(out.children)) {
      children[cid] = isPlainObject(slices) ? repairChildSlices(slices) : slices;
    }
    out.children = children;
  }

  // entitlement (settings slice): coherence-only repair — never strips owned
  // cosmetics, never raises to premium (billing-entitlements §3.3).
  if (isPlainObject(out.entitlement)) {
    out.entitlement = repairEntitlement(out.entitlement, now);
  }

  // meta.activeChildId must reference an existing child, else first child or null.
  if (isPlainObject(out.meta)) {
    const meta: RawMeta = { ...out.meta };
    const ids = Array.isArray(out.childIndex)
      ? out.childIndex
          .map((c) => (isPlainObject(c) && typeof c.id === "string" ? c.id : undefined))
          .filter((id): id is string => typeof id === "string")
      : [];
    const active = meta.activeChildId;
    if (typeof active !== "string" || !ids.includes(active)) {
      meta.activeChildId = ids.length > 0 ? ids[0] : null;
    }
    out.meta = meta;
  }

  return out;
}

// ---------------------------------------------------------------------------
// Forward-only migration engine (doc 62 §3).
// ---------------------------------------------------------------------------

/** A single forward step from schema version `from` to `to` (`to === from + 1`). */
export interface Migration {
  from: number;
  to: number;
  /** Total transform of the assembled state. MUST preserve unknown keys. */
  migrate: (state: RawState) => RawState;
}

/**
 * Ordered, forward-only migrations. EMPTY at `SCHEMA_VERSION === 1` (no prior
 * versions exist yet). Add entries here on every breaking shape change, e.g.:
 *
 *   { from: 1, to: 2, migrate: (s) => ({ ...s, meta: { ...s.meta, newField: 0 } }) }
 *
 * Each migration adds new fields with safe defaults and preserves everything
 * else (spread-merge), so no data is lost across a version bump.
 */
export const MIGRATIONS: Migration[] = [];

/**
 * Run forward-only migrations to bring `state` from `fromVersion` up to
 * `toVersion`. Migrations are applied in ascending `from` order. A blob from a
 * NEWER build (`fromVersion > toVersion`) is returned untouched — an older build
 * must never downgrade/strip newer data (doc 62 §3 backward/forward safety).
 *
 * @param migrations override the registry (used by tests).
 */
export function runMigrations(
  state: RawState,
  fromVersion: number,
  toVersion: number = SCHEMA_VERSION,
  migrations: readonly Migration[] = MIGRATIONS,
): RawState {
  if (fromVersion >= toVersion) return state;

  const ordered = [...migrations]
    .filter((m) => m.from >= fromVersion && m.to <= toVersion)
    .sort((a, b) => a.from - b.from);

  let current = state;
  let version = fromVersion;
  for (const m of ordered) {
    if (m.from !== version) continue; // keep the chain contiguous
    current = m.migrate(current);
    version = m.to;
  }
  return current;
}

/**
 * The full load pipeline (doc 62 §3 `loadStore`): migrate forward, then repair
 * invariants. Pure over an already-assembled `RawState`.
 */
export function migrateAndRepair(
  state: RawState,
  fromVersion: number,
  toVersion: number = SCHEMA_VERSION,
  migrations: readonly Migration[] = MIGRATIONS,
): RawState {
  return validateAndRepair(runMigrations(state, fromVersion, toVersion, migrations));
}
