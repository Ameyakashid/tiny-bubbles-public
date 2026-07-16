/**
 * components/ui/SpokenLabel.tsx — the "button speaks itself" primitive (doc 60 §7.5).
 *
 * Wraps any label so it can be heard, making "everything spoken aloud" a
 * component-level guarantee rather than per-screen wiring (doc 61 §4). It reads
 * the resolved tokens — `spokenLabelDefault` (auto-speak in young) and the age
 * mode (for voice pitch/rate) — so it NEVER branches on ageMode itself.
 *
 * Behavior:
 *  - tap (or long-press) speaks the text in the age-pitched companion voice;
 *  - when `spokenLabelDefault` is on (young) and `autoSpeak` is set, it speaks
 *    once on mount/focus (the pervasive-TTS young default, doc 65 §1);
 *  - renders the text using the resolved type scale, or wraps custom children.
 */
import React, { useEffect } from "react";
import { Pressable, type StyleProp, type TextStyle } from "react-native";

import { useLocale, localeToBcp47 } from "../../src/i18n/useLocale";
import { speak } from "../../src/services/tts";
import { useThemeTokens } from "../../src/theme/useThemeTokens";
import type { TypeStyle } from "../../src/theme/tokens";
import AppText from "./AppText";

export interface SpokenLabelProps {
  /** the words to display and/or speak */
  text: string;
  /** auto-speak once when mounted IF the mode's spokenLabelDefault is on */
  autoSpeak?: boolean;
  /** speak even when spokenLabelDefault is off (still respects `enabled`) */
  forceSpeakOnPress?: boolean;
  /** master TTS toggle (parent setting in later milestones); default on */
  enabled?: boolean;
  /** which type-scale role to render with (default: bodyLg) */
  variant?: keyof ReturnType<typeof useThemeTokens>["type"];
  /** override the rendered content (text is still what gets spoken) */
  children?: React.ReactNode;
  style?: StyleProp<TextStyle>;
  /** caller can still react to the press in addition to speaking */
  onPress?: () => void;
  accessibilityLabel?: string;
}

function typeStyleToRN(t: TypeStyle, fontScale: number): TextStyle {
  return {
    fontSize: t.size * fontScale,
    lineHeight: t.lineHeight * fontScale,
    fontFamily: t.family,
    fontWeight: t.weight,
    ...(t.tabularNums ? { fontVariant: ["tabular-nums"] } : {}),
  };
}

export default function SpokenLabel({
  text,
  autoSpeak = false,
  forceSpeakOnPress = false,
  enabled = true,
  variant = "bodyLg",
  children,
  style,
  onPress,
  accessibilityLabel,
}: SpokenLabelProps) {
  const t = useThemeTokens();
  const locale = useLocale();

  const sayIt = () => speak(text, { ageMode: t.ageMode, enabled, language: localeToBcp47(locale) });

  // auto-speak once on mount when the mode wants it (young pervasive TTS)
  useEffect(() => {
    if (autoSpeak && t.spokenLabelDefault && enabled) {
      sayIt();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoSpeak, t.spokenLabelDefault, enabled, text, locale]);

  const handlePress = () => {
    if (forceSpeakOnPress || t.spokenLabelDefault) sayIt();
    onPress?.();
  };

  // Role reflects behavior: "button" when tapping DOES something (speaks or an
  // onPress), "text" when it is a passive label (§MODIFY 10). A speakable label
  // gets a hint so a screen-reader user knows the tap affordance.
  const speakable = forceSpeakOnPress || t.spokenLabelDefault;
  const hasAction = speakable || !!onPress;

  return (
    <Pressable
      onPress={handlePress}
      onLongPress={sayIt}
      accessibilityRole={hasAction ? "button" : "text"}
      accessibilityLabel={accessibilityLabel ?? text}
      accessibilityHint={speakable ? "Tap to hear it" : undefined}
      hitSlop={8}
    >
      {children ?? (
        <AppText style={[typeStyleToRN(t.type[variant], t.fontScale), { color: t.colors.text }, style]}>
          {text}
        </AppText>
      )}
    </Pressable>
  );
}
