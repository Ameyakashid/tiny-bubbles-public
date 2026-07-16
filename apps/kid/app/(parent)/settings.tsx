/**
 * app/(parent)/settings.tsx — parent settings (doc 63 Feature 10, doc 66 §M9).
 *
 * Per-category sound/haptics, sensory (low-stim) + reduced-motion, quiet hours,
 * calm mode (active child), OpenDyslexic, the parent gate (challenge type +
 * purchase PIN), privacy opt-INs (analytics + mood, default OFF, on-device-only),
 * delete-data, on-device data review/export, and a Licenses row.
 *
 * *** ZERO AI: there is intentionally NO "AI off" toggle — the app has no AI to
 * toggle (doc 66 §0 / product constraint). ***
 *
 * Route guard lives in (parent)/_layout.tsx — kids reach here only via the gate.
 */
import { format } from "date-fns";
import { router } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";

import { breathPatternsFor, defaultBreathPatternId } from "../../src/domain/breathing";
import { ONE_DAY_MS } from "../../src/domain/constants";
import {
  isSceneAvailable,
  pickableScenes,
  resolveSoundscapeSettings,
} from "../../src/domain/soundscapes";
import type { Entitlement, ParentGateMode, Soundscape } from "../../src/domain/types";
import { AVAILABLE_LOCALES } from "../../src/i18n/catalog";
import { getMessage } from "../../src/i18n/messages";
import { isOpenDyslexicAvailable } from "../../src/theme/fonts";
import { hashPin, isValidPin } from "../../src/services/parentGate";
import { useEntitlements, useIsPremium } from "../../src/services/entitlements";
import {
  applyRestore,
  exportBackup,
  prepareRestore,
  type PreparedRestore,
} from "../../src/services/backup";
import { setSoundscapeVolume } from "../../src/services/soundscape";
import { useSessionStore, type SensitiveAction } from "../../src/state/sessionStore";
import PremiumGate, { goToPaywall } from "../../components/parent/PremiumGate";
import VolumeSlider from "../../components/ui/VolumeSlider";
import { useBuddyStore } from "../../src/state/buddyStore";
import { useChildStore } from "../../src/state/childStore";
import { useChoreStore } from "../../src/state/choreStore";
import { usePlanStore } from "../../src/state/planStore";
import { useQuestStore } from "../../src/state/questStore";
import { wipeAllChildData } from "../../src/state/gameplay";
import { useRewardStore } from "../../src/state/rewardStore";
import { useSettingsStore } from "../../src/state/settingsStore";
import { useTaskStore } from "../../src/state/taskStore";
import { useThemeTokens } from "../../src/theme/useThemeTokens";

import {
  Card,
  Divider,
  Note,
  ParentScreen,
  PrimaryButton,
  Segmented,
  SectionTitle,
  SettingRow,
  TextButton,
  Toggle,
} from "../../components/parent/ui";
import { TimeField } from "../../components/parent/pickers";

