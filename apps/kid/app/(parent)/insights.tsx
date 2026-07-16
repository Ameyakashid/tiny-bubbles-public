/**
 * app/(parent)/insights.tsx — the parent mood/energy insight screen (mood-checkin
 * §2.5). Reachable only inside the PIN-gated `(parent)` group (the bare `<Stack>`
 * in `(parent)/_layout.tsx` auto-guards it via the `parentUnlocked` redirect).
 *
 * Strictly READ-ONLY, DESCRIPTIVE, NON-DIAGNOSTIC (ZERO AI, §7):
 *   - FREE: the recent check-ins list (renders for every tier).
 *   - PREMIUM (`advancedInsights`, mock-gated): the multi-week `MoodTrend`; free
 *     users get an honest, no-urgency "Plus shows trends over time" upsell instead.
 * Gating blocks the TREND view only — it never removes or hides any logged mood.
 *
 * Parent-facing + dense; uses `ageModeLabel` (no raw `ageMode`). Nothing is ever
 * uploaded — the whole view is on-device.
 */
import React from "react";
import { Text, View } from "react-native";

import { MOOD_FACE_BY_MOOD } from "../../src/data/moodScale";
import { recentMoods } from "../../src/domain/moodInsight";
import { getMessage } from "../../src/i18n/messages";
import { useChildStore } from "../../src/state/childStore";
import { useSettingsStore } from "../../src/state/settingsStore";
import { ageModeLabel } from "../../src/theme/resolveContent";
import { useThemeTokens } from "../../src/theme/useThemeTokens";

import { Card, Note, ParentScreen, SectionTitle } from "../../components/parent/ui";
import { PremiumGate, goToPaywall } from "../../components/parent/PremiumGate";
import MoodTrend from "../../components/mood/MoodTrend";

const TREND_DAYS = 30;

export default function InsightsScreen() {
  const t = useThemeTokens();
  const c = t.colors;

  const activeChildId = useSettingsStore((s) => s.meta.activeChildId);
  const moodLoggingEnabled = useSettingsStore((s) => s.parentSettings.moodLoggingEnabled);
  const profile = useChildStore((s) => (activeChildId ? s.profiles[activeChildId] : undefined));
  const logs = useChildStore((s) => (activeChildId ? s.moods[activeChildId] ?? [] : []));

  const tz = profile?.timeZone ?? "UTC";
  const now = Date.now();
  const recent = recentMoods(logs, 10);
  const hasLogs = logs.some((l) => l.mood !== undefined);

  return (
    <ParentScreen
      title="Check-ins"
      subtitle={
        profile ? `${profile.displayName} · ${ageModeLabel(profile.ageMode)} · on this device only` : "On this device only"
      }
    >
      {!moodLoggingEnabled ? (
        <Card>
          <Note>Mood check-ins are off. Turn them on in Settings → Privacy to see check-ins here.</Note>
        </Card>
      ) : !profile ? (
        <Card>
          <Note>Pick a child from the dashboard to see their check-ins.</Note>
        </Card>
      ) : !hasLogs ? (
        <Card>
          <SectionTitle>Recent check-ins</SectionTitle>
          <Note>{getMessage("mood.insightsEmpty", { ageMode: profile.ageMode })}</Note>
        </Card>
      ) : (
        <>
          {/* FREE — the recent check-ins list (all tiers) */}
          <Card>
            <SectionTitle>Recent check-ins</SectionTitle>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: t.spacing(2) }}>
              {recent.map((log) => (
                <View
                  key={log.id}
                  style={{
                    alignItems: "center",
                    gap: 2,
                    paddingVertical: 6,
                    paddingHorizontal: 10,
                    borderRadius: 999,
                    backgroundColor: c.surfaceAlt,
                    borderWidth: 1,
                    borderColor: c.border,
                  }}
                >
                  <Text style={{ fontSize: 20 }}>{MOOD_FACE_BY_MOOD[log.mood!].emoji}</Text>
                  <Text style={{ color: c.textDim, fontSize: 10 }}>{log.day.slice(5)}</Text>
                </View>
              ))}
            </View>
            <Note>Exactly what your child tapped — on this device, never uploaded.</Note>
          </Card>

          {/* PREMIUM — the multi-week trend; free sees an honest upsell (no urgency) */}
          <Card>
            <SectionTitle>Over time</SectionTitle>
            <PremiumGate
              feature="advancedInsights"
              locked={
                <View style={{ gap: t.spacing(2) }}>
                  <Note>Plus shows trends over time — a multi-week view of check-ins and energy by time of day.</Note>
                  <Text
                    onPress={goToPaywall}
                    accessibilityRole="button"
                    style={{ color: c.primary, fontFamily: t.type.label.family, fontSize: t.type.label.size, fontWeight: "700" }}
                  >
                    See Tiny Bubbles Plus ›
                  </Text>
                </View>
              }
            >
              <MoodTrend logs={logs} tz={tz} now={now} days={TREND_DAYS} showNumbers />
            </PremiumGate>
          </Card>
        </>
      )}
    </ParentScreen>
  );
}
