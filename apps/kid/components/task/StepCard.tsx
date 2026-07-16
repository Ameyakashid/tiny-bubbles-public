/**
 * components/task/StepCard.tsx — one routine step, triple-coded (doc 66 M7).
 *
 * Every step is picture/emoji + icon + COLOR + an auto-spoken label, so a
 * non-reader can run the whole routine (feature #4). Two layout variants — chosen
 * by the runner from `capabilities.multiStepVisible`, NEVER raw ageMode:
 *   - "focal" (young): ONE big step fills the screen; the label auto-speaks.
 *   - "row"   (older): a checklist row; the label speaks on tap.
 *
 * COMPLETED steps render a CALM greyed "done" state (muted + a soft green check)
 * — NEVER a red/"failed" style (doc 66 M7 / §5). `skipped` looks the same calm
 * way (skipping is free and never penalized, doc 62 §5). There is no failure
 * visual anywhere in this component.
 */
import React from "react";
import { Pressable, Text, View } from "react-native";

import type { VisualLabel } from "../../src/domain/types";
import { useCopy } from "../../src/i18n/useLocale";
import { resolveStatusPresentation } from "../../src/theme/resolveStatusPresentation";
import { useThemeTokens } from "../../src/theme/useThemeTokens";
import AppText from "../ui/AppText";
import SpokenLabel from "../ui/SpokenLabel";

export type StepState = "active" | "done" | "skipped" | "upcoming";

export interface StepCardProps {
  label: VisualLabel;
  state: StepState;
  variant: "focal" | "row";
  /** text is the primary channel (capabilities.textPrimary) */
  showText?: boolean;
  /** auto-speak on mount (the young focal default) */
  autoSpeak?: boolean;
  /** master TTS toggle */
  ttsEnabled?: boolean;
  /** complete this step (the row check button; focal uses the external DoneButton) */
  onComplete?: () => void;
  /** reorder affordances (older list, when autonomy.canReorderSteps) */
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  /**
   * Persistent older fallback (verify-undo §2.2): long-press a RESOLVED row to
   * "Mark not done" (quick undo beyond the transient window). Only wired for
   * resolved rows; a neutral correction, never a punishment.
   */
  onLongPressUndo?: () => void;
  /** a11y hint for the long-press undo (resolved `undo.done`) */
  longPressUndoLabel?: string;
}

function StepCard(props: StepCardProps) {
  return props.variant === "focal" ? <FocalStep {...props} /> : <RowStep {...props} />;
}

// M-D2 (§2.4): memoized leaf so a routine re-render doesn't re-render every step row.
export default React.memo(StepCard);

const isResolved = (s: StepState) => s === "done" || s === "skipped";

// ---------------------------------------------------------------------------
// Focal (young) — one giant step.
// ---------------------------------------------------------------------------
function FocalStep({ label, autoSpeak, ttsEnabled }: StepCardProps) {
  const t = useThemeTokens();
  const c = t.colors;
  const tile = Math.min(t.contentMaxWidth * 0.66, 260);
  const glyph = label.emoji ?? label.icon ?? "🫧";

  return (
    <View style={{ alignItems: "center", gap: t.spacing(4) }}>
      <View
        style={{
          width: tile,
          height: tile,
          borderRadius: t.radius * 2,
          backgroundColor: c.surface,
          borderWidth: 4,
          borderColor: label.color,
          alignItems: "center",
          justifyContent: "center",
          shadowColor: "#0A2034",
          shadowOpacity: 0.1,
          shadowRadius: 16,
          shadowOffset: { width: 0, height: 6 },
          elevation: 3,
        }}
      >
        {/* color dot — the third (color) code, explicit for low-vision support */}
        <View
          style={{
            position: "absolute",
            top: t.spacing(3),
            right: t.spacing(3),
            width: 16,
            height: 16,
            borderRadius: 999,
            backgroundColor: label.color,
          }}
        />
        <Text style={{ fontSize: tile * 0.46 }}>{glyph}</Text>
      </View>

      {/* the spoken label — auto-speaks in young (pervasive TTS) */}
      <SpokenLabel
        text={label.spokenLabel}
        autoSpeak={autoSpeak}
        enabled={ttsEnabled}
        forceSpeakOnPress
        variant="h1"
        style={{ color: c.text, textAlign: "center" }}
      />
    </View>
  );
}

