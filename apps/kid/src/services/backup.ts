/**
 * src/services/backup.ts — LOCAL data backup / restore (clinician-reporting
 * §3.4/§3.5, M-D1). The offline-first replacement for a cloud "your data" portal:
 * export every `tb/` slice to ONE JSON file the parent can save/share, and import
 * it back — validated + repaired through the existing invariant pipeline before it
 * ever touches disk.
 *
 * OFFLINE + PARENT-GATED: the file only goes where the PARENT explicitly sends it
 * via the OS share sheet; nothing auto-uploads. Export / restore-replace are the
 * most sensitive actions in the app and are routed through the PIN gate by the
 * caller (settings.tsx, `mode:'sensitive'`).
 *
 * NATIVE ACCESS IS LAZY (indirect `require` inside functions) so the web build
 * degrades cleanly and jest can `jest.mock` expo-file-system(/legacy) /
 * expo-sharing / expo-document-picker.
 *
 * NON-PUNISHING RESTORE (§6.5): import repair only ever coerces corrupt values UP
 * to safe positives (never zeroes a balance/streak); a bad/foreign/empty/canceled
 * file changes NOTHING (no `setState` is called).
 */
import type { EpochMs } from "../domain/types";
import {
  clone,
  repairCompanion,
  repairLedger,
  repairProgress,
  repairTask,
} from "../storage/migrations";
import { SCHEMA_VERSION, isTbKey, namespacedStoreKey } from "../storage/schemaVersion";
import { storage } from "../storage/storage";
import { useBuddyStore } from "../state/buddyStore";
import { useChildStore } from "../state/childStore";
import { useChoreStore } from "../state/choreStore";
import { useFocusSessionStore } from "../state/focusSessionStore";
import { usePlanStore } from "../state/planStore";
import { useQuestStore } from "../state/questStore";
import { useRewardStore } from "../state/rewardStore";
import { useRunProgressStore } from "../state/runProgressStore";
import { useSessionStore } from "../state/sessionStore";
import { useSettingsStore } from "../state/settingsStore";
import { useTaskStore } from "../state/taskStore";
import {
  cancelTrialEndingReminder,
  scheduleTrialEndingReminder,
} from "./notifications";
import { deletePhoto } from "./photoVerify";

// ---------------------------------------------------------------------------
// Transport types.
// ---------------------------------------------------------------------------

export const BACKUP_FORMAT = "tiny-bubbles-backup" as const;

export interface BackupFile {
  app: typeof BACKUP_FORMAT;
  schemaVersion: number; // SCHEMA_VERSION at export time
  exportedAt: EpochMs;
  /** raw persisted envelopes keyed by tb/ key, e.g. { "tb/settings": {state,version}, ... } */
  slices: Record<string, unknown>;
}

export interface ImportCounts {
  children: number;
  tasks: number;
  rewards: number;
  companions: number;
}

export interface ExportResult {
  fileUri: string;
  itemCount: number;
  keys: string[];
}

export type ImportResult =
  | { ok: true; counts: ImportCounts }
  | { ok: false; reason: "not_a_backup" | "unreadable" | "empty" | "canceled" };

export type PreparedRestore =
  | { ok: true; file: BackupFile; counts: ImportCounts }
  | { ok: false; reason: "not_a_backup" | "unreadable" | "empty" | "canceled" };

// ---------------------------------------------------------------------------
// Lazy native module loaders (indirect require — web-safe + jest-mockable).
// ---------------------------------------------------------------------------

type FsLegacy = typeof import("expo-file-system/legacy");
type SharingModule = typeof import("expo-sharing");
type DocPickerModule = typeof import("expo-document-picker");

