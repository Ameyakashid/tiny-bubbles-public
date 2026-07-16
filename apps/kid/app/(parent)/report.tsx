/**
 * app/(parent)/report.tsx — the on-device PROGRESS REPORT (clinician-reporting
 * §2.2, M-D1). A calm, NON-diagnostic summary of what a child actually did over a
 * 7 / 30 (/ 90 premium) day window, built from the SAME durable signals the kid
 * loop already writes (token ledger, routine runs, forgiving progress, opt-in
 * mood). Parent-gated (auto, under `(parent)`). ZERO AI, offline, anti-shame.
 *
 * Age-adaptation is CONTENT selection via the resolved `showNumbersAndCharts` flag
 * (never a raw `ageMode`); the header prints `ageModeLabel(...)` for clinician
 * context. The Share/Print + Save actions render the report to a local PDF via
 * `src/services/report.ts` and hand it to the OS share sheet — nothing uploads.
 */
import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import { Text, View } from "react-native";

import {
  buildReport,
  makeRange,
  type ReportModel,
  type ReportRangeKey,
} from "../../src/domain/report";
import { useIsPremium } from "../../src/services/entitlements";
import { shareReportPdf } from "../../src/services/report";
import { useChildStore } from "../../src/state/childStore";
import { useRewardStore } from "../../src/state/rewardStore";
import { useSettingsStore } from "../../src/state/settingsStore";
import { useTaskStore } from "../../src/state/taskStore";
import { resolveCapabilities } from "../../src/theme/resolveCapabilities";
import { ageModeLabel } from "../../src/theme/resolveContent";
import { useThemeTokens } from "../../src/theme/useThemeTokens";

import { goToPaywall } from "../../components/parent/PremiumGate";
import {
  Card,
  Divider,
  Note,
  ParentScreen,
  PrimaryButton,
  SectionTitle,
  Segmented,
  TextButton,
} from "../../components/parent/ui";

const MOOD_EMOJI: Record<string, string> = {
  great: "🌟",
  good: "🙂",
  okay: "⛅",
  rough: "🌧️",
};
const DAYPART_TITLE: Record<"morning" | "afternoon" | "evening", string> = {
  morning: "Morning",
  afternoon: "Afternoon",
  evening: "Evening",
};

