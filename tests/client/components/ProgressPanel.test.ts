// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import { createProgressPanel } from '../../../src/client/components/ProgressPanel.js';

type ProgressData = { total: number; completed: number; percent: number; earned: number };

function makeData(overrides: Partial<ProgressData> = {}): ProgressData {
  return { total: 5, completed: 3, percent: 60, earned: 6.0, ...overrides };
}

describe('createProgressPanel', () => {
  it('renders a section element', () => {
    const el = createProgressPanel(makeData());
    expect(el.tagName.toLowerCase()).toBe('section');
  });

  it('shows completed and total chore counts', () => {
    const el = createProgressPanel(makeData({ completed: 3, total: 5 }));
    expect(el.textContent).toContain('3');
    expect(el.textContent).toContain('5');
  });

  it('sets progress bar fill width to percent', () => {
    const el = createProgressPanel(makeData({ percent: 60 }));
    const fill = el.querySelector('.progress-bar__fill') as HTMLElement;
    expect(fill).toBeTruthy();
    expect(fill.style.width).toBe('60%');
  });

  it('shows zero-state message when no chores', () => {
    const el = createProgressPanel(makeData({ total: 0, completed: 0, percent: 0, earned: 0 }));
    expect(el.textContent).toContain('No chores');
  });

  it('update() refreshes displayed values without remounting', () => {
    const el = createProgressPanel(makeData({ completed: 1, total: 5, percent: 20, earned: 2.0 }));
    document.body.appendChild(el);

    el.update({ total: 5, completed: 5, percent: 100, earned: 10.0 });

    expect(el.textContent).toContain('5 of 5');
    const fill = el.querySelector('.progress-bar__fill') as HTMLElement;
    expect(fill.style.width).toBe('100%');
  });
});