function lazyRequire<T>(name: string): T {
  const req =
    typeof require === "function" ? (require as (n: string) => unknown) : undefined;
  if (!req) throw new Error(`[backup] no require available to load ${name}`);
  return req(name) as T;
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

// ---------------------------------------------------------------------------
// The persisted-store keyspace + how each known store re-applies its state.
// ---------------------------------------------------------------------------

/** Known store keys mapped to the `setState` that re-applies a restored slice. */
const STORE_SETTERS: Record<string, (state: Record<string, unknown>) => void> = {
  [namespacedStoreKey("settings")]: (s) => useSettingsStore.setState(s as never),
  [namespacedStoreKey("children")]: (s) => useChildStore.setState(s as never),
  [namespacedStoreKey("tasks")]: (s) => useTaskStore.setState(s as never),
  [namespacedStoreKey("rewards")]: (s) => useRewardStore.setState(s as never),
  [namespacedStoreKey("buddy")]: (s) => useBuddyStore.setState(s as never),
  [namespacedStoreKey("runProgress")]: (s) => useRunProgressStore.setState(s as never),
  [namespacedStoreKey("chores")]: (s) => useChoreStore.setState(s as never),
  [namespacedStoreKey("quests")]: (s) => useQuestStore.setState(s as never),
  [namespacedStoreKey("plans")]: (s) => usePlanStore.setState(s as never),
};

const K_CHILDREN = namespacedStoreKey("children");
const K_TASKS = namespacedStoreKey("tasks");
const K_REWARDS = namespacedStoreKey("rewards");
const K_BUDDY = namespacedStoreKey("buddy");
const K_SETTINGS = namespacedStoreKey("settings");

// ---------------------------------------------------------------------------
// Collect / build / validate / repair (pure-ish; only `collect` touches storage).
// ---------------------------------------------------------------------------

/** Read every `tb/` key via the storage port into a {key: parsed-envelope} map. */
export async function collectTbSlices(): Promise<Record<string, unknown>> {
  const keys = (await storage.getAllKeys()).filter(isTbKey);
  const slices: Record<string, unknown> = {};
  for (const key of keys) {
    const raw = await storage.getString(key);
    if (raw == null) continue;
    try {
      slices[key] = JSON.parse(raw);
    } catch {
      // A corrupt on-device blob is skipped rather than aborting the whole backup.
    }
  }
  return slices;
}

/** Wrap collected slices in the versioned backup envelope. */
export function buildBackupFile(
  slices: Record<string, unknown>,
  now: EpochMs,
): BackupFile {
  return {
    app: BACKUP_FORMAT,
    schemaVersion: SCHEMA_VERSION,
    exportedAt: now,
    slices,
  };
}

/** Structural shape guard for a parsed backup envelope. */
export function validateBackupFile(parsed: unknown): parsed is BackupFile {
  if (!isPlainObject(parsed)) return false;
  if (parsed.app !== BACKUP_FORMAT) return false;
  if (typeof parsed.schemaVersion !== "number") return false;
  if (typeof parsed.exportedAt !== "number") return false;
  if (!isPlainObject(parsed.slices)) return false;
  return true;
}

/**
 * Map the primitive invariant-repair fns across the REAL persisted store shapes
 * (one envelope per store: `{ state, version }`). Defense against a hand-edited /
 * cross-version file. Never zeroes anything (non-punishing) — coerces corrupt
 * values UP to safe positives only. Returns a repaired clone; input untouched.
 */
export function repairBackupSlices(file: BackupFile): Record<string, unknown> {
  const out = clone(file.slices);

  const childrenState = envelopeState(out[K_CHILDREN]);
  if (childrenState) {
    if (isPlainObject(childrenState.ledgers)) {
      for (const cid of Object.keys(childrenState.ledgers)) {
        const l = (childrenState.ledgers as Record<string, unknown>)[cid];
        if (isPlainObject(l)) (childrenState.ledgers as Record<string, unknown>)[cid] = repairLedger(l);
      }
    }
    if (isPlainObject(childrenState.progress)) {
      for (const cid of Object.keys(childrenState.progress)) {
        const p = (childrenState.progress as Record<string, unknown>)[cid];
        if (isPlainObject(p)) (childrenState.progress as Record<string, unknown>)[cid] = repairProgress(p);
      }
    }
  }

  const buddyState = envelopeState(out[K_BUDDY]);
  if (buddyState && isPlainObject(buddyState.companions)) {
    for (const cid of Object.keys(buddyState.companions)) {
      const comp = (buddyState.companions as Record<string, unknown>)[cid];
      if (isPlainObject(comp)) (buddyState.companions as Record<string, unknown>)[cid] = repairCompanion(comp);
    }
  }

  const tasksState = envelopeState(out[K_TASKS]);
  if (tasksState && isPlainObject(tasksState.tasks)) {
    for (const cid of Object.keys(tasksState.tasks)) {
      const list = (tasksState.tasks as Record<string, unknown>)[cid];
      if (Array.isArray(list)) {
        (tasksState.tasks as Record<string, unknown>)[cid] = list.map((task) =>
          isPlainObject(task) ? repairTask(task) : task,
        );
      }
    }
  }

  // tb/settings.state is left as-is (no invariant-bearing numeric fields beyond
  // gate/entitlement, which never gets zeroed on restore).
  return out;
}

/** Pull the `.state` object out of a persisted `{ state, version }` envelope. */
function envelopeState(envelope: unknown): Record<string, unknown> | null {
  if (isPlainObject(envelope) && isPlainObject(envelope.state)) {
    return envelope.state as Record<string, unknown>;
  }
  return null;
}

/** Count the headline entities in the (repaired) slices for the confirm dialog. */
function countSlices(slices: Record<string, unknown>): ImportCounts {
  const children = envelopeState(slices[K_CHILDREN]);
  const tasks = envelopeState(slices[K_TASKS]);
  const rewards = envelopeState(slices[K_REWARDS]);
  const buddy = envelopeState(slices[K_BUDDY]);

  const countMapArrays = (rec: unknown): number => {
    if (!isPlainObject(rec)) return 0;
    let n = 0;
    for (const v of Object.values(rec)) if (Array.isArray(v)) n += v.length;
    return n;
  };

  return {
    children:
      children && Array.isArray(children.index) ? children.index.length : 0,
    tasks: tasks ? countMapArrays(tasks.tasks) : 0,
    rewards: rewards ? countMapArrays(rewards.rewards) : 0,
    companions:
      buddy && isPlainObject(buddy.companions)
        ? Object.keys(buddy.companions).length
        : 0,
  };
}

// ---------------------------------------------------------------------------
// Export.
// ---------------------------------------------------------------------------

/** `YYYY-MM-DD` for a filename (deterministic). */
function fileDate(ms: number): string {
  const d = new Date(ms);
  return Number.isNaN(d.getTime()) ? "backup" : d.toISOString().slice(0, 10);
}

/**
 * Collect → build → write a cache file → hand to the OS share sheet. Stamps
 * `parentSettings.lastBackupAt` (display-only). The parent explicitly sends the
 * file; nothing auto-uploads.
 */
export async function exportBackup(): Promise<ExportResult> {
  const slices = await collectTbSlices();
  const keys = Object.keys(slices);
  const now = Date.now();
  const json = JSON.stringify(buildBackupFile(slices, now));

  const FS = lazyRequire<FsLegacy>("expo-file-system/legacy");
  const dir = FS.cacheDirectory ?? FS.documentDirectory ?? "";
  const fileUri = `${dir}tiny-bubbles-backup-${fileDate(now)}.json`;
  await FS.writeAsStringAsync(fileUri, json);

  // Display-only breadcrumb ("last backed up …"); never gates anything.
  try {
    useSettingsStore.getState().updateParentSettings({ lastBackupAt: now });
  } catch {
    // non-fatal
  }

  // Offer the file to the OS share sheet when available (parent-initiated send).
  try {
    const Sharing = lazyRequire<SharingModule>("expo-sharing");
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(fileUri, {
        mimeType: "application/json",
        dialogTitle: "Tiny Bubbles backup",
        UTI: "public.json",
      });
    }
  } catch {
    // sharing unavailable (web/desktop) — the file is still written + saved.
  }

  return { fileUri, itemCount: keys.length, keys };
}

