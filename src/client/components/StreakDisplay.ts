import type { StreakRecord } from '../../shared/types.js';

type StreakDisplayElement = HTMLElement & {
  update: (streak: StreakRecord, threshold: number) => void;
};

export function createStreakDisplay(streak: StreakRecord, threshold: number): StreakDisplayElement {
  const el = document.createElement('div') as StreakDisplayElement;
  el.className = 'streak-display';

  const countEl = document.createElement('span');
  countEl.className = 'streak-display__count';

  const badge = document.createElement('span');
  badge.className = 'streak-badge streak-badge--active';
  badge.textContent = '⭐';

  el.appendChild(countEl);
  el.appendChild(badge);

  function render(s: StreakRecord, t: number): void {
    el.hidden = s.current_streak === 0;
    countEl.textContent = `${s.current_streak} day streak`;
    badge.classList.toggle('streak-badge--active', s.current_streak >= t);
  }

  render(streak, threshold);

  el.update = (s: StreakRecord, t: number) => render(s, t);

  return el;
}
