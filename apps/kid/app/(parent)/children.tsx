/**
 * app/(parent)/children.tsx — multi-child profiles + per-child theming (doc 66
 * §M9, §1b.5/§1b.6). Always FREE — never paywalled.
 *
 * Per-child controls: name, ageMode (with a LIVE side-by-side preview via the M2
 * `overrideAgeMode` provider), and the INDEPENDENT overrides companionStyle /
 * textFirst / sensoryMode, plus spoken labels, calm mode, and autonomy grants.
 * Edits target the active child so the live kid experience updates immediately.
 */
import { router } from "expo-router";
import React, { useState } from "react";
import { Text, TextInput, View } from "react-native";

import {
  BREAK_MINUTE_OPTIONS,
  FOCUS_MINUTE_OPTIONS,
  focusConfigOf,
} from "../../src/domain/focus";
import type { AgeMode, CompanionStyle, SensoryMode } from "../../src/domain/types";
import { useBuddyStore } from "../../src/state/buddyStore";
import { useChildStore } from "../../src/state/childStore";
import { createChildWithSeed, removeChild } from "../../src/state/gameplay";
import { useSettingsStore } from "../../src/state/settingsStore";
import { resolveCapabilities } from "../../src/theme/resolveCapabilities";
import { useThemeTokens } from "../../src/theme/useThemeTokens";

import ChildModePreview from "../../components/parent/ChildModePreview";
import { goToPaywall, PremiumGate } from "../../components/parent/PremiumGate";
import {
  Card,
  Chip,
  Divider,
  Note,
  ParentScreen,
  PrimaryButton,
  Segmented,
  SettingRow,
  SectionTitle,
  TextButton,
  Toggle,
} from "../../components/parent/ui";

function deviceTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

