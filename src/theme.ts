import { useEffect } from 'react';
import type { DashboardScale, ThemeSetting } from '@playoverlay/core';

export type ResolvedTheme = 'light' | 'dark';

const DARK_QUERY = '(prefers-color-scheme: dark)';

// What the dashboard should actually render in: the operator's explicit
// choice, or the OS preference when they have left it on "system" (the
// default, including for everyone upgrading from a version without the
// setting, who therefore keep whatever their machine already prefers).
export function resolveTheme(
  setting: ThemeSetting | undefined,
  prefersDark: boolean
): ResolvedTheme {
  if (setting === 'light' || setting === 'dark') return setting;
  return prefersDark ? 'dark' : 'light';
}

// Writes the resolved theme onto <html>, where tailwind.config.js's dark
// selector and the CSS variables in index.css pick it up. Only the control
// window calls this; the display window stays themeless so the on-air
// graphics never change with the dashboard.
export function applyTheme(
  theme: ResolvedTheme,
  root = document.documentElement
) {
  root.dataset.theme = theme;
}

export function useTheme(setting: ThemeSetting | undefined) {
  useEffect(() => {
    const media = window.matchMedia(DARK_QUERY);
    const apply = () => applyTheme(resolveTheme(setting, media.matches));
    apply();
    // Following the OS live only matters on "system"; the listener is cheap
    // either way and re-resolving is a no-op for a forced theme.
    media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, [setting]);
}

// Zoom factors for the dashboard size setting. CSS zoom on <html> scales
// the fixed rail, the drawers and the modals together, which a transform
// on the dashboard root would not.
const SCALE_ZOOM: Record<DashboardScale, number> = {
  small: 0.9,
  medium: 1,
  large: 1.25,
};

export function applyDashboardScale(
  scale: DashboardScale | undefined,
  root = document.documentElement
) {
  root.style.zoom = String(SCALE_ZOOM[scale ?? 'medium']);
}

export function useDashboardScale(scale: DashboardScale | undefined) {
  useEffect(() => {
    applyDashboardScale(scale);
  }, [scale]);
}
