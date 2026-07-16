# Interactive Companion / Virtual Pet / Character Animation — Source Inventory (v2)

**Category:** interactive companion / virtual pet / character animation
**Goal for Tiny Bubbles v2:** make **Bloop** (the super-guardrailed LLM kid companion) a lively, interactive, kid-loved character — a chat surface for the moderated LLM conversation plus an expressive, reactive on-screen character.
**Stack target:** Expo SDK 56 / React Native / TypeScript.
**Date:** 2026-07-09
**Cloned to:** `/Users/ameyakashid/Desktop/adhd india/_sources2/`

## Summary of picks

| Repo | Role | License | Cloned? |
|---|---|---|---|
| **FaridSafi/react-native-gifted-chat** | Chat UI for the Bloop conversation | **MIT** | ✅ yes |
| **rive-app/rive-react-native** | Interactive, state-machine-driven character (reacts to inputs/mood/events) | **MIT** | ✅ yes |
| **lottie-react-native** | Expressive keyframe character animations (idle loops, emotions, celebrations) | **Apache-2.0** | ✅ yes |

All three are permissive (MIT/Apache-2.0), actively maintained (all pushed within days of 2026-07-09), and directly in the Expo/RN/TS stack. Licenses were verified from the `LICENSE` file on disk, not just repo metadata.

---

## 1. react-native-gifted-chat

### Identity
- **Repo URL:** https://github.com/FaridSafi/react-native-gifted-chat
- **Tagline:** "The most complete chat UI for React Native."
- **License:** **MIT** — verified on disk (`LICENSE`, "The MIT License (MIT), Copyright (c) 2019 Farid from Safi").
- **Stars:** ~14.4k
- **Last activity:** pushed 2026-07-09 (very active).
- **Primary language:** TypeScript
- **Version:** 3.4.1 (package.json shows dev-tested against React 19.2 / RN 0.85; peerDeps `react >=18`, `react-native *`).

### Tech stack
- Pure React Native + TypeScript component library (no native modules of its own).
- Fully render-prop customizable: every sub-component can be replaced.
- Peer deps are RN core + a few common libs (e.g. `react-native-communications`, dayjs). No backend assumptions — you feed it a `messages[]` array and an `onSend` callback.

### Top-level layout
```
src/
  GiftedChat/        main component (index.tsx, types.ts, styles.ts) — the props surface
  Bubble/            message bubble (customizable per-side)
  MessageText.tsx    text rendering (+ linkParser.tsx)
  MessageImage/Audio/Video.tsx   rich media messages
  Composer.tsx       text input
  InputToolbar.tsx   input bar container
  Send.tsx           send button
  QuickReplies.tsx   tappable canned-reply chips
  Reactions/ Reply/  message reactions + reply-to
  TypingIndicator/   animated "… is typing" bubble
  Avatar.tsx / GiftedAvatar.tsx   sender avatars
  Actions.tsx        "+" attachment/actions menu
  Day.tsx Time.tsx SystemMessage.tsx  chrome
example/             full runnable Expo + bare examples (example-expo, example-gifted-chat, example-slack-message)
```

### Reusable for Tiny Bubbles v2 (concrete pointers)
- **Bloop conversation surface (core):** `src/GiftedChat/index.tsx` + `src/GiftedChat/types.ts`. Drive it from the server-side moderation proxy: append the model's moderated reply to `messages`, show the guardrail state via `isTyping` while the proxy runs input→moderation→model→output-moderation.
- **Typing indicator = "Bloop is thinking":** `src/TypingIndicator/` — free, animated "thinking" affordance that masks proxy latency and reads as the character being alive.
- **Kid-safe tappable replies (big guardrail win):** `src/QuickReplies.tsx` (+ `onQuickReply`). Offer curated tap-to-say chips instead of free typing for younger kids — directly supports the **input-scoping / PII-refusal** guardrail (fewer free-text openings) and doubles as an **AAC-style** communication affordance.
- **Custom Bloop bubble + avatar (character identity):** override `renderBubble`, `renderAvatar`, `renderMessageText`, `renderChatFooter` (props in `src/GiftedChat/types.ts` ~L105–130). Put the Rive/Lottie Bloop as the avatar or in the chat footer so the character reacts to the message being shown.
- **AAC / picture-message support:** `src/MessageImage.tsx`, `src/Actions.tsx` — for symbol/picture messages (communication boards) rather than text-only.
- **Parent transcript visibility:** the `messages[]` model (`src/Models.ts` / `types.ts`) is a plain serializable array — persist it to Firestore for the required **parent transcript visibility** and **crisis-escalation** review.
- **Runnable reference:** `example/example-expo/` shows an end-to-end Expo wiring (custom actions, custom views, quick replies) — the fastest way to see the props in action.

### Adaptation caveats
- It is a UI shell only — it has **no moderation, no LLM, no safety**. All of Bloop's guardrails (input/output moderation, PII refusal, topic-scoping, crisis-escalation, on/off) live in your server-side proxy; gifted-chat just renders what you approve.
- Prefer `QuickReplies`/curated input for young kids; gate free-text `Composer` behind age/parent settings.
- Re-theme bubbles/typography to the bright kid palette; strip the default Slack/adult example styling.

