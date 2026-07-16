/**
 * components/quests/NoveltyBadge.tsx — the calm "new!" marker for newly-available
 * seasonal content (novelty-refresh §2.3, M-C4).
 *
 * A small, warm badge that says "this just appeared" — NEVER a countdown, NEVER
 * "limited time"/"expires"/"last chance" (additive-only, no FOMO — novelty §7.1).
 * It reads resolved theme tokens for colour; it takes NO age-mode prop and never
 * branches on the mode (copy resolves via `useCopy`, which threads the ambient
 * mode internally). Two shapes:
 *   - `compact` (default): a tiny star chip suitable for a collectible-tile corner;
 *   - full: the same star + a spoken-able "New this season" label pill.
 */
import React from "react";
import { View } from "react-native";

import { useCopy } from "../../src/i18n/useLocale";
import { useThemeTokens } from "../../src/theme/useThemeTokens";
import AppText from "../ui/AppText";

export interface NoveltyBadgeProps {
  /** compact corner star only (default true); false shows the labelled pill */
  compact?: boolean;
  /** override the label (defaults to the resolved "novelty.new" copy) */
  label?: string;
}

export default function NoveltyBadge({ compact = true, label }: NoveltyBadgeProps) {
  const t = useThemeTokens();
  const c = t.colors;
  const copy = useCopy();
  const text = label ?? copy("novelty.new");

  if (compact) {
    return (
      <View
        accessibilityRole="image"
        accessibilityLabel={text}
        style={{
          minWidth: 20,
          height: 20,
          paddingHorizontal: 4,
          borderRadius: 999,
          backgroundColor: c.token,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <AppText style={{ fontSize: 12 }}>⭐</AppText>
      </View>
    );
  }

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        paddingVertical: 3,
        paddingHorizontal: 10,
        borderRadius: 999,
        backgroundColor: c.surface,
        borderWidth: 1,
        borderColor: c.border,
      }}
    >
      <AppText style={{ fontSize: 13 }}>⭐</AppText>
      <AppText
        style={{
          color: c.textDim,
          fontFamily: t.type.label.family,
          fontSize: t.type.label.size,
          fontWeight: "700",
        }}
      >
        {text}
      </AppText>
    </View>
  );
}
