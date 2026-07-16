/**
 * app/_theme-gallery.tsx — THEME GALLERY (dev diagnostic). **KEPT for on-device
 * verification (M15 override).** NOT linked from any kid/parent UI — reachable
 * only by the direct route "/_theme-gallery". See RUN.md "Dev diagnostic screens".
 *
 * Proves the theming/age-adaptive engine (doc 66 M2 acceptance): both modes
 * render SIMULTANEOUSLY via the scoped `overrideAgeMode` provider; toggling
 * lowStim desaturates + kills confetti + shortens motion; independent
 * companionStyle/textFirst overrides change framing/text without changing age;
 * tablet viewport changes contentMaxWidth/columns; SpokenLabel speaks
 * (age-pitched); resolveCelebration never lowers size by phase.
 *
 * Reachable at route "/_theme-gallery".
 */
import { Redirect, Stack } from "expo-router";
import React, { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { DEV_SCREENS_ENABLED } from "../src/config/flags";

import SpokenLabel from "../components/ui/SpokenLabel";
import type { CompanionStyle } from "../src/domain/types";
import { resolveContent } from "../src/theme/resolveContent";
import { ThemeProvider, useCapabilities, useCelebrationLevel } from "../src/theme/ThemeProvider";
import { useThemeTokens } from "../src/theme/useThemeTokens";

type StyleOverride = "default" | "cuddly" | "cool" | "avatar";
type TextOverride = "default" | "on" | "off";

export default function ThemeGallery() {
  // Dev-only screen: redirect away in a production store build (§2.6). The flag
  // is invariant per app session, so this never changes hook order.
  if (!DEV_SCREENS_ENABLED) return <Redirect href="/" />;

  const [lowStim, setLowStim] = useState(false);
  const [dark, setDark] = useState(false);
  const [styleOv, setStyleOv] = useState<StyleOverride>("default");
  const [textOv, setTextOv] = useState<TextOverride>("default");

  const companionStyle: CompanionStyle | undefined =
    styleOv === "default" ? undefined : styleOv;
  const textFirst: boolean | undefined =
    textOv === "default" ? undefined : textOv === "on";

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#0b141c" }} edges={["bottom"]}>
      <Stack.Screen options={{ headerShown: true, title: "M2 Theme Gallery" }} />
      <ScrollView contentContainerStyle={{ padding: 12, gap: 12 }}>
        <Text style={{ color: "#fff", fontSize: 13 }}>
          Temporary M2 de-risk screen — delete at M15. Two scoped
          ThemeProviders render young + older side-by-side from the SAME
          components.
        </Text>

        {/* shared controls (apply to both panels) */}
        <View style={{ gap: 8, backgroundColor: "#17242f", borderRadius: 12, padding: 12 }}>
          <Toggle label={`lowStim: ${lowStim ? "ON" : "off"}`} on={lowStim} onPress={() => setLowStim((v) => !v)} />
          <Toggle label={`older dark mode: ${dark ? "ON" : "off"}`} on={dark} onPress={() => setDark((v) => !v)} />
          <Cycle
            label={`companionStyle override: ${styleOv}`}
            onPress={() =>
              setStyleOv((v) =>
                v === "default" ? "cuddly" : v === "cuddly" ? "cool" : v === "cool" ? "avatar" : "default",
              )
            }
          />
          <Cycle
            label={`textFirst override: ${textOv}`}
            onPress={() =>
              setTextOv((v) => (v === "default" ? "on" : v === "on" ? "off" : "default"))
            }
          />
        </View>

        <View style={{ flexDirection: "row", gap: 12 }}>
          <View style={{ flex: 1 }}>
            <ThemeProvider
              overrideAgeMode="young"
              overrideSensoryMode={lowStim ? "lowStim" : "standard"}
              overrideCompanionStyle={companionStyle}
              overrideTextFirst={textFirst}
            >
              <ModePanel heading="young (Reef)" />
            </ThemeProvider>
          </View>
          <View style={{ flex: 1 }}>
            <ThemeProvider
              overrideAgeMode="older"
              overrideSensoryMode={lowStim ? "lowStim" : "standard"}
              overrideCompanionStyle={companionStyle}
              overrideTextFirst={textFirst}
              overrideColorScheme={dark ? "dark" : "light"}
            >
              <ModePanel heading="older (Tide)" />
            </ThemeProvider>
          </View>
          <View style={{ flex: 1 }}>
            <ThemeProvider
              overrideAgeMode="preteen"
              overrideSensoryMode={lowStim ? "lowStim" : "standard"}
              overrideCompanionStyle={companionStyle}
              overrideTextFirst={textFirst}
              overrideColorScheme={dark ? "dark" : "light"}
            >
              <ModePanel heading="preteen (Tide · Nova)" />
            </ThemeProvider>
          </View>
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

/** A preview tile. Reads ONLY resolved tokens/flags — no raw ageMode branch. */
function ModePanel({ heading }: { heading: string }) {
  const t = useThemeTokens();
  const caps = useCapabilities();
  const artVariant = resolveContent("buddy.artVariant", {
    companionStyle: caps.companionStyle,
  });
  const stepLevel = useCelebrationLevel({ salience: "step" });
  const routineLevel = useCelebrationLevel({ salience: "routineComplete" });
  const stepBonus = useCelebrationLevel({ salience: "step", bonus: true });
  const calmLevel = useCelebrationLevel({ salience: "routineComplete", calmMode: true });

  const c = t.colors;

  return (
    // className `bg-canvas` proves the CSS-var palette swap via ThemeProvider.
    <View
      className="bg-canvas"
      style={{
        borderRadius: t.radius,
        padding: t.spacing(4),
        gap: t.spacing(3),
        borderWidth: 1,
        borderColor: c.border,
        maxWidth: t.contentMaxWidth,
      }}
    >
      <Text style={{ color: c.text, fontFamily: t.type.h2.family, fontSize: t.type.h2.size }}>
        {heading}
      </Text>

      {/* big primary action sized by tokens */}
      <Pressable
        style={{
          minHeight: t.primaryActionMin,
          borderRadius: t.radius,
          backgroundColor: c.primary,
          alignItems: "center",
          justifyContent: "center",
          paddingHorizontal: t.spacing(3),
        }}
      >
        {t.textFirst ? (
          <Text style={{ color: c.onPrimary, fontFamily: t.type.label.family, fontSize: t.type.label.size }}>
            {resolveContent("task.done", { ageMode: t.ageMode })}
          </Text>
        ) : (
          <Text style={{ fontSize: 40 }}>✓</Text>
        )}
      </Pressable>

      {/* spoken label — auto-speaks in young (spokenLabelDefault) */}
      <SpokenLabel text={resolveContent("buddy.greet", { ageMode: t.ageMode })} forceSpeakOnPress />

      <Stat k="touchTargetMin" v={`${t.touchTargetMin}`} c={c.textDim} />
      <Stat k="primaryActionMin" v={`${t.primaryActionMin}`} c={c.textDim} />
      <Stat k="fontScale" v={`${t.fontScale}`} c={c.textDim} />
      <Stat k="textFirst" v={`${t.textFirst}`} c={c.textDim} />
      <Stat k="confetti" v={`${t.confetti}`} c={c.textDim} />
      <Stat k="animScale" v={`${t.animationDurationScale}`} c={c.textDim} />
      <Stat k="haptics" v={t.haptics} c={c.textDim} />
      <Stat k="screenSize" v={t.screenSize} c={c.textDim} />
      <Stat k="contentMaxWidth" v={`${t.contentMaxWidth}`} c={c.textDim} />
      <Stat k="columns" v={`${t.columns}`} c={c.textDim} />
      <Stat k="maxChoices" v={`${caps.maxChoices}`} c={c.textDim} />
      <Stat k="multiStepVisible" v={`${caps.multiStepVisible}`} c={c.textDim} />
      <Stat k="companionStyle" v={caps.companionStyle} c={c.textDim} />
      <Stat k="companionFraming" v={caps.companionFraming} c={c.textDim} />
      <Stat k="canPickTheme" v={`${caps.canPickTheme}`} c={c.textDim} />
      <Stat k="buddy.artVariant" v={artVariant} c={c.textDim} />

      <View style={{ height: 1, backgroundColor: c.separator }} />
      <Text style={{ color: c.text, fontFamily: t.type.label.family, fontSize: t.type.label.size }}>
        resolveCelebration
      </Text>
      <Stat k="step" v={stepLevel} c={c.textDim} />
      <Stat k="step+bonus" v={stepBonus} c={c.textDim} />
      <Stat k="routine" v={routineLevel} c={c.textDim} />
      <Stat k="routine+calm" v={calmLevel} c={c.textDim} />

      {/* celebration hue swatches (single hue in Stillwater) */}
      <View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap" }}>
        {c.celebration.map((hue) => (
          <View key={hue} style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: hue }} />
        ))}
      </View>
    </View>
  );
}

function Stat({ k, v, c }: { k: string; v: string; c: string }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
      <Text style={{ color: c, fontSize: 12 }}>{k}</Text>
      <Text style={{ color: c, fontSize: 12, fontWeight: "700" }}>{v}</Text>
    </View>
  );
}

function Toggle({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        backgroundColor: on ? "#39a7ce" : "#2a3b49",
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 10,
      }}
    >
      <Text style={{ color: "#fff", fontWeight: "700" }}>{label}</Text>
    </Pressable>
  );
}

function Cycle({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={{ backgroundColor: "#2a3b49", paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10 }}
    >
      <Text style={{ color: "#fff", fontWeight: "700" }}>{label}</Text>
    </Pressable>
  );
}
