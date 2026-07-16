/**
 * src/data/buddyCosmetics.ts — starter companions + cosmetics + the additive-
 * only novelty seam (doc 62 §9/§14, doc 66 §5.11 / risk register).
 *
 * Cosmetics carry `rarity` (the rarity ladder) and an optional `seasonalPackId`.
 * The seasonal-pack registry is an ADDITIVE-ONLY seam: a future content drop
 * registers a new `SeasonalPack` via `registerSeasonalPack` — nothing earnable
 * ever disappears, expires, or becomes time-limited (no FOMO; doc 66 §5.11).
 *
 * NOTE: this is DATA only (no badges/achievements — those are deferred from MVP,
 * doc 66 §1b/§M4). The MVP ships cosmetics/collectibles, not a badge engine.
 */
import type { CompanionSeed, Cosmetic, SeasonalPack } from "../domain/types";

// ---------------------------------------------------------------------------
// Starter companions — 3 species (doc 62 §14 + aging-up §3.6): cuddly / cool /
// avatar. Art is selected by a resolved variant key from `companionStyle`, never
// `ageMode` (doc 66 §1b.7). `seedChild` picks the species by `style` — once the
// avatar seed exists, a preteen (or any avatar-style child) seeds Nova with no
// seed-logic change. Nova is still a NON-AI procedural pet, just identity-framed.
// ---------------------------------------------------------------------------

export const COMPANION_SEEDS: CompanionSeed[] = [
  {
    speciesId: "bloop",
    style: "cuddly",
    defaultName: "Bloop",
    label: { spokenLabel: "Bloop, your cuddly buddy", text: "Bloop", emoji: "🫧", color: "#5BC8F5" },
    defaultCustomization: { baseColor: "#5BC8F5", accentColor: "#FFD166", accessories: [] },
    starterCosmeticIds: ["color_reef", "color_blossom"],
  },
  {
    speciesId: "orbit",
    style: "cool",
    defaultName: "Orbit",
    label: { spokenLabel: "Orbit, your cosmic buddy", text: "Orbit", emoji: "🛸", color: "#6C9BD1" },
    defaultCustomization: { baseColor: "#6C9BD1", accentColor: "#A8E6CF", accessories: [] },
    starterCosmeticIds: ["color_tide", "color_ember"],
  },
  {
    speciesId: "nova",
    style: "avatar",
    defaultName: "Nova",
    label: { spokenLabel: "Nova, your avatar", text: "Nova", emoji: "🌌", color: "#9D8DF1" },
    defaultCustomization: { baseColor: "#9D8DF1", accentColor: "#7FE3C0", accessories: [] },
    starterCosmeticIds: ["color_tide", "color_grape"],
  },
];

export const COMPANION_SEEDS_BY_SPECIES: Record<string, CompanionSeed> = Object.fromEntries(
  COMPANION_SEEDS.map((c) => [c.speciesId, c]),
);

// ---------------------------------------------------------------------------
// Base cosmetics pack. Two FREE colors per the spec; the rest are token- or
// premium-gated ACQUISITION (premium never affects RETENTION — doc 66 §1b.11).
// ---------------------------------------------------------------------------

function color(
  id: string,
  spokenLabel: string,
  value: string,
  rarity: Cosmetic["rarity"],
  unlockCost: number,
  premium = false,
): Cosmetic {
  return {
    id,
    slot: "color",
    label: { spokenLabel, text: spokenLabel, color: value },
    rarity,
    unlockCost,
    premium,
    value,
  };
}

/**
 * A surface FINISH for the bubble body (doc 61 §6.2). `value` carries the
 * BubbleBuddy `BuddyFinish` key the renderer reads ("plain"|"sparkle"|...).
 */
function finish(
  id: string,
  spokenLabel: string,
  value: string,
  rarity: Cosmetic["rarity"],
  unlockCost: number,
  premium = false,
): Cosmetic {
  return {
    id,
    slot: "finish",
    label: { spokenLabel, text: spokenLabel, color: "#7FCDE6" },
    rarity,
    unlockCost,
    premium,
    value,
  };
}

/** A curated head ACCESSORY (doc 61 §6.2), emoji-backed (matches task pictures). */
function accessory(
  id: string,
  spokenLabel: string,
  emoji: string,
  rarity: Cosmetic["rarity"],
  unlockCost: number,
  premium = false,
): Cosmetic {
  return {
    id,
    slot: "accessory",
    label: { spokenLabel, text: spokenLabel, emoji, color: "#FFB703" },
    rarity,
    unlockCost,
    premium,
    value: emoji,
  };
}

