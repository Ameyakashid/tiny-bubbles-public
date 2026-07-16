/**
 * src/domain — public surface of the pure, RN-free domain logic (doc 66 M4).
 *
 * Everything here is unit-testable with no device: deterministic, side-effect-
 * free, and free of any randomized (RNG) payout path (doc 66 §5.4). The stores
 * (src/state) wire these functions to persisted state; components never call
 * them directly.
 */
export * from "./types";
export * from "./constants";
export * from "./dates";
export * from "./gamification";
export * from "./reinforcement";
export * from "./streaks";
export * from "./companionMood";
export * from "./tasks";
export * from "./chores";
export * from "./tokens";
export * from "./progressMeter";
export * from "./moodInsight";
export * from "./breathing";
export * from "./focus";
export * from "./quests";
export * from "./novelty";
export * from "./plans";
