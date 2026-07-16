/**
 * components/mood/MoodTrend.tsx — the parent-side, READ-ONLY mood/energy view
 * (mood-checkin §2.5). Strictly DESCRIPTIVE + NON-DIAGNOSTIC: a literal emoji
 * timeline of what the child tapped + count/energy summaries — NEVER an emotional
 * label or computed judgment (ZERO AI, §7). All numbers are counts of the child's
 * literal taps, fed by the pure `moodInsight.ts` selectors.
 *
 * Enforced by the banned-interpretation grep gate (BUILD-GUIDE §3): every string
 * here is a plain description of counts, never a forecast or a feeling word.
 */
import React from "react";
import { ScrollView, Text, View } from "react-native";

import { MOOD_FACE_BY_MOOD, MOOD_FACES } from "../../src/data/moodScale";
import { ONE_DAY_MS } from "../../src/domain/constants";
import { isoDay } from "../../src/domain/dates";
import {
  dominantMoods,
  energyByDaypart,
  moodCountsInRange,
  moodTimeline,
} from "../../src/domain/moodInsight";
import type { Daypart, MoodLog } from "../../src/domain/types";
import { useThemeTokens } from "../../src/theme/useThemeTokens";

const DAYPART_TITLE: Record<Daypart, string> = {
  morning: "Morning",
  afternoon: "Afternoon",
  evening: "Evening",
  night: "Night",
};

export interface MoodTrendProps {
  logs: MoodLog[];
  tz: string;
  now: number;
  /** how many days back the multi-week view covers (e.g. 30) */
  days: number;
  /** parent-facing numeric detail (from `showNumbersAndCharts`) */
  showNumbers: boolean;
}

export default function MoodTrend({ logs, tz, now, days, showNumbers }: MoodTrendProps) {
  const t = useThemeTokens();
  const c = t.colors;

  const toDay = isoDay(now, tz);
  const fromDay = isoDay(now - Math.max(0, days - 1) * ONE_DAY_MS, tz);
  const counts = moodCountsInRange(logs, fromDay, toDay);
  const timeline = moodTimeline(logs, days, now, tz);
  const byDaypart = energyByDaypart(logs, tz);
  const top = dominantMoods(counts);

  return (
    <View style={{ gap: t.spacing(4) }}>
      {/* "most check-ins were …" — a pure count fact (never a judgment) */}
      {top.length > 0 ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: t.spacing(2), flexWrap: "wrap" }}>
          <Text style={{ color: c.textDim, fontSize: t.type.body.size }}>Most check-ins were</Text>
          {top.map((m) => (
            <Text key={m} style={{ fontSize: 22 }}>
              {MOOD_FACE_BY_MOOD[m].emoji}
            </Text>
          ))}
        </View>
      ) : null}

      {/* per-mood counts */}
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: t.spacing(3) }}>
        {MOOD_FACES.map((face) => (
          <View key={face.mood} style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Text style={{ fontSize: 20 }}>{face.emoji}</Text>
            <Text style={{ color: c.text, fontWeight: "700", fontSize: t.type.body.size }}>
              {showNumbers ? counts[face.mood] : counts[face.mood] > 0 ? "•" : "·"}
            </Text>
          </View>
        ))}
      </View>

      {/* the read-only emoji timeline (oldest → newest) */}
      <View style={{ gap: t.spacing(2) }}>
        <Text style={{ color: c.textDim, fontSize: t.type.caption.size, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5 }}>
          Last {days} days
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: t.spacing(2) }}>
          {timeline.map((p) => (
            <View
              key={p.ts}
              style={{
                alignItems: "center",
                gap: 2,
                paddingVertical: 6,
                paddingHorizontal: 8,
                borderRadius: t.radius,
                backgroundColor: c.surfaceAlt,
                borderWidth: 1,
                borderColor: c.border,
              }}
            >
              <Text style={{ fontSize: 20 }}>{MOOD_FACE_BY_MOOD[p.mood].emoji}</Text>
              <Text style={{ color: c.textDim, fontSize: 10 }}>{p.day.slice(5)}</Text>
            </View>
          ))}
        </ScrollView>
      </View>

      {/* energy by time of day — average bar + count (descriptive) */}
      <View style={{ gap: t.spacing(2) }}>
        <Text style={{ color: c.textDim, fontSize: t.type.caption.size, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5 }}>
          Energy by time of day
        </Text>
        {(Object.keys(DAYPART_TITLE) as Daypart[])
          .filter((dp) => byDaypart[dp].count > 0)
          .map((dp) => {
            const { count, avgNormalized } = byDaypart[dp];
            return (
              <View key={dp} style={{ flexDirection: "row", alignItems: "center", gap: t.spacing(3) }}>
                <Text style={{ color: c.text, fontSize: t.type.caption.size, width: 76 }}>
                  {DAYPART_TITLE[dp]}
                </Text>
                <View
                  style={{
                    flex: 1,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: c.surfaceSunken,
                    overflow: "hidden",
                  }}
                >
                  <View
                    style={{
                      width: `${Math.round(avgNormalized * 100)}%`,
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: c.primary,
                    }}
                  />
                </View>
                {showNumbers ? (
                  <Text style={{ color: c.textDim, fontSize: t.type.caption.size, width: 44, textAlign: "right" }}>
                    {count}×
                  </Text>
                ) : null}
              </View>
            );
          })}
      </View>
    </View>
  );
}
