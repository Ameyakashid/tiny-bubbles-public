import { Redirect, Stack } from "expo-router";

import { useSessionStore } from "../../src/state/sessionStore";

/**
 * Parent area (doc 66 §M9). Screens: dashboard, children, tasks, rewards-setup,
 * settings (+ paywall in M12). `index` redirects to `dashboard`.
 *
 * Route guard: the child can NEVER reach the parent area except through the
 * (gate) challenge. We gate on the in-memory `parentUnlocked` flag (sessionStore)
 * which is set only by the gate and cleared on app background (root layout), so
 * deep-linking or backing into `/(parent)` without unlocking bounces to the gate.
 */
export default function ParentLayout() {
  const parentUnlocked = useSessionStore((s) => s.parentUnlocked);

  if (!parentUnlocked) {
    return <Redirect href="/(gate)/parental-gate" />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
