/**
 * components/ui/VolumeSlider.tsx — a reusable, accessible bed-volume control
 * (feature `soundscapes`, M-C1 OWNS this primitive; accessibility-i18n consumes
 * the `accessibilityRole="adjustable"` pattern — 02-architecture §1.5/§1.7).
 *
 * Built on react-native-gesture-handler (`Pan`) + react-native-reanimated (both
 * already in-stack — NO new dependency, matching the codebase's "own the
 * primitive" preference). Renders a track + fill + draggable thumb, PLUS explicit
 * −/+ affordances so it works without a drag (web + screen-reader + motor a11y).
 * It exposes `accessibilityRole="adjustable"` with increment/decrement actions
 * (±0.1) so VoiceOver/TalkBack can adjust it.
 *
 * Age/sensory sizing is passed in via the `size` prop (resolved by the CALLER from
 * `useThemeTokens()`); this component reads no raw age/sensory mode and takes no
 * mode prop (golden rule, soundscapes §7 grep gate). Colors come from
 * `useThemeTokens()`.
 */
import React, { useCallback, useMemo, useState } from "react";
import {
  Pressable,
  Text,
  View,
  type LayoutChangeEvent,
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";

import { useThemeTokens } from "../../src/theme/useThemeTokens";

/** Increment/decrement step for the −/+ affordances + a11y actions. */
const STEP = 0.1;

export interface VolumeSliderProps {
  /** current bed volume, 0..1 */
  value: number;
  /** called with a clamped 0..1 value as the user adjusts */
  onChange: (v: number) => void;
  /** sizing hint resolved by the caller from theme tokens — NOT read here */
  size?: "young" | "older";
  accessibilityLabel?: string;
}

const clamp = (v: number): number => Math.min(1, Math.max(0, v));
const round = (v: number): number => Math.round(v * 100) / 100;

export default function VolumeSlider({
  value,
  onChange,
  size = "older",
  accessibilityLabel,
}: VolumeSliderProps): React.ReactElement {
  const t = useThemeTokens();
  const c = t.colors;
  const young = size === "young";

  const trackHeight = young ? 20 : 8;
  const thumbSize = young ? 40 : 24;
  const stepBtn = young ? t.touchTargetMin : 36;

  const [trackWidth, setTrackWidth] = useState(0);
  const pos = useSharedValue(clamp(value));

  // Keep the shared value in sync with the controlled prop.
  React.useEffect(() => {
    pos.value = clamp(value);
  }, [value, pos]);

  const emit = useCallback(
    (v: number) => onChange(clamp(round(v))),
    [onChange],
  );

  const onLayout = (e: LayoutChangeEvent) =>
    setTrackWidth(e.nativeEvent.layout.width);

  // Drag anywhere on the track sets the value from the touch x. `minDistance(0)`
  // makes it also act as a tap-to-position. Guarded by a measured width.
  const pan = useMemo(
    () =>
      Gesture.Pan()
        .minDistance(0)
        .onBegin((e) => {
          "worklet";
          if (trackWidth > 0) runOnJS(emit)(e.x / trackWidth);
        })
        .onUpdate((e) => {
          "worklet";
          if (trackWidth > 0) runOnJS(emit)(e.x / trackWidth);
        }),
    [trackWidth, emit],
  );

  const fillStyle = useAnimatedStyle(() => ({
    width: `${pos.value * 100}%`,
  }));
  const thumbStyle = useAnimatedStyle(() => ({
    left: pos.value * Math.max(0, trackWidth - thumbSize),
  }));

  const pct = Math.round(clamp(value) * 100);

  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: t.spacing(2) }}>
      <StepButton
        label="−"
        size={stepBtn}
        onPress={() => emit(value - STEP)}
        accessibilityLabel="Quieter"
        c={c}
        t={t}
      />

      <View
        accessibilityRole="adjustable"
        accessibilityLabel={accessibilityLabel}
        accessibilityValue={{ min: 0, max: 100, now: pct }}
        accessibilityActions={[{ name: "increment" }, { name: "decrement" }]}
        onAccessibilityAction={(e) => {
          if (e.nativeEvent.actionName === "increment") emit(value + STEP);
          else if (e.nativeEvent.actionName === "decrement") emit(value - STEP);
        }}
        style={{ flex: 1, justifyContent: "center", minHeight: t.touchTargetMin }}
      >
        <GestureDetector gesture={pan}>
          <View
            onLayout={onLayout}
            style={{
              height: Math.max(trackHeight, thumbSize),
              justifyContent: "center",
            }}
          >
            {/* track */}
            <View
              style={{
                height: trackHeight,
                borderRadius: trackHeight,
                backgroundColor: c.surfaceSunken,
                overflow: "hidden",
              }}
            >
              <Animated.View
                style={[
                  { height: "100%", borderRadius: trackHeight, backgroundColor: c.primary },
                  fillStyle,
                ]}
              />
            </View>
            {/* thumb */}
            <Animated.View
              pointerEvents="none"
              style={[
                {
                  position: "absolute",
                  width: thumbSize,
                  height: thumbSize,
                  borderRadius: thumbSize / 2,
                  backgroundColor: c.primary,
                  borderWidth: 2,
                  borderColor: c.onPrimary,
                },
                thumbStyle,
              ]}
            />
          </View>
        </GestureDetector>
      </View>

      <StepButton
        label="+"
        size={stepBtn}
        onPress={() => emit(value + STEP)}
        accessibilityLabel="Louder"
        c={c}
        t={t}
      />
    </View>
  );
}

type Tokens = ReturnType<typeof useThemeTokens>;

function StepButton({
  label,
  size,
  onPress,
  accessibilityLabel,
  c,
  t,
}: {
  label: string;
  size: number;
  onPress: () => void;
  accessibilityLabel: string;
  c: Tokens["colors"];
  t: Tokens;
}): React.ReactElement {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={8}
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: c.surface,
        borderWidth: 1,
        borderColor: c.border,
      }}
    >
      <Text style={{ color: c.text, fontSize: t.type.h2.size, fontWeight: "700" }}>
        {label}
      </Text>
    </Pressable>
  );
}
