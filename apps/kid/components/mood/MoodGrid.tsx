/**
 * components/mood/MoodGrid.tsx — the kid-facing 4-face mood grid (mood-checkin
 * §2.2 / §5). Each weather face is a big touch target (>= `t.touchTargetMin`),
 * carries its `spokenLabel`, and confirms selection with a calm scale/opacity —
 * ONLY when `animate` (composed from `resolveMoodCheckin(...).animateSelect` AND
 * OS Reduce-Motion in the parent); lowStim / Reduce-Motion get an instant, static
 * select (no spring).
 *
 * This component is age-agnostic — sizing comes from `config.tileScale` (the
 * resolver) and copy/voice are owned by the screen (doc 66 §2). Faces come from
 * DATA (`MOOD_FACES`), never hardcoded in the component (§5).
 */
import React, { useEffect } from "react";
import { Pressable, Text, View } from "react-native";
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { MOOD_FACES } from "../../src/data/moodScale";
import type { Mood } from "../../src/domain/types";
import type { MoodCheckinConfig } from "../../src/theme/resolveMoodCheckin";
import { useThemeTokens } from "../../src/theme/useThemeTokens";

export interface MoodGridProps {
  selected: Mood | null;
  onSelect: (mood: Mood) => void;
  config: MoodCheckinConfig;
  /** final animate decision (resolver `animateSelect` AND `t.motion.loopsEnabled`) */
  animate: boolean;
}

export default function MoodGrid({ selected, onSelect, config, animate }: MoodGridProps) {
  const t = useThemeTokens();
  return (
    <View
      style={{
        flexDirection: "row",
        flexWrap: "wrap",
        justifyContent: "center",
        gap: t.spacing(3),
      }}
    >
      {MOOD_FACES.map((face) => (
        <MoodTile
          key={face.mood}
          emoji={face.emoji}
          label={face.spokenLabel}
          hue={face.color}
          selected={selected === face.mood}
          animate={animate}
          tileScale={config.tileScale}
          onPress={() => onSelect(face.mood)}
        />
      ))}
    </View>
  );
}

function MoodTile({
  emoji,
  label,
  hue,
  selected,
  animate,
  tileScale,
  onPress,
}: {
  emoji: string;
  label: string;
  hue: string;
  selected: boolean;
  animate: boolean;
  tileScale: number;
  onPress: () => void;
}) {
  const t = useThemeTokens();
  const c = t.colors;
  const size = Math.max(t.touchTargetMin + 40, 96) * tileScale;

  // 0 = resting, 1 = selected. Animated only when `animate`; else set instantly so
  // lowStim / Reduce-Motion is a static select (no spring) — mood-checkin §2.4.
  const s = useSharedValue(selected ? 1 : 0);
  useEffect(() => {
    const target = selected ? 1 : 0;
    s.value = animate ? withTiming(target, { duration: 160 }) : target;
  }, [selected, animate, s]);

  const animatedStyle = useAnimatedStyle(() => {
    "worklet";
    return {
      transform: [{ scale: interpolate(s.value, [0, 1], [1, 1.06]) }],
      opacity: interpolate(s.value, [0, 1], [0.92, 1]),
    };
  });

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      hitSlop={6}
    >
      <Animated.View
        style={[
          {
            width: size,
            height: size,
            borderRadius: t.radius * 1.4,
            alignItems: "center",
            justifyContent: "center",
            gap: 4,
            backgroundColor: selected ? c.surfaceAlt : c.surface,
            borderWidth: selected ? 3 : 1,
            borderColor: selected ? hue : c.border,
          },
          animatedStyle,
        ]}
      >
        <Text style={{ fontSize: Math.round(size * 0.42) }}>{emoji}</Text>
        <Text
          style={{
            color: c.text,
            fontFamily: t.type.label.family,
            fontSize: t.type.label.size,
            fontWeight: "700",
          }}
        >
          {label}
        </Text>
      </Animated.View>
    </Pressable>
  );
}
