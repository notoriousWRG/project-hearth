import { describe, it, expect } from 'vitest';
import { getMoonFraction, getMoonPhase } from '../../../src/client/utils/moonPhase.js';

describe('getMoonFraction', () => {
  it('returns a value in [0, 1) for any date', () => {
    const dates = [
      new Date('2000-01-06'),
      new Date('2000-01-21'),
      new Date('2000-01-13'),
      new Date('1999-12-31'),
    ];
    for (const d of dates) {
      const f = getMoonFraction(d);
      expect(f).toBeGreaterThanOrEqual(0);
      expect(f).toBeLessThan(1);
    }
  });

  it('is deterministic — same date always returns the same value', () => {
    const d = new Date('2026-05-31');
    expect(getMoonFraction(d)).toBe(getMoonFraction(d));
  });

  it('2000-01-21 (known Full Moon) has fraction near 0.5', () => {
    const f = getMoonFraction(new Date('2000-01-21'));
    expect(f).toBeGreaterThan(0.45);
    expect(f).toBeLessThan(0.55);
  });

  it('2000-01-06 (known New Moon) has fraction near 0 or 1', () => {
    const f = getMoonFraction(new Date('2000-01-06'));
    expect(f < 0.05 || f > 0.95).toBe(true);
  });
});

describe('getMoonPhase', () => {
  it('returns Full Moon for 2000-01-21', () => {
    const phase = getMoonPhase(new Date('2000-01-21'));
    expect(phase.name).toBe('Full Moon');
    expect(phase.emoji).toBe('🌕');
  });

  it('returns New Moon for 2000-01-06', () => {
    const phase = getMoonPhase(new Date('2000-01-06'));
    expect(phase.name).toBe('New Moon');
    expect(phase.emoji).toBe('🌑');
  });

  it('returns First Quarter for 2000-01-13', () => {
    const phase = getMoonPhase(new Date('2000-01-13'));
    expect(phase.name).toBe('First Quarter');
  });

  it('fraction on the returned object matches getMoonFraction', () => {
    const d = new Date('2026-05-31');
    const phase = getMoonPhase(d);
    expect(phase.fraction).toBe(getMoonFraction(d));
  });
});
