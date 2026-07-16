/**
 * app/(gate)/parental-gate.tsx — the parental gate (doc 63 Feature 10, doc 66
 * §M9 / §1b.13).
 *
 * Low-stakes parent entry (dashboard/settings) uses a randomized arithmetic
 * challenge or a timed long-press — the App-Store "parental gate" baseline a
 * 4-7yo can't pass. The PURCHASE route (`?mode=purchase`) ALWAYS requires the
 * parent-set PIN — never arithmetic/long-press (doc 66 §1b.13). No biometric is
 * required; everything degrades gracefully and works offline.
 *
 * Passing sets the in-memory `parentUnlocked` flag (sessionStore) — cleared on
 * background by the root layout — and routes into `(parent)`. The (parent) layout
 * guard bounces anyone who lands there without unlocking.
 */
import { router, useLocalSearchParams, type Href } from "expo-router";
import React, { useMemo, useRef, useState } from "react";
import {
  Animated,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  assertProductionGateMode,
  checkArithmetic,
  effectiveGateMode,
  isValidPin,
  LONG_PRESS_MS,
  makeArithmeticChallenge,
  verifyPin,
} from "../../src/services/parentGate";
import { useSessionStore } from "../../src/state/sessionStore";
import { useSettingsStore } from "../../src/state/settingsStore";
import { useThemeTokens } from "../../src/theme/useThemeTokens";

type Challenge = "pin" | "math" | "longpress" | "pin-missing";

export default function ParentalGate() {
  const t = useThemeTokens();
  const c = t.colors;
  const params = useLocalSearchParams<{ mode?: string; next?: string }>();
  const unlockParent = useSessionStore((s) => s.unlockParent);
  const grantSensitive = useSessionStore((s) => s.grantSensitive);
  const gate = useSettingsStore((s) => s.parentSettings.parentGate);

  const purchase = params.mode === "purchase";
  // `sensitive` (backup/restore/delete-all) shares the PURCHASE PIN posture: it
  // ALWAYS demands the parent PIN, never the math/long-press entry challenge —
  // a child who passes the entry challenge must NOT be able to move or destroy the
  // family dataset (clinician-reporting §2.3). On a correct PIN it stamps the
  // one-shot sensitive grant the caller consumes.
  const sensitive = params.mode === "sensitive";
  const requiresPin = purchase || sensitive;
  const hasPin = Boolean(gate.pinHash);

  const challenge: Challenge = useMemo(() => {
    // 'none' is dev-only and must never ship as a no-op gate (doc 66 §1b.8):
    // fail fast in production, and coerce to a real low-stakes challenge here.
    assertProductionGateMode(gate.mode);
    const mode = effectiveGateMode(gate.mode);
    // The PURCHASE + SENSITIVE routes ALWAYS require the PIN.
    if (requiresPin || mode === "pin") {
      return hasPin ? "pin" : requiresPin ? "pin-missing" : "math";
    }
    if (mode === "longpress") return "longpress";
    return "math";
  }, [requiresPin, gate.mode, hasPin]);

  const pass = (toSettings = false) => {
    unlockParent();
    // Stamp the one-shot grant so the caller runs its pending sensitive action.
    if (sensitive) grantSensitive();
    const fallback: Href = "/(parent)";
    const next =
      typeof params.next === "string" && params.next.startsWith("/")
        ? (params.next as Href)
        : fallback;
    router.replace(toSettings ? ("/(parent)/settings" as Href) : next);
  };

  const cancel = () => router.replace("/(kid)" as Href);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.canvas }}>
      <View style={{ flex: 1, justifyContent: "center", padding: t.spacing(6), gap: t.spacing(5) }}>
        <View style={{ alignItems: "center", gap: t.spacing(2) }}>
          <Text style={{ fontSize: 44 }}>{requiresPin ? "🔒" : "🧑‍🦰"}</Text>
          <Text style={{ color: c.text, fontFamily: t.type.h1.family, fontSize: t.type.h1.size, fontWeight: "700", textAlign: "center" }}>
            Just for grown-ups
          </Text>
          <Text style={{ color: c.textDim, fontSize: t.type.body.size, textAlign: "center" }}>
            {sensitive
              ? "Enter your PIN — this moves or clears your family's data."
              : purchase
                ? "Enter your PIN to continue to purchases."
                : "Quick check to keep this area parent-only."}
          </Text>
        </View>

        {challenge === "pin" ? (
          <PinChallenge pinHash={gate.pinHash} onPass={() => pass()} />
        ) : challenge === "pin-missing" ? (
          <PinMissing onSolve={() => pass(true)} />
        ) : challenge === "longpress" ? (
          <LongPressChallenge onPass={() => pass()} />
        ) : (
          <MathChallenge onPass={() => pass()} />
        )}

        <Pressable onPress={cancel} accessibilityRole="button" hitSlop={8} style={{ alignSelf: "center", paddingVertical: t.spacing(2) }}>
          <Text style={{ color: c.textDim, fontSize: t.type.label.size }}>Not now</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// PIN challenge — verify against the stored salted hash (async).
