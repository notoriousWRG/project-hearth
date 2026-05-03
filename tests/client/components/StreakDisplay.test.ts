// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import { createStreakDisplay } from '../../../src/client/components/StreakDisplay.js';
import type { StreakRecord } from '../../../src/shared/types.js';

function makeStreak(overrides: Partial<StreakRecord> = {}): StreakRecord {
  return {
    id: 1,
    user_id: 10,
    current_streak: 0,
    longest_streak: 0,
    last_completed_date: null,
    ...overrides,
  };
}

describe('createStreakDisplay', () => {
  it('renders an element', () => {
    const el = createStreakDisplay(makeStreak(), 7);
    expect(el).toBeTruthy();
  });

  it('is hidden when streak is zero', () => {
    const el = createStreakDisplay(makeStreak({ current_streak: 0 }), 7);
    expect(el.hidden).toBe(true);
  });

  it('is visible when streak is greater than zero', () => {
    const el = createStreakDisplay(makeStreak({ current_streak: 3 }), 7);
    expect(el.hidden).toBe(false);
  });

  it('shows the current streak count', () => {
    const el = createStreakDisplay(makeStreak({ current_streak: 4 }), 7);
    expect(el.textContent).toContain('4');
  });

  it('does not show badge when streak is below threshold', () => {
    const el = createStreakDisplay(makeStreak({ current_streak: 3 }), 7);
    expect(el.querySelector('.streak-badge--active')).toBeFalsy();
  });

  it('shows badge when streak meets threshold', () => {
    const el = createStreakDisplay(makeStreak({ current_streak: 7 }), 7);
    expect(el.querySelector('.streak-badge--active')).toBeTruthy();
  });

  it('shows badge when streak exceeds threshold', () => {
    const el = createStreakDisplay(makeStreak({ current_streak: 10 }), 7);
    expect(el.querySelector('.streak-badge--active')).toBeTruthy();
  });

  it('update() refreshes streak count and badge visibility', () => {
    const el = createStreakDisplay(makeStreak({ current_streak: 3 }), 7);
    document.body.appendChild(el);

    el.update(makeStreak({ current_streak: 7 }), 7);

    expect(el.textContent).toContain('7');
    expect(el.querySelector('.streak-badge--active')).toBeTruthy();
  });

  it('update() hides element when streak drops to zero', () => {
    const el = createStreakDisplay(makeStreak({ current_streak: 5 }), 7);
    document.body.appendChild(el);

    el.update(makeStreak({ current_streak: 0 }), 7);

    expect(el.hidden).toBe(true);
  });
});
