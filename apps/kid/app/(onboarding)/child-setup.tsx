/**
 * app/(onboarding)/child-setup.tsx — STEP 3: name + age -> ageMode
 * (doc 66 §M11, streamlined per doc 70 §F3).
 *
 * Picking the age mode drives the whole app; the M2 side-by-side `ChildModePreview`
 * is now COLLAPSED by default (revealed on demand) to keep the screen light.
 * Idempotent across Back/Continue: the first pass creates the child + starter seed
 * (routines/rewards/companion via `createChildWithSeed`); returning here updates
 * that same child rather than creating a duplicate.
 *
 * The former standalone "calm offer" screen is folded in as one inline note; we
 * still `markCalmModeOffered()` here so the "offered exactly once" invariant holds.
 */
import { router, type Href } from "expo-router";
import React, { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";

import type { AgeMode } from "../../src/domain/types";
import { useBuddyStore } from "../../src/state/buddyStore";
import { useChildStore } from "../../src/state/childStore";
import { createChildWithSeed } from "../../src/state/gameplay";
import { useSettingsStore } from "../../src/state/settingsStore";
import {
  defaultCompanionStyle,
  defaultTextFirst,
} from "../../src/theme/resolveCapabilities";
import { useThemeTokens } from "../../src/theme/useThemeTokens";

import ChildModePreview from "../../components/parent/ChildModePreview";
import OnboardingShell from "../../components/onboarding/OnboardingShell";
import { Card, Note, SectionTitle, Segmented } from "../../components/parent/ui";

function deviceTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

export default function ChildSetup() {
  const t = useThemeTokens();
  const c = t.colors;

  const activeChildId = useSettingsStore((s) => s.meta.activeChildId);
  const firstChildCreated = useSettingsStore((s) => s.meta.onboarding.firstChildCreated);
  const setOnboardingStep = useSettingsStore((s) => s.setOnboardingStep);
  const markCalmModeOffered = useSettingsStore((s) => s.markCalmModeOffered);
  const updateProfile = useChildStore((s) => s.updateProfile);
  const existing = useChildStore((s) => (activeChildId ? s.profiles[activeChildId] : undefined));
  const companion = useBuddyStore((s) => (activeChildId ? s.companions[activeChildId] : undefined));

  // Seed local state from the in-progress child (resume/back) or sensible blanks.
  const [name, setName] = useState(existing?.displayName ?? "");
  const [ageMode, setAgeMode] = useState<AgeMode>(existing?.ageMode ?? "young");
  const [showPreview, setShowPreview] = useState(false);

  // Preview axes: from the real child if it exists, else derive age defaults via
  // the shared resolvers (never an inline raw-ageMode branch, doc 66 §2).
  const companionStyle = existing?.settings.companionStyle ?? defaultCompanionStyle(ageMode);
  const textFirst = existing?.settings.textFirst ?? defaultTextFirst(ageMode);
  const sensoryMode = existing?.settings.sensoryMode ?? "standard";

  const advance = () => {
    const displayName = name.trim() || "Friend";
    if (firstChildCreated && activeChildId && existing) {
      updateProfile(activeChildId, { displayName, ageMode });
    } else {
      createChildWithSeed({ displayName, ageMode, timeZone: deviceTimeZone() });
    }
    // The calm path is offered here (folded from the old calm-offer screen).
    markCalmModeOffered();
    setOnboardingStep("done");
    router.push("/(onboarding)/done" as Href);
  };

  return (
    <OnboardingShell
      step="child_setup"
      voiceSlot="child"
      title="Who is this for?"
      subtitle="A first name (or nickname) and an age range. You can change both later."
      speech="Who is this for? Add a first name and choose an age range."
      muteAutoSpeak
      primaryLabel="Continue"
      onPrimary={advance}
    >
      <Card>
        <SectionTitle>Name</SectionTitle>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="First name or nickname"
          placeholderTextColor={c.textDim}
          accessibilityLabel="Child name"
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
        <Note>Just a nickname is fine — no other personal details are needed.</Note>
      </Card>

      <Card>
        <SectionTitle>Age range</SectionTitle>
        <Segmented<AgeMode>
          value={ageMode}
          onChange={setAgeMode}
          options={[
            { value: "young", label: "Younger (4–7)" },
            { value: "older", label: "Older (8–10)" },
            { value: "preteen", label: "Preteen (10–12)" },
          ]}
        />
        <Text style={{ color: c.textDim, fontSize: t.type.caption.size }}>
          Younger leans on pictures and spoken labels; older shows more words. You
          can fine-tune this any time in Settings.
        </Text>

        {/* Preview is collapsed by default to keep the screen light (doc 70 §F3). */}
        <Pressable
          onPress={() => setShowPreview((v) => !v)}
          accessibilityRole="button"
          accessibilityState={{ expanded: showPreview }}
          accessibilityLabel="Preview both modes"
          style={{ alignSelf: "flex-start" }}
        >
          <Text style={{ color: c.primary, fontSize: t.type.body.size, fontWeight: "700" }}>
            {showPreview ? "Hide preview" : "Preview both modes ›"}
          </Text>
        </Pressable>
        {showPreview ? (
          <ChildModePreview
            activeAgeMode={ageMode}
            companionStyle={companionStyle}
            textFirst={textFirst}
            sensoryMode={sensoryMode}
            companion={companion}
          />
        ) : null}
      </Card>

      <Card>
        <Note>
          Prefer no tokens or confetti? You can switch to calm mode any time in
          Settings — same routines and spoken steps, just quieter.
        </Note>
      </Card>
    </OnboardingShell>
  );
}
