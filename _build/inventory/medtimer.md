# MedTimer — Source Inventory

**Repo URL:** https://github.com/Futsch1/medTimer
**Also on:** [F-Droid](https://f-droid.org/packages/com.futsch1.medtimer/) · [Google Play](https://play.google.com/store/apps/details?id=com.futsch1.medtimer)
**License:** MIT (Copyright (c) 2024 Florian Fetz) — confirmed in `LICENSE`
**Stars:** ~541
**Last activity:** 2026-06-26 (last commit `2026-06-26`, pushed `2026-06-26`)
**Description match:** Confirmed — open-source Android medication reminder & history app, fully offline / privacy-focused, no ads. Not a namesake.

## Tech stack
- **Language:** Kotlin (Java interop in a few helpers)
- **Platform:** Android, `minSdk = 28`, `targetSdk = 36`
- **UI:** Hybrid — Jetpack Compose + Material 3 (newer screens: statistics, calendar) AND classic View/XML Fragments with AndroidX Navigation (medicine/overview/preferences)
- **DI:** Hilt
- **Persistence:** Room (SQLite) for medical data; DataStore (Preferences) for settings
- **Background:** AlarmManager + BroadcastReceivers + foreground service for reminder scheduling
- **Build:** Gradle Kotlin DSL, multi-module, product flavors `foss` vs `full` (optional Google location services)
- **Notable libs:** kizitonwose Calendar, androidplot (charts), SimplyPDF, evrencoskun TableView, preferencex-android, IconDialog, HSV-Alpha color picker
- **Quality:** Mockito + Robolectric tests, SonarCloud, qlty, OpenSSF scorecard

## Top-level layout
```
app/                       # Application module: MainActivity, navigation, app intro, biometrics, backup
core/
  core:domain              # Repository interfaces + domain models (Medicine, Reminder, ReminderEvent, Tag...)
  core:database            # Room entities, DAOs, repository impls, migrations
  core:datastore           # DataStore preferences + persistent data
  core:common              # Shared utilities
  core:ui                  # Shared UI resources (drawables, strings, mipmaps, translations)
feature/
  feature:reminders        # Scheduling engine, notifications, alarms, snooze, location geofence
  feature:ui               # Screens: overview, medicine editor, statistics, calendar, preferences, exporters
docs/                      # UseCases.md, reminder_flow.md
fastlane/                  # Store metadata + screenshots
gradle/ , build.gradle.kts , settings.gradle.kts
```

## Reusable for Tiny Bubbles (kids ADHD app)

Strong fits (lift mostly as-is, re-theme for kids):

- **Offline reminder/scheduler engine** — `feature/reminders/scheduling/` (`ReminderScheduler.kt`, `StandardScheduling.kt`, `IntervalScheduling.kt`, `WindowedIntervalScheduling.kt`, `SchedulingFactory.kt`, `SchedulingSimulator.kt`, `WeekendModeSchedulingDecorator.kt`) plus `feature/reminders/ReminderSchedulerService.kt`, `AlarmProcessor.kt`, `ScheduleNextReminderNotificationProcessor.kt`. A battle-tested offline (no-internet) recurring reminder engine — directly repurposable for kids' routine/task/med reminders.
- **Notification builder + channels** — `feature/reminders/notificationFactory/` (`ReminderNotificationFactory.kt`, `BigReminderNotificationFactory.kt`, `SimpleReminderNotificationFactory.kt`, `NotificationStringBuilder.kt`) and `ReminderNotificationChannelManager.kt`. Reusable notification/reminder scheduler layer.
- **Full-screen attention-grabbing alarm** — `feature/reminders/alarm/` (`ReminderAlarmActivity.kt`, `AlarmFragment.kt`) + `NotificationSoundManager.kt`. A loud, hard-to-miss cue — valuable for ADHD kids who miss subtle notifications.
- **Snooze / repeat logic** — `feature/reminders/SnoozeProcessor.kt`, `RepeatProcessor.kt`, `LocationSnoozeProcessor.kt`. "Remind me again" behavior for task follow-up.
- **Habit-streak / adherence calendar** — `feature/ui/statistics/calendar/` (`CalendarContent.kt`, `DayCell.kt`, `CalendarNavigationRow.kt`, `DayEventsCard.kt`) + `CalendarFragment.kt`, `CalendarEventsProvider.kt`. Compose calendar of completed/missed events — directly usable as a habit-streak calendar.
- **Progress charts** — `feature/ui/statistics/charts/` (`ChartsContent.kt`, `ChartsPresenter.kt`, `ChartSeriesColors.kt`) + `StatisticsScreen.kt`. Reframe adherence charts as reward/progress visualization.
- **Task-completion (confirm/dismiss) actions** — `feature/ui/overview/actions/` (`Actions.kt`, `ActionsFactory.kt`, `ReminderEventActions.kt`, `ReminderEventCreator.kt`). The "mark taken / skip" interaction maps cleanly to "mark task done" → trigger a reward.

Useful scaffolding:

- **Offline-first clean architecture skeleton** — `core:domain` (repository interfaces + models), `core:database` (Room: `MedicineRoomDatabase.kt`, DAOs, migrations in `core/database/schemas/`), `core:datastore` (DataStore prefs). A privacy-by-design, no-network data layer template.
- **Settings / theming framework** — `feature/ui/preferences/` (`DisplaySettingsFragment.kt` for theme, `NotificationSettingsFragment.kt`, `PreferencesFragment.kt`). Settings/theming scaffold; plus the bundled HSV color picker + IconDialog libs (good for letting a kid pick avatar colors/icons).
- **Onboarding & app lock** — `app/.../MedTimerAppIntro.kt` (intro flow), `app/.../Biometrics.kt` (biometric lock → reuse as a parent gate).
- **Backup / export** — `app/src/main/java/com/futsch1/medtimer/database/backup/` (JSON backup/restore) and `feature/ui/exporters/` (CSV + PDF export). Useful for parent reports / data portability.

Gaps — NOT present in MedTimer, must be built fresh for Tiny Bubbles:
- Gamification / reward / points system
- Companion character / mascot
- Mood logging UI
- Task-breakdown (chunking a task into sub-steps)
These would need new implementation; MedTimer only offers the reminder/scheduling/tracking foundation underneath them.
