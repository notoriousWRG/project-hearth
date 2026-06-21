import type { User } from '../../shared/types.js';

type TopNavElement = HTMLElement & {
  setActive: (id: number | null, isSummary?: boolean, isPhoneBook?: boolean) => void;
};

export function createTopNav(
  users: User[],
  activeId: number | null,
  onSelectUser: (user: User) => void,
  onSelectSummary: () => void,
  onSelectSettings: () => void,
  onSelectPhoneBook: () => void,
): TopNavElement {
  const nav = document.createElement('nav') as TopNavElement;
  nav.className = 'top-nav';

  const summaryBtn = document.createElement('button');
  summaryBtn.type = 'button';
  summaryBtn.className = 'top-nav__btn';
  summaryBtn.dataset.summary = '';
  summaryBtn.setAttribute('aria-label', 'Family summary');

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

  const phoneBookBtn = document.createElement('button');
  phoneBookBtn.type = 'button';
  phoneBookBtn.className = 'top-nav__btn';
  phoneBookBtn.dataset.phonebook = '';
  phoneBookBtn.setAttribute('aria-label', 'Phone Book');

  const phoneBookIcon = document.createElement('span');
  phoneBookIcon.className = 'top-nav__icon';
  phoneBookIcon.textContent = '📞';

  const phoneBookLabel = document.createElement('span');
  phoneBookLabel.className = 'top-nav__label';
  phoneBookLabel.textContent = 'Phone Book';

  phoneBookBtn.appendChild(phoneBookIcon);
  phoneBookBtn.appendChild(phoneBookLabel);
  phoneBookBtn.addEventListener('click', onSelectPhoneBook);
  nav.appendChild(phoneBookBtn);

  const divider = document.createElement('div');
  divider.className = 'top-nav__divider';
  nav.appendChild(divider);

  for (const user of users) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'top-nav__btn';
    btn.dataset.userId = String(user.id);
    btn.setAttribute('aria-label', user.name);

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

  // Settings button on the right
  const settingsDivider = document.createElement('div');
  settingsDivider.className = 'top-nav__divider top-nav__divider--right';
  nav.appendChild(settingsDivider);

  const settingsBtn = document.createElement('button');
  settingsBtn.type = 'button';
  settingsBtn.className = 'top-nav__btn';
  settingsBtn.dataset.settings = '';
  settingsBtn.setAttribute('aria-label', 'Settings');

  const settingsIcon = document.createElement('span');
  settingsIcon.className = 'top-nav__icon';
  settingsIcon.textContent = '⚙️';

  const settingsLabel = document.createElement('span');
  settingsLabel.className = 'top-nav__label';
  settingsLabel.textContent = 'Settings';

  settingsBtn.appendChild(settingsIcon);
  settingsBtn.appendChild(settingsLabel);
  settingsBtn.addEventListener('click', onSelectSettings);
  nav.appendChild(settingsBtn);

  function setActive(id: number | null, isSummary = false, isPhoneBook = false): void {
    for (const btn of nav.querySelectorAll<HTMLElement>('.top-nav__btn')) {
      btn.classList.remove('top-nav__btn--active');
      btn.removeAttribute('aria-current');
    }
    if (isPhoneBook) {
      phoneBookBtn.classList.add('top-nav__btn--active');
      phoneBookBtn.setAttribute('aria-current', 'page');
    } else if (isSummary) {
      summaryBtn.classList.add('top-nav__btn--active');
      summaryBtn.setAttribute('aria-current', 'page');
    } else if (id !== null) {
      const btn = nav.querySelector<HTMLElement>(`[data-user-id="${id}"]`);
      btn?.classList.add('top-nav__btn--active');
      btn?.setAttribute('aria-current', 'page');
    }
  }

  setActive(activeId, false);
  nav.setActive = setActive;

  return nav;
}
