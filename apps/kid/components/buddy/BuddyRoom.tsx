/**
 * components/buddy/BuddyRoom.tsx — the companion surface (doc 66 M6).
 *
 * Shows the live <BubbleBuddy> for one child, its name + nurture progression
 * (bond level / growth stage, both MONOTONIC from lifetimeEarned), the curated
 * customization (color / finish / accessory / name) wired to `buddyStore`, and a
 * dev debug panel that drives the mood via REAL store events + advances growth.
 *
 * The art variant is chosen from the resolved `caps.companionStyle` (which reaches
 * "avatar"/Nova), NEVER from `ageMode` — and no `ageMode` prop is ever passed to
 * <BubbleBuddy> (doc 66 §1b.7). The nurture labels reframe by band (preteen →
 * Level / Rank / Vibe) via `resolveContent`, over IDENTICAL data. Components read
 * resolved tokens / capability flags / resolved content only.
 */
import React, { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";

import SpokenLabel from "../ui/SpokenLabel";
import { playCue } from "../../src/services/playCue";
import { TOKENS_PER_BOND_LEVEL } from "../../src/domain/companionMood";
import {
  isCompanionNameAllowed,
  MAX_COMPANION_NAME_LEN,
  normalizeCompanionName,
} from "../../src/domain/companionName";
import type { Cosmetic } from "../../src/domain/types";
import {
  getAllCosmetics,
  getCosmetic,
} from "../../src/data/buddyCosmetics";
import { useBuddyStore } from "../../src/state/buddyStore";
import { emitQuestSignal } from "../../src/state/gameplay";
import { resolveContent } from "../../src/theme/resolveContent";
import { useCapabilities, useThemeInputs } from "../../src/theme/ThemeProvider";
import { useThemeTokens } from "../../src/theme/useThemeTokens";

import BubbleBuddy from "./BubbleBuddy";
import { isBuddyFinish, type BuddyFinish } from "./buddyVisuals";

/** A cosmetic is usable now if it's owned, or it's a free (cost-0, non-premium) base item. */
function isUnlocked(c: Cosmetic, unlockedItems: string[]): boolean {
  return unlockedItems.includes(c.id) || (c.unlockCost === 0 && !c.premium);
}

export interface BuddyRoomProps {
  childId: string;
}

export default function BuddyRoom({ childId }: BuddyRoomProps) {
  const t = useThemeTokens();
  const caps = useCapabilities();
  const { ageMode } = useThemeInputs();
  const c = t.colors;

  const companion = useBuddyStore((s) => s.companions[childId]);
  const renameCompanion = useBuddyStore((s) => s.renameCompanion);
  const setCustomization = useBuddyStore((s) => s.setCustomization);
  const equip = useBuddyStore((s) => s.equip);
  const applyEvent = useBuddyStore((s) => s.applyEvent);
  const decay = useBuddyStore((s) => s.decay);
  const nurture = useBuddyStore((s) => s.nurture);

  const [nameDraft, setNameDraft] = useState(companion?.name ?? "");
  // demo "earning" baseline so the debug grow-button advances the buddy visibly
  const [demoLifetime, setDemoLifetime] = useState(
    () => (companion?.bondLevel ?? 0) * TOKENS_PER_BOND_LEVEL,
  );

  // gentle mood decay tick so a transient mood (celebrating) settles to content
  // on-screen, exactly as documented — without waiting for the next interaction.
  useEffect(() => {
    const id = setInterval(() => decay(childId), 2000);
    return () => clearInterval(id);
  }, [childId, decay]);

  // the RESOLVED companion style (reaches "avatar"; never a framing round-trip) — never age
  const variant = resolveContent("buddy.artVariant", { companionStyle: caps.companionStyle });

  const allCosmetics = useMemo(() => getAllCosmetics(), []);
  const colors = useMemo(() => allCosmetics.filter((x) => x.slot === "color"), [allCosmetics]);
  const finishes = useMemo(() => allCosmetics.filter((x) => x.slot === "finish"), [allCosmetics]);
  const accessories = useMemo(
    () => allCosmetics.filter((x) => x.slot === "accessory" || x.slot === "hat"),
    [allCosmetics],
  );

  if (!companion) return null;

  const unlocked = companion.unlockedItems;
  const finish: BuddyFinish = isBuddyFinish(companion.customization.finish)
    ? companion.customization.finish
    : "plain";
  const equippedAccId = companion.equipped.hatId;
  const accCos = equippedAccId ? getCosmetic(equippedAccId) : undefined;
  const accessoryEmoji = accCos?.value ?? accCos?.label.emoji ?? null;

  const saveName = () => {
    // Curated-autonomy exception (§2.2): the ONE free-text kid input. Cap the
    // length + run the light offline profanity check. A flagged/empty entry is
    // gently rejected (the current name is kept + the draft reverts) — no scold,
    // no error banner. ZERO-AI, no network.
    const next = normalizeCompanionName(nameDraft);
    if (isCompanionNameAllowed(next)) {
      renameCompanion(childId, next);
      setNameDraft(next);
    } else {
      setNameDraft(companion.name);
    }
  };

  const grow = () => {
    const next = demoLifetime + TOKENS_PER_BOND_LEVEL;
    setDemoLifetime(next);
    nurture(childId, next);
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: c.canvas }}
      contentContainerStyle={{
        padding: t.spacing(4),
        gap: t.spacing(4),
        alignItems: "center",
        maxWidth: t.contentMaxWidth,
        alignSelf: "center",
        width: "100%",
      }}
    >
      {/* name (TTS speaks it on tap) */}
      <SpokenLabel
        text={companion.name}
        variant="h1"
        forceSpeakOnPress
        style={{ color: c.text, textAlign: "center" }}
      />

      {/* the live buddy — tapping it greets (curious) */}
      <BubbleBuddy
        variant={variant}
        mood={companion.mood}
        bodyHue={companion.customization.baseColor}
        finish={finish}
        accessory={accessoryEmoji}
        name={companion.name}
        growthStage={companion.growthStage}
        size={Math.min(260, t.contentMaxWidth * 0.7)}
        animate={t.motion.loopsEnabled}
        onPress={() => {
          playCue("buddy.greet"); // non-verbal companion "boop" (doc 61 §9.2)
          applyEvent(childId, "tap");
        }}
      />

      {/* nurture readout — bond + growth are monotonic from lifetimeEarned */}
      <View
        style={{
          flexDirection: "row",
          gap: t.spacing(3),
          backgroundColor: c.surface,
          borderRadius: t.radius,
          paddingVertical: t.spacing(3),
          paddingHorizontal: t.spacing(4),
          borderWidth: 1,
          borderColor: c.border,
        }}
      >
        {/* labels reframe by band (preteen → Level / Rank / Vibe); data is identical */}
        <Stat label={resolveContent("buddy.stat.bond", { ageMode })} value={`${companion.bondLevel}`} c={c} t={t} />
        <Stat label={resolveContent("buddy.stat.growth", { ageMode })} value={`${companion.growthStage}/5`} c={c} t={t} />
        <Stat label={resolveContent("buddy.stat.mood", { ageMode })} value={companion.mood} c={c} t={t} />
      </View>

      {/* customization — each section gated by a capability flag, NOT ageMode */}
      {caps.canPickColor ? (
        <Section title="Color" c={c} t={t}>
          <Row>
            {colors.map((cos) => {
              const usable = isUnlocked(cos, unlocked);
              const selected = companion.customization.baseColor === cos.value;
              return (
                <Swatch
                  key={cos.id}
                  color={cos.value ?? "#CCC"}
                  selected={selected}
                  locked={!usable}
                  onPress={() => {
                    if (usable && cos.value) {
                      setCustomization(childId, { baseColor: cos.value });
                      emitQuestSignal(childId, { kind: "customizeBuddy", delta: 1 });
                    }
                  }}
                  ring={c.primary}
                  border={c.border}
                />
              );
            })}
          </Row>
        </Section>
      ) : null}

      {caps.canPickTheme ? (
        <Section title="Finish" c={c} t={t}>
          <Row>
            {finishes.map((cos) => {
              const usable = isUnlocked(cos, unlocked);
              const selected = finish === cos.value;
              return (
                <Chip
                  key={cos.id}
                  label={cos.label.text ?? cos.label.spokenLabel}
                  selected={selected}
                  locked={!usable}
                  onPress={() => {
                    if (usable && cos.value) {
                      setCustomization(childId, { finish: cos.value });
                      emitQuestSignal(childId, { kind: "customizeBuddy", delta: 1 });
                    }
                  }}
                  c={c}
                  t={t}
                />
              );
            })}
          </Row>
        </Section>
      ) : null}

      {caps.canPickAccessory ? (
        <Section title="Accessory" c={c} t={t}>
          <Row>
            <Chip
              label="None"
              selected={!equippedAccId}
              locked={false}
              onPress={() => equip(childId, "hatId", undefined)}
              c={c}
              t={t}
            />
            {accessories.map((cos) => {
              const usable = isUnlocked(cos, unlocked);
              const selected = equippedAccId === cos.id;
              const emoji = cos.value ?? cos.label.emoji ?? "•";
              return (
                <Chip
                  key={cos.id}
                  label={`${emoji} ${cos.label.text ?? ""}`.trim()}
                  selected={selected}
                  locked={!usable}
                  onPress={() => {
                    if (usable) {
                      equip(childId, "hatId", selected ? undefined : cos.id);
                      if (!selected) emitQuestSignal(childId, { kind: "customizeBuddy", delta: 1 });
                    }
                  }}
                  c={c}
                  t={t}
                />
              );
            })}
          </Row>
        </Section>
      ) : null}

      {/* name editing (autonomy) */}
      <Section title="Name" c={c} t={t}>
        <View style={{ flexDirection: "row", gap: t.spacing(2), alignItems: "center" }}>
          <TextInput
            value={nameDraft}
            onChangeText={setNameDraft}
            onSubmitEditing={saveName}
            maxLength={MAX_COMPANION_NAME_LEN}
            placeholder="Name your buddy"
            placeholderTextColor={c.textDim}
            style={{
              flex: 1,
              backgroundColor: c.surfaceAlt,
              borderRadius: t.radius,
              borderWidth: 1,
              borderColor: c.border,
              paddingHorizontal: t.spacing(3),
              paddingVertical: t.spacing(2),
              color: c.text,
              fontSize: t.type.body.size,
              fontFamily: t.type.body.family,
            }}
          />
          <TextButton label="Save" onPress={saveName} c={c} t={t} />
        </View>
      </Section>

      {/* DEV: mood + growth debug. Real events drive the same store paths the
          M7 runner will use; this just lets the user exercise them now. */}
      <Section title="Debug · mood + growth (M6)" c={c} t={t}>
        <Row>
          <TextButton label="Step done" onPress={() => applyEvent(childId, "stepDone")} c={c} t={t} />
          <TextButton label="Routine ✓" onPress={() => applyEvent(childId, "routineComplete")} c={c} t={t} />
          <TextButton label="Welcome back" onPress={() => applyEvent(childId, "returnAfterAbsence")} c={c} t={t} />
        </Row>
        <Row>
          <TextButton label="Curious" onPress={() => applyEvent(childId, "tap")} c={c} t={t} />
          <TextButton label="Rest" onPress={() => applyEvent(childId, "rest")} c={c} t={t} />
          <TextButton label="Settle" onPress={() => decay(childId)} c={c} t={t} />
        </Row>
        <Row>
          <TextButton
            label={`Give ${TOKENS_PER_BOND_LEVEL} bubbles (grow)`}
            onPress={grow}
            c={c}
            t={t}
          />
        </Row>
      </Section>
    </ScrollView>
  );
}

