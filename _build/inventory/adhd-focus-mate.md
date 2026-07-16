# ADHD Focus Mate — Source Inventory

## Repository
- **URL:** https://github.com/skainguyen1412/adhd-focus-mate
- **Description:** "The AI companion that helps you focus by gently reminding you when you get distracted and lose focus." A native macOS menu-bar app that watches your screen and nudges you back to your goal when it detects distraction (a "focus guardian").
- **Stars:** 44
- **Last activity:** Code last pushed **2026-02-04** (matches the expected Feb 2026 release); repo metadata last updated 2026-06-26.
- **Local clone:** `/Users/ameyakashid/Desktop/adhd india/_sources/adhd-focus-mate`

## License
- **Declared MIT** in the README (MIT badge + a `## License` section: "MIT License. See [LICENSE] for details.").
- **CAVEAT:** There is **no actual `LICENSE` file** in the repository, and the GitHub API reports `license: null`. The author's stated intent is MIT, but the license file is missing. Treat the MIT claim as unverified-by-file; confirm with the author before reuse.

## Tech Stack
- **Language:** Swift (SwiftUI 5.0)
- **Platform:** macOS 14+ menu-bar app
- **Persistence:** SwiftData (`@Model` classes, local-only)
- **Concurrency:** Combine + Swift `actor` / `@MainActor`
- **Notifications:** `UserNotifications` (UNUserNotificationCenter, abstracted behind a protocol for testability)
- **Screen capture:** CoreGraphics / ScreenCaptureKit (`ScreenshotCapturer`, `ScreenshotCaptureLoop`, `CGPreflightScreenCaptureAccess`)
- **AI:** Google Gemini 2.5 Flash Lite (`GeminiService`) for screen classification; screenshots analyzed in-memory and discarded
- **Build tooling:** Tuist (`Project.swift`, `Tuist.swift`, `Tuist/Package.swift`) rather than a checked-in `.xcodeproj`
- **Tests:** XCTest suite under `ADHDFocusMate/ADHDFocusMate/Tests` with mock protocols

## Top-Level Layout
```
adhd-focus-mate/
├── README.md                # Feature list, install, privacy notes (declares MIT)
├── design_system.md         # Design tokens / visual system notes
├── stack_guidelines.md      # Tech stack conventions
├── buildServer.json         # SourceKit-LSP build server config
├── .agent/                  # Agent/automation config
├── docs/                    # architecture.md, plan.md, background.md, feature specs
├── media/                   # Banner image + demo assets
└── ADHDFocusMate/           # Tuist project root
    ├── Project.swift, Tuist.swift, Tuist/Package.swift
    └── ADHDFocusMate/
        ├── Resources/       # Assets.xcassets, .entitlements, Preview Content
        ├── Sources/
        │   ├── ADHDFocusMateApp.swift   # App entry (menu-bar scene)
        │   ├── ContentView.swift
        │   ├── ScreenshotCapturer.swift / ScreenshotCaptureLoop.swift
        │   ├── ImageProcessor.swift      # compression / token optimization
        │   ├── ClassificationService.swift
        │   ├── NotificationManager.swift # reminder/nudge scheduler
        │   ├── Models/      # AppSettings, FocusSession, FocusCheck,
        │   │                #   DailyFocusAggregate, DistractionPattern, TimelineModels
        │   ├── Services/    # FocusSessionManager, AnalyticsService,
        │   │                #   GeminiService, DataController, LogService
        │   ├── Views/       # MenuBarView + Timer/ Onboarding/ Settings/
        │   │                #   Analytics/ History/ Summary/ Shared/
        │   ├── UI/          # Components (GlassCard, NeonButton, WindowAccessor)
        │   │                #   + Theme (AppTheme, ZenGlass)
        │   └── Extensions/  # Color+Hex
        └── Tests/           # XCTest + Mocks
```

## Reusable for Tiny Bubbles (kids ADHD app)
Tiny Bubbles is a polished, engaging ADHD app for kids. The strongest reuse candidates are the
timer/session engine, the reminder scheduler, the theming/components layer, and the streak/analytics
data model. The AI screen-surveillance pieces (Gemini, screenshot capture) are **not** appropriate
for a kids product and should be dropped.

