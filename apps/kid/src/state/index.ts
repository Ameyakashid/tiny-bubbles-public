/**
 * src/state — Zustand stores + cross-store orchestration (doc 66 M4).
 *
 * Persisted stores (via src/storage/persist.ts): settings, children, tasks,
 * rewards, buddy, run-progress. In-memory: session. The pure domain logic
 * (src/domain) is wired to persisted state here; the `gameplay` orchestrator
 * composes the multi-slice player actions (create child, complete step,
 * redemption escrow).
 */
export * from "./ids";
export * from "./sessionStore";
export * from "./focusSessionStore";
export * from "./settingsStore";
export * from "./childStore";
export * from "./taskStore";
export * from "./rewardStore";
export * from "./buddyStore";
export * from "./runProgressStore";
export * from "./choreStore";
export * from "./questStore";
export * from "./planStore";
export * from "./syncStore";
export * from "./gameplay";
