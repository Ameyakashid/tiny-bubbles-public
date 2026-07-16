/**
 * components/parent/ui.tsx — shared parent-area UI primitives (doc 66 §M9).
 *
 * The parent zone is a calm, "designed" settings surface (habit-tracker settings
 * rows/Toggle scaffold + lockin wizard mechanics, re-authored against our token
 * system — NOT copied). Every primitive reads `useThemeTokens()` so the parent
 * area inherits the active child's calm aquatic palette; none branch on raw
 * ageMode (doc 66 §2). These are parent-facing, so light numbers/labels are fine.
 */
import { router } from "expo-router";
import React from "react";
import {
  Pressable,
  ScrollView,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useThemeTokens } from "../../src/theme/useThemeTokens";

export type Tokens = ReturnType<typeof useThemeTokens>;

// ---------------------------------------------------------------------------
// Screen scaffold — header (back + title + optional right action) + body.
// ---------------------------------------------------------------------------
export function ParentScreen({
  title,
  subtitle,
  onBack,
  right,
  scroll = true,
  children,
}: {
  title: string;
  subtitle?: string;
  /** defaults to router.back(); pass null to hide the back affordance */
  onBack?: (() => void) | null;
  right?: React.ReactNode;
  scroll?: boolean;
  children: React.ReactNode;
}) {
  const t = useThemeTokens();
  const c = t.colors;
  const showBack = onBack !== null;
  const back = onBack ?? (() => router.back());

  const body = (
    <View
      style={{
        padding: t.spacing(4),
        gap: t.spacing(3),
        width: "100%",
        maxWidth: t.contentMaxWidth,
        alignSelf: "center",
      }}
    >
      {children}
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.canvas }} edges={["top"]}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: t.spacing(4),
          paddingTop: t.spacing(2),
          paddingBottom: t.spacing(2),
        }}
      >
        {showBack ? (
          <Pressable
            onPress={back}
            accessibilityRole="button"
            accessibilityLabel="Back"
            hitSlop={10}
            style={{ minWidth: 64 }}
          >
            <Text style={{ color: c.primary, fontFamily: t.type.label.family, fontSize: t.type.bodyLg.size }}>
              ‹ Back
            </Text>
          </Pressable>
        ) : (
          <View style={{ minWidth: 64 }} />
        )}
        <Text
          style={{ color: c.text, fontFamily: t.type.h2.family, fontSize: t.type.h2.size, fontWeight: "700" }}
          numberOfLines={1}
        >
          {title}
        </Text>
        <View style={{ minWidth: 64, alignItems: "flex-end" }}>{right}</View>
      </View>
      {subtitle ? (
        <Text
          style={{
            color: c.textDim,
            fontSize: t.type.caption.size,
            paddingHorizontal: t.spacing(4),
            marginTop: -t.spacing(1),
            marginBottom: t.spacing(1),
            maxWidth: t.contentMaxWidth,
            alignSelf: "center",
            width: "100%",
          }}
        >
          {subtitle}
        </Text>
      ) : null}
      {scroll ? (
        <ScrollView contentContainerStyle={{ paddingBottom: t.spacing(10) }}>{body}</ScrollView>
      ) : (
        <View style={{ flex: 1 }}>{body}</View>
      )}
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Card / section container.
// ---------------------------------------------------------------------------
export function Card({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const t = useThemeTokens();
  const c = t.colors;
  return (
    <View
      style={[
        {
          backgroundColor: c.surface,
          borderRadius: t.radius,
          borderWidth: 1,
          borderColor: c.border,
          padding: t.spacing(4),
          gap: t.spacing(3),
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function SectionTitle({ children }: { children: React.ReactNode }) {
  const t = useThemeTokens();
  return (
    <Text
      style={{
        color: t.colors.textDim,
        fontFamily: t.type.label.family,
        fontSize: t.type.caption.size,
        fontWeight: "700",
        textTransform: "uppercase",
        letterSpacing: 0.5,
      }}
    >
      {children}
    </Text>
  );
}

// ---------------------------------------------------------------------------
// Toggle (custom, fully token-driven — avoids platform Switch colors).
// ---------------------------------------------------------------------------
export function Toggle({
  value,
  onValueChange,
  label,
}: {
  value: boolean;
  onValueChange: (next: boolean) => void;
  label?: string;
}) {
  const t = useThemeTokens();
  const c = t.colors;
  return (
    <Pressable
      onPress={() => onValueChange(!value)}
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      accessibilityLabel={label}
      hitSlop={8}
      style={{
        width: 52,
        height: 32,
        borderRadius: 16,
        padding: 3,
        justifyContent: "center",
        backgroundColor: value ? c.primary : c.surfaceSunken,
        alignItems: value ? "flex-end" : "flex-start",
      }}
    >
      <View
        style={{
          width: 26,
          height: 26,
          borderRadius: 13,
          backgroundColor: value ? c.onPrimary : c.surface,
        }}
      />
    </Pressable>
  );
}

/** A labeled settings row with a control on the right (toggle / value / chevron). */
export function SettingRow({
  label,
  hint,
  right,
  onPress,
  icon,
}: {
  label: string;
  hint?: string;
  right?: React.ReactNode;
  onPress?: () => void;
  icon?: string;
}) {
  const t = useThemeTokens();
  const c = t.colors;
  const content = (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: t.spacing(3),
        minHeight: t.touchTargetMin,
        paddingVertical: t.spacing(1),
      }}
    >
      {icon ? <Text style={{ fontSize: 22 }}>{icon}</Text> : null}
      <View style={{ flex: 1 }}>
        <Text style={{ color: c.text, fontFamily: t.type.bodyLg.family, fontSize: t.type.bodyLg.size }}>
          {label}
        </Text>
        {hint ? (
          <Text style={{ color: c.textDim, fontSize: t.type.caption.size, marginTop: 2 }}>{hint}</Text>
        ) : null}
      </View>
      {right}
      {onPress && !right ? (
        <Text style={{ color: c.textDim, fontSize: t.type.bodyLg.size }}>›</Text>
      ) : null}
    </View>
  );
  if (onPress) {
    return (
      <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label}>
        {content}
      </Pressable>
    );
  }
  return content;
}

export function Divider() {
  const t = useThemeTokens();
  return <View style={{ height: 1, backgroundColor: t.colors.separator }} />;
}

// ---------------------------------------------------------------------------
// Stepper — increment/decrement a numeric value (costs, limits, etc.).
// ---------------------------------------------------------------------------
export function Stepper({
  value,
  onChange,
  min = 0,
  max = 999,
  step = 1,
  suffix,
  formatValue,
}: {
  value: number;
  onChange: (next: number) => void;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
  formatValue?: (v: number) => string;
}) {
  const t = useThemeTokens();
  const c = t.colors;
  const clamp = (n: number) => Math.max(min, Math.min(max, n));
  const display = formatValue ? formatValue(value) : `${value}${suffix ? ` ${suffix}` : ""}`;
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: t.spacing(2) }}>
      <RoundBtn label="−" onPress={() => onChange(clamp(value - step))} disabled={value <= min} />
      <Text
        style={{
          minWidth: 72,
          textAlign: "center",
          color: c.text,
          fontFamily: t.type.token.family,
          fontSize: t.type.bodyLg.size,
          fontWeight: "700",
        }}
      >
        {display}
      </Text>
      <RoundBtn label="+" onPress={() => onChange(clamp(value + step))} disabled={value >= max} />
    </View>
  );
}

