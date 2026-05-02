// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import { createDailyOverview } from '../../../src/client/components/DailyOverview.js';

describe('createDailyOverview', () => {
  it('renders a header element', () => {
    const el = createDailyOverview(new Date('2026-05-02T09:00:00'));
    expect(el.tagName.toLowerCase()).toBe('header');
  });

  it('displays the formatted date', () => {
    const el = createDailyOverview(new Date('2026-05-02T09:00:00'));
    expect(el.textContent).toContain('Saturday');
    expect(el.textContent).toContain('May');
    expect(el.textContent).toContain('2');
  });

  it('shows morning greeting before noon', () => {
    const el = createDailyOverview(new Date('2026-05-02T08:00:00'));
    expect(el.textContent).toContain('Good morning');
  });

  it('shows afternoon greeting', () => {
    const el = createDailyOverview(new Date('2026-05-02T13:00:00'));
    expect(el.textContent).toContain('Good afternoon');
  });

  it('shows evening greeting', () => {
    const el = createDailyOverview(new Date('2026-05-02T19:00:00'));
    expect(el.textContent).toContain('Good evening');
  });
});