export default function ChildrenScreen() {
  const t = useThemeTokens();
  const c = t.colors;

  const index = useChildStore((s) => s.index);
  const profiles = useChildStore((s) => s.profiles);
  const updateProfile = useChildStore((s) => s.updateProfile);
  const updateSettings = useChildStore((s) => s.updateSettings);

  const activeChildId = useSettingsStore((s) => s.meta.activeChildId);
  const setActiveChild = useSettingsStore((s) => s.setActiveChild);
  // Per-child mood-check-in consent shows only when the parent-global switch is on
  // (Settings → Privacy). Turning it off for ONE child never affects siblings (§2.0).
  const moodLoggingEnabled = useSettingsStore((s) => s.parentSettings.moodLoggingEnabled);

  const list = index.filter((e) => !e.archived);
  const selectedId = activeChildId && profiles[activeChildId] ? activeChildId : list[0]?.id ?? null;
  const profile = selectedId ? profiles[selectedId] : undefined;
  const companion = useBuddyStore((s) => (selectedId ? s.companions[selectedId] : undefined));

  const addChild = () => {
    const id = createChildWithSeed({
      displayName: "New child",
      ageMode: "young",
      timeZone: deviceTimeZone(),
    });
    setActiveChild(id);
  };

  return (
    <ParentScreen title="Children">
      {/* child selector */}
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: t.spacing(2) }}>
        {list.map((e) => (
          <Chip
            key={e.id}
            label={e.displayName}
            selected={e.id === selectedId}
            onPress={() => setActiveChild(e.id)}
          />
        ))}
        {/* Adding a NEW profile is gated; existing children are never touched. */}
        <PremiumGate
          feature="multiChild"
          currentCount={list.length}
          locked={<Chip label="✨ Add child" onPress={goToPaywall} />}
        >
          <Chip label="+ Add" onPress={addChild} />
        </PremiumGate>
      </View>

      {!profile || !selectedId ? (
        <Note>Add a child to get started.</Note>
      ) : (
        <>
          {/* name */}
          <Card>
            <SectionTitle>Name</SectionTitle>
            <TextInput
              value={profile.displayName}
              onChangeText={(v) => updateProfile(selectedId, { displayName: v })}
              placeholder="First name"
              placeholderTextColor={c.textDim}
              accessibilityLabel="Child name"
              style={{
                color: c.text,
                fontFamily: t.type.bodyLg.family,
                fontSize: t.type.bodyLg.size,
                backgroundColor: c.surfaceAlt,
                borderRadius: t.radius,
                borderWidth: 1,
                borderColor: c.border,
                paddingVertical: t.spacing(2),
                paddingHorizontal: t.spacing(3),
              }}
            />
          </Card>

          {/* age mode + LIVE side-by-side preview */}
          <Card>
            <SectionTitle>Age mode</SectionTitle>
            <Segmented<AgeMode>
              value={profile.ageMode}
              onChange={(v) => updateProfile(selectedId, { ageMode: v })}
              options={[
                { value: "young", label: "Younger (4–7)" },
                { value: "older", label: "Older (8–10)" },
                { value: "preteen", label: "Preteen (10–12)" },
              ]}
            />
            <Note>Preview — the same screens in both modes. The selected mode is highlighted.</Note>
            <ChildModePreview
              activeAgeMode={profile.ageMode}
              companionStyle={profile.settings.companionStyle}
              textFirst={profile.settings.textFirst}
              sensoryMode={profile.settings.sensoryMode}
              companion={companion}
            />
          </Card>

          {/* independent overrides */}
          <Card>
            <SectionTitle>Companion & reading (independent of age)</SectionTitle>

            <View style={{ gap: t.spacing(2) }}>
              <Text style={{ color: c.text, fontFamily: t.type.label.family, fontSize: t.type.label.size }}>Companion style</Text>
              <Segmented<CompanionStyle>
                value={profile.settings.companionStyle}
                onChange={(v) => updateSettings(selectedId, { companionStyle: v })}
                options={[
                  { value: "cuddly", label: "Cuddly" },
                  { value: "cool", label: "Cool" },
                  { value: "avatar", label: "Avatar" },
                ]}
              />
            </View>

            <View style={{ gap: t.spacing(2) }}>
              <Text style={{ color: c.text, fontFamily: t.type.label.family, fontSize: t.type.label.size }}>Shown first</Text>
              <Segmented<"pictures" | "words">
                value={profile.settings.textFirst ? "words" : "pictures"}
                onChange={(v) => updateSettings(selectedId, { textFirst: v === "words" })}
                options={[
                  { value: "pictures", label: "Pictures" },
                  { value: "words", label: "Words" },
                ]}
              />
              <Note>A fluent non-reader can keep pictures-first without the younger look.</Note>
            </View>

            <SettingRow
              label="Spoken labels"
              hint="Buttons read themselves aloud"
              right={
                <Toggle
                  value={profile.settings.spokenLabelsEnabled}
                  onValueChange={(v) => updateSettings(selectedId, { spokenLabelsEnabled: v })}
                  label="Spoken labels"
                />
              }
            />
          </Card>

          {/* sensory + calm */}
          <Card>
            <SectionTitle>Sensory</SectionTitle>
            <View style={{ gap: t.spacing(2) }}>
              <Text style={{ color: c.text, fontFamily: t.type.label.family, fontSize: t.type.label.size }}>Visual intensity</Text>
              <Segmented<SensoryMode>
                value={profile.settings.sensoryMode}
                onChange={(v) => updateSettings(selectedId, { sensoryMode: v })}
                options={[
                  { value: "standard", label: "Standard" },
                  { value: "lowStim", label: "Low-stim" },
                ]}
              />
            </View>
            <Divider />
            <SettingRow
              label="Calm mode"
              hint="Non-gamified: keeps routines, hides tokens & confetti"
              right={
                <Toggle
                  value={profile.settings.calmMode}
                  onValueChange={(v) => updateSettings(selectedId, { calmMode: v })}
                  label="Calm mode"
                />
              }
            />
          </Card>

          {/* per-child mood-check-in consent (mood-checkin §2.0) — only when the
              parent-global switch is on. Off for one child leaves siblings working. */}
          {moodLoggingEnabled ? (
            <Card>
              <SectionTitle>Mood check-ins · {profile.displayName}</SectionTitle>
              <SettingRow
                label="Mood check-ins for this child"
                hint="Optional emoji check-in. Off here only affects this child; on-device only."
                right={
                  <Toggle
                    value={profile.settings.moodCheckinEnabled ?? true}
                    onValueChange={(v) => updateSettings(selectedId, { moodCheckinEnabled: v })}
                    label="Mood check-ins for this child"
                  />
                }
              />
            </Card>
          ) : null}

          {/* Focus timer (focus-intervals §4.MODIFY #18) — shown ONLY for older kids,
              gated via the resolver's `focusIntervalsAvailable` (never a raw `=== "older"`
              read). Always FREE — never paywalled. */}
          {resolveCapabilities({ ageMode: profile.ageMode }).focusIntervalsAvailable ? (
            <Card>
              <SectionTitle>Focus timer · {profile.displayName}</SectionTitle>
              <SettingRow
                label="Focus timer (older kids)"
                hint="An optional, adjustable focus/break timer. Not a treatment — just a tool."
                right={
                  <Toggle
                    value={focusConfigOf(profile.settings).enabled}
                    onValueChange={(v) =>
                      updateSettings(selectedId, {
                        focusIntervals: { ...focusConfigOf(profile.settings), enabled: v },
                      })
                    }
                    label="Focus timer"
                  />
                }
              />
              <View style={{ gap: t.spacing(2) }}>
                <Text style={{ color: c.text, fontFamily: t.type.label.family, fontSize: t.type.label.size }}>
                  Focus length
                </Text>
                <Segmented<string>
                  value={String(focusConfigOf(profile.settings).focusMinutes)}
                  onChange={(v) =>
                    updateSettings(selectedId, {
                      focusIntervals: { ...focusConfigOf(profile.settings), focusMinutes: Number(v) },
                    })
                  }
                  options={FOCUS_MINUTE_OPTIONS.map((m) => ({ value: String(m), label: `${m}m` }))}
                />
              </View>
              <View style={{ gap: t.spacing(2) }}>
                <Text style={{ color: c.text, fontFamily: t.type.label.family, fontSize: t.type.label.size }}>
                  Break length
                </Text>
                <Segmented<string>
                  value={String(focusConfigOf(profile.settings).breakMinutes)}
                  onChange={(v) =>
                    updateSettings(selectedId, {
                      focusIntervals: { ...focusConfigOf(profile.settings), breakMinutes: Number(v) },
                    })
                  }
                  options={BREAK_MINUTE_OPTIONS.map((m) => ({ value: String(m), label: `${m}m` }))}
                />
              </View>
              <SettingRow
                label="Active movement breaks"
                hint="Show a get-up-and-move prompt on breaks (vs a plain rest)."
                right={
                  <Toggle
                    value={focusConfigOf(profile.settings).movementBreaks}
                    onValueChange={(v) =>
                      updateSettings(selectedId, {
                        focusIntervals: { ...focusConfigOf(profile.settings), movementBreaks: v },
                      })
                    }
                    label="Active movement breaks"
                  />
                }
              />
              <SettingRow
                label="Transition chime"
                hint="A soft sound at each block change. Ducks other audio; never nags."
                right={
                  <Toggle
                    value={focusConfigOf(profile.settings).chime}
                    onValueChange={(v) =>
                      updateSettings(selectedId, {
                        focusIntervals: { ...focusConfigOf(profile.settings), chime: v },
                      })
                    }
                    label="Transition chime"
                  />
                }
              />
              <Note>
                Offered only for older kids and only when you turn it on. It earns no
                bubbles — it&apos;s an organizational tool, not a treatment, and is never
                marketed as ADHD-proven.
              </Note>
            </Card>
          ) : null}

          {/* autonomy */}
          <Card>
            <SectionTitle>Autonomy</SectionTitle>
            <SettingRow
              label="Let child suggest tasks"
              hint="Suggestions wait in your approval queue"
              right={
                <Toggle
                  value={profile.settings.autonomy.canAddTasks}
                  onValueChange={(v) =>
                    updateSettings(selectedId, {
                      autonomy: { ...profile.settings.autonomy, canAddTasks: v },
                    })
                  }
                  label="Let child suggest tasks"
                />
              }
            />
            <SettingRow
              label="Let child choose step order"
              hint="Younger: pick what's next. Older: reorder the checklist."
              right={
                <Toggle
                  value={profile.settings.autonomy.canReorderSteps}
                  onValueChange={(v) =>
                    updateSettings(selectedId, {
                      autonomy: { ...profile.settings.autonomy, canReorderSteps: v },
                    })
                  }
                  label="Let child choose step order"
                />
              }
            />
            <SettingRow
              label="Let child customize buddy"
              hint="Colors, finish & accessories. Renaming stays on."
              right={
                <Toggle
                  value={profile.settings.autonomy.canCustomizeCompanion}
                  onValueChange={(v) =>
                    updateSettings(selectedId, {
                      autonomy: { ...profile.settings.autonomy, canCustomizeCompanion: v },
                    })
                  }
                  label="Let child customize buddy"
                />
              }
            />
            <SettingRow
              label="Let child ask for rewards"
              hint="Suggestions still need your OK."
              right={
                <Toggle
                  value={profile.settings.autonomy.canPickReward}
                  onValueChange={(v) =>
                    updateSettings(selectedId, {
                      autonomy: { ...profile.settings.autonomy, canPickReward: v },
                    })
                  }
                  label="Let child ask for rewards"
                />
              }
            />
          </Card>

          <PrimaryButton label="Assign tasks for this child" onPress={() => router.push("/(parent)/tasks")} />

          {/* Shared / rotating chores across siblings (multi-child §2.2) — only with
              ≥2 children (a rotation needs a roster). */}
          {list.length > 1 ? (
            <Card>
              <SettingRow
                icon="🔁"
                label="Shared chores"
                hint="Rotate a chore fairly across your kids"
                onPress={() => router.push("/(parent)/chores")}
              />
            </Card>
          ) : null}

          {list.length > 1 ? (
            <View style={{ alignItems: "center", marginTop: t.spacing(2) }}>
              <TextButton
                label={`Remove ${profile.displayName}`}
                tone="danger"
                onPress={() => {
                  // removeChild archives the child, prunes them from every shared-chore
                  // roster (deactivating any left with <2), deletes their verify photos,
                  // and reassigns the active child (multi-child §3.4). Never a data loss
                  // for the OTHER children — acquisition-only gating is untouched.
                  removeChild(selectedId);
                }}
              />
            </View>
          ) : null}
        </>
      )}
    </ParentScreen>
  );
}
