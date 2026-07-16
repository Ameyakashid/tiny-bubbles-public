/**
 * components/parent/pickers.tsx — emoji / color / time / day pickers for the
 * parent task & reward authoring UI (doc 63 Feature 5, doc 66 §M9).
 *
 * RE-AUTHORED against the INSTALLED library versions (NOT copied from the SDK-54
 * donor): `rn-emoji-keyboard@1.7`, `reanimated-color-picker@5.1`,
 * `@react-native-community/datetimepicker@9.1`. The day selector is our own
 * curated 7-day toggle (no donor). All read `useThemeTokens()`.
 */
import DateTimePicker, {
  type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import React, { useState } from "react";
import { Platform, Pressable, Text, View } from "react-native";
import EmojiPicker, { type EmojiType } from "rn-emoji-keyboard";
import ColorPicker, {
  HueSlider,
  Panel1,
  Preview,
  Swatches,
} from "reanimated-color-picker";

import { useThemeTokens } from "../../src/theme/useThemeTokens";

import { Segmented, Stepper } from "./ui";

// ---------------------------------------------------------------------------
// Field label + value shell (shared look for the four fields).
// ---------------------------------------------------------------------------
function FieldShell({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  const t = useThemeTokens();
  return (
    <View style={{ gap: t.spacing(2) }}>
      <Text
        style={{
          color: t.colors.textDim,
          fontFamily: t.type.label.family,
          fontSize: t.type.caption.size,
          fontWeight: "700",
        }}
      >
        {label}
      </Text>
      {children}
    </View>
  );
}

// ---------------------------------------------------------------------------
// EmojiField — rn-emoji-keyboard modal (it renders its own Modal).
// ---------------------------------------------------------------------------
export function EmojiField({
  value,
  onChange,
  label = "Icon",
}: {
  value?: string;
  onChange: (emoji: string) => void;
  label?: string;
}) {
  const t = useThemeTokens();
  const c = t.colors;
  const [open, setOpen] = useState(false);
  return (
    <FieldShell label={label}>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel="Choose an icon"
        style={{
          width: 64,
          height: 64,
          borderRadius: t.radius,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: c.surfaceAlt,
          borderWidth: 1,
          borderColor: c.border,
        }}
      >
        <Text style={{ fontSize: 34 }}>{value ?? "🙂"}</Text>
      </Pressable>
      <EmojiPicker
        open={open}
        onClose={() => setOpen(false)}
        onEmojiSelected={(e: EmojiType) => {
          onChange(e.emoji);
          setOpen(false);
        }}
      />
    </FieldShell>
  );
}

// ---------------------------------------------------------------------------
// ColorField — reanimated-color-picker, rendered INLINE + expandable (avoids
// the RN-Modal/gesture-root pitfall). Curated swatches lead; the wheel is the
// "more" affordance. Commits live via onCompleteJS.
// ---------------------------------------------------------------------------
const CURATED_COLORS = [
  "#5BC8F5",
  "#1EA7E6",
  "#7BD389",
  "#2ED3A0",
  "#FFB703",
  "#FFD166",
  "#FF8FB1",
  "#FF7A66",
  "#B79CED",
  "#9D8DF1",
  "#4ECDC4",
  "#56CFE1",
];

export function ColorField({
  value,
  onChange,
  label = "Color",
}: {
  value: string;
  onChange: (hex: string) => void;
  label?: string;
}) {
  const t = useThemeTokens();
  const c = t.colors;
  const [expanded, setExpanded] = useState(false);

  return (
    <FieldShell label={label}>
      {/* curated swatch row */}
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: t.spacing(2) }}>
        {CURATED_COLORS.map((hex) => {
          const selected = hex.toLowerCase() === value.toLowerCase();
          return (
            <Pressable
              key={hex}
              onPress={() => onChange(hex)}
              accessibilityRole="button"
              accessibilityLabel={`Color ${hex}`}
              accessibilityState={{ selected }}
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: hex,
                borderWidth: selected ? 3 : 1,
                borderColor: selected ? c.text : c.border,
              }}
            />
          );
        })}
        <Pressable
          onPress={() => setExpanded((v) => !v)}
          accessibilityRole="button"
          accessibilityLabel="More colors"
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: c.surfaceAlt,
            borderWidth: 1,
            borderColor: c.border,
          }}
        >
          <Text style={{ color: c.text, fontSize: 18, fontWeight: "700" }}>
            {expanded ? "−" : "+"}
          </Text>
        </Pressable>
      </View>

      {expanded ? (
        <View
          style={{
            backgroundColor: c.surfaceAlt,
            borderRadius: t.radius,
            padding: t.spacing(3),
            gap: t.spacing(3),
            borderWidth: 1,
            borderColor: c.border,
          }}
        >
          <ColorPicker
            value={value}
            onCompleteJS={({ hex }) => onChange(hex)}
            style={{ gap: t.spacing(3) }}
          >
            <Preview hideInitialColor />
            <Panel1 style={{ borderRadius: t.radius }} />
            <HueSlider />
            <Swatches colors={CURATED_COLORS} />
          </ColorPicker>
        </View>
      ) : null}
    </FieldShell>
  );
}

