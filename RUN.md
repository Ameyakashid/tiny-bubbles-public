# Running & verifying Tiny Bubbles

Tiny Bubbles is an Expo SDK 56 app (RN 0.85, React 19.2, TS 6). The default
storage port is AsyncStorage, so it runs in **Expo Go** with no native build.

## Run

```sh
# install once
npm install

# Expo Go (primary target): start the dev server, scan the QR with Expo Go
npx expo start

# Web (iteration-only strict subset: boots + navigates + visual celebration)
npx expo start --web
```

## Verify (the CI floor — all must pass)

```sh
npx tsc --noEmit            # full type safety
npm test                   # jest-expo unit tests (domain + seams)
npx expo export --platform web   # bundles the web subset without error
```

Anti-shame / over-claiming / AI greps (doc 66 §7) are run over `app/ components/ src/`.

---

## Store release (App Store / Play Store) — M-D2 ship gate

The checklist below is the M-D2 ship gate (production-readiness §2.1/§2.2/§2.7).
Everything code-side is done + tested; the remaining rows are art/legal/account
tasks done at submission time.

### EAS build + submit (`eas.json`)

- `development` / `preview` profiles set `EXPO_PUBLIC_TB_DEV_SCREENS=1` (dev
  diagnostic screens ON for QA) and `distribution:internal`.
- `production` profile does **NOT** set that env (dev screens OFF), uses
  `autoIncrement:true`, `channel:"production"`.
- **No `expo-updates` / OTA is wired** (offline-first, no phone-home — §2.1). The
  `channel` keys are inert metadata; there is no update server.
- `submit.production` has iOS (`appleId` / `ascAppId` / `appleTeamId`) + Android
  (`serviceAccountKeyPath` / `track`) **placeholders** — replace with real secrets
  (referenced, never committed) before `eas submit`.

```sh
eas build --profile production --platform all
eas submit --profile production --platform ios      # after filling submit.production
eas submit --profile production --platform android
```

### App config (`app.json`)

- `android.allowBackup:false` (Android Auto Backup / Google Drive will NOT sweep
  the `tb/` data container off-device — §2.7). Asserted by
  `__tests__/config/backup-exclusion.test.ts`.
- `expo-image-picker` config plugin registered with honest, no-upload
  camera/photo usage strings (optional child photo-verify — §2.1). Asserted by the
  same test.
- `ios.infoPlist.UIBackgroundModes: []` documents there is **no** background audio.
- Child verify photos are written to the OS cache dir (`tb-photos/`), which iOS
  excludes from iCloud/iTunes backup; `deletePhoto` clears them on
  re-verify/wipe/restore.

### Store metadata (art / legal / account — done at submission)

- [ ] Final icon / splash / adaptive art verified at all densities (no placeholder).
- [x] `store/privacy-policy.md` written (host it at a stable URL for the store forms).
- [ ] **Data Safety (Play) / Privacy Nutrition (Apple): "No data collected / No data
      shared."** Honest because of the zero-egress gate (`no-network.test.ts`) **and**
      the OS-backup exclusion above. Disclose the optional camera permission (photo
      never leaves the device).
- [ ] Age rating / kids positioning: Apple **Kids Category** or Google
      **Designed-for-Families** — the app already meets the no-ads / no-analytics /
      privacy-policy bar. Record the child-camera decision (optional, parent-enabled,
      off by default, never required, on-device only).
- [ ] Store listing copy: routines / morning-conflict framing ONLY — never a
      symptom-focused or efficacy claim (the banned-phrase gate over `store/` +
      `RUN.md` blocks the medical-claim vocabulary).
- [ ] Screenshots from the real app (phone + tablet, both age modes); **no dev
      screens** in any shot.
- [ ] Support URL / contact email reachable.

### Ship-gate greps (must return nothing)

```sh
# over-claim gate — the medical-claim vocabulary must appear ONLY in disclaimers
# (see BUILD-GUIDE §3 for the exact banned-phrase regex); must return nothing new.
grep -rniE "fetch\(|axios|XMLHttpRequest|WebSocket|sendBeacon|https?://[a-z]" app src components \
  | grep -viE "^[^:]+:[0-9]+: *(//|\*)|__tests__|docs.expo.dev|schema|xmlns"   # no egress
grep -rn "Math.random(" src app components | grep -v __tests__   # only parentGate arithmetic
```

