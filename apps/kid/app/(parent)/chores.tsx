/**
 * app/(parent)/chores.tsx — parent authoring for SHARED / ROTATING chores across
 * siblings (multi-child §2.2), the documented Joon white-space ("rotate chores
 * between children"). Dense parent surface behind the PIN gate.
 *
 * Requires ≥2 non-archived children; with <2 it shows a calm Note. With ≥2 children
 * and zero chores it leads with the `chore.empty` CTA (never a blank list / error).
 *
 * ZERO AI: rotation is deterministic date math (src/domain/chores.ts) — this screen
 * only authors metadata. ANTI-SHAME (§6): the manual advance is a warm "pass to
 * next," never "take away"; editing a chore never deletes any child's already-earned
 * tokens or completed history; no cross-child comparison / leaderboard anywhere.
 */
import React, { useMemo, useState } from "react";
import { Text, TextInput, View } from "react-native";

import { CHORE_TEMPLATES, type ChoreTemplate } from "../../src/data/choreTemplates";
import type { Daypart, RotationCadence, SharedChore, VisualLabel } from "../../src/domain/types";
import { useChildStore } from "../../src/state/childStore";
import { useChoreStore } from "../../src/state/choreStore";
import {
  createSharedChore,
  deleteSharedChore,
  passSharedChoreToNext,
  updateSharedChore,
} from "../../src/state/gameplay";
import { resolveContent } from "../../src/theme/resolveContent";
import { useThemeInputs } from "../../src/theme/ThemeProvider";
import { useThemeTokens } from "../../src/theme/useThemeTokens";

import { ColorField, DayPicker, EmojiField } from "../../components/parent/pickers";
import RotationPreview from "../../components/parent/RotationPreview";
import {
  Card,
  Chip,
  Divider,
  Note,
  ParentScreen,
  PrimaryButton,
  SectionTitle,
  Segmented,
  SettingRow,
  Stepper,
  TextButton,
} from "../../components/parent/ui";

function deviceTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

const CADENCE_OPTIONS: { value: RotationCadence; label: string }[] = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "perCompletion", label: "Each time" },
  { value: "manual", label: "Manual" },
];

const DAYPART_OPTIONS: { value: Exclude<Daypart, "night">; label: string }[] = [
  { value: "morning", label: "Morning" },
  { value: "afternoon", label: "Afternoon" },
  { value: "evening", label: "Evening" },
];

export default function ChoresScreen() {
  const t = useThemeTokens();
  const { ageMode } = useThemeInputs();

  const index = useChildStore((s) => s.index);
  const chores = useChoreStore((s) => s.chores);
  const list = index.filter((e) => !e.archived);
  const nameById = useMemo(
    () => Object.fromEntries(list.map((e) => [e.id, e.displayName])),
    [list],
  );
  const tz = deviceTimeZone();

  // editing = a chore id (edit existing), "new" (add), or null (list only).
  const [editing, setEditing] = useState<string | "new" | null>(null);

  if (list.length < 2) {
    return (
      <ParentScreen title="Shared chores" subtitle="Rotate a chore across your kids.">
        <Card>
          <Note>Add a second child to rotate chores.</Note>
        </Card>
      </ParentScreen>
    );
  }

  const editingChore =
    editing && editing !== "new" ? chores.find((ch) => ch.id === editing) ?? null : null;

  return (
    <ParentScreen
      title="Shared chores"
      subtitle="A chore that rotates fairly across your kids — offline, no guessing."
    >
      {editing ? (
        <ChoreEditor
          key={editing}
          roster={list.map((e) => ({ id: e.id, name: e.displayName }))}
          existing={editingChore}
          onCancel={() => setEditing(null)}
          onSaved={() => setEditing(null)}
        />
      ) : (
        <>
          {chores.length === 0 ? (
            <Card>
              <Text
                style={{
                  color: t.colors.text,
                  fontFamily: t.type.bodyLg.family,
                  fontSize: t.type.bodyLg.size,
                }}
              >
                {resolveContent("chore.empty", { ageMode })}
              </Text>
              <PrimaryButton label="＋ Add a chore" onPress={() => setEditing("new")} />
            </Card>
          ) : (
            <>
              {chores.map((chore) => (
                <ChoreCard
                  key={chore.id}
                  chore={chore}
                  nameById={nameById}
                  tz={tz}
                  onEdit={() => setEditing(chore.id)}
                />
              ))}
              <PrimaryButton label="＋ Add a chore" onPress={() => setEditing("new")} />
            </>
          )}
        </>
      )}
    </ParentScreen>
  );
}