// ---------------------------------------------------------------------------
// Small presentational helpers (read resolved tokens; no raw-ageMode branches).
// ---------------------------------------------------------------------------

type Tokens = ReturnType<typeof useThemeTokens>;
type Colors = Tokens["colors"];

function Row({ children }: { children: React.ReactNode }) {
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>{children}</View>
  );
}

function Section({
  title,
  c,
  t,
  children,
}: {
  title: string;
  c: Colors;
  t: Tokens;
  children: React.ReactNode;
}) {
  return (
    <View
      style={{
        width: "100%",
        backgroundColor: c.surface,
        borderRadius: t.radius,
        padding: t.spacing(3),
        gap: t.spacing(2),
        borderWidth: 1,
        borderColor: c.border,
      }}
    >
      <Text
        style={{
          color: c.textDim,
          fontFamily: t.type.label.family,
          fontSize: t.type.label.size,
          fontWeight: t.type.label.weight,
        }}
      >
        {title}
      </Text>
      {children}
    </View>
  );
}

function Stat({ label, value, c, t }: { label: string; value: string; c: Colors; t: Tokens }) {
  return (
    <View style={{ alignItems: "center", minWidth: 56 }}>
      <Text style={{ color: c.text, fontFamily: t.type.h2.family, fontSize: t.type.h2.size }}>
        {value}
      </Text>
      <Text style={{ color: c.textDim, fontSize: t.type.caption.size }}>{label}</Text>
    </View>
  );
}

