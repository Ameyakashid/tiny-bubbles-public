/**
 * app/(parent)/dashboard.tsx — the parent OVERALL DASHBOARD / mission control
 * (doc 66 §M9, doc 70 §C1/§D).
 *
 * This is the dense, utilitarian half of the bifurcation: a live per-child
 * overview the caregiver reads at a glance while the kid app stays big & playful.
 * For each child it surfaces, from the SAME durable signals the kid loop uses:
 *   - today's routines grouped by daypart (Morning / Afternoon / Evening) with
 *     live completion, and the current daypart highlighted (what the kid sees now);
 *   - the token balance (spendable now / held in escrow / lifetime earned);
 *   - pending reward redemptions with a one-tap Approve / "Not yet" strip (wired
 *     to the existing escrow decisions — the single biggest missing parent action);
 *   - quick actions: toggle a routine on/off, add a task to a daypart, manage rewards.
 *
 * ANTI-SHAME (doc 66 §5): an unfinished daypart is "not started" / "finish later",
 * NEVER "missed"/"failed"; declining a request is the gentle "Not yet". No AI.
 * No component branches on raw ageMode — labels go through `ageModeLabel`.
 */
import { router } from "expo-router";
import React from "react";
import { Text, View } from "react-native";

import {
  currentHolderId,
  isChoreActive,
  isChoreScheduledToday,
} from "../../src/domain/chores";
import { getDaypart, isoDay } from "../../src/domain/dates";
import { availableBalance } from "../../src/domain/gamification";
import { recentMoods } from "../../src/domain/moodInsight";
import { featuredPackFor } from "../../src/domain/novelty";
import { MOOD_FACE_BY_MOOD } from "../../src/data/moodScale";
import { getSeasonalPacks } from "../../src/data/buddyCosmetics";
import {
  summarizeDayparts,
  type DaypartStatus,
  type DaypartSummary,
} from "../../src/domain/tasks";
import type { ChildIndexEntry } from "../../src/domain/types";
import { useIsPremium } from "../../src/services/entitlements";
import { useChildStore } from "../../src/state/childStore";
import { useChoreStore } from "../../src/state/choreStore";
import { approveReward, declineReward } from "../../src/state/gameplay";
import { useRewardStore } from "../../src/state/rewardStore";
import { useRunProgressStore } from "../../src/state/runProgressStore";
import { useSessionStore } from "../../src/state/sessionStore";
import { useSettingsStore } from "../../src/state/settingsStore";
import { useTaskStore } from "../../src/state/taskStore";
import { getMessage } from "../../src/i18n/messages";
import { ageModeLabel } from "../../src/theme/resolveContent";
import { useThemeTokens } from "../../src/theme/useThemeTokens";

import { goToPaywall } from "../../components/parent/PremiumGate";
import {
  Card,
  Divider,
  ParentScreen,
  SectionTitle,
  SettingRow,
  TextButton,
  Toggle,
} from "../../components/parent/ui";
import VerifyQueue from "../../components/parent/VerifyQueue";

const DAYPART_META: Record<DaypartSummary["daypart"], { title: string; emoji: string }> = {
  morning: { title: "Morning", emoji: "🌅" },
  afternoon: { title: "Afternoon", emoji: "🏠" },
  evening: { title: "Evening", emoji: "🌙" },
};

/** Anti-shame completion copy — never "missed"/"failed". */
function completionLabel(s: DaypartSummary): string {
  if (!s.routine) return "No routine yet";
  switch (s.status) {
    case "done":
      return "All done for today";
    case "in-progress":
      return `${s.done}/${s.total} · finish later`;
    case "not-started":
      return "Not started";
    case "empty":
      return "No steps yet";
  }
}

const STATUS_TONE: Record<DaypartStatus, "text" | "textDim" | "success"> = {
  done: "success",
  "in-progress": "text",
  "not-started": "textDim",
  empty: "textDim",
};

