/**
 * components/ui/AppText.tsx — the Dynamic-Type-bounded Text primitive (§2.2).
 *
 * A drop-in `<Text>` that applies the app-wide OS Dynamic-Type CAP
 * (`maxFontSizeMultiplier` = 1.3 from tokens) so OS accessibility text sizes
 * enlarge copy but never overflow the fixed kid buttons (wrap-not-clip, `61`
 * §3.2). It also resolves the effective body face for the OpenDyslexic toggle
 * (§2.7) — a NO-OP until the font binaries are bundled. `SpokenLabel` renders
 * through this; high-traffic kid-facing `<Text>` migrates to it over time.
 *
 * The DESIGN `fontScale` (baked into each `fontSize`) is unchanged; the OS scale
 * composes on top and is bounded by the cap — the two multiply, neither is removed.
 */
import React from "react";
import { StyleSheet, Text, type TextProps, type TextStyle } from "react-native";

import { useSettingsStore } from "../../src/state/settingsStore";
import { isOpenDyslexicAvailable, resolveFontFamily } from "../../src/theme/fonts";
import { useThemeTokens } from "../../src/theme/useThemeTokens";

export interface AppTextProps extends TextProps {
  children?: React.ReactNode;
}

export default function AppText({
  style,
  allowFontScaling = true,
  maxFontSizeMultiplier,
  children,
  ...rest
}: AppTextProps) {
  const t = useThemeTokens();
  const openDyslexicFont = useSettingsStore((s) => s.parentSettings.openDyslexicFont ?? false);
  const cap = maxFontSizeMultiplier ?? t.maxFontSizeMultiplier;

  // OpenDyslexic body-face swap (no-op until binaries are bundled, §2.7).
  let finalStyle = style;
  if (isOpenDyslexicAvailable() && openDyslexicFont) {
    const flat = (StyleSheet.flatten(style) ?? {}) as TextStyle;
    const swapped = resolveFontFamily(flat.fontFamily, true);
    if (swapped && swapped !== flat.fontFamily) {
      finalStyle = [style, { fontFamily: swapped }];
    }
  }

  return (
    <Text
      {...rest}
      style={finalStyle}
      allowFontScaling={allowFontScaling}
      maxFontSizeMultiplier={cap}
    >
      {children}
    </Text>
  );
}
