/**
 * src/state/sessionStore.ts — IN-MEMORY session state (NOT persisted).
 *
 * Ephemeral, per-launch state that must NOT survive a force-quit (doc 66 M4/M5):
 *   - `parentUnlocked` — set true after passing the parental gate; cleared on
 *     app background (the kid must never inherit an unlocked parent zone).
 *   - `activeRunId` — the routine run currently on screen (the persisted
 *     resume-after-kill pointer lives in runProgressStore; this is just the UI
 *     handle for the live session).
 *
 * Intentionally created WITHOUT `persist` — it has no storage key.
 */
import { create } from "zustand";

/**
 * The most sensitive parent actions (clinician-reporting §2.3, M-D1). These MOVE
 * or DESTROY the whole family's data, so they demand the parent PIN (`mode:
 * 'sensitive'`), NOT merely the math/long-press entry challenge. The flow is:
 * settings sets `pendingSensitiveAction` + routes to the PIN gate; the gate, on a
 * correct PIN, stamps `sensitiveGrantAt`; settings then runs the pending action
 * exactly once and clears both.
 */
export type SensitiveAction = "backup" | "restore" | "deleteAll";

export interface SessionState {
  parentUnlocked: boolean;
  activeRunId: string | null;
  /** the sensitive action the parent intends to run once the PIN is entered */
  pendingSensitiveAction: SensitiveAction | null;
  /** stamped by the gate when the PIN passes for a `mode:'sensitive'` request */
  sensitiveGrantAt: number | null;
  unlockParent: () => void;
  lockParent: () => void;
  setActiveRun: (runId: string | null) => void;
  /** settings: record the intended sensitive action before routing to the PIN gate */
  requestSensitiveAction: (action: SensitiveAction) => void;
  /** gate: mark that the PIN passed for a sensitive request */
  grantSensitive: () => void;
  /** settings: clear the pending action + grant after running (or on cancel) */
  clearSensitive: () => void;
  reset: () => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  parentUnlocked: false,
  activeRunId: null,
  pendingSensitiveAction: null,
  sensitiveGrantAt: null,
  unlockParent: () => set({ parentUnlocked: true }),
  lockParent: () => set({ parentUnlocked: false }),
  setActiveRun: (activeRunId) => set({ activeRunId }),
  requestSensitiveAction: (pendingSensitiveAction) =>
    set({ pendingSensitiveAction, sensitiveGrantAt: null }),
  grantSensitive: () => set({ sensitiveGrantAt: Date.now() }),
  clearSensitive: () => set({ pendingSensitiveAction: null, sensitiveGrantAt: null }),
  reset: () =>
    set({
      parentUnlocked: false,
      activeRunId: null,
      pendingSensitiveAction: null,
      sensitiveGrantAt: null,
    }),
}));
