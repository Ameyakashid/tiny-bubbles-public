/**
 * app/(parent)/plans.tsx — parent-gated if-then plan authoring + management
 * (if-then-plans §2.1). The PIN-gated `(parent)` area is where "kid + caregiver
 * author" happens: the grown-up unlocks the gate and they build the plan TOGETHER
 * from curated pieces (curated autonomy — no free-text kid input).
 *
 * Adding a new plan is gated by `<PremiumGate feature="ifThenPlans">` (free ceiling
 * 2, premium 8) — FIRING is NEVER gated, and a downgrade removes nothing. The
 * kid-proposal queue (Approve / Dismiss) shows only when the child may propose
 * (`caps.canAddTasks`). No component branches on raw `ageMode` (parent surfaces use
 * `ageModeLabel`; `assemblePlanPhrase` takes the child's ageMode as resolver input).
 */
import React from "react";
import { Text, View } from "react-native";

import { assemblePlanPhrase } from "../../src/domain/plans";
import type { Plan } from "../../src/domain/types";
import { useChildStore } from "../../src/state/childStore";
import { usePlanStore } from "../../src/state/planStore";
import { useSettingsStore } from "../../src/state/settingsStore";
import { useTaskStore } from "../../src/state/taskStore";
import { ageModeLabel } from "../../src/theme/resolveContent";
import { resolveCapabilities } from "../../src/theme/resolveCapabilities";
import { useThemeInputs } from "../../src/theme/ThemeProvider";
import { useThemeTokens } from "../../src/theme/useThemeTokens";

import PlanAuthor from "../../components/plans/PlanAuthor";
import PremiumGate from "../../components/parent/PremiumGate";
import {
  Card,
  Chip,
  Divider,
  Note,
  ParentScreen,
  PrimaryButton,
  SectionTitle,
  TextButton,
  Toggle,
} from "../../components/parent/ui";

export default function PlansScreen() {
  const t = useThemeTokens();
  const c = t.colors;

  const index = useChildStore((s) => s.index);
  const profiles = useChildStore((s) => s.profiles);
  const activeChildId = useSettingsStore((s) => s.meta.activeChildId);
  const setActiveChild = useSettingsStore((s) => s.setActiveChild);

  const list = index.filter((e) => !e.archived);
  const cid =
    activeChildId && list.some((e) => e.id === activeChildId)
      ? activeChildId
      : list[0]?.id ?? null;
  const profile = cid ? profiles[cid] : undefined;

  const plans = usePlanStore((s) => (cid ? s.plans[cid] : undefined)) ?? [];
  const addPlan = usePlanStore((s) => s.addPlan);
  const tasks = useTaskStore((s) => (cid ? s.tasks[cid] : undefined)) ?? [];
  const routines = useTaskStore((s) => (cid ? s.routines[cid] : undefined)) ?? [];

  const caps = profile ? resolveCapabilities({ ageMode: profile.ageMode, canAddTasks: profile.settings.autonomy.canAddTasks }) : undefined;

  const authored = plans.filter((p) => !p.archived && !p.proposed);
  const proposals = plans.filter((p) => p.proposed && !p.archived);

  return (
    <ParentScreen title="Plans" subtitle="Build a “when this, I will that” plan together.">
      {list.length > 1 ? (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: t.spacing(2) }}>
          {list.map((e) => (
            <Chip
              key={e.id}
              label={e.displayName}
              selected={e.id === cid}
              onPress={() => setActiveChild(e.id)}
            />
          ))}
        </View>
      ) : null}

      {!cid || !profile ? (
        <Note>Add a child in “Children” first.</Note>
      ) : (
        <>
          <Card>
            <Note>
              A plan is a little reminder you make together — not a rule or a
              treatment. There&apos;s no “missed”, no streak, and nothing to lose.
            </Note>
          </Card>

          {/* pending kid proposals — Approve / Dismiss (never a shaming reject) */}
          {caps?.canAddTasks && proposals.length > 0 ? (
            <Card>
              <SectionTitle>Waiting for your OK</SectionTitle>
              {proposals.map((plan) => (
                <ProposalRow key={plan.id} cid={cid} plan={plan} />
              ))}
            </Card>
          ) : null}

          {/* authoring form — Save gated by the ifThenPlans acquisition ceiling */}
          <PlanAuthor
            childId={cid}
            tasks={tasks}
            routines={routines}
            onSave={(plan) => addPlan(cid, plan)}
            renderSave={(onPress, disabled) => (
              <PremiumGate
                feature="ifThenPlans"
                currentCount={authored.length}
                lockedLabel="Add more plans with Plus"
              >
                <PrimaryButton label="Save plan" onPress={onPress} disabled={disabled} />
              </PremiumGate>
            )}
          />

          {/* manage existing plans */}
          <SectionTitle>Your plans</SectionTitle>
          {authored.length === 0 ? (
            <Note>No plans yet — build your first one above.</Note>
          ) : (
            authored.map((plan) => <PlanRow key={plan.id} cid={cid} plan={plan} />)
          )}

          <Text style={{ color: c.textDim, fontSize: t.type.caption.size }}>
            {ageModeLabel(profile.ageMode)} · plans fire only for this child, on this device.
          </Text>
        </>
      )}
    </ParentScreen>
  );
}