export default function SettingsScreen() {
  const t = useThemeTokens();
  const c = t.colors;

  const parentSettings = useSettingsStore((s) => s.parentSettings);
  const updateParentSettings = useSettingsStore((s) => s.updateParentSettings);
  const locale = parentSettings.locale ?? "en";
  const configureParentGate = useSettingsStore((s) => s.configureParentGate);
  const activeChildId = useSettingsStore((s) => s.meta.activeChildId);

  const activeProfile = useChildStore((s) => (activeChildId ? s.profiles[activeChildId] : undefined));
  const updateSettings = useChildStore((s) => s.updateSettings);

  // Tiny Bubbles Plus (billing §2.3): the parent-only, PIN-gated surface where the
  // HONEST trial-end detail lives (the lock-screen reminder stays generic, §2.4).
  const premium = useIsPremium();
  const entitlement = useEntitlements();
  const trialEndsAt = entitlement.trialEndsAt;
  const trialEndingSoon = trialEndsAt != null && Date.now() >= trialEndsAt - ONE_DAY_MS;
  const plusHint = premium
    ? trialEndsAt
      ? `Free trial through ${fmtDate(trialEndsAt)}${
          trialEndingSoon
            ? " · ends soon — keep Plus or cancel in one tap, you won't be charged"
            : " · manage or cancel"
        }`
      : "Manage or cancel"
    : "Free runs the whole routine — see what Plus adds";

  const gate = parentSettings.parentGate;
  const [pinInput, setPinInput] = useState("");
  const [pinSaved, setPinSaved] = useState(false);
  const [showData, setShowData] = useState(false);
  const [showLicenses, setShowLicenses] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Local backup / restore (clinician-reporting §2.3). Export, restore-replace,
  // and delete-all are the most sensitive actions in the app, so each is routed
  // through the parent PIN (`mode:'sensitive'`) — NOT the low-stakes entry
  // challenge — before it runs. The restore additionally requires the explicit
  // confirm-replace step below.
  const lastBackupAt = parentSettings.lastBackupAt;
  const [dataNote, setDataNote] = useState<string | null>(null);
  const [restorePrepared, setRestorePrepared] = useState<
    Extract<PreparedRestore, { ok: true }> | null
  >(null);
  const pendingSensitive = useSessionStore((s) => s.pendingSensitiveAction);
  const sensitiveGrantAt = useSessionStore((s) => s.sensitiveGrantAt);

  const requestSensitive = (action: SensitiveAction) => {
    setDataNote(null);
    useSessionStore.getState().requestSensitiveAction(action);
    router.push("/(gate)/parental-gate?mode=sensitive&next=/(parent)/settings");
  };

  // Runs the pending sensitive action exactly once, after the PIN gate grants it.
  useEffect(() => {
    if (!pendingSensitive || !sensitiveGrantAt) return;
    const action = pendingSensitive;
    useSessionStore.getState().clearSensitive();
    void runSensitiveAction(action);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingSensitive, sensitiveGrantAt]);

  const runSensitiveAction = async (action: SensitiveAction) => {
    if (action === "deleteAll") {
      setConfirmDelete(true);
      return;
    }
    if (action === "backup") {
      setDataNote("Preparing a backup…");
      try {
        const res = await exportBackup();
        setDataNote(`Backed up ${res.itemCount} item${res.itemCount === 1 ? "" : "s"}.`);
      } catch {
        setDataNote("Backing up isn't available here — try on a phone or tablet.");
      }
      return;
    }
    // action === "restore"
    setDataNote("Choose a Tiny Bubbles backup file…");
    const prepared = await prepareRestore();
    if (prepared.ok) {
      setRestorePrepared(prepared);
      setDataNote(null);
    } else {
      setRestorePrepared(null);
      setDataNote(
        prepared.reason === "canceled"
          ? null
          : "That file couldn't be read as a Tiny Bubbles backup — nothing was changed.",
      );
    }
  };

  const confirmRestore = async () => {
    const prepared = restorePrepared;
    if (!prepared) return;
    setRestorePrepared(null);
    const res = await applyRestore(prepared.file);
    setDataNote(
      res.ok
        ? "Restored from your backup."
        : "That file couldn't be restored — nothing was changed.",
    );
    setShowData(false);
  };

  const setGateMode = (mode: ParentGateMode) =>
    configureParentGate({ ...gate, mode });

  const savePin = async () => {
    if (!isValidPin(pinInput)) return;
    const pinHash = await hashPin(pinInput);
    configureParentGate({ ...gate, pinHash });
    setPinInput("");
    setPinSaved(true);
    setTimeout(() => setPinSaved(false), 2200);
  };

  return (
    <ParentScreen title="Settings">
      {/* sound & motion */}
      <Card>
        <SectionTitle>Sound & motion</SectionTitle>
        <SettingRow
          label="Sound effects"
          right={
            <Toggle
              value={parentSettings.soundEnabled}
              onValueChange={(v) => updateParentSettings({ soundEnabled: v })}
              label="Sound effects"
            />
          }
        />
        <SettingRow
          label="Haptics"
          right={
            <Toggle
              value={parentSettings.hapticEnabled}
              onValueChange={(v) => updateParentSettings({ hapticEnabled: v })}
              label="Haptics"
            />
          }
        />
        <SettingRow
          label="Reduced motion"
          hint="Calmer animations everywhere"
          right={
            <Toggle
              value={parentSettings.reducedMotionDefault}
              onValueChange={(v) => updateParentSettings({ reducedMotionDefault: v })}
              label="Reduced motion"
            />
          }
        />
        <SettingRow
          label="Low-stim theme"
          hint="Desaturated palette, gentler celebration"
          right={
            <Toggle
              value={parentSettings.lowStimTheme}
              onValueChange={(v) => updateParentSettings({ lowStimTheme: v })}
              label="Low-stim theme"
            />
          }
        />
        {/* Visual-transition-timer chime (visual-timers §2.7 / §4 #14). Default OFF;
            when on it is a SINGLE soft chime when a step's timer ends — it ducks
            (never interrupts) other audio and never loops. */}
        <SettingRow
          label="Timer sound"
          hint="A soft chime when a step's timer ends. Off by default; never interrupts other audio."
          right={
            <Toggle
              value={parentSettings.timerSoundEnabled ?? false}
              onValueChange={(v) => updateParentSettings({ timerSoundEnabled: v })}
              label="Timer sound"
            />
          }
        />
        {/* OpenDyslexic: only shown when the font binaries are bundled + wired —
            never advertise a no-op control (accessibility-i18n §2.7 / production-
            readiness §2.9 ship-gate). The plumbing (src/theme/fonts.ts) is ready;
            the row activates automatically when the .otf binaries land. */}
        {isOpenDyslexicAvailable() ? (
          <SettingRow
            label="OpenDyslexic font"
            hint="A high-legibility body typeface"
            right={
              <Toggle
                value={parentSettings.openDyslexicFont ?? false}
                onValueChange={(v) => updateParentSettings({ openDyslexicFont: v })}
                label="OpenDyslexic font"
              />
            }
          />
        ) : null}

        {/* Breathing activity (breathing-regulation §4 #14) — a calm, self-paced
            activity in the calm corner. Per-child: the default curated pattern +
            the opt-in pacing vibration (default OFF). Copy claims NO calming/health
            effect — it is an activity, not a medical tool. */}
        {activeProfile && activeChildId ? (
          <>
            <Divider />
            <View style={{ gap: t.spacing(2) }}>
              <Text
                style={{
                  color: c.text,
                  fontFamily: t.type.label.family,
                  fontSize: t.type.label.size,
                  fontWeight: "700",
                }}
              >
                Default breathing pattern
              </Text>
              <Segmented<string>
                value={
                  activeProfile.settings.breathingPatternId ??
                  defaultBreathPatternId(activeProfile.ageMode)
                }
                onChange={(id) => updateSettings(activeChildId, { breathingPatternId: id })}
                options={breathPatternsFor(activeProfile.ageMode).map((p) => ({
                  value: p.id,
                  label: p.label.text ?? p.label.spokenLabel,
                }))}
              />
              <Note>A calm, self-paced breathing activity in the calm corner.</Note>
            </View>
            <SettingRow
              label="Breath pacing vibration"
              hint="A soft buzz on each in-and-out breath. Off by default."
              right={
                <Toggle
                  value={activeProfile.settings.breathingPacingHaptics ?? false}
                  onValueChange={(v) =>
                    updateSettings(activeChildId, { breathingPacingHaptics: v })
                  }
                  label="Breath pacing vibration"
                />
              }
            />
          </>
        ) : null}
      </Card>

      {/* Soundscapes (soundscapes §2.7) — active child. Optional background sound:
          mixes with, never interrupts, other audio; never plays backgrounded. */}
      {activeProfile && activeChildId ? <SoundscapesCard childId={activeChildId} /> : null}

      {/* Language & display (accessibility-i18n §2.7). English ships; the picker
          auto-lists locales as translated catalogs are added — a pure data drop,
          no component edits. Dynamic Type is automatic (no toggle needed). */}
      <Card>
        <SectionTitle>{getMessage("language.title", { locale })}</SectionTitle>
        <View style={{ gap: t.spacing(2) }}>
          <Segmented<string>
            value={locale}
            onChange={(v) => updateParentSettings({ locale: v })}
            options={AVAILABLE_LOCALES().map((l) => ({
              value: l,
              label: l === "en" ? getMessage("language.english", { locale }) : l,
            }))}
          />
        </View>
        <Note>{getMessage("language.note", { locale })}</Note>
        <Note>{getMessage("language.textNote", { locale })}</Note>
      </Card>

      {/* calm mode (active child) */}
      {activeProfile && activeChildId ? (
        <Card>
          <SectionTitle>Calm path · {activeProfile.displayName}</SectionTitle>
          <SettingRow
            label="Calm mode"
            hint="Non-gamified: keeps routines, hides tokens & confetti"
            right={
              <Toggle
                value={activeProfile.settings.calmMode}
                onValueChange={(v) => updateSettings(activeChildId, { calmMode: v })}
                label="Calm mode"
              />
            }
          />
          {/* Novelty quest board toggle (novelty-refresh §2.6). Default follows
              !calmMode; off suppresses the whole quest/spotlight/badge layer. */}
          <SettingRow
            label="Show quests"
            hint="A rotating board of gentle bonus quests. No timers, nothing to lose."
            right={
              <Toggle
                value={activeProfile.settings.questsEnabled ?? !activeProfile.settings.calmMode}
                onValueChange={(v) => updateSettings(activeChildId, { questsEnabled: v })}
                label="Show quests"
              />
            }
          />
        </Card>
      ) : null}

      {/* reminders + quiet hours (M10) */}
      <Card>
        <SectionTitle>Reminders</SectionTitle>
        {activeProfile && activeChildId ? (
          <SettingRow
            label="Gentle reminders"
            hint="A few, tied to routine times · spoken when opened"
            right={
              <Toggle
                value={
                  parentSettings.notificationsEnabled &&
                  activeProfile.settings.reminders.enabled
                }
                onValueChange={(v) => {
                  updateParentSettings({ notificationsEnabled: v });
                  updateSettings(activeChildId, {
                    reminders: { ...activeProfile.settings.reminders, enabled: v },
                  });
                }}
                label="Gentle reminders"
              />
            }
          />
        ) : null}
        <Note>No reminders are sent inside the quiet-hours window.</Note>
        <View style={{ flexDirection: "row", gap: t.spacing(6) }}>
          <TimeField
            label="From"
            value={parentSettings.quietHours.start}
            onChange={(v) => updateParentSettings({ quietHours: { ...parentSettings.quietHours, start: v ?? "20:00" } })}
          />
          <TimeField
            label="Until"
            value={parentSettings.quietHours.end}
            onChange={(v) => updateParentSettings({ quietHours: { ...parentSettings.quietHours, end: v ?? "07:00" } })}
          />
        </View>
      </Card>

      {/* parent gate + purchase PIN */}
      <Card>
        <SectionTitle>Parent gate</SectionTitle>
        <View style={{ gap: t.spacing(2) }}>
          <Text style={{ color: c.text, fontFamily: t.type.label.family, fontSize: t.type.label.size }}>
            Entry challenge
          </Text>
          <Segmented<ParentGateMode>
            value={gate.mode === "longpress" ? "longpress" : "math"}
            onChange={(v) => setGateMode(v)}
            options={[
              { value: "math", label: "Math problem" },
              { value: "longpress", label: "Press & hold" },
            ]}
          />
        </View>
        <Divider />
        <Text style={{ color: c.text, fontFamily: t.type.label.family, fontSize: t.type.label.size }}>
          Purchase PIN {gate.pinHash ? "· set ✓" : "· not set"}
        </Text>
        <Note>A 4–8 digit PIN is required before any purchase — never math or hold.</Note>
        <View style={{ flexDirection: "row", gap: t.spacing(2), alignItems: "center" }}>
          <TextInput
            value={pinInput}
            onChangeText={(v) => setPinInput(v.replace(/[^0-9]/g, "").slice(0, 8))}
            keyboardType="number-pad"
            secureTextEntry
            placeholder={gate.pinHash ? "New PIN" : "Set a PIN"}
            placeholderTextColor={c.textDim}
            accessibilityLabel="Purchase PIN"
            style={{
              flex: 1,
              color: c.text,
              fontSize: t.type.bodyLg.size,
              letterSpacing: 6,
              backgroundColor: c.surfaceAlt,
              borderRadius: t.radius,
              borderWidth: 1,
              borderColor: c.border,
              paddingVertical: t.spacing(2),
              paddingHorizontal: t.spacing(3),
            }}
          />
          <TextButton label={gate.pinHash ? "Change" : "Save"} onPress={savePin} />
        </View>
        {pinSaved ? <Note>PIN saved.</Note> : null}
        {pinInput.length > 0 && !isValidPin(pinInput) ? (
          <Text style={{ color: c.gentleAlert, fontSize: t.type.caption.size }}>Use 4–8 digits.</Text>
        ) : null}
      </Card>

      {/* privacy (opt-IN, on-device only) */}
      <Card>
        <SectionTitle>Privacy</SectionTitle>
        <Note>Everything stays on this device. Nothing is ever uploaded.</Note>
        <SettingRow
          label="On-device usage insights"
          hint="Off by default. Local only — never leaves the device."
          right={
            <Toggle
              value={parentSettings.localAnalyticsEnabled}
              onValueChange={(v) => updateParentSettings({ localAnalyticsEnabled: v })}
              label="On-device usage insights"
            />
          }
        />
        <SettingRow
          label="Mood check-ins"
          hint="Off by default. Optional emoji check-in for kids + a private, on-device parent view. Applies to every child unless you turn it off for one."
          right={
            <Toggle
              value={parentSettings.moodLoggingEnabled}
              onValueChange={(v) => updateParentSettings({ moodLoggingEnabled: v })}
              label="Mood check-ins"
            />
          }
        />
      </Card>

      {/* Sharing this device (multi-child §2.1/§3.4). Off by default: switching who's
          using it stays behind the grown-ups gate. On a trusted single-family device a
          parent can opt in to an ungated kid switcher on the "all done" panel. */}
      <Card>
        <SectionTitle>Sharing this device</SectionTitle>
        <SettingRow
          label="Kid quick-switch"
          hint="Let kids hand off to a sibling from the 'all done' screen, without the grown-ups gate. Off by default."
          right={
            <Toggle
              value={parentSettings.quickChildSwitch}
              onValueChange={(v) => updateParentSettings({ quickChildSwitch: v })}
              label="Kid quick-switch"
            />
          }
        />
      </Card>

      {/* Tiny Bubbles Plus — subscription management (billing §2.3) */}
      <Card>
        <SectionTitle>Tiny Bubbles Plus</SectionTitle>
        <SettingRow
          label={premium ? "You're on Plus" : "Tiny Bubbles Plus"}
          hint={plusHint}
          onPress={goToPaywall}
        />
      </Card>

      {/* data review / export + delete */}
      <Card>
        <SectionTitle>Your data</SectionTitle>
        <SettingRow
          label="Review what's stored"
          hint="See exactly what this app keeps, on this device"
          onPress={() => setShowData((v) => !v)}
        />
        {showData ? <DataReview /> : null}

        {/* Backup & restore (clinician-reporting §2.3) — the offline "your data".
            Each action passes the parent PIN first (via requestSensitive). */}
        <Divider />
        <SectionTitle>Backup & restore</SectionTitle>
        <SettingRow
          label="Back up to a file"
          hint="Save or share a copy of everything on this device"
          onPress={() => requestSensitive("backup")}
        />
        <SettingRow
          label="Restore from a file"
          hint="Replace this device's data with a saved backup"
          onPress={() => requestSensitive("restore")}
        />
        {lastBackupAt ? <Note>Last backed up {fmtDate(lastBackupAt)}.</Note> : null}
        {restorePrepared ? (
          <View style={{ gap: t.spacing(2) }}>
            <Note>
              This replaces the data on this device with the backup:{" "}
              {restorePrepared.counts.children} children, {restorePrepared.counts.tasks} tasks,{" "}
              {restorePrepared.counts.rewards} rewards, {restorePrepared.counts.companions} buddies.
            </Note>
            <View style={{ flexDirection: "row", gap: t.spacing(3) }}>
              <PrimaryButton label="Replace with backup" tone="danger" onPress={confirmRestore} />
              <PrimaryButton label="Cancel" tone="neutral" onPress={() => setRestorePrepared(null)} />
            </View>
          </View>
        ) : null}
        {dataNote ? <Note>{dataNote}</Note> : null}

        <Divider />
        {confirmDelete ? (
          <View style={{ gap: t.spacing(2) }}>
            <Note>This permanently deletes all child profiles, tasks, rewards, buddies and logs on this device.</Note>
            <View style={{ flexDirection: "row", gap: t.spacing(3) }}>
              <PrimaryButton
                label="Delete everything"
                tone="danger"
                onPress={() => {
                  wipeAllChildData();
                  setConfirmDelete(false);
                  setShowData(false);
                }}
              />
              <PrimaryButton label="Cancel" tone="neutral" onPress={() => setConfirmDelete(false)} />
            </View>
          </View>
        ) : (
          <View style={{ alignItems: "flex-start" }}>
            <TextButton label="Delete all child data" tone="danger" onPress={() => requestSensitive("deleteAll")} />
          </View>
        )}
      </Card>

      {/* about / licenses */}
      <Card>
        <SectionTitle>About</SectionTitle>
        <SettingRow label="Licenses" hint="Open-source notices" onPress={() => setShowLicenses((v) => !v)} />
        {showLicenses ? <Licenses /> : null}
      </Card>
    </ParentScreen>
  );
}