---

## 2. rive-react-native

### Identity
- **Repo URL:** https://github.com/rive-app/rive-react-native
- **Tagline:** "Rive React Native" — official RN runtime for Rive interactive animations.
- **License:** **MIT** — verified on disk (`LICENSE`, "MIT License, Copyright (c) 2020 TMaszko").
- **Stars:** ~779
- **Last activity:** pushed 2026-07-09 (very active).
- **Primary language:** TypeScript (wraps native iOS/Android Rive runtimes).
- **Version:** 9.8.3.

### Tech stack
- Native RN module wrapping the open-source Rive iOS/Android runtimes; exposes a `<Rive>` component + `useRef` imperative API.
- Loads `.riv` files (from bundled asset or URL); supports **artboards, state machines, inputs (bool/number/trigger), events, data binding, nested inputs, text runs, responsive layout**.
- Requires a config plugin / native build (works with Expo dev client, not Expo Go).

### Top-level layout
```
src/
  Rive.tsx      component + props (autoplay, fit, alignment, artboardName, stateMachineName, onStateChanged, onError)
  types.ts      RiveRef API: fireState, setInputState, fireStateAtPath, setInputStateAtPath, Fit, Alignment enums
  index.tsx     exports
example/
  app/(examples)/   StateMachine.tsx, NestedInputs.tsx, Events.tsx, DataBinding.tsx,
                    SimpleControls.tsx, DynamicText.tsx, MultipleArtboards.tsx, Layout.tsx,
                    ResponsiveLayout.tsx, QuickStart.tsx, Simple.tsx, ...
  assets/rive/      avatars.riv, blinko.riv   (character sample files)
  ios/Assets/       many sample .riv (rewards.riv, rating.riv, bird.riv, skills_listener.riv,
                    nested_inputs.riv, avatars.riv, ...)
  android/ ios/     full native example apps
```

### Reusable for Tiny Bubbles v2 (concrete pointers)
- **The lively, reactive Bloop character (primary reuse):** `src/Rive.tsx` + `src/types.ts`. A Rive state machine is the ideal way to make Bloop *feel alive and interactive* — one `<Rive>` instance can idle-breathe, blink, and switch to happy / listening / thinking / celebrating states driven by app events. This is a big step up from static sprites.
- **Drive Bloop from app/chat state:** the `RiveRef` API in `src/types.ts` — `fireState(machine, trigger)` and `setInputState(machine, input, value)`. Map: proxy request in → "thinking" input; moderated reply shown → "talking"; kid completes a first-then/task → "celebrate" trigger; zones-of-regulation selection → set a "mood" number input. Read back state via `onStateChanged` (`Rive.tsx` ~L398/L439).
- **Copy-paste interactive patterns:** `example/app/(examples)/StateMachine.tsx` (mood/state switching), `NestedInputs.tsx` (multi-part characters), `Events.tsx` (character emits events back to JS — e.g. tap-to-react), `SimpleControls.tsx` (play/pause/trigger buttons), `DynamicText.tsx` (put the kid's name / Bloop's speech into the artboard).
- **Ready-made character assets to prototype with:** `example/assets/rive/avatars.riv`, `example/assets/rive/blinko.riv`, and `example/ios/Assets/{bird,rewards,rating,skills_listener}.riv`. Use `blinko`/`avatars` as a Bloop stand-in during build before commissioning bespoke Rive art.
- **Reward/celebration moment:** `rewards.riv` + a `celebrate` trigger fits the ADHD/autism positive-reinforcement loop (task done, first-then complete).

### Adaptation caveats
- Needs an **Expo dev client / native build** (custom native module) — not Expo Go. Fine for Expo SDK 56 with a config plugin.
- The real Bloop `.riv` art must be authored in the Rive editor; the bundled `.riv` files are demos/placeholders only (treat their art as sample assets, not final Bloop identity).
- Heavier than Lottie (native runtime, larger footprint); justified only because we want *interactivity* (state machines), not just playback.

---

## 3. lottie-react-native

### Identity
- **Repo URL:** https://github.com/lottie-react-native/lottie-react-native
- **Tagline:** "Lottie wrapper for React Native."
- **License:** **Apache-2.0** — verified on disk (root `LICENSE`, Apache License Version 2.0). Permissive; requires attribution + NOTICE preservation.
- **Stars:** ~17.2k
- **Last activity:** pushed 2026-07-08 (very active).
- **Primary language:** Kotlin/native wrapper with TS API (monorepo root package `monorepo-root` @ 7.3.8).
- **Structure:** monorepo — `packages/core` is the publishable `lottie-react-native`.

### Tech stack
- Native RN wrapper around Airbnb's Lottie (renders After Effects / `.json` (bakot) + `.lottie` animations).
- Simple declarative `<LottieView source={...} autoPlay loop />` plus imperative play/segment control; supports dynamic text and color/property overrides.
- Works with Expo via the config plugin (dev client).