export default function ParentDashboard() {
  const t = useThemeTokens();
  const c = t.colors;
  const index = useChildStore((s) => s.index);
  const premium = useIsPremium();
  const moodLoggingEnabled = useSettingsStore((s) => s.parentSettings.moodLoggingEnabled);

  const children = index.filter((e) => !e.archived);

  const lockAndLeave = () => {
    useSessionStore.getState().lockParent();
    router.replace("/(kid)");
  };

  return (
    <ParentScreen
      title="Grown-ups"
      subtitle="Mission control — today's routines, tokens & requests at a glance."
      onBack={null}
      right={
        <View style={{ flexDirection: "row", alignItems: "center", gap: t.spacing(3) }}>
          {/* Fast child switcher (multi-child §2.1) — only meaningful with ≥2 kids. */}
          {children.length >= 2 ? (
            <TextButton label="Switch" onPress={() => router.push("/(parent)/switch-child")} />
          ) : null}
          <TextButton label="Done" onPress={lockAndLeave} />
        </View>
      }
    >
      {children.length === 0 ? (
        <Card>
          <Text style={{ color: c.text, fontFamily: t.type.h2.family, fontSize: t.type.h2.size, fontWeight: "700" }}>
            Kids
          </Text>
          <Text style={{ color: c.textDim, fontSize: t.type.body.size }}>
            {getMessage("empty.noChildren", { ageMode: "older" })}
          </Text>
          <TextButton label="+ Add a child" onPress={() => router.push("/(parent)/children")} />
        </Card>
      ) : (
        children.map((entry) => <ChildCard key={entry.id} entry={entry} />)
      )}

      {/* management / navigation (dense settings surface) */}
      <Card>
        <SettingRow icon="🧒" label="Children" hint="Profiles, age mode, companion & sensory" onPress={() => router.push("/(parent)/children")} />
        <SettingRow icon="✅" label="Tasks" hint="Assign tasks & organize routines by daypart" onPress={() => router.push("/(parent)/tasks")} />
        <SettingRow icon="🎁" label="Rewards" hint="Set real-world rewards & guardrails" onPress={() => router.push("/(parent)/rewards-setup")} />
        {/* If-then plans (if-then-plans §2.1) — author "when this, I will that" together. */}
        <SettingRow icon="🗒️" label="Plans" hint="Build gentle “when this, I will that” plans" onPress={() => router.push("/(parent)/plans")} />
        {/* Shared / rotating chores (multi-child §2.2) — only with ≥2 children. */}
        {children.length >= 2 ? (
          <SettingRow icon="🔁" label="Shared chores" hint="Rotate chores fairly across your kids" onPress={() => router.push("/(parent)/chores")} />
        ) : null}
        {/* Mood insight — only when the opt-in is on (mood-checkin §2.5). */}
        {moodLoggingEnabled && children.length > 0 ? (
          <SettingRow icon="💛" label="Check-ins" hint="A private, on-device view of mood check-ins" onPress={() => router.push("/(parent)/insights")} />
        ) : null}
        {/* On-device progress report (clinician-reporting §2.1) — view/print/share. */}
        {children.length > 0 ? (
          <SettingRow icon="📄" label="Progress report" hint="A calm summary to view, print or share" onPress={() => router.push("/(parent)/report")} />
        ) : null}
        <SettingRow icon="⚙️" label="Settings" hint="Sound, sensory, privacy & data" onPress={() => router.push("/(parent)/settings")} />
      </Card>

      {/* Plus — the purchase route ALWAYS goes through the PIN gate (doc 66 §1b.13) */}
      <Card>
        <SettingRow
          icon={premium ? "✨" : "💛"}
          label={premium ? "Tiny Bubbles Plus" : "Get Tiny Bubbles Plus"}
          hint={premium ? "You're on Plus — manage or cancel" : "Optional extras. The whole routine is free."}
          onPress={goToPaywall}
        />
      </Card>

      {/* Read-only content-cadence readout (novelty-refresh §2.6) — honest
          anticipation ("what's new this season"), NEVER a countdown/urgency. */}
      <NoveltyCadence />

      <Text style={{ color: c.textDim, fontSize: t.type.caption.size, textAlign: "center" }}>
        Everything here is parent-only. This area locks when you leave the app.
      </Text>
    </ParentScreen>
  );
}

