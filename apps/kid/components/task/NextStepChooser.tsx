/**
 * components/task/NextStepChooser.tsx — the young "What next?" curated chooser
 * (child-autonomy §2.3, "be the boss" Pillar C for young mode).
 *
 * Young mode (`multiStepVisible === false`) shows ONE focal step and has no order
 * autonomy. This strip gives a young child a CURATED, low-stakes choice: up to
 * `maxChoices` (=3) upcoming steps as tappable emoji + color bubbles, each with a
 * spoken label. Tapping one moves it to the front of the run (via the runner's
 * `chooseNextStep`), so it becomes the focal step immediately.
 *
 * Anti-shame + curated-autonomy rules that apply here (§6):
 *   - CURATED, never open: the strip shows the child's OWN remaining steps in a
 *     fixed order, capped at `maxChoices` — no ranking model, no "recommended".
 *   - No wrong choice: ignoring the strip is fine (the default next step proceeds).
 *   - No raw ageMode: the runner decides to render this from `caps.multiStepVisible`
 *     + `autonomy.canReorderSteps`; this component takes resolved props only.
 *   - Static bubbles (no drift/parallax) — nothing to honor beyond the calm palette.
 */
import React from "react";
import { Pressable, Text, View } from "react-native";

import type { VisualLabel } from "../../src/domain/types";
import { playCue } from "../../src/services/playCue";
import { useThemeTokens } from "../../src/theme/useThemeTokens";
import SpokenLabel from "../ui/SpokenLabel";

/** Minimal step shape the chooser needs (id + its triple-coded visual label). */
export interface ChooserStep {
  id: string;
  label: VisualLabel;
}

export interface NextStepChooserProps {
  /** the not-yet-resolved steps of the run (already in run order); includes the current focal step */
  steps: ChooserStep[];
  /** the current focal step id (rendered as selected; tapping it is a no-op) */
  currentId: string | null;
  /** curated cap (young = 3) — the strip never shows more than this */
  maxChoices: number;
  /** resolved strip title (reuses `task.next`, e.g. "What's next?") */
  title: string;
  /** master TTS toggle */
  ttsEnabled?: boolean;
  /** move the chosen step to the front of the uncompleted run portion */
  onChoose: (taskId: string) => void;
}

export default function NextStepChooser({
  steps,
  currentId,
  maxChoices,
  title,
  ttsEnabled,
  onChoose,
}: NextStepChooserProps) {
  const t = useThemeTokens();
  const c = t.colors;

  // Curated cap — never an open list (choice-overload guardrail, §6).
  const shown = steps.slice(0, Math.max(0, maxChoices));
  if (shown.length < 2) return null; // need a real choice to offer one

  return (
    <View style={{ alignItems: "center", gap: t.spacing(2), width: "100%" }}>
      <Text
        style={{
          color: c.textDim,
          fontFamily: t.type.label.family,
          fontSize: t.type.label.size,
          fontWeight: t.type.label.weight,
        }}
      >
        {title}
      </Text>
      <View
        style={{ flexDirection: "row", flexWrap: "wrap", gap: t.spacing(2), justifyContent: "center" }}
      >
        {shown.map((step) => {
          const selected = step.id === currentId;
          const glyph = step.label.emoji ?? step.label.icon ?? "🫧";
          return (
            <Pressable
              key={step.id}
              onPress={() => {
                if (!selected) {
                  playCue("tap.soft"); // a tiny neutral tick — never a scold
                  onChoose(step.id);
                }
              }}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={step.label.spokenLabel}
              hitSlop={6}
              style={{
                alignItems: "center",
                gap: 4,
                paddingVertical: t.spacing(1),
                paddingHorizontal: t.spacing(1),
                borderRadius: t.radius,
                minWidth: 72,
              }}
            >
              <View
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 999,
                  backgroundColor: (step.label.color ?? c.primary) + "22",
                  borderWidth: selected ? 3 : 1,
                  borderColor: selected ? c.primary : step.label.color ?? c.border,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text style={{ fontSize: 26 }}>{glyph}</Text>
              </View>
              <SpokenLabel
                text={step.label.text ?? step.label.spokenLabel}
                enabled={ttsEnabled}
                forceSpeakOnPress
                variant="caption"
                style={{ color: c.textDim, textAlign: "center", maxWidth: 84 }}
              />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
