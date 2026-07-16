/**
 * app/(onboarding)/index.tsx — STEP 1: welcome + privacy consent, merged
 * (doc 66 §M11, streamlined per doc 70 §F1).
 *
 * Honest framing only: Tiny Bubbles "builds routines & calmer days". It must
 * NEVER claim to treat/cure ADHD (doc 66 §5.9 over-claiming gate). The primary
 * CTA IS the single COPPA-style local acknowledgement — tapping it writes
 * `privacyConsentAckAt`, so there is no separate consent screen or toggle.
 *
 * This is also the resume-after-kill entry: on a cold relaunch mid-onboarding it
 * forwards to the (clamped) saved `currentStep` so a parent never redoes finished
 * steps — and a persisted step removed by the §F streamline resolves to a safe
 * survivor.
 */
import { Redirect, router, type Href } from "expo-router";
import React, { useState } from "react";
import { Pressable, Text, View } from "react-native";

import { useSettingsStore } from "../../src/state/settingsStore";
import { useThemeTokens } from "../../src/theme/useThemeTokens";

import OnboardingShell from "../../components/onboarding/OnboardingShell";
import { clampOnboardingStep, routeForStep } from "../../components/onboarding/steps";

// Resume only on the FIRST mount of a session, so tapping Back to welcome later
// doesn't bounce the parent forward again.
let resumeHandled = false;

// The two headline promises the grown-up sees at a glance.
const POINTS: { emoji: string; text: string }[] = [
  { emoji: "🫧", text: "Gentle routines, one tiny step at a time — a finished step is celebrated, a miss is never shamed." },
  { emoji: "🔒", text: "Everything stays on this device. No account, nothing uploaded." },
];

// The full data facts, revealed on demand (kept short + plain).
const FACTS: { emoji: string; text: string }[] = [
  { emoji: "📵", text: "No sign-up. Nothing is sent to any server." },
  { emoji: "📱", text: "Your child’s name, tasks, progress and buddy live only here." },
  { emoji: "🙈", text: "Usage insights and mood check-ins stay OFF until you turn them on." },
  { emoji: "🗑️", text: "Review or delete everything any time in Settings." },
];

export default function OnboardingWelcome() {
  const t = useThemeTokens();
  const c = t.colors;
  const setOnboardingStep = useSettingsStore((s) => s.setOnboardingStep);
  const ackPrivacyConsent = useSettingsStore((s) => s.ackPrivacyConsent);
  const updateParentSettings = useSettingsStore((s) => s.updateParentSettings);

  const [showFacts, setShowFacts] = useState(false);

  // Decide resume ONCE (cold start), before the shell records 'welcome'.
  const [resumeTo] = useState<Href | null>(() => {
    if (resumeHandled) return null;
    resumeHandled = true;
    const ob = useSettingsStore.getState().meta.onboarding;
    const resumeStep = clampOnboardingStep(ob.currentStep);
    if (!ob.completed && resumeStep !== "welcome") {
      return routeForStep(resumeStep);
    }
    return null;
  });

  if (resumeTo) return <Redirect href={resumeTo} />;

  // The CTA IS the consent: acknowledge, re-assert privacy defaults, advance.
  const advance = () => {
    ackPrivacyConsent();
    updateParentSettings({ localAnalyticsEnabled: false, moodLoggingEnabled: false });
    setOnboardingStep("parent_gate_setup");
    router.push("/(onboarding)/parent-gate-setup" as Href);
  };

  return (
    <OnboardingShell
      step="welcome"
      voiceSlot="welcome"
      title="Welcome to Tiny Bubbles"
      subtitle="A calm, playful way to build everyday routines — not a medical treatment."
      speech="Welcome to Tiny Bubbles. A calm, playful way to build everyday routines."
      showBack={false}
      muteAutoSpeak
      primaryLabel="I’m the grown-up — continue"
      onPrimary={advance}
    >
      <View style={{ gap: t.spacing(3) }}>
        {POINTS.map((p) => (
          <View
            key={p.text}
            style={{ flexDirection: "row", alignItems: "center", gap: t.spacing(3) }}
          >
            <Text style={{ fontSize: 28 }}>{p.emoji}</Text>
            <Text
              style={{
                flex: 1,
                color: c.text,
                fontFamily: t.type.bodyLg.family,
                fontSize: t.type.bodyLg.size,
                lineHeight: t.type.bodyLg.lineHeight,
              }}
            >
              {p.text}
            </Text>
          </View>
        ))}

        {/* Expandable full data facts — kept out of the way until asked for. */}
        <Pressable
          onPress={() => setShowFacts((v) => !v)}
          accessibilityRole="button"
          accessibilityState={{ expanded: showFacts }}
          accessibilityLabel="How your data is handled"
          style={{ alignSelf: "flex-start" }}
        >
          <Text style={{ color: c.primary, fontSize: t.type.body.size, fontWeight: "700" }}>
            {showFacts ? "Hide the data details" : "How your data is handled ›"}
          </Text>
        </Pressable>

        {showFacts ? (
          <View
            style={{
              backgroundColor: c.surfaceAlt,
              borderRadius: t.radius,
              borderWidth: 1,
              borderColor: c.border,
              padding: t.spacing(3),
              gap: t.spacing(2),
            }}
          >
            {FACTS.map((f) => (
              <View
                key={f.text}
                style={{ flexDirection: "row", alignItems: "center", gap: t.spacing(3) }}
              >
                <Text style={{ fontSize: 22 }}>{f.emoji}</Text>
                <Text
                  style={{
                    flex: 1,
                    color: c.text,
                    fontFamily: t.type.body.family,
                    fontSize: t.type.body.size,
                    lineHeight: t.type.body.lineHeight,
                  }}
                >
                  {f.text}
                </Text>
              </View>
            ))}
          </View>
        ) : null}

        <Text
          style={{
            color: c.textDim,
            fontSize: t.type.caption.size,
            lineHeight: t.type.caption.lineHeight,
            marginTop: t.spacing(1),
          }}
        >
          Continuing confirms you’re the parent or guardian setting this up and
          have read how data stays on this device. No account is created.
        </Text>
      </View>
    </OnboardingShell>
  );
}