---

## Dev diagnostic screens (kept on purpose — direct route only)

Two developer screens are **kept** so you can verify native/animated/theming
behaviour on a real device. They are **NOT linked from any kid or parent screen**
— reach them only by typing the route into the Expo Go URL bar (or a deep link).
A child navigating the app can never land on them.

### `/_sandbox` (native surfaces — M1)

Open `exp://…/_sandbox`. It checks, in priority order, the surfaces the core
loop depends on:

- **(a)** an animated `react-native-svg` `Path` `d` + `RadialGradient` driven by
  a Reanimated shared value (the BubbleBuddy breathe/gradient) — no worklet error.
- **(b)** a Modal with Reanimated `FadeIn`/`ZoomIn`/`SlideInDown` entering
  animations (the celebration overlay).
- **(c)** `Speech.speak()` + `Speech.getAvailableVoicesAsync()` (TTS + the
  offline-voice probe).
- **(d)** a tap → haptic + `expo-audio` cue **latency probe** (target sub-300ms).
- Plus: emoji picker, color picker, datetime picker, bottom sheet, circular
  progress, an AsyncStorage read/write, and an `expo-notifications` local schedule.

### `/_theme-gallery` (age/sensory theming — M2)

Open `exp://…/_theme-gallery`. It renders **both age modes simultaneously** via
the scoped `overrideAgeMode` provider and lets you toggle:

- young ↔ older (touch-target / font-scale / text-first / palette change live);
- independent `companionStyle` / `textFirst` overrides (framing/text change
  without changing age mode);
- `lowStim` (desaturates, kills confetti, shortens motion);
- dark mode; a tablet viewport (`contentMaxWidth` / `columns` change);
- `SpokenLabel` (age-pitched TTS); `resolveCelebration` never lowers size by phase.

> **Store builds hide these automatically (M-A4, production-readiness §2.6) — no
> hand-deletion needed.** Both screens are gated behind the central
> `DEV_SCREENS_ENABLED` flag (`src/config/flags.ts`):
> - ON in `__DEV__` (local) and in any EAS profile that sets
>   `EXPO_PUBLIC_TB_DEV_SCREENS=1` (the `development` / `preview` profiles);
> - OFF in `production` (the env var is unset there).
>
> When the flag is off, each screen self-redirects to `/` (`<Redirect href="/">`)
> AND is not registered in the `app/_layout.tsx` Stack, so a deep-link to
> `/_sandbox` or `/_theme-gallery` in a store bundle can't reach them. The gate is
> covered by `__tests__/config/dev-screens-gated.test.ts`. (If you ever want to
> drop the screens entirely, delete `app/_sandbox.tsx`, `app/_theme-gallery.tsx`,
> the conditional `Stack.Screen` block in `app/_layout.tsx`, and
> `assets/sounds/sandbox-cue.wav`.)

---

## Onboarding (M11)

Fresh install → boot redirect sends you to `app/(onboarding)`. The single
canonical flow is:

```
welcome → privacy-consent → parent-gate-setup → child-setup
        → pick-buddy → first-task → calm-offer → done → (kid)
```

- The **parent gate + purchase PIN are configured before the child can reach
  `(kid)`** — `done.tsx` (the only path into the kid area) is reachable only after
  `parent-gate-setup`, and that step blocks Continue until a PIN is set.
- Onboarding **creates the child + seeds a starter routine** and switches one
  routine on, so the core loop is live on day one.
- Resume-after-kill: each step persists `onboarding.currentStep`; relaunching
  mid-flow forwards to the saved step.
- Everything is spoken via TTS (`expo-speech`), age-pitched.

### Offline-TTS fallback (device-verify item)

`src/services/onboardingVoice.ts` probes `Speech.getAvailableVoicesAsync()` once:

- **Voice present** → screens speak via system TTS.
- **No voice** → each step falls back to a bundled clip (`ONBOARDING_VOICE_SLOTS`)
  **and** a one-time "add a voice" prompt appears.

**No CC0 clip is bundled yet** — every slot is `null` and the fallback player is a
registered no-op, so the path is wired but silent on a voiceless device (the
one-time prompt still shows). Asset slots are reserved in
`THIRD_PARTY_NOTICES.md` §6a. To enable real offline voice:

