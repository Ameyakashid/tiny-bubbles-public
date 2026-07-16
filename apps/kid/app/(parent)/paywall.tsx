/**
 * app/(parent)/paywall.tsx — the (mock) premium paywall (doc 66 §M12).
 *
 * Reachable ONLY through the parent-set PIN gate (doc 66 §1b.13): every route in
 * tells the gate `?mode=purchase`, which forwards here on success. A child never
 * sees this screen (doc 66 §5.7).
 *
 * Honest by construction (doc 66 §M12): a clearly-stated 7-day free trial with a
 * REAL end-date, one-tap cancel, a visible pay-what-you-can / hardship plan, and
 * NO countdown, NO urgency, NO anchor pricing. The over-claiming grep gate (M15)
 * covers this copy — no medical/health claims of any kind; benefits are framed
 * only as building routines, never as therapy and never as a screen-time push.
 *
 * NO real processor / NO network — `src/services/purchases.ts` is the mock seam.
 */
import { router } from "expo-router";
import { format } from "date-fns";
import React, { useState } from "react";
import { Pressable, Text, View } from "react-native";

import {
  mockCancel,
  mockPurchase,
  PLANS,
  PREMIUM_TRIAL_DAYS,
  trialEndsAtFor,
  type PlanId,
} from "../../src/services/purchases";
import { useEntitlements, useIsPremium } from "../../src/services/entitlements";
import { now } from "../../src/state/ids";
import { useThemeTokens } from "../../src/theme/useThemeTokens";

import {
  Card,
  Note,
  ParentScreen,
  PrimaryButton,
  SectionTitle,
  TextButton,
} from "../../components/parent/ui";

/** What Plus ADDS — additive only, no clinical claims (doc 66 §1b.15). */
const PLUS_BENEFITS: { emoji: string; text: string }[] = [
  { emoji: "🧒", text: "Routines for the whole family — add more than one child." },
  { emoji: "🎁", text: "A fuller reward menu for building everyday routines." },
  { emoji: "🫧", text: "Extra companion colors, finishes and scenes to collect." },
  { emoji: "🌙", text: "A pack of calm & focus soundscapes for wind-downs and focus time." },
  { emoji: "📊", text: "Gentle on-device insights — they never leave this device." },
];

function fmtDate(ms: number): string {
  return format(new Date(ms), "MMMM d, yyyy");
}

export default function PaywallScreen() {
  const t = useThemeTokens();
  const c = t.colors;

  const entitlement = useEntitlements();
  const premium = useIsPremium();
  const [plan, setPlan] = useState<PlanId>("annual");

  // Honest trial end-date: if already on a trial show the real stored date,
  // otherwise PREVIEW the date a purchase made now would produce.
  const previewEnd = trialEndsAtFor(now());
  const activeEnd = entitlement.trialEndsAt;

  const subscribe = () => {
    mockPurchase(plan);
    // stay on-screen so the parent sees the confirmed status + cancel control.
  };

  const cancel = () => {
    mockCancel();
  };

  return (
    <ParentScreen title="Tiny Bubbles Plus" subtitle="Free always runs the whole routine. Plus just adds extras.">
      {/* current status */}
      {premium ? (
        <Card>
          <SectionTitle>You're on Plus</SectionTitle>
          <Text style={{ color: c.text, fontFamily: t.type.bodyLg.family, fontSize: t.type.bodyLg.size }}>
            Thanks for supporting the app. 🫧
          </Text>
          {activeEnd ? (
            <Note>Your free trial runs through {fmtDate(activeEnd)}. We'll remind you before it ends — no surprise charge.</Note>
          ) : null}
          <Note>
            Cancelling keeps everything your child has unlocked. Nothing is ever removed or hidden.
          </Note>
          <View style={{ alignItems: "flex-start", marginTop: t.spacing(1) }}>
            <TextButton label="Cancel Plus" tone="dim" onPress={cancel} />
          </View>
        </Card>
      ) : null}

      {/* what plus adds */}
      <Card>
        <SectionTitle>What Plus adds</SectionTitle>
        {PLUS_BENEFITS.map((b) => (
          <View key={b.text} style={{ flexDirection: "row", gap: t.spacing(3), alignItems: "flex-start" }}>
            <Text style={{ fontSize: 20 }}>{b.emoji}</Text>
            <Text style={{ flex: 1, color: c.text, fontSize: t.type.body.size, lineHeight: t.type.body.lineHeight }}>
              {b.text}
            </Text>
          </View>
        ))}
        <Note>
          Plus helps you build routines. It is not therapy and makes no health claims.
        </Note>
      </Card>

      {/* plan picker */}
      {!premium ? (
        <Card>
          <SectionTitle>Choose a plan</SectionTitle>
          {PLANS.map((p) => {
            const selected = p.id === plan;
            return (
              <Pressable
                key={p.id}
                onPress={() => setPlan(p.id)}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                accessibilityLabel={`${p.title}, ${p.priceShown}`}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: t.spacing(3),
                  borderRadius: t.radius,
                  borderWidth: selected ? 2 : 1,
                  borderColor: selected ? c.primary : c.border,
                  backgroundColor: selected ? c.surfaceAlt : c.surface,
                  padding: t.spacing(3),
                }}
              >
                <View
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 11,
                    borderWidth: 2,
                    borderColor: selected ? c.primary : c.border,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {selected ? (
                    <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: c.primary }} />
                  ) : null}
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: t.spacing(2) }}>
                    <Text style={{ color: c.text, fontFamily: t.type.bodyLg.family, fontSize: t.type.bodyLg.size, fontWeight: "700" }}>
                      {p.title}
                    </Text>
                    {p.hardship ? (
                      <View style={{ backgroundColor: c.surfaceSunken, borderRadius: 999, paddingHorizontal: t.spacing(2), paddingVertical: 2 }}>
                        <Text style={{ color: c.textDim, fontSize: t.type.caption.size, fontWeight: "700" }}>Hardship</Text>
                      </View>
                    ) : null}
                  </View>
                  <Text style={{ color: c.textDim, fontSize: t.type.caption.size, marginTop: 2 }}>{p.cadence}</Text>
                </View>
                <Text style={{ color: c.text, fontFamily: t.type.token.family, fontSize: t.type.body.size, fontWeight: "700" }}>
                  {p.priceShown}
                </Text>
              </Pressable>
            );
          })}

          {/* honest trial terms — real end-date, no countdown */}
          <View style={{ backgroundColor: c.surfaceSunken, borderRadius: t.radius, padding: t.spacing(3), gap: t.spacing(1) }}>
            <Text style={{ color: c.text, fontFamily: t.type.label.family, fontSize: t.type.label.size, fontWeight: "700" }}>
              {PREMIUM_TRIAL_DAYS}-day free trial
            </Text>
            <Note>
              Start today and your trial runs through {fmtDate(previewEnd)}. We'll remind you before it ends — cancel any time in one tap and you won't be charged.
            </Note>
          </View>

          <PrimaryButton label="Start free trial" onPress={subscribe} />
          <Note>
            Pay-what-you-can means you can use Plus even if the price doesn't fit right now. Money should never be a barrier to calmer routines.
          </Note>
        </Card>
      ) : null}

      <View style={{ alignItems: "center", marginTop: t.spacing(1) }}>
        <TextButton label="Back to grown-ups" onPress={() => router.replace("/(parent)/dashboard")} />
      </View>
    </ParentScreen>
  );
}