// ---------------------------------------------------------------------------
// TimeField — @react-native-community/datetimepicker on native; a compact
// hour/minute stepper fallback on web (web is the iteration-only subset).
// `value` is 'HH:mm' (or undefined = no time anchor).
// ---------------------------------------------------------------------------
function parseHHmm(s?: string): { h: number; m: number } {
  if (!s) return { h: 7, m: 0 };
  const [hh, mm] = s.split(":");
  const h = Number.parseInt(hh ?? "7", 10);
  const m = Number.parseInt(mm ?? "0", 10);
  return { h: Number.isFinite(h) ? h : 7, m: Number.isFinite(m) ? m : 0 };
}
function toHHmm(h: number, m: number): string {
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}
function dateFromHHmm(s?: string): Date {
  const { h, m } = parseHHmm(s);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d;
}
export function formatTimeLabel(s?: string): string {
  if (!s) return "Any time";
  const { h, m } = parseHHmm(s);
  const ampm = h < 12 ? "AM" : "PM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
}

export function TimeField({
  value,
  onChange,
  label = "Time",
}: {
  value?: string;
  onChange: (hhmm: string | undefined) => void;
  label?: string;
}) {
  const t = useThemeTokens();
  const c = t.colors;
  const [show, setShow] = useState(false);
  const { h, m } = parseHHmm(value);

  const ValueButton = (
    <Pressable
      onPress={() => setShow((v) => !v)}
      accessibilityRole="button"
      accessibilityLabel="Set time"
      style={{
        paddingVertical: t.spacing(2),
        paddingHorizontal: t.spacing(3),
        borderRadius: t.radius,
        backgroundColor: c.surfaceAlt,
        borderWidth: 1,
        borderColor: c.border,
        alignSelf: "flex-start",
      }}
    >
      <Text style={{ color: c.text, fontFamily: t.type.label.family, fontSize: t.type.bodyLg.size }}>
        {formatTimeLabel(value)}
      </Text>
    </Pressable>
  );

  const onNativeChange = (event: DateTimePickerEvent, date?: Date) => {
    // Android fires a dialog: dismiss closes; 'set' commits. iOS stays inline.
    if (Platform.OS === "android") setShow(false);
    if (event.type === "set" && date) {
      onChange(toHHmm(date.getHours(), date.getMinutes()));
    }
  };

  return (
    <FieldShell label={label}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: t.spacing(2) }}>
        {ValueButton}
        {value ? (
          <Pressable onPress={() => onChange(undefined)} hitSlop={8} accessibilityLabel="Clear time">
            <Text style={{ color: c.textDim, fontSize: t.type.label.size }}>Clear</Text>
          </Pressable>
        ) : null}
      </View>

      {show && Platform.OS !== "web" ? (
        <DateTimePicker
          value={dateFromHHmm(value)}
          mode="time"
          is24Hour={false}
          display={Platform.OS === "ios" ? "spinner" : "default"}
          onChange={onNativeChange}
        />
      ) : null}

      {show && Platform.OS === "web" ? (
        <View style={{ flexDirection: "row", gap: t.spacing(4), marginTop: t.spacing(2) }}>
          <View style={{ alignItems: "center", gap: 4 }}>
            <Text style={{ color: c.textDim, fontSize: t.type.caption.size }}>Hour</Text>
            <Stepper value={h} min={0} max={23} onChange={(nh) => onChange(toHHmm(nh, m))} />
          </View>
          <View style={{ alignItems: "center", gap: 4 }}>
            <Text style={{ color: c.textDim, fontSize: t.type.caption.size }}>Min</Text>
            <Stepper value={m} min={0} max={55} step={5} onChange={(nm) => onChange(toHHmm(h, nm))} />
          </View>
        </View>
      ) : null}
    </FieldShell>
  );
}