// ---------------------------------------------------------------------------
// Restore (two-phase: prepare → confirm → apply).
// ---------------------------------------------------------------------------

/**
 * Pick a file → read → parse → validate → repair. Does NOT touch any store — the
 * caller shows the mandatory confirm-replace step, then calls `applyRestore`. Any
 * failure returns a gentle reason and changes nothing.
 */
export async function prepareRestore(): Promise<PreparedRestore> {
  let picked: Awaited<ReturnType<DocPickerModule["getDocumentAsync"]>>;
  try {
    const DocumentPicker = lazyRequire<DocPickerModule>("expo-document-picker");
    picked = await DocumentPicker.getDocumentAsync({
      type: "application/json",
      copyToCacheDirectory: true,
      multiple: false,
    });
  } catch {
    return { ok: false, reason: "unreadable" };
  }

  if (!picked || picked.canceled || !picked.assets || picked.assets.length === 0) {
    return { ok: false, reason: "canceled" };
  }
  const uri = picked.assets[0]?.uri;
  if (!uri) return { ok: false, reason: "canceled" };

  let raw: string;
  try {
    const FS = lazyRequire<FsLegacy>("expo-file-system/legacy");
    raw = await FS.readAsStringAsync(uri);
  } catch {
    return { ok: false, reason: "unreadable" };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, reason: "unreadable" };
  }

  if (!validateBackupFile(parsed)) return { ok: false, reason: "not_a_backup" };
  const tbKeys = Object.keys(parsed.slices).filter(isTbKey);
  if (tbKeys.length === 0) return { ok: false, reason: "empty" };

  const repairedSlices = repairBackupSlices(parsed);
  const file: BackupFile = { ...parsed, slices: repairedSlices };
  return { ok: true, file, counts: countSlices(repairedSlices) };
}

