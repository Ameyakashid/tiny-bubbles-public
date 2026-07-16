/**
 * app/(parent)/switch-child.tsx — the dedicated FAST child switcher (multi-child
 * §2.1). Opened from the parent dashboard header ("Switch", shown only with ≥2
 * non-archived children). Picking a child hands the device to them:
 * `switchActiveChild(cid)` (re-themes the whole kid app + clears the live run +
 * reconciles) then `router.replace('/(kid)')`. The parent zone re-locks on
 * background as usual.
 *
 * ANTI-SHAME (§6): no token counts / streaks / progress / leaderboard here — just
 * names + avatar colors. Switching never zeroes or hides the previous child's data
 * (it is per-`cid`, untouched). Age presentation flows from resolved flags only.
 */
import { router } from "expo-router";
import React from "react";
import { Pressable, Text, View } from "react-native";

import { useChildStore } from "../../src/state/childStore";
import { createChildWithSeed, switchActiveChild } from "../../src/state/gameplay";
import { useSettingsStore } from "../../src/state/settingsStore";
import { resolveContent } from "../../src/theme/resolveContent";
import { useThemeInputs } from "../../src/theme/ThemeProvider";
import { useThemeTokens } from "../../src/theme/useThemeTokens";

import ChildSwitcher from "../../components/parent/ChildSwitcher";
import { goToPaywall, PremiumGate } from "../../components/parent/PremiumGate";
import { ParentScreen } from "../../components/parent/ui";

function deviceTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

export default function SwitchChildScreen() {
  const { ageMode } = useThemeInputs();

  const index = useChildStore((s) => s.index);
  const activeChildId = useSettingsStore((s) => s.meta.activeChildId);
  const list = index.filter((e) => !e.archived);

  const pick = (cid: string) => {
    switchActiveChild(cid);
    router.replace("/(kid)");
  };

  const addChild = () => {
    const id = createChildWithSeed({
      displayName: "New child",
      ageMode: "young",
      timeZone: deviceTimeZone(),
    });
    switchActiveChild(id);
    // A brand-new child needs setup — hand off to the profiles screen.
    router.replace("/(parent)/children");
  };

  return (
    <ParentScreen
      title={resolveContent("switch.title", { ageMode })}
      subtitle="Tap a child to hand them the device. Everyone's bubbles stay their own."
    >
      <ChildSwitcher
        roster={list}
        activeChildId={activeChildId}
        onPick={pick}
        addTile={
          <PremiumGate
            feature="multiChild"
            currentCount={list.length}
            locked={<AddTile label="✨ Add" onPress={goToPaywall} />}
          >
            <AddTile label="＋ Add" onPress={addChild} />
          </PremiumGate>
        }
      />
    </ParentScreen>
  );
}

/** A switcher-grid tile that adds another child (parent-only, gated upstream). */
function AddTile({ label, onPress }: { label: string; onPress: () => void }) {
  const t = useThemeTokens();
  const c = t.colors;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Add a child"
      style={{ alignItems: "center", gap: 6, width: 68 }}
    >
      <View
        style={{
          width: 56,
          height: 56,
          borderRadius: 28,
          backgroundColor: c.surfaceAlt,
          alignItems: "center",
          justifyContent: "center",
          borderWidth: 1,
          borderColor: c.border,
        }}
      >
        <Text style={{ color: c.text, fontSize: 24, fontWeight: "700" }}>＋</Text>
      </View>
      <Text
        numberOfLines={1}
        style={{ color: c.textDim, fontFamily: t.type.label.family, fontSize: t.type.label.size }}
      >
        {label}
      </Text>
    </Pressable>
  );
}
