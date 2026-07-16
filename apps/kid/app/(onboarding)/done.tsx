/**
 * app/(onboarding)/done.tsx — STEP 4: hand-off -> land in (kid)
 * (doc 66 §M11, streamlined per doc 70 §F4).
 *
 * The single hand-off screen: it AUTO-ACTIVATES all three daypart routines
 * (morning / afternoon / evening) so the time-driven kid flow always has the
 * right routine live — replacing the old manual single-routine pick that fought
 * the daypart model. It also folds in the buddy rename (color is deferred to
 * Settings) and teaches the parent/kid bifurcation (the grown-up dashboard opens
 * with the PIN). Finishing writes `onboarding.completed` and
 * `router.replace('/(kid)')` so the back stack can't return to the wizard.
 *
 * By construction this screen is reachable only after the PIN is set
 * (`parentGateConfigured = true`) and a child + seeded routines exist — so the
 * child lands straight into a runnable, daypart-correct loop.
 */
import { router, type Href } from "expo-router";
import React, { useEffect, useState } from "react";
import { Text, TextInput, View } from "react-native";

import { useBuddyStore } from "../../src/state/buddyStore";
import { useChildStore } from "../../src/state/childStore";
import { useSettingsStore } from "../../src/state/settingsStore";
import { useTaskStore } from "../../src/state/taskStore";
import { resolveContent } from "../../src/theme/resolveContent";
import { useThemeTokens } from "../../src/theme/useThemeTokens";

import BubbleBuddy from "../../components/buddy/BubbleBuddy";
import type { BuddyFinish } from "../../components/buddy/buddyVisuals";
import OnboardingShell from "../../components/onboarding/OnboardingShell";
import { Card, Note, SectionTitle } from "../../components/parent/ui";

export default function OnboardingDone() {
  const t = useThemeTokens();
  const c = t.colors;

  const activeChildId = useSettingsStore((s) => s.meta.activeChildId);
  const completeOnboarding = useSettingsStore((s) => s.completeOnboarding);
  const profile = useChildStore((s) => (activeChildId ? s.profiles[activeChildId] : undefined));
  const companion = useBuddyStore((s) => (activeChildId ? s.companions[activeChildId] : undefined));
  const renameCompanion = useBuddyStore((s) => s.renameCompanion);
  const routines = useTaskStore((s) => (activeChildId ? s.routines[activeChildId] : undefined)) ?? [];
  const setRoutineActive = useTaskStore((s) => s.setRoutineActive);

  const childName = profile?.displayName ?? "your child";
  const companionStyle = profile?.settings.companionStyle ?? "cuddly";
  const artVariant = resolveContent("buddy.artVariant", { companionStyle });

  const [name, setName] = useState(companion?.name ?? "");

  // Auto-activate ALL seeded routines (one per daypart) so the time-driven kid
  // flow is never empty. Idempotent — safe on resume/remount.
  useEffect(() => {
    if (!activeChildId) return;
    for (const r of routines) {
      if (!r.active) setRoutineActive(activeChildId, r.id, true);
    }
    // routines identity changes only when the child's routine set changes.
  }, [activeChildId, routines, setRoutineActive]);

  const buddyName = name.trim() || companion?.name || "Buddy";

  const finish = () => {
    if (activeChildId) {
      const trimmed = name.trim();
      if (trimmed && trimmed !== companion?.name) renameCompanion(activeChildId, trimmed);
      // Defensive belt-and-braces in case the effect hasn't flushed.
      for (const r of routines) {
        if (!r.active) setRoutineActive(activeChildId, r.id, true);
      }
    }
    completeOnboarding();
    router.replace("/(kid)" as Href);
  };

  return (
    <OnboardingShell
      step="done"
      voiceSlot="done"
      title="All set!"
      subtitle={`${buddyName} is ready, and ${childName}’s daypart routines are live.`}
      speech={`All set! ${buddyName} is ready for ${childName}.`}
      showBack={false}
      primaryLabel="Hand it to your child"
      onPrimary={finish}
    >
      <View style={{ alignItems: "center", gap: t.spacing(3), paddingVertical: t.spacing(2) }}>
        <BubbleBuddy
          variant={artVariant}
          mood="celebrating"
          size={148}
          bodyHue={companion?.customization.baseColor}
          finish={companion?.customization.finish as BuddyFinish | undefined}
          name={buddyName}
        />
      </View>

      <Card>
        <SectionTitle>Name the buddy</SectionTitle>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder={companion?.name ?? "Buddy"}
          placeholderTextColor={c.textDim}
          accessibilityLabel="Buddy name"
          autoCapitalize="words"
          style={{
            color: c.text,
            fontFamily: t.type.bodyLg.family,
            fontSize: t.type.bodyLg.size,
            backgroundColor: c.surfaceAlt,
            borderRadius: t.radius,
            borderWidth: 1,
            borderColor: c.border,
            paddingVertical: t.spacing(3),
            paddingHorizontal: t.spacing(3),
          }}
        />
        <Note>Your child can rename it or pick a color any time in the buddy screen.</Note>
      </Card>

      <Card>
        <Text
          style={{
            color: c.text,
            fontFamily: t.type.body.family,
            fontSize: t.type.body.size,
            lineHeight: t.type.body.lineHeight,
          }}
        >
          {childName} sees the right routine for the time of day — morning, afternoon,
          then evening — one gentle step at a time. When a routine is finished it
          simply says “see you later,” never “you failed.”
        </Text>
        <Note>🔒 Open the grown-up dashboard any time with your PIN to manage routines, tokens and rewards.</Note>
      </Card>
    </OnboardingShell>
  );
}
