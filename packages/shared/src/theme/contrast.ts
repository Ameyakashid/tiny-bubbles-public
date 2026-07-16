/**
 * theme/contrast.ts — [extracted v1 → @tiny-bubbles/shared, M1.1b] machine-checked WCAG contrast (§2.4 / §CREATE 11).
 *
 * Pure sRGB relative-luminance + contrast-ratio math (WCAG 2.1). `contrast.test.ts`
 * runs these over every palette so a future token edit that drops below the
 * design's AA target (`61` §2.1: body ≥4.5:1, large/graphical ≥3:1) fails CI —
 * turning the "palettes are AA" claim from aspirational into enforced.
 *
 * No React/RN import — pure + unit-testable.
 */

/** Parse a `#RGB`/`#RRGGBB` (or `rgb()/rgba()`) string to 0-255 channels. */
export function parseColor(input: string): { r: number; g: number; b: number } {
  const s = input.trim();
  const rgb = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i.exec(s);
  if (rgb) {
    return { r: Number(rgb[1]), g: Number(rgb[2]), b: Number(rgb[3]) };
  }
  let hex = s.replace(/^#/, "");
  if (hex.length === 3) {
    hex = hex
      .split("")
      .map((ch) => ch + ch)
      .join("");
  }
  const int = parseInt(hex, 16);
  return { r: (int >> 16) & 0xff, g: (int >> 8) & 0xff, b: int & 0xff };
}

/** WCAG relative luminance of a color string (0 = black … 1 = white). */
export function relativeLuminance(color: string): number {
  const { r, g, b } = parseColor(color);
  const toLinear = (c8: number): number => {
    const c = c8 / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

/** WCAG contrast ratio between two colors (1:1 … 21:1). Order-independent. */
export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const hi = Math.max(la, lb);
  const lo = Math.min(la, lb);
  return (hi + 0.05) / (lo + 0.05);
}

/** WCAG AA target: 4.5:1 for body text, 3:1 for large / graphical (`61` §2.1). */
export const AA_BODY = 4.5;
export const AA_LARGE = 3;

/** Does `fg` on `bg` meet WCAG AA (large → 3:1, otherwise 4.5:1)? */
export function meetsAA(fg: string, bg: string, opts: { large?: boolean } = {}): boolean {
  return contrastRatio(fg, bg) >= (opts.large ? AA_LARGE : AA_BODY);
}
