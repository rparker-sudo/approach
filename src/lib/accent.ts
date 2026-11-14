/**
 * Team accent color (D-023, P3.7). The board background is #0B0B0C. A color under 3:1 against it (WCAG non-text
 * contrast) is mixed toward white in 5% steps until it reaches 3:1. The coach's original choice is stored; the shown
 * shade is computed at render time. Text on accent fills uses #0B0B0C or #FFFFFF, whichever contrasts more.
 */
export const BOARD_BG = '#0B0B0C';
export const DEFAULT_ACCENT = '#C9CDD2';

export const PRESETS: { name: string; hex: string }[] = [
  { name: 'Approach silver', hex: '#C9CDD2' },
  { name: 'Blue', hex: '#4DA3FF' },
  { name: 'Green', hex: '#3DDC84' },
  { name: 'Gold', hex: '#FFC53D' },
  { name: 'Red', hex: '#FF6B6B' },
  { name: 'Purple', hex: '#B78CFF' },
  { name: 'Orange', hex: '#FF9F43' },
  { name: 'Teal', hex: '#2EC4B6' },
];

export const isHex = (s: string) => /^#[0-9A-Fa-f]{6}$/.test(s.trim());

const rgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const toHex = (c: number[]) => `#${c.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')}`.toUpperCase();

function luminance(hex: string) {
  const [r, g, b] = rgb(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrast(a: string, b: string) {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

/** The shade the board shows, and whether it was lightened. */
export function boardAccent(chosen: string | null | undefined): { color: string; adjusted: boolean } {
  const base = chosen && isHex(chosen) ? chosen.toUpperCase() : DEFAULT_ACCENT;
  if (contrast(base, BOARD_BG) >= 3) return { color: base, adjusted: false };
  const c = rgb(base);
  for (let step = 1; step <= 20; step++) {
    const t = step * 0.05;
    const mixed = toHex(c.map((v) => v + (255 - v) * t));
    if (contrast(mixed, BOARD_BG) >= 3) return { color: mixed, adjusted: true };
  }
  return { color: '#FFFFFF', adjusted: true };
}

/** Text color on an accent fill (≥ 4.5:1 for every shade that passes 3:1 on the board). */
export function textOn(fill: string) {
  return contrast(fill, BOARD_BG) >= contrast(fill, '#FFFFFF') ? BOARD_BG : '#FFFFFF';
}

/** #RRGGBB → rgba() with alpha (for the 12% own-row tint). */
export function tint(hex: string, alpha: number) {
  const [r, g, b] = rgb(hex);
  return `rgba(${r},${g},${b},${alpha})`;
}