export default function ReportScreen() {
  const t = useThemeTokens();
  const c = t.colors;

  const index = useChildStore((s) => s.index);
  const profiles = useChildStore((s) => s.profiles);
  const ledgers = useChildStore((s) => s.ledgers);
  const progressMap = useChildStore((s) => s.progress);
  const moodsMap = useChildStore((s) => s.moods);
  const runsMap = useTaskStore((s) => s.runs);
  const redemptionsMap = useRewardStore((s) => s.redemptions);
  const activeChildId = useSettingsStore((s) => s.meta.activeChildId);
  const moodLoggingEnabled = useSettingsStore((s) => s.parentSettings.moodLoggingEnabled);
  const premium = useIsPremium();

  const children = index.filter((e) => !e.archived);
  const [rangeKey, setRangeKey] = useState<ReportRangeKey>("7d");
  const [subjectId, setSubjectId] = useState<string>(
    () => (activeChildId && children.some((e) => e.id === activeChildId) ? activeChildId : children[0]?.id ?? ""),
  );
  const [shareNote, setShareNote] = useState<string | null>(null);

  const subject = subjectId && children.some((e) => e.id === subjectId) ? subjectId : children[0]?.id ?? "";
  const profile = subject ? profiles[subject] : undefined;

  const model: ReportModel | null = useMemo(() => {
    if (!profile) return null;
    const now = Date.now();
    const caps = resolveCapabilities({ ageMode: profile.ageMode });
    const childMoodOn =
      moodLoggingEnabled && (profile.settings.moodCheckinEnabled ?? true);
    const built = buildReport({
      profile,
      ledger: ledgers[subject] ?? { childId: subject, balance: 0, heldTokens: 0, lifetimeEarned: 0, lifetimeSpent: 0, lastEarnedAt: 0, entries: [] },
      progress: progressMap[subject] ?? {
        childId: subject,
        cumulativeCount: 0,
        currentStreakDays: 0,
        longestStreakDays: 0,
        lastActiveDate: null,
        freezeTokens: 0,
        freezeUsedDates: [],
        weekCompletions: 0,
        paused: false,
      },
      runs: runsMap[subject] ?? [],
      redemptions: redemptionsMap[subject] ?? [],
      moods: moodsMap[subject] ?? [],
      moodLoggingEnabled: childMoodOn,
      showNumbersAndCharts: caps.showNumbersAndCharts,
      range: makeRange(rangeKey, now, profile.timeZone),
      now,
    });
    return { ...built, ageModeLabel: ageModeLabel(profile.ageMode) };
  }, [profile, subject, rangeKey, ledgers, progressMap, runsMap, redemptionsMap, moodsMap, moodLoggingEnabled]);

  const doShare = async () => {
    if (!model) return;
    setShareNote("Preparing…");
    const res = await shareReportPdf(model);
    setShareNote(
      res.ok
        ? res.mode === "shared"
          ? "Ready to share or save."
          : "Opened the print dialog."
        : "Sharing isn't available here — try on a phone or tablet.",
    );
  };

  if (!profile || !model) {
    return (
      <ParentScreen title="Progress report">
        <Card>
          <Text style={{ color: c.text, fontSize: t.type.body.size }}>
            Add a child to see a progress report.
          </Text>
          <TextButton label="+ Add a child" onPress={() => router.push("/(parent)/children")} />
        </Card>
      </ParentScreen>
    );
  }

  const rangeOptions: { value: ReportRangeKey; label: string }[] = premium
    ? [
        { value: "7d", label: "7 days" },
        { value: "30d", label: "30 days" },
        { value: "90d", label: "90 days" },
      ]
    : [
        { value: "7d", label: "7 days" },
        { value: "30d", label: "30 days" },
      ];

  const showCharts = model.daypartBreakdown.length > 0;

  return (
    <ParentScreen title="Progress report" subtitle="Built on this device — nothing is uploaded.">
      {/* range */}
      <Card>
        <SectionTitle>Time range</SectionTitle>
        <Segmented<ReportRangeKey> options={rangeOptions} value={rangeKey} onChange={setRangeKey} />
        {!premium ? (
          <TextButton label="✨ 90 days with Plus" onPress={goToPaywall} />
        ) : null}
      </Card>

      {/* child selector (only with >1 child) */}
      {children.length > 1 ? (
        <Card>
          <SectionTitle>Child</SectionTitle>
          <Segmented<string>
            options={children.map((e) => ({ value: e.id, label: e.displayName }))}
            value={subject}
            onChange={setSubjectId}
          />
        </Card>
      ) : null}

      {/* honest header note (anti-over-claim) */}
      <Note>
        A summary of routines and bubbles at home for {profile.displayName} ({model.ageModeLabel}).
        This is not a medical assessment or a diagnosis.
      </Note>

      {/* summary cards — calm path leads with cumulative + routines */}
      {model.calmPath ? (
        <>
          <BubblesCard model={model} calm />
          <RoutinesCard model={model} />
          <StreakCard model={model} />
          <RewardsCard model={model} />
        </>
      ) : (
        <>
          <RoutinesCard model={model} />
          <BubblesCard model={model} />
          {showCharts ? <DaypartCard model={model} /> : null}
          <StreakCard model={model} />
          <RewardsCard model={model} />
        </>
      )}

      {model.mood ? <MoodCard model={model} /> : null}

      {model.historyTruncated ? (
        <Note>Based on the most recent activity on this device.</Note>
      ) : null}

      {/* actions */}
      <Card>
        <SectionTitle>Share</SectionTitle>
        <View style={{ flexDirection: "row", gap: t.spacing(3), flexWrap: "wrap" }}>
          <View style={{ flex: 1, minWidth: 140 }}>
            <PrimaryButton label="Share / Print" onPress={doShare} />
          </View>
          <View style={{ flex: 1, minWidth: 140 }}>
            <PrimaryButton label="Save a copy" tone="neutral" onPress={doShare} />
          </View>
        </View>
        {shareNote ? <Note>{shareNote}</Note> : null}
      </Card>

      <Note>Everything here was built on this device. Nothing is uploaded.</Note>
    </ParentScreen>
  );
}

// ---------------------------------------------------------------------------
// Cards.
// ---------------------------------------------------------------------------

function StatLine({ label, value }: { label: string; value: string }) {
  const t = useThemeTokens();
  const c = t.colors;
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", paddingVertical: 2 }}>
      <Text style={{ color: c.textDim, fontSize: t.type.body.size }}>{label}</Text>
      <Text style={{ color: c.text, fontFamily: t.type.token.family, fontSize: t.type.bodyLg.size, fontWeight: "700" }}>
        {value}
      </Text>
    </View>
  );
}

