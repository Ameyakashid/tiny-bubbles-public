/**
 * M12 entitlement + paywall gating (doc 66 §M12, §1b.11, §1b.13).
 *
 * Proves: the mock purchase opens an honest 7-day trial and cancel reverts; the
 * FEATURE_GATES acquisition matrix (rewardMenuSize pinned to the curated ceiling
 * 6, never "unlimited"); and — the load-bearing anti-shame invariant — that a
 * trial expiry / downgrade with PREMIUM COSMETICS EQUIPPED produces ZERO visible
 * change to the buddy (nothing unequipped, hidden, or removed). Gating blocks NEW
 * unlocks only; retention is untouched.
 */
import { beforeEach, describe, expect, it } from "@jest/globals";

import {
  ONE_DAY_MS,
  PREMIUM_TRIAL_MS,
  defaultEntitlement,
} from "../../src/domain/constants";
import type { Entitlement } from "../../src/domain/types";
import {
  CURATED_REWARD_CEILING,
  FEATURE_GATES,
  canAddMore,
  featureLimit,
  isFeatureUnlocked,
  isPremium,
} from "../../src/services/entitlements";
import { repairEntitlement } from "../../src/storage/migrations";
import { PLANS, mockCancel, mockPurchase, trialEndsAtFor } from "../../src/services/purchases";
import { useBuddyStore } from "../../src/state/buddyStore";
import { useChildStore } from "../../src/state/childStore";
import { createChildWithSeed } from "../../src/state/gameplay";
import { now } from "../../src/state/ids";
import { useRewardStore } from "../../src/state/rewardStore";
import { useRunProgressStore } from "../../src/state/runProgressStore";
import { useSettingsStore } from "../../src/state/settingsStore";
import { useTaskStore } from "../../src/state/taskStore";

const ent = () => useSettingsStore.getState().entitlement;

beforeEach(() => {
  useChildStore.setState({
    index: [],
    profiles: {},
    ledgers: {},
    progress: {},
    reinforcement: {},
    moods: {},
    events: {},
    seed: { seedVersion: 1, appliedPacks: [], perChildSeeded: [] },
  });
  useTaskStore.setState({ tasks: {}, routines: {}, runs: {}, lastRolloverDay: {} });
  useRewardStore.setState({ rewards: {}, redemptions: {} });
  useBuddyStore.setState({ companions: {} });
  useRunProgressStore.setState({ active: {} });
  useSettingsStore.setState({ entitlement: defaultEntitlement(now()) });
});

describe("mock purchase / cancel (no processor, no network)", () => {
  it("mockPurchase opens an honest 7-day trial; mockCancel reverts", () => {
    expect(isPremium(ent())).toBe(false);

    const t0 = now();
    mockPurchase("annual");

    const e = ent();
    expect(e.tier).toBe("premium");
    expect(e.source).toBe("trial");
    expect(isPremium(e)).toBe(true);
    // honest end-date ~ now + 7 days (allow a little clock drift in the test).
    expect(e.trialEndsAt).toBeDefined();
    expect(Math.abs((e.trialEndsAt ?? 0) - (t0 + PREMIUM_TRIAL_MS))).toBeLessThan(5000);
    expect(e.mockPurchases).toHaveLength(1);
    expect(e.mockPurchases[0].plan).toBe("annual");

    mockCancel();
    const after = ent();
    expect(after.tier).toBe("free");
    expect(after.source).toBe("none");
    expect(after.trialEndsAt).toBeUndefined();
    expect(isPremium(after)).toBe(false);
  });

  it("every advertised plan is purchasable and a hardship/pay-what-you-can plan exists", () => {
    expect(PLANS.some((p) => p.hardship)).toBe(true);
    for (const p of PLANS) {
      useSettingsStore.setState({ entitlement: defaultEntitlement(now()) });
      mockPurchase(p.id);
      expect(isPremium(ent())).toBe(true);
    }
  });

  it("trialEndsAtFor previews an honest 7-day end-date", () => {
    const at = 1_700_000_000_000;
    expect(trialEndsAtFor(at)).toBe(at + PREMIUM_TRIAL_MS);
  });
});

