/**
 * components/rewards/RewardCard.tsx — one caregiver-set reward, kid-facing (doc
 * 63 Feature 2, doc 66 M8).
 *
 * Big, spoken card. Its state is anti-shame BY CONSTRUCTION (doc 66 §5):
 *   - affordable      -> a big "Get this!" tap that opens the escrow request
 *                        (parent-approved / auto-approved-under-N). Tokens are
 *                        only ever HELD here, never silently spent.
 *   - not affordable  -> calm "N more bubbles!" goal-gradient framing — never a
 *                        sales pitch, never "buy more", never a countdown.
 *   - pending         -> "Waiting for a grown-up 💛" + a forgiving "never mind"
 *                        that releases the hold with zero net change.
 *   - at a guardrail  -> "Come back later" (weekly limit / cooldown) — an
 *                        availability message, NEVER a punishment.
 *
 * `showNumbers` (from a capability flag) chooses numeric cost (older) vs a
 * number-free bubble-dot row (young). Never branches on raw ageMode (doc 66 §2).
 */
import React from "react";
import { Text, View } from "react-native";

import { bubblesUntil } from "../../src/domain/progressMeter";
import type { Reward } from "../../src/domain/types";
import type { RewardAvailability } from "../../src/domain/tokens";
import { useThemeTokens } from "../../src/theme/useThemeTokens";
import SpokenLabel from "../ui/SpokenLabel";
import DoneButton from "../task/DoneButton";

export interface RewardCardProps {
  reward: Reward;
  /** spendable balance (availableBalance — net of holds) */
  balance: number;
  availability: RewardAvailability;
  /** true when this child already has a still-held request for this reward */
  pending: boolean;
  showNumbers: boolean;
  ttsEnabled: boolean;
  /**
   * Child may self-request (child-autonomy §2.1, from `caps.canPickReward`). When
   * false the "Get this!" tap is replaced by the calm `askLabel` line — the menu
   * stays fully visible and "save toward" still works; NO lock/greyed/denied state.
   * Defaults true so existing callers are unchanged.
   */
  canRequest?: boolean;
  /** resolved "ask a grown-up" copy, shown when `canRequest` is false */
  askLabel?: string;
  onRequest: () => void;
  onCancel?: () => void;
  /** older only: set this reward as the save-toward goal */
  onSaveToward?: () => void;
  /**
   * Quick-undo of a JUST auto-approved redemption (verify-undo §2.3), passed only
   * within `UNDO_WINDOW_MS`. When present, the card shows a calm "Got it!" + a short
   * "Undo" that fully reverses it (refund + `reversed`). Outside the window it is
   * undefined and only the parent can reverse.
   */
  onUndo?: () => void;
  /** resolved `undo.step` copy for the undo link */
  undoLabel?: string;
}

const DOT_SLOTS = 8;