// ---------------------------------------------------------------------------
// A single chore row: label + roster summary + rotation preview + manage actions.
// ---------------------------------------------------------------------------
function ChoreCard({
  chore,
  nameById,
  tz,
  onEdit,
}: {
  chore: SharedChore;
  nameById: Record<string, string>;
  tz: string;
  onEdit: () => void;
}) {
  const t = useThemeTokens();
  const c = t.colors;
  const rosterNames = chore.childIds.map((id) => nameById[id] ?? "—").join(" · ");
  const cadenceLabel =
    CADENCE_OPTIONS.find((o) => o.value === chore.cadence)?.label ?? chore.cadence;
  const daypartLabel =
    DAYPART_OPTIONS.find((o) => o.value === chore.daypart)?.label ?? chore.daypart;

  return (
    <Card>
      <View style={{ flexDirection: "row", alignItems: "center", gap: t.spacing(3) }}>
        <Text style={{ fontSize: 26 }}>{chore.label.emoji ?? "🔁"}</Text>
        <View style={{ flex: 1 }}>
          <Text
            style={{
              color: c.text,
              fontFamily: t.type.bodyLg.family,
              fontSize: t.type.bodyLg.size,
              fontWeight: "700",
            }}
          >
            {chore.label.text ?? chore.label.spokenLabel}
          </Text>
          <Text style={{ color: c.textDim, fontSize: t.type.caption.size }}>
            {cadenceLabel} · {daypartLabel} · 🫧 {chore.tokenValue}
            {chore.active ? "" : " · paused"}
          </Text>
        </View>
        <TextButton label="Edit" onPress={onEdit} />
      </View>

      <Text style={{ color: c.textDim, fontSize: t.type.caption.size }}>Rotates: {rosterNames}</Text>

      <Divider />
      <SectionTitle>Coming up</SectionTitle>
      <RotationPreview
        chore={chore}
        nameById={nameById}
        tz={tz}
        onPassToNext={chore.active ? () => passSharedChoreToNext(chore.id) : undefined}
      />
    </Card>
  );
}

// ---------------------------------------------------------------------------
// The add/edit form. Ordered roster (add/remove + up/down), curated cadence /
// daypart / payout / days. Curated-autonomy: no free-form number entry, no drag lib.
// ---------------------------------------------------------------------------
interface RosterChild {
  id: string;
  name: string;
}

