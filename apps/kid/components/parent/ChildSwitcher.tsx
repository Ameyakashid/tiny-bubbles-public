/**
 * components/parent/ChildSwitcher.tsx — a reusable avatar-grid child switcher
 * (multi-child §2.1). Used by the dashboard's dedicated `switch-child` screen AND
 * (opt-in) by the kid-facing hand-off button. Shows one round `avatarColor` bubble
 * per non-archived child (first initial) + the name; the active child is ringed with
 * `colors.primary`.
 *
 * ANTI-SHAME / no cross-child comparison (§6): it renders names + avatar colors
 * ONLY — never a token count, streak, or progress, so a child can never compare
 * against a sibling. Presentation follows the CURRENTLY-active child's RESOLVED
 * capability flags (`multiStepVisible` shell + `ttsDefault`), NEVER a raw `ageMode`
 * read: young → oversized bubbles + name spoken on tap (non-reader hand-off) + a
 * horizontal scroll; older → a compact wrapping row with text names, spoken on tap.
 * The switcher never celebrates and (deliberately) uses no entrance animation, so
 * low-stim / calm need no extra motion gate.
 */
import React from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

import type { ChildIndexEntry } from "../../src/domain/types";
import { speak } from "../../src/services/tts";
import { useCapabilities, useThemeInputs } from "../../src/theme/ThemeProvider";
import { useThemeTokens } from "../../src/theme/useThemeTokens";

export interface ChildSwitcherProps {
  /** non-archived children (the caller filters `archived`). */
  roster: ChildIndexEntry[];
  activeChildId: string | null;
  onPick: (cid: string) => void;
  /** optional trailing tile (e.g. a PremiumGate-wrapped "＋ Add child") — parent-only. */
  addTile?: React.ReactNode;
}

export default function ChildSwitcher({ roster, activeChildId, onPick, addTile }: ChildSwitcherProps) {
  const t = useThemeTokens();
  const caps = useCapabilities();
  // Feed ageMode into the TTS resolver only (sanctioned useThemeInputs pattern —
  // never a raw branch): pitch/rate come from `speak`, presentation from caps.
  const { ageMode } = useThemeInputs();

  // Shell flag drives sizing: young single-surface (bigger, scrollable) vs older
  // compact wrapping row. NEVER a raw ageMode branch (the golden rule).
  const big = !caps.multiStepVisible;
  const size = big ? 88 : 56;

  const pick = (entry: ChildIndexEntry) => {
    // Spoken hand-off cue for non-readers (respects the resolved TTS default).
    if (caps.ttsDefault) speak(entry.displayName, { ageMode, enabled: true });
    onPick(entry.id);
  };

  const tiles = (
    <>
      {roster.map((entry) => (
        <ChildTile
          key={entry.id}
          entry={entry}
          size={size}
          active={entry.id === activeChildId}
          onPress={() => pick(entry)}
        />
      ))}
      {addTile}
    </>
  );

  if (big) {
    // young: oversized bubbles, horizontal scroll (≤3 visible then scroll).
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: t.spacing(4), paddingVertical: t.spacing(2) }}
      >
        {tiles}
      </ScrollView>
    );
  }
  // older: compact wrapping row.
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: t.spacing(3), alignItems: "flex-start" }}>
      {tiles}
    </View>
  );
}

function ChildTile({
  entry,
  size,
  active,
  onPress,
}: {
  entry: ChildIndexEntry;
  size: number;
  active: boolean;
  onPress: () => void;
}) {
  const t = useThemeTokens();
  const c = t.colors;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      accessibilityLabel={entry.displayName}
      style={{ alignItems: "center", gap: 6, width: size + 12 }}
    >
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: entry.avatarColor,
          alignItems: "center",
          justifyContent: "center",
          borderWidth: active ? 4 : 1,
          borderColor: active ? c.primary : c.border,
        }}
      >
        <Text style={{ color: "#fff", fontWeight: "700", fontSize: size * 0.4 }}>
          {entry.displayName.slice(0, 1).toUpperCase()}
        </Text>
      </View>
      <Text
        numberOfLines={1}
        style={{
          color: active ? c.primary : c.text,
          fontFamily: t.type.label.family,
          fontSize: t.type.label.size,
          fontWeight: active ? "700" : "500",
          maxWidth: size + 12,
          textAlign: "center",
        }}
      >
        {entry.displayName}
      </Text>
    </Pressable>
  );
}