describe("FEATURE_GATES acquisition matrix", () => {
  it("rewardMenuSize is capped at the curated ceiling 6 — never unlimited", () => {
    expect(FEATURE_GATES.rewardMenuSize.premium).toBe(6);
    expect(CURATED_REWARD_CEILING).toBe(6);
    // no gate anywhere is the string 'unlimited'
    for (const gate of Object.values(FEATURE_GATES)) {
      expect(JSON.stringify(gate)).not.toContain("unlimited");
    }
  });

  it("multiChild is free=1, gated above that until premium", () => {
    const free = defaultEntitlement(now());
    expect(featureLimit("multiChild", free)).toBe(1);
    expect(canAddMore("multiChild", 0, free)).toBe(true);
    expect(canAddMore("multiChild", 1, free)).toBe(false);

    mockPurchase("monthly");
    expect(featureLimit("multiChild", ent())).toBeGreaterThan(1);
    expect(canAddMore("multiChild", 1, ent())).toBe(true);
  });

  it("rotating shared chores have NO separate gate — free once ≥2 children (multi-child §8)", () => {
    // Rotation is gated ONLY transitively by the multiChild child-count ceiling; there
    // is intentionally no `chore`/`rotation` gate key (keeps the paywall one-axis honest).
    const keys = Object.keys(FEATURE_GATES);
    expect(keys.some((k) => /chore|rotat/i.test(k))).toBe(false);
    // Adding the SECOND child (which unlocks rotation) is still the multiChild gate.
    const free = defaultEntitlement(now());
    expect(canAddMore("multiChild", 1, free)).toBe(false);
    mockPurchase("annual");
    expect(canAddMore("multiChild", 1, ent())).toBe(true);
  });

  it("companionThemes gate is acquisition-only (free=2, premium more)", () => {
    const free = defaultEntitlement(now());
    expect(featureLimit("companionThemes", free)).toBe(2);
    mockPurchase("annual");
    expect(featureLimit("companionThemes", ent())).toBeGreaterThan(2);
  });

  it("ifThenPlans is a count gate free=2 / premium=8 (never unlimited); firing never gated", () => {
    // The one classification change M-A1 introduces (M-C5 hard-depends on it).
    expect(FEATURE_GATES.ifThenPlans).toEqual({ kind: "count", free: 2, premium: 8 });

    const free = defaultEntitlement(now());
    expect(featureLimit("ifThenPlans", free)).toBe(2);
    // the 3rd free plan's ADD control is blocked; the first 2 are allowed.
    expect(canAddMore("ifThenPlans", 1, free)).toBe(true);
    expect(canAddMore("ifThenPlans", 2, free)).toBe(false);
    // premium raises the ceiling to 8 (still a finite curated ceiling).
    mockPurchase("annual");
    expect(featureLimit("ifThenPlans", ent())).toBe(8);
    expect(canAddMore("ifThenPlans", 2, ent())).toBe(true);
    expect(canAddMore("ifThenPlans", 8, ent())).toBe(false);
    expect(isFeatureUnlocked("ifThenPlans", ent())).toBe(true);
  });
});

describe("trial expiry with premium cosmetics EQUIPPED → zero visible change (doc 66 §1b.11)", () => {
  it("nothing the child owns or has equipped is removed, hidden, or unequipped", () => {
    const cid = createChildWithSeed({ displayName: "Remy", ageMode: "older", timeZone: "UTC" });

    // Go premium, then acquire + EQUIP premium cosmetics (acquisition only).
    mockPurchase("annual");
    expect(isPremium(ent())).toBe(true);

    const buddy = useBuddyStore.getState();
    buddy.unlockCosmetic(cid, "color_aurora"); // premium color
    buddy.unlockCosmetic(cid, "finish_galaxy"); // premium finish
    buddy.unlockCosmetic(cid, "hat_party");
    buddy.setCustomization(cid, { baseColor: "#B5179E", finish: "galaxy" });
    buddy.equip(cid, "hatId", "hat_party");
    buddy.equip(cid, "backgroundId", "bg_underwater");

    // Snapshot the EXACT buddy the child sees right now.
    const before = useBuddyStore.getState().companions[cid];
    const snapshot = JSON.parse(JSON.stringify(before));

    // Simulate trial EXPIRY / downgrade (no conversion): entitlement reverts to a
    // non-premium, expired-trial state in the past.
    const past = now() - PREMIUM_TRIAL_MS - 1000;
    const expired: Entitlement = {
      tier: "free",
      source: "none",
      trialStartedAt: past - PREMIUM_TRIAL_MS,
      trialEndsAt: past,
      mockPurchases: ent().mockPurchases,
      updatedAt: now(),
    };
    useSettingsStore.setState({ entitlement: expired });

    // Acquisition is now LOCKED (no new premium unlocks)...
    expect(isPremium(ent())).toBe(false);
    expect(canAddMore("companionThemes", 2, ent())).toBe(false);

    // ...but RETENTION is completely untouched — ZERO visible change to the buddy.
    const after = useBuddyStore.getState().companions[cid];
    expect(after).toEqual(snapshot);
    expect(after.unlockedItems).toEqual(snapshot.unlockedItems);
    expect(after.unlockedItems).toContain("color_aurora");
    expect(after.unlockedItems).toContain("finish_galaxy");
    expect(after.customization.finish).toBe("galaxy");
    expect(after.customization.baseColor).toBe("#B5179E");
    expect(after.equipped.hatId).toBe("hat_party");
    expect(after.equipped.backgroundId).toBe("bg_underwater");
  });
});

