/**
 * src/sync/settingsSync.ts — the TWO-WAY settings sync (w1 M1.2 —
 * 02-architecture §2.4).
 *
 * Direction contract:
 *   - `settings.controls` is PARENT-AUTHORITATIVE (rules block child writes)
 *     → pulled DOWN read-only into the additive `ChildSettings` fields
 *     (bloopEnabled/bloopInputMode/bloopTopicScope/bloopLimits/retentionDays/
 *     crisisLocale). The kid device NEVER pushes controls up.
 *   - `settings.preferences` is FIELD-LEVEL LAST-WRITER-WINS on `updatedAt`
 *     (server-timestamp-ordered): a NEWER remote (parent) edit applies down;
 *     an equal-or-newer LOCAL edit pushes the child's sensory/autonomy prefs
 *     up (within v1 curated caps). No CRDT/three-way merge.
 *
 * PREDICTABILITY GUARANTEE (autism invariant, §2.4): a pull NEVER
 * surprise-changes the UI mid-session. `pullSettings` only STAGES the patch;
 * `applyStagedSettings` is called at a CALM BOUNDARY (app cold start or an
 * explicit settings open) — never mid-flow.
 *
 * The merge core (`mergeSettings`) is PURE so jest covers the LWW matrix with
 * no emulator (BUILD-GUIDE env floor).
 */
import {
  type ChildSettings,
  type ChildSettingsDoc,
  type EpochMs,
  coerceRetentionDays,
  settingsDoc,
  toInputMode,
} from "@tiny-bubbles/shared";

import { useChildStore } from "../state/childStore";
import { now } from "../state/ids";
import { useSyncStore } from "../state/syncStore";

import { getSyncPorts } from "./firebase";

// ---------------------------------------------------------------------------
// Pure merge core.
// ---------------------------------------------------------------------------

/** The child-pushable preference wire form (curated caps only — never controls). */
export interface PreferencesPushUp {
  sensory: {
    soundEnabled: boolean;
    hapticsEnabled: boolean;
    lowStim: boolean;
    motionLevel: "full" | "reduced" | "off";
  };
  updatedAtMs: EpochMs;
  updatedBy: "kid";
}

export interface SettingsMergeResult {
  /** additive `ChildSettings` patch to STAGE (applied at a calm boundary) */
  apply: Partial<ChildSettings>;
  /** the local prefs to push up, or null when the remote is newer/equal */
  pushUp: PreferencesPushUp | null;
}

