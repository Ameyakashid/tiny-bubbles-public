/**
 * app/(kid)/focus.tsx — host for the OPTIONAL adjustable focus-intervals scaffold
 * (feature #22, `focus-intervals`, M-C3). A pushed modal (older shell) — never a tab,
 * never auto-opened.
 *
 * A THIN host: it resolves the active child + config, HARD-GATES on
 * `capabilities.focusIntervalsAvailable` (older-only age ceiling) AND the parent
 * opt-in `settings.focusIntervals.enabled`, and — only when BOTH are true — renders
 * `<FocusSession>`. If either is false (young child, or the parent hasn't turned it
 * on) it redirects back to Today, so nothing in this feature is reachable. The guard
 * reads the CAPABILITY flag, never a raw `ageMode` string.
 *
 * NON-rigid, ADVISORY, token-neutral, anti-shame (see `FocusSession`). An optional
 * organizational tool, never a medical claim. Offline / Expo-Go / web-safe.
 */
import React, { useCallback } from "react";
import { Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Redirect, useRouter } from "expo-router";

import { focusConfigOf } from "../../src/domain/focus";
import { useChildStore } from "../../src/state/childStore";
import { useFocusSessionStore } from "../../src/state/focusSessionStore";
import { useSettingsStore } from "../../src/state/settingsStore";
import { resolveContent } from "../../src/theme/resolveContent";
import { useCapabilities, useThemeInputs } from "../../src/theme/ThemeProvider";
import { useThemeTokens } from "../../src/theme/useThemeTokens";
import FocusSession from "../../components/focus/FocusSession";

export default function FocusScreen() {
  const t = useThemeTokens();
  const c = t.colors;
  const router = useRouter();
  const caps = useCapabilities();
  // Sanctioned resolver pattern (never a raw age branch): ageMode only feeds resolveContent.
  const { ageMode } = useThemeInputs();

  const activeChildId = useSettingsStore((s) => s.meta.activeChildId);
  const settings = useChildStore((s) =>
    activeChildId ? s.profiles[activeChildId]?.settings : undefined,
  );
  const stop = useFocusSessionStore((s) => s.stop);

  const config = settings ? focusConfigOf(settings) : undefined;

  const handleClose = useCallback(() => {
    stop();
    router.back();
  }, [stop, router]);

  // HARD GATE: older-only capability AND the parent opt-in must BOTH be true.
  if (!activeChildId || !caps.focusIntervalsAvailable || !config?.enabled) {
    return <Redirect href="/(kid)" />;
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.canvas }} edges={["top"]}>
      {/* header + close (same pattern as mood.tsx / peek.tsx) */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: t.spacing(4),
          paddingTop: t.spacing(3),
          paddingBottom: t.spacing(2),
        }}
      >
        <Text
          style={{
            color: c.text,
            fontFamily: t.type.h2.family,
            fontSize: t.type.h2.size,
            fontWeight: "700",
            flex: 1,
          }}
        >
          {resolveContent("focus.title", { ageMode })}
        </Text>
        <Pressable
          onPress={handleClose}
          accessibilityRole="button"
          accessibilityLabel="Close"
          hitSlop={12}
          style={{
            width: 40,
            height: 40,
            borderRadius: 999,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: c.surface,
            borderWidth: 1,
            borderColor: c.border,
          }}
        >
          <Text style={{ fontSize: 18, color: c.text }}>✕</Text>
        </Pressable>
      </View>

      <FocusSession childId={activeChildId} config={config} onClose={handleClose} />
    </SafeAreaView>
  );
}
