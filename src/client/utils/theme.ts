export const THEMES = ['clean', 'farmstead', 'whimsy'] as const;
export type Theme = (typeof THEMES)[number];
export const DEFAULT_THEME: Theme = 'clean';

interface ThemeHost {
  setAttribute(name: string, value: string): void;
  getAttribute(name: string): string | null;
}

export function applyTheme(theme: Theme, root: ThemeHost = document.documentElement): void {
  root.setAttribute('data-theme', theme);
}

export function getCurrentTheme(root: ThemeHost = document.documentElement): Theme {
  const val = root.getAttribute('data-theme');
  if (val && THEMES.includes(val as Theme)) return val as Theme;
  return DEFAULT_THEME;
}