function RoundBtn({
  label,
  onPress,
  disabled,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  const t = useThemeTokens();
  const c = t.colors;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label === "+" ? "Increase" : "Decrease"}
      hitSlop={6}
      style={{
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: disabled ? c.surfaceSunken : c.surfaceAlt,
        borderWidth: 1,
        borderColor: c.border,
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <Text style={{ color: c.text, fontSize: 22, fontWeight: "700" }}>{label}</Text>
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// Segmented control + selectable chips.
// ---------------------------------------------------------------------------
export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  const t = useThemeTokens();
  const c = t.colors;
  return (
    <View
      style={{
        flexDirection: "row",
        backgroundColor: c.surfaceSunken,
        borderRadius: t.radius,
        padding: 4,
        gap: 4,
      }}
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            style={{
              flex: 1,
              paddingVertical: t.spacing(2),
              borderRadius: t.radius - 4,
              alignItems: "center",
              backgroundColor: active ? c.surface : "transparent",
              borderWidth: active ? 1 : 0,
              borderColor: c.border,
            }}
          >
            <Text
              style={{
                color: active ? c.primary : c.textDim,
                fontFamily: t.type.label.family,
                fontSize: t.type.label.size,
                fontWeight: active ? "700" : "500",
              }}
            >
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Chip({
  label,
  selected,
  onPress,
  emoji,
}: {
  label: string;
  selected?: boolean;
  onPress: () => void;
  emoji?: string;
}) {
  const t = useThemeTokens();
  const c = t.colors;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingVertical: t.spacing(2),
        paddingHorizontal: t.spacing(3),
        borderRadius: 999,
        backgroundColor: selected ? c.primary : c.surfaceAlt,
        borderWidth: 1,
        borderColor: selected ? c.primary : c.border,
      }}
    >
      {emoji ? <Text style={{ fontSize: 16 }}>{emoji}</Text> : null}
      <Text
        style={{
          color: selected ? c.onPrimary : c.text,
          fontFamily: t.type.label.family,
          fontSize: t.type.label.size,
          fontWeight: selected ? "700" : "500",
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// Buttons.
// ---------------------------------------------------------------------------
export function PrimaryButton({
  label,
  onPress,
  disabled,
  tone = "primary",
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  tone?: "primary" | "neutral" | "danger";
}) {
  const t = useThemeTokens();
  const c = t.colors;
  const bg = tone === "danger" ? c.gentleAlert : tone === "neutral" ? c.surfaceAlt : c.primary;
  const fg = tone === "neutral" ? c.text : c.onPrimary;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={{
        minHeight: 52,
        borderRadius: t.radius,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: t.spacing(4),
        backgroundColor: bg,
        opacity: disabled ? 0.45 : 1,
        borderWidth: tone === "neutral" ? 1 : 0,
        borderColor: c.border,
      }}
    >
      <Text style={{ color: fg, fontFamily: t.type.label.family, fontSize: t.type.bodyLg.size, fontWeight: "700" }}>
        {label}
      </Text>
    </Pressable>
  );
}

export function TextButton({
  label,
  onPress,
  tone = "primary",
}: {
  label: string;
  onPress: () => void;
  tone?: "primary" | "danger" | "dim";
}) {
  const t = useThemeTokens();
  const c = t.colors;
  const color = tone === "danger" ? c.gentleAlert : tone === "dim" ? c.textDim : c.primary;
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} hitSlop={8}>
      <Text style={{ color, fontFamily: t.type.label.family, fontSize: t.type.label.size, fontWeight: "700" }}>
        {label}
      </Text>
    </Pressable>
  );
}

/** A small inline note (used for anti-shame / privacy explanations). */
export function Note({ children }: { children: React.ReactNode }) {
  const t = useThemeTokens();
  return (
    <Text style={{ color: t.colors.textDim, fontSize: t.type.caption.size, lineHeight: t.type.caption.lineHeight }}>
      {children}
    </Text>
  );
}
