import type { SummaryResponse } from '../../shared/types.js';
import { summary as summaryApi, chores as choreApi } from '../utils/api.js';
import { getMoonPhase } from '../utils/moonPhase.js';

const REFRESH_MS = 60_000;

type SummaryElement = HTMLElement & { destroy: () => void };

export function createFamilySummary(onSelectChild: (userId: number) => void): SummaryElement {
  const container = document.createElement('div') as SummaryElement;
  container.className = 'family-summary';

  let wakeLock: WakeLockSentinel | null = null;
  let timer: number | null = null;

  async function acquireWakeLock(): Promise<void> {
    if (!('wakeLock' in navigator)) return;
    try {
      wakeLock = await navigator.wakeLock.request('screen');
    } catch {
      // not available in this context
    }
  }

  function render(data: SummaryResponse): void {
    container.innerHTML = '';

    const now = new Date();

    const header = document.createElement('div');
    header.className = 'summary-header';

    const dateSpan = document.createElement('span');
    dateSpan.className = 'summary-date';
    dateSpan.textContent = now.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    });

    const moon = getMoonPhase(now);
    const moonEl = document.createElement('div');
    moonEl.className = 'summary-moon';
    const moonEmoji = document.createElement('span');
    moonEmoji.className = 'summary-moon__emoji';
    moonEmoji.setAttribute('aria-hidden', 'true');
    moonEmoji.textContent = moon.emoji;
    const moonName = document.createElement('span');
    moonName.className = 'summary-moon__name';
    moonName.textContent = moon.name;
    moonEl.appendChild(moonEmoji);
    moonEl.appendChild(moonName);

    header.appendChild(dateSpan);
    header.appendChild(moonEl);
    container.appendChild(header);

    // Children progress cards
    if (data.children.length > 0) {
      const section = document.createElement('div');
      section.className = 'summary-section summary-children';
      for (const child of data.children) {
        const card = document.createElement('div');
        card.className = 'summary-child-card';

        // Clickable header area — navigates to child dashboard
        const header = document.createElement('button');
        header.type = 'button';
        header.className = 'summary-child-header';
        header.addEventListener('click', () => onSelectChild(child.id));

        const nameRow = document.createElement('div');
        nameRow.className = 'summary-child-name';
        nameRow.textContent = `${child.icon || '⭐'} ${child.name}`;
        header.appendChild(nameRow);

        const bar = document.createElement('div');
        bar.className = 'summary-progress-bar';
        const fill = document.createElement('div');
        fill.className = 'summary-progress-fill';
        fill.style.width = `${child.percent}%`;
        bar.appendChild(fill);
        header.appendChild(bar);

        const stats = document.createElement('div');
        stats.className = 'summary-child-stats';
        const statsText = `${child.completed} of ${child.total} chores`;
        stats.textContent = statsText;
        header.appendChild(stats);

        card.appendChild(header);

        // Quick actions — next 3 incomplete chores
        if (child.nextChores.length > 0) {
          const actions = document.createElement('div');
          actions.className = 'summary-quick-actions';

          const periodId = new Date().toISOString().slice(0, 10);

          for (const chore of child.nextChores) {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'summary-chore-btn';
            btn.textContent = `${chore.icon || '✔'} ${chore.title}`;
            btn.addEventListener('click', () => {
              btn.disabled = true;
              btn.classList.add('summary-chore-btn--completing');
              choreApi
                .complete(chore.id, periodId)
                .then(() => refresh())
                .catch(() => {
                  btn.disabled = false;
                  btn.classList.remove('summary-chore-btn--completing');
                });
            });
            actions.appendChild(btn);
          }

          card.appendChild(actions);
        }

        section.appendChild(card);
      }
      container.appendChild(section);
    }

    // Today's meals
    const mealSlots = [
      { key: 'breakfast' as const, label: 'Breakfast', icon: '🍳' },
      { key: 'lunch' as const, label: 'Lunch', icon: '🥗' },
      { key: 'dinner' as const, label: 'Dinner', icon: '🍽️' },
      { key: 'snack' as const, label: 'Snack', icon: '🍎' },
    ].filter((s) => data.meals[s.key]);

    if (mealSlots.length > 0) {
      const section = document.createElement('div');
      section.className = 'summary-section summary-meals';
      const heading = document.createElement('div');
      heading.className = 'summary-section-heading';
      heading.textContent = "Today's Meals";
      section.appendChild(heading);
      for (const slot of mealSlots) {
        const row = document.createElement('div');
        row.className = 'summary-meal-row';
        row.textContent = `${slot.icon} ${slot.label}: ${data.meals[slot.key]}`;
        section.appendChild(row);
      }
      container.appendChild(section);
    }

    // Reminders
    if (data.reminders.length > 0) {
      const section = document.createElement('div');
      section.className = 'summary-section summary-reminders';
      const heading = document.createElement('div');
      heading.className = 'summary-section-heading';
      heading.textContent = 'Reminders';
      section.appendChild(heading);
      for (const reminder of data.reminders) {
        const item = document.createElement('div');
        item.className = 'summary-reminder-item';
        item.textContent = reminder.title;
        section.appendChild(item);
      }
      container.appendChild(section);
    }

    // Affirmation
    const affirmation = document.createElement('div');
    affirmation.className = 'summary-affirmation';
    affirmation.textContent = `"${data.affirmation}"`;
    container.appendChild(affirmation);
  }

  async function refresh(): Promise<void> {
    try {
      const data = await summaryApi.get();
      render(data);
    } catch {
      // keep showing last render on network error
    }
  }

  container.destroy = (): void => {
    if (timer !== null) {
      clearInterval(timer);
      timer = null;
    }
    wakeLock?.release().catch(() => {});
    wakeLock = null;
  };

  void acquireWakeLock();
  void refresh();
  timer = window.setInterval(() => {
    if (!document.hidden) void refresh();
  }, REFRESH_MS);

  return container;
}