// ---------------------------------------------------------------------------
// Read-only "new this month" content-cadence readout (novelty-refresh §2.6). The
// most recently APPEARED seasonal pack — honest appointment-style anticipation,
// never an urgency/countdown. Renders nothing when no pack has appeared yet.
// ---------------------------------------------------------------------------
function NoveltyCadence() {
  const t = useThemeTokens();
  const c = t.colors;
  const pack = featuredPackFor(Date.now(), getSeasonalPacks());
  if (!pack) return null;
  const name = pack.label.text ?? pack.label.spokenLabel;
  const emoji = pack.label.emoji ?? "✨";
  return (
    <Card>
      <Text style={{ color: c.textDim, fontSize: t.type.body.size }}>
        New this month:{" "}
        <Text style={{ color: c.text, fontWeight: "700" }}>
          {name} {emoji}
        </Text>
      </Text>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Per-child mission-control card. Reads the child's routines / run progress /
// ledger / redemptions and rolls them up (pure `summarizeDayparts`). Each card is
// a keyed component instance, so its store selectors are stable across renders.
// ---------------------------------------------------------------------------
// M-D2 (§2.4): memoized so re-rendering the dashboard shell doesn't re-render every
// child card (each reads its own store slices and re-renders only on its own data).
const ChildCard = React.memo(function ChildCard({ entry }: { entry: ChildIndexEntry }) {
  const t = useThemeTokens();
  const c = t.colors;

  const setActiveChild = useSettingsStore((s) => s.setActiveChild);
  const setRoutineActive = useTaskStore((s) => s.setRoutineActive);
  const moodLoggingEnabled = useSettingsStore((s) => s.parentSettings.moodLoggingEnabled);

  const timeZone = useChildStore((s) => s.profiles[entry.id]?.timeZone);
  const moods = useChildStore((s) => s.moods[entry.id]);
  const ledger = useChildStore((s) => s.ledgers[entry.id]);
  const routines = useTaskStore((s) => s.routines[entry.id]);
  const tasks = useTaskStore((s) => s.tasks[entry.id]);
  const activeRun = useRunProgressStore((s) => s.active[entry.id] ?? null);
  const completion = useRunProgressStore((s) => s.completedDayparts[entry.id] ?? null);
  const rewards = useRewardStore((s) => s.rewards[entry.id]);
  const redemptions = useRewardStore((s) => s.redemptions[entry.id]);
  const chores = useChoreStore((s) => s.chores);

  const tz = timeZone ?? "UTC";
  const nowTs = Date.now();
  const today = isoDay(nowTs, tz);
  const currentDaypart = getDaypart(nowTs, tz);
  const completedToday = completion && completion.day === today ? completion.completed : [];

  const summaries = summarizeDayparts({
    routines: routines ?? [],
    tasks: tasks ?? [],
    activeRun,
    completedToday,
    currentDaypart,
  });

  const available = ledger ? availableBalance(ledger) : 0;
  const held = ledger?.heldTokens ?? 0;
  const earned = ledger?.lifetimeEarned ?? 0;

  const rewardById = new Map((rewards ?? []).map((r) => [r.id, r]));
  const pending = (redemptions ?? []).filter((r) => r.status === "requested");
  const recentGlance = recentMoods(moods ?? [], 5);
  // Shared chores this child holds TODAY (multi-child §2.4). Only THIS child's turns
  // are shown on THIS card — never a sibling's (per-child isolation / no comparison).
  const turnChores = (chores ?? []).filter(
    (ch) =>
      isChoreActive(ch) &&
      isChoreScheduledToday(ch, nowTs, tz) &&
      currentHolderId(ch, nowTs, tz) === entry.id,
  );

  const openTasks = (daypart?: DaypartSummary["daypart"]) => {
    setActiveChild(entry.id);
    router.push({ pathname: "/(parent)/tasks", params: daypart ? { daypart } : {} });
  };

  return (
    <Card>
      {/* child header */}
      <View style={{ flexDirection: "row", alignItems: "center", gap: t.spacing(3) }}>
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: 22,
            backgroundColor: entry.avatarColor,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text style={{ color: "#fff", fontWeight: "700", fontSize: 18 }}>
            {entry.displayName.slice(0, 1).toUpperCase()}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: c.text, fontFamily: t.type.bodyLg.family, fontSize: t.type.bodyLg.size, fontWeight: "700" }}>
            {entry.displayName}
          </Text>
          <Text style={{ color: c.textDim, fontSize: t.type.caption.size }}>
            {ageModeLabel(entry.ageMode)}
          </Text>
        </View>
        <TextButton
          label="Manage"
          onPress={() => {
            setActiveChild(entry.id);
            router.push("/(parent)/children");
          }}
        />
      </View>

      {/* tokens */}
      <View style={{ flexDirection: "row", alignItems: "center", gap: t.spacing(4) }}>
        <TokenStat emoji="🫧" value={available} label="now" c={c} t={t} />
        {held > 0 ? <TokenStat value={held} label="held" c={c} t={t} /> : null}
        <TokenStat value={earned} label="earned" c={c} t={t} />
      </View>

      <Divider />

      {/* today's routines, grouped by daypart */}
      <SectionTitle>Today by daypart</SectionTitle>
      {summaries.map((s) => (
        <DaypartRow
          key={s.daypart}
          summary={s}
          c={c}
          t={t}
          onToggle={(v) => s.routine && setRoutineActive(entry.id, s.routine.id, v)}
          onAddTask={() => openTasks(s.daypart)}
        />
      ))}

      {/* shared-chore "turn today" (multi-child §2.4) — a dim, one-line reflection,
          never a scoreboard; only this child's turns are shown here (isolation). */}
      {turnChores.map((ch) => (
        <Text key={ch.id} style={{ color: c.textDim, fontSize: t.type.caption.size }}>
          🔁 {ch.label.text ?? ch.label.spokenLabel} · {entry.displayName}'s turn today
        </Text>
      ))}

      {/* pending reward redemptions — Approve / Not yet (escrow decisions) */}
      {pending.length > 0 ? (
        <>
          <Divider />
          <SectionTitle>Reward requests</SectionTitle>
          {pending.map((req) => {
            const reward = rewardById.get(req.rewardId);
            return (
              <View
                key={req.id}
                style={{ flexDirection: "row", alignItems: "center", gap: t.spacing(2), paddingVertical: t.spacing(1) }}
              >
                <Text style={{ fontSize: 22 }}>{reward?.label.emoji ?? "🎁"}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: c.text, fontSize: t.type.body.size }} numberOfLines={1}>
                    {reward?.label.text ?? reward?.label.spokenLabel ?? "A reward"}
                  </Text>
                  <Text style={{ color: c.textDim, fontSize: t.type.caption.size }}>
                    🫧 {req.costTokens} held
                  </Text>
                </View>
                <TextButton label="Approve" onPress={() => approveReward(entry.id, req.id)} />
                <TextButton
                  label="Not yet"
                  tone="dim"
                  onPress={() => declineReward(entry.id, req.id, "Let's save up a little more!")}
                />
              </View>
            );
          })}
        </>
      ) : null}

      {/* optional parent-verify queue + recently-approved-redemption undo
          (verify-undo §2.4) — self-hides when nothing awaits confirm/undo. */}
      <VerifyQueue childId={entry.id} />

      {/* FREE "Recent check-ins" glance (mood-checkin §2.5) — only when the opt-in
          is on. Neutral: emoji chips of what the child shared, never a score. */}
      {moodLoggingEnabled ? (
        <>
          <Divider />
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <SectionTitle>Recent check-ins</SectionTitle>
            <TextButton
              label="See check-ins →"
              onPress={() => {
                setActiveChild(entry.id);
                router.push("/(parent)/insights");
              }}
            />
          </View>
          {recentGlance.length > 0 ? (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: t.spacing(2) }}>
              {recentGlance.map((log) => (
                <View key={log.id} style={{ alignItems: "center", gap: 2 }}>
                  <Text style={{ fontSize: 20 }}>{MOOD_FACE_BY_MOOD[log.mood!].emoji}</Text>
                  <Text style={{ color: c.textDim, fontSize: 10 }}>{log.day.slice(5)}</Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={{ color: c.textDim, fontSize: t.type.caption.size }}>
              {getMessage("mood.glanceEmpty", { ageMode: "older" })}
            </Text>
          )}
        </>
      ) : null}

      <Divider />

      {/* quick actions */}
      <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: t.spacing(4) }}>
        <TextButton label="+ Add a task" onPress={() => openTasks()} />
        <TextButton
          label="Manage rewards"
          onPress={() => {
            setActiveChild(entry.id);
            router.push("/(parent)/rewards-setup");
          }}
        />
      </View>
    </Card>
  );
});

