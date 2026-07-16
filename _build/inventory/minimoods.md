# MiniMoods — Source Inventory

- **Repo URL:** https://github.com/CampbellMG/MiniMoods
- **License:** MIT (Copyright (c) 2021 CampbellMG) — confirmed in `LICENSE` and GitHub API (`spdx_id: MIT`)
- **Stars:** 32
- **Last activity:** last commit / push 2024-07-21 (repo metadata updated 2026-06-12); versionName 1.1.1
- **Local clone:** `/Users/ameyakashid/Desktop/adhd india/_sources/minimoods`
- **Verified match:** ad-free, open-source, no-frills Android mood tracker with monthly calendar, CSV export, home-screen widget, dark mode. Matches the target description (not a namesake).

## Tech Stack

- **Language:** Kotlin (minSdk 21, targetSdk/compileSdk 34, JDK 17)
- **Build:** Gradle (Groovy DSL), `com.android.application`, `kotlin-kapt`
- **Architecture:** MVVM + Hilt (Dagger) DI, coroutines, LiveData
- **UI:** Mostly XML layouts + DataBinding; partial Jetpack Compose Material3 enabled (compose-bom 2023.08)
- **Persistence:** Room (offline-only, no accounts, no analytics)
- **Notable libs:** `applandeo:material-calendar-view` (calendar), `MPAndroidChart` (trend graph), `konfetti` 1.2.1 (confetti animation), `sentry-android` (optional crash reporting)
- **Localization:** ~15 languages (values-ar, -bn, -de, -es, -fr, -hi, -in, -ja, -mr, -pa, -pt, -ru, -zh, plus night)

## Top-Level Layout

```
app/                  Android app module
  src/main/java/com/cmgcode/minimoods/
    about/            AboutActivity, PreferenceFragment (settings)
    data/             Mood, MoodDao, MoodDatabase, MoodRepository, PreferenceDao (Room)
    dependencies/     CoroutineDispatchers, MiniMoodsModule (Hilt)
    handlers/error/   ErrorHandler
    moods/            MainActivity, MoodViewModel, MoodSelectionUseCase
    util/             ChartConfiguration, DateHelpers, DarkModePreferenceWatcher, DataBinding, DataConverters, Event, Constants
    widget/           MiniMoodsWidgetProvider
  src/main/res/       layouts, drawables, values-* (i18n), xml (widget + prefs)
  src/test/           unit tests (JUnit, MockK, Truth, Robolectric, Room testing)
build.gradle, settings.gradle, gradle/, gradlew    Gradle wrapper/config
LICENSE, README.md, screenshots/
```

## Reusable for Tiny Bubbles (kids ADHD)

- **Reward / celebration animation (gamification):** `app/src/main/java/com/cmgcode/minimoods/about/AboutActivity.kt` `showConfetti()` + `konfetti` dep — drop-in burst-confetti reward when a kid completes a task/streak. Directly liftable.
- **Mood / emotion logging UI + toggle logic:** `moods/MoodSelectionUseCase.kt` (tap-to-set / tap-again-to-clear), `moods/MoodViewModel.kt` (`toggleMood`, `currentMood`), layouts `res/layout/layout_mood_row.xml`, `activity_main.xml`. Good base for a kid-friendly "how do you feel" picker.
- **Offline-first local storage (privacy for kids, no accounts/cloud):** entire `data/` package — `Mood.kt`, `MoodDao.kt`, `MoodDatabase.kt`, `MoodRepository.kt`, `PreferenceDao.kt`, plus `util/DataConverters.kt`. Reusable pattern for storing logs/habits locally.
- **Home-screen widget for quick logging:** `widget/MiniMoodsWidgetProvider.kt` + `res/layout/layout_mood_row_widget.xml` + widget xml in `res/xml/`. Pattern for a one-tap "log from home screen" without opening the app — useful for low-friction ADHD logging.
- **Habit-streak / calendar view:** `MainActivity` calendar wiring + `applandeo:material-calendar-view` dep; `util/DateHelpers.kt` (`getMonthRange`, `atStartOfDay`, `isSameDay`) — foundation for a streak/habit calendar.
- **Trend chart:** `util/ChartConfiguration.kt` + `MPAndroidChart` dep — progress/trend visualization for parents.
- **Parent data export (CSV):** `MoodViewModel.export()` and `moods/MainActivity.kt` `exportMoodFile()/exportFile()` (FileProvider + share Intent) — export logs for parents/clinicians.
- **Dark mode + theming + settings:** `util/DarkModePreferenceWatcher.kt`, `about/PreferenceFragment.kt`, `res/values-night/`, `res/xml/` prefs — theming and a settings screen scaffold.
- **MVVM + Hilt DI scaffolding:** `dependencies/MiniMoodsModule.kt`, `dependencies/CoroutineDispatchers.kt`, `util/Event.kt` (single-fire LiveData events) — clean app skeleton to build on.
- **Localization scaffold:** `res/values-*` for ~15 languages — head start on multi-language kid/parent UI.

## Gaps (NOT present — must be built for Tiny Bubbles)

- No **timer / Pomodoro engine**.
- No **notification / reminder scheduler** (no AlarmManager/WorkManager usage).
- No **companion character** / mascot.
- No **task-breakdown logic** (it is single-tap mood logging only).
- No full **gamification/reward system** beyond the one cosmetic confetti burst.
