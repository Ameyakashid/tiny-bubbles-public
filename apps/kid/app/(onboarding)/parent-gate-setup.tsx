/**
 * app/(onboarding)/parent-gate-setup.tsx — STEP 2: set the parent PIN
 * (doc 66 §M11, streamlined per doc 70 §F2).
 *
 * PIN-only, on purpose: the low-stakes ENTRY challenge defaults to `math`
 * silently (already editable later in Settings), so onboarding asks for just one
 * thing — a 4–8 digit PIN, typed twice. Continue auto-enables the moment the PIN
 * and its confirmation match; the salted hash is written on Continue (never
 * mid-screen). This MUST run before the child can reach (kid): `done.tsx` is the
 * only path in, and it is reachable only after this step sets
 * `parentGateConfigured = true` (gate-before-child invariant).
 */
import { router, type Href } from "expo-router";
import React, { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";

import { hashPin, isValidPin } from "../../src/services/parentGate";
import { useSettingsStore } from "../../src/state/settingsStore";
import { useThemeTokens } from "../../src/theme/useThemeTokens";

import OnboardingShell from "../../components/onboarding/OnboardingShell";
import { Card, Note, SectionTitle } from "../../components/parent/ui";

export default function ParentGateSetup() {
  const t = useThemeTokens();
  const c = t.colors;

  const gate = useSettingsStore((s) => s.parentSettings.parentGate);
  const configureParentGate = useSettingsStore((s) => s.configureParentGate);
  const setParentGateConfigured = useSettingsStore((s) => s.setParentGateConfigured);
  const setOnboardingStep = useSettingsStore((s) => s.setOnboardingStep);

  const [pin, setPin] = useState("");
  const [confirm, setConfirm] = useState("");
  const [reveal, setReveal] = useState(false);
  const [saving, setSaving] = useState(false);

  // A PIN may already exist (resume, or Back after setting it): allow keeping it.
  const pinAlreadySet = Boolean(gate.pinHash);

  const onlyDigits = (v: string) => v.replace(/[^0-9]/g, "").slice(0, 8);

  const pinValid = isValidPin(pin);
  const matches = pin.length > 0 && pin === confirm;
  const newPinReady = pinValid && matches;
  // Continue is enabled with a valid new+confirmed PIN, or by keeping an existing
  // one (nothing typed).
  const canContinue = newPinReady || (pinAlreadySet && pin.length === 0);

  const advance = async () => {
    if (saving || !canContinue) return;
    setSaving(true);
    try {
      if (newPinReady) {
        const pinHash = await hashPin(pin);
        // Entry challenge stays whatever it is (default `math`); only set the PIN.
        configureParentGate({ ...gate, pinHash });
      }
      setParentGateConfigured(true);
      setOnboardingStep("child_setup");
      router.push("/(onboarding)/child-setup" as Href);
    } finally {
      setSaving(false);
    }
  };

  const inputStyle = {
    color: c.text,
    fontSize: t.type.bodyLg.size,
    letterSpacing: reveal ? 2 : 6,
    backgroundColor: c.surfaceAlt,
    borderRadius: t.radius,
    borderWidth: 1,
    borderColor: c.border,
    paddingVertical: t.spacing(3),
    paddingHorizontal: t.spacing(3),
  } as const;

  return (
    <OnboardingShell
      step="parent_gate_setup"
      voiceSlot="gate"
      title="Set a grown-up PIN"
      subtitle="One 4–8 digit PIN keeps settings and purchases out of little hands."
      speech="Set a grown-up PIN. It keeps settings and purchases out of little hands."
      muteAutoSpeak
      primaryLabel={saving ? "Saving…" : "Continue"}
      primaryDisabled={!canContinue || saving}
      onPrimary={advance}
    >
      <Card>
        <SectionTitle>Grown-up PIN {pinAlreadySet && pin.length === 0 ? "· set ✓" : "· required"}</SectionTitle>
        <Note>
          Stored only as a scrambled hash on this device — never as the digits you
          type. You’ll enter it before any purchase.
        </Note>

        <TextInput
          value={pin}
          onChangeText={(v) => setPin(onlyDigits(v))}
          keyboardType="number-pad"
          secureTextEntry={!reveal}
          placeholder={pinAlreadySet ? "Enter a new PIN (optional)" : "Choose a PIN"}
          placeholderTextColor={c.textDim}
          accessibilityLabel="Grown-up PIN"
          style={inputStyle}
        />

        <TextInput
          value={confirm}
          onChangeText={(v) => setConfirm(onlyDigits(v))}
          keyboardType="number-pad"
          secureTextEntry={!reveal}
          placeholder="Type it again to confirm"
          placeholderTextColor={c.textDim}
          accessibilityLabel="Confirm PIN"
          editable={pin.length > 0}
          style={{ ...inputStyle, opacity: pin.length > 0 ? 1 : 0.5 }}
        />

        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <Pressable
            onPress={() => setReveal((v) => !v)}
            accessibilityRole="button"
            accessibilityLabel={reveal ? "Hide PIN" : "Show PIN"}
          >
            <Text style={{ color: c.primary, fontSize: t.type.caption.size, fontWeight: "700" }}>
              {reveal ? "Hide" : "Show"} PIN
            </Text>
          </Pressable>

          {pin.length > 0 && !pinValid ? (
            <Text style={{ color: c.gentleAlert, fontSize: t.type.caption.size }}>Use 4–8 digits.</Text>
          ) : pin.length > 0 && confirm.length > 0 && !matches ? (
            <Text style={{ color: c.gentleAlert, fontSize: t.type.caption.size }}>PINs don’t match yet.</Text>
          ) : newPinReady ? (
            <Text style={{ color: c.textDim, fontSize: t.type.caption.size }}>Looks good ✓</Text>
          ) : null}
        </View>

        {pinAlreadySet && pin.length === 0 ? (
          <Note>Your PIN is already set — leave these blank to keep it, or type a new one.</Note>
        ) : null}
      </Card>
    </OnboardingShell>
  );
}