function ChoreEditor({
  roster,
  existing,
  onCancel,
  onSaved,
}: {
  roster: RosterChild[];
  existing: SharedChore | null;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const t = useThemeTokens();
  const c = t.colors;

  const [emoji, setEmoji] = useState(existing?.label.emoji ?? "🔁");
  const [color, setColor] = useState(existing?.label.color ?? "#7BD389");
  const [text, setText] = useState(existing?.label.text ?? existing?.label.spokenLabel ?? "");
  // ordered roster ids (rotation order). Default: everyone, in current index order.
  const [childIds, setChildIds] = useState<string[]>(
    existing ? [...existing.childIds] : roster.map((r) => r.id),
  );
  const [cadence, setCadence] = useState<RotationCadence>(existing?.cadence ?? "daily");
  const [daypart, setDaypart] = useState<Exclude<Daypart, "night">>(existing?.daypart ?? "morning");
  const [tokenValue, setTokenValue] = useState(existing?.tokenValue ?? 1);
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>(
    existing ? [...existing.schedule.daysOfWeek] : [],
  );

  const nameById = useMemo(
    () => Object.fromEntries(roster.map((r) => [r.id, r.name])),
    [roster],
  );
  const notInRoster = roster.filter((r) => !childIds.includes(r.id));

  const applyTemplate = (tpl: ChoreTemplate) => {
    setEmoji(tpl.label.emoji ?? "🔁");
    setColor(tpl.label.color);
    setText(tpl.label.spokenLabel);
    setDaypart(tpl.defaultDaypart);
    setCadence(tpl.defaultCadence);
    setTokenValue(tpl.suggestedTokenValue);
  };

  const move = (id: string, dir: -1 | 1) => {
    setChildIds((ids) => {
      const i = ids.indexOf(id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= ids.length) return ids;
      const next = [...ids];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  };

  const canSave = childIds.length >= 2 && text.trim().length > 0;

  const save = () => {
    const label: VisualLabel = {
      spokenLabel: text.trim() || "Shared chore",
      text: text.trim() || undefined,
      emoji,
      color,
    };
    if (existing) {
      updateSharedChore(existing.id, {
        label,
        childIds,
        cadence,
        daypart,
        tokenValue,
        schedule: { ...existing.schedule, daysOfWeek },
        active: childIds.length >= 2 ? existing.active : false,
      });
    } else {
      createSharedChore({
        label,
        childIds,
        cadence,
        daypart,
        tokenValue,
        schedule: { daysOfWeek },
      });
    }
    onSaved();
  };

  const remove = () => {
    if (existing) deleteSharedChore(existing.id);
    onSaved();
  };

  return (
    <>
      {/* template suggestions (pre-fill only) */}
      {!existing ? (
        <Card>
          <SectionTitle>Start from a suggestion</SectionTitle>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: t.spacing(2) }}>
            {CHORE_TEMPLATES.map((tpl) => (
              <Chip
                key={tpl.id}
                label={tpl.label.spokenLabel}
                emoji={tpl.label.emoji}
                onPress={() => applyTemplate(tpl)}
              />
            ))}
          </View>
        </Card>
      ) : null}

      {/* label */}
      <Card>
        <SectionTitle>Chore</SectionTitle>
        <View style={{ flexDirection: "row", gap: t.spacing(4), alignItems: "flex-start" }}>
          <EmojiField value={emoji} onChange={setEmoji} />
          <View style={{ flex: 1 }}>
            <ColorField value={color} onChange={setColor} />
          </View>
        </View>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="What is the chore?"
          placeholderTextColor={c.textDim}
          accessibilityLabel="Chore name"
          style={{
            color: c.text,
            fontFamily: t.type.bodyLg.family,
            fontSize: t.type.bodyLg.size,
            backgroundColor: c.surfaceAlt,
            borderRadius: t.radius,
            borderWidth: 1,
            borderColor: c.border,
            paddingVertical: t.spacing(2),
            paddingHorizontal: t.spacing(3),
          }}
        />
      </Card>

      {/* roster (ordered) */}
      <Card>
        <SectionTitle>Who rotates (in order)</SectionTitle>
        {childIds.length < 2 ? (
          <Note>Pick at least two kids to rotate between.</Note>
        ) : null}
        {childIds.map((id, i) => (
          <View
            key={id}
            style={{ flexDirection: "row", alignItems: "center", gap: t.spacing(2), paddingVertical: 2 }}
          >
            <Text style={{ color: c.textDim, fontSize: t.type.caption.size, width: 20 }}>{i + 1}.</Text>
            <Text style={{ flex: 1, color: c.text, fontSize: t.type.body.size }}>
              {nameById[id] ?? "—"}
            </Text>
            <TextButton label="↑" onPress={() => move(id, -1)} />
            <TextButton label="↓" onPress={() => move(id, 1)} />
            <TextButton
              label="Remove"
              tone="dim"
              onPress={() => setChildIds((ids) => ids.filter((x) => x !== id))}
            />
          </View>
        ))}
        {notInRoster.length > 0 ? (
          <>
            <Divider />
            <Text style={{ color: c.textDim, fontSize: t.type.caption.size }}>Add to rotation</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: t.spacing(2) }}>
              {notInRoster.map((r) => (
                <Chip key={r.id} label={`＋ ${r.name}`} onPress={() => setChildIds((ids) => [...ids, r.id])} />
              ))}
            </View>
          </>
        ) : null}
      </Card>

      {/* cadence + daypart + payout + days */}
      <Card>
        <View style={{ gap: t.spacing(2) }}>
          <Text style={{ color: c.text, fontFamily: t.type.label.family, fontSize: t.type.label.size }}>
            How it rotates
          </Text>
          <Segmented<RotationCadence> value={cadence} onChange={setCadence} options={CADENCE_OPTIONS} />
          <Note>
            {cadence === "perCompletion"
              ? "Passes to the next child each time it's done. You can always hand it off manually."
              : cadence === "manual"
                ? "Stays put until you hand it off with 'Pass to next child'."
                : "Rotates automatically on the clock — no child ever gets stuck holding it."}
          </Note>
        </View>

        <View style={{ gap: t.spacing(2) }}>
          <Text style={{ color: c.text, fontFamily: t.type.label.family, fontSize: t.type.label.size }}>
            Time of day
          </Text>
          <Segmented<Exclude<Daypart, "night">>
            value={daypart}
            onChange={setDaypart}
            options={DAYPART_OPTIONS}
          />
        </View>

        <SettingRow
          label="Bubbles earned"
          hint="Paid to the child whose turn it is, when they finish it."
          right={<Stepper value={tokenValue} min={1} max={5} onChange={setTokenValue} />}
        />

        <DayPicker value={daysOfWeek} onChange={setDaysOfWeek} label="Days active" />
      </Card>

      {/* live rotation preview from the current (unsaved) form */}
      <Card>
        <SectionTitle>Coming up</SectionTitle>
        <RotationPreview
          chore={{
            id: existing?.id ?? "preview",
            label: { spokenLabel: text || "Shared chore", emoji, color },
            childIds,
            cadence,
            rotationAnchorDay: existing?.rotationAnchorDay ?? isoToday(),
            manualHolderIndex: existing?.manualHolderIndex ?? 0,
            completionAdvanceCount: existing?.completionAdvanceCount ?? 0,
            daypart,
            tokenValue,
            templateId: existing?.templateId ?? null,
            schedule: { daysOfWeek },
            active: childIds.length >= 2,
            createdAt: existing?.createdAt ?? 0,
            updatedAt: existing?.updatedAt ?? 0,
          }}
          nameById={nameById}
          tz={deviceTimeZone()}
        />
      </Card>

      <PrimaryButton label={existing ? "Save chore" : "Add chore"} onPress={save} disabled={!canSave} />
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <TextButton label="Cancel" tone="dim" onPress={onCancel} />
        {existing ? <TextButton label="Delete chore" tone="danger" onPress={remove} /> : null}
      </View>
    </>
  );
}

/** Device-local ISO day for the unsaved-preview anchor (matches createSharedChore). */
function isoToday(): string {
  try {
    // en-CA yields YYYY-MM-DD in the device timezone.
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: deviceTimeZone(),
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}
