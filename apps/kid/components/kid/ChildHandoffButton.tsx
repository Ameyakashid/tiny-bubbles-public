/**
 * components/kid/ChildHandoffButton.tsx — the OPT-IN, kid-facing quick-switch
 * (multi-child §2.1). Rendered on `DaypartDonePanel` ONLY when
 * `parentSettings.quickChildSwitch === true` (default false) AND there are ≥2
 * non-archived children. It is a low-emphasis "Someone else's turn?" avatar row;
 * tapping a sibling calls `switchActiveChild` DIRECTLY (this opt-in path is
 * intentionally ungated — a parent enables it only on a trusted single-family
 * device).
 *
 * This is the ONLY kid-facing multi-child affordance. ANTI-SHAME / no cross-child
 * comparison (§6): it shows names + avatar colors ONLY — never a sibling's token
 * count or progress. Switching never zeroes/hides the previous child's data.
 */
import React from "react";
import { Text, View } from "react-native";

import { useChildStore } from "../../src/state/childStore";
import { switchActiveChild } from "../../src/state/gameplay";
import { resolveContent } from "../../src/theme/resolveContent";
import { useThemeInputs } from "../../src/theme/ThemeProvider";
import { useThemeTokens } from "../../src/theme/useThemeTokens";
import ChildSwitcher from "../parent/ChildSwitcher";

export interface ChildHandoffButtonProps {
  /** the child currently on screen (ringed in the switcher). */
  childId: string;
}

export default function ChildHandoffButton({ childId }: ChildHandoffButtonProps) {
  const t = useThemeTokens();
  const { ageMode } = useThemeInputs();
  const index = useChildStore((s) => s.index);
  const list = index.filter((e) => !e.archived);

  // Self-guard: only meaningful with ≥2 children (the caller also gates on the
  // parent opt-in `quickChildSwitch`).
  if (list.length < 2) return null;

  return (
    <View style={{ alignItems: "center", gap: t.spacing(2), width: "100%" }}>
      <Text
        style={{
          color: t.colors.textDim,
          fontFamily: t.type.label.family,
          fontSize: t.type.label.size,
        }}
      >
        {resolveContent("switch.handoff", { ageMode })}
      </Text>
      <ChildSwitcher
        roster={list}
        activeChildId={childId}
        onPick={(cid) => switchActiveChild(cid)}
      />
    </View>
  );
}
