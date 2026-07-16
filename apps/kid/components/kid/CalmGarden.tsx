/**
 * components/kid/CalmGarden.tsx — the "stay-calm-to-grow" accretion visual
 * (feature `breathing-regulation`, M-C2).
 *
 * A gentle "calm garden": one soft bubble/leaf drifts in per COMPLETED breathing
 * cycle, up to the pattern's target, then rests "full for now." It grows purely as
 * a function of cycles finished (elapsed time on the activity) — NEVER of any
 * reading of the child's calm — and it is WITHIN-SESSION only (it resets each
 * visit), so there is no persistent score and nothing can ever be lost (anti-shame).
 *
 * Purely presentational: it takes a resolved `stage`/`target` and resolved motion
 * booleans (never a raw age/motion mode string, never an ageMode prop). It is a
 * soft "look what a calm minute looks like," never a bar, meter, or leaderboard,
 * and it uses no red/danger colour.
 */
import React, { useEffect } from "react";
import { View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { useThemeTokens } from "../../src/theme/useThemeTokens";

export interface CalmGardenProps {
  /** completed cycles so far (0..target) */
  stage: number;
  /** the pattern's `cyclesTarget` — how many bubbles fill the garden */
  target: number;
  /** gentle drift-in per cycle (off in lowStim / Reduce-Motion) */
  animate: boolean;
  /** dot diameter */
  size?: number;
}

export default function CalmGarden({ stage, target, animate, size = 22 }: CalmGardenProps) {
  const t = useThemeTokens();
  const c = t.colors;

  const slots = Math.max(1, Math.floor(target) || 1);
  const grown = Math.max(0, Math.min(slots, Math.floor(stage) || 0));

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: slots, now: grown }}
      style={{
        flexDirection: "row",
        flexWrap: "wrap",
        justifyContent: "center",
        alignItems: "center",
        gap: t.spacing(2),
        maxWidth: 320,
      }}
    >
      {Array.from({ length: slots }).map((_, i) =>
        i < grown ? (
          // a filled "grown" bubble that gently drifts in when it first appears
          <GardenBubble key={`grown-${i}`} hue={c.grow} size={size} animate={animate} />
        ) : (
          // a faint, un-grown placeholder (never a "missing"/"lost" state)
          <View
            key={`empty-${i}`}
            style={{
              width: size,
              height: size,
              borderRadius: 999,
              backgroundColor: c.surfaceSunken,
              opacity: 0.6,
            }}
          />
        ),
      )}
    </View>
  );
}

/** One grown garden bubble — fades/scales in on mount (per completed cycle). */
function GardenBubble({ hue, size, animate }: { hue: string; size: number; animate: boolean }) {
  const p = useSharedValue(animate ? 0 : 1);
  useEffect(() => {
    if (animate) p.value = withTiming(1, { duration: 600 });
  }, [animate, p]);
  const style = useAnimatedStyle(() => {
    "worklet";
    return { opacity: 0.5 + p.value * 0.5, transform: [{ scale: 0.7 + p.value * 0.3 }] };
  });
  return (
    <Animated.View
      style={[
        { width: size, height: size, borderRadius: 999, backgroundColor: hue },
        style,
      ]}
    />
  );
}
