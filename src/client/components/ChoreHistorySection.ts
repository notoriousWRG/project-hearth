import type { ChoreHistoryEntry, User } from '../../shared/types.js';
import type { createPinChoreHistoryApi } from '../utils/api.js';
import { createErrorBanner } from './ErrorBanner.js';

type HistoryApi = ReturnType<typeof createPinChoreHistoryApi>;

function buildDateList(): { date: string; label: string; sublabel: string }[] {
  const days: { date: string; label: string; sublabel: string }[] = [];
  const now = new Date();

  for (let i = 0; i < 7; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const iso = d.toISOString().slice(0, 10);

    let label: string;
    let sublabel: string;

    if (i === 0) {
      label = 'Today';
      sublabel = d.toLocaleDateString('en-US', { weekday: 'short' });
    } else if (i === 1) {
      label = 'Yesterday';
      sublabel = d.toLocaleDateString('en-US', { weekday: 'short' });
    } else {
      label = d.toLocaleDateString('en-US', { weekday: 'short' });
      sublabel = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }

    days.push({ date: iso, label, sublabel });
  }

  return days;
}

function fmt(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

function createChildHistoryPanel(child: User, historyApi: HistoryApi): HTMLElement {
  const wrap = document.createElement('div');
  wrap.className = 'chore-history-child';

  const dateDays = buildDateList();
  let selectedDate = dateDays[0].date;

  // ── Date strip ────────────────────────────────────────────────
  const dateStrip = document.createElement('div');
  dateStrip.className = 'chore-history-date-strip';
  dateStrip.setAttribute('role', 'tablist');
  dateStrip.setAttribute('aria-label', 'Select day');

  const dateBtns: HTMLButtonElement[] = [];

  for (const { date, label, sublabel } of dateDays) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.role = 'tab';
    btn.className = 'chore-history-date-btn';
    btn.dataset.date = date;
    btn.setAttribute('aria-selected', date === selectedDate ? 'true' : 'false');
    if (date === selectedDate) btn.classList.add('chore-history-date-btn--active');

    const labelEl = document.createElement('span');
    labelEl.className = 'chore-history-date-btn__label';
    labelEl.textContent = label;

    const subEl = document.createElement('span');
    subEl.className = 'chore-history-date-btn__sub';
    subEl.textContent = sublabel;

    btn.appendChild(labelEl);
    btn.appendChild(subEl);

    btn.addEventListener('click', () => {
      selectedDate = date;
      dateBtns.forEach((b) => {
        const isActive = b.dataset.date === date;
        b.classList.toggle('chore-history-date-btn--active', isActive);
        b.setAttribute('aria-selected', String(isActive));
      });
      loadDay(date);
    });

    dateBtns.push(btn);
    dateStrip.appendChild(btn);
  }

  wrap.appendChild(dateStrip);

  // ── Day content ───────────────────────────────────────────────
  const dayContent = document.createElement('div');
  dayContent.className = 'chore-history-day';
  wrap.appendChild(dayContent);

  function renderDay(date: string, chores: ChoreHistoryEntry[], earned: number): HTMLElement {
    const container = document.createElement('div');
    container.className = 'chore-history-day-inner';

    // Earned summary
    const earnedCard = document.createElement('div');
    earnedCard.className = 'chore-history-earned';
    const earnedLabel = document.createElement('span');
    earnedLabel.className = 'chore-history-earned__label';
    earnedLabel.textContent = 'Earned';
    const earnedAmount = document.createElement('span');
    earnedAmount.className = 'chore-history-earned__amount';
    earnedAmount.textContent = fmt(earned);
    earnedCard.appendChild(earnedLabel);
    earnedCard.appendChild(earnedAmount);
    container.appendChild(earnedCard);

    if (chores.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'chore-history-empty';
      empty.textContent = 'No chores scheduled for this day.';
      container.appendChild(empty);
      return container;
    }

    const list = document.createElement('ul');
    list.className = 'chore-history-list';
    list.setAttribute('role', 'list');

    const inFlight = new Set<number>();

    for (const chore of chores) {
      const li = document.createElement('li');
      li.className = 'chore-history-item';

      const row = document.createElement('button');
      row.type = 'button';
      row.className = 'chore-history-row';
      if (chore.completed) row.classList.add('chore-history-row--done');
      row.setAttribute('aria-pressed', String(chore.completed));
      row.setAttribute(
        'aria-label',
        `${chore.title} — ${chore.completed ? 'mark incomplete' : 'mark complete'}`,
      );

      const icon = document.createElement('span');
      icon.className = 'chore-history-row__icon';
      icon.setAttribute('aria-hidden', 'true');
      icon.textContent = chore.icon || '✓';

      const title = document.createElement('span');
      title.className = 'chore-history-row__title';
      title.textContent = chore.title;

      const toggle = document.createElement('span');
      toggle.className = 'chore-history-row__toggle';
      toggle.setAttribute('aria-hidden', 'true');

      row.appendChild(icon);
      row.appendChild(title);
      row.appendChild(toggle);

      row.addEventListener('click', () => {
        if (inFlight.has(chore.choreId)) return;
        inFlight.add(chore.choreId);
        row.disabled = true;
        row.classList.add('chore-history-row--saving');

        historyApi
          .toggle(chore.choreId, date, child.id)
          .then(({ completed, earned: newEarned }) => {
            chore.completed = completed;
            row.classList.toggle('chore-history-row--done', completed);
            row.classList.remove('chore-history-row--saving');
            row.setAttribute('aria-pressed', String(completed));
            row.setAttribute(
              'aria-label',
              `${chore.title} — ${completed ? 'mark incomplete' : 'mark complete'}`,
            );
            earnedAmount.textContent = fmt(newEarned);
          })
          .catch(() => {
            row.classList.remove('chore-history-row--saving');
            container.insertBefore(
              createErrorBanner('Could not save change. Please try again.'),
              container.firstChild,
            );
          })
          .finally(() => {
            inFlight.delete(chore.choreId);
            row.disabled = false;
          });
      });

      li.appendChild(row);
      list.appendChild(li);
    }

    container.appendChild(list);
    return container;
  }

  function loadDay(date: string): void {
    dayContent.innerHTML = '';
    const spinner = document.createElement('div');
    spinner.className = 'loading-spinner';
    spinner.setAttribute('aria-label', 'Loading');
    dayContent.appendChild(spinner);

    historyApi
      .getHistory(child.id, date)
      .then(({ chores, earned }) => {
        dayContent.innerHTML = '';
        dayContent.appendChild(renderDay(date, chores, earned));
      })
      .catch(() => {
        dayContent.innerHTML = '';
        dayContent.appendChild(createErrorBanner('Could not load chore history.'));
      });
  }

  loadDay(selectedDate);
  return wrap;
}

export function createChoreHistorySection(childUsers: User[], historyApi: HistoryApi): HTMLElement {
  const section = document.createElement('section');
  section.className = 'settings-section';

  const heading = document.createElement('h2');
  heading.textContent = 'Amend Chore History';
  section.appendChild(heading);

  const desc = document.createElement('p');
  desc.textContent =
    'Tap any chore to toggle whether it was done or missed. Changes update earnings immediately.';
  section.appendChild(desc);

  if (childUsers.length === 0) {
    const empty = document.createElement('p');
    empty.textContent = 'No children configured.';
    section.appendChild(empty);
    return section;
  }

  for (const child of childUsers) {
    const childBlock = document.createElement('div');
    childBlock.className = 'chore-history-child-block';

    const childHeading = document.createElement('h3');
    childHeading.className = 'chore-history-child-heading';
    childHeading.textContent = `${child.icon || '⭐'} ${child.name}`;
    childBlock.appendChild(childHeading);

    childBlock.appendChild(createChildHistoryPanel(child, historyApi));
    section.appendChild(childBlock);
  }

  return section;
}
