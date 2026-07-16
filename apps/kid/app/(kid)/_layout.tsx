import { router, Stack, Tabs, useSegments } from "expo-router";
import { Pressable, Text, View, type ColorValue } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { resolveContent } from "../../src/theme/resolveContent";
import { useCapabilities, useThemeInputs } from "../../src/theme/ThemeProvider";
import { useThemeTokens } from "../../src/theme/useThemeTokens";

/**
 * Kid shell (doc 66 §M5, doc 70 §D).
 *
 * The shell is chosen from a RESOLVED capability flag, NEVER the raw ageMode
 * string (the golden rule, doc 66 §2). `multiStepVisible` is the shell flag:
 *   - false (young): a single-surface Stack, NO tab bar — the runner is home;
 *     buddy / rewards / calm are reached via oversized in-screen buttons (M6+).
 *   - true  (older): a Tabs shell — Today / Buddy / Rewards / Calm.
 *
 * BIFURCATION (doc 70 §D): a small, persistent, PIN-gated "Grown-ups 🔒" door is
 * overlaid on EVERY kid surface (both shells) so the parent can always reach the
 * mission-control dashboard — it pushes the (gate) challenge, and on pass the gate
 * lands in (parent). It is hidden over the pushed `celebrate` / `peek` modals so it
 * never overlaps their own controls. The kid experience stays big & playful; the
 * parent zone stays dense & behind the gate — one codebase, two experiences.
 *
 * Same screen components render in both shells; flipping a child's age mode in
 * the parent area re-renders this shell (tabbed <-> single-surface) with no data
 * migration. `celebrate` is a pushed modal route in both shells (not a tab).
 */
export default function KidLayout() {
  const { multiStepVisible } = useCapabilities();
  return (
    <View style={{ flex: 1 }}>
      {multiStepVisible ? <OlderTabs /> : <YoungStack />}
      <GrownUpsDoor />
    </View>
  );
}

/** young: single focal surface, no tab bar (reduce navigation load). */
function YoungStack() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="buddy" />
      <Stack.Screen name="rewards" />
      <Stack.Screen name="calm" />
      <Stack.Screen name="celebrate" options={{ presentation: "modal" }} />
      {/* read-only "peek at later dayparts" — pushed modal, never a run (doc 70 §B5). */}
      <Stack.Screen name="peek" options={{ presentation: "modal" }} />
      {/* opt-in mood check-in — pushed modal, only reachable when caps.moodCheckin. */}
      <Stack.Screen name="mood" options={{ presentation: "modal" }} />
      {/* read-only "My Plans" glance — pushed modal, reached from the done panel
          chip only when the child has ≥1 active plan (if-then-plans §2.2). */}
      <Stack.Screen name="plans" options={{ presentation: "modal" }} />
      {/* focus intervals — registered for router completeness; UNREACHABLE in the
          young shell (the `focusIntervalsAvailable` capability is false there, and the
          screen itself redirects). */}
      <Stack.Screen name="focus" options={{ presentation: "modal" }} />
      {/* Bloop chat placeholder (M2.0, w2) — OFF BY DEFAULT: the screen
          hard-gates on the parent-set `bloopEnabled` (absent ⇒ false) and
          redirects when disabled/offline; the full surface lands at M5.2. */}
      <Stack.Screen name="bloop" options={{ presentation: "modal" }} />
    </Stack>
  );
}

/** older / preteen: Today / Buddy(Avatar) / Rewards / Calm tabs. */
function OlderTabs() {
  const t = useThemeTokens();
  // Feed ageMode into the resolver (sanctioned useThemeInputs pattern, never a
  // raw branch): the "Buddy" tab becomes "Avatar" for the preteen identity tier.
  const { ageMode } = useThemeInputs();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: t.colors.primary,
        tabBarInactiveTintColor: t.colors.textDim,
        tabBarStyle: {
          backgroundColor: t.colors.surface,
          borderTopColor: t.colors.border,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: "Today", tabBarIcon: tabIcon("☀️") }}
      />
      <Tabs.Screen
        name="buddy"
        options={{ title: resolveContent("buddy.tabTitle", { ageMode }), tabBarIcon: tabIcon("🫧") }}
      />
      <Tabs.Screen
        name="rewards"
        options={{ title: "Rewards", tabBarIcon: tabIcon("⭐") }}
      />
      <Tabs.Screen
        name="calm"
        options={{ title: "Calm", tabBarIcon: tabIcon("🌊") }}
      />
      {/* celebrate is a pushed modal route during the runner (M7), never a tab. */}
      <Tabs.Screen name="celebrate" options={{ href: null }} />
      {/* peek is a pushed read-only route (doc 70 §B5), reachable but never a tab. */}
      <Tabs.Screen name="peek" options={{ href: null }} />
      {/* mood check-in is a pushed opt-in route (mood-checkin §2.2), never a tab. */}
      <Tabs.Screen name="mood" options={{ href: null }} />
      {/* "My Plans" glance is a pushed route (if-then-plans §2.2), never a tab. */}
      <Tabs.Screen name="plans" options={{ href: null }} />
      {/* focus intervals is a pushed opt-in route (focus-intervals §2.0), never a tab. */}
      <Tabs.Screen name="focus" options={{ href: null }} />
      {/* Bloop chat placeholder (M2.0) — pushed, parent-gated, never a tab. */}
      <Tabs.Screen name="bloop" options={{ href: null }} />
    </Tabs>
  );
}

/**
 * The persistent, low-emphasis grown-ups entry (doc 70 §D). Pushes the parental
 * gate; passing the gate `router.replace('/(parent)')` lands on the mission-
 * control dashboard. It NEVER opens the parent zone directly — the (gate) →
 * (parent) guard on `parentUnlocked` is preserved. Hidden over pushed modals so
 * it can't overlap the peek close button / the celebrate milestone.
 */
function GrownUpsDoor() {
  const t = useThemeTokens();
  const insets = useSafeAreaInsets();
  const segments = useSegments();
  const last = segments[segments.length - 1];
  if (
    last === "celebrate" ||
    last === "peek" ||
    last === "mood" ||
    last === "plans" ||
    last === "focus" ||
    last === "bloop"
  )
    return null;

  return (
    <Pressable
      onPress={() => router.push("/(gate)/parental-gate")}
      accessibilityRole="button"
      accessibilityLabel="For grown-ups"
      hitSlop={10}
      style={{
        position: "absolute",
        top: insets.top + 4,
        right: 10,
        zIndex: 20,
        elevation: 20,
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        paddingVertical: 6,
        paddingHorizontal: 10,
        borderRadius: 999,
        backgroundColor: t.colors.surface,
        borderWidth: 1,
        borderColor: t.colors.border,
        opacity: 0.9,
      }}
    >
      <Text style={{ fontSize: 13 }}>🔒</Text>
    </Pressable>
  );
}

/** Lightweight emoji tab icon (kept dependency-free for the M5 shell). */
function tabIcon(emoji: string) {
  return function TabIcon({ color }: { color: ColorValue }) {
    return <Text style={{ fontSize: 22, color }}>{emoji}</Text>;
  };
}
