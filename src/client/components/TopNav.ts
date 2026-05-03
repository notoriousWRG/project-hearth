import type { User } from '../../shared/types.js';

type TopNavElement = HTMLElement & { setActive: (id: number | null, isSummary?: boolean) => void };

export function createTopNav(
  users: User[],
  activeId: number | null,
  onSelectUser: (user: User) => void,
  onSelectSummary: () => void,
): TopNavElement {
  const nav = document.createElement('nav') as TopNavElement;
  nav.className = 'top-nav';

  const summaryBtn = document.createElement('button');
  summaryBtn.type = 'button';
  summaryBtn.className = 'top-nav__btn';
  summaryBtn.dataset.summary = '';

  const summaryIcon = document.createElement('span');
  summaryIcon.className = 'top-nav__icon';
  summaryIcon.textContent = '🏠';

  const summaryLabel = document.createElement('span');
  summaryLabel.className = 'top-nav__label';
  summaryLabel.textContent = 'Summary';

  summaryBtn.appendChild(summaryIcon);
  summaryBtn.appendChild(summaryLabel);
  summaryBtn.addEventListener('click', onSelectSummary);
  nav.appendChild(summaryBtn);

  const divider = document.createElement('div');
  divider.className = 'top-nav__divider';
  nav.appendChild(divider);

  for (const user of users) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'top-nav__btn';
    btn.dataset.userId = String(user.id);

    const icon = document.createElement('span');
    icon.className = 'top-nav__icon';
    icon.textContent = user.icon || (user.type === 'parent' ? '👤' : '⭐');

    const label = document.createElement('span');
    label.className = 'top-nav__label';
    label.textContent = user.name;

    btn.appendChild(icon);
    btn.appendChild(label);
    btn.addEventListener('click', () => onSelectUser(user));
    nav.appendChild(btn);
  }

  function setActive(id: number | null, isSummary = false): void {
    for (const btn of nav.querySelectorAll<HTMLElement>('.top-nav__btn')) {
      btn.classList.remove('top-nav__btn--active');
    }
    if (isSummary) {
      summaryBtn.classList.add('top-nav__btn--active');
    } else if (id !== null) {
      const btn = nav.querySelector<HTMLElement>(`[data-user-id="${id}"]`);
      btn?.classList.add('top-nav__btn--active');
    }
  }

  setActive(activeId, false);
  nav.setActive = setActive;

  return nav;
}