function PlanRow({ cid, plan }: { cid: string; plan: Plan }) {
  const t = useThemeTokens();
  const c = t.colors;
  const { ageMode } = useThemeInputs();
  const setPlanActive = usePlanStore((s) => s.setPlanActive);
  const archivePlan = usePlanStore((s) => s.archivePlan);
  const phrase = assemblePlanPhrase(plan, ageMode);

  return (
    <Card>
      <View style={{ flexDirection: "row", alignItems: "center", gap: t.spacing(2) }}>
        <Text style={{ fontSize: 22 }}>{plan.cue.label.emoji ?? "🫧"}</Text>
        <Text
          style={{ flex: 1, color: c.text, fontFamily: t.type.bodyLg.family, fontSize: t.type.body.size }}
        >
          {phrase.cue}, <Text style={{ fontWeight: "700" }}>{phrase.action}</Text>
        </Text>
      </View>
      <Divider />
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: t.spacing(2) }}>
          <Text style={{ color: c.text, fontFamily: t.type.bodyLg.family, fontSize: t.type.bodyLg.size }}>
            Active
          </Text>
          <Toggle
            value={plan.active}
            onValueChange={(v) => setPlanActive(cid, plan.id, v)}
            label="Plan active"
          />
        </View>
        <TextButton label="Remove" tone="danger" onPress={() => archivePlan(cid, plan.id)} />
      </View>
    </Card>
  );
}

function ProposalRow({ cid, plan }: { cid: string; plan: Plan }) {
  const t = useThemeTokens();
  const c = t.colors;
  const { ageMode } = useThemeInputs();
  const approvePlan = usePlanStore((s) => s.approvePlan);
  const dismissPlan = usePlanStore((s) => s.dismissPlan);
  const phrase = assemblePlanPhrase(plan, ageMode);
  return (
    <View style={{ gap: t.spacing(2), paddingVertical: t.spacing(1) }}>
      <Text style={{ color: c.text, fontFamily: t.type.body.family, fontSize: t.type.body.size }}>
        {phrase.cue}, <Text style={{ fontWeight: "700" }}>{phrase.action}</Text>
      </Text>
      <View style={{ flexDirection: "row", gap: t.spacing(4) }}>
        <TextButton label="Approve" onPress={() => approvePlan(cid, plan.id)} />
        <TextButton label="Dismiss" tone="dim" onPress={() => dismissPlan(cid, plan.id)} />
      </View>
    </View>
  );
}
