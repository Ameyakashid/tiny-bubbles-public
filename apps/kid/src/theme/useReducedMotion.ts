/**
 * src/theme/useReducedMotion.ts — OS "Reduce Motion" accessibility flag.
 *
 * Pattern re-authored from the momentum reference (doc 60 §7.1). When the OS
 * Reduce-Motion setting is on, the theming engine forces lowStim-equivalent
 * motion and gentle celebrations automatically (doc 61 §0). This is a runtime
 * hook (it subscribes to an OS event), kept separate from the pure resolvers so
 * those stay unit-testable.
 */
import { useEffect, useState } from "react";
import { AccessibilityInfo } from "react-native";

export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    let mounted = true;

    AccessibilityInfo.isReduceMotionEnabled()
      .then((value) => {
        if (mounted) setReduced(value);
      })
      .catch(() => {
        // some platforms (web) may not implement this; default to false
      });

    const sub = AccessibilityInfo.addEventListener("reduceMotionChanged", (value) => {
      setReduced(value);
    });

    return () => {
      mounted = false;
      sub.remove();
    };
  }, []);

  return reduced;
}