function Swatch({
  color,
  selected,
  locked,
  onPress,
  ring,
  border,
}: {
  color: string;
  selected: boolean;
  locked: boolean;
  onPress: () => void;
  ring: string;
  border: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={locked}
      hitSlop={6}
      style={{
        width: 44,
        height: 44,
        borderRadius: 999,
        backgroundColor: color,
        opacity: locked ? 0.35 : 1,
        borderWidth: selected ? 3 : 1,
        borderColor: selected ? ring : border,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {locked ? <Text style={{ fontSize: 14 }}>🔒</Text> : null}
    </Pressable>
  );
}

function Chip({
  label,
  selected,
  locked,
  onPress,
  c,
  t,
}: {
  label: string;
  selected: boolean;
  locked: boolean;
  onPress: () => void;
  c: Colors;
  t: Tokens;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={locked}
      hitSlop={6}
      style={{
        paddingHorizontal: t.spacing(3),
        paddingVertical: t.spacing(2),
        borderRadius: t.radius,
        backgroundColor: selected ? c.primary : c.surfaceAlt,
        opacity: locked ? 0.4 : 1,
        borderWidth: 1,
        borderColor: selected ? c.primary : c.border,
        minHeight: 44,
        justifyContent: "center",
      }}
    >
      <Text
        style={{
          color: selected ? c.onPrimary : c.text,
          fontSize: t.type.label.size,
          fontFamily: t.type.label.family,
        }}
      >
        {locked ? `🔒 ${label}` : label}
      </Text>
    </Pressable>
  );
}

function TextButton({
  label,
  onPress,
  c,
  t,
}: {
  label: string;
  onPress: () => void;
  c: Colors;
  t: Tokens;
}) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={6}
      style={{
        paddingHorizontal: t.spacing(3),
        paddingVertical: t.spacing(2),
        borderRadius: t.radius,
        backgroundColor: c.primary,
        minHeight: 44,
        justifyContent: "center",
      }}
    >
      <Text
        style={{
          color: c.onPrimary,
          fontSize: t.type.label.size,
          fontFamily: t.type.label.family,
          fontWeight: t.type.label.weight,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}