describe("trialEndReminderAt marker (billing §3.1)", () => {
  it("is set to trialEndsAt − 1 day on mock purchase and cleared on cancel", () => {
    mockPurchase("annual");
    const e = ent();
    expect(e.trialEndsAt).toBeDefined();
    expect(e.trialEndReminderAt).toBe((e.trialEndsAt as number) - ONE_DAY_MS);

    mockCancel();
    expect(ent().trialEndReminderAt).toBeUndefined();
  });

  it("never affects isPremium() (it is a debug/idempotency marker only)", () => {
    const e = defaultEntitlement(now());
    expect(isPremium({ ...e, trialEndReminderAt: now() })).toBe(false);
  });
});

describe("repairEntitlement coherence (billing §3.3)", () => {
  const NOW = 1_700_000_000_000;

  it("coerces a corrupt 'premium with no basis' DOWN to free (never raises)", () => {
    const corrupt = {
      tier: "premium",
      source: "none",
      trialEndsAt: NOW - 1000, // expired
      mockPurchases: [{ id: "x", sku: "s", mockedAt: 1, plan: "annual", priceShown: "$1" }],
      updatedAt: 1,
    };
    const out = repairEntitlement(corrupt, NOW);
    expect(out.tier).toBe("free");
    expect(out.trialEndsAt).toBeUndefined();
    expect(out.premiumSince).toBeUndefined();
    // real purchase history is NEVER deleted.
    expect(Array.isArray(out.mockPurchases)).toBe(true);
    expect((out.mockPurchases as unknown[]).length).toBe(1);
  });

  it("coerces a corrupt mockPurchases to an array without touching a valid record", () => {
    const out = repairEntitlement(
      { tier: "free", source: "none", mockPurchases: "oops", updatedAt: 1 },
      NOW,
    );
    expect(out.mockPurchases).toEqual([]);
  });

  it("does NOT demote a live trial or a properly-based premium", () => {
    const liveTrial = repairEntitlement(
      { tier: "premium", source: "trial", trialEndsAt: NOW + ONE_DAY_MS, mockPurchases: [], updatedAt: 1 },
      NOW,
    );
    expect(liveTrial.tier).toBe("premium");

    const paid = repairEntitlement(
      { tier: "premium", source: "none", premiumSince: NOW - 1000, mockPurchases: [], updatedAt: 1 },
      NOW,
    );
    expect(paid.tier).toBe("premium");
  });

  it("touches only the billing record — never a companion's owned cosmetics", () => {
    const cid = createChildWithSeed({ displayName: "Remy", ageMode: "older", timeZone: "UTC" });
    const buddy = useBuddyStore.getState();
    buddy.unlockCosmetic(cid, "color_aurora");
    buddy.equip(cid, "hatId", "hat_party");
    const before = JSON.parse(JSON.stringify(useBuddyStore.getState().companions[cid]));

    // repair a corrupt premium-with-no-basis entitlement…
    repairEntitlement({ tier: "premium", source: "none", mockPurchases: [], updatedAt: 1 }, NOW);

    // …the buddy the child sees is byte-identical (cosmetics live in buddyStore).
    expect(useBuddyStore.getState().companions[cid]).toEqual(before);
    expect(before.unlockedItems).toContain("color_aurora");
  });
});
