import "react-native-gesture-handler";
import "../global.css";

import { Stack, type ErrorBoundaryProps } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useMemo, type ReactNode } from "react";
import { AppState } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import RootErrorBoundary from "../components/RootErrorBoundary";
import StoreHydrationGate from "../components/StoreHydrationGate";
import ErrorScreen from "../components/ui/ErrorScreen";
import { DEV_SCREENS_ENABLED } from "../src/config/flags";
import { setHapticsEnabled } from "../src/services/haptics";
import {
  addReminderTapListener,
  cancelTrialEndingReminder,
  rescheduleReminders,
  scheduleTrialEndingReminder,
} from "../src/services/notifications";
import { initSoundRegistry, setSoundEnabled } from "../src/services/sound";
import { setSoundscapeVolume, stopSoundscape } from "../src/services/soundscape";
import { resolveSoundscapeSettings } from "../src/domain/soundscapes";
import { planToReminderAnchor } from "../src/domain/plans";
import { speak } from "../src/services/tts";
import { APP_FONTS } from "../src/theme/fonts";
import { resolveEffectiveSensoryMode } from "../src/theme/resolveTokens";
import { ThemeProvider, type ThemeInputs } from "../src/theme/ThemeProvider";
import { useChildStore } from "../src/state/childStore";
import { usePlanStore } from "../src/state/planStore";
import { useSessionStore } from "../src/state/sessionStore";
import { useSettingsStore } from "../src/state/settingsStore";
import { useTaskStore } from "../src/state/taskStore";
import type { ReminderAnchor } from "../src/domain/types";

// Keep the native splash up until fonts resolve (doc 61 §3.1 splash gate).
SplashScreen.preventAutoHideAsync().catch(() => {});

/**
 * Root layout (M5).
 *
 * Provider order (doc 66 §2 / §5):
 *   GestureHandlerRootView -> SafeAreaProvider -> StoreHydrationGate
 *   -> ThemeProvider (store-fed) -> [audio cue-registry init placeholder (M13)]
 *   -> [deferred notification registration, after onboarding (M10)] -> Stack
 *
 * No AI provider is ever mounted (AI off by default, doc 66 §0/§5).
 *
 * StoreHydrationGate is ABOVE ThemeProvider + the Stack so the theme and every
 * screen can assume hydrated stores (the boot redirect in `index.tsx` reads the
 * persisted onboarding flag synchronously).
 */
export default function RootLayout() {
  // Fredoka + Lexend (OpenDyslexic is local + optional — see src/theme/fonts.ts).
  const [fontsLoaded, fontError] = useFonts(APP_FONTS);

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded, fontError]);

  // Gate render on fonts so no flash of fallback type (error -> proceed anyway).
  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        {/* Global boundary (production-readiness §2.3): a caught render error
            shows the calm ErrorScreen (offline, no telemetry) instead of a red
            box / white crash. Wraps hydration + theme so a boot-time crash is
            caught too. */}
        <RootErrorBoundary>
          <StoreHydrationGate>
            <ThemedRoot>
              <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="index" />
                <Stack.Screen name="(onboarding)" />
                <Stack.Screen name="(kid)" />
                <Stack.Screen name="(parent)" />
                <Stack.Screen
                  name="(gate)"
                  options={{ presentation: "modal", gestureEnabled: true }}
                />
                {/*
                  Dev diagnostic screens (/_sandbox, /_theme-gallery) — registered
                  ONLY when DEV_SCREENS_ENABLED (production-readiness §2.6): ON in
                  __DEV__ + the dev/preview EAS profiles (EXPO_PUBLIC_TB_DEV_SCREENS=1),
                  OFF in a production store build. Each screen ALSO self-guards with a
                  <Redirect> so a deep-link can't reach it either. See RUN.md.
                */}
                {DEV_SCREENS_ENABLED && (
                  <>
                    <Stack.Screen name="_sandbox" />
                    <Stack.Screen name="_theme-gallery" />
                  </>
                )}
              </Stack>
              <StatusBar style="auto" />
            </ThemedRoot>
          </StoreHydrationGate>
        </RootErrorBoundary>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

/**
 * expo-router route-level error boundary (production-readiness §2.3): a per-route
 * render error is caught by the router too and shows the same calm ErrorScreen.
 * Hides the native splash first so a boot-time route crash can never leave the
 * splash pinned over the recovery UI. `retry` re-renders the failed route.
 */
export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  SplashScreen.hideAsync().catch(() => {});
  return <ErrorScreen error={error} onReload={retry} />;
}

/**
 * Feeds the ThemeProvider from the persisted stores (doc 66 §M5) and owns the
 * root-level side effects: the audio cue-registry init placeholder (real
 * registry in M13), deferred notification registration (after onboarding, M10),
 * and clearing the in-memory `parentUnlocked` flag when the app backgrounds.
 *
 * Mounted below StoreHydrationGate, so reading the active child is safe.
 */