// ---------------------------------------------------------------------------
/** Same honest calendar format the paywall uses (no countdown/urgency). */
function fmtDate(ms: number): string {
  return format(new Date(ms), "MMMM d, yyyy");
}

// ---------------------------------------------------------------------------
/**
 * Soundscapes card (soundscapes §2.7) — focus-during-tasks toggle, calm + focus
 * scene pickers (premium scenes preview + deep-link to the paywall, never strip an
 * owned one), a real 0..1 bed volume, and the non-premium "unlock more" upsell.
 */
function SoundscapesCard({ childId }: { childId: string }) {
  const t = useThemeTokens();
  const c = t.colors;
  const settings = useChildStore((s) => s.profiles[childId]?.settings);
  const updateSettings = useChildStore((s) => s.updateSettings);
  const entitlement = useEntitlements();
  const premium = useIsPremium();
  const ss = resolveSoundscapeSettings(settings?.soundscape);

  const persist = (patch: Partial<typeof ss>) =>
    updateSettings(childId, { soundscape: { ...ss, ...patch } });

  const calmScenes = pickableScenes("calm", 6, entitlement, ss.calmSceneId);
  const focusScenes = pickableScenes("focus", 6, entitlement, ss.focusSceneId);

  const pick = (scene: Soundscape, kind: "calm" | "focus", selectedId: string | null) => {
    if (!isSceneAvailable(scene, entitlement, selectedId)) {
      goToPaywall(); // premium preview → PIN-gated paywall (never strips/greys owned)
      return;
    }
    persist(kind === "calm" ? { calmSceneId: scene.id } : { focusSceneId: scene.id });
  };

  const labelStyle = {
    color: c.text,
    fontFamily: t.type.label.family,
    fontSize: t.type.label.size,
    fontWeight: "700" as const,
  };

  return (
    <Card>
      <SectionTitle>Soundscapes</SectionTitle>
      <SettingRow
        label="Play focus sounds during routines"
        hint="Optional quiet background sound while a routine runs. Off by default."
        right={
          <Toggle
            value={ss.focusDuringTasks}
            onValueChange={(v) => persist({ focusDuringTasks: v })}
            label="Play focus sounds during routines"
          />
        }
      />
      <Divider />
      <Text style={labelStyle}>Calm-corner scene</Text>
      <SceneChipRow
        scenes={calmScenes}
        selectedId={ss.calmSceneId}
        entitlement={entitlement}
        onPick={(scene) => pick(scene, "calm", ss.calmSceneId)}
        c={c}
        t={t}
      />
      <Text style={labelStyle}>Focus scene</Text>
      <SceneChipRow
        scenes={focusScenes}
        selectedId={ss.focusSceneId}
        entitlement={entitlement}
        onPick={(scene) => pick(scene, "focus", ss.focusSceneId)}
        c={c}
        t={t}
      />
      <Divider />
      <Text style={labelStyle}>Volume</Text>
      <VolumeSlider
        value={ss.volume}
        onChange={(v) => {
          setSoundscapeVolume(v);
          persist({ volume: v });
        }}
        size="older"
        accessibilityLabel="Soundscape volume"
      />
      {!premium ? (
        <PremiumGate feature="calmSoundscape" lockedLabel="Unlock more soundscapes">
          <View />
        </PremiumGate>
      ) : null}
      <Note>
        Optional background sounds. They mix with — never interrupt — other audio, and
        never play in the background.
      </Note>
    </Card>
  );
}

