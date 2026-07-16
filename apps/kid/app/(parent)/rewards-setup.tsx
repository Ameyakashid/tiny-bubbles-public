/**
 * app/(parent)/rewards-setup.tsx — caregiver reward CRUD (doc 63 Feature 2, doc
 * 66 §M9). Set 3–6 real-world rewards with cost, screen-time minutes, and the
 * NON-punishing guardrails limitPerWeek / cooldownHours, plus the per-child
 * auto-approve-under-N threshold. Guardrails gate availability ("come back
 * later"), never punish (doc 66 §5.5).
 */
import React from "react";
import { Text, TextInput, View } from "react-native";

import { makeReward } from "../../src/domain/constants";
import type { Reward, RewardCategory } from "../../src/domain/types";
import { useChildStore } from "../../src/state/childStore";
import { newId, now } from "../../src/state/ids";
import { useRewardStore } from "../../src/state/rewardStore";
import { useSettingsStore } from "../../src/state/settingsStore";
import { getMessage } from "../../src/i18n/messages";
import { resolveCapabilities } from "../../src/theme/resolveCapabilities";
import { useThemeTokens } from "../../src/theme/useThemeTokens";

import { ColorField, EmojiField } from "../../components/parent/pickers";
import {
  Card,
  Chip,
  Divider,
  Note,
  ParentScreen,
  PrimaryButton,
  SectionTitle,
  Stepper,
  TextButton,
  Toggle,
} from "../../components/parent/ui";

const CATEGORIES: { value: RewardCategory; label: string }[] = [
  { value: "screen_time", label: "Screen time" },
  { value: "treat", label: "Treat" },
  { value: "activity", label: "Activity" },
  { value: "outing", label: "Outing" },
  { value: "privilege", label: "Privilege" },
  { value: "choice", label: "Choice" },
  { value: "custom", label: "Other" },
];

export default function RewardsSetupScreen() {
  const t = useThemeTokens();
  const c = t.colors;

  const index = useChildStore((s) => s.index);
  const profiles = useChildStore((s) => s.profiles);
  const updateSettings = useChildStore((s) => s.updateSettings);
  const activeChildId = useSettingsStore((s) => s.meta.activeChildId);
  const setActiveChild = useSettingsStore((s) => s.setActiveChild);

  const list = index.filter((e) => !e.archived);
  const cid = activeChildId && list.some((e) => e.id === activeChildId) ? activeChildId : list[0]?.id ?? null;
  const profile = cid ? profiles[cid] : undefined;

  const rewards = useRewardStore((s) => (cid ? s.rewards[cid] : undefined)) ?? [];
  const addReward = useRewardStore((s) => s.addReward);

  const liveRewards = rewards.filter((r) => !r.archived);

  const add = () => {
    if (!cid) return;
    addReward(
      cid,
      makeReward(cid, now(), {
        id: newId(),
        label: { spokenLabel: "New reward", text: "New reward", emoji: "🎁", color: "#FFB703" },
        category: "treat",
        costTokens: 10,
        active: true,
        requiresParentApproval: true,
      }),
    );
  };

  return (
    <ParentScreen title="Rewards">
      {list.length > 1 ? (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: t.spacing(2) }}>
          {list.map((e) => (
            <Chip key={e.id} label={e.displayName} selected={e.id === cid} onPress={() => setActiveChild(e.id)} />
          ))}
        </View>
      ) : null}

      {!cid || !profile ? (
        <Note>Add a child in “Children” first.</Note>
      ) : (
        <>
          {/* per-child auto-approve threshold */}
          <Card>
            <SectionTitle>Approvals</SectionTitle>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <View style={{ flex: 1, paddingRight: t.spacing(3) }}>
                <Text style={{ color: c.text, fontFamily: t.type.bodyLg.family, fontSize: t.type.bodyLg.size }}>
                  Auto-approve small treats
                </Text>
                <Note>Requests under this many bubbles skip your approval. 0 = always ask you.</Note>
              </View>
              <Stepper
                value={profile.settings.autoApproveRedeemUnderTokens}
                min={0}
                max={50}
                onChange={(v) => updateSettings(cid, { autoApproveRedeemUnderTokens: v })}
              />
            </View>
          </Card>

          <Text style={{ color: c.textDim, fontSize: t.type.caption.size }}>
            Your child sees up to {resolveCapabilities({ ageMode: profile.ageMode }).maxChoices} of these at a time.
          </Text>

          {liveRewards.length === 0 ? (
            <Note>{getMessage("empty.rewardsSetup", { ageMode: "older" })}</Note>
          ) : (
            liveRewards.map((reward) => (
              <RewardEditor key={reward.id} cid={cid} reward={reward} />
            ))
          )}

          {/*
           * Reward creation is intentionally NOT premium-gated: the free tier runs
           * the full core loop with no paywall interruptions (doc 66 §M12), and the
           * starter pack already seeds a full library. FEATURE_GATES.rewardMenuSize
           * stays the documented acquisition ceiling (capped at the curated 6,
           * never 'unlimited'); the child-visible count is governed by `maxChoices`.
           */}
          <PrimaryButton label="+ Add a reward" onPress={add} />
        </>
      )}
    </ParentScreen>
  );
}

