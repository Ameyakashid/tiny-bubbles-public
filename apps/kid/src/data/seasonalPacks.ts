/**
 * src/data/seasonalPacks.ts — the year-round seasonal cosmetic packs (novelty-
 * refresh, M-C4). Registered ONCE at module load via the existing additive-only
 * `registerSeasonalPack` seam (`buddyCosmetics.ts`); imported once from
 * `src/data/index.ts` so the packs are known app-wide.
 *
 * ADDITIVE-ONLY / NO FOMO (novelty §7.1): every pack carries an `availableFrom`
 * (when it APPEARS across the calendar) and STRUCTURALLY no `availableUntil` — the
 * `SeasonalPack` type has no expiry field, so content only ever appears, never
 * disappears. `visibleCosmetics(now)` hides a pack until its date passes; after
 * that it is permanent. The dates below are TUNABLE PLACEHOLDER data (novelty
 * §10.4) — product/design finalize the real cadence + art; additive-only is fixed.
 *
 * PREMIUM ACQUISITION (novelty §8.3): seasonal cosmetics are `premium: true` (the
 * paid novelty pipeline, `noveltyPipeline` gate). Premium is ACQUISITION-only —
 * anything a child already owns stays owned forever after a downgrade (§8.3).
 * Bundling more packs later is a pure DATA edit + a `SEED_VERSION` bump; NO
 * SCHEMA_VERSION migration (novelty §3.3).
 */
import type { Cosmetic, SeasonalPack } from "../domain/types";

import { registerSeasonalPack } from "./buddyCosmetics";

/** A seasonal color cosmetic (premium acquisition, tagged with its pack). */
function seasonalColor(id: string, spokenLabel: string, value: string, packId: string): Cosmetic {
  return {
    id,
    slot: "color",
    label: { spokenLabel, text: spokenLabel, color: value },
    rarity: "rare",
    unlockCost: 0,
    premium: true,
    seasonalPackId: packId,
    value,
  };
}

/** A seasonal head-accessory cosmetic (premium acquisition, tagged with its pack). */
function seasonalAccessory(
  id: string,
  spokenLabel: string,
  emoji: string,
  packId: string,
): Cosmetic {
  return {
    id,
    slot: "accessory",
    label: { spokenLabel, text: spokenLabel, emoji, color: "#FFB703" },
    rarity: "epic",
    unlockCost: 0,
    premium: true,
    seasonalPackId: packId,
    value: emoji,
  };
}

/**
 * Season boundaries as fixed epoch ms (UTC midnight). Placeholder cadence — the
 * point is that packs APPEAR across the year (some are still `availableFrom`-hidden
 * on any given day) and NONE ever expire.
 */
const SPRING_FROM = Date.UTC(2026, 2, 20); // ~Mar 20
const SUMMER_FROM = Date.UTC(2026, 5, 21); // ~Jun 21
const AUTUMN_FROM = Date.UTC(2026, 8, 22); // ~Sep 22
const WINTER_FROM = Date.UTC(2026, 11, 21); // ~Dec 21

interface SeasonalPackBundle {
  pack: SeasonalPack;
  cosmetics: Cosmetic[];
}

function bundle(
  id: string,
  spokenLabel: string,
  text: string,
  emoji: string,
  color: string,
  availableFrom: number,
  cosmetics: Cosmetic[],
): SeasonalPackBundle {
  return {
    pack: {
      id,
      label: { spokenLabel, text, emoji, color },
      availableFrom,
      cosmeticIds: cosmetics.map((c) => c.id),
    },
    cosmetics,
  };
}

/**
 * The bundled seasonal packs. Each ADDS cosmetics that appear on `availableFrom`
 * and never expire. Exported for the parent cadence readout + tests.
 */
export const SEASONAL_PACK_BUNDLES: SeasonalPackBundle[] = [
  bundle("spring_2026", "Spring pack", "Spring", "🌸", "#F7B7CE", SPRING_FROM, [
    seasonalColor("color_blossom_spring", "Blossom bloom", "#F7B7CE", "spring_2026"),
    seasonalAccessory("acc_flower_crown", "Flower crown", "🌷", "spring_2026"),
  ]),
  bundle("summer_2026", "Summer pack", "Summer", "🌞", "#FFD166", SUMMER_FROM, [
    seasonalColor("color_sunwave_summer", "Sunwave gold", "#FFD166", "summer_2026"),
    seasonalAccessory("acc_sunhat", "Sun hat", "👒", "summer_2026"),
  ]),
  bundle("autumn_2026", "Autumn pack", "Autumn", "🍂", "#E1873C", AUTUMN_FROM, [
    seasonalColor("color_maple_autumn", "Maple amber", "#E1873C", "autumn_2026"),
    seasonalAccessory("acc_leaf_pin", "Leaf pin", "🍁", "autumn_2026"),
  ]),
  bundle("winter_2026", "Winter frost pack", "Winter frost", "❄️", "#CFE8FB", WINTER_FROM, [
    seasonalColor("color_frost_winter", "Frostlight blue", "#CFE8FB", "winter_2026"),
    seasonalAccessory("acc_earmuffs", "Earmuffs", "🎧", "winter_2026"),
  ]),
];

// Register every bundled pack at module load (additive-only; re-registering an id
// is a no-op for already-present cosmetics — buddyCosmetics `registerSeasonalPack`).
for (const { pack, cosmetics } of SEASONAL_PACK_BUNDLES) {
  registerSeasonalPack(pack, cosmetics);
}
