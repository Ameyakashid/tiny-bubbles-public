/**
 * components/quests/QuestBoard.tsx — the kid rotating-quest surface (novelty-refresh
 * §2.1, M-C4). Rendered above "My Collection" on the rewards surface.
 *
 * Young (single-surface): ONE large, emoji-first, auto-spoken card, numbers hidden.
 * Older: up to three cards with numeric progress. The count is DERIVED from the
 * existing `multiStepVisible` capability flag (`shownQuestCount = caps.multiStepVisible
 * ? 3 : 1`) — NOT a new axis, and NEVER a raw age-mode read (this file never
 * references the mode; copy resolves via `useCopy`, sizing via resolved tokens).
 *
 * The active set is the DETERMINISTIC ISO-week window (`activeQuestsFor`) over the
 * age/premium-appropriate pool — identical on every device, no RNG. Rotation is
 * ensured on mount (idempotent within the week). SUPPRESSED entirely on the calm
 * path (`calmMode`) or when the parent turned quests off (`questsEnabled === false`)
 * — a calm child gets the plain routine + owned cosmetics, no quest layer (§2.5).
 */
import React, { useEffect } from "react";
import { View } from "react-native";

import { isoWeekKey } from "../../src/domain/dates";
import { activeQuestsFor, QUEST_BOARD_SIZE } from "../../src/domain/quests";
import { getQuestPool } from "../../src/data/questPool";
import { useCopy } from "../../src/i18n/useLocale";
import { isFeatureUnlocked, useEntitlements } from "../../src/services/entitlements";
import { useChildStore } from "../../src/state/childStore";
import { rotateQuests } from "../../src/state/gameplay";
import { now } from "../../src/state/ids";
import { useQuestStore } from "../../src/state/questStore";
import { useCapabilities } from "../../src/theme/ThemeProvider";
import { useThemeTokens } from "../../src/theme/useThemeTokens";
import AppText from "../ui/AppText";
import QuestCard from "./QuestCard";

export interface QuestBoardProps {
  childId: string;
}

export default function QuestBoard({ childId }: QuestBoardProps) {
  const t = useThemeTokens();
  const c = t.colors;
  const caps = useCapabilities();
  const copy = useCopy();

  const settings = useChildStore((s) => s.profiles[childId]?.settings);
  const timeZone = useChildStore((s) => s.profiles[childId]?.timeZone);
  const entitlement = useEntitlements();
  const questState = useQuestStore((s) => s.quests[childId]);

  // Suppress the WHOLE novelty layer on the calm path / when quests are off (§2.5).
  const calmMode = settings?.calmMode ?? false;
  const questsEnabled = settings?.questsEnabled ?? !calmMode;
  const suppressed = !settings || calmMode || !questsEnabled;

  const tz = timeZone ?? "UTC";
  const weekKey = isoWeekKey(now(), tz);

  // Ensure this week's board exists (deterministic, idempotent). Not run when
  // suppressed — `rotateQuests` itself also short-circuits on suppression.
  useEffect(() => {
    if (!suppressed) rotateQuests(childId);
  }, [childId, weekKey, suppressed]);

  if (suppressed) return null;

  const premium = isFeatureUnlocked("noveltyPipeline", entitlement);
  const simpleOnly = !caps.multiStepVisible;
  const pool = getQuestPool({ premium, simpleOnly });
  const orderedDefs = activeQuestsFor(weekKey, pool, QUEST_BOARD_SIZE);
  const shownCount = caps.multiStepVisible ? 3 : 1;
  const shown = orderedDefs.slice(0, shownCount);
  if (shown.length === 0) return null;

  // Young single-card mode auto-speaks the one quest label on mount.
  const autoSpeak = !caps.multiStepVisible;
  const showNumbers = caps.showNumbersAndCharts;
  const ttsEnabled = settings?.spokenLabelsEnabled ?? true;

  return (
    <View style={{ width: "100%", gap: t.spacing(3) }}>
      <View style={{ width: "100%", alignItems: "flex-start", marginTop: t.spacing(1) }}>
        <AppText
          style={{
            color: c.text,
            fontFamily: t.type.h2.family,
            fontSize: t.type.h2.size,
            fontWeight: "700",
          }}
        >
          {copy("quest.tabTitle")}
        </AppText>
      </View>
      {shown.map((def) => (
        <QuestCard
          key={def.id}
          def={def}
          progress={questState?.active[def.id]}
          showNumbers={showNumbers}
          ttsEnabled={ttsEnabled}
          autoSpeak={autoSpeak}
        />
      ))}
    </View>
  );
}