function RoutinesCard({ model }: { model: ReportModel }) {
  const t = useThemeTokens();
  const c = t.colors;
  const empty = model.stepsCompleted === 0 && model.routinesFinished === 0;
  return (
    <Card>
      <SectionTitle>Routines & steps</SectionTitle>
      {empty ? (
        <Text style={{ color: c.textDim, fontSize: t.type.body.size, fontStyle: "italic" }}>
          No steps yet — the report fills in as your child pops bubbles.
        </Text>
      ) : (
        <>
          <StatLine label="Steps completed" value={String(model.stepsCompleted)} />
          <StatLine label="Routines finished" value={String(model.routinesFinished)} />
          <StatLine label="Days active" value={`${model.daysActive} of ${model.daysInRange}`} />
        </>
      )}
    </Card>
  );
}

function BubblesCard({ model, calm }: { model: ReportModel; calm?: boolean }) {
  return (
    <Card>
      <SectionTitle>Bubbles</SectionTitle>
      <StatLine label="Earned this period" value={`${model.tokensEarnedInPeriod} 🫧`} />
      <StatLine label="Lifetime earned" value={String(model.lifetimeEarned)} />
      {calm ? <StatLine label="Bubbles popped so far" value={String(model.cumulativeBubbles)} /> : null}
    </Card>
  );
}

function StreakCard({ model }: { model: ReportModel }) {
  const t = useThemeTokens();
  const c = t.colors;
  const s = model.streak;
  return (
    <Card>
      <SectionTitle>{model.calmPath ? "Keeping it going" : "Streak"}</SectionTitle>
      {s.mode === "active" ? (
        <>
          {model.calmPath ? (
            <Text style={{ color: c.textDim, fontSize: t.type.body.size }}>Keeping a steady rhythm.</Text>
          ) : (
            <StatLine label="Active days in a row" value={String(s.days)} />
          )}
          <StatLine label="Best ever" value={String(s.best)} />
        </>
      ) : (
        <>
          <StatLine label="Bubbles popped so far" value={String(s.cumulative)} />
          <StatLine label="Best run" value={String(s.best)} />
          <Text style={{ color: c.textDim, fontSize: t.type.caption.size, fontStyle: "italic", marginTop: 2 }}>
            Currently resting — ready to pick back up anytime.
          </Text>
        </>
      )}
    </Card>
  );
}

function RewardsCard({ model }: { model: ReportModel }) {
  return (
    <Card>
      <SectionTitle>Rewards enjoyed</SectionTitle>
      <StatLine label="Rewards enjoyed" value={String(model.rewardsEnjoyed)} />
    </Card>
  );
}

function DaypartCard({ model }: { model: ReportModel }) {
  const t = useThemeTokens();
  const c = t.colors;
  const max = Math.max(1, ...model.daypartBreakdown.map((d) => d.stepsDone));
  return (
    <Card>
      <SectionTitle>By time of day</SectionTitle>
      {model.daypartBreakdown.map((d) => (
        <View key={d.daypart} style={{ flexDirection: "row", alignItems: "center", gap: t.spacing(3), paddingVertical: 3 }}>
          <Text style={{ width: 82, color: c.textDim, fontSize: t.type.body.size }}>{DAYPART_TITLE[d.daypart]}</Text>
          <View style={{ flex: 1, height: 12, backgroundColor: c.surfaceSunken, borderRadius: 6, overflow: "hidden" }}>
            <View style={{ width: `${Math.round((d.stepsDone / max) * 100)}%`, height: "100%", backgroundColor: c.primary }} />
          </View>
          <Text style={{ width: 28, textAlign: "right", color: c.text, fontWeight: "700", fontSize: t.type.body.size }}>
            {d.stepsDone}
          </Text>
        </View>
      ))}
    </Card>
  );
}

function MoodCard({ model }: { model: ReportModel }) {
  const t = useThemeTokens();
  const c = t.colors;
  const mood = model.mood!;
  const order: Array<"great" | "good" | "okay" | "rough"> = ["great", "good", "okay", "rough"];
  return (
    <Card>
      <SectionTitle>Mood check-ins</SectionTitle>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: t.spacing(2) }}>
        {order.map((m) => (
          <View
            key={m}
            style={{ flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: c.surfaceAlt, borderRadius: 999, paddingVertical: 4, paddingHorizontal: 10 }}
          >
            <Text style={{ fontSize: 15 }}>{MOOD_EMOJI[m]}</Text>
            <Text style={{ color: c.text, fontSize: t.type.caption.size }}>
              {m}: {mood.counts[m]}
            </Text>
          </View>
        ))}
      </View>
      {mood.energyAvg !== null ? (
        <>
          <Divider />
          <StatLine label="Average energy" value={`${mood.energyAvg.toFixed(1)} / ${mood.energyScaleMax}`} />
        </>
      ) : null}
      <Text style={{ color: c.textDim, fontSize: t.type.caption.size }}>
        {mood.samples} check-in{mood.samples === 1 ? "" : "s"} shared.
      </Text>
    </Card>
  );
}
