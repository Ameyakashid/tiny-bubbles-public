/**
 * app/(kid)/mood.tsx — the opt-in mood / energy check-in (mood-checkin §2.2).
 *
 * A deliberately UN-gamified pushed-modal surface (modeled on `calm.tsx` /
 * `peek.tsx`): NO tokens, NO confetti, NO celebration, NO streak, NO score. The
 * child taps a weather face (and, optionally, an energy level), one "Check in" tap
 * logs it on-device, and a warm "thanks" line shows. A `rough`/`okay` pick is met
 * with warmth + an OPTIONAL calm-breaths offer — never a correction, never a sad
 * pet (there is structurally no negative companion mood).
 *
 * Age differences flow ONLY through `resolveMoodCheckin` + `resolveContent` (never
 * a raw `ageMode` branch — doc 66 §2).
 * The write is defensively re-gated on `moodLoggingEnabled` so a stale deep-link can
 * never log against an opted-out family (§2.2).
 */
import React, { useEffect, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { ENERGY_CELLS_OLDER, ENERGY_CELLS_YOUNG, MOOD_FACE_BY_MOOD } from "../../src/data/moodScale";
import { getDaypart, isoDay } from "../../src/domain/dates";
import type { Mood } from "../../src/domain/types";
import { speak } from "../../src/services/tts";
import { useChildStore } from "../../src/state/childStore";
import { useSettingsStore } from "../../src/state/settingsStore";
import { resolveContent } from "../../src/theme/resolveContent";
import { resolveMoodCheckin } from "../../src/theme/resolveMoodCheckin";
import { useThemeInputs } from "../../src/theme/ThemeProvider";
import { useThemeTokens } from "../../src/theme/useThemeTokens";
import MoodGrid from "../../components/mood/MoodGrid";
import EnergyGrid from "../../components/mood/EnergyGrid";

export default function MoodCheckin() {
  const t = useThemeTokens();
  const c = t.colors;
  const { ageMode, sensoryMode } = useThemeInputs();
  const router = useRouter();

  const cfg = resolveMoodCheckin({ ageMode, sensoryMode });
  // Final animate decision: resolver (lowStim) AND OS Reduce-Motion (§2.4/§4.2).
  const animate = cfg.animateSelect && t.motion.loopsEnabled;

  const activeChildId = useSettingsStore((s) => s.meta.activeChildId);
  const moodLoggingEnabled = useSettingsStore((s) => s.parentSettings.moodLoggingEnabled);
  const profile = useChildStore((s) => (activeChildId ? s.profiles[activeChildId] : undefined));
  const addMood = useChildStore((s) => s.addMood);

  const spokenEnabled = profile?.settings.spokenLabelsEnabled ?? true;
  const tz = profile?.timeZone ?? "UTC";

  const [selectedMood, setSelectedMood] = useState<Mood | null>(null);
  const [selectedEnergy, setSelectedEnergy] = useState<number | null>(null);
  const [logged, setLogged] = useState(false);

  // Auto-speak the prompt for young (pervasive TTS); older speaks on tap only (§2.2).
  useEffect(() => {
    if (cfg.autoSpeakPrompt && spokenEnabled) {
      speak(resolveContent("mood.prompt", { ageMode }), { ageMode, enabled: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const say = (text: string) => {
    if (spokenEnabled) speak(text, { ageMode, enabled: true });
  };

  const onSelectMood = (m: Mood) => {
    setSelectedMood(m);
    say(MOOD_FACE_BY_MOOD[m].spokenLabel);
  };

  const onSelectEnergy = (value: number) => {
    setSelectedEnergy(value);
    const cells = cfg.energyLevels === 3 ? ENERGY_CELLS_YOUNG : ENERGY_CELLS_OLDER;
    const cell = cells.find((x) => x.value === value);
    if (cell) say(cell.spokenLabel);
  };

  const commit = () => {
    if (!selectedMood) return;
    // Defensive second gate (§2.2): only ever write when logging is actually on.
    if (moodLoggingEnabled && activeChildId) {
      const now = Date.now();
      addMood(activeChildId, {
        ts: now,
        day: isoDay(now, tz),
        daypart: getDaypart(now, tz),
        mood: selectedMood,
        source: "kid",
        ...(selectedEnergy != null
          ? { energy: selectedEnergy, energyScaleMax: cfg.energyScaleMax }
          : {}),
      });
    }
    setLogged(true);
    say(resolveContent("mood.thanks", { ageMode }));
  };

  const close = () => router.back();
  const offersCalm = logged && (selectedMood === "rough" || selectedMood === "okay");
  const goCalm = () => router.replace("/(kid)/calm");

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.canvas }} edges={["top"]}>
      {/* header + close (same pattern as peek.tsx) */}
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
          {resolveContent("mood.prompt", { ageMode })}
        </Text>
        <Pressable
          onPress={close}
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
          gap: t.spacing(6),
          maxWidth: t.contentMaxWidth,
          alignSelf: "center",
          width: "100%",
          alignItems: "center",
        }}
      >
        {logged ? (
          <View style={{ alignItems: "center", gap: t.spacing(5), paddingTop: t.spacing(6) }}>
            <Text style={{ fontSize: 64 }}>{MOOD_FACE_BY_MOOD[selectedMood ?? "good"].emoji}</Text>
            <Text
              style={{
                color: c.text,
                fontFamily: t.type.h1.family,
                fontSize: t.type.h1.size,
                fontWeight: "700",
                textAlign: "center",
              }}
            >
              {resolveContent("mood.thanks", { ageMode })}
            </Text>

            {/* calm tie-in — ONLY for rough/okay, always OPTIONAL (§2.2 anti-shame) */}
            {offersCalm ? (
              <Pressable
                onPress={goCalm}
                accessibilityRole="button"
                style={{
                  minHeight: t.touchTargetMin,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: t.spacing(2),
                  paddingHorizontal: t.spacing(5),
                  paddingVertical: t.spacing(3),
                  borderRadius: t.radius * 1.4,
                  backgroundColor: c.primary,
                }}
              >
                <Text style={{ fontSize: t.type.h2.size }}>🫧</Text>
                <Text
                  style={{
                    color: c.onPrimary,
                    fontFamily: t.type.label.family,
                    fontSize: t.type.bodyLg.size,
                    fontWeight: "700",
                  }}
                >
                  {resolveContent("mood.calmOffer", { ageMode })}
                </Text>
              </Pressable>
            ) : null}

            <Pressable onPress={close} accessibilityRole="button" style={{ paddingVertical: 10, paddingHorizontal: 16 }}>
              <Text style={{ color: c.textDim, fontFamily: t.type.label.family, fontSize: t.type.label.size }}>
                {resolveContent("task.done", { ageMode })}
              </Text>
            </Pressable>
          </View>
        ) : (
          <>
            <MoodGrid selected={selectedMood} onSelect={onSelectMood} config={cfg} animate={animate} />

            {cfg.showEnergy ? (
              <View style={{ width: "100%", alignItems: "center", gap: t.spacing(3) }}>
                <Text
                  style={{
                    color: c.textDim,
                    fontFamily: t.type.label.family,
                    fontSize: t.type.body.size,
                  }}
                >
                  {resolveContent("mood.energyPrompt", { ageMode })}
                </Text>
                <EnergyGrid selected={selectedEnergy} onSelect={onSelectEnergy} config={cfg} />
              </View>
            ) : null}

            {/* one-tap confirm — logs the mood (energy included if chosen) */}
            <Pressable
              onPress={commit}
              disabled={!selectedMood}
              accessibilityRole="button"
              accessibilityState={{ disabled: !selectedMood }}
              accessibilityLabel={resolveContent("mood.checkIn", { ageMode })}
              style={{
                minHeight: t.primaryActionMin,
                width: "100%",
                maxWidth: 420,
                borderRadius: t.radius,
                alignItems: "center",
                justifyContent: "center",
                paddingHorizontal: t.spacing(4),
                backgroundColor: selectedMood ? c.primary : c.surfaceSunken,
                opacity: selectedMood ? 1 : 0.6,
              }}
            >
              <Text
                style={{
                  color: selectedMood ? c.onPrimary : c.textDim,
                  fontFamily: t.type.label.family,
                  fontSize: t.type.bodyLg.size,
                  fontWeight: "700",
                }}
              >
                {resolveContent("mood.checkIn", { ageMode })}
              </Text>
            </Pressable>

            {/* skip — closes without logging (never required, §2.2) */}
            <Pressable onPress={close} accessibilityRole="button" style={{ paddingVertical: 8, paddingHorizontal: 16 }}>
              <Text style={{ color: c.textDim, fontFamily: t.type.label.family, fontSize: t.type.label.size }}>
                {resolveContent("mood.skip", { ageMode })}
              </Text>
            </Pressable>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
