/**
 * components/task/VerifyPrompt.tsx — the optional light-verify affordance
 * (verify-undo §2.1 / §CREATE, feature #17).
 *
 * Shown AT/AFTER completion (never before Done — completion + the token payout are
 * already immediate and unconditional). Driven ONLY by `task.verification.mode`:
 *   - `self`  → a single optional "I did it! 👍" tap that stamps `verifiedBy:'child'`.
 *               TOKEN-NEUTRAL (no extra tokens — avoids re-gaming).
 *   - `photo` → "Show a photo? 📷" + an EQUALLY-prominent "Skip" (never nagged
 *               twice). Hidden/degraded to `self` when the camera is unavailable.
 *   - `parent`/`none` → nothing kid-facing (a grown-up confirms later, §2.4).
 *
 * Calm / low-stim: no confetti, no auto-speak insistence; `calm` hides the `self`
 * sparkle entirely (the stamp still records). Variant (focal vs row) + all copy are
 * passed in resolved from capability flags — this component reads NO raw ageMode.
 * It NEVER blocks the "next step" advance; the child can ignore it and move on.
 */
import React from "react";
import { Pressable, Text, View } from "react-native";

import type { VerificationMode } from "../../src/domain/types";
import { useThemeTokens } from "../../src/theme/useThemeTokens";

export interface VerifyPromptProps {
  mode: VerificationMode;
  variant: "focal" | "row";
  /** resolved `verify.self` copy */
  selfLabel: string;
  /** resolved `verify.photo` copy */
  photoLabel: string;
  /** resolved `verify.skip` copy */
  skipLabel: string;
  /** resolved `verify.parentConfirm` copy (calm confirmation after a self-verify) */
  confirmedLabel: string;
  /** feature-detected (photoVerify): hide/degrade the photo affordance when false */
  photoAvailable: boolean;
  /** low-stim: hide the self sparkle glyph (the stamp still records) */
  calm: boolean;
  /** already stamped this run → show a calm confirmation instead of the button */
  verified: boolean;
  onSelfVerify: () => void;
  onPhoto: () => void;
  onSkip: () => void;
}

export default function VerifyPrompt({
  mode,
  variant,
  selfLabel,
  photoLabel,
  skipLabel,
  confirmedLabel,
  photoAvailable,
  calm,
  verified,
  onSelfVerify,
  onPhoto,
  onSkip,
}: VerifyPromptProps) {
  const t = useThemeTokens();
  const c = t.colors;

  // `photo` with no camera degrades to a `self` tap (verify-undo §5); `parent`/
  // `none` render nothing kid-facing (the grown-up confirms at leisure, §2.4).
  const effective: VerificationMode = mode === "photo" && !photoAvailable ? "self" : mode;
  if (effective !== "self" && effective !== "photo") return null;

  const row = variant === "row";

  // Already confirmed — a small calm acknowledgement (no sparkle in calm mode).
  if (verified) {
    return (
      <View
        accessibilityRole="text"
        accessibilityLabel={confirmedLabel}
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 6,
          alignSelf: row ? "flex-start" : "center",
          paddingVertical: 6,
        }}
      >
        {calm ? null : <Text style={{ fontSize: 16 }}>✨</Text>}
        <Text style={{ color: c.success, fontFamily: t.type.label.family, fontSize: t.type.label.size, fontWeight: "700" }}>
          {confirmedLabel}
        </Text>
      </View>
    );
  }

  if (effective === "self") {
    return (
      <Pill
        label={selfLabel}
        emoji={calm ? undefined : "👍"}
        tone="primary"
        row={row}
        onPress={onSelfVerify}
        c={c}
        t={t}
      />
    );
  }

  // photo — the capture tap + an equally-weighted Skip (never nagged twice).
  return (
    <View
      style={{
        flexDirection: row ? "row" : "column",
        alignItems: "center",
        justifyContent: "center",
        gap: t.spacing(2),
        alignSelf: row ? "flex-start" : "center",
      }}
    >
      <Pill label={photoLabel} tone="primary" row={row} onPress={onPhoto} c={c} t={t} />
      <Pill label={skipLabel} tone="dim" row={row} onPress={onSkip} c={c} t={t} />
    </View>
  );
}

type Tokens = ReturnType<typeof useThemeTokens>;

function Pill({
  label,
  emoji,
  tone,
  row,
  onPress,
  c,
  t,
}: {
  label: string;
  emoji?: string;
  tone: "primary" | "dim";
  row: boolean;
  onPress: () => void;
  c: Tokens["colors"];
  t: Tokens;
}) {
  const primary = tone === "primary";
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={8}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        minHeight: row ? undefined : 48,
        paddingVertical: t.spacing(2),
        paddingHorizontal: t.spacing(4),
        borderRadius: 999,
        backgroundColor: primary ? c.surfaceAlt : "transparent",
        borderWidth: primary ? 1 : 0,
        borderColor: c.border,
      }}
    >
      {emoji ? <Text style={{ fontSize: 16 }}>{emoji}</Text> : null}
      <Text
        style={{
          color: primary ? c.primary : c.textDim,
          fontFamily: t.type.label.family,
          fontSize: t.type.label.size,
          fontWeight: primary ? "700" : "500",
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}
