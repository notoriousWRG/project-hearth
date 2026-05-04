import type { Reminder } from '../../shared/types.js';
import { createErrorBanner } from './ErrorBanner.js';

interface ReminderApi {
  list: () => Promise<Reminder[]>;
  dismiss: (id: number) => Promise<Reminder>;
}

function renderReminderItem(reminder: Reminder, onDismiss: () => void): HTMLLIElement {
  const li = document.createElement('li');
  li.className = 'reminder-item';
  li.dataset.id = String(reminder.id);

  const title = document.createElement('span');
  title.className = 'reminder-item__title';
  title.textContent = reminder.title;

  const dismissBtn = document.createElement('button');
  dismissBtn.dataset.action = 'dismiss';
  dismissBtn.textContent = 'Dismiss';
  dismissBtn.setAttribute('aria-label', `Dismiss: ${reminder.title}`);
  dismissBtn.addEventListener('click', onDismiss);

  li.appendChild(title);
  li.appendChild(dismissBtn);
  return li;
}

export function createRemindersPanel(api: ReminderApi): HTMLElement {
  const section = document.createElement('section');
  section.className = 'reminders-panel';
  section.setAttribute('aria-label', 'Reminders');

  const heading = document.createElement('h2');
  heading.textContent = 'Reminders';
  section.appendChild(heading);

  const list = document.createElement('ul');
  section.appendChild(list);

  const emptyMsg = document.createElement('p');
  emptyMsg.className = 'reminders-panel__empty';
  emptyMsg.textContent = 'No reminders for today.';
  section.appendChild(emptyMsg);

  let reminders: Reminder[] = [];

  function rerender() {
    list.innerHTML = '';
    const active = reminders.filter((r) => !r.dismissed);
    emptyMsg.style.display = active.length === 0 ? '' : 'none';
    for (const reminder of active) {
      list.appendChild(
        renderReminderItem(reminder, async () => {
          await api.dismiss(reminder.id);
          reminders = reminders.map((r) => (r.id === reminder.id ? { ...r, dismissed: true } : r));
          rerender();
        }),
      );
    }
  }

  api
    .list()
    .then((fetched) => {
      reminders = fetched;
      rerender();
    })
    .catch(() => {
      section.insertBefore(createErrorBanner('Could not load reminders.'), section.firstChild);
    });

  rerender();
  return section;
}
