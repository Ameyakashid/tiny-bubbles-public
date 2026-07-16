/**
 * src/theme/useReduceTransparency.ts — OS "Reduce Transparency" a11y flag (§2.3).
 *
 * Mirror of `useReducedMotion`. When on, the theming engine flattens the
 * celebration scrim to a solid fill and drops canvas gradients (folded into the
 * `reduceTransparency` token by `resolveTokens`), so washes don't shimmer for
 * sensitive users. Runtime hook (subscribes to an OS event); kept out of the pure
 * resolvers so those stay unit-testable. Web-safe (defaults false).
 */
import { useEffect, useState } from "react";
import { AccessibilityInfo } from "react-native";

export function useReduceTransparency(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    let mounted = true;

    AccessibilityInfo.isReduceTransparencyEnabled?.()
      .then((value) => {
        if (mounted) setReduced(value);
      })
      .catch(() => {
        // web / unsupported platforms — default false
      });

    const sub = AccessibilityInfo.addEventListener(
      "reduceTransparencyChanged",
      (value) => setReduced(value),
    );

    return () => {
      mounted = false;
      sub.remove();
    };
  }, []);

  return reduced;
}
