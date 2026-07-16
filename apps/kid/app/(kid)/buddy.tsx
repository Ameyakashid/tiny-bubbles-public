/**
 * app/(kid)/buddy.tsx — the companion surface (doc 66 M6).
 *
 * Renders <BuddyRoom> for the ACTIVE child. Onboarding (M11) creates the real
 * child + seeds its companion atomically before the kid area is ever reachable
 * (the boot redirect sends a non-onboarded install to onboarding, and restore
 * always sets a valid active child), so an active child always has a companion.
 *
 * M-D2 (§2.9): the old pre-onboarding `DEMO_ID` demo-companion fallback was dead
 * in the onboarded flow and has been removed. If — defensively — there is no
 * active child yet, we render a calm empty canvas (never a crash / blank error).
 */
import React from "react";
import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import BuddyRoom from "../../components/buddy/BuddyRoom";
import { useSettingsStore } from "../../src/state/settingsStore";
import { useThemeTokens } from "../../src/theme/useThemeTokens";

export default function Buddy() {
  const t = useThemeTokens();
  const activeChildId = useSettingsStore((s) => s.meta.activeChildId);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.colors.canvas }} edges={["top"]}>
      {activeChildId ? <BuddyRoom childId={activeChildId} /> : <View style={{ flex: 1 }} />}
    </SafeAreaView>
  );
}
