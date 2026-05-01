import { describe, it, expect } from 'vitest';
import {
  parseResetTime,
  getCurrentResetDate,
  shouldReset,
  getNextResetDate,
} from '../../../src/server/utils/reset.js';

describe('parseResetTime', () => {
  it('parses midnight', () => {
    expect(parseResetTime('00:00')).toEqual({ hours: 0, minutes: 0 });
  });

  it('parses 06:00', () => {
    expect(parseResetTime('06:00')).toEqual({ hours: 6, minutes: 0 });
  });

  it('parses 23:59', () => {
    expect(parseResetTime('23:59')).toEqual({ hours: 23, minutes: 59 });
  });
});

describe('getCurrentResetDate', () => {
  it('returns today when past reset time', () => {
    const now = new Date('2026-05-01T07:00:00');
    expect(getCurrentResetDate(now, '06:00')).toBe('2026-05-01');
  });

  it('returns yesterday when before reset time', () => {
    const now = new Date('2026-05-01T05:59:00');
    expect(getCurrentResetDate(now, '06:00')).toBe('2026-04-30');
  });

  it('returns today for midnight reset when at midnight', () => {
    const now = new Date('2026-05-01T00:01:00');
    expect(getCurrentResetDate(now, '00:00')).toBe('2026-05-01');
  });

  it('returns yesterday for midnight reset before midnight', () => {
    const now = new Date('2026-04-30T23:59:00');
    expect(getCurrentResetDate(now, '00:00')).toBe('2026-04-30');
  });

  it('handles month boundary correctly', () => {
    const now = new Date('2026-05-01T05:00:00');
    expect(getCurrentResetDate(now, '06:00')).toBe('2026-04-30');
  });
});

describe('shouldReset', () => {
  it('returns true when current period is newer than last reset date', () => {
    const now = new Date('2026-05-01T07:00:00');
    expect(shouldReset('2026-04-30', '06:00', now)).toBe(true);
  });

  it('returns false when already reset for current period', () => {
    const now = new Date('2026-05-01T12:00:00');
    expect(shouldReset('2026-05-01', '06:00', now)).toBe(false);
  });

  it('returns false before reset time fires', () => {
    const now = new Date('2026-05-01T05:59:00');
    expect(shouldReset('2026-04-30', '06:00', now)).toBe(false);
  });

  it('returns true once reset time passes', () => {
    const now = new Date('2026-05-01T06:01:00');
    expect(shouldReset('2026-04-30', '06:00', now)).toBe(true);
  });

  it('returns false for midnight reset at same day', () => {
    const now = new Date('2026-05-01T12:00:00');
    expect(shouldReset('2026-05-01', '00:00', now)).toBe(false);
  });

  it('returns true for midnight reset from previous day', () => {
    const now = new Date('2026-05-01T00:01:00');
    expect(shouldReset('2026-04-30', '00:00', now)).toBe(true);
  });
});

describe('getNextResetDate', () => {
  it('returns a future date when past reset time today', () => {
    const now = new Date('2026-05-01T07:00:00');
    const next = getNextResetDate(now, '06:00');
    expect(next.getTime()).toBeGreaterThan(now.getTime());
  });

  it('returns today reset time when before reset time', () => {
    const now = new Date('2026-05-01T05:00:00');
    const next = getNextResetDate(now, '06:00');
    expect(next.getHours()).toBe(6);
    expect(next.getMinutes()).toBe(0);
    expect(next.getDate()).toBe(1);
  });
});
