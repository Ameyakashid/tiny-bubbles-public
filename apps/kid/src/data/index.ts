/**
 * src/data — starter seed library (doc 62 §14, doc 66 M4).
 *
 * Pure data + apply-once seeding helpers: 15 task templates, 3 routines, 8
 * rewards, 2 companions, and the cosmetics catalog with the additive-only
 * seasonal-pack seam. No badge engine (deferred from MVP — cosmetics only).
 */
export * from "./taskTemplates";
export * from "./choreTemplates";
export * from "./routinePresets";
export * from "./rewardPresets";
export * from "./buddyCosmetics";
// Registers the year-round seasonal cosmetic packs via `registerSeasonalPack` at
// module load (side-effect import first, so `getSeasonalPacks()` sees them) — the
// additive-only novelty pipeline (novelty-refresh, M-C4).
export * from "./seasonalPacks";
export * from "./questPool";
export * from "./focusBreaks";
export * from "./planTemplates";
export * from "./seed";
