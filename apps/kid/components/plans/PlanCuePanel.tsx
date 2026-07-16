/**
 * components/plans/PlanCuePanel.tsx — the point-of-performance cue surface
 * (if-then-plans §2.3b/§2.3c). Shown in the runner the moment a linked step
 * completes (`afterStep`) and on the daypart-done panel (`afterRoutine`).
 *
 * A cue is NOT a reward: no confetti, no token, no haptic beyond a soft tick, and
 * it NEVER gates the next step — it is calm, non-blocking, and dismissible. The
 * optional "Do it now" appears only when the plan's action links a task. Copy +
 * framing flow from resolvers (`ageMode` only feeds `assemblePlanPhrase` /
 * `resolveContent`, never a branch). The entrance animation is gated on
 * `t.motion.loopsEnabled`, so under lowStim / OS Reduce-Motion it appears
 * INSTANTLY (no spring/scale).
 */
import React from "react";
import { Pressable, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import { assemblePlanPhrase } from "../../src/domain/plans";
import type { Plan } from "../../src/domain/types";
import { resolveContent } from "../../src/theme/resolveContent";
import { useThemeInputs } from "../../src/theme/ThemeProvider";
import { useThemeTokens } from "../../src/theme/useThemeTokens";

export interface PlanCuePanelProps {
  plan: Plan;
  /** "focal" = large single (young, below the focal step); "compact" = above the checklist (older) */
  variant?: "focal" | "compact";
  /** calm/non-gamified child — keep it plain */
  calm?: boolean;
  onDismiss: () => void;
  /** optional "Do it now" — only when the plan's action links a task */
  onDoItNow?: () => void;
}

export default function PlanCuePanel({
  plan,
  variant = "compact",
  calm = false,
  onDismiss,
  onDoItNow,
}: PlanCuePanelProps) {
  const t = useThemeTokens();
  const c = t.colors;
  const { ageMode } = useThemeInputs();
  const phrase = assemblePlanPhrase(plan, ageMode);
  const focal = variant === "focal";
  const actionEmoji = plan.action.label.emoji ?? "✨";

  return (
    <Animated.View
      // Motion gate: no spring/scale under lowStim / Reduce-Motion (instant).
      entering={t.motion.loopsEnabled ? FadeInDown.duration(180) : undefined}
      accessibilityRole="summary"
      style={{
        backgroundColor: c.surfaceAlt,
        borderRadius: t.radius,
        borderWidth: 1,
        borderColor: c.border,
        padding: t.spacing(3),
        gap: t.spacing(2),
        width: "100%",
        alignSelf: "center",
        maxWidth: t.contentMaxWidth,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Text
          style={{
            color: c.textDim,
            fontFamily: t.type.label.family,
            fontSize: t.type.caption.size,
            fontWeight: "700",
            textTransform: "uppercase",
            letterSpacing: 0.5,
          }}
        >
          {resolveContent("plans.now", { ageMode })}
        </Text>
        <Pressable
          onPress={onDismiss}
          accessibilityRole="button"
          accessibilityLabel="Dismiss"
          hitSlop={10}
        >
          <Text style={{ color: c.textDim, fontSize: 16 }}>✕</Text>
        </Pressable>
      </View>

      <View style={{ flexDirection: "row", alignItems: "center", gap: t.spacing(2) }}>
        <Text style={{ fontSize: focal ? 32 : 24 }}>{actionEmoji}</Text>
        <Text
          style={{
            flex: 1,
            color: c.text,
            fontFamily: focal ? t.type.h2.family : t.type.bodyLg.family,
            fontSize: focal ? t.type.h2.size : t.type.bodyLg.size,
            fontWeight: "700",
          }}
        >
          {phrase.action}
        </Text>
      </View>

      {onDoItNow && !calm ? (
        <Pressable
          onPress={onDoItNow}
          accessibilityRole="button"
          accessibilityLabel={resolveContent("plans.doItNow", { ageMode })}
          hitSlop={8}
          style={{
            alignSelf: "flex-start",
            paddingVertical: t.spacing(2),
            paddingHorizontal: t.spacing(3),
            borderRadius: 999,
            backgroundColor: c.surface,
            borderWidth: 1,
            borderColor: c.border,
          }}
        >
          <Text
            style={{
              color: c.primary,
              fontFamily: t.type.label.family,
              fontSize: t.type.label.size,
              fontWeight: "700",
            }}
          >
            {resolveContent("plans.doItNow", { ageMode })}
          </Text>
        </Pressable>
      ) : null}
    </Animated.View>
  );
}