// ---------------------------------------------------------------------------
function PinChallenge({ pinHash, onPass }: { pinHash?: string; onPass: () => void }) {
  const t = useThemeTokens();
  const c = t.colors;
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);

  const submit = async () => {
    const ok = await verifyPin(pin, pinHash);
    if (ok) onPass();
    else {
      setError(true);
      setPin("");
    }
  };

  return (
    <View style={{ gap: t.spacing(3) }}>
      <TextInput
        value={pin}
        onChangeText={(v) => {
          setError(false);
          setPin(v.replace(/[^0-9]/g, "").slice(0, 8));
        }}
        keyboardType="number-pad"
        secureTextEntry
        placeholder="••••"
        placeholderTextColor={c.textDim}
        accessibilityLabel="PIN"
        onSubmitEditing={submit}
        style={{
          fontSize: 28,
          letterSpacing: 8,
          textAlign: "center",
          color: c.text,
          backgroundColor: c.surface,
          borderRadius: t.radius,
          borderWidth: 1,
          borderColor: error ? c.gentleAlert : c.border,
          paddingVertical: t.spacing(3),
        }}
      />
      {error ? (
        <Text style={{ color: c.gentleAlert, textAlign: "center", fontSize: t.type.caption.size }}>
          That PIN didn’t match. Try again.
        </Text>
      ) : null}
      <GateButton label="Enter" disabled={pin.length < 4} onPress={submit} />
    </View>
  );
}

function PinMissing({ onSolve }: { onSolve: () => void }) {
  const t = useThemeTokens();
  const c = t.colors;
  return (
    <View style={{ gap: t.spacing(3) }}>
      <Text style={{ color: c.textDim, fontSize: t.type.body.size, textAlign: "center" }}>
        No purchase PIN is set yet. Solve this to open Settings and create one.
      </Text>
      <MathChallenge onPass={onSolve} />
    </View>
  );
}

// ---------------------------------------------------------------------------
// Arithmetic challenge.
// ---------------------------------------------------------------------------
function MathChallenge({ onPass }: { onPass: () => void }) {
  const t = useThemeTokens();
  const c = t.colors;
  const [challenge, setChallenge] = useState(() => makeArithmeticChallenge());
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState(false);

  const submit = () => {
    if (checkArithmetic(challenge, answer)) {
      onPass();
    } else {
      setError(true);
      setAnswer("");
      setChallenge(makeArithmeticChallenge());
    }
  };

  return (
    <View style={{ gap: t.spacing(3) }}>
      <Text style={{ color: c.text, fontFamily: t.type.display.family, fontSize: t.type.display.size, fontWeight: "700", textAlign: "center" }}>
        {challenge.prompt} = ?
      </Text>
      <TextInput
        value={answer}
        onChangeText={(v) => {
          setError(false);
          setAnswer(v.replace(/[^0-9]/g, "").slice(0, 4));
        }}
        keyboardType="number-pad"
        placeholder="?"
        placeholderTextColor={c.textDim}
        accessibilityLabel="Answer"
        onSubmitEditing={submit}
        style={{
          fontSize: 28,
          textAlign: "center",
          color: c.text,
          backgroundColor: c.surface,
          borderRadius: t.radius,
          borderWidth: 1,
          borderColor: error ? c.gentleAlert : c.border,
          paddingVertical: t.spacing(3),
        }}
      />
      {error ? (
        <Text style={{ color: c.gentleAlert, textAlign: "center", fontSize: t.type.caption.size }}>
          Not quite — here’s a new one.
        </Text>
      ) : null}
      <GateButton label="Check" disabled={answer.length === 0} onPress={submit} />
    </View>
  );
}

// ---------------------------------------------------------------------------
// Long-press challenge — hold for LONG_PRESS_MS.
// ---------------------------------------------------------------------------
function LongPressChallenge({ onPass }: { onPass: () => void }) {
  const t = useThemeTokens();
  const c = t.colors;
  const [holding, setHolding] = useState(false);
  const progress = useRef(new Animated.Value(0)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const start = () => {
    setHolding(true);
    progress.setValue(0);
    Animated.timing(progress, { toValue: 1, duration: LONG_PRESS_MS, useNativeDriver: false }).start();
    timer.current = setTimeout(onPass, LONG_PRESS_MS);
  };
  const stop = () => {
    setHolding(false);
    if (timer.current) clearTimeout(timer.current);
    Animated.timing(progress, { toValue: 0, duration: 160, useNativeDriver: false }).start();
  };

  const width = progress.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] });

  return (
    <View style={{ gap: t.spacing(2) }}>
      <Pressable
        onPressIn={start}
        onPressOut={stop}
        accessibilityRole="button"
        accessibilityLabel="Press and hold for three seconds"
        style={{
          minHeight: 96,
          borderRadius: t.radius,
          backgroundColor: c.primary,
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
        }}
      >
        <Animated.View style={{ position: "absolute", left: 0, top: 0, bottom: 0, width, backgroundColor: c.primaryDeep }} />
        <Text style={{ color: c.onPrimary, fontFamily: t.type.label.family, fontSize: t.type.bodyLg.size, fontWeight: "700" }}>
          {holding ? "Keep holding…" : "Press & hold (3s)"}
        </Text>
      </Pressable>
    </View>
  );
}

// ---------------------------------------------------------------------------
function GateButton({ label, onPress, disabled }: { label: string; onPress: () => void; disabled?: boolean }) {
  const t = useThemeTokens();
  const c = t.colors;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={{
        minHeight: 52,
        borderRadius: t.radius,
        backgroundColor: c.primary,
        alignItems: "center",
        justifyContent: "center",
        opacity: disabled ? 0.45 : 1,
      }}
    >
      <Text style={{ color: c.onPrimary, fontFamily: t.type.label.family, fontSize: t.type.bodyLg.size, fontWeight: "700" }}>
        {label}
      </Text>
    </Pressable>
  );
}
