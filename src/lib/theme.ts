import tokens from './brand-tokens.json';

/**
 * Load & Launch theme, generated from brand-tokens.json (the brand source of truth).
 * Components read from the mutable `colors` object; ThemeRoot swaps it and
 * re-mounts the tree when the user changes between dark (default) and light.
 */

export type ThemeName = 'dark' | 'light';

export const BRAND = {
  name: tokens.name,
  tagline: tokens.tagline,
  radius: tokens.radius,
  scale: tokens.typography.scale,
  displayTracking: tokens.typography.display.letterSpacingEm,
  netHeightsM: {
    women: tokens.netHeights.womenIndoorMeters,
    men: tokens.netHeights.menIndoorMeters,
  },
  modules: tokens.modules,
};

const P = tokens.color.palette;

function build(mode: ThemeName) {
  const t = tokens.color[mode];
  return {
    mode,
    bg: t.background,
    card: t.surface,
    raised: t.surfaceRaised,
    line: t.border,
    ink: t.textPrimary,
    muted: t.textSecondary,
    faint: t.textMuted,
    primaryBg: t.actionPrimaryBg,
    primaryText: t.actionPrimaryText,
    /** Reserved for progress, PRs and streaks. */
    achievement: t.achievement,
    chartLine: t.chartLine,
    chartGrid: t.chartGrid,
    error: tokens.color.status.error,
    warning: tokens.color.status.warning,
    /** Day-type chips: tone steps from the palette, darkest/brightest = biggest day. */
    day:
      mode === 'dark'
        ? { off: t.surface, practice: t.surfaceRaised, game: P.gunmetal, tournament: P.seam }
        : { off: t.background, practice: P.mist, game: P.chrome, tournament: P.steel },
  };
}

export type Colors = ReturnType<typeof build>;

export const THEMES: Record<ThemeName, Colors> = { dark: build('dark'), light: build('light') };

/** Current theme colors. Mutated in place by applyTheme. */
export const colors: Colors = { ...THEMES.dark, day: { ...THEMES.dark.day } };

export function applyTheme(mode: ThemeName) {
  Object.assign(colors, THEMES[mode], { day: { ...THEMES[mode].day } });
}

export const fonts = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  display: 'InterTight_600SemiBold',
};

/** Display style: Inter Tight 600, uppercase, 0.18em tracking. */
export function display(size: number) {
  return {
    fontFamily: fonts.display,
    fontSize: size,
    letterSpacing: Math.round(size * BRAND.displayTracking * 10) / 10,
    textTransform: 'uppercase' as const,
  };
}
