/**
 * components/onboarding/OnboardingShell.tsx — the wizard shell every onboarding
 * step renders into (doc 66 §M11). Lifts the lockin wizard PATTERN (progress
 * dots + persist-then-advance) — but NONE of its "one immutable goal / signed
 * contract / CANNOT BE CHANGED" semantics, which are deleted on contact.
 *
 * Responsibilities:
 *   - records `OnboardingState.currentStep` on mount (resume-after-kill seam);
 *   - draws the progress dots from the canonical step order;
 *   - speaks the step's title aloud (TTS, with the offline fallback) and re-speaks
 *     on title tap — the "everything spoken" guarantee for non-readers;
 *   - surfaces a ONE-TIME "no device voice" prompt when no system voice exists;
 *   - provides a calm header (optional back) + scroll body + sticky footer CTA.
 *
 * It reads `useThemeTokens()` only — no raw ageMode branching (doc 66 §2).
 */
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import type { OnboardingStep } from "../../src/domain/types";
import { useSettingsStore } from "../../src/state/settingsStore";
import { useThemeTokens } from "../../src/theme/useThemeTokens";

import { PrimaryButton, TextButton } from "../parent/ui";
import { ONBOARDING_ORDER, stepIndexOf } from "./steps";
import { useOnboardingVoice, type OnboardingVoiceSlot } from "./useOnboardingVoice";

// Session-scoped: the voiceless prompt is shown ONCE across the whole flow.
let voicePromptDismissed = false;

export interface OnboardingShellProps {
  step: OnboardingStep;
  voiceSlot: OnboardingVoiceSlot;
  title: string;
  subtitle?: string;
  /** spoken aloud on mount; defaults to "title. subtitle" */
  speech?: string;
  children: React.ReactNode;
  primaryLabel: string;
  onPrimary: () => void;
  primaryDisabled?: boolean;
  /** optional secondary action under the primary CTA */
  secondaryLabel?: string;
  onSecondary?: () => void;
  /** show the back affordance (default true; false on welcome + done) */
  showBack?: boolean;
  onBack?: () => void;
  /**
   * Suppress the automatic speak-on-mount (doc 70 §F): the grown-up PIN/consent
   * setup screens shouldn't talk at the parent unprompted. Tapping the title to
   * re-speak still works, so the "everything spoken" affordance is preserved.
   */
  muteAutoSpeak?: boolean;
}

export default function OnboardingShell({
  step,
  voiceSlot,
  title,
  subtitle,
  speech,
  children,
  primaryLabel,
  onPrimary,
  primaryDisabled,
  secondaryLabel,
  onSecondary,
  showBack = true,
  onBack,
  muteAutoSpeak = false,
}: OnboardingShellProps) {
  const t = useThemeTokens();
  const c = t.colors;
  const setOnboardingStep = useSettingsStore((s) => s.setOnboardingStep);
  const { voiceState, voiceMissing, speak } = useOnboardingVoice(voiceSlot);

  const [promptDismissed, setPromptDismissed] = useState(voicePromptDismissed);

  const spoken = speech ?? `${title}.${subtitle ? ` ${subtitle}` : ""}`;

  // Persist the current step (resume-after-kill) the moment this screen shows.
  useEffect(() => {
    setOnboardingStep(step);
  }, [step, setOnboardingStep]);

  // Auto-speak the step once a voice resolves (re-speak on title tap). Grown-up
  // setup screens opt out via `muteAutoSpeak` (doc 70 §F) — tapping the title
  // still re-speaks, so nothing is unspeakable for non-readers.
  useEffect(() => {
    if (!muteAutoSpeak && voiceState === "available") speak(spoken);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voiceState]);

  const dismissPrompt = () => {
    voicePromptDismissed = true;
    setPromptDismissed(true);
  };

  const activeIndex = stepIndexOf(step);
  const showVoicePrompt = voiceMissing && !promptDismissed && !voicePromptDismissed;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.canvas }} edges={["top", "bottom"]}>
      {/* progress dots */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 6,
          paddingTop: t.spacing(2),
          paddingBottom: t.spacing(1),
        }}
      >
        {ONBOARDING_ORDER.map((s, i) => {
          const isActive = i === activeIndex;
          const isPast = i < activeIndex;
          return (
            <View
              key={s.step}
              style={{
                height: 6,
                borderRadius: 3,
                width: isActive ? 22 : 8,
                backgroundColor: isActive || isPast ? c.primary : c.surfaceSunken,
                opacity: isPast ? 0.55 : 1,
              }}
            />
          );
        })}
      </View>

      {/* header: optional back */}
      <View
        style={{
          minHeight: 36,
          paddingHorizontal: t.spacing(4),
          justifyContent: "center",
        }}
      >
        {showBack ? (
          <View style={{ alignSelf: "flex-start" }}>
            <TextButton label="‹ Back" tone="dim" onPress={onBack ?? (() => router.back())} />
          </View>
        ) : null}
      </View>

      <ScrollView
        contentContainerStyle={{
          padding: t.spacing(4),
          paddingTop: t.spacing(2),
          gap: t.spacing(3),
          width: "100%",
          maxWidth: t.contentMaxWidth,
          alignSelf: "center",
        }}
      >
        {/* spoken title (tap to hear again) */}
        <Pressable onPress={() => speak(spoken)} accessibilityRole="header" accessibilityLabel={title}>
          <Text
            style={{
              color: c.text,
              fontFamily: t.type.h2.family,
              fontSize: t.type.h2.size,
              lineHeight: t.type.h2.lineHeight,
              fontWeight: "800",
            }}
          >
            {title}
          </Text>
        </Pressable>
        {subtitle ? (
          <Text
            style={{
              color: c.textDim,
              fontFamily: t.type.bodyLg.family,
              fontSize: t.type.bodyLg.size,
              lineHeight: t.type.bodyLg.lineHeight,
              marginTop: -t.spacing(1),
            }}
          >
            {subtitle}
          </Text>
        ) : null}

        {showVoicePrompt ? (
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
            <Text style={{ color: c.text, fontSize: t.type.body.size, fontWeight: "700" }}>
              Add a voice for spoken prompts
            </Text>
            <Text style={{ color: c.textDim, fontSize: t.type.caption.size, lineHeight: t.type.caption.lineHeight }}>
              This device has no text-to-speech voice yet, so buttons can’t read
              themselves aloud. You can add one any time in your device’s
              Accessibility settings (Spoken Content / Text-to-speech). Setup still
              works without it.
            </Text>
            <View style={{ alignSelf: "flex-start" }}>
              <TextButton label="Got it" onPress={dismissPrompt} />
            </View>
          </View>
        ) : null}

        {children}
      </ScrollView>

      {/* sticky footer CTA */}
      <View
        style={{
          padding: t.spacing(4),
          paddingTop: t.spacing(2),
          gap: t.spacing(2),
          width: "100%",
          maxWidth: t.contentMaxWidth,
          alignSelf: "center",
        }}
      >
        <PrimaryButton label={primaryLabel} onPress={onPrimary} disabled={primaryDisabled} />
        {secondaryLabel && onSecondary ? (
          <View style={{ alignItems: "center" }}>
            <TextButton label={secondaryLabel} tone="dim" onPress={onSecondary} />
          </View>
        ) : null}
      </View>
    </SafeAreaView>
  );
}
