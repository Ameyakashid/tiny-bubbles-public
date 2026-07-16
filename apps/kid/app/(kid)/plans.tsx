/**
 * app/(kid)/plans.tsx — the calm, READ-ONLY "My Plans" glance (if-then-plans §2.2).
 *
 * A pushed modal (both shells) modeled on `peek.tsx`: ✕ close → `router.back()`.
 * It lists the child's ACTIVE plans as spoken if-then cards. It NEVER starts a run
 * and NEVER gates anything. Young auto-speaks the plans on open; older speaks on
 * tap. For a `situational` plan an OPTIONAL, POSITIVE-only "I did it! 🫧" nod fires
 * a happy buddy mood (`stepDone`) + a soft tick — NO tokens, NO streak, and there
 * is no negative / "not done" affordance anywhere in the whole feature.
 *
 * Copy/voice come from resolvers only; `ageMode` only feeds them (no raw branch).
 */
import React, { useEffect } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { activePlans, assemblePlanPhrase, situationalPlans } from "../../src/domain/plans";
import { playCue } from "../../src/services/playCue";
import { speak } from "../../src/services/tts";
import { useBuddyStore } from "../../src/state/buddyStore";
import { useChildStore } from "../../src/state/childStore";
import { usePlanStore } from "../../src/state/planStore";
import { useSettingsStore } from "../../src/state/settingsStore";
import { resolveContent } from "../../src/theme/resolveContent";
import { useThemeInputs } from "../../src/theme/ThemeProvider";
import { useThemeTokens } from "../../src/theme/useThemeTokens";

import PlanCard from "../../components/plans/PlanCard";

export default function KidPlans() {
  const t = useThemeTokens();
  const c = t.colors;
  const { ageMode } = useThemeInputs();
  const router = useRouter();

  const activeChildId = useSettingsStore((s) => s.meta.activeChildId);
  const spokenEnabled = useChildStore((s) =>
    activeChildId ? s.profiles[activeChildId]?.settings.spokenLabelsEnabled ?? true : true,
  );
  const planList = usePlanStore((s) => (activeChildId ? s.plans[activeChildId] : undefined));
  const applyEvent = useBuddyStore((s) => s.applyEvent);

  const plans = activePlans(planList);
  const situationalIds = new Set(situationalPlans(planList).map((p) => p.id));

  // young pervasive-TTS default: speak the plans once on open (single utterance,
  // like peek.tsx — the individual cards speak on tap).
  useEffect(() => {
    if (!t.spokenLabelDefault || !spokenEnabled || plans.length === 0) return;
    const spoken = plans.map((p) => assemblePlanPhrase(p, ageMode).spoken).join(". ");
    speak(spoken, { ageMode, enabled: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The ONLY "did you do it" in the whole feature — POSITIVE-only, no tokens/streak.
  const onDidIt = () => {
    if (!activeChildId) return;
    applyEvent(activeChildId, "stepDone"); // a happy buddy mood (positive-only)
    playCue("tap.soft"); // a soft neutral tick — never a Warning/Error haptic
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.canvas }} edges={["top"]}>
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
          style={{ color: c.text, fontFamily: t.type.h2.family, fontSize: t.type.h2.size, fontWeight: "700" }}
        >
          {resolveContent("plans.title", { ageMode })}
        </Text>
        <Pressable
          onPress={() => router.back()}
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

      <ScrollView
        contentContainerStyle={{
          padding: t.spacing(4),
          gap: t.spacing(4),
          maxWidth: t.contentMaxWidth,
          alignSelf: "center",
          width: "100%",
        }}
      >
        {plans.length === 0 ? (
          <Text style={{ color: c.textDim, fontSize: t.type.bodyLg.size, textAlign: "center" }}>
            {resolveContent("plans.emptyKid", { ageMode })}
          </Text>
        ) : (
          plans.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              spokenEnabled={spokenEnabled}
              onDidIt={situationalIds.has(plan.id) ? onDidIt : undefined}
            />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
