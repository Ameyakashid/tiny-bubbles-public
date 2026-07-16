/**
 * src/services/entitlements.ts — premium feature gating (doc 66 §M12, §1b.11).
 *
 * The single source of truth for WHAT premium unlocks and the selectors/hooks
 * that read the current entitlement. The hard anti-shame rule (doc 66 §1b.11 /
 * §5.7) lives here in spirit and is enforced by `<PremiumGate>`:
 *
 *   Gating blocks NEW unlocks ONLY. Flipping `isPremium()` to false NEVER
 *   removes, hides, unequips, greys, or alters anything the child already owns
 *   or sees. `FEATURE_GATES` describes ACQUISITION ceilings, never retention.
 *
 * NEVER-GATED (free tier runs the full core loop): the entire task→celebrate→
 * token→nurture→redeem loop, plus ageMode, companionStyle, sensoryMode,
 * reduced-motion, calm mode, reminders, and everything a child has unlocked.
 * Those axes are accessibility/safety, not monetization — they are not listed
 * here and must never be wrapped in a `<PremiumGate>`.
 */
import type { Entitlement } from "../domain/types";
import { isPremium, useSettingsStore } from "../state/settingsStore";

export { isPremium };

/**
 * The hard ceiling on the curated reward menu (doc 66 §1b.11 + age fix #27).
 * NEVER `'unlimited'` — curated autonomy caps the menu at 6 regardless of tier.
 */
export const CURATED_REWARD_CEILING = 6;

/** A countable acquisition ceiling: how many of a thing each tier may add. */
export interface CountGate {
  kind: "count";
  free: number;
  premium: number;
}

/** A boolean acquisition unlock: the whole feature is free or premium-only. */
export interface FlagGate {
  kind: "flag";
  free: boolean;
}

export type FeatureGate = CountGate | FlagGate;

/**
 * FEATURE_GATES — the acquisition matrix (doc 66 §M12).
 *
 * Counts are ACQUISITION ceilings (how many you may CREATE/ACQUIRE), never
 * retention floors. `rewardMenuSize.premium` is pinned to the curated ceiling
 * 6 — there is intentionally no `'unlimited'` anywhere in this file.
 */
export const FEATURE_GATES = {
  /** Number of child profiles. Free runs the full loop for one child. */
  multiChild: { kind: "count", free: 1, premium: 8 },
  /**
   * How many rewards a parent may keep ACTIVE in a child's menu. Capped at the
   * curated ceiling (6) on premium — NEVER unlimited (doc 66 §1b.11).
   */
  rewardMenuSize: { kind: "count", free: 3, premium: CURATED_REWARD_CEILING },
  /**
   * Companion theme/cosmetic ACQUISITION slots (premium colors/finishes/scenes).
   * Free can acquire 2; premium unlocks the rest. ACQUISITION ONLY — anything
   * already owned stays owned forever even after a downgrade (doc 66 §1b.11).
   */
  companionThemes: { kind: "count", free: 2, premium: 24 },
  /** The seasonal/novelty cosmetic rotation pipeline. */
  noveltyPipeline: { kind: "flag", free: false },
  /** The premium calm-mode ambient soundscape pack. */
  calmSoundscape: { kind: "flag", free: false },
  /** On-device advanced insights (still never leaves the device, doc 66 §1b.12). */
  advancedInsights: { kind: "flag", free: false },
  /**
   * If-then "when X, I will Y" plans (#21; consumed by M-C5). ACQUISITION ceiling
   * only: FIRING is NEVER gated (a downgraded parent's already-authored plans keep
   * firing) — only the ADD control for the 3rd–8th plan shows the calm upsell.
   * A finite premium ceiling of 8 (curated-autonomy honest scarcity, never
   * unbounded — billing-entitlements §3.4).
   */
  ifThenPlans: { kind: "count", free: 2, premium: 8 },
} as const satisfies Record<string, FeatureGate>;

export type FeatureKey = keyof typeof FEATURE_GATES;

// Compile-time guard: rewardMenuSize.premium can never exceed the curated
// ceiling, and is never the string 'unlimited'. (If someone bumps it past 6 the
// type below errors.)
type _AssertRewardCeiling =
  typeof FEATURE_GATES.rewardMenuSize.premium extends 6 ? true : never;
const _rewardCeilingOk: _AssertRewardCeiling = true;
void _rewardCeilingOk;

/**
 * The ACQUISITION limit for a counted feature at the current entitlement.
 * Premium (paid or live trial) gets the premium count; otherwise the free count.
 * This is what `<PremiumGate>` / add-buttons check before allowing a NEW item.
 */
export function featureLimit(
  feature: Extract<FeatureKey, keyof typeof FEATURE_GATES>,
  entitlement: Entitlement,
  ts?: number,
): number {
  const gate = FEATURE_GATES[feature] as FeatureGate;
  if (gate.kind !== "count") {
    // flag features are 0/1 — count an unlocked flag as 1
    return isPremium(entitlement, ts) ? 1 : gate.free ? 1 : 0;
  }
  return isPremium(entitlement, ts) ? gate.premium : gate.free;
}

/**
 * Whether a flag-style feature is unlocked at the current entitlement. Free-flag
 * features are always unlocked; premium-flag features need premium/trial.
 */
export function isFeatureUnlocked(
  feature: FeatureKey,
  entitlement: Entitlement,
  ts?: number,
): boolean {
  const gate = FEATURE_GATES[feature] as FeatureGate;
  if (gate.kind === "flag") return gate.free || isPremium(entitlement, ts);
  // a counted feature is "unlocked" past the free tier only when premium grants
  // a strictly larger ceiling.
  return isPremium(entitlement, ts) ? gate.premium > gate.free : false;
}

/**
 * Whether adding ONE more item (given how many already exist) is permitted at
 * the current entitlement — the canonical add-button gate. Returns `false` ONLY
 * when blocked by the acquisition ceiling; it can never ask the caller to remove
 * anything (retention is untouched — doc 66 §1b.11).
 */
export function canAddMore(
  feature: Extract<
    FeatureKey,
    "multiChild" | "rewardMenuSize" | "companionThemes" | "ifThenPlans"
  >,
  currentCount: number,
  entitlement: Entitlement,
  ts?: number,
): boolean {
  return currentCount < featureLimit(feature, entitlement, ts);
}

// ---------------------------------------------------------------------------
// Selectors / hooks.
// ---------------------------------------------------------------------------

/** The live entitlement record (mock paywall — no processor). */
export function useEntitlements(): Entitlement {
  return useSettingsStore((s) => s.entitlement);
}

/** `true` when the child is premium — paid OR inside the honest live trial. */
export function useIsPremium(): boolean {
  const entitlement = useSettingsStore((s) => s.entitlement);
  return isPremium(entitlement);
}

/** Reactive acquisition limit for a counted feature (re-renders on tier flip). */
export function useFeatureLimit(
  feature: Extract<FeatureKey, keyof typeof FEATURE_GATES>,
): number {
  const entitlement = useSettingsStore((s) => s.entitlement);
  return featureLimit(feature, entitlement);
}