### Top-level layout
```
packages/
  core/            the shippable lottie-react-native library (TS API + native)
example/
  animations/      DynamicText.json, Watermelon.json, LottieLogo1.json  (sample animations)
  app.json         Expo example config
  ios/ android/ macos/ visionos/   platform example apps
docs/
```

### Reusable for Tiny Bubbles v2 (concrete pointers)
- **Expressive, low-cost Bloop animations & micro-feedback:** `packages/core` (`<LottieView>`). Cheapest way to add polish — idle bob, blink, happy wiggle, sparkle/confetti on reward, "breathing" calm animation for the sensory/regulation tools. Great where full state-machine interactivity (Rive) is overkill.
- **Emotion / zones-of-regulation faces:** drop a small set of Lottie face loops (calm/blue, happy/green, frustrated/yellow, big-feelings/red) as the selectable mood art in the zones-of-regulation and emotion features.
- **Reward/celebration overlays:** a looping/one-shot Lottie confetti or star-burst for task/first-then completion — pairs with gifted-chat's message flow and the positive-reinforcement model.
- **Dynamic speech/name in-animation:** `example/animations/DynamicText.json` demonstrates runtime text replacement — usable to render the kid's name or a short Bloop line inside an animation.
- **Sourcing art:** thousands of free/CC Lottie files exist (LottieFiles) — pick kid-friendly ones and re-color to the Bloop palette; the repo's `example/animations/*.json` are the format reference.

### Adaptation caveats
- **Apache-2.0 (not MIT):** keep the `LICENSE`/`NOTICE` and attribute. Still fully OK to ship.
- Lottie plays timelines; it is **not interactive** the way Rive is. Use Lottie for expression/ambience, Rive for *reactive* character behavior driven by chat/app state. (You can ship both, or start Lottie-only and upgrade Bloop to Rive later.)
- Each Lottie animation is a separate authored `.json`/`.lottie` asset — you provide the art; the library just plays it.

---

## Reference-only (NOT cloned to ship)

These were considered for the "virtual pet / Tamagotchi" angle but were not clone-to-ship: wrong stack, low quality, or unverified license. Use only for *game-loop / care-mechanic* concept inspiration (feed/play/rest stats, needs-decay-over-time), which could theme Bloop's engagement loop.

- **SeakMengs/WindowPet** — https://github.com/SeakMengs/WindowPet — desktop pet-overlay companion (Tauri + React, **not React Native**; license not verified this session). Reference only for on-screen companion/pet-behavior ideas.
- **elisavetTriant/tamagotchi-virtual-pet**, **kmgarvey279/Tamagotchi-React**, **erinmikailstaples/Reactigotchi** — https://github.com/topics/tamagotchi-game — React **web** (not RN) Tamagotchi clones; small/educational, licenses unverified. Reference only for the care-loop mechanic (hunger/happiness/cleanliness stats + mini-games).
- **rive-app/awesome-rive** — https://github.com/rive-app/awesome-rive — curated list of Rive runtime examples/tutorials (resource, not shippable code). Good for finding kid-character `.riv` examples and state-machine patterns.
- **nandorojo/moti** — https://github.com/nandorojo/moti — declarative **react-native-reanimated** animation helper. **License: MIT — verified 2026-07-09 via GitHub LICENSE (Copyright 2022 Fernando Rojo).** This is the "reanimated" option the brief calls out: use it for cheap, code-driven Bloop micro-motion (bounce on tap, wiggle, breathing scale, enter/exit springs) without authoring a Rive/Lottie asset. Good middle ground between static art and a full Rive state machine; safe to ship. (Not cloned — small, well-documented, and pulled via npm; noted here so the reanimated angle is covered.)
- **margelo/react-native-skottie** — https://github.com/margelo/react-native-skottie — Skia/Skottie GPU-accelerated **drop-in alternative Lottie player** (plays the same `.json`/`.lottie` files, higher FPS / lower CPU). **License: MIT — verified 2026-07-09 via GitHub.** Reference-only alternative to `lottie-react-native` if Bloop's animation count grows and playback perf on low-end Android matters; same art assets, different renderer. Requires Skia native build (Expo dev client).

---

## How the picks fit together (assembly note for Bloop)

1. **Chat frame:** `react-native-gifted-chat` renders the Bloop conversation; `QuickReplies` for kid-safe tappable input; `TypingIndicator` = "Bloop is thinking" while the moderation proxy runs; persist `messages[]` to Firestore for parent transcript visibility.
2. **Live character:** embed a **Rive** `<Rive>` Bloop (idle/thinking/talking/celebrate state machine) as the chat avatar/header, driven by `fireState`/`setInputState` from chat + task events.
3. **Expression & rewards:** layer **Lottie** for cheap emotion faces (zones-of-regulation), calming/sensory loops, and celebration confetti.
4. **Safety stays server-side:** none of these libraries provide moderation; all guardrails (input/output moderation, PII refusal, topic-scoping, crisis-escalation-to-parent, on/off) remain in the Cloud Functions proxy. These repos only render approved content.
