/**
 * components/celebration/CelebrationOverlay.tsx — the in-place celebration burst.
 *
 * Rendered ABOVE the runner and driven imperatively by `useCelebration` so the
 * <300ms multisensory window is met (doc 61 §8.1 / doc 66 M7). It is
 * NON-BLOCKING and interruptible: `pointerEvents="none"` means the child can tap
 * the next step immediately and this gracefully fades over the top.
 *
 * SIZE comes from the `level` the resolver chose (doc 66 §1b.3) — this component
 * never decides magnitude, it only renders it:
 *   - full / medium -> halo ripple + Confetti bubble-burst + praise pill + "+N"
 *   - gentle / calm -> a single soft ripple + a quiet praise pill (lowStim /
 *     reduced-motion / quiet-hours), NO confetti (doc 61 §8.4).
 *
 * There is no "failure" visual state anywhere here — only positive feedback.
 */
import React, { useEffect } from "react";
import { Text, View } from "react-native";
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { announce } from "../../src/a11y/announce";
import { decorative } from "../../src/a11y/props";
import { useCopy } from "../../src/i18n/useLocale";
import { useThemeTokens } from "../../src/theme/useThemeTokens";
import type { ActiveCelebration } from "../../hooks/useCelebration";

import Confetti from "./Confetti";

export interface CelebrationOverlayProps {
  celebration: ActiveCelebration | null;
}

const CONFETTI_BY_LEVEL = { full: 18, medium: 12, gentle: 0, calm: 0 } as const;

export default function CelebrationOverlay({ celebration }: CelebrationOverlayProps) {
  const t = useThemeTokens();
  const copy = useCopy();

  // Screen-reader: announce ONCE per burst so a VoiceOver/TalkBack user hears one
  // warm line (never the 18 decorative bubble nodes, which are hidden below). This
  // is fire-and-forget — it never blocks the sub-300ms visual/haptic path (§2.1).
  useEffect(() => {
    if (!celebration) return;
    const line =
      celebration.tokenDelta > 0
        ? `${celebration.copy} ${copy("a11y.tokenEarned")}`
        : celebration.copy;
    announce(line);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [celebration?.key]);

  // halo ripple (hooks must run unconditionally — render gate is below)
  const ripple = useSharedValue(0);
  useEffect(() => {
    if (!celebration) return;
    ripple.value = 0;
    ripple.value = withTiming(1, { duration: 520, easing: Easing.out(Easing.cubic) });
  }, [celebration?.key, ripple]);

  const rippleStyle = useAnimatedStyle(() => {
    "worklet";
    return {
      opacity: 0.5 * (1 - ripple.value),
      transform: [{ scale: 0.2 + 2.0 * ripple.value }],
    };
  });

  if (!celebration) return null;

  const c = t.colors;
  const count = CONFETTI_BY_LEVEL[celebration.level];
  // multi-hue only when the palette allows it (single hue in lowStim, doc 61 §8.4)
  const hues = t.confetti ? c.celebration : [c.celebration[0]];
  const burstSize = Math.min(t.contentMaxWidth, 320);

  return (
    <View
      pointerEvents="none"
      {...decorative()}
      style={{
        ...absoluteFill,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* soft halo ripple from the centre */}
      <Animated.View
        pointerEvents="none"
        style={[
          {
            position: "absolute",
            width: burstSize * 0.7,
            height: burstSize * 0.7,
            borderRadius: 999,
            backgroundColor: c.tokenGlow,
          },
          rippleStyle,
        ]}
      />

      {/* the bubble-burst (none on gentle/calm -> ripple alone) */}
      <Confetti
        count={count}
        hues={hues}
        playKey={celebration.key}
        spread={burstSize}
        enabled={t.confetti || count > 0}
      />

      {/* praise pill + "+N" token chip */}
      <Animated.View
        key={celebration.key}
        entering={FadeIn.duration(160)}
        exiting={FadeOut.duration(160)}
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: t.spacing(2),
          backgroundColor: c.surface,
          borderRadius: t.radius * 1.5,
          paddingVertical: t.spacing(2.5),
          paddingHorizontal: t.spacing(4),
          borderWidth: 1,
          borderColor: c.border,
          shadowColor: "#0A2034",
          shadowOpacity: 0.12,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 4 },
          elevation: 4,
        }}
      >
        <Text
          style={{
            color: c.text,
            fontFamily: t.type.h2.family,
            fontSize: t.type.h2.size,
            fontWeight: t.type.h2.weight,
          }}
        >
          {celebration.copy}
        </Text>
        {celebration.tokenDelta > 0 ? (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 4,
              backgroundColor: c.successSurface,
              borderRadius: 999,
              paddingVertical: 4,
              paddingHorizontal: 10,
            }}
          >
            <Text style={{ fontSize: t.type.body.size }}>🫧</Text>
            <Text
              style={{
                color: c.success,
                fontFamily: t.type.label.family,
                fontSize: t.type.label.size,
                fontWeight: "700",
              }}
            >
              +{celebration.tokenDelta}
            </Text>
          </View>
        ) : null}
      </Animated.View>
    </View>
  );
}

const absoluteFill = {
  position: "absolute" as const,
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
};