export const BASE_COSMETICS: Cosmetic[] = [
  // Free starter colors (unlockCost 0).
  color("color_reef", "Reef blue", "#5BC8F5", "common", 0),
  color("color_blossom", "Blossom pink", "#FF8FB1", "common", 0),
  color("color_tide", "Tide teal", "#4ECDC4", "common", 0),
  color("color_ember", "Ember orange", "#FFB703", "common", 0),
  // Token-unlockable.
  color("color_meadow", "Meadow green", "#7BD389", "uncommon", 15),
  color("color_grape", "Grape purple", "#9D8DF1", "uncommon", 20),
  color("color_sunbeam", "Sunbeam gold", "#FFD166", "rare", 35),
  // Premium-gated acquisition (owned forever once unlocked).
  color("color_aurora", "Aurora shimmer", "#B5179E", "epic", 0, true),

  // Finishes — the bubble's surface treatment (slot 'finish'). 'plain' is free.
  finish("finish_plain", "Plain bubble", "plain", "common", 0),
  finish("finish_sparkle", "Sparkle finish", "sparkle", "uncommon", 20),
  finish("finish_glass", "Glassy finish", "glass", "rare", 35),
  finish("finish_galaxy", "Galaxy finish", "galaxy", "epic", 0, true), // premium acquisition

  // Head accessories (curated). One free starter; the rest token-unlockable.
  accessory("acc_bow", "Bow", "🎀", "common", 0),
  accessory("acc_snorkel", "Snorkel", "🤿", "uncommon", 18),
  accessory("acc_headphones", "Headphones", "🎧", "uncommon", 22),
  accessory("acc_crown", "Crown", "👑", "rare", 45),
  // Legacy hat/background entries (kept for slot coverage; hats render like accessories).
  {
    id: "hat_party",
    slot: "hat",
    label: { spokenLabel: "Party hat", text: "Party hat", emoji: "🎉", color: "#FF6B6B" },
    rarity: "uncommon",
    unlockCost: 18,
    premium: false,
    value: "🎉",
  },
  {
    id: "bg_underwater",
    slot: "background",
    label: { spokenLabel: "Underwater scene", text: "Underwater", emoji: "🐠", color: "#56CFE1" },
    rarity: "rare",
    unlockCost: 40,
    premium: false,
  },
];

// ---------------------------------------------------------------------------
// Seasonal packs — the additive-only novelty seam. A sample pack ships as a
// DATA SHAPE demonstration; registering more is the only way content grows.
// ---------------------------------------------------------------------------

const SAMPLE_SEASONAL_COSMETICS: Cosmetic[] = [
  color("color_snowdrift", "Snowdrift white", "#EAF4FB", "rare", 30, false),
  {
    id: "hat_beanie",
    slot: "hat",
    label: { spokenLabel: "Cozy beanie", text: "Beanie", emoji: "🧢", color: "#6C9BD1" },
    rarity: "uncommon",
    unlockCost: 22,
    premium: false,
    seasonalPackId: "winter_v1",
  },
];

export const SAMPLE_SEASONAL_PACK: SeasonalPack = {
  id: "winter_v1",
  label: { spokenLabel: "Winter pack", text: "Winter", emoji: "❄️", color: "#EAF4FB" },
  cosmeticIds: SAMPLE_SEASONAL_COSMETICS.map((c) => c.id),
};

// ---------------------------------------------------------------------------
// Registry + seed hook (additive-only). Registering a pack ADDS cosmetics; there
// is no unregister/expire path by design (doc 66 §5.11).
// ---------------------------------------------------------------------------

const cosmeticRegistry = new Map<string, Cosmetic>(
  [...BASE_COSMETICS, ...SAMPLE_SEASONAL_COSMETICS].map((c) => [c.id, c]),
);
const seasonalPackRegistry = new Map<string, SeasonalPack>([
  [SAMPLE_SEASONAL_PACK.id, SAMPLE_SEASONAL_PACK],
]);

/**
 * The additive-only seed hook: register a new seasonal pack + its cosmetics.
 * Existing cosmetics are NEVER removed or overwritten with a removal — this is
 * the novelty-rotation seam, additive only (doc 66 §5.11). Re-registering an id
 * is a no-op for already-present cosmetics.
 */
export function registerSeasonalPack(pack: SeasonalPack, cosmetics: Cosmetic[]): void {
  seasonalPackRegistry.set(pack.id, pack);
  for (const c of cosmetics) {
    if (!cosmeticRegistry.has(c.id)) cosmeticRegistry.set(c.id, c);
  }
}

/** Every cosmetic known right now (base + all registered seasonal packs). */
export function getAllCosmetics(): Cosmetic[] {
  return [...cosmeticRegistry.values()];
}

export function getCosmetic(id: string): Cosmetic | undefined {
  return cosmeticRegistry.get(id);
}

/** Cosmetics visible at `now` (a pack with a future `availableFrom` is hidden). */
export function visibleCosmetics(now: number): Cosmetic[] {
  const hidden = new Set<string>();
  for (const pack of seasonalPackRegistry.values()) {
    if (pack.availableFrom !== undefined && now < pack.availableFrom) {
      for (const id of pack.cosmeticIds) hidden.add(id);
    }
  }
  return getAllCosmetics().filter((c) => !hidden.has(c.id));
}

export function getSeasonalPacks(): SeasonalPack[] {
  return [...seasonalPackRegistry.values()];
}
