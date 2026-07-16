/**
 * components/rewards/CollectiblesGrid.tsx — the kid's cosmetics/collectibles grid
 * (doc 63 Feature 2/3, doc 66 M8). NO badge engine (badges deferred — doc 66
 * §1b/§M4); this is the owned-forever collectibles wall.
 *
 * Re-authored from tether's spend/affordability PATTERN (`unlockTheme` —
 * `canAfford = points >= cost`, deduct, record) into a refundless, owned-forever
 * token unlock: tapping an affordable collectible spends bubbles and the child
 * OWNS it forever (nothing here is ever removed — doc 66 §1b.11). Anti-shame:
 *   - a child NEVER sees a paywall (doc 66 §5): premium-locked, not-yet-owned
 *     items are simply NOT shown a price here (they arrive via the parent/premium
 *     flow, M12); only owned + token-unlockable items appear.
 *   - unaffordable shows calm "N more bubbles!", never "buy more".
 *
 * Reads resolved tokens + stores; never branches on raw ageMode (doc 66 §2).
 */
import React, { useMemo } from "react";
import { Text, View } from "react-native";

import { availableBalance } from "../../src/domain/gamification";
import { isSeasonalNew } from "../../src/domain/novelty";
import { bubblesUntil } from "../../src/domain/progressMeter";
import type { Cosmetic } from "../../src/domain/types";
import { getSeasonalPacks, visibleCosmetics } from "../../src/data/buddyCosmetics";
import { useBuddyStore } from "../../src/state/buddyStore";
import { useChildStore } from "../../src/state/childStore";
import { now } from "../../src/state/ids";
import { useThemeTokens } from "../../src/theme/useThemeTokens";
import NoveltyBadge from "../quests/NoveltyBadge";

export interface CollectiblesGridProps {
  childId: string;
  /** spends bubbles + unlocks (owned forever). Provided by the screen/orchestrator. */
  onUnlock: (cosmeticId: string) => void;
}

function isFreeBase(c: Cosmetic): boolean {
  return c.unlockCost === 0 && !c.premium;
}

export default function CollectiblesGrid({ childId, onUnlock }: CollectiblesGridProps) {
  const t = useThemeTokens();
  const c = t.colors;

  const companion = useBuddyStore((s) => s.companions[childId]);
  const ledger = useChildStore((s) => s.ledgers[childId]);
  const balance = ledger ? availableBalance(ledger) : 0;

  const owned = useMemo(() => new Set(companion?.unlockedItems ?? []), [companion?.unlockedItems]);

  const items = useMemo(() => {
    const all = visibleCosmetics(now()).filter((x) =>
      x.slot === "color" || x.slot === "finish" || x.slot === "accessory" || x.slot === "hat",
    );
    // hide premium, not-yet-owned items — a child never sees a paywall (doc 66 §5)
    const shown = all.filter((x) => owned.has(x.id) || !x.premium);
    // owned first, then cheapest unlockable, then the rest
    return shown.sort((a, b) => {
      const ao = owned.has(a.id) || isFreeBase(a) ? 0 : 1;
      const bo = owned.has(b.id) || isFreeBase(b) ? 0 : 1;
      if (ao !== bo) return ao - bo;
      return a.unlockCost - b.unlockCost;
    });
  }, [owned]);

  if (!companion) return null;

  // Newly-appeared seasonal packs get a calm "new!" star (novelty-refresh §2.3) —
  // never a countdown. Additive-only: `isSeasonalNew` reads only how recently the
  // pack APPEARED (there is no expiry to count down to).
  const nowTs = now();
  const packs = getSeasonalPacks();

  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: t.spacing(2), justifyContent: "center" }}>
      {items.map((cos) => {
        const isOwned = owned.has(cos.id) || isFreeBase(cos);
        const remaining = bubblesUntil(balance, cos.unlockCost);
        const canUnlock = !isOwned && remaining === 0;
        const isNew = isSeasonalNew(cos.seasonalPackId, nowTs, packs);
        return (
          <Tile
            key={cos.id}
            cosmetic={cos}
            owned={isOwned}
            canUnlock={canUnlock}
            remaining={remaining}
            isNew={isNew}
            onUnlock={() => onUnlock(cos.id)}
            c={c}
            t={t}
          />
        );
      })}
    </View>
  );
}

type Tokens = ReturnType<typeof useThemeTokens>;
type Colors = Tokens["colors"];

function Tile({
  cosmetic,
  owned,
  canUnlock,
  remaining,
  isNew,
  onUnlock,
  c,
  t,
}: {
  cosmetic: Cosmetic;
  owned: boolean;
  canUnlock: boolean;
  remaining: number;
  isNew: boolean;
  onUnlock: () => void;
  c: Colors;
  t: Tokens;
}) {
  const glyph =
    cosmetic.slot === "color"
      ? null
      : cosmetic.label.emoji ?? cosmetic.value ?? "✨";

  return (
    <View
      style={{
        width: 96,
        backgroundColor: c.surface,
        borderRadius: t.radius,
        padding: t.spacing(2),
        gap: 6,
        alignItems: "center",
        borderWidth: owned ? 2 : 1,
        borderColor: owned ? c.success : c.border,
      }}
    >
      {isNew ? (
        <View style={{ position: "absolute", top: -6, right: -6, zIndex: 1 }}>
          <NoveltyBadge compact />
        </View>
      ) : null}
      <View
        style={{
          width: 48,
          height: 48,
          borderRadius: 999,
          backgroundColor: cosmetic.slot === "color" ? cosmetic.value ?? c.surfaceAlt : c.surfaceAlt,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {glyph ? <Text style={{ fontSize: 24 }}>{glyph}</Text> : null}
      </View>
      <Text
        numberOfLines={1}
        style={{ color: c.text, fontSize: t.type.caption.size, textAlign: "center", maxWidth: 84 }}
      >
        {cosmetic.label.text ?? cosmetic.label.spokenLabel}
      </Text>
      {owned ? (
        <Text style={{ color: c.success, fontSize: t.type.caption.size, fontWeight: "700" }}>owned ✓</Text>
      ) : canUnlock ? (
        <Text
          onPress={onUnlock}
          accessibilityRole="button"
          style={{
            color: c.onPrimary,
            backgroundColor: c.primary,
            fontSize: t.type.caption.size,
            fontWeight: "700",
            borderRadius: 999,
            paddingVertical: 4,
            paddingHorizontal: 10,
            overflow: "hidden",
          }}
        >
          🫧 {cosmetic.unlockCost}
        </Text>
      ) : (
        <Text style={{ color: c.textDim, fontSize: t.type.caption.size }}>{remaining} more 🫧</Text>
      )}
    </View>
  );
}
