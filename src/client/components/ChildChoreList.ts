import type { Chore, ChoreCompletion, StreakRecord } from '../../shared/types.js';
import { createErrorBanner } from './ErrorBanner.js';

interface ChildChoreApi {
  list: (userId: number) => Promise<Chore[]>;
  complete: (
    id: number,
    periodId: string,
  ) => Promise<{ completion: ChoreCompletion; streak: StreakRecord }>;
}

export function createChildChoreList(
  userId: number,
  api: ChildChoreApi,
  onComplete: () => void,
): HTMLElement {
  const section = document.createElement('section');
  section.className = 'child-chore-list';
  section.setAttribute('aria-label', 'Chores');

  const list = document.createElement('ul');
  list.setAttribute('role', 'list');
  section.appendChild(list);

  const spinner = document.createElement('div');
  spinner.className = 'loading-spinner';
  spinner.setAttribute('aria-label', 'Loading chores');
  section.appendChild(spinner);

  // Tracks chores currently mid-completion to prevent double-fire
  const completing = new Set<number>();

  function today(): string {
    return new Date().toISOString().slice(0, 10);
  }

  function renderChore(chore: Chore): HTMLLIElement {
    const li = document.createElement('li');

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'child-chore-item';
    if (chore.completed) btn.classList.add('child-chore-item--done');
    if (chore.is_bonus) btn.classList.add('child-chore-item--bonus');

    btn.setAttribute('aria-pressed', String(chore.completed));
    btn.setAttribute('aria-label', chore.completed ? `${chore.title} — done` : chore.title);

    const iconSpan = document.createElement('span');
    iconSpan.className = 'child-chore-item__icon';
    iconSpan.textContent = chore.icon || '✓';
    iconSpan.setAttribute('aria-hidden', 'true');

    const titleSpan = document.createElement('span');
    titleSpan.className = 'child-chore-item__title';
    titleSpan.textContent = chore.title;

    btn.appendChild(iconSpan);
    btn.appendChild(titleSpan);

    if (!chore.completed) {
      btn.addEventListener('click', () => {
        if (completing.has(chore.id)) return;
        if (btn.classList.contains('child-chore-item--done')) return;

        completing.add(chore.id);
        btn.classList.add('child-chore-item--completing');

        api
          .complete(chore.id, today())
          .then(() => {
            btn.classList.remove('child-chore-item--completing');
            btn.classList.add('child-chore-item--done');
            btn.setAttribute('aria-pressed', 'true');
            btn.setAttribute('aria-label', `${chore.title} — done`);
            onComplete();
          })
          .catch(() => {
            btn.classList.remove('child-chore-item--completing');
            completing.delete(chore.id);
            section.insertBefore(
              createErrorBanner('Could not save chore. Please try again.'),
              section.firstChild,
            );
          });
      });
    }

    li.appendChild(btn);
    return li;
  }

  api
    .list(userId)
    .then((chores) => {
      list.innerHTML = '';
      if (chores.length === 0) {
        const empty = document.createElement('p');
        empty.className = 'child-chore-list__empty';
        empty.textContent = 'No chores yet!';
        list.appendChild(document.createElement('li')).appendChild(empty);
      } else {
        for (const chore of chores) {
          list.appendChild(renderChore(chore));
        }
      }
    })
    .catch(() => {
      section.insertBefore(createErrorBanner('Could not load chores.'), section.firstChild);
    })
    .finally(() => {
      spinner.remove();
    });

  return section;
}
