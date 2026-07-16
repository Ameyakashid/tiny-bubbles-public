import { Redirect } from "expo-router";

import { useSettingsStore } from "../src/state/settingsStore";

/**
 * Boot redirect (doc 66 §2 / §M5).
 *
 * Rendered below <StoreHydrationGate> (root layout), so the persisted onboarding
 * flag is already on disk and can be read synchronously — no async flicker.
 *
 *   !onboardingComplete -> "/(onboarding)"   else   -> "/(kid)"
 *
 * The child always lands in the kid area; the parent area is reachable only via
 * the (gate) challenge.
 */
export default function Index() {
  const onboardingComplete = useSettingsStore(
    (s) => s.meta.onboarding.completed,
  );
  return <Redirect href={onboardingComplete ? "/(kid)" : "/(onboarding)"} />;
}
