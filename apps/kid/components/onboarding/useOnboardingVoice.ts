/**
 * components/onboarding/useOnboardingVoice.ts — the React hook that drives spoken
 * onboarding with the offline fallback (doc 66 §M11).
 *
 * It probes for a usable system voice once, then exposes `speak(text)` which:
 *   - uses the age-pitched system TTS when a voice IS available;
 *   - falls back to the bundled clip for this slot when NO voice exists
 *     (no-op today — no asset is bundled yet, see onboardingVoice.ts);
 *   - reports `voiceMissing` so the screen can surface a one-time install prompt.
 *
 * The age pitch comes from the resolved theme tokens (`ageMode`), so this never
 * branches on raw age (doc 66 §2). During the first screens (before a child
 * exists) the provider resolves to the friendly young default — fine for setup.
 */
import { useCallback, useEffect, useState } from "react";

import { useLocale, localeToBcp47 } from "../../src/i18n/useLocale";
import { speak } from "../../src/services/tts";
import {
  playOnboardingClip,
  probeVoiceAvailable,
  type OnboardingVoiceSlot,
} from "../../src/services/onboardingVoice";
import { useThemeTokens } from "../../src/theme/useThemeTokens";

export type { OnboardingVoiceSlot } from "../../src/services/onboardingVoice";

export type VoiceState = "probing" | "available" | "missing";

export interface OnboardingVoice {
  voiceState: VoiceState;
  /** true once we know no usable system voice exists */
  voiceMissing: boolean;
  /** speak via system TTS, or play the bundled fallback clip if voiceless */
  speak: (text: string) => void;
}

export function useOnboardingVoice(slot: OnboardingVoiceSlot): OnboardingVoice {
  const t = useThemeTokens();
  const ageMode = t.ageMode;
  const locale = useLocale();
  const [voiceState, setVoiceState] = useState<VoiceState>("probing");

  useEffect(() => {
    let active = true;
    probeVoiceAvailable().then((ok) => {
      if (active) setVoiceState(ok ? "available" : "missing");
    });
    return () => {
      active = false;
    };
  }, []);

  const say = useCallback(
    (text: string) => {
      if (!text) return;
      if (voiceState === "available") {
        speak(text, { ageMode, language: localeToBcp47(locale) });
      } else if (voiceState === "missing") {
        // Try the bundled fallback; today this is a no-op (no asset yet) and the
        // screen's one-time "install a voice" prompt covers the gap.
        playOnboardingClip(slot);
      }
      // while 'probing' we stay silent; the screen re-speaks once resolved
    },
    [voiceState, ageMode, slot, locale],
  );

  return { voiceState, voiceMissing: voiceState === "missing", speak: say };
}