/** A row of selectable scene chips; premium scenes show ✨ and route to the paywall. */
function SceneChipRow({
  scenes,
  selectedId,
  entitlement,
  onPick,
  c,
  t,
}: {
  scenes: Soundscape[];
  selectedId: string | null;
  entitlement: Entitlement;
  onPick: (scene: Soundscape) => void;
  c: ReturnType<typeof useThemeTokens>["colors"];
  t: ReturnType<typeof useThemeTokens>;
}) {
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: t.spacing(2) }}>
      {scenes.map((scene) => {
        const active = scene.id === selectedId;
        const locked = !isSceneAvailable(scene, entitlement, selectedId);
        return (
          <Pressable
            key={scene.id}
            onPress={() => onPick(scene)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            accessibilityLabel={scene.label.spokenLabel}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
              paddingVertical: 8,
              paddingHorizontal: 12,
              borderRadius: t.radius,
              backgroundColor: active ? c.surfaceAlt : c.surface,
              borderWidth: active ? 2 : 1,
              borderColor: active ? c.primary : c.border,
            }}
          >
            <Text style={{ fontSize: 18 }}>{scene.label.emoji ?? "🎧"}</Text>
            <Text style={{ color: c.text, fontSize: t.type.label.size, fontWeight: "600" }}>
              {scene.label.spokenLabel}
            </Text>
            {locked ? <Text style={{ fontSize: 12 }}>✨</Text> : null}
          </Pressable>
        );
      })}
    </View>
  );
}

