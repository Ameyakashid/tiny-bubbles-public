# MyMoodz — Source Inventory

- **Repo URL:** https://github.com/NaagAlgates/MyMoodz
- **License:** MIT (confirmed in `LICENSE`; API `spdx_id: MIT`)
- **Stars:** 5
- **Last activity:** last push 2025-05-27 (repo metadata updated 2026-03-06); created 2025-04-06
- **Author:** Nagaraj Alagusundaram (solo developer)
- **Local clone:** `/Users/ameyakashid/Desktop/adhd india/_sources/mymoodz`
- **Match confidence:** High — privacy-first, offline, no accounts/ads/cloud, cross-platform Android/iOS mood tracker, MIT. Matches the description exactly.

## Tech stack
- **iOS (complete implementation):** Swift + SwiftUI, Core Data (`NSPersistentContainer`, model "MoodModel") for offline storage, Combine, DGCharts (Daniel Gindi `Charts` SPM package) for insights charts, MessageUI for feedback mail.
- **Android (skeleton only):** Kotlin + Jetpack Compose + Material3 + Navigation Compose, Gradle Kotlin DSL. Contains only `MainActivity.kt` and `ui/theme/` (Color/Theme/Type) — no feature code yet.
- Build: Xcode project (`iOS/MyMoodz.xcodeproj`), Gradle (`android/build.gradle.kts`, `android/app/build.gradle.kts`).

## Top-level layout
```
MyMoodz/
├── android/   # Kotlin/Compose Android app (skeleton: MainActivity + theme only)
├── iOS/       # SwiftUI app (full implementation) + Screenshots/
├── docs/      # FEATURES, ONBOARDING, PRIVACY_POLICY, CONTRIBUTING, CODE_OF_CONDUCT, LICENSE
├── .github/
├── LICENSE    # MIT
└── README.md
```

iOS source structure (`iOS/MyMoodz/`):
- `Source/App/` — `MyMoodzApp.swift`, `ContentView.swift`
- `Source/Home/` — `MoodGridView.swift`, `MobileHomeScreen.swift`, `IpadHomeScreen.swift`, `NoteInputView.swift`
- `Source/Hub/Timeline/` — `CalendarView.swift`, `TimelineScreen.swift`, `MoodCardView.swift`, `EditMoodSheet.swift`, filter/sort menus
- `Source/Hub/Insights/` — `MoodStats.swift`, `MoodInsightsViewModel.swift`, `InsightsScreen.swift`, chart wrappers (Bar/HBar/Line/Pie), `StatCard.swift`
- `Source/Hub/Settings/` — `SettingsScreen.swift`, `MailView.swift`
- `Source/Service/` — `MoodManager.swift`, `SelectedMoodColor.swift`, `MoodDataService.swift`
- `Source/Data/` — `PersistenceController.swift`, `Model/MoodEntryData.swift`
- `Extension/` — `Color.swift`, `Date.swift`, `Font.swift`, etc.; `Utilities/` — `Log.swift`, `TimeAgoFormatter.swift`, `KeyboardResponder.swift`

## Reusable for Tiny Bubbles (kids ADHD)
- **Mood logging UI (high value, kid-friendly):** `iOS/MyMoodz/Source/Home/MoodGridView.swift` — adaptive `LazyVGrid` of emoji buttons with spring scale-up animation on tap and colored circle backgrounds. Drop-in pattern for a playful "how do you feel?" picker. Includes the `Mood` model (emoji + label list).
- **Emoji→color mapping / theming:** `iOS/MyMoodz/Source/Service/Mood/SelectedMoodColor.swift` (emoji→hex color map) and `iOS/MyMoodz/Extension/Color.swift` (`Color(hex:)` initializer, `isDark(in:)`). Useful for a bright, color-coded kids palette.
- **Habit-streak engine:** `iOS/MyMoodz/Source/Hub/Insights/MoodStats.swift` → `calculateLongestStreak(from:)` implements a consecutive-day streak algorithm; pairs with `iOS/MyMoodz/Extension/Date.swift` (`stripTime()`, `addingDays()`). Directly reusable for ADHD habit/reward streaks.
- **Habit-streak calendar:** `iOS/MyMoodz/Source/Hub/Timeline/CalendarView.swift` — month grid that highlights days with entries (`moodDates`), with month/year navigation. Reusable as a "days I did my routine" calendar.
- **Stats / progress visualization:** `iOS/MyMoodz/Source/Hub/Insights/` — `MoodStats` (counts, most-frequent, totals, daily data) + `StatCard.swift` + DGChart wrappers (`BarChartViewWrapper`, `PieChartViewWrapper`, `LineChartViewWrapper`, `HorizontalBarChartViewWrapper`) and `MoodInsightsViewModel.swift`. Reusable for kid-facing progress dashboards (consider simpler visuals for kids).
- **Offline persistence (privacy-first):** `iOS/MyMoodz/Source/Data/PersistenceController.swift` (Core Data, no cloud/accounts) + `MoodDataService.swift` + `Source/Data/Model/MoodEntryData.swift`. Good template for on-device-only kids data (privacy/compliance friendly).
- **Global state management:** `iOS/MyMoodz/Source/Service/Mood/MoodManager.swift` — singleton `ObservableObject` publishing selected mood/color and entries. Reusable state pattern.
- **Settings / theming screen:** `iOS/MyMoodz/Source/Hub/Settings/SettingsScreen.swift` (sectioned `List`, dark-mode support, links, mail feedback) and Android `android/app/src/main/java/com/jcube/mymoodz/ui/theme/` (Material3 Color/Theme/Type) as a theming scaffold.
- **Note entry UI:** `iOS/MyMoodz/Source/Home/NoteInputView.swift` + `Utilities/KeyboardResponder.swift` — optional short-note input with keyboard handling.

## Gaps (NOT present — must be built for Tiny Bubbles)
- No **timer/Pomodoro engine**.
- No **reminder/notification scheduler** (no `UNUserNotification` usage; grep "timer/streak" hits are the streak calc and keyboard responder, not push/reminders).
- No **reward/gamification system** beyond the longest-streak counter (no points, badges, unlockables).
- No **companion character / mascot**.
- No **task-breakdown logic**.
- **Android side is a skeleton** — only iOS has working features; Android would need to be built out (or reuse iOS logic ported to Kotlin).

## Notes
- iOS charts depend on the third-party DGCharts (Apache-2.0) Swift package — vendor it separately if reused.
- Codebase is small and single-author; treat as a reference/pattern source rather than a turnkey framework.