function ThemedRoot({ children }: { children: ReactNode }) {
  const activeChildId = useSettingsStore((s) => s.meta.activeChildId);
  const profile = useChildStore((s) =>
    activeChildId ? s.profiles[activeChildId] : undefined,
  );
  const lowStimTheme = useSettingsStore((s) => s.parentSettings.lowStimTheme);
  // Parent-global mood opt-in (mood-checkin §4.1). ANDed with the active child's
  // per-child `moodCheckinEnabled` (default true) to compute the `moodCheckin` grant
  // — enabling the global switch never silently opts in a sibling a parent didn't
  // intend, and a parent can turn it off for one child (§2.0).
  const moodLoggingEnabled = useSettingsStore((s) => s.parentSettings.moodLoggingEnabled);
  // Persisted reduced-motion DEFAULT (global). Combined with the active child's
  // per-child setting below + the OS flag downstream (accessibility-i18n §2.3).
  const reducedMotionDefault = useSettingsStore((s) => s.parentSettings.reducedMotionDefault);
  const onboardingComplete = useSettingsStore((s) => s.meta.onboarding.completed);
  const quietHours = useSettingsStore((s) => s.parentSettings.quietHours);
  const notificationsEnabled = useSettingsStore(
    (s) => s.parentSettings.notificationsEnabled,
  );
  // Billing trial reminder is keyed on the live-trial signal only (never the paid
  // tier — paid subscribers get no trial-end note). Read the two fields directly.
  const entitlementSource = useSettingsStore((s) => s.entitlement.source);
  const trialEndsAt = useSettingsStore((s) => s.entitlement.trialEndsAt);
  const remindersConfig = profile?.settings.reminders;
  const routines = useTaskStore((s) =>
    activeChildId ? s.routines[activeChildId] : undefined,
  );
  // The active child's if-then plans (if-then-plans §2.3a): active `time` plans map
  // to ReminderAnchors CONCAT-ed into the same reschedule below, so they inherit the
  // quiet-hours + per-day budget + banned-phrase gate with no new scheduling path.
  const activePlansList = usePlanStore((s) =>
    activeChildId ? s.plans[activeChildId] : undefined,
  );
  const ageMode = profile?.ageMode ?? "young";
  const spokenLabelsEnabled = profile?.settings.spokenLabelsEnabled ?? true;
  const soundEnabled = profile?.settings.soundEnabled ?? true;
  const hapticsEnabled = profile?.settings.hapticsEnabled ?? true;
  // Mirror the active child's persisted bed volume into the soundscape service
  // (soundscapes §3.5) — the same mirroring pattern as sound/haptics.
  const soundscapeVolume = resolveSoundscapeSettings(profile?.settings.soundscape).volume;

  // Audio cue-registry init (doc 66 §1b.1 / M13): pre-instantiate one AudioPlayer
  // per named cue + configure the mix-not-hijack (duck-not-stop) session so
  // playCue() stays imperative + sub-300ms. Idempotent; released on unmount.
  useEffect(() => {
    const teardown = initSoundRegistry();
    return teardown;
  }, []);

  // Mirror the active child's per-channel toggles into the sound + haptic
  // registries so a muted child silences EVERY app-wide cue (doc 61 §9.3/§10.2),
  // not just the ones routed through useCelebration.
  useEffect(() => {
    setSoundEnabled(soundEnabled);
    setHapticsEnabled(hapticsEnabled);
    setSoundscapeVolume(soundscapeVolume);
    // A muted child silences the looping bed too (mix-not-hijack + master mute).
    if (!soundEnabled) stopSoundscape();
  }, [soundEnabled, hapticsEnabled, soundscapeVolume]);

  // Reminders (M10): reschedule on app open, only AFTER onboarding so a child's
  // first screen is never a permission prompt (doc 60 §4.4 deferred prompt). The
  // service cancels-then-reschedules under quiet-hours + the per-day budget, and
  // only requests OS permission when reminders are actually enabled (parent opt-in
  // via the global notifications switch AND the per-child reminder toggle).
  //
  // The honest trial-end reminder (billing §2.4) is (re)synced in the SAME effect,
  // AFTER the routine reschedule resolves — so the routine cancel-all never nukes
  // it (it uses a distinct data.kind and is cancelled/scheduled independently).
  useEffect(() => {
    if (!onboardingComplete) return;
    const trialLive =
      entitlementSource === "trial" && (trialEndsAt ?? 0) > Date.now();
    let cancelled = false;
    void (async () => {
      // Routine reminders (unchanged behavior: only when there is an active child
      // + a resolved reminder config for it). If-then `time` plans are mapped to
      // anchors and CONCAT-ed here (if-then-plans §2.3a), so they inherit the SAME
      // quiet-hours suppression, per-day budget, deferred permission, and fixed
      // friendly copy — a plan cue can never become a notification flood.
      if (activeChildId && remindersConfig) {
        const planAnchors = (activePlansList ?? [])
          .map((p) => planToReminderAnchor(p, ageMode))
          .filter((a): a is ReminderAnchor => a !== null);
        await rescheduleReminders({
          routines: routines ?? [],
          anchors: [...remindersConfig.anchors, ...planAnchors],
          enabled: notificationsEnabled && remindersConfig.enabled,
          maxPerDay: remindersConfig.maxPerDay,
          quietHours,
        });
      }
      if (cancelled) return;
      // Billing trial-end reminder: independent one-shot, scheduled AFTER routine
      // reschedule so it survives the routine cancel-all. Idempotent (self-cancels
      // any stale billing reminder first).
      if (trialLive && trialEndsAt) {
        await scheduleTrialEndingReminder(trialEndsAt, quietHours);
      } else {
        await cancelTrialEndingReminder();
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    onboardingComplete,
    activeChildId,
    remindersConfig,
    routines,
    activePlansList,
    ageMode,
    notificationsEnabled,
    quietHours,
    entitlementSource,
    trialEndsAt,
  ]);

  // Tap-through TTS (M10, honest scope): a scheduled notification only delivers a
  // SOUND — there is NO background TTS. When the child opens the app FROM a
  // reminder, speak the routine label foregrounded (if spoken labels are on).
  useEffect(() => {
    const sub = addReminderTapListener((info) => {
      if (spokenLabelsEnabled) {
        speak(info.spokenLabel, { ageMode, enabled: true });
      }
    });
    return () => sub.remove();
  }, [ageMode, spokenLabelsEnabled]);

  // The parental gate's unlock is in-memory only and MUST NOT survive the app
  // leaving the foreground — the kid must never inherit an unlocked parent zone
  // (doc 66 §M5). Clear on background.
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "background") {
        useSessionStore.getState().lockParent();
        // A focus/calm bed must never continue while backgrounded. The OS-level
        // `shouldPlayInBackground:false` is the backstop; this is the explicit
        // app-level stop (soundscapes §4.MODIFY #13).
        stopSoundscape();
      }
    });
    return () => sub.remove();
  }, []);

  const value = useMemo<Partial<ThemeInputs>>(() => {
    // Fresh install / pre-active-child (onboarding): safe young/standard
    // defaults; a global lowStim theme still applies (§1b.5 precedence). The
    // global reduced-motion default still takes effect during onboarding (§2.3).
    if (!profile) {
      return {
        sensoryMode: resolveEffectiveSensoryMode(undefined, lowStimTheme),
        reducedMotion: reducedMotionDefault,
      };
    }
    const cs = profile.settings;
    return {
      ageMode: profile.ageMode,
      // w8 (M1.1): the third axis, fed from the active profile (the
      // coordinate-once w6+w8 seam). ABSENT ⇒ neutral preset ⇒ v1-identical
      // (§8 #13). Never read raw below this point — resolvers only.
      neuroProfile: profile.neuroProfile,
      // §1b.5 precedence: per-child lowStim OR global lowStimTheme -> lowStim,
      // computed by the shared resolver (no inline raw-mode branch here, M14).
      sensoryMode: resolveEffectiveSensoryMode(cs.sensoryMode, lowStimTheme),
      // Persisted reduced-motion = per-child OR global default; the resolvers OR
      // this with the OS flag (§2.3). This is the bug fix: previously the saved
      // setting never reached the resolver (only the OS flag did).
      reducedMotion: cs.reducedMotion || reducedMotionDefault,
      companionStyle: cs.companionStyle,
      textFirst: cs.textFirst,
      // Autonomy grants ride on top of the age defaults (child-autonomy §3.2).
      // The master `canCustomizeCompanion` gate + the `canPickReward` grant flow
      // through `useCapabilities` → `resolveCapabilities`; live-updated because
      // this selector re-reads the active child's settings on `updateSettings`.
      grants: {
        ttsDefault: cs.spokenLabelsEnabled,
        canCustomizeCompanion: cs.autonomy.canCustomizeCompanion,
        canPickReward: cs.autonomy.canPickReward,
        // Per-child consent: global master AND per-child (default true) (§4.1).
        moodCheckin: moodLoggingEnabled && (cs.moodCheckinEnabled ?? true),
      },
    };
  }, [profile, lowStimTheme, reducedMotionDefault, moodLoggingEnabled]);

  return <ThemeProvider value={value}>{children}</ThemeProvider>;
}
