/**
 * components/ui/AppTextInput.tsx — the Dynamic-Type-bounded TextInput (§2.2).
 *
 * The input counterpart of `AppText`: applies the same OS Dynamic-Type CAP
 * (`maxFontSizeMultiplier` = 1.3) + OpenDyslexic body-face resolution (§2.7) so
 * PIN / name / reward fields grow with the OS text size but never clip. A drop-in
 * `<TextInput>` — forwards every prop + a ref.
 */
import React from "react";
import { StyleSheet, TextInput, type TextInputProps, type TextStyle } from "react-native";

import { useSettingsStore } from "../../src/state/settingsStore";
import { isOpenDyslexicAvailable, resolveFontFamily } from "../../src/theme/fonts";
import { useThemeTokens } from "../../src/theme/useThemeTokens";

export type AppTextInputProps = TextInputProps;

const AppTextInput = React.forwardRef<TextInput, AppTextInputProps>(function AppTextInput(
  { style, allowFontScaling = true, maxFontSizeMultiplier, ...rest },
  ref,
) {
  const t = useThemeTokens();
  const openDyslexicFont = useSettingsStore((s) => s.parentSettings.openDyslexicFont ?? false);
  const cap = maxFontSizeMultiplier ?? t.maxFontSizeMultiplier;

  let finalStyle = style;
  if (isOpenDyslexicAvailable() && openDyslexicFont) {
    const flat = (StyleSheet.flatten(style) ?? {}) as TextStyle;
    const swapped = resolveFontFamily(flat.fontFamily, true);
    if (swapped && swapped !== flat.fontFamily) {
      finalStyle = [style, { fontFamily: swapped }];
    }
  }

  return (
    <TextInput
      ref={ref}
      {...rest}
      style={finalStyle}
      allowFontScaling={allowFontScaling}
      maxFontSizeMultiplier={cap}
    />
  );
});

export default AppTextInput;
