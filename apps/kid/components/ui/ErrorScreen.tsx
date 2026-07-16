/**
 * components/ui/ErrorScreen.tsx — the calm, offline recovery UI shown by the
 * global error boundary (production-readiness §2.3).
 *
 * When an unexpected render/runtime error is caught, this renders INSTEAD of a
 * red box / white crash: a still bubble + one short, spoken-able, blameless line
 * ("Let's try that again 🫧") + a single Reload button + a small parent-only
 * "Show details" affordance (selectable text) for a manual bug report.
 *
 * Deliberately:
 *   - NO network / telemetry (would break the no-egress promise, §2.5/§6). The
 *     error stays on-device; the boundary may stamp a local `lastRecoveredAt`.
 *   - NO animation (safe under low-stim / calm / reduced-motion, and safe even
 *     when Reanimated itself is the thing that threw).
 *   - MODE-NEUTRAL + provider-free: it uses no theme context / NativeWind palette
 *     class and no persisted profile, so it renders correctly even for a
 *     pre-hydration crash (no active child) or a crash inside ThemeProvider. Copy
 *     resolves through the pure catalog accessor with the safe `young` default
 *     (matching `app/_layout.tsx`'s no-profile branch, §2.3).
 */
import { Pressable, ScrollView, Text, View } from "react-native";
import { useState } from "react";

import { getMessage } from "../../src/i18n/messages";

/** Hardcoded calm palette (no theme dependency — see file header). */
const CANVAS = "#F0FBFF";
const BUBBLE = "#BFE9FB";
const BUBBLE_RING = "#8FD6F5";
const INK = "#0F3D56";
const INK_DIM = "#4B7A93";
const BUTTON = "#36C5F0";
const BUTTON_INK = "#FFFFFF";

export interface ErrorScreenProps {
  /** The caught error (shown only behind the parent "Show details" affordance). */
  error?: unknown;
  /** Reset/reload handler — resets the boundary or re-navigates to the root. */
  onReload?: () => void;
}

/**
 * Calm recovery screen. Age-neutral (a child could see it), so copy stays a
 * picture + one short line. Never says "crash / error / you broke it".
 */
export default function ErrorScreen({ error, onReload }: ErrorScreenProps) {
  const [showDetails, setShowDetails] = useState(false);

  // Safe `young` default — matches the ThemedRoot no-profile branch (§2.3).
  const line = getMessage("error.recover", { ageMode: "young" });
  const details =
    error instanceof Error
      ? `${error.name}: ${error.message}\n${error.stack ?? ""}`
      : error != null
        ? String(error)
        : "";

  return (
    <View
      accessibilityRole="alert"
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: CANVAS,
        padding: 32,
        gap: 24,
      }}
    >
      {/* Still bubble (no animation — safe under any motion/theme state). */}
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={{
          width: 96,
          height: 96,
          borderRadius: 48,
          backgroundColor: BUBBLE,
          borderWidth: 3,
          borderColor: BUBBLE_RING,
        }}
      />

      <Text
        accessibilityRole="header"
        style={{ color: INK, fontSize: 22, fontWeight: "700", textAlign: "center" }}
      >
        {line}
      </Text>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Reload"
        onPress={onReload}
        style={{
          backgroundColor: BUTTON,
          paddingHorizontal: 28,
          paddingVertical: 14,
          borderRadius: 999,
        }}
      >
        <Text style={{ color: BUTTON_INK, fontSize: 17, fontWeight: "700" }}>Reload</Text>
      </Pressable>

      {/* Parent-only manual bug-report affordance — no network; on-device text
          the parent can select + copy by long-press. Hidden by default. */}
      {details ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => setShowDetails((v) => !v)}
          style={{ marginTop: 8 }}
        >
          <Text style={{ color: INK_DIM, fontSize: 13 }}>
            {showDetails ? "Hide details" : "Show details"}
          </Text>
        </Pressable>
      ) : null}

      {showDetails && details ? (
        <ScrollView style={{ maxHeight: 160, alignSelf: "stretch" }}>
          <Text selectable style={{ color: INK_DIM, fontSize: 11 }}>
            {details}
          </Text>
        </ScrollView>
      ) : null}
    </View>
  );
}
