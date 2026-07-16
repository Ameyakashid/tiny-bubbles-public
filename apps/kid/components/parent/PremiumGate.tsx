/**
 * components/parent/PremiumGate.tsx — gates NEW unlocks ONLY (doc 66 §M12,
 * §1b.11). PARENT-FACING ONLY — a child must never see a paywall (doc 66 §5.7),
 * so this component is used exclusively inside the PIN-gated `(parent)` area.
 *
 * HARD RULE (doc 66 §1b.11): this NEVER removes, hides, unequips, greys, or
 * alters anything the child already owns or sees. When the acquisition quota is
 * reached it swaps the ADD affordance for a calm upsell — existing items are
 * rendered by their own screens and are completely untouched here.
 *
 * Usage:
 *   <PremiumGate feature="multiChild" currentCount={children.length}>
 *     <AddChildButton />          // rendered only while under the free ceiling
 *   </PremiumGate>
 *
 * When blocked it renders `locked` (or a default gentle upsell row that routes to
 * the paywall through the parent-set PIN gate).
 */
import { router, type Href } from "expo-router";
import React from "react";
import { Pressable, Text, View } from "react-native";

import {
  canAddMore,
  type FeatureKey,
  isFeatureUnlocked,
  useEntitlements,
} from "../../src/services/entitlements";
import { useThemeTokens } from "../../src/theme/useThemeTokens";

/**
 * Route to the paywall — ALWAYS through the purchase PIN challenge (doc 66
 * §1b.13). Even from inside the unlocked parent area, the purchase route demands
 * the parent-set PIN. The gate forwards to the paywall on success.
 */
export function goToPaywall(): void {
  router.push(
    "/(gate)/parental-gate?mode=purchase&next=/(parent)/paywall" as Href,
  );
}

const COUNT_FEATURES = [
  "multiChild",
  "rewardMenuSize",
  "companionThemes",
  "ifThenPlans",
] as const;
type CountFeature = (typeof COUNT_FEATURES)[number];

export interface PremiumGateProps {
  feature: FeatureKey;
  /** for counted features: how many of the thing already exist */
  currentCount?: number;
  /** the real ADD affordance — rendered only when acquisition is allowed */
  children: React.ReactNode;
  /** custom blocked UI; defaults to a calm upsell row routing to the paywall */
  locked?: React.ReactNode;
  /** gentle, additive copy — never implies the child loses anything */
  lockedLabel?: string;
}

export function PremiumGate({
  feature,
  currentCount,
  children,
  locked,
  lockedLabel,
}: PremiumGateProps): React.ReactElement {
  const entitlement = useEntitlements();

  const isCount = (COUNT_FEATURES as readonly string[]).includes(feature);
  const allowed =
    isCount && currentCount !== undefined
      ? canAddMore(feature as CountFeature, currentCount, entitlement)
      : isFeatureUnlocked(feature, entitlement);

  if (allowed) return <>{children}</>;
  if (locked !== undefined) return <>{locked}</>;
  return <UpsellRow label={lockedLabel} />;
}

function UpsellRow({ label }: { label?: string }): React.ReactElement {
  const t = useThemeTokens();
  const c = t.colors;
  return (
    <Pressable
      onPress={goToPaywall}
      accessibilityRole="button"
      accessibilityLabel="See Tiny Bubbles Plus"
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: t.spacing(3),
        borderRadius: t.radius,
        borderWidth: 1,
        borderColor: c.border,
        backgroundColor: c.surfaceAlt,
        padding: t.spacing(3),
      }}
    >
      <Text style={{ fontSize: 22 }}>✨</Text>
      <View style={{ flex: 1 }}>
        <Text
          style={{
            color: c.text,
            fontFamily: t.type.label.family,
            fontSize: t.type.bodyLg.size,
            fontWeight: "700",
          }}
        >
          {label ?? "Unlock more with Plus"}
        </Text>
        <Text style={{ color: c.textDim, fontSize: t.type.caption.size, marginTop: 2 }}>
          Everything you have now stays exactly as it is.
        </Text>
      </View>
      <Text style={{ color: c.primary, fontSize: t.type.bodyLg.size }}>›</Text>
    </Pressable>
  );
}

export default PremiumGate;