/**
 * Apply an already-validated + repaired backup: overwrite each store via
 * `setState` (persist middleware writes disk), reconcile in-memory + device-local
 * state, and set a valid active child. FULL-DEVICE REPLACE (not a merge).
 */
export async function applyRestore(file: BackupFile): Promise<ImportResult> {
  // 1. Delete outgoing verify-photo files BEFORE overwriting tb/tasks so the old
  //    device's photos don't orphan (the restored photoUris point at files that do
  //    not exist here). No-throw / fire-and-forget.
  const currentTasks = useTaskStore.getState().tasks;
  for (const list of Object.values(currentTasks)) {
    for (const task of list ?? []) {
      const uri = task.verification?.photoUri;
      if (uri) void deletePhoto(uri);
    }
  }

  // 2. Apply each slice. Known stores → setState (persist writes disk). Unknown
  //    tb/ keys → written back verbatim (forward-safe). Per-store migration is a
  //    no-op today (MIGRATIONS empty at SCHEMA_VERSION 1); the hook lives here.
  for (const [key, envelope] of Object.entries(file.slices)) {
    const setter = STORE_SETTERS[key];
    const state = envelopeState(envelope);
    if (setter && state) {
      setter(state);
    } else if (isTbKey(key)) {
      void storage.set(key, JSON.stringify(envelope));
    }
  }

  // 3. Set a VALID active child from the restored roster.
  const index = useChildStore.getState().index;
  const restoredActive = useSettingsStore.getState().meta.activeChildId;
  const validActive =
    restoredActive && index.some((e) => e.id === restoredActive)
      ? restoredActive
      : (index[0]?.id ?? null);
  useSettingsStore.getState().setActiveChild(validActive);

  // 4. Reconcile in-memory pointers — the restored stores may not contain the run
  //    the old in-memory pointers referenced (dangling activeRunId / focus session).
  useSessionStore.getState().setActiveRun(null);
  useFocusSessionStore.getState().stop();

  // 5. Re-derive the OS-scheduled trial-end reminder from the RESTORED entitlement
  //    (the notification itself is not in the backup). No-throw.
  await reSyncTrialReminder();

  return { ok: true, counts: countSlices(file.slices) };
}

/** Re-derive the device-local trial reminder from the (restored) entitlement. */
async function reSyncTrialReminder(): Promise<void> {
  try {
    const { entitlement, parentSettings } = useSettingsStore.getState();
    const trialLive =
      entitlement.source === "trial" && (entitlement.trialEndsAt ?? 0) > Date.now();
    if (trialLive && entitlement.trialEndsAt) {
      await scheduleTrialEndingReminder(entitlement.trialEndsAt, parentSettings.quietHours);
    } else {
      await cancelTrialEndingReminder();
    }
  } catch {
    // notifications unavailable (web / restricted Expo Go) — non-fatal.
  }
}

/**
 * Convenience: pick → validate → repair → confirm → apply. `confirm` receives the
 * headline counts and must resolve truthy to proceed (defaults to always-proceed,
 * used by tests). The UI passes a confirm that shows the replace-warning step.
 */
export async function importBackup(
  confirm: (counts: ImportCounts) => boolean | Promise<boolean> = () => true,
): Promise<ImportResult> {
  const prepared = await prepareRestore();
  if (!prepared.ok) return prepared;
  const proceed = await confirm(prepared.counts);
  if (!proceed) return { ok: false, reason: "canceled" };
  return applyRestore(prepared.file);
}
