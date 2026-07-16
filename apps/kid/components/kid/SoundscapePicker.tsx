/**
 * components/kid/SoundscapePicker.tsx — the calm-corner soundscape control
 * (feature `soundscapes`, M-C1). Composes: a big friendly on/off affordance, the
 * curated scene tiles/chips (sliced by `capabilities.maxChoices`), and a
 * `<VolumeSlider>`. Opt-in + silent by default: starts OFF on every visit.
 *
 * Age/sensory differences flow ONLY through resolved capability flags
 * (`caps.multiStepVisible` / `caps.maxChoices`) + `useCopy()` — this component
 * reads no raw age/sensory mode and takes no mode prop (golden rule). Premium
 * scenes render as preview tiles that route through the parent gate to the paywall
 * (acquisition-only, never shaming, never removing an owned scene).
 *
 * Playback is mix-not-hijack (the shared `soundscape.ts` bed reuses the ducking
 * session); it is stopped on unmount so it never plays on in the background.
 */
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";

import {
  isSceneAvailable,
  pickableScenes,
  resolveSoundscapeSettings,
} from "../../src/domain/soundscapes";
import type { Soundscape } from "../../src/domain/types";
import { useCopy } from "../../src/i18n/useLocale";
import { useEntitlements } from "../../src/services/entitlements";
import {
  playSoundscape,
  setSoundscapeVolume,
  stopSoundscape,
} from "../../src/services/soundscape";
import { useChildStore } from "../../src/state/childStore";
import { useCapabilities } from "../../src/theme/ThemeProvider";
import { useThemeTokens } from "../../src/theme/useThemeTokens";
import { goToPaywall } from "../parent/PremiumGate";
import SpokenLabel from "../ui/SpokenLabel";
import VolumeSlider from "../ui/VolumeSlider";

export interface SoundscapePickerProps {
  context: "calm" | "focus";
  childId: string;
}

