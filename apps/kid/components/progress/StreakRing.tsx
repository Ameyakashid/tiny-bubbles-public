/**
 * components/progress/StreakRing.tsx — the FORGIVING progress badge (doc 63
 * Feature 6, doc 66 M8).
 *
 * Streaks are off by default and opt-in (doc 63 §6(d)); this is rendered only
 * where the caller opts in (older + `showNumbersAndCharts`). It NEVER renders a
 * "0", a "broken", or a loss-aversion countdown — it consumes the pure
 * `streakDisplay()` selector whose two branches are anti-shame by construction:
 *
 *   - ACTIVE  -> the current day count + "best: N" as a non-losable badge.
 *   - RESTING -> LEADS with the cumulative "you popped N bubbles!" total + the
 *     "best: N" badge. The current (smaller) streak number is NEVER shown next to
 *     the larger best as a drop (the explicit anti-shame fix, doc 66 §M8).
 *
 * Pure presentation over `streakDisplay` — no economy mutation here.
 */
import React from "react";
import { Text, View } from "react-native";

import { streakDisplay } from "../../src/domain/streaks";
import type { ProgressState } from "../../src/domain/types";
import { useThemeTokens } from "../../src/theme/useThemeTokens";

export interface StreakRingProps {
  progress: ProgressState;
}

export default function StreakRing({ progress }: StreakRingProps) {
  const t = useThemeTokens();
  const c = t.colors;
  const d = streakDisplay(progress);

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: t.spacing(3),
        backgroundColor: c.surface,
        borderRadius: t.radius,
        paddingVertical: t.spacing(3),
        paddingHorizontal: t.spacing(4),
        borderWidth: 1,
        borderColor: c.border,
        width: "100%",
      }}
    >
      <View
        style={{
          width: 56,
          height: 56,
          borderRadius: 999,
          backgroundColor: c.successSurface,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text style={{ fontSize: 28 }}>{d.mode === "active" ? "🔆" : "🫧"}</Text>
      </View>

      <View style={{ flex: 1 }}>
        {d.mode === "active" ? (
          <>
            <Text
              style={{
                color: c.text,
                fontFamily: t.type.h2.family,
                fontSize: t.type.h2.size,
                fontWeight: "700",
              }}
            >
              {d.days === 1 ? "Day 1 — nice start!" : `${d.days} days in a row!`}
            </Text>
            <Text style={{ color: c.textDim, fontSize: t.type.caption.size }}>
              Keep going at your own pace
            </Text>
          </>
        ) : (
          <>
            {/* RESTING leads with the non-losable cumulative total — never a drop */}
            <Text
              style={{
                color: c.text,
                fontFamily: t.type.h2.family,
                fontSize: t.type.h2.size,
                fontWeight: "700",
              }}
            >
              You popped {d.cumulative} bubbles!
            </Text>
            <Text style={{ color: c.textDim, fontSize: t.type.caption.size }}>
              Pick up any time — your bubbles are always here
            </Text>
          </>
        )}
      </View>

      {/* "best: N" is ALWAYS a calm, non-losable lifetime badge (doc 66 §M8) */}
      <BestBadge best={d.best} c={c} t={t} />
    </View>
  );
}

function BestBadge({
  best,
  c,
  t,
}: {
  best: number;
  c: ReturnType<typeof useThemeTokens>["colors"];
  t: ReturnType<typeof useThemeTokens>;
}) {
  if (best <= 0) return null;
  return (
    <View
      style={{
        alignItems: "center",
        backgroundColor: c.surfaceAlt,
        borderRadius: t.radius,
        paddingVertical: 6,
        paddingHorizontal: 10,
        borderWidth: 1,
        borderColor: c.border,
      }}
    >
      <Text style={{ color: c.textDim, fontSize: t.type.caption.size }}>best</Text>
      <Text style={{ color: c.text, fontFamily: t.type.label.family, fontSize: t.type.bodyLg.size, fontWeight: "700" }}>
        {best}
      </Text>
    </View>
  );
}