// ---------------------------------------------------------------------------
// TimerField — a CURATED visual-transition-timer duration (visual-timers §4 #8).
// Curated-autonomy: a short fixed set (Off/30s/1m/2m/5m/10m), never a free-form
// number entry. A positive value shows a calm depleting bar/wedge on the active
// step in the kid loop; Off (undefined) means no timer. Reusable so a future
// reward/step editor shares it. The timer is EXTERNAL SCAFFOLDING, never coercive.
// ---------------------------------------------------------------------------
export const TIMER_DURATION_OPTIONS: { value: number; label: string }[] = [
  { value: 0, label: "Off" },
  { value: 30, label: "30s" },
  { value: 60, label: "1m" },
  { value: 120, label: "2m" },
  { value: 300, label: "5m" },
  { value: 600, label: "10m" },
];

export function TimerField({
  value,
  onChange,
  label = "Timer for this step",
}: {
  value?: number;
  onChange: (seconds: number | undefined) => void;
  label?: string;
}) {
  const current = typeof value === "number" && value > 0 ? value : 0;
  return (
    <FieldShell label={label}>
      <Segmented<string>
        value={String(current)}
        onChange={(v) => {
          const n = Number(v);
          onChange(Number.isFinite(n) && n > 0 ? n : undefined);
        }}
        options={TIMER_DURATION_OPTIONS.map((o) => ({ value: String(o.value), label: o.label }))}
      />
    </FieldShell>
  );
}

// ---------------------------------------------------------------------------
// DayPicker — 7-day toggle row. Empty array means "every day" (doc 62 §5).
// ---------------------------------------------------------------------------
const DAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];
const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];

export function DayPicker({
  value,
  onChange,
  label = "Days",
}: {
  value: number[];
  onChange: (days: number[]) => void;
  label?: string;
}) {
  const t = useThemeTokens();
  const c = t.colors;
  const everyDay = value.length === 0;
  const selected = new Set(everyDay ? ALL_DAYS : value);

  const toggle = (day: number) => {
    const next = new Set(selected);
    if (next.has(day)) next.delete(day);
    else next.add(day);
    // all 7 selected (or none) collapses to "every day" (empty array)
    if (next.size === 7 || next.size === 0) onChange([]);
    else onChange(ALL_DAYS.filter((d) => next.has(d)));
  };

  return (
    <FieldShell label={`${label}${everyDay ? " · every day" : ""}`}>
      <View style={{ flexDirection: "row", gap: t.spacing(2) }}>
        {DAY_LABELS.map((dl, day) => {
          const on = selected.has(day);
          return (
            <Pressable
              key={day}
              onPress={() => toggle(day)}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              accessibilityLabel={`Day ${day}`}
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: on ? c.primary : c.surfaceAlt,
                borderWidth: 1,
                borderColor: on ? c.primary : c.border,
              }}
            >
              <Text
                style={{
                  color: on ? c.onPrimary : c.textDim,
                  fontFamily: t.type.label.family,
                  fontWeight: "700",
                }}
              >
                {dl}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </FieldShell>
  );
}