// ---------------------------------------------------------------------------
type Tokens = ReturnType<typeof useThemeTokens>;
type Colors = Tokens["colors"];

function DaypartRow({
  summary,
  c,
  t,
  onToggle,
  onAddTask,
}: {
  summary: DaypartSummary;
  c: Colors;
  t: Tokens;
  onToggle: (v: boolean) => void;
  onAddTask: () => void;
}) {
  const meta = DAYPART_META[summary.daypart];
  const toneKey = STATUS_TONE[summary.status];
  const statusColor = toneKey === "success" ? c.success : toneKey === "textDim" ? c.textDim : c.text;
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: t.spacing(3),
        paddingVertical: t.spacing(1),
        borderRadius: t.radius,
        borderWidth: summary.isNow ? 1 : 0,
        borderColor: summary.isNow ? c.primary : "transparent",
        backgroundColor: summary.isNow ? c.surfaceAlt : "transparent",
        paddingHorizontal: summary.isNow ? t.spacing(2) : 0,
      }}
    >
      <Text style={{ fontSize: 22 }}>{summary.routine?.label.emoji ?? meta.emoji}</Text>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: t.spacing(2) }}>
          <Text style={{ color: c.text, fontFamily: t.type.label.family, fontSize: t.type.body.size, fontWeight: "700" }}>
            {meta.title}
          </Text>
          {summary.isNow ? (
            <View style={{ backgroundColor: c.primary, borderRadius: 999, paddingVertical: 2, paddingHorizontal: 8 }}>
              <Text style={{ color: c.onPrimary, fontSize: t.type.caption.size, fontWeight: "700" }}>now</Text>
            </View>
          ) : null}
          {summary.routine && !summary.routine.active ? (
            <Text style={{ color: c.textDim, fontSize: t.type.caption.size }}>· off</Text>
          ) : null}
        </View>
        <Text style={{ color: statusColor, fontSize: t.type.caption.size }}>{completionLabel(summary)}</Text>
      </View>

      {summary.routine ? (
        <Toggle value={summary.routine.active} onValueChange={onToggle} label={`${meta.title} routine on`} />
      ) : (
        <TextButton label="+ Add" onPress={onAddTask} />
      )}
    </View>
  );
}

function TokenStat({
  emoji,
  value,
  label,
  c,
  t,
}: {
  emoji?: string;
  value: number;
  label: string;
  c: Colors;
  t: Tokens;
}) {
  return (
    <View style={{ flexDirection: "row", alignItems: "baseline", gap: 4 }}>
      {emoji ? <Text style={{ fontSize: 14 }}>{emoji}</Text> : null}
      <Text style={{ color: c.text, fontFamily: t.type.token.family, fontSize: t.type.bodyLg.size, fontWeight: "700" }}>
        {value}
      </Text>
      <Text style={{ color: c.textDim, fontSize: t.type.caption.size }}>{label}</Text>
    </View>
  );
}
