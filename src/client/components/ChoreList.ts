import type { Chore, NewChore } from '../../shared/types.js';
import { createErrorBanner } from './ErrorBanner.js';

interface ChoreApi {
  list: (userId: number) => Promise<Chore[]>;
  create: (data: Pick<NewChore, 'user_id' | 'title'>) => Promise<Chore>;
  remove: (id: number) => Promise<void>;
}

function renderChoreItem(chore: Chore, onDelete: () => void): HTMLLIElement {
  const li = document.createElement('li');
  li.className = `chore-item${chore.is_recurring ? ' chore-item--recurring' : ''}`;
  li.dataset.id = String(chore.id);

  const icon = document.createElement('span');
  icon.className = 'chore-item__icon';
  icon.textContent = chore.icon ?? '✅';

  const title = document.createElement('span');
  title.className = 'chore-item__title';
  title.textContent = chore.title;

  const deleteBtn = document.createElement('button');
  deleteBtn.dataset.action = 'delete';
  deleteBtn.textContent = '×';
  deleteBtn.setAttribute('aria-label', `Delete "${chore.title}"`);
  deleteBtn.addEventListener('click', onDelete);

  li.appendChild(icon);
  li.appendChild(title);
  if (chore.is_recurring) {
    const badge = document.createElement('span');
    badge.className = 'chore-item__recurring-badge';
    badge.textContent = '↻';
    li.appendChild(badge);
  }
  li.appendChild(deleteBtn);
  return li;
}

export function createChoreList(userId: number, api: ChoreApi): HTMLElement {
  const section = document.createElement('section');
  section.className = 'chore-list';
  section.setAttribute('aria-label', 'Chores');

  const heading = document.createElement('h2');
  heading.textContent = 'Chores';
  section.appendChild(heading);

  const form = document.createElement('form');
  const input = document.createElement('input');
  input.type = 'text';
  input.placeholder = 'Add a chore…';
  input.required = true;
  const addBtn = document.createElement('button');
  addBtn.type = 'submit';
  addBtn.textContent = 'Add';
  form.appendChild(input);
  form.appendChild(addBtn);
  section.appendChild(form);

  const list = document.createElement('ul');
  section.appendChild(list);

  const emptyMsg = document.createElement('p');
  emptyMsg.className = 'chore-list__empty';
  emptyMsg.textContent = 'No chores yet.';
  section.appendChild(emptyMsg);

  let chores: Chore[] = [];

  const spinner = document.createElement('div');
  spinner.className = 'loading-spinner';
  spinner.setAttribute('aria-label', 'Loading chores');
  section.appendChild(spinner);

  function rerender() {
    list.innerHTML = '';
    emptyMsg.style.display = chores.length === 0 ? '' : 'none';
    for (const chore of chores) {
      list.appendChild(
        renderChoreItem(chore, async () => {
          await api.remove(chore.id);
          chores = chores.filter((c) => c.id !== chore.id);
          rerender();
        }),
      );
    }
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = input.value.trim();
    if (!title) return;
    try {
      const created = await api.create({ user_id: userId, title });
      chores = [...chores, created];
      input.value = '';
      rerender();
    } catch {
      section.insertBefore(
        createErrorBanner('Could not add chore. Please try again.'),
        section.firstChild,
      );
    }
  });

  api
    .list(userId)
    .then((fetched) => {
      chores = fetched;
      rerender();
    })
    .catch(() => {
      section.insertBefore(createErrorBanner('Could not load chores.'), section.firstChild);
    })
    .finally(() => {
      spinner.remove();
    });

  rerender();
  return section;
}