- **Timer / session engine** — `Sources/Services/FocusSessionManager.swift`
  Drives session start/stop, `elapsedTime`, and an existing `currentStreak` counter as an
  `ObservableObject`. Strip the screenshot-capture dependency and you have a reusable focus-timer
  state machine for kid-friendly timed activities. Pairs with `Models/FocusSession.swift`,
  `Models/FocusCheck.swift`, and the `Views/Timer/TimerView.swift` countdown UI.

- **Notification / reminder scheduler** — `Sources/NotificationManager.swift`
  Clean, protocol-abstracted (`NotificationCenterProtocol`) wrapper over UNUserNotificationCenter:
  authorization flow, categories, and scheduling. Directly reusable as the reminder/nudge engine
  (e.g., "time for a break", "great job" rewards) with kid-appropriate copy. Test scaffolding in
  `Tests/NotificationManagerTests.swift`.

- **Habit-streak / daily-aggregate data model** — `Models/DailyFocusAggregate.swift`
  Per-day SwiftData aggregate with `longestFocusStreak`, daily score, and a JSON-encoded category
  count helper. Solid backbone for a kids habit-streak calendar / sticker chart. Companion logic in
  `Services/AnalyticsService.swift` (`computeFocusScore`, `analyzePeakHours`, streak math).

- **Analytics / progress dashboard** — `Sources/Services/AnalyticsService.swift` +
  `Views/Analytics/` (`AnalyticsDashboardView`, `SessionSummaryCard`, `SessionTimelineView`).
  Reusable as the "how did I do today" progress view; rework metrics into kid-friendly visuals
  (stars earned, bubbles popped) rather than work/slack ratios.

- **Theming / design system** — `UI/Theme/AppTheme.swift`, `UI/Theme/ZenGlass.swift`,
  `Extensions/Color+Hex.swift`, plus `design_system.md`.
  Centralized color/gradient/typography tokens. Reuse the *structure* (single source of truth for
  theme tokens) but swap the calm "Deep Zen" green palette for a brighter, playful kids palette.

- **Reusable UI components** — `UI/Components/GlassCard.swift`, `UI/Components/NeonButton.swift`,
  `Views/Shared/` (`IntervalSlider.swift`, `SharedUIComponents.swift`, `TagCloudView.swift`).
  Card, button, and slider primitives that can be restyled for a chunky, tappable kids UI. The
  `IntervalSlider` is handy for parent-set activity durations.

- **Onboarding flow** — `Views/Onboarding/` (`OnboardingContainerView`, `OnboardingState`, and
  `Steps/`: Welcome, HowItWorks, Permission, Preferences, Ready, FocusProfile).
  A well-structured multi-step onboarding container/state pattern. Reuse the container + step
  architecture for a kid/parent setup flow (drop the API-key step).

- **Settings / preferences** — `Views/Settings/SettingsView.swift` + `Models/AppSettings.swift`.
  Settings screen scaffolding and a settings model; reuse the pattern for a parent-controls /
  preferences screen (durations, reward cadence, themes).

- **Companion-character note:** No companion-character/mascot system exists in this repo — it would
  need to be built fresh for Tiny Bubbles. The menu-bar "Zen Pill" status indicator
  (`Views/MenuBarView.swift`, `UI/Theme/ZenGlass.swift`) is the closest analog and could inspire an
  animated companion's mood/state display.

### Not reusable (drop for a kids product)
- `GeminiService.swift`, `ClassificationService.swift`, `ScreenshotCapturer.swift`,
  `ScreenshotCaptureLoop.swift`, `ImageProcessor.swift`, `Models/DistractionPattern.swift` —
  AI screen-surveillance pipeline; inappropriate and privacy-sensitive for children.

## Notes
- Cloned with `git clone --depth 1` (shallow, succeeded).
- No dependency install was run (no SPM resolve / pod / gradle), per instructions.
- License is the main caveat: README says MIT but no LICENSE file is present and the GitHub API
  reports no detected license — verify before any redistribution/reuse.
