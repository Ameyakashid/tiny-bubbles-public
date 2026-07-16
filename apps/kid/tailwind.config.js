/** @type {import('tailwindcss').Config} */
module.exports = {
  // Content globs cover the canonical structure (doc 66 §2): expo-router
  // screens in app/, reusable components/, and shared logic/data in src/.
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      // Fonts loaded at splash in M2 (doc 61 §3.1): Fredoka (display/headings),
      // Lexend (body/labels/numerals), and locally-bundled OpenDyslexic (a11y
      // toggle). Intentionally NOT Inter (never shipped).
      fontFamily: {
        display: ["Fredoka_600SemiBold"],
        "display-bold": ["Fredoka_700Bold"],
        sans: ["Lexend_400Regular"],
        "sans-medium": ["Lexend_500Medium"],
        "sans-semibold": ["Lexend_600SemiBold"],
        "sans-bold": ["Lexend_700Bold"],
        dyslexic: ["OpenDyslexic-Regular"],
      },
      // Semantic color tokens bound to the per-palette CSS vars in global.css.
      // ThemeProvider swaps the palette by setting the class set on the subtree.
      // No child-facing error/danger/angry color; `gentle-alert` is parent-only.
      colors: {
        canvas: "var(--canvas)",
        "canvas-grad-top": "var(--canvas-grad-top)",
        "canvas-grad-bot": "var(--canvas-grad-bot)",
        surface: "var(--surface)",
        "surface-alt": "var(--surface-alt)",
        "surface-sunken": "var(--surface-sunken)",
        primary: "var(--primary)",
        "primary-deep": "var(--primary-deep)",
        "on-primary": "var(--on-primary)",
        secondary: "var(--secondary)",
        accent: "var(--accent)",
        grow: "var(--grow)",
        token: "var(--token)",
        "token-glow": "var(--token-glow)",
        success: "var(--success)",
        "success-surface": "var(--success-surface)",
        info: "var(--info)",
        "gentle-alert": "var(--gentle-alert)",
        text: "var(--text)",
        "text-dim": "var(--text-dim)",
        "on-dark": "var(--on-dark)",
        border: "var(--border)",
        separator: "var(--separator)",
        "focus-ring": "var(--focus-ring)",
        scrim: "var(--scrim)",
      },
    },
  },
  plugins: [],
};
