/**
 * components/rewards/TokenMeter.tsx — the kid's spendable-bubble header (doc 63
 * Feature 2/7, doc 66 M8).
 *
 * Shows the SPENDABLE balance (`availableBalance` — balance minus any escrow
 * holds) as a friendly bubble count, with a soft pop when it changes so earning
 * feels rewarding. Held tokens (reserved by a pending request) are shown only as
 * a gentle "N saved for a treat" aside — never as a deduction or a debt
 * (anti-loss-aversion, doc 66 §5). Reads resolved tokens; no age branching.
 */
import React, { useEffect } from "react";
import { Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
} from "react-native-reanimated";

import { liveValue } from "../../src/a11y/props";
import { formatCount } from "../../src/i18n/messages";
import { useCopy } from "../../src/i18n/useLocale";
import { useThemeTokens } from "../../src/theme/useThemeTokens";

export interface TokenMeterProps {
  /** spendable now (already net of holds) */
  balance: number;
  /** tokens reserved by a pending redemption request (escrow) */
  held?: number;
}

export default function TokenMeter({ balance, held = 0 }: TokenMeterProps) {
  const t = useThemeTokens();
  const c = t.colors;
  const copy = useCopy();

  // Screen-reader: the running total is spoken on change via a polite live region
  // + accessibilityValue, without stealing focus from the task path (§2.1).
  const shown = Math.max(0, balance);
  const balanceText = formatCount(shown, copy("unit.bubble.one"), copy("unit.bubble.other"));

  const scale = useSharedValue(1);
  useEffect(() => {
    if (t.animationDurationScale <= 0) return;
    scale.value = withSequence(
      withSpring(1.14, { damping: 8, stiffness: 200, mass: 0.6 }),
      withSpring(1, { damping: 15, stiffness: 160, mass: 0.8 }),
    );
  }, [balance, t.animationDurationScale, scale]);

  const animStyle = useAnimatedStyle(() => {
    "worklet";
    return { transform: [{ scale: scale.value }] };
  });

  return (
    <View style={{ alignItems: "center", gap: 2 }}>
      <Animated.View
        accessible
        accessibilityLabel={balanceText}
        {...liveValue(balanceText)}
        style={[
          {
            flexDirection: "row",
            alignItems: "center",
            gap: t.spacing(2),
            backgroundColor: c.surface,
            borderRadius: 999,
            paddingVertical: t.spacing(2),
            paddingHorizontal: t.spacing(4),
            borderWidth: 1,
            borderColor: c.border,
          },
          animStyle,
        ]}
      >
        <Text style={{ fontSize: 26 }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">🫧</Text>
        <Text
          style={{
            color: c.text,
            fontFamily: t.type.display.family,
            fontSize: t.type.h1.size,
            fontWeight: "700",
          }}
        >
          {Math.max(0, balance)}
        </Text>
      </Animated.View>
      {held > 0 ? (
        <Text style={{ color: c.textDim, fontSize: t.type.caption.size }}>
          {held} saved for a treat 💛
        </Text>
      ) : null}
    </View>
  );
}
