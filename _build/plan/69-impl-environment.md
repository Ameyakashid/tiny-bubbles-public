# Tiny Bubbles — Implementation Environment & Adaptations (doc 69)

*Authoritative environment notes for the IMPLEMENTATION phase. Where these conflict with docs 60–68 on toolchain/SDK/storage specifics, **this doc wins** (the product/UX/anti-shame/license rules in 66 still fully apply).*

## Build environment (this machine)
- macOS, **Node 26**, npm 11.12.1. Scaffold + `npm install` confirmed working on Node 26.
- **NO native mobile toolchain:** no Xcode (CLT only), no CocoaPods, no Android SDK/Java, no simulators, no watchman.
- **Consequence:** we CANNOT build a native dev client or run on a device/simulator here. We CANNOT run any custom native module (e.g. MMKV) in this environment.

## Locked environment adaptations
1. **Expo SDK 56** (RN 0.85.3, React 19.2.3, TypeScript ~6.0.3) — from `create-expo-app@latest`. The plan said SDK 54; we use 56 (current). Architecture is SDK-agnostic.
2. **Install discipline:** use `npx expo install <pkg>` for every Expo/native/SDK-coupled lib (it resolves the version compatible with the installed SDK). Use plain `npm install` only for pure-JS libs (zustand, date-fns, dev tooling). **Do NOT hardcode the plan's SDK-54 version pins** (react-native-svg@15.12.1, bottom-sheet pin, etc.) — let `expo install` choose.
3. **Storage default = AsyncStorage** (`@react-native-async-storage/async-storage`) behind the doc-60 `storage` port. **MMKV is optional**, documented in README as a perf upgrade for users who build a dev client. This keeps the storage-port architecture intact AND makes the app Expo-Go-runnable.
4. **Expo Go is the primary run target.** With AsyncStorage default, the app uses NO custom native modules, so it runs in **Expo Go** (`npx expo start`, scan QR) with no Xcode/Android Studio. Keep it that way: if any lib would require a dev client, prefer an Expo-Go-compatible alternative or gate it behind the storage-port pattern.
5. **Local notifications only** (expo-notifications). Accept Expo Go's local-notification caveats; document them.

## Verification floor (what agents MUST run; replaces "physical device" acceptance here)
- `npx tsc --noEmit` — must pass (full type safety; this is the main correctness gate across the shared codebase).
- `npm test` — jest-expo unit tests for pure domain logic (gamification, streaks, reinforcement, companionMood, tokens, tasks). This is where the real logic is proven. Set up jest-expo in M0.
- `npx expo export --platform web` — must complete without error (catches import/runtime bundling problems for the web subset). Use this instead of a long-running `expo start` inside agents.
- Grep gates (anti-shame, license, over-claiming, age-prop) per doc 66 §7.
- **Device-only acceptance** (haptic/audio latency, real-device audio ducking, TTS voice availability, on-device gestures): WRITE the code + the runnable sandbox/screens, mark these acceptance items as **"user-verify in Expo Go"** in a RUN.md. Do not claim they passed.

## Working directory
- Project root: `/Users/ameyakashid/Desktop/adhd india/tiny-bubbles` (note the SPACE — always quote in shell).
- Already scaffolded (SDK 56 blank-TS template, deps installed). M0 converts it to the expo-router structure in doc 66 §2 and adds NativeWind/Reanimated/config/license artifacts + jest-expo.

## Deliverable definition ("fully working" in this environment)
A complete, type-checked, unit-tested Expo SDK 56 codebase implementing all milestones, **runnable by the user in Expo Go** (and as a web subset), with a `RUN.md` explaining how to run + which acceptance items need on-device verification. Native dev-client/MMKV/app-store billing are documented optional next steps.
