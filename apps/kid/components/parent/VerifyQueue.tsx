/**
 * components/parent/VerifyQueue.tsx — the OPTIONAL parent confirm-at-leisure queue
 * + recently-approved-redemption undo (verify-undo §2.4 / §CREATE, feature #17).
 *
 * Mounted inside the dashboard `ChildCard`. It is a CONFIRMATION at leisure, NEVER
 * a gate: the child already earned their token, so a never-confirmed step is fine
 * (shown neutrally as "waiting for you", never "missed"/"failed"). Two sections,
 * each CONDITIONALLY rendered so nothing blank/blaming ever shows:
 *   1. steps awaiting the optional parent confirmation — `mode:'parent'` done+
 *      unconfirmed (`stepsAwaitingParentVerify`) plus any `mode:'photo'` done step
 *      with a photo — each a one-tap "Looks good" (+ a ZOOMABLE photo thumbnail
 *      that fixes Joon's "tiny un-zoomable" complaint). A missing/dangling photo
 *      file renders NOTHING (no broken-image icon) — cross-device-restore safe.
 *   2. recently-approved / auto-approved redemptions — a one-tap "Undo" (refund +
 *      `reversed`) for a mis-tap / auto-approve correction (parent owns it, no window).
 *
 * The whole component returns null when there is nothing to confirm or undo — no
 * empty card. Parent surface: dense, literal copy, no raw ageMode.
 */
import React, { useMemo, useState } from "react";
import { Image, Modal, Pressable, Text, View } from "react-native";

import { needsParentVerify } from "../../src/domain/tasks";
import type { RedemptionRequest, Reward, Task } from "../../src/domain/types";
import { reverseRedemption, verifyStep } from "../../src/state/gameplay";
import { useRewardStore } from "../../src/state/rewardStore";
import { useTaskStore } from "../../src/state/taskStore";
import { useThemeTokens } from "../../src/theme/useThemeTokens";

import { Divider, SectionTitle, TextButton } from "./ui";

/** How many recently-granted redemptions to offer an undo on (most recent first). */
const MAX_UNDOABLE = 3;

/** A `mode:'photo'` step still awaiting parent confirmation (has a photo, unconfirmed). */
function photoAwaiting(task: Task): boolean {
  if (task.status !== "done" || task.verification.mode !== "photo") return false;
  if (!task.verification.photoUri) return false;
  const { verifiedAt } = task.verification;
  return (
    verifiedAt == null ||
    (task.lastCompletedAt != null && verifiedAt < task.lastCompletedAt)
  );
}

export default function VerifyQueue({ childId }: { childId: string }) {
  const t = useThemeTokens();
  const c = t.colors;

  const tasks = useTaskStore((s) => s.tasks[childId]);
  const rewards = useRewardStore((s) => s.rewards[childId]);
  const redemptions = useRewardStore((s) => s.redemptions[childId]);

  // Section 1: optional confirmations (parent-mode + photo-mode steps).
  const awaiting = useMemo(
    () => (tasks ?? []).filter((t2) => !t2.archived && (needsParentVerify(t2) || photoAwaiting(t2))),
    [tasks],
  );

  // Section 2: recently-granted redemptions the parent can undo (no time limit).
  const rewardById = useMemo(
    () => new Map((rewards ?? []).map((r: Reward) => [r.id, r])),
    [rewards],
  );
  const undoable = useMemo(
    () =>
      (redemptions ?? [])
        .filter((r) => r.status === "approved" || r.status === "fulfilled")
        .sort((a, b) => (b.fulfilledAt ?? b.decidedAt ?? 0) - (a.fulfilledAt ?? a.decidedAt ?? 0))
        .slice(0, MAX_UNDOABLE),
    [redemptions],
  );

  if (awaiting.length === 0 && undoable.length === 0) return null;

  return (
    <>
      {awaiting.length > 0 ? (
        <>
          <Divider />
          <SectionTitle>Waiting for you</SectionTitle>
          {awaiting.map((task) => (
            <View
              key={task.id}
              style={{ flexDirection: "row", alignItems: "center", gap: t.spacing(2), paddingVertical: t.spacing(1) }}
            >
              <Text style={{ fontSize: 22 }}>{task.label.emoji ?? "✅"}</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ color: c.text, fontSize: t.type.body.size }} numberOfLines={1}>
                  {task.label.text ?? task.label.spokenLabel}
                </Text>
                <Text style={{ color: c.textDim, fontSize: t.type.caption.size }}>
                  Confirm when you get a chance
                </Text>
              </View>
              <PhotoThumb uri={task.verification.photoUri} c={c} t={t} />
              <TextButton
                label="Looks good"
                onPress={() => void verifyStep(childId, task.id, { by: "parent" })}
              />
            </View>
          ))}
        </>
      ) : null}

      {undoable.length > 0 ? (
        <>
          <Divider />
          <SectionTitle>Recently approved</SectionTitle>
          {undoable.map((req: RedemptionRequest) => {
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
                    🫧 {req.costTokens} spent
                  </Text>
                </View>
                <TextButton label="Undo" tone="dim" onPress={() => reverseRedemption(childId, req.id)} />
              </View>
            );
          })}
        </>
      ) : null}
    </>
  );
}

type Tokens = ReturnType<typeof useThemeTokens>;

/**
 * A zoomable photo thumbnail. Tap → full-screen. A missing/dangling file (e.g.
 * after cross-device restore — the backup carries the URI, not the bytes) renders
 * NOTHING (no broken-image icon): `onError` flips to a null slot (verify-undo §2.4).
 */
function PhotoThumb({ uri, c, t }: { uri?: string; c: Tokens["colors"]; t: Tokens }) {
  const [broken, setBroken] = useState(false);
  const [full, setFull] = useState(false);
  if (!uri || broken) return null;
  return (
    <>
      <Pressable onPress={() => setFull(true)} accessibilityRole="imagebutton" accessibilityLabel="View photo">
        <Image
          source={{ uri }}
          onError={() => setBroken(true)}
          style={{ width: 40, height: 40, borderRadius: t.radius, backgroundColor: c.surfaceSunken }}
        />
      </Pressable>
      <Modal visible={full} transparent animationType="fade" onRequestClose={() => setFull(false)}>
        <Pressable
          onPress={() => setFull(false)}
          style={{ flex: 1, backgroundColor: c.scrim, alignItems: "center", justifyContent: "center", padding: t.spacing(4) }}
        >
          <Image
            source={{ uri }}
            onError={() => {
              setBroken(true);
              setFull(false);
            }}
            resizeMode="contain"
            style={{ width: "100%", height: "80%", borderRadius: t.radius }}
          />
        </Pressable>
      </Modal>
    </>
  );
}
