/**
 * components/task/DoneButton.tsx — the big primary "Done" tap target (doc 66 M7).
 *
 * The single most-tapped control in the app. It is at least `primaryActionMin`
 * tall (~2cm+ physical, doc 61 §5.2) and pops on press (`scale 1->1.12->1`,
 * bouncy) so the tap itself feels rewarding before the celebration even fires.
 *
 * It reads resolved tokens for size/colour and takes its label as a prop (the
 * runner resolves the age-appropriate copy via `resolveContent`) — it never
 * branches on ageMode itself (doc 66 §2).
 */
import React from "react";
import { Pressable, Text, View, type StyleProp, type ViewStyle } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
} from "react-native-reanimated";

import { useThemeTokens } from "../../src/theme/useThemeTokens";

export interface DoneButtonProps {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  /** optional leading glyph (defaults to a friendly check bubble) */
  glyph?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export default function DoneButton({
  label,
  onPress,
  disabled = false,
  glyph = "✓",
  style,
  testID,
}: DoneButtonProps) {
  const t = useThemeTokens();
  const c = t.colors;
  const scale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => {
    "worklet";
    return { transform: [{ scale: scale.value }] };
  });

  const handlePress = () => {
    if (disabled) return;
    if (t.motion.loopsEnabled || t.animationDurationScale > 0) {
      scale.value = withSequence(
        withSpring(1.12, { damping: 9, stiffness: 200, mass: 0.6 }),
        withSpring(1, { damping: 15, stiffness: 160, mass: 0.8 }),
      );
    }
    onPress();
  };

  return (
    <Animated.View style={[{ width: "100%" }, animStyle, style]}>
      <Pressable
        onPress={handlePress}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ disabled }}
        testID={testID}
        style={{
          minHeight: t.primaryActionMin,
          borderRadius: t.radius * 1.4,
          backgroundColor: disabled ? c.surfaceSunken : c.primary,
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "row",
          gap: t.spacing(2),
          paddingHorizontal: t.spacing(5),
          opacity: disabled ? 0.6 : 1,
        }}
      >
        <View
          style={{
            width: 34,
            height: 34,
            borderRadius: 999,
            backgroundColor: "rgba(255,255,255,0.25)",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text style={{ fontSize: 20, color: c.onPrimary }}>{glyph}</Text>
        </View>
        <Text
          style={{
            color: c.onPrimary,
            fontFamily: t.type.h2.family,
            fontSize: t.type.h2.size,
            fontWeight: "700",
          }}
        >
          {label}
        </Text>
      </Pressable>
    </Animated.View>
  );
}