1. Add CC0 / royalty-free clips at `assets/audio/onboarding/<slot>.m4a`.
2. Point each `ONBOARDING_VOICE_SLOTS[slot]` at `require(...)`.
3. Register a player via `registerOnboardingClipPlayer(...)` at boot.
4. Record the real license rows in `THIRD_PARTY_NOTICES.md` §6a.

### User-verify in Expo Go (not assertable here)

- Spoken prompts actually play on a real device with a system voice installed.
- The "add a voice" prompt appears on a device with **no** TTS voice.
- Color/emoji pickers (`reanimated-color-picker`, `rn-emoji-keyboard`) open and
  commit on device.
- `~60s` fresh-install-to-runnable-routine target.

## Sound, haptics & calm path (M13)

The cue registry (`src/services/sound.ts`) pre-instantiates one `expo-audio`
`AudioPlayer` per named cue at boot (`app/_layout.tsx`) and registers an
imperative `playCue(id)` (`seekTo(0)+play()`) into the `playCue` facade, which
`useCelebration` fires. Haptics route through `src/services/haptics.ts`. The
calm path is `app/(kid)/calm.tsx` (breathing visual + the loopable
`calm.ambient` soundscape, no tokens/confetti).

**All shipped cues are ORIGINAL / project-authored CC0** — soft sine/marimba-like
tones + a filtered-noise swoosh, synthesized with the Python standard library
(no third-party audio downloaded). They are registered in
`THIRD_PARTY_NOTICES.md` §6. Cue → asset slots (swap the binary, keep the key, to
upgrade to a richer soundscape later):

| Cue | File | Category |
| --- | --- | --- |
| `tap.soft` | `assets/sounds/tap-soft.wav` | ui |
| `step.done` | `assets/sounds/step-done.wav` | celebration |
| `token.payout` | `assets/sounds/token-payout.wav` | celebration |
| `routine.complete` | `assets/sounds/routine-complete.wav` | celebration |
| `levelup` | `assets/sounds/levelup.wav` | celebration |
| `reward.redeem` | `assets/sounds/reward-redeem.wav` | celebration |
| `buddy.greet` | `assets/sounds/buddy-greet.wav` | voice |
| `transition.swoosh` | `assets/sounds/transition-swoosh.wav` | ui |
| `calm.ambient` | `assets/sounds/calm-ambient.wav` | ambient (loop) |

### User-verify in Expo Go (not assertable here)

- **Ducking, not hijacking:** start music/a podcast, then complete a step — the
  cue should briefly DUCK (lower) the other audio and let it keep playing, never
  stop it (session is `interruptionMode: 'duckOthers'`). The duck-vs-mix nuance
  and real ducking behavior are device-only.
- **Sub-300ms latency:** tap Done → haptic + pop + visual feel simultaneous.
- **Per-channel mute:** turning a child's sound or haptics off (parent settings)
  silences every app-wide cue; toggling the OS silent switch mutes sound.
- **Calm path:** `calm.ambient` loops smoothly (seamless loop point), stops when
  you leave the Calm screen; the breathing bubble paces in/out; background
  parallax bubbles drift only in `standard` sensory motion (off in lowStim / OS
  Reduce-Motion).
- **lowStim / quiet-hours celebration:** softens to a single ripple + one light
  haptic, no confetti (driven by `resolveCelebration`).

---

## Device-only acceptance checklist (verify in Expo Go)

The CI floor (`tsc` / `jest` / `expo export` / greps) proves type-safety, pure
logic, bundling, and the anti-shame/license gates — but it **cannot** assert
haptic/audio latency, real-device audio ducking, TTS voice availability, on-device
gestures, notification delivery, or tablet layout. Run the items below on a
**physical iOS + Android device** (and a tablet) in Expo Go. Grouped by feature;
gathered from every milestone's device-verify items.

### Native surfaces (M1 — use `/_sandbox`)
- [ ] Animated SVG `Path`/`RadialGradient` runs with **no worklet error**.
- [ ] Modal `FadeIn`/`ZoomIn`/`SlideInDown` entering animations play.
- [ ] `getAvailableVoicesAsync()` returns; `speak()` produces audio (or is noted
      as needing the offline fallback).
