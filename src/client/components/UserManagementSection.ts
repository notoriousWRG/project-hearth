import type { User, NewUser } from '../../shared/types.js';

interface UserManageApi {
  list: () => Promise<User[]>;
  create: (data: NewUser) => Promise<User>;
  update: (id: number, data: Partial<NewUser>) => Promise<User>;
  remove: (id: number) => Promise<void>;
}

export function createUserManagementSection(api: UserManageApi): HTMLElement {
  const section = document.createElement('section');
  section.className = 'settings-section';

  const heading = document.createElement('h2');
  heading.textContent = 'Manage Users';
  section.appendChild(heading);

  const listEl = document.createElement('ul');
  listEl.className = 'user-list';
  section.appendChild(listEl);

  const notice = document.createElement('p');
  notice.className = 'settings-section__success';
  notice.hidden = true;
  notice.textContent = 'Reload the page to see nav changes.';
  section.appendChild(notice);

  const form = document.createElement('form');
  form.className = 'user-add-form';

  const iconInput = document.createElement('input');
  iconInput.type = 'text';
  iconInput.dataset.field = 'icon';
  iconInput.maxLength = 2;
  iconInput.placeholder = '🧑';
  iconInput.className = 'chore-row__icon';

  const nameInput = document.createElement('input');
  nameInput.type = 'text';
  nameInput.dataset.field = 'name';
  nameInput.placeholder = 'Name';
  nameInput.required = true;
  nameInput.className = 'chore-row__title';

  const typeSelect = document.createElement('select');
  typeSelect.dataset.field = 'type';
  const parentOpt = document.createElement('option');
  parentOpt.value = 'parent';
  parentOpt.textContent = 'Parent';
  const childOpt = document.createElement('option');
  childOpt.value = 'child';
  childOpt.textContent = 'Child';
  typeSelect.appendChild(parentOpt);
  typeSelect.appendChild(childOpt);
  typeSelect.value = 'child';

  const addBtn = document.createElement('button');
  addBtn.type = 'submit';
  addBtn.textContent = 'Add';

  form.appendChild(iconInput);
  form.appendChild(nameInput);
  form.appendChild(typeSelect);
  form.appendChild(addBtn);
  section.appendChild(form);

  let users: User[] = [];

  function renderUserRow(user: User): HTMLLIElement {
    const li = document.createElement('li');
    li.className = 'user-row';
    li.dataset.userId = String(user.id);

    const iconInp = document.createElement('input');
    iconInp.type = 'text';
    iconInp.value = user.icon || '';
    iconInp.maxLength = 2;
    iconInp.className = 'chore-row__icon';
    iconInp.setAttribute('aria-label', 'Icon');
    iconInp.addEventListener('blur', () => {
      void api.update(user.id, { icon: iconInp.value });
    });

    const nameInp = document.createElement('input');
    nameInp.type = 'text';
    nameInp.value = user.name;
    nameInp.className = 'chore-row__title';
    nameInp.setAttribute('aria-label', 'Name');
    nameInp.addEventListener('blur', () => {
      const trimmed = nameInp.value.trim();
      if (trimmed) void api.update(user.id, { name: trimmed });
    });

    const typeBadge = document.createElement('span');
    typeBadge.className = `user-row__type user-row__type--${user.type}`;
    typeBadge.textContent = user.type;

    const delBtn = document.createElement('button');
    delBtn.type = 'button';
    delBtn.dataset.action = 'delete';
    delBtn.textContent = 'Delete';
    delBtn.addEventListener('click', () => {
      void api.remove(user.id).then(() => {
        notice.hidden = false;
        loadUsers();
      });
    });

    li.appendChild(iconInp);
    li.appendChild(nameInp);
    li.appendChild(typeBadge);
    li.appendChild(delBtn);
    return li;
  }

  function renderList(): void {
    listEl.innerHTML = '';
    if (users.length === 0) {
      const empty = document.createElement('li');
      empty.textContent = 'No users yet.';
      listEl.appendChild(empty);
      return;
    }
    for (const user of users) {
      listEl.appendChild(renderUserRow(user));
    }
  }

  function loadUsers(): void {
    void api.list().then((fetched) => {
      users = fetched;
      renderList();
    });
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = nameInput.value.trim();
    if (!name) return;
    void api
      .create({
        name,
        type: typeSelect.value as 'parent' | 'child',
        icon: iconInput.value.trim(),
        display_order: users.length,
      })
      .then(() => {
        nameInput.value = '';
        iconInput.value = '';
        typeSelect.value = 'child';
        notice.hidden = false;
        loadUsers();
      });
  });

  loadUsers();

  return section;
}
