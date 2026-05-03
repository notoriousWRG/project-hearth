import type { Chore, ChoreCompletion, StreakRecord } from '../../shared/types.js';

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

  const list = document.createElement('ul');
  section.appendChild(list);

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

    const iconSpan = document.createElement('span');
    iconSpan.className = 'child-chore-item__icon';
    iconSpan.textContent = chore.icon || '✓';

    const titleSpan = document.createElement('span');
    titleSpan.className = 'child-chore-item__title';
    titleSpan.textContent = chore.title;

    btn.appendChild(iconSpan);
    btn.appendChild(titleSpan);

    if (!chore.completed) {
      btn.addEventListener('click', () => {
        if (btn.classList.contains('child-chore-item--done')) return;
        btn.classList.add('child-chore-item--completing');

        api.complete(chore.id, today()).then(() => {
          btn.classList.remove('child-chore-item--completing');
          btn.classList.add('child-chore-item--done');
          onComplete();
        });
      });
    }

    li.appendChild(btn);
    return li;
  }

  api.list(userId).then((chores) => {
    list.innerHTML = '';
    for (const chore of chores) {
      list.appendChild(renderChore(chore));
    }
  });

  return section;
}
