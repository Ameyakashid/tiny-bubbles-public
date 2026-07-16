# Bundled fonts — placeholder note (M2)

This folder holds locally-bundled font binaries. As of M2, the **OpenDyslexic**
`.otf` files are **not yet committed** — we do not fabricate font binaries.

## What ships via packages (no files needed here)

- **Fredoka** — OFL-1.1 — loaded from `@expo-google-fonts/fredoka`.
- **Lexend** — OFL-1.1 — loaded from `@expo-google-fonts/lexend`.

## What must be added here

- `OpenDyslexic-Regular.otf`
- `OpenDyslexic-Bold.otf`

OpenDyslexic is **OFL-1.1** (Reserved Font Name "OpenDyslexic"). Download the
official release, drop the two `.otf` files in this folder, then **uncomment the
two `require(...)` lines** in `src/theme/fonts.ts`. The font is the accessibility
body-face toggle (doc 61 §3.1).

Locally-bundled fonts are invisible to `license-checker`, so the OFL-1.1 text +
author + Reserved-Font-Name note are hand-maintained in
`THIRD_PARTY_NOTICES.md` §5 (doc 66 §1b.9). Do this when the files land.

Until the files are added, the `dyslexic` fontFamily keys degrade to the
platform default — the app still builds and runs.
