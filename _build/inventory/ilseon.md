# Ilseon — Source Inventory

- **Repo URL:** https://github.com/cladam/ilseon
- **Author:** cladam (Claes Adamsson)
- **License:** MIT (LICENSE file; SPDX `MIT`, "Copyright (c) 2025 Claes Adamsson")
- **Stars:** 12
- **Last activity:** code pushed 2026-03-28; repo metadata updated 2026-06-15
- **Default branch:** main
- **Local clone:** `/Users/ameyakashid/Desktop/adhd india/_sources/ilseon`

## What it is
A low-friction, distraction-minimal **executive function assistant** for neurodivergent / ADHD users.
Korean 일선 ("front line" / "immediate priority"). Filters focus to one context and one priority task
at a time; quick text + voice capture; idea inbox; gentle (haptic/visual) reminders; momentum analytics.
Confirmed match for the target description (Android, ADHD/executive-function, MIT).

## Tech stack
- **Language:** Kotlin
- **UI:** Jetpack Compose (Material3, Glance app widgets, Accompanist pager, compose-markdown, Coil)
- **Architecture:** MVI (Model-View-Intent), StateFlow / Kotlin Flow + Coroutines
- **DI:** Hilt (Dagger)
- **Persistence:** Room (with schema export)
- **Scheduling:** Android `AlarmManager` + WorkManager
- **AI (optional):** Google Generative AI (Gemini) for voice transcription + task extraction
- **Wear OS:** companion `wear` module (tiles, complications, data sync)
- **minSdk 24, targetSdk 36**

## Top-level layout
```
app/                  Main Android app module
  src/main/java/com/ilseon/
    data/             Room entities/DAOs/repos: task, idea, voicememo, userstatus, vtt, EnergyLevel
    di/               Hilt modules
    notifications/    AlarmManager reminder scheduling + notification helpers/tiers
    service/          Haptics, sound, recording, speech transcription, fuel-check triggers
    ui/components/    Reusable Compose widgets (timer, streak, cards, dialogs, swipe)
    ui/screen/        Feature screens (dashboard, focus, reflect, analytics, capture, inboxes)
    ui/onboarding/    Onboarding flow
    ui/theme/         Colour / Theme / Type (muted low-sensory palette)
    util/             StopWords, UsageStatsReader
    widget/           Glance home-screen priority widget
  src/main/res/raw/   Notification sounds (critical_alert.mp3, mid_block_warning.mp3)
wear/                 Wear OS module (tiles, complications, listener services)
docs/  images/  gradle/   Docs, screenshots, gradle wrapper
build.gradle.kts, settings.gradle.kts, LICENSE, README.md
```

## Reusable for Tiny Bubbles (kids ADHD)
Pointers are relative to `_sources/ilseon/`.

- **Timer engine (visual countdown):** `app/src/main/java/com/ilseon/ui/components/VisualCountdownTimer.kt`
  — Canvas-based animated countdown ring with color animation; ideal base for a kid-friendly focus/brush-teeth timer.
- **Habit / streak gamification:** `app/src/main/java/com/ilseon/ui/components/StreakIndicator.kt`
  — tiered streak badges (Star, breathing pulse at 5, Mastery badge at 7+); easy to reskin into bubble/reward levels.
  Momentum/reward timeline: `app/src/main/java/com/ilseon/ui/screen/MomentumTimeline.kt`,
  `AnalyticsViewModel.kt`, `data/task/AnalyticsRepository.kt`.
- **Mood / energy logging UI ("Fuel Check"):** `app/src/main/java/com/ilseon/ui/screen/FuelCheckScreen.kt`,
  `data/EnergyLevel.kt` (High/Medium/Low + color mapping), `ui/EnergyLevelMapper.kt`,
  `data/userstatus/UserStatus*.kt`, scheduling via `notifications/FuelCheckScheduler.kt` +
  `service/FuelCheckTriggerManager.kt`. Reskin High/Med/Low into kid emoji moods.
- **Notification / reminder scheduler:** `app/src/main/java/com/ilseon/notifications/ReminderManager.kt`
  (AlarmManager, tiered nudge/warning/nagging timing), `ReminderBroadcastReceiver.kt`,
  `NotificationHelper.kt`, `NotificationTier.kt`, `NotificationActionReceiver.kt`. Solid base for gentle
  kid reminders ("time to start").
- **Haptics + sound feedback (rewards):** `app/src/main/java/com/ilseon/service/HapticManager.kt`
  (nudge/warning/alert/success/nagging vibration patterns) and `service/SoundManager.kt` +
  `res/raw/*.mp3`. Drop-in tactile/audio reward feedback for completing tasks.
- **Task-breakdown logic:** sub-tasks model in `data/task/Task.kt` + `TaskRepository.kt`; AI extraction into
  structured subtasks in `data/task/ExtractedTask.kt` (ExtractedTasks/TaskInfo: title/priority/effort) with
  `service/SpeechTranscriber.kt`. Useful for "break a chore into tiny steps".
- **Quick / voice capture (low-friction input):** `ui/screen/QuickCaptureSheet.kt`, `ui/screen/RecorderScreen.kt`,
  `RecorderViewModel.kt`, `service/RecordingService.kt`, `data/vtt/VttManager.kt`. Low-friction capture maps
  well to a kid "tell me what you did" flow.
- **Settings / theming:** `ui/theme/Colour.kt`, `Theme.kt`, `Type.kt` (muted low-sensory palette + energy
  colors), `ui/screen/SettingsScreen.kt`, `SettingsViewModel.kt`, `data/task/SettingsRepository.kt`.
  Reusable theming scaffold; swap muted adult palette for bright kid colors.
- **Onboarding flow:** `ui/onboarding/OnboardingScreen.kt`, `OnboardingSlide.kt`, `OnboardingManager.kt`,
  `OnboardingViewModel.kt` (Accompanist pager). Good base for a kid intro / character tutorial.
- **Reusable Compose UI bits:** `ui/components/` — `AppCard.kt`, `AnimatedTaskItem.kt`,
  `GravitySwipeBox.kt` (swipe-to-complete), `DayPicker.kt`, `TimePickerDialog.kt`, `EditTaskDialog.kt`,
  `ReflectionDialog.kt`, `MarkdownText.kt`/`HtmlText.kt`.
- **Home-screen widget + Wear tiles:** `app/.../widget/PriorityWidget.kt` (Glance) and `wear/` tiles/complications —
  reference for a glanceable "current bubble task" surface (likely lower priority for a kids app).

### Notes
- No built-in **companion character** mascot exists; would need to be created (onboarding + StreakIndicator are
  the closest scaffolds to attach one to).
- The aesthetic is deliberately muted / low-stimulation for adults — for a "polished, engaging" kids app the
  theme (`ui/theme/`) and animations would need brightening, but the structural logic (timer, streaks,
  reminders, mood logging, haptics) ports directly.
- Optional Gemini AI features require an API key; speech-to-text task extraction degrades gracefully without it.