// ---------------------------------------------------------------------------
// Row (older) — a checklist line. Completed = calm greyed, never red.
// ---------------------------------------------------------------------------
function RowStep({
  label,
  state,
  ttsEnabled,
  onComplete,
  onMoveUp,
  onMoveDown,
  onLongPressUndo,
  longPressUndoLabel,
}: StepCardProps) {
  const t = useThemeTokens();
  const c = t.colors;
  const copy = useCopy();
  const resolved = isResolved(state);
  const active = state === "active";
  const glyph = label.emoji ?? label.icon ?? "🫧";
  const canReorder = Boolean(onMoveUp || onMoveDown);
  // Triple-coding (§2.4): the resolved chip carries icon + shape + LABEL, never
  // color alone. `done` = filled check + success; `skipped` = soft dash + textDim
  // — so a skipped step no longer looks identical to a completed one.
  const pres = resolveStatusPresentation(state);
  const statusColor = pres.colorKey === "success" ? c.success : c.textDim;
  const statusSurface = state === "skipped" ? c.surfaceAlt : c.successSurface;

  // A resolved row is long-pressable → "Mark not done" (persistent quick undo).
  const longPressable = resolved && Boolean(onLongPressUndo);
  const OuterRow: React.ComponentType<Record<string, unknown>> = longPressable ? Pressable : View;
  const outerProps: Record<string, unknown> = longPressable
    ? {
        onLongPress: onLongPressUndo,
        delayLongPress: 400,
        accessibilityHint: longPressUndoLabel,
      }
    : {};

  return (
    <OuterRow
      {...outerProps}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: t.spacing(2),
        backgroundColor: resolved ? c.surfaceSunken : c.surface,
        borderRadius: t.radius,
        paddingVertical: t.spacing(2.5),
        paddingHorizontal: t.spacing(3),
        borderWidth: active ? 2 : 1,
        borderColor: active ? c.primary : c.border,
        opacity: resolved ? 0.7 : 1,
      }}
    >
      {/* reorder handles (older autonomy) */}
      {canReorder && !resolved ? (
        <View style={{ marginRight: t.spacing(1) }}>
          <ReorderBtn glyph="▲" onPress={onMoveUp} c={c} />
          <ReorderBtn glyph="▼" onPress={onMoveDown} c={c} />
        </View>
      ) : null}

      {/* emoji chip with the step color */}
      <View
        style={{
          width: 44,
          height: 44,
          borderRadius: t.radius,
          backgroundColor: resolved ? c.surfaceAlt : label.color + "22",
          borderWidth: 1,
          borderColor: resolved ? c.border : label.color,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text style={{ fontSize: 22 }}>{glyph}</Text>
      </View>

      {/* label — speaks on tap */}
      <View style={{ flex: 1 }}>
        <SpokenLabel
          text={label.text ?? label.spokenLabel}
          enabled={ttsEnabled}
          forceSpeakOnPress
          variant="bodyLg"
          style={{
            color: resolved ? c.textDim : c.text,
          }}
        />
      </View>

      {/* trailing status: calm resolved chip (icon + shape + label, never red) or
          a tappable complete circle. Triple-coded via resolveStatusPresentation. */}
      {resolved ? (
        <View
          accessible
          accessibilityRole="text"
          accessibilityLabel={copy(pres.labelKey)}
          style={{
            width: 32,
            height: 32,
            borderRadius: 999,
            backgroundColor: statusSurface,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <AppText style={{ color: statusColor, fontSize: 18, fontWeight: "700" }}>
            {pres.icon}
          </AppText>
        </View>
      ) : (
        <Pressable
          onPress={onComplete}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: false }}
          accessibilityLabel={`Mark ${label.spokenLabel} done`}
          hitSlop={10}
          style={{
            width: 32,
            height: 32,
            borderRadius: 999,
            borderWidth: 2,
            borderColor: active ? c.primary : c.border,
            backgroundColor: active ? c.primary + "14" : "transparent",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text style={{ color: active ? c.primary : c.textDim, fontSize: 16 }}>○</Text>
        </Pressable>
      )}
    </OuterRow>
  );
}

function ReorderBtn({
  glyph,
  onPress,
  c,
}: {
  glyph: string;
  onPress?: () => void;
  c: ReturnType<typeof useThemeTokens>["colors"];
}) {
  if (!onPress) {
    return <View style={{ width: 22, height: 18 }} />;
  }
  return (
    <Pressable onPress={onPress} hitSlop={6} style={{ width: 22, height: 18, alignItems: "center", justifyContent: "center" }}>
      <Text style={{ color: c.textDim, fontSize: 12 }}>{glyph}</Text>
    </Pressable>
  );
}
