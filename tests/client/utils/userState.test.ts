import { describe, it, expect } from 'vitest';
import {
  getViewMode,
  getThemeForViewMode,
  loadActiveUserId,
  saveActiveUserId,
} from '../../../src/client/utils/userState.js';
import type { Theme } from '../../../src/client/utils/theme.js';

function makeStorage(initial: Record<string, string> = {}) {
  const store = { ...initial };
  return {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => {
      store[k] = v;
    },
  };
}

describe('getViewMode', () => {
  it('returns parent for parent type', () => {
    expect(getViewMode('parent')).toBe('parent');
  });

  it('returns child for child type', () => {
    expect(getViewMode('child')).toBe('child');
  });
});

describe('getThemeForViewMode', () => {
  it('returns farmstead for parent mode', () => {
    expect(getThemeForViewMode('parent')).toBe<Theme>('farmstead');
  });

  it('returns whimsy for child mode', () => {
    expect(getThemeForViewMode('child')).toBe<Theme>('whimsy');
  });
});

describe('loadActiveUserId', () => {
  it('returns null when not set', () => {
    const storage = makeStorage();
    expect(loadActiveUserId(storage)).toBeNull();
  });

  it('returns stored id as number', () => {
    const storage = makeStorage({ 'hearth:activeUserId': '42' });
    expect(loadActiveUserId(storage)).toBe(42);
  });
});

describe('saveActiveUserId', () => {
  it('persists id to storage', () => {
    const storage = makeStorage();
    saveActiveUserId(7, storage);
    expect(loadActiveUserId(storage)).toBe(7);
  });

  it('saves null by clearing key', () => {
    const storage = makeStorage({ 'hearth:activeUserId': '5' });
    saveActiveUserId(null, storage);
    expect(loadActiveUserId(storage)).toBeNull();
  });
});
