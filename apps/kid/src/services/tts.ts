/**
 * src/services/tts.ts — spoken-label engine wrapping expo-speech (doc 60 §7.5).
 *
 * "Everything spoken aloud" is a component-level guarantee for non-readers
 * (doc 61 §4 / doc 65 §5). The companion voice is age-pitched (doc 61 §6.4):
 * young = higher/bubblier, older = lower/mellower — resolved from `ageMode`.
 *
 * expo-speech is system TTS; offline-voice availability is a device-verify item
 * (the M11 pre-recorded fallback handles voiceless devices). This module is a
 * thin, synchronous-feeling facade so callers don't touch expo-speech directly.
 */
import * as Speech from "expo-speech";

import type { AgeMode } from "../domain/types";

export interface VoiceParams {
  pitch: number;
  rate: number;
}

/**
 * Age-driven pitch/rate (doc 61 §6.4). Young is higher + slightly slower (easier
 * to follow for a pre-reader); older is neutral pitch at natural rate.
 *
 * M14 WHITELIST: this `ageMode` read is itself a RESOLVER (age -> voice params),
 * the sanctioned home for an age->value mapping — exactly like `src/theme/*`
 * resolvers and the `src/domain/constants.ts` default factories. The anti-branch
 * rule (doc 66 §2) forbids age branches in COMPONENTS, which read these resolvers
 * instead; it does not forbid the resolvers themselves.
 */
export function voiceParamsFor(ageMode: AgeMode): VoiceParams {
  return ageMode === "young"
    ? { pitch: 1.25, rate: 0.95 }
    : { pitch: 1.0, rate: 1.0 };
}

export interface SpeakOptions {
  /** drives the age-pitched defaults; ignored if explicit pitch/rate given */
  ageMode?: AgeMode;
  pitch?: number;
  rate?: number;
  language?: string;
  /** when false, this call is a no-op (respects the TTS toggle) */
  enabled?: boolean;
  onDone?: () => void;
}

/**
 * Speak a resolved label/string. Interrupts any in-flight utterance first so
 * rapid taps don't queue a backlog (the celebration/step flow taps fast).
 */
export function speak(text: string, options: SpeakOptions = {}): void {
  const { ageMode = "young", enabled = true, language, onDone } = options;
  if (!enabled || !text) return;

  const params = voiceParamsFor(ageMode);
  const pitch = options.pitch ?? params.pitch;
  const rate = options.rate ?? params.rate;

  // stop any current utterance so labels don't pile up
  Speech.stop();
  Speech.speak(text, { pitch, rate, language, onDone });
}

/** Stop any in-flight speech (e.g. on unmount / navigation away). */
export function stopSpeaking(): void {
  Speech.stop();
}

/** Probe for usable offline voices (the M11 fallback decision uses this). */
export async function getAvailableVoices(): Promise<Speech.Voice[]> {
  try {
    return await Speech.getAvailableVoicesAsync();
  } catch {
    return [];
  }
}
