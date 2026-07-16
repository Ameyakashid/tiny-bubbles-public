/**
 * components/parent/ChildModePreview.tsx — the live side-by-side age-mode preview
 * (doc 66 §M9, via the M2 `overrideAgeMode` provider).
 *
 * Renders the SAME kid-facing surface for ALL THREE bands — `young` / `older` /
 * `preteen` — from the child's current companionStyle / textFirst / sensoryMode
 * overrides, so a parent SEES the effect of an ageMode (or override) change
 * before committing. The three fixed-width tiles sit in a horizontal ScrollView
 * so they fit a phone. The currently-selected ageMode tile is highlighted. No tile
 * branches on raw ageMode — each reads resolved tokens/flags/content (doc 66 §2).
 */
import React from "react";
import { ScrollView, Text, View } from "react-native";

import BubbleBuddy from "../buddy/BubbleBuddy";
import type {
  AgeMode,
  CompanionState,
  CompanionStyle,
  SensoryMode,
} from "../../src/domain/types";
import type { BuddyFinish } from "../buddy/buddyVisuals";
import { ageModeLabel, resolveContent } from "../../src/theme/resolveContent";
import { ThemeProvider, useCapabilities } from "../../src/theme/ThemeProvider";
import { useThemeTokens } from "../../src/theme/useThemeTokens";

export interface ChildModePreviewProps {
  activeAgeMode: AgeMode;
  companionStyle: CompanionStyle;
  textFirst: boolean;
  sensoryMode: SensoryMode;
  /** optional real companion so the preview shows the child's actual buddy */
  companion?: CompanionState;
}

export default function ChildModePreview({
  activeAgeMode,
  companionStyle,
  textFirst,
  sensoryMode,
  companion,
}: ChildModePreviewProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ flexDirection: "row", gap: 12, paddingVertical: 2 }}
    >
      {(["young", "older", "preteen"] as const).map((mode) => (
        <View key={mode} style={{ width: 150 }}>
          <ThemeProvider
            overrideAgeMode={mode}
            overrideSensoryMode={sensoryMode}
            overrideCompanionStyle={companionStyle}
            overrideTextFirst={textFirst}
          >
            <PreviewTile mode={mode} active={mode === activeAgeMode} companion={companion} />
          </ThemeProvider>
        </View>
      ))}
    </ScrollView>
  );
}

function PreviewTile({
  mode,
  active,
  companion,
}: {
  mode: AgeMode;
  active: boolean;
  companion?: CompanionState;
}) {
  const t = useThemeTokens();
  const caps = useCapabilities();
  const c = t.colors;
  const artVariant = resolveContent("buddy.artVariant", {
    companionStyle: caps.companionStyle,
  });
  const stepCopy = resolveContent("celebrate.step", { ageMode: mode });

  return (
    <View
      // className `bg-canvas` proves the live CSS-var palette swap per tile
      className="bg-canvas"
      style={{
        borderRadius: t.radius,
        borderWidth: active ? 3 : 1,
        borderColor: active ? c.primary : c.border,
        padding: t.spacing(3),
        gap: t.spacing(2),
        alignItems: "center",
        overflow: "hidden",
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 6,
          alignSelf: "stretch",
          justifyContent: "space-between",
        }}
      >
        <Text style={{ color: c.text, fontFamily: t.type.label.family, fontSize: t.type.label.size, fontWeight: "700" }}>
          {ageModeLabel(mode)}
        </Text>
        {active ? (
          <Text style={{ color: c.primary, fontSize: t.type.caption.size, fontWeight: "700" }}>● active</Text>
        ) : null}
      </View>

      <BubbleBuddy
        variant={artVariant}
        mood="happy"
        size={96}
        animate={false}
        bodyHue={companion?.customization.baseColor}
        finish={companion?.customization.finish as BuddyFinish | undefined}
        name={companion?.name}
      />

      {/* a sample task card — icon-first (young) vs text-first (older) */}
      <View
        style={{
          alignSelf: "stretch",
          flexDirection: "row",
          alignItems: "center",
          gap: t.spacing(2),
          backgroundColor: c.surface,
          borderRadius: t.radius - 6,
          borderWidth: 1,
          borderColor: c.border,
          padding: t.spacing(2),
        }}
      >
        <Text style={{ fontSize: t.textFirst ? 20 : 28 }}>🪥</Text>
        {t.textFirst ? (
          <Text style={{ color: c.text, fontSize: t.type.body.size }} numberOfLines={1}>
            Brush teeth
          </Text>
        ) : null}
      </View>

      {/* sample celebration copy at this mode's reading level */}
      <Text
        style={{ color: c.textDim, fontSize: t.type.caption.size, textAlign: "center" }}
        numberOfLines={2}
      >
        {stepCopy}
      </Text>
    </View>
  );
}
