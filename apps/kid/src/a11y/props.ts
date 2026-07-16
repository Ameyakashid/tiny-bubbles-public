/**
 * src/a11y/props.ts — pure builders for consistent accessibility prop bundles (§5.8).
 *
 * Keeps every interactive element's a11y wiring terse + uniform: a resolved
 * `accessibilityLabel` (never a raw literal at the call site — pass a resolved
 * string), the right `accessibilityRole`, and `accessibilityState`/`Hint` where
 * they apply. Decorative visuals are hidden from the reader so it hears one warm
 * line, not 18 bubble nodes (§2.1). Pure — no React/RN runtime, just prop objects
 * typed against RN's accessibility props.
 */
import type { AccessibilityProps, AccessibilityRole } from "react-native";

/** A tappable button (Pressable/TouchableOpacity with an action). */
export function buttonA11y(
  label: string,
  opts: { hint?: string; disabled?: boolean; selected?: boolean } = {},
): AccessibilityProps {
  return {
    accessible: true,
    accessibilityRole: "button",
    accessibilityLabel: label,
    ...(opts.hint ? { accessibilityHint: opts.hint } : {}),
    accessibilityState: { disabled: !!opts.disabled, selected: !!opts.selected },
  };
}

/** A boolean toggle (RN `Switch` / a custom switch). */
export function toggleA11y(label: string, value: boolean): AccessibilityProps {
  return {
    accessible: true,
    accessibilityRole: "switch",
    accessibilityLabel: label,
    accessibilityState: { checked: value },
  };
}

/** A selectable option (segment / chip / tab-like control). */
export function selectedA11y(label: string, selected: boolean): AccessibilityProps {
  return {
    accessible: true,
    accessibilityRole: "button",
    accessibilityLabel: label,
    accessibilityState: { selected },
  };
}

/**
 * Purely decorative subtree — hidden from the reader on BOTH platforms so it never
 * steals focus or narrates (§2.1: confetti, gradients, buddy SVG internals).
 */
export function decorative(): AccessibilityProps {
  return {
    accessibilityElementsHidden: true, // iOS
    importantForAccessibility: "no-hide-descendants", // Android
  };
}

/**
 * A live value read-out (token counter). `accessibilityLiveRegion="polite"` speaks
 * the change on Android without stealing focus; `accessibilityValue.text` reflects
 * the current value for both platforms.
 */
export function liveValue(text: string): AccessibilityProps {
  return {
    accessibilityLiveRegion: "polite",
    accessibilityValue: { text },
  };
}

/** A generic labelled element with an explicit role (e.g. an image/summary node). */
export function labelledA11y(label: string, role: AccessibilityRole): AccessibilityProps {
  return {
    accessible: true,
    accessibilityRole: role,
    accessibilityLabel: label,
  };
}
