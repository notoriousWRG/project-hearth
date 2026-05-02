import type { User } from '../../shared/types.js';
import { applyTheme } from '../utils/theme.js';
import { getViewMode, getThemeForViewMode, saveActiveUserId } from '../utils/userState.js';

export function renderUserSelector(users: User[], onSelect: (user: User) => void): HTMLElement {
  const section = document.createElement('section');
  section.className = 'user-selector';

  const heading = document.createElement('h1');
  heading.textContent = 'Who are you?';
  section.appendChild(heading);

  const grid = document.createElement('div');
  grid.className = 'user-selector__grid';

  for (const user of users) {
    const btn = document.createElement('button');
    btn.className = `user-selector__btn user-selector__btn--${user.type}`;
    btn.setAttribute('data-user-id', String(user.id));

    const icon = document.createElement('span');
    icon.className = 'user-selector__icon';
    icon.textContent = user.icon ?? (user.type === 'parent' ? '👤' : '⭐');

    const name = document.createElement('span');
    name.className = 'user-selector__name';
    name.textContent = user.name;

    btn.appendChild(icon);
    btn.appendChild(name);
    btn.addEventListener('click', () => onSelect(user));
    grid.appendChild(btn);
  }

  section.appendChild(grid);
  return section;
}

export function handleUserSelected(user: User): void {
  saveActiveUserId(user.id);
  const mode = getViewMode(user.type);
  const theme = getThemeForViewMode(mode);
  document.documentElement.setAttribute('data-view', mode);
  applyTheme(theme);
}