function RewardEditor({ cid, reward }: { cid: string; reward: Reward }) {
  const t = useThemeTokens();
  const c = t.colors;
  const updateReward = useRewardStore((s) => s.updateReward);
  const archiveReward = useRewardStore((s) => s.archiveReward);

  const patch = (p: Partial<Reward>) => updateReward(cid, reward.id, p);
  const patchLabel = (lp: Partial<Reward["label"]>) => patch({ label: { ...reward.label, ...lp } });

  return (
    <Card>
      <View style={{ flexDirection: "row", gap: t.spacing(3) }}>
        <EmojiField label="Icon" value={reward.label.emoji} onChange={(emoji) => patchLabel({ emoji })} />
        <View style={{ flex: 1, gap: t.spacing(2) }}>
          <Text style={{ color: c.textDim, fontFamily: t.type.label.family, fontSize: t.type.caption.size, fontWeight: "700" }}>
            Name
          </Text>
          <TextInput
            value={reward.label.text ?? reward.label.spokenLabel}
            onChangeText={(v) => patchLabel({ text: v, spokenLabel: v })}
            placeholder="Reward name"
            placeholderTextColor={c.textDim}
            accessibilityLabel="Reward name"
            style={{
              color: c.text,
              fontSize: t.type.bodyLg.size,
              backgroundColor: c.surfaceAlt,
              borderRadius: t.radius,
              borderWidth: 1,
              borderColor: c.border,
              paddingVertical: t.spacing(2),
              paddingHorizontal: t.spacing(3),
            }}
          />
        </View>
      </View>

      <ColorField value={reward.label.color} onChange={(color) => patchLabel({ color })} />

      <View style={{ gap: t.spacing(2) }}>
        <Text style={{ color: c.textDim, fontFamily: t.type.label.family, fontSize: t.type.caption.size, fontWeight: "700" }}>
          Type
        </Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: t.spacing(2) }}>
          {CATEGORIES.map((cat) => (
            <Chip
              key={cat.value}
              label={cat.label}
              selected={reward.category === cat.value}
              onPress={() => patch({ category: cat.value })}
            />
          ))}
        </View>
      </View>

      <Divider />

      <Row label="Cost (bubbles)">
        <Stepper value={reward.costTokens} min={1} max={99} onChange={(v) => patch({ costTokens: v })} />
      </Row>

      {reward.category === "screen_time" ? (
        <Row label="Screen time">
          <Stepper
            value={reward.screenTimeMinutes ?? 10}
            min={5}
            max={120}
            step={5}
            suffix="min"
            onChange={(v) => patch({ screenTimeMinutes: v })}
          />
        </Row>
      ) : null}

      <Row label="Weekly limit" hint="0 = no limit">
        <Stepper
          value={reward.limitPerWeek ?? 0}
          min={0}
          max={21}
          formatValue={(v) => (v === 0 ? "Off" : `${v}/wk`)}
          onChange={(v) => patch({ limitPerWeek: v === 0 ? undefined : v })}
        />
      </Row>

      <Row label="Cooldown" hint="0 = none">
        <Stepper
          value={reward.cooldownHours ?? 0}
          min={0}
          max={48}
          formatValue={(v) => (v === 0 ? "Off" : `${v}h`)}
          onChange={(v) => patch({ cooldownHours: v === 0 ? undefined : v })}
        />
      </Row>

      <Row label="Available to child">
        <Toggle value={reward.active} onValueChange={(v) => patch({ active: v })} label="Available to child" />
      </Row>

      <View style={{ alignItems: "flex-end" }}>
        <TextButton label="Remove" tone="danger" onPress={() => archiveReward(cid, reward.id)} />
      </View>
    </Card>
  );
}

function Row({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  const t = useThemeTokens();
  const c = t.colors;
  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: t.spacing(3) }}>
      <View style={{ flex: 1 }}>
        <Text style={{ color: c.text, fontFamily: t.type.bodyLg.family, fontSize: t.type.bodyLg.size }}>{label}</Text>
        {hint ? <Text style={{ color: c.textDim, fontSize: t.type.caption.size }}>{hint}</Text> : null}
      </View>
      {children}
    </View>
  );
}