export default function SoundscapePicker({
  context,
  childId,
}: SoundscapePickerProps): React.ReactElement {
  const t = useThemeTokens();
  const c = t.colors;
  const caps = useCapabilities();
  const copy = useCopy();
  const entitlement = useEntitlements();

  const settings = useChildStore((s) => s.profiles[childId]?.settings);
  const updateSettings = useChildStore((s) => s.updateSettings);
  const resolved = useMemo(() => resolveSoundscapeSettings(settings?.soundscape), [settings?.soundscape]);

  const selectedId = context === "calm" ? resolved.calmSceneId : resolved.focusSceneId;
  const scenes = useMemo(
    () => pickableScenes(context, caps.maxChoices, entitlement, selectedId),
    [context, caps.maxChoices, entitlement, selectedId],
  );

  // Opt-in, silent by default: OFF on every mount. Nothing auto-plays.
  const [on, setOn] = useState(false);
  useEffect(() => () => stopSoundscape(), []);

  const selectedScene = useMemo<Soundscape | undefined>(
    () => scenes.find((s) => s.id === selectedId) ?? scenes.find((s) => !s.premium),
    [scenes, selectedId],
  );

  const persist = useCallback(
    (patch: Partial<typeof resolved>) =>
      updateSettings(childId, { soundscape: { ...resolved, ...patch } }),
    [updateSettings, childId, resolved],
  );

  const toggle = useCallback(() => {
    if (on) {
      stopSoundscape();
      setOn(false);
    } else if (selectedScene) {
      playSoundscape(selectedScene.id);
      setOn(true);
    }
  }, [on, selectedScene]);

  const selectScene = useCallback(
    (scene: Soundscape) => {
      if (!isSceneAvailable(scene, entitlement, selectedId)) {
        goToPaywall(); // parent-gated route to the paywall — never shames the child
        return;
      }
      persist(context === "calm" ? { calmSceneId: scene.id } : { focusSceneId: scene.id });
      if (on) playSoundscape(scene.id); // live swap while sounds are on
    },
    [entitlement, selectedId, persist, context, on],
  );

  const onVolume = useCallback(
    (v: number) => {
      setSoundscapeVolume(v);
      persist({ volume: v });
    },
    [persist],
  );

  const bigTiles = !caps.multiStepVisible; // young: large tiles; older: chips
  const toggleLabel = `${on ? copy("soundscape.stop") : copy("soundscape.play")}${
    selectedScene ? ` · ${selectedScene.label.spokenLabel}` : ""
  }`;

  return (
    <View style={{ width: "100%", gap: t.spacing(3), alignItems: "center" }}>
      {/* on / off — the same big, friendly toggle affordance */}
      <Pressable
        onPress={toggle}
        accessibilityRole="switch"
        accessibilityState={{ checked: on }}
        accessibilityLabel={toggleLabel}
        style={{
          minHeight: t.touchTargetMin,
          flexDirection: "row",
          alignItems: "center",
          gap: t.spacing(2),
          paddingHorizontal: t.spacing(5),
          paddingVertical: t.spacing(3),
          borderRadius: t.radius * 1.4,
          backgroundColor: on ? c.primary : c.surface,
          borderWidth: 1,
          borderColor: c.border,
        }}
      >
        <Text style={{ fontSize: t.type.h2.size }}>{on ? "🔊" : "🔈"}</Text>
        <Text
          style={{
            color: on ? c.onPrimary : c.text,
            fontFamily: t.type.label.family,
            fontSize: t.type.label.size,
            fontWeight: "700",
          }}
        >
          {toggleLabel}
        </Text>
      </Pressable>

      {/* scene tiles / chips — curated, sliced by maxChoices */}
      {scenes.length > 1 ? (
        <View
          accessibilityRole="radiogroup"
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            justifyContent: "center",
            gap: t.spacing(2),
          }}
        >
          {scenes.map((scene) => {
            const active = scene.id === selectedId;
            const locked = !isSceneAvailable(scene, entitlement, selectedId);
            return (
              <Pressable
                key={scene.id}
                onPress={() => selectScene(scene)}
                accessibilityRole="radio"
                accessibilityState={{ selected: active }}
                accessibilityLabel={
                  locked
                    ? `${scene.label.spokenLabel} · ${copy("soundscape.premium")}`
                    : scene.label.spokenLabel
                }
                style={{
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 4,
                  minWidth: bigTiles ? 96 : 72,
                  paddingVertical: bigTiles ? t.spacing(3) : t.spacing(2),
                  paddingHorizontal: t.spacing(3),
                  borderRadius: t.radius * (bigTiles ? 1.2 : 1),
                  backgroundColor: active ? c.surfaceAlt : c.surface,
                  borderWidth: active ? 2 : 1,
                  borderColor: active ? c.primary : c.border,
                }}
              >
                <Text style={{ fontSize: bigTiles ? 34 : 24 }}>{scene.label.emoji ?? "🎧"}</Text>
                {bigTiles ? (
                  <SpokenLabel
                    text={scene.label.spokenLabel}
                    variant="label"
                    autoSpeak={false}
                  />
                ) : (
                  <Text
                    numberOfLines={1}
                    style={{
                      color: c.text,
                      fontFamily: t.type.label.family,
                      fontSize: t.type.caption.size,
                      fontWeight: "600",
                    }}
                  >
                    {scene.label.spokenLabel}
                  </Text>
                )}
                {locked ? <Text style={{ fontSize: 12 }}>✨</Text> : null}
              </Pressable>
            );
          })}
        </View>
      ) : null}

      {/* volume — a real, persisted 0..1 bed control */}
      <View style={{ width: "100%", maxWidth: 360, gap: 4 }}>
        <Text
          style={{
            color: c.textDim,
            fontFamily: t.type.label.family,
            fontSize: t.type.caption.size,
            textAlign: "center",
          }}
        >
          {copy("soundscape.volume")}
        </Text>
        <VolumeSlider
          value={resolved.volume}
          onChange={onVolume}
          size={caps.multiStepVisible ? "older" : "young"}
          accessibilityLabel={copy("soundscape.volume")}
        />
      </View>
    </View>
  );
}
