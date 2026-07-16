/**
 * app/(kid)/rewards.tsx — the kid token economy surface (doc 63 Features 2/6/7,
 * doc 66 M8).
 *
 * Thin screen: it resolves the active child + reads the persisted economy slices
 * and composes the M8 components. The escrow MATH lives in the pure domain
 * (tokens.ts) and is coordinated by the gameplay orchestrator — this screen only
 * renders + dispatches intent.
 *
 * Anti-shame invariants surfaced here (doc 66 §5):
 *   - the reward list is SLICED to `capabilities.maxChoices` (3 young / 6 older)
 *     regardless of how many the parent defined — curated autonomy, no overload;
 *   - affordability is calm "N more bubbles!" framing, never a sales pitch;
 *   - redeeming only ever HOLDS tokens (escrow) — nothing is auto-deducted;
 *   - a reward at its weekly limit / cooldown shows "come back later", never a
 *     punishment; the collectibles wall never shows the child a paywall.
 *
 * Everything flows through resolved tokens / capability flags — no raw ageMode.
 */
import React, { useEffect, useMemo, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { UNDO_WINDOW_MS } from "../../src/domain/constants";
import { availableBalance } from "../../src/domain/gamification";
import { TOKENS_PER_BOND_LEVEL } from "../../src/domain/companionMood";
import { isRewardAvailable } from "../../src/domain/tokens";
import type { RedemptionRequest } from "../../src/domain/types";
import { useBuddyStore } from "../../src/state/buddyStore";
import { useChildStore } from "../../src/state/childStore";
import {
  cancelReward,
  requestReward,
  reverseRedemption,
  setSavingToward,
  unlockCosmeticWithTokens,
} from "../../src/state/gameplay";
import { now } from "../../src/state/ids";
import { useRewardStore } from "../../src/state/rewardStore";
import { useSettingsStore } from "../../src/state/settingsStore";
import { playCue } from "../../src/services/playCue";
import { resolveContent } from "../../src/theme/resolveContent";
import { useCapabilities, useThemeInputs } from "../../src/theme/ThemeProvider";
import { useThemeTokens } from "../../src/theme/useThemeTokens";

import BubbleMeter from "../../components/progress/BubbleMeter";
import GoalBar from "../../components/progress/GoalBar";
import StreakRing from "../../components/progress/StreakRing";
import QuestBoard from "../../components/quests/QuestBoard";
import CollectiblesGrid from "../../components/rewards/CollectiblesGrid";
import RewardCard from "../../components/rewards/RewardCard";
import TokenMeter from "../../components/rewards/TokenMeter";

export default function Rewards() {
  const t = useThemeTokens();
  const c = t.colors;
  const caps = useCapabilities();
  const { ageMode } = useThemeInputs();

  const childId = useSettingsStore((s) => s.meta.activeChildId);

  const ledger = useChildStore((s) => (childId ? s.ledgers[childId] : undefined));
  const progress = useChildStore((s) => (childId ? s.progress[childId] : undefined));
  const settings = useChildStore((s) => (childId ? s.profiles[childId]?.settings : undefined));
  const companion = useBuddyStore((s) => (childId ? s.companions[childId] : undefined));
  const rewards = useRewardStore((s) => (childId ? s.rewards[childId] : undefined));
  const redemptions = useRewardStore((s) => (childId ? s.redemptions[childId] : undefined));

  const balance = ledger ? availableBalance(ledger) : 0;
  const held = ledger?.heldTokens ?? 0;
  const lifetimeEarned = ledger?.lifetimeEarned ?? 0;
  const showNumbers = caps.showNumbersAndCharts;
  const ttsEnabled = settings?.spokenLabelsEnabled ?? true;

  // pending (still-held) request per reward, for the "waiting" + "never mind" UI
  const pendingByReward = useMemo(() => {
    const map = new Map<string, RedemptionRequest>();
    for (const r of redemptions ?? []) {
      if (r.status === "requested") map.set(r.rewardId, r);
    }
    return map;
  }, [redemptions]);

  // Quick-undo window for a JUST auto-approved redemption (verify-undo §2.3). A
  // tick forces a re-render at window expiry so the "Undo" fades on its own.
  const [tick, setTick] = useState(0);
  const recentGrantByReward = useMemo(() => {
    const map = new Map<string, RedemptionRequest>();
    const t0 = now();
    for (const r of redemptions ?? []) {
      if (r.status !== "approved" && r.status !== "fulfilled") continue;
      const at = r.fulfilledAt ?? r.decidedAt ?? 0;
      if (t0 - at > UNDO_WINDOW_MS) continue;
      const existing = map.get(r.rewardId);
      const eAt = existing ? existing.fulfilledAt ?? existing.decidedAt ?? 0 : -1;
      if (at > eAt) map.set(r.rewardId, r);
    }
    return map;
    // `tick` re-evaluates the window as it elapses.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [redemptions, tick]);

  useEffect(() => {
    if (recentGrantByReward.size === 0) return;
    const t0 = now();
    let soonest = Infinity;
    for (const r of recentGrantByReward.values()) {
      soonest = Math.min(soonest, (r.fulfilledAt ?? r.decidedAt ?? 0) + UNDO_WINDOW_MS);
    }
    const id = setTimeout(() => setTick((x) => x + 1), Math.max(0, soonest - t0) + 50);
    return () => clearTimeout(id);
  }, [recentGrantByReward]);

  // curated-autonomy slice: only ACTIVE rewards, capped at maxChoices (3|6)
  const visibleRewards = useMemo(
    () => (rewards ?? []).filter((r) => r.active).slice(0, caps.maxChoices),
    [rewards, caps.maxChoices],
  );

  const savingReward = useMemo(() => {
    const id = progress?.savingTowardRewardId;
    if (!id) return undefined;
    return (rewards ?? []).find((r) => r.id === id && r.active);
  }, [progress?.savingTowardRewardId, rewards]);

  if (!childId || !ledger) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: c.canvas }} edges={["top"]}>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: t.spacing(6) }}>
          <Text style={{ fontSize: 56 }}>🫧</Text>
          <Text style={{ color: c.textDim, fontSize: t.type.body.size, textAlign: "center", marginTop: 8 }}>
            Pop some bubbles to fill your treasure!
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // BubbleMeter: endowed progress toward the buddy's next bond level (nurture-shared
  // with M6) — starts partly full, grows as bubbles are earned, never empty.
  const towardNextBond = lifetimeEarned % TOKENS_PER_BOND_LEVEL;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.canvas }} edges={["top"]}>
      <ScrollView
        contentContainerStyle={{
          padding: t.spacing(4),
          gap: t.spacing(4),
          alignItems: "center",
          maxWidth: t.contentMaxWidth,
          alignSelf: "center",
          width: "100%",
        }}
      >
        {/* spendable bubbles */}
        <TokenMeter balance={balance} held={held} />

        {/* endowed bubble meter + cumulative (always-safe) total */}
        <View style={{ alignItems: "center", gap: t.spacing(2) }}>
          <BubbleMeter
            value={towardNextBond}
            goal={TOKENS_PER_BOND_LEVEL}
            showNumbers={showNumbers}
            caption={companion ? `to grow ${companion.name}` : "to grow your buddy"}
            size={Math.min(180, t.contentMaxWidth * 0.5)}
          />
          {progress ? (
            <Text style={{ color: c.textDim, fontSize: t.type.body.size }}>
              {resolveContent("progress.popped", { ageMode })}{" "}
              <Text style={{ color: c.text, fontWeight: "700" }}>{progress.cumulativeCount}</Text>
            </Text>
          ) : null}
        </View>

        {/* older: opt-in forgiving streak + a save-toward goal bar */}
        {showNumbers && progress ? <StreakRing progress={progress} /> : null}
        {showNumbers && savingReward ? (
          <GoalBar
            reward={savingReward}
            balance={balance}
            onClear={() => setSavingToward(childId, null)}
          />
        ) : null}

        {/* the curated reward menu */}
        <SectionHeader title={resolveContent("rewards.tabTitle", { ageMode })} c={c} t={t} />
        <View style={{ width: "100%", gap: t.spacing(3) }}>
          {visibleRewards.length === 0 ? (
            <Text style={{ color: c.textDim, fontSize: t.type.body.size, textAlign: "center" }}>
              {resolveContent("empty.rewards", { ageMode })}
            </Text>
          ) : (
            visibleRewards.map((reward) => {
              const pending = pendingByReward.get(reward.id);
              const recentGrant = recentGrantByReward.get(reward.id);
              return (
                <RewardCard
                  key={reward.id}
                  reward={reward}
                  balance={balance}
                  availability={isRewardAvailable(reward, redemptions ?? [], now())}
                  pending={Boolean(pending)}
                  showNumbers={showNumbers}
                  ttsEnabled={ttsEnabled}
                  canRequest={caps.canPickReward}
                  askLabel={resolveContent("reward.askGrownup", { ageMode })}
                  onRequest={() => {
                    playCue("reward.redeem"); // soft "unlock" chord (doc 61 §9.2)
                    requestReward(childId, reward.id);
                  }}
                  onCancel={pending ? () => cancelReward(childId, pending.id) : undefined}
                  onUndo={
                    recentGrant
                      ? () => {
                          playCue("tap.soft"); // soft neutral cue only — never a scold
                          reverseRedemption(childId, recentGrant.id);
                        }
                      : undefined
                  }
                  undoLabel={resolveContent("undo.step", { ageMode })}
                  onSaveToward={
                    showNumbers ? () => setSavingToward(childId, reward.id) : undefined
                  }
                />
              );
            })
          )}
        </View>

        {/* rotating novelty quest board (novelty-refresh §2.1) — above the
            collection; self-suppresses on the calm path / when quests are off. */}
        <QuestBoard childId={childId} />

        {/* the owned-forever collectibles wall */}
        {companion ? (
          <>
            <SectionHeader title="My Collection" c={c} t={t} />
            <CollectiblesGrid
              childId={childId}
              onUnlock={(cosmeticId) => unlockCosmeticWithTokens(childId, cosmeticId)}
            />
          </>
        ) : null}

        {/* The grown-ups entry is now a persistent, PIN-gated corner door in the
            kid shell (app/(kid)/_layout.tsx, doc 70 §D) — present on every kid
            surface — so it no longer needs a duplicate link here. */}
      </ScrollView>
    </SafeAreaView>
  );
}

function SectionHeader({
  title,
  c,
  t,
}: {
  title: string;
  c: ReturnType<typeof useThemeTokens>["colors"];
  t: ReturnType<typeof useThemeTokens>;
}) {
  return (
    <View style={{ width: "100%", alignItems: "flex-start", marginTop: t.spacing(1) }}>
      <Text
        style={{
          color: c.text,
          fontFamily: t.type.h2.family,
          fontSize: t.type.h2.size,
          fontWeight: "700",
        }}
      >
        {title}
      </Text>
    </View>
  );
}
