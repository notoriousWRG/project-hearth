import { describe, it, expect } from 'vitest';
import {
  applyTheme,
  getCurrentTheme,
  THEMES,
  DEFAULT_THEME,
} from '../../../src/client/utils/theme.js';

function makeHost(initial?: string) {
  const attrs: Record<string, string> = initial ? { 'data-theme': initial } : {};
  return {
    setAttribute(name: string, v: string) {
      attrs[name] = v;
    },
    getAttribute(name: string) {
      return attrs[name] ?? null;
    },
  };
}

describe('applyTheme', () => {
  it('sets data-theme attribute', () => {
    const host = makeHost();
    applyTheme('clean', host);
    expect(host.getAttribute('data-theme')).toBe('clean');
  });

  it('applies all valid themes', () => {
    for (const theme of THEMES) {
      const host = makeHost();
      applyTheme(theme, host);
      expect(host.getAttribute('data-theme')).toBe(theme);
    }
  });
});

describe('getCurrentTheme', () => {
  it('returns current theme from host', () => {
    const host = makeHost('farmstead');
    expect(getCurrentTheme(host)).toBe('farmstead');
  });

  it('returns default theme when attribute is missing', () => {
    const host = makeHost();
    expect(getCurrentTheme(host)).toBe(DEFAULT_THEME);
  });

  it('returns default theme for unknown value', () => {
    const host = makeHost('unknown-theme');
    expect(getCurrentTheme(host)).toBe(DEFAULT_THEME);
  });
});
