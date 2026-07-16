/**
 * components/quests/QuestCard.tsx — one rotating quest (novelty-refresh §2.1, M-C4).
 *
 * Emoji + spoken label + a bubble-fill progress visual (reuses the shipped
 * `BubbleMeter` liquid-fill ring) + a calm forward caption. On completion it shows
 * an owned/done ✓ state (the celebratory reveal). ANTI-SHAME by construction:
 *   - progress framing is "a little more", NEVER a countdown/deadline/"expires";
 *   - there is no missable "Claim" button — the reward auto-grants upstream, this
 *     card just reveals the done state;
 *   - no fail/negative state; an unfinished quest simply isn't done.
 *
 * No age-mode read: the young/older differences arrive as PROPS from the board
 * (`showNumbers` from a capability flag, `autoSpeak` for the young single card).
 * The spoken label routes through `SpokenLabel`, which handles the mode-pitched
 * TTS internally — this file never references the mode.
 */
import React from "react";
import { View } from "react-native";

import type { QuestDef, QuestProgress } from "../../src/domain/types";
import { useCopy } from "../../src/i18n/useLocale";
import { useThemeTokens } from "../../src/theme/useThemeTokens";
import BubbleMeter from "../progress/BubbleMeter";
import AppText from "../ui/AppText";
import SpokenLabel from "../ui/SpokenLabel";

export interface QuestCardProps {
  def: QuestDef;
  /** current progress (undefined ⇒ a fresh zero-progress card) */
  progress?: QuestProgress;
  /** numeric count/target (older) vs bubble-only (young) — from a capability flag */
  showNumbers: boolean;
  /** master TTS toggle for the spoken label */
  ttsEnabled: boolean;
  /** auto-speak the label once on mount (the young single-card default) */
  autoSpeak?: boolean;
}

function QuestCard({
  def,
  progress,
  showNumbers,
  ttsEnabled,
  autoSpeak = false,
}: QuestCardProps) {
  const t = useThemeTokens();
  const c = t.colors;
  const copy = useCopy();

  const count = Math.min(def.target, progress?.count ?? 0);
  const done = progress?.claimed || count >= def.target;
  const emoji = def.label.emoji ?? "🫧";

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: t.spacing(3),
        width: "100%",
        backgroundColor: c.surface,
        borderRadius: t.radius,
        padding: t.spacing(3),
        borderWidth: done ? 2 : 1,
        borderColor: done ? c.success : c.border,
      }}
    >
      {/* emoji + spoken label + calm forward caption */}
      <View style={{ flex: 1, gap: 4 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <AppText style={{ fontSize: 24 }}>{emoji}</AppText>
          <SpokenLabel
            text={def.label.spokenLabel}
            autoSpeak={autoSpeak}
            enabled={ttsEnabled}
            variant="bodyLg"
            accessibilityLabel={def.label.spokenLabel}
          >
            <AppText
              numberOfLines={2}
              style={{
                color: c.text,
                fontFamily: t.type.bodyLg.family,
                fontSize: t.type.bodyLg.size,
                fontWeight: "700",
                flexShrink: 1,
              }}
            >
              {def.label.text ?? def.label.spokenLabel}
            </AppText>
          </SpokenLabel>
        </View>
        <AppText
          style={{
            color: done ? c.success : c.textDim,
            fontFamily: t.type.label.family,
            fontSize: t.type.label.size,
            fontWeight: done ? "700" : "400",
          }}
        >
          {done ? `${copy("quest.done")} ✓` : copy("quest.moreToGo")}
        </AppText>
      </View>

      {/* bubble-fill progress (reuses the shipped liquid meter) */}
      <BubbleMeter value={count} goal={def.target} showNumbers={showNumbers} size={64} />
    </View>
  );
}

// M-D2 (§2.4): memoized leaf so a board re-render doesn't re-render every card.
export default React.memo(QuestCard);