// ---------------------------------------------------------------------------
function DataReview() {
  const t = useThemeTokens();
  const c = t.colors;
  // The full JSON is rendered LAZILY behind a second tap (production-readiness
  // §2.4): the counts table is always cheap, but stringifying the whole store
  // (all children × up-to-500 ledger entries each × moods × events) can be
  // megabytes and jank the screen on a low-end device.
  const [showFull, setShowFull] = useState(false);

  const snapshot = useMemo(() => {
    const child = useChildStore.getState();
    const task = useTaskStore.getState();
    const reward = useRewardStore.getState();
    const buddy = useBuddyStore.getState();
    const chore = useChoreStore.getState();
    const quest = useQuestStore.getState();
    const plan = usePlanStore.getState();
    const settings = useSettingsStore.getState();
    const sumLen = (rec: Record<string, unknown[]>) =>
      Object.values(rec).reduce((n, arr) => n + (arr?.length ?? 0), 0);
    const ledgerEntries = Object.values(child.ledgers).reduce(
      (n, l) => n + (l?.entries.length ?? 0),
      0,
    );
    // Bounded inline dump: the potentially-large arrays (ledger `entries`, moods,
    // activity events, redemptions) are OMITTED and summarized as counts — the
    // full record is in the backup/export file (clinician-reporting `exportBackup`).
    const ledgerHeads: Record<string, unknown> = {};
    for (const [cid, l] of Object.entries(child.ledgers)) {
      const { entries, ...rest } = l as { entries?: unknown[] };
      ledgerHeads[cid] = { ...rest, entries: `${entries?.length ?? 0} — in backup file` };
    }
    return {
      counts: {
        children: Object.keys(child.profiles).length,
        tasks: sumLen(task.tasks),
        routines: sumLen(task.routines),
        rewards: sumLen(reward.rewards),
        tokenEntries: ledgerEntries,
        moodLogs: sumLen(child.moods),
        activityEvents: sumLen(child.events),
        companions: Object.keys(buddy.companions).length,
        // parent-global rotating chores (multi-child §3.3) — the new tb/chores slice
        // reflected in "Review what's stored" (roadmap invariant #8(d)).
        sharedChores: chore.chores.length,
        // per-child rotating-quest boards (novelty-refresh §4.MODIFY) — the new
        // tb/quests slice reflected in "Review what's stored" (roadmap invariant #8(d)).
        questBoards: Object.keys(quest.quests).length,
        // per-child if-then plans (if-then-plans §3.3) — the new tb/plans slice
        // reflected in "Review what's stored" (roadmap invariant #8(d)).
        plans: sumLen(plan.plans),
      },
      stored: {
        parentSettings: settings.parentSettings,
        entitlement: settings.entitlement,
        onboarding: settings.meta.onboarding,
        children: child.profiles,
        tokenLedgers: ledgerHeads,
        progress: child.progress,
        tasks: task.tasks,
        routines: task.routines,
        rewards: reward.rewards,
        companions: buddy.companions,
        sharedChores: chore.chores,
        questBoards: quest.quests,
        plans: plan.plans,
      },
    };
  }, []);

  return (
    <View style={{ gap: t.spacing(2) }}>
      {Object.entries(snapshot.counts).map(([k, v]) => (
        <View key={k} style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <Text style={{ color: c.textDim, fontSize: t.type.body.size }}>{k}</Text>
          <Text style={{ color: c.text, fontWeight: "700", fontSize: t.type.body.size }}>{v}</Text>
        </View>
      ))}
      <TextButton
        label={showFull ? "Hide full record" : "Show full record"}
        onPress={() => setShowFull((v) => !v)}
      />
      {showFull ? (
        <>
          <Note>
            Full on-device record (nothing here is ever uploaded). Long lists — token
            history, mood logs, activity events — are counted above and included in the
            backup/export file, not inlined here.
          </Note>
          <View
            style={{ backgroundColor: c.surfaceSunken, borderRadius: t.radius, padding: t.spacing(3) }}
          >
            <Text
              selectable
              style={{ color: c.textDim, fontSize: 11, fontFamily: t.type.token.family }}
            >
              {JSON.stringify(snapshot.stored, null, 2)}
            </Text>
          </View>
        </>
      ) : null}
    </View>
  );
}

// ---------------------------------------------------------------------------
const LICENSE_LINES = [
  "Fredoka & Lexend — OFL-1.1 (@expo-google-fonts)",
  "OpenDyslexic — OFL-1.1 (bundled when shipped)",
  "Expo SDK, React Native — MIT",
  "Reanimated, Gesture Handler, Svg — MIT",
  "@gorhom/bottom-sheet, reanimated-color-picker, rn-emoji-keyboard — MIT",
  "@react-native-community/datetimepicker — MIT",
  "Zustand, date-fns — MIT",
];

function Licenses() {
  const t = useThemeTokens();
  const c = t.colors;
  return (
    <View style={{ gap: t.spacing(1) }}>
      {LICENSE_LINES.map((l) => (
        <Text key={l} style={{ color: c.textDim, fontSize: t.type.caption.size }}>
          • {l}
        </Text>
      ))}
      <Note>Full notices ship in THIRD_PARTY_NOTICES.md.</Note>
    </View>
  );
}
