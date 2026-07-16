/**
 * components/progress/GoalBar.tsx — the older "save toward a reward" bar (doc 63
 * Feature 2(c)/6, doc 66 M8).
 *
 * Shown only for older kids who can read numbers/charts — the CALLER gates this
 * on `capabilities.showNumbersAndCharts` (this component never branches on age,
 * doc 66 §2). It visualises progress toward a single chosen reward
 * (`ProgressState.savingTowardRewardId`) with the goal-gradient framing:
 * "N more bubbles!" — encouragement, NEVER a sales pitch or a countdown (doc 63
 * §2(d)). At/over cost it reads "Ready!" — a positive, never a pressure cue.
 *
 * The fill animates (honouring reduced motion); no economy mutation here.
 */
import React, { useEffect } from "react";
import { Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { bubblesUntil } from "../../src/domain/progressMeter";
import type { Reward } from "../../src/domain/types";
import { useThemeTokens } from "../../src/theme/useThemeTokens";

export interface GoalBarProps {
  reward: Reward;
  /** spendable balance (availableBalance — excludes escrow holds) */
  balance: number;
  /** optional: clear the saved-toward goal */
  onClear?: () => void;
}

export default function GoalBar({ reward, balance, onClear }: GoalBarProps) {
  const t = useThemeTokens();
  const c = t.colors;

  const cost = Math.max(1, reward.costTokens);
  const fraction = Math.max(0, Math.min(1, balance / cost));
  const remaining = bubblesUntil(balance, cost);
  const ready = remaining === 0;

  const w = useSharedValue(fraction);
  useEffect(() => {
    const dur = 420 * t.animationDurationScale;
    w.value = dur > 0 ? withTiming(fraction, { duration: dur }) : fraction;
  }, [fraction, t.animationDurationScale, w]);

  const fillStyle = useAnimatedStyle(() => {
    "worklet";
    return { width: `${w.value * 100}%` };
  });

  return (
    <View
      style={{
        width: "100%",
        backgroundColor: c.surface,
        borderRadius: t.radius,
        padding: t.spacing(3),
        gap: t.spacing(2),
        borderWidth: 1,
        borderColor: c.border,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: t.spacing(2), flex: 1 }}>
          <Text style={{ fontSize: 20 }}>{reward.label.emoji ?? "⭐"}</Text>
          <Text
            numberOfLines={1}
            style={{
              color: c.text,
              fontFamily: t.type.label.family,
              fontSize: t.type.bodyLg.size,
              fontWeight: "600",
              flex: 1,
            }}
          >
            Saving for {reward.label.text ?? reward.label.spokenLabel}
          </Text>
        </View>
        {onClear ? (
          <Text
            onPress={onClear}
            accessibilityRole="button"
            style={{ color: c.textDim, fontSize: t.type.caption.size, paddingHorizontal: 6 }}
          >
            change
          </Text>
        ) : null}
      </View>

      {/* the bar */}
      <View
        style={{
          height: 16,
          borderRadius: 999,
          backgroundColor: c.surfaceSunken,
          overflow: "hidden",
        }}
      >
        <Animated.View
          style={[
            { height: "100%", borderRadius: 999, backgroundColor: c.token },
            fillStyle,
          ]}
        />
      </View>

      <Text style={{ color: ready ? c.success : c.textDim, fontSize: t.type.label.size, fontWeight: ready ? "700" : "400" }}>
        {ready ? "Ready! Ask a grown-up 🎉" : `${remaining} more bubbles! (${balance}/${cost})`}
      </Text>
    </View>
  );
}
