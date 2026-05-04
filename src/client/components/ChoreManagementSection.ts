import type { Chore, User } from '../../shared/types.js';

interface ChoreManageApi {
  list: (userId: number) => Promise<Chore[]>;
  create: (data: Partial<Chore>) => Promise<Chore>;
  update: (id: number, data: Partial<Chore>) => Promise<Chore>;
  remove: (id: number) => Promise<void>;
  reorder: (userId: number, ids: number[]) => Promise<Chore[]>;
  uncomplete: (id: number) => Promise<Chore>;
}

export function createChoreManagementSection(childUsers: User[], api: ChoreManageApi): HTMLElement {
  const section = document.createElement('section');
  section.className = 'settings-section';

  const heading = document.createElement('h2');
  heading.textContent = 'Manage Chores';
  section.appendChild(heading);

  if (childUsers.length === 0) {
    const empty = document.createElement('p');
    empty.textContent = 'No children configured.';
    section.appendChild(empty);
    return section;
  }

  // Tab strip
  const tabStrip = document.createElement('div');
  tabStrip.className = 'settings-child-tabs';
  section.appendChild(tabStrip);

  const content = document.createElement('div');
  section.appendChild(content);

  let activeChildId = childUsers[0].id;
  let chores: Chore[] = [];

  function renderTabs(): void {
    tabStrip.innerHTML = '';
    for (const child of childUsers) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.dataset.childId = String(child.id);
      btn.textContent = `${child.icon || '⭐'} ${child.name}`;
      btn.className =
        'settings-child-tab' + (child.id === activeChildId ? ' settings-child-tab--active' : '');
      btn.addEventListener('click', () => {
        activeChildId = child.id;
        renderTabs();
        loadChores();
      });
      tabStrip.appendChild(btn);
    }
  }

  function renderChoreRow(chore: Chore, index: number): HTMLLIElement {
    const li = document.createElement('li');
    li.className = 'chore-row';
    li.dataset.choreId = String(chore.id);

    const iconInput = document.createElement('input');
    iconInput.type = 'text';
    iconInput.value = chore.icon || '';
    iconInput.maxLength = 2;
    iconInput.className = 'chore-row__icon';
    iconInput.setAttribute('aria-label', 'Icon');
    iconInput.addEventListener('blur', () => {
      void api.update(chore.id, { icon: iconInput.value });
    });

    const titleInput = document.createElement('input');
    titleInput.type = 'text';
    titleInput.value = chore.title;
    titleInput.className = 'chore-row__title';
    titleInput.setAttribute('aria-label', 'Title');
    titleInput.addEventListener('blur', () => {
      void api.update(chore.id, { title: titleInput.value });
    });

    const upBtn = document.createElement('button');
    upBtn.type = 'button';
    upBtn.dataset.action = 'move-up';
    upBtn.textContent = '↑';
    upBtn.disabled = index === 0;
    upBtn.addEventListener('click', () => {
      const ids = chores.map((c) => c.id);
      const i = ids.indexOf(chore.id);
      if (i <= 0) return;
      [ids[i - 1], ids[i]] = [ids[i], ids[i - 1]];
      void api.reorder(activeChildId, ids).then(() => loadChores());
    });

    const downBtn = document.createElement('button');
    downBtn.type = 'button';
    downBtn.dataset.action = 'move-down';
    downBtn.textContent = '↓';
    downBtn.disabled = index === chores.length - 1;
    downBtn.addEventListener('click', () => {
      const ids = chores.map((c) => c.id);
      const i = ids.indexOf(chore.id);
      if (i >= ids.length - 1) return;
      [ids[i], ids[i + 1]] = [ids[i + 1], ids[i]];
      void api.reorder(activeChildId, ids).then(() => loadChores());
    });

    if (chore.completed) {
      const undoBtn = document.createElement('button');
      undoBtn.type = 'button';
      undoBtn.dataset.action = 'uncomplete';
      undoBtn.textContent = '✓ Undo';
      undoBtn.addEventListener('click', () => {
        void api.uncomplete(chore.id).then(() => loadChores());
      });
      li.appendChild(undoBtn);
    }

    const delBtn = document.createElement('button');
    delBtn.type = 'button';
    delBtn.dataset.action = 'delete';
    delBtn.textContent = 'Delete';
    delBtn.addEventListener('click', () => {
      void api.remove(chore.id).then(() => loadChores());
    });

    li.appendChild(iconInput);
    li.appendChild(titleInput);
    li.appendChild(upBtn);
    li.appendChild(downBtn);
    li.appendChild(delBtn);

    for (const target of childUsers.filter((c) => c.id !== activeChildId)) {
      const copyBtn = document.createElement('button');
      copyBtn.type = 'button';
      copyBtn.dataset.action = 'copy-to';
      copyBtn.dataset.targetId = String(target.id);
      copyBtn.textContent = `→ ${target.icon || '⭐'} ${target.name}`;
      copyBtn.addEventListener('click', () => {
        copyBtn.disabled = true;
        void api.list(target.id).then((targetChores) => {
          const currentTitle = titleInput.value.trim().toLowerCase();
          const duplicate = targetChores.some((c) => c.title.trim().toLowerCase() === currentTitle);
          if (duplicate) {
            copyBtn.textContent = 'Already there';
            setTimeout(() => {
              copyBtn.textContent = `→ ${target.icon || '⭐'} ${target.name}`;
              copyBtn.disabled = false;
            }, 2000);
            return;
          }
          void api
            .create({
              user_id: target.id,
              title: titleInput.value.trim(),
              icon: iconInput.value,
              completed: false,
              is_recurring: chore.is_recurring,
              recurrence_rule: chore.recurrence_rule,
              is_bonus: false,
              bonus_amount: null,
              position: targetChores.length,
            })
            .then(() => {
              copyBtn.textContent = '✓ Copied';
              setTimeout(() => {
                copyBtn.textContent = `→ ${target.icon || '⭐'} ${target.name}`;
                copyBtn.disabled = false;
              }, 2000);
            });
        });
      });
      li.appendChild(copyBtn);
    }

    return li;
  }

  function renderContent(): void {
    content.innerHTML = '';

    // Add form
    const form = document.createElement('form');
    const iconInput = document.createElement('input');
    iconInput.type = 'text';
    iconInput.dataset.field = 'icon';
    iconInput.maxLength = 2;
    iconInput.placeholder = '🏡';
    iconInput.className = 'chore-row__icon';

    const titleInput = document.createElement('input');
    titleInput.type = 'text';
    titleInput.dataset.field = 'title';
    titleInput.placeholder = 'New chore…';
    titleInput.required = true;
    titleInput.className = 'chore-row__title';

    const addBtn = document.createElement('button');
    addBtn.type = 'submit';
    addBtn.textContent = 'Add';

    form.appendChild(iconInput);
    form.appendChild(titleInput);
    form.appendChild(addBtn);
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const title = titleInput.value.trim();
      if (!title) return;
      void api
        .create({
          user_id: activeChildId,
          title,
          icon: iconInput.value.trim(),
          completed: false,
          is_recurring: true,
          recurrence_rule: 'daily',
          is_bonus: false,
          bonus_amount: null,
          position: chores.length,
        })
        .then(() => {
          titleInput.value = '';
          iconInput.value = '';
          loadChores();
        });
    });
    content.appendChild(form);

    // Chore list
    if (chores.length === 0) {
      const empty = document.createElement('p');
      empty.textContent = 'No chores yet.';
      content.appendChild(empty);
    } else {
      const ul = document.createElement('ul');
      chores.forEach((chore, index) => ul.appendChild(renderChoreRow(chore, index)));
      content.appendChild(ul);
    }
  }

  function loadChores(): void {
    api.list(activeChildId).then((fetched) => {
      chores = fetched;
      renderContent();
    });
  }

  renderTabs();
  loadChores();

  return section;
}
