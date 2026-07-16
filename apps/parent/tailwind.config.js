/** @type {import('tailwindcss').Config} */
// apps/parent/tailwind.config.js — mirrors apps/kid's structure. The parent
// design system (tokens shared with the kid app via @tiny-bubbles/shared)
// lands with the real parent surfaces in M3.0.
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {},
  },
  plugins: [],
};