- [ ] tap → haptic + cue **latency feels sub-300ms**.
- [ ] Emoji / color / datetime pickers, bottom sheet, circular progress all open
      and animate; AsyncStorage value survives reload; a local notification fires.

### Core loop (M7) — run in **airplane mode**
- [ ] Tap Done → haptic + sound + visual + token within ~300ms, **every time**.
- [ ] Token balance increments and **survives force-quit**.
- [ ] **Kill mid-routine → reopen → resumes at the next incomplete step.**
- [ ] A non-reader completes a 4-step routine using only pictures + audio.
- [ ] Young shows ONE step; older shows the list with completed steps greyed
      (never a red "failed" style).
- [ ] Sound and haptics each respect their toggle independently (visual + token
      still fire with both off).

### Companion (M6)
- [ ] Buddy idles (bob / breathe / blink) and cycles positive states.
- [ ] Earning tokens **visibly advances** the buddy's growth stage.
- [ ] Cuddly vs cool art follows `companionStyle` (not age); cosmetics persist.

### Sound, haptics & calm path (M13)
- [ ] A cue **ducks, not stops**, background music/podcast for ~1s, then it
      resumes (session is mix-not-hijack / `duckOthers`).
- [ ] Per-channel mute: turning a child's sound or haptics off silences every
      app-wide cue; the OS silent switch mutes sound.
- [ ] Calm path: `calm.ambient` loops seamlessly and stops on leaving Calm; the
      breathing bubble paces; parallax bubbles drift only in `standard` motion.
- [ ] lowStim / reduced-motion / quiet-hours each soften the celebration.

### Onboarding (M11)
- [ ] Spoken prompts play on a device **with** a system voice.
- [ ] The one-time "add a voice" prompt appears on a device with **no** voice
      (offline-TTS fallback path; no clip is bundled yet — see §"Onboarding").
- [ ] Color/emoji pickers open and commit on device.
- [ ] Fresh install → a runnable routine in ~60s; the parent gate + purchase PIN
      are configured **before** the child can reach `(kid)`.

### Parent area & gate (M9)
- [ ] Any "grown-ups" affordance routes through the gate; failing it never
      reaches `(parent)`; **backgrounding clears** the unlock.
- [ ] The **purchase route demands the PIN** (even though the buy is mocked).
- [ ] A templated task is assignable in ≤3 taps.
- [ ] Flipping a child's age mode re-themes the kid shell losslessly; the live
      side-by-side preview matches; companionStyle/textFirst/sensoryMode
      overrides take effect independently.
- [ ] Rewards honor weekly-limit / cooldown / auto-approve-under-N.
- [ ] Analytics + mood default OFF and only log when opted in; data-export shows
      exactly what is stored.

### Reminders (M10)
- [ ] **No reminder is delivered inside a configured quiet-hours window.**
- [ ] Count is bounded by `maxPerDay` and tied to actual routine times.
- [ ] Tap-through speaks the routine label when the app opens (notifications
      deliver a **sound** only — there is no background TTS).
- [ ] The permission prompt is deferred until after onboarding.

### Paywall / entitlements (M12) — **airplane mode**
- [ ] Children **never** see a purchase prompt anywhere.
- [ ] Mock subscribe unlocks premium locally; mock cancel reverts in one tap
      (behind the PIN gate).
- [ ] **Trial expiry with premium cosmetics equipped → ZERO visible change** to
      the buddy (also asserted by the unit test).
- [ ] Airplane mode confirms **no network/billing call**.

### Age-adaptive + tablet (M14)
- [ ] young ↔ older flip re-themes **every** kid screen (sizes, font, text-first,
      tabs vs single-surface, companion variant, celebration ceiling) with no
      crash and no token/progress/buddy reset.
- [ ] Both modes run the **full loop on a phone AND a tablet** (iPad + Android
      tablet); `contentMaxWidth` / `columns` / multi-column grids render (no
      stretched phone UI).

### Accessibility (M15)
- [ ] Triple-coded cues (icon + color + label); ~2cm touch targets; AA contrast;
      OS Reduce-Motion forces the gentle/calm celebration path.

---

## Feature-complete device-verify items (Waves A–D)

These landed after the M0–M15 baseline. Their pure logic + seams are unit-tested;
the items below are the on-device checks the CI floor cannot assert.

