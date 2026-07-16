/**
 * src/data/questPool.ts — the static quest library (novelty-refresh, M-C4).
 *
 * A curated, hand-authored pool: a BASE (free) rotation + PREMIUM/seasonal quests
 * (`packId` set) that award seasonal cosmetics. There is NO recommender / model /
 * personalization here — the weekly board is a deterministic hash-offset window
 * into this fixed pool (`activeQuestsFor`), so it is ZERO AI (novelty §5).
 *
 * Every quest carries a REQUIRED `spokenLabel` (non-reader support, novelty §7.8),
 * a FIXED `rewardTokens` (deterministic magnitude, never a chance drop), and — for
 * premium quests — a `rewardCosmeticId` from a registered seasonal pack. Copy is
 * warm/effort-framed and contains NO countdown/expiry/urgency string (grep-gated).
 *
 * Adding quests later is a pure DATA edit + a `SEED_VERSION` bump — NO
 * SCHEMA_VERSION migration (novelty §3.3).
 */
import type { QuestDef } from "../domain/types";

// Side-effect: register the year-round seasonal cosmetic packs the premium quests
// award, so `getSeasonalPacks()`/`visibleCosmetics()` see them wherever the quest
// system loads (gameplay, QuestBoard, rewards) — not only via the data barrel.
// Acyclic: seasonalPacks → buddyCosmetics; questPool imports neither's data.
import "./seasonalPacks";

// ---------------------------------------------------------------------------
// BASE (free) pool — real novelty for the free tier (novelty §8.3). `simple`
// quests are the young single-card kinds (popBubbles / customizeBuddy).
// ---------------------------------------------------------------------------
export const BASE_QUEST_POOL: QuestDef[] = [
  {
    id: "q_pop_5",
    label: { spokenLabel: "Pop five bubbles", text: "Pop 5 bubbles", emoji: "🫧", color: "#5BC8F5" },
    goalKind: "popBubbles",
    target: 5,
    rewardTokens: 3,
    simple: true,
  },
  {
    id: "q_pop_10",
    label: { spokenLabel: "Pop ten bubbles", text: "Pop 10 bubbles", emoji: "🫧", color: "#4ECDC4" },
    goalKind: "popBubbles",
    target: 10,
    rewardTokens: 5,
    simple: true,
  },
  {
    id: "q_pop_15",
    label: { spokenLabel: "Pop fifteen bubbles", text: "Pop 15 bubbles", emoji: "✨", color: "#7BD389" },
    goalKind: "popBubbles",
    target: 15,
    rewardTokens: 6,
    simple: true,
  },
  {
    id: "q_customize_2",
    label: { spokenLabel: "Give your buddy a new look", text: "Restyle your buddy", emoji: "🎨", color: "#FF8FB1" },
    goalKind: "customizeBuddy",
    target: 2,
    rewardTokens: 4,
    simple: true,
  },
  {
    id: "q_daypart_3",
    label: { spokenLabel: "Finish three routines", text: "Finish 3 routines", emoji: "🌈", color: "#9D8DF1" },
    goalKind: "completeDaypart",
    target: 3,
    rewardTokens: 5,
  },
  {
    id: "q_morning_2",
    label: { spokenLabel: "Finish two morning routines", text: "2 morning routines", emoji: "🌤", color: "#FFD166" },
    goalKind: "completeDaypart",
    daypart: "morning",
    target: 2,
    rewardTokens: 5,
  },
  {
    id: "q_unlock_1",
    label: { spokenLabel: "Unlock a new collectible", text: "Unlock a collectible", emoji: "🎁", color: "#FFB703" },
    goalKind: "unlockCosmetic",
    target: 1,
    rewardTokens: 4,
  },
  {
    id: "q_calm_2",
    label: { spokenLabel: "Visit the calm corner twice", text: "Visit calm 2 times", emoji: "🌊", color: "#56CFE1" },
    goalKind: "tryCalm",
    target: 2,
    rewardTokens: 4,
  },
];

// ---------------------------------------------------------------------------
// PREMIUM / seasonal pool — rotated in only when `noveltyPipeline` is unlocked
// (novelty §8.3). Each awards a seasonal cosmetic (registered in seasonalPacks.ts).
// ---------------------------------------------------------------------------
export const PREMIUM_QUEST_POOL: QuestDef[] = [
  {
    id: "q_spring_bloom",
    label: { spokenLabel: "Spring quest: pop twelve bubbles", text: "Spring: pop 12", emoji: "🌸", color: "#F7B7CE" },
    goalKind: "popBubbles",
    target: 12,
    rewardTokens: 6,
    rewardCosmeticId: "color_blossom_spring",
    packId: "spring_2026",
  },
  {
    id: "q_summer_sun",
    label: { spokenLabel: "Summer quest: finish four routines", text: "Summer: 4 routines", emoji: "🌞", color: "#FFD166" },
    goalKind: "completeDaypart",
    target: 4,
    rewardTokens: 6,
    rewardCosmeticId: "acc_sunhat",
    packId: "summer_2026",
  },
  {
    id: "q_autumn_leaves",
    label: { spokenLabel: "Autumn quest: unlock two collectibles", text: "Autumn: unlock 2", emoji: "🍂", color: "#E1873C" },
    goalKind: "unlockCosmetic",
    target: 2,
    rewardTokens: 6,
    rewardCosmeticId: "acc_leaf_pin",
    packId: "autumn_2026",
  },
  {
    id: "q_winter_frost",
    label: { spokenLabel: "Winter quest: pop twenty bubbles", text: "Winter: pop 20", emoji: "❄️", color: "#CFE8FB" },
    goalKind: "popBubbles",
    target: 20,
    rewardTokens: 7,
    rewardCosmeticId: "color_frost_winter",
    packId: "winter_2026",
  },
];

const QUEST_BY_ID: Record<string, QuestDef> = Object.fromEntries(
  [...BASE_QUEST_POOL, ...PREMIUM_QUEST_POOL].map((q) => [q.id, q]),
);

/** Look up any known quest def by id (base or premium). */
export function getQuestById(id: string): QuestDef | undefined {
  return QUEST_BY_ID[id];
}

export interface GetQuestPoolOptions {
  /** include the premium/seasonal quests (only when `noveltyPipeline` is unlocked) */
  premium: boolean;
  /** restrict to the simplest goal kinds for the young single-card mode */
  simpleOnly?: boolean;
}

/**
 * The eligible quest pool for a child: the base pool, plus the premium/seasonal
 * pool ONLY when premium is unlocked (acquisition-only — novelty §8.3), optionally
 * filtered to `simple` quests for the young mode. Deterministic ordering (base
 * first) so `activeQuestsFor` rotates a stable window.
 */
export function getQuestPool(opts: GetQuestPoolOptions): QuestDef[] {
  let pool = opts.premium ? [...BASE_QUEST_POOL, ...PREMIUM_QUEST_POOL] : [...BASE_QUEST_POOL];
  if (opts.simpleOnly) pool = pool.filter((q) => q.simple);
  return pool;
}