/** Best-effort epoch-ms from a structural Ts / epoch number / absent. */
function toMillis(value: unknown): EpochMs | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (
    value !== null &&
    typeof value === "object" &&
    typeof (value as { toMillis?: unknown }).toMillis === "function"
  ) {
    try {
      const ms = (value as { toMillis: () => number }).toMillis();
      return Number.isFinite(ms) ? ms : null;
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * Merge a pulled `ChildSettingsDoc` against the local child settings.
 * Controls ALWAYS apply (parent-authoritative); preferences resolve by LWW on
 * `updatedAt` vs. the local profile's `updatedAt`.
 */
export function mergeSettings(
  local: ChildSettings,
  localUpdatedAtMs: EpochMs,
  remote: Partial<ChildSettingsDoc> | null,
): SettingsMergeResult {
  if (!remote) return { apply: {}, pushUp: null };
  const apply: Partial<ChildSettings> = {};

  // --- controls: parent-authoritative, pull-down only --------------------
  const controls = remote.controls;
  if (controls) {
    if (typeof controls.bloopEnabled === "boolean") apply.bloopEnabled = controls.bloopEnabled;
    if (typeof controls.inputMode === "string")
      apply.bloopInputMode = toInputMode(controls.inputMode);
    if (Array.isArray(controls.topicScope))
      apply.bloopTopicScope = controls.topicScope.filter((t): t is typeof t => typeof t === "string");
    if (controls.limits) apply.bloopLimits = { ...controls.limits };
    if (controls.retentionDays !== undefined)
      apply.retentionDays = coerceRetentionDays(controls.retentionDays);
    if (typeof controls.crisisLocale === "string") apply.crisisLocale = controls.crisisLocale;
  }

  // --- preferences: field-level LWW on updatedAt -------------------------
  const prefs = remote.preferences;
  const remoteMs = prefs ? toMillis(prefs.updatedAt) : null;
  let pushUp: PreferencesPushUp | null = null;
  if (prefs && remoteMs !== null && remoteMs > localUpdatedAtMs) {
    // remote is strictly newer → apply down (curated fields only)
    const sensory = prefs.sensory;
    if (sensory) {
      if (typeof sensory.soundEnabled === "boolean") apply.soundEnabled = sensory.soundEnabled;
      if (typeof sensory.hapticsEnabled === "boolean")
        apply.hapticsEnabled = sensory.hapticsEnabled;
      if (typeof sensory.lowStim === "boolean")
        apply.sensoryMode = sensory.lowStim ? "lowStim" : "standard";
      if (sensory.motionLevel === "reduced" || sensory.motionLevel === "off")
        apply.reducedMotion = true;
      else if (sensory.motionLevel === "full") apply.reducedMotion = false;
    }
  } else {
    // local is newer (or remote absent) → push the child's prefs up
    pushUp = {
      sensory: {
        soundEnabled: local.soundEnabled,
        hapticsEnabled: local.hapticsEnabled,
        lowStim: local.sensoryMode === "lowStim",
        motionLevel: local.reducedMotion ? "reduced" : "full",
      },
      updatedAtMs: localUpdatedAtMs,
      updatedBy: "kid",
    };
  }
  return { apply, pushUp };
}

// ---------------------------------------------------------------------------
// Staged pull + calm-boundary apply.
// ---------------------------------------------------------------------------

const staged = new Map<string, Partial<ChildSettings>>();

/** TEST/inspection seam: the currently staged patch for a local child. */
export function stagedSettingsPatch(cid: string): Partial<ChildSettings> | undefined {
  return staged.get(cid);
}

/**
 * Pull `children/{childId}/settings/current`, merge, STAGE the down-patch,
 * and push the child's newer preferences up. Fail-closed no-op when sync is
 * off/unpaired/unconfigured. Returns the merge result (for tests/telemetry).
 */
export async function pullSettings(cid: string): Promise<SettingsMergeResult | null> {
  try {
    const profile = useChildStore.getState().profiles[cid];
    const link = useSyncStore.getState().linkage[cid];
    if (!profile?.settings.cloudSyncEnabled || !link) return null;
    const ports = await getSyncPorts();
    if (!ports) return null;

    const remote = (await ports.firestore.getDoc(
      settingsDoc(link.childId),
    )) as Partial<ChildSettingsDoc> | null;
    const result = mergeSettings(profile.settings, profile.updatedAt, remote);

    if (Object.keys(result.apply).length > 0) {
      staged.set(cid, { ...(staged.get(cid) ?? {}), ...result.apply });
    }
    if (result.pushUp) {
      // Child prefs ride up under the preferences map ONLY — never controls.
      await ports.firestore.setDoc(
        settingsDoc(link.childId),
        {
          preferences: {
            sensory: result.pushUp.sensory,
            updatedAt: ports.firestore.tsFromMillis(result.pushUp.updatedAtMs),
            updatedBy: "kid",
          },
        },
        { merge: true },
      );
    }
    useSyncStore.getState().markPull(now());
    return result;
  } catch {
    return null; // silent — never an error surface for the child
  }
}

/**
 * Apply the staged patch at a CALM BOUNDARY (cold start / explicit settings
 * open). Returns true when something applied.
 */
export function applyStagedSettings(cid: string): boolean {
  const patch = staged.get(cid);
  if (!patch || Object.keys(patch).length === 0) return false;
  staged.delete(cid);
  useChildStore.getState().updateSettings(cid, patch);
  return true;
}
