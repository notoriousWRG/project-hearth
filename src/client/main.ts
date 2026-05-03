import type { User } from '../shared/types.js';
import { users as usersApi } from './utils/api.js';
import { renderUserSelector, handleUserSelected } from './components/UserSelector.js';
import { createTopNav } from './components/TopNav.js';
import { applyTheme } from './utils/theme.js';
import { loadActiveUserId } from './utils/userState.js';
import { createParentDashboard } from './views/ParentDashboard.js';
import { createChildDashboard } from './views/ChildDashboard.js';

function showDashboard(app: HTMLElement, user: User): void {
  app.innerHTML = '';
  if (user.type === 'parent') {
    app.appendChild(createParentDashboard(user.id));
  } else {
    app.appendChild(createChildDashboard(user));
  }
}

function showSummary(app: HTMLElement): void {
  app.innerHTML = '';
  applyTheme('farmstead');
  document.documentElement.setAttribute('data-view', 'parent');
  const placeholder = document.createElement('div');
  placeholder.className = 'summary-placeholder';
  placeholder.innerHTML = '<p>Family summary — coming in M8.</p>';
  app.appendChild(placeholder);
}

async function init(): Promise<void> {
  applyTheme('farmstead');

  const app = document.getElementById('app');
  const topNavEl = document.getElementById('top-nav');
  if (!app || !topNavEl) return;

  let nav: ReturnType<typeof createTopNav> | null = null;

  function activateNav(allUsers: User[], activeId: number | null): void {
    if (nav) return; // already mounted
    nav = createTopNav(
      allUsers,
      activeId,
      (user) => {
        handleUserSelected(user);
        nav?.setActive(user.id, false);
        showDashboard(app!, user);
      },
      () => {
        nav?.setActive(null, true);
        showSummary(app!);
      },
    );
    topNavEl!.appendChild(nav);
    topNavEl!.hidden = false;
  }

  const savedId = loadActiveUserId();
  if (savedId !== null) {
    try {
      const allUsers = await usersApi.list();
      const user = allUsers.find((u) => u.id === savedId);
      if (user) {
        handleUserSelected(user);
        activateNav(allUsers, user.id);
        showDashboard(app, user);
        return;
      }
    } catch {
      // fall through to selector
    }
  }

  try {
    const allUsers = await usersApi.list();
    const selector = renderUserSelector(allUsers, (user) => {
      handleUserSelected(user);
      activateNav(allUsers, user.id);
      app.innerHTML = '';
      showDashboard(app, user);
    });
    app.appendChild(selector);
  } catch (err) {
    app.innerHTML = `<p>Could not load users. Is the server running?</p>`;
    console.error(err);
  }
}

init();