### Visual transition timers (M-B1)
- [ ] A timed step shows a depleting timer on the active step (wedge young / bar
      older); it stays wall-clock-correct across background → foreground → resume.
- [ ] Under OS Reduce-Motion the timer steps discretely (1 Hz), never a smooth sweep;
      it is never red / never flashes.
- [ ] Timer empty = calm rest: no auto-advance, no token/celebration change, and no
      sound unless the opt-in `timer.done` chime is ON (then exactly one soft ducking chime).

### Light verify + quick undo (M-B2)
- [ ] Done ALWAYS pays + advances immediately regardless of verify mode (verify never gates).
- [ ] The UndoBar after a non-last Done reverses the step (balance + status + run pointer)
      while leaving lifetime totals / streak / buddy growth unchanged.
- [ ] Optional photo-verify: the camera opens (permission string honest), the photo stays
      on-device, and re-verify / delete-child / restore removes the old photo file.
- [ ] The dashboard VerifyQueue is hidden when nothing awaits verify; a missing photo
      renders nothing (no broken-image icon).

### Child autonomy (M-B3)
- [ ] Flipping "customize companion" off hides Color/Finish/Accessory but keeps Name and
      strips NO owned cosmetic; `canPickReward:false` shows "Ask a grown-up 💛" (no lock/grey).
- [ ] Young "What next?" moves the chosen step to the front of the uncompleted run.

### Mood / energy check-in (M-B4)
- [ ] With mood logging OFF (default) there is no entry point and no insight anywhere.
- [ ] Turning it on surfaces the kid faces + parent glance; per-child consent disables it
      for one child without affecting siblings; tapping a face logs + warm thanks (no tokens).
- [ ] Insights show counts/timelines ONLY — never an interpretation ("anxious"/"trend down").

### Multi-child switcher + rotating chores (M-B5)
- [ ] Fast child switch re-themes + clears the active run + reconciles; per-child data is isolated.
- [ ] Exactly one chore task materialises for the day's holder (deterministic rotation),
      earns tokens like any step; removing a child prunes rosters; no leaderboard/comparison.

### Soundscapes (M-C1) — **use a real device (audio)**
- [ ] Calm corner offers curated scenes + a working persisted volume + on/off.
- [ ] A focus bed plays during a routine and stops on done/leave/background; it MIXES
      (ducks a podcast, never hijacks) — `setAudioModeAsync` is only in `sound.ts`.
- [ ] A selected premium scene keeps playing after trial expiry (acquisition-only downgrade).

### Breathing / regulation (M-C2)
- [ ] The bubble follows the active pattern (young 1 default / older 3-pattern chooser);
      phase labels stay in sync; grow advances one stage/cycle then rests, resets on leave.
- [ ] Completing a set fires NO token/confetti (only a positive rest mood); Reduce-Motion =
      static pose + 1 Hz label; the soundscape ducks, not stops.

### Focus intervals + active breaks (M-C3)
- [ ] Entry point only for older + parent toggle on; ring depletes smoothly / 1 Hz under
      Reduce-Motion; wall-clock correct across background.
- [ ] Block empty = no auto-complete / token change / alarm; movement prompt rotates
      deterministically; done shows no score/streak/target.

### Novelty & quests (M-C4)
- [ ] The weekly quest board + day-of-year spotlight are stable per local day (deterministic);
      reaching a target auto-grants the reward once and steps the celebration up.
- [ ] Calm mode / quests-off hides the whole layer; no countdown/expiry/urgency copy.

### If-then plans (M-C5)
- [ ] Author a plan in ≤4 taps (survives kill); a time plan fires a reminder suppressed in
      quiet hours + counted in the daily budget; afterStep/afterRoutine cues are non-blocking.
- [ ] The 3rd free plan shows a calm upsell (premium raises to 8); downgrade removes nothing.

### Clinician report + local backup/restore (M-D1) — run in **airplane mode**
- [ ] The 7d/30d report builds with exact counts; a multi-day gap reads "resting" / "best ever"
      (never "0" / "broken"); PDF + share work offline.
- [ ] **Export / restore / delete-all each demand the parent PIN** (not the math challenge).
- [ ] Export → wipe → import round-trips the data; a foreign/empty/canceled file changes nothing.
