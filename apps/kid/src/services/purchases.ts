/**
 * src/services/purchases.ts — the MOCK purchase service (doc 66 §M12).
 *
 * *** NO real payment processor. NO network. NO StoreKit/Billing. ***
 * Everything here mutates LOCAL entitlement state only. A mock subscribe opens
 * an honest, clearly-surfaced 7-day trial; one tap cancels it. This is the seam
 * a real processor would later slot into — see the `// TODO: wire RevenueCat`
 * markers below. Until then, `mockPurchase`/`mockCancel` are the whole story.
 *
 * The purchase route is reachable ONLY behind the parent-set PIN gate (doc 66
 * §1b.13) and a child NEVER sees a paywall (doc 66 §5.7). This module enforces
 * neither (those are routing/UI concerns) — it only flips local entitlement.
 */
import { PREMIUM_TRIAL_DAYS, PREMIUM_TRIAL_MS } from "../domain/constants";
import { useSettingsStore } from "../state/settingsStore";

export { PREMIUM_TRIAL_DAYS, PREMIUM_TRIAL_MS };

export type PlanId = "monthly" | "annual" | "hardship";

export interface PurchasePlan {
  id: PlanId;
  /** the store SKU a real processor would charge (display/seam only here) */
  sku: string;
  title: string;
  /** honest, human price string — shown verbatim, no fake "was $X" anchor */
  priceShown: string;
  /** a short, non-urgent sub-label */
  cadence: string;
  /** pay-what-you-can / hardship affordances are first-class, not buried */
  hardship?: boolean;
}

/**
 * The plan catalog. Honest prices, no countdown, no "limited time", no anchor
 * pricing. The hardship plan is visible and pay-what-you-can — never gated
 * behind a "contact us" wall (doc 66 §M12 anti-dark-pattern).
 */
export const PLANS: readonly PurchasePlan[] = [
  {
    id: "annual",
    sku: "tinybubbles.plus.annual",
    title: "Yearly",
    priceShown: "$29.99 / year",
    cadence: "Works out to $2.50 a month.",
  },
  {
    id: "monthly",
    sku: "tinybubbles.plus.monthly",
    title: "Monthly",
    priceShown: "$3.99 / month",
    cadence: "Cancel anytime, keeps everything you already have.",
  },
  {
    id: "hardship",
    sku: "tinybubbles.plus.hardship",
    title: "Pay what you can",
    priceShown: "$0+ / your choice",
    cadence: "Tight budget? Take Plus for free or pay what feels fair.",
    hardship: true,
  },
] as const;

export const PLANS_BY_ID: Record<PlanId, PurchasePlan> = Object.fromEntries(
  PLANS.map((p) => [p.id, p]),
) as Record<PlanId, PurchasePlan>;

/**
 * The single cross-platform entitlement id a real processor would expose (seam
 * scaffolding only — billing-entitlements §5). When RevenueCat is wired LATER,
 * `CustomerInfo.entitlements.active[PLUS_ENTITLEMENT_ID]` becomes the source of
 * truth that `applyCustomerInfo()` maps onto `settingsStore.entitlement`; the
 * call sites (paywall + gates + every `isPremium`) stay byte-identical because
 * they read entitlement STATE, not the processor. No processor call exists now.
 */
export const PLUS_ENTITLEMENT_ID = "plus";

/**
 * The trial end-date a purchase made `at` ms would honestly produce. The paywall
 * shows this as a real calendar date BEFORE the user commits — no surprise.
 */
export function trialEndsAtFor(at: number): number {
  return at + PREMIUM_TRIAL_MS;
}

/**
 * Mock subscribe to `plan`. Flips local entitlement to premium for an honest
 * 7-day trial (`tier='premium'`, `source='trial'`, `trialEndsAt` set) and logs a
 * stub purchase record. NO network call.
 *
 * // TODO: wire RevenueCat (LATER seam — billing-entitlements §5). Add the MIT
 * // `react-native-purchases` seam dep + its Expo config plugin (dev-client only;
 * // NOT Expo-Go/web — the mock MUST remain the offline fallback). Replace this body
 * // with the real store buy, then derive + apply the entitlement:
 * //   const info = await Purchases.purchasePackage(pkg);          // seam call, later
 * //   // or: await Purchases.purchaseProduct(PLANS_BY_ID[plan].sku);  // seam, later
 * //   applyCustomerInfo(info.customerInfo);  // maps active[PLUS_ENTITLEMENT_ID]
 * // On error/cancel: NO state change. Keep a try/catch that falls back to this
 * // local mock when the SDK is unavailable. Call sites stay byte-identical.
 */
export function mockPurchase(plan: PlanId): void {
  const def = PLANS_BY_ID[plan];
  if (!def) return;
  useSettingsStore.getState().mockPurchase(plan, def.sku, def.priceShown);
}

/**
 * Mock cancel — reverts entitlement to free in one tap. Per doc 66 §1b.11 this
 * NEVER removes/unequips anything the child owns; it only stops NEW unlocks.
 *
 * // TODO: wire RevenueCat (LATER seam — §5) — a real cancel happens in the OS
 * // subscription UI (`Linking.openURL(customerInfo.managementURL)`), then just
 * // refresh `CustomerInfo`. The mock reverts local state directly for now.
 */
export function mockCancel(): void {
  useSettingsStore.getState().mockCancel();
}
