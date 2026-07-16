# Dose Android — Source Inventory

- **Repo URL:** https://github.com/waseefakhtar/dose-android
- **Clone location:** `/Users/ameyakashid/Desktop/adhd india/_sources/dose-android`
- **License:** MIT (Copyright (c) 2022 Waseef Akhtar) — confirmed in `LICENSE`
- **Stars / Forks:** ~631 stars / ~107 forks
- **Last activity:** repo pushed 2025-12-03; HEAD of `main` in shallow clone = 2025-02-15 (`Merge pull request #170 … config/firebase-dev-appid`)
- **Author / pedigree:** Waseef Akhtar; featured in Google Dev Library, MAD Scorecard, on Google Play (`com.waseefakhtar.doseapp`). This is the canonical original "Dose" app (not a namesake fork such as `Samiullah-Popalzai/Dose_Medication_Reminder_App`).

## Verification
Matches the target description exactly: Kotlin + Jetpack Compose, Material Design 3, MVVM + Clean Architecture, Room, Hilt, Firebase, MIT license. Topics on GitHub: `android, clean-architecture, jetpack-compose, kotlin, material-design, mvvm-android`.

## Tech Stack
- **Language:** Kotlin (JDK 17, minSdk 21)
- **UI:** Jetpack Compose, Material 3, Navigation Compose, Accompanist Permissions
- **Architecture:** MVVM + Clean Architecture (data / domain / feature layering, UseCases, repository pattern)
- **DI:** Hilt (+ KSP)
- **Persistence:** Room (KSP, schema export under `app/schemas`)
- **Reminders:** Android `AlarmManager` exact alarms + `BroadcastReceiver` + notification channel (no WorkManager)
- **Backend / telemetry:** Firebase Analytics + Crashlytics
- **Other:** Gson, OkHttp (+ logging interceptor), Kotlin Coroutines
- **Build:** Gradle Kotlin DSL with version catalog (`gradle/libs.versions.toml`)
- **i18n:** `generateLocaleConfig=true`; translations in `values-es`, `values-fa`, `values-b+it`

## Top-Level Layout
```
build.gradle.kts, settings.gradle.kts, gradle.properties, gradlew(.bat)
LICENSE, README.md
.github/        CI workflows (Android CI)
docs/           store/screenshot images
gradle/         wrapper + libs.versions.toml version catalog
app/
  build.gradle.kts
  src/main/AndroidManifest.xml  (POST_NOTIFICATIONS, SCHEDULE_EXACT_ALARM, receiver)
  src/main/res/                 values + values-es/-fa/-b+it, drawables, mipmaps
  src/main/java/com/waseefakhtar/doseapp/
    App.kt                            (Application, notification channel)
    MainActivity / navigation         app entry + nav graph
    MedicationNotificationService.kt  (AlarmManager scheduling)
    MedicationNotificationReceiver.kt (fires the notification)
    analytics/    AnalyticsHelper, AnalyticsEvents
    core/navigation/  DoseNavigationDestination, NavigationConstants
    data/         entity (MedicationEntity), mapper, repository
    domain/       model (Medication), repository (interfaces)
    di/           Hilt modules
    extension/    Kotlin extensions
    util/         DurationFormatter, FrequencyUtil, MedicationType, SnackbarUtil, TimeUtils, Utils
    ui/theme/     Color, Theme, Type (Material3)
    feature/
      home/             HomeScreen, MedicationCard, daily-overview card, viewmodel, usecases, CalendarDataSource
      calendar/         CalendarScreen, viewmodel/state
      addmedication/    AddMedicationRoute, Time/Date picker dialogs, viewmodel
      medicationconfirm/ confirm "taken" flow, AddMedicationUseCase
      medicationdetail/  detail screen + usecase
      history/          HistoryScreen, viewmodel/state
```

## Reusable for Tiny Bubbles (kids ADHD)
- **Reminder / notification scheduler (highest value):** `app/src/main/java/com/waseefakhtar/doseapp/MedicationNotificationService.kt` (exact `AlarmManager` alarms keyed by item id), `MedicationNotificationReceiver.kt`, channel setup in `App.kt`, and `AndroidManifest.xml` perms (`POST_NOTIFICATIONS`, `SCHEDULE_EXACT_ALARM`). Drop-in engine for kid task/routine reminders.
- **Recurring frequency engine:** `util/FrequencyUtil.kt` — `Frequency` enum (everyday, every N days, weekly, every N weeks, monthly) + `getFrequencyList()`/`fromDays()`. Reuse directly for recurring daily routines / habits.
- **Habit calendar / date strip UI:** `feature/home/data/CalendarDataSource.kt` + `feature/home/model/CalendarModel.kt` + `feature/calendar/CalendarScreen.kt` (+ `viewmodel/CalendarState.kt`). Horizontally scrollable day selector — re-skin as a habit/streak calendar.
- **Daily progress overview card:** `feature/home/HomeScreen.kt` (`DailyOverview`, ~lines 150–200) shows "X of Y done today". This is the seed for a gamified completion/reward meter — swap the count for stars/bubbles earned.
- **Add-task wizard with time & date pickers:** `feature/addmedication/` — `TimePickerDialogComponent.kt`, `DateRangePickerDialog.kt`, `EndDatePickerDialog.kt`, `AddMedicationRoute.kt`, `viewmodel/AddMedicationViewModel.kt`. A medication can hold multiple `CalendarInformation` times/day → reuse as multi-step task setup / task-breakdown into timed sub-steps.
- **Mark-done + history log:** `feature/medicationconfirm/` (confirm-taken flow, `AddMedicationUseCase`) and `feature/history/` (`HistoryScreen` + viewmodel/state). Foundation for "I did it" logging and a history/adherence view — extendable to mood logging.
- **Theming:** `ui/theme/` (`Color.kt`, `Theme.kt`, `Type.kt`) Material3 theme + typography. Re-skin to a playful kids palette; structure is ready for light/dark/dynamic color.
- **Clean Architecture scaffold:** `data/` + `domain/` + `di/` layering with Room entity↔domain `mapper`, repository interfaces, and `usecase/` classes (`GetMedicationsUseCase`, `UpdateMedicationUseCase`, `AddMedicationUseCase`, `GetMedicationUseCase`). Reuse the whole skeleton; rename Medication → Task/Routine.
- **Typed items with icons:** `util/MedicationType.kt` + `res/drawable/ic_*` (tablet, capsule, syrup, drops, gel, spray). Pattern for category-with-icon — repurpose as task categories or companion/sticker assets.
- **Analytics wrapper:** `analytics/AnalyticsHelper.kt` + `AnalyticsEvents.kt` — clean abstraction over Firebase event logging; reuse to measure kid engagement.
- **Localization infra:** `generateLocaleConfig` + `values-es`/`-fa`/`-b+it` show a working multi-language setup to copy.

## Gaps (must be built, not present here)
No gamification/reward system, no companion character, and no mood logging. Closest analogs to build on: the daily-progress overview card (→ rewards) and the history screen (→ mood/adherence log). Reminder scheduling uses `AlarmManager` (not WorkManager), so reboot-persistence (`BOOT_COMPLETED` rescheduling) would need to be added.