function RewardCard({
  reward,
  balance,
  availability,
  pending,
  showNumbers,
  ttsEnabled,
  canRequest = true,
  askLabel,
  onRequest,
  onCancel,
  onSaveToward,
  onUndo,
  undoLabel,
}: RewardCardProps) {
  const t = useThemeTokens();
  const c = t.colors;

  const cost = reward.costTokens;
  const remaining = bubblesUntil(balance, cost);
  const affordable = remaining === 0;
  const available = availability.available;

  return (
    <View
      style={{
        width: "100%",
        backgroundColor: c.surface,
        borderRadius: t.radius * 1.2,
        padding: t.spacing(4),
        gap: t.spacing(3),
        borderWidth: 1,
        borderColor: c.border,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: t.spacing(3) }}>
        <View
          style={{
            width: 56,
            height: 56,
            borderRadius: t.radius,
            backgroundColor: reward.label.color ?? c.surfaceAlt,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text style={{ fontSize: 30 }}>{reward.label.emoji ?? "⭐"}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <SpokenLabel
            text={reward.label.text ?? reward.label.spokenLabel}
            variant="bodyLg"
            enabled={ttsEnabled}
            forceSpeakOnPress
            style={{ color: c.text, fontWeight: "700" }}
          />
          <CostRow cost={cost} balance={balance} showNumbers={showNumbers} c={c} t={t} />
        </View>
      </View>

      {/* action / status zone */}
      {onUndo ? (
        // just auto-approved — a calm confirmation + a short, no-blame undo (§2.3)
        <View style={{ gap: t.spacing(2) }}>
          <StatusPill text="Got it! 🎁" tone="grow" c={c} t={t} />
          <Text
            onPress={onUndo}
            accessibilityRole="button"
            style={{ color: c.textDim, fontSize: t.type.label.size, textAlign: "center", paddingVertical: 6 }}
          >
            {undoLabel ?? "Undo"}
          </Text>
        </View>
      ) : pending ? (
        <View style={{ gap: t.spacing(2) }}>
          <StatusPill text="Waiting for a grown-up 💛" tone="info" c={c} t={t} />
          {onCancel ? (
            <Text
              onPress={onCancel}
              accessibilityRole="button"
              style={{ color: c.textDim, fontSize: t.type.label.size, textAlign: "center", paddingVertical: 6 }}
            >
              never mind
            </Text>
          ) : null}
        </View>
      ) : !available ? (
        <StatusPill
          text={
            availability.reason === "weekly_limit"
              ? "All done for this week — come back later 🙂"
              : "Come back a little later 🙂"
          }
          tone="calm"
          c={c}
          t={t}
        />
      ) : affordable ? (
        <View style={{ gap: t.spacing(2) }}>
          {canRequest ? (
            <DoneButton label="Get this!" glyph="🎁" onPress={onRequest} />
          ) : (
            // canPickReward off (§2.1): a calm, non-shaming line — never a lock or
            // "denied" state. The parent redeems from the dashboard; "save toward"
            // (below) still works because choosing a goal needs no approval.
            <StatusPill text={askLabel ?? "Ask a grown-up 💛"} tone="calm" c={c} t={t} />
          )}
          {onSaveToward ? (
            <Text
              onPress={onSaveToward}
              accessibilityRole="button"
              style={{ color: c.textDim, fontSize: t.type.label.size, textAlign: "center", paddingVertical: 4 }}
            >
              ⭐ save toward this
            </Text>
          ) : null}
        </View>
      ) : (
        <View style={{ gap: t.spacing(2) }}>
          <StatusPill text={`${remaining} more bubbles!`} tone="grow" c={c} t={t} />
          {onSaveToward ? (
            <Text
              onPress={onSaveToward}
              accessibilityRole="button"
              style={{ color: c.textDim, fontSize: t.type.label.size, textAlign: "center", paddingVertical: 4 }}
            >
              ⭐ save toward this
            </Text>
          ) : null}
        </View>
      )}
    </View>
  );
}

// M-D2 (§2.4): memoized leaf so a rewards-list re-render doesn't re-render every card.
export default React.memo(RewardCard);

type Tokens = ReturnType<typeof useThemeTokens>;
type Colors = Tokens["colors"];

/** Cost as a number (older) or a number-free bubble-dot row (young, doc 63 §2(c)). */
function CostRow({
  cost,
  balance,
  showNumbers,
  c,
  t,
}: {
  cost: number;
  balance: number;
  showNumbers: boolean;
  c: Colors;
  t: Tokens;
}) {
  if (showNumbers) {
    return (
      <Text style={{ color: c.textDim, fontSize: t.type.label.size }}>
        🫧 {cost} bubbles
      </Text>
    );
  }
  const slots = Math.min(DOT_SLOTS, Math.max(1, cost));
  const filled = Math.max(0, Math.min(slots, Math.round((Math.min(balance, cost) / Math.max(1, cost)) * slots)));
  return (
    <View style={{ flexDirection: "row", gap: 4, marginTop: 4 }}>
      {Array.from({ length: slots }).map((_, i) => (
        <View
          key={i}
          style={{
            width: 14,
            height: 14,
            borderRadius: 999,
            backgroundColor: i < filled ? c.token : c.surfaceSunken,
            borderWidth: 1,
            borderColor: c.border,
          }}
        />
      ))}
    </View>
  );
}

function StatusPill({
  text,
  tone,
  c,
  t,
}: {
  text: string;
  tone: "info" | "calm" | "grow";
  c: Colors;
  t: Tokens;
}) {
  const bg = tone === "grow" ? c.successSurface : c.surfaceAlt;
  const fg = tone === "grow" ? c.success : c.textDim;
  return (
    <View
      style={{
        backgroundColor: bg,
        borderRadius: 999,
        paddingVertical: t.spacing(2),
        paddingHorizontal: t.spacing(3),
        alignItems: "center",
      }}
    >
      <Text style={{ color: fg, fontFamily: t.type.label.family, fontSize: t.type.label.size, fontWeight: "600" }}>
        {text}
      </Text>
    </View>
  );
}
