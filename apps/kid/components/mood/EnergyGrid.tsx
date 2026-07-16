/**
 * components/mood/EnergyGrid.tsx — the OPTIONAL, skippable energy grid (mood-checkin
 * §2.2). Young = 3 cells, older/preteen = 5, chosen by `config.energyLevels` (the
 * resolver decides; this component is age-agnostic). Skipping energy is always fine;
 * it is never required. Cells come from DATA (`ENERGY_CELLS_*`), each `spokenLabel`.
 *
 * A selected cell gets a calm border highlight (instant — no spring); the surface
 * stays quiet (mood-checkin §2.4).
 */
import React from "react";
import { Pressable, Text, View } from "react-native";

import { ENERGY_CELLS_OLDER, ENERGY_CELLS_YOUNG } from "../../src/data/moodScale";
import type { MoodCheckinConfig } from "../../src/theme/resolveMoodCheckin";
import { useThemeTokens } from "../../src/theme/useThemeTokens";

export interface EnergyGridProps {
  selected: number | null;
  onSelect: (value: number) => void;
  config: MoodCheckinConfig;
}

export default function EnergyGrid({ selected, onSelect, config }: EnergyGridProps) {
  const t = useThemeTokens();
  const c = t.colors;
  const cells = config.energyLevels === 3 ? ENERGY_CELLS_YOUNG : ENERGY_CELLS_OLDER;

  return (
    <View
      style={{
        flexDirection: "row",
        flexWrap: "wrap",
        justifyContent: "center",
        gap: t.spacing(2),
      }}
    >
      {cells.map((cell) => {
        const isSel = selected === cell.value;
        return (
          <Pressable
            key={cell.value}
            onPress={() => onSelect(cell.value)}
            accessibilityRole="button"
            accessibilityLabel={cell.spokenLabel}
            accessibilityState={{ selected: isSel }}
            hitSlop={6}
            style={{
              minWidth: t.touchTargetMin,
              minHeight: t.touchTargetMin,
              paddingHorizontal: t.spacing(2),
              paddingVertical: t.spacing(2),
              borderRadius: t.radius,
              alignItems: "center",
              justifyContent: "center",
              gap: 2,
              backgroundColor: isSel ? c.surfaceAlt : c.surface,
              borderWidth: isSel ? 3 : 1,
              borderColor: isSel ? c.primary : c.border,
            }}
          >
            <Text style={{ fontSize: 26 }}>{cell.emoji}</Text>
            <Text style={{ color: c.textDim, fontSize: t.type.caption.size }}>
              {cell.spokenLabel}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
