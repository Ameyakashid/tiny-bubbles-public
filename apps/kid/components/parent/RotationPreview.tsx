/**
 * components/parent/RotationPreview.tsx — the next-N-days holder preview for a
 * shared/rotating chore (multi-child §2.2). PURE presentation over the deterministic
 * `rotationPreview` date math (src/domain/chores.ts): "Mon → Ana · Tue → Beto …".
 *
 * ANTI-SHAME (§6): rotation is "whose turn," never punishment. The optional
 * "Pass to next now" control is framed as a warm HAND-OFF ("hand this chore to the
 * next child"), never "take it away" — and it never deletes any child's already-
 * earned tokens or completed history. No cross-child comparison is shown.
 */
import { format, parseISO } from "date-fns";
import React from "react";
import { Text, View } from "react-native";

import { rotationPreview } from "../../src/domain/chores";
import type { SharedChore } from "../../src/domain/types";
import { useThemeTokens } from "../../src/theme/useThemeTokens";

import { TextButton } from "./ui";

export interface RotationPreviewProps {
  chore: SharedChore;
  /** display name per child id (for the "→ Ana" labels). */
  nameById: Record<string, string>;
  /** timezone for the preview day-math (the device / active-child tz). */
  tz: string;
  /** how many upcoming active days to show (default 5). */
  days?: number;
  /** manual advance ("hand off to the next child"). Omit to hide the control. */
  onPassToNext?: () => void;
}

/** Short weekday label for an ISO day (e.g. "Mon"). */
function weekdayLabel(day: string): string {
  try {
    return format(parseISO(day), "EEE");
  } catch {
    return day.slice(5);
  }
}

export default function RotationPreview({
  chore,
  nameById,
  tz,
  days = 5,
  onPassToNext,
}: RotationPreviewProps) {
  const t = useThemeTokens();
  const c = t.colors;

  // Active rotations need a roster of ≥2 (multi-child §3.2); otherwise there is
  // nothing to preview — show a calm, non-blaming line instead of a broken table.
  if (chore.childIds.length < 2) {
    return (
      <Text style={{ color: c.textDim, fontSize: t.type.caption.size }}>
        Add a second child to rotate this chore.
      </Text>
    );
  }

  const entries = rotationPreview(chore, Date.now(), tz, days);

  return (
    <View style={{ gap: t.spacing(2) }}>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: t.spacing(2) }}>
        {entries.map((e) => (
          <View
            key={e.day}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 4,
              backgroundColor: c.surfaceAlt,
              borderRadius: 999,
              paddingVertical: 4,
              paddingHorizontal: 10,
              borderWidth: 1,
              borderColor: c.border,
            }}
          >
            <Text style={{ color: c.textDim, fontSize: t.type.caption.size, fontWeight: "700" }}>
              {weekdayLabel(e.day)}
            </Text>
            <Text style={{ color: c.textDim, fontSize: t.type.caption.size }}>→</Text>
            <Text style={{ color: c.text, fontSize: t.type.caption.size, fontWeight: "700" }}>
              {e.holderId ? nameById[e.holderId] ?? "—" : "—"}
            </Text>
          </View>
        ))}
      </View>
      {onPassToNext ? (
        <View style={{ alignItems: "flex-start" }}>
          {/* warm hand-off, NEVER "take away" (anti-shame §6) */}
          <TextButton label="Pass to next child →" onPress={onPassToNext} />
        </View>
      ) : null}
    </View>
  );
}
