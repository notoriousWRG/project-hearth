import type { User } from '../shared/types.js';
import { users as usersApi } from './utils/api.js';
import { settings as settingsApi } from './utils/api.js';
import { renderUserSelector, handleUserSelected } from './components/UserSelector.js';
import { createTopNav } from './components/TopNav.js';
import { createPinGate } from './components/PinGate.js';
import { applyTheme, THEMES, type Theme } from './utils/theme.js';
import { loadActiveUserId } from './utils/userState.js';
import { createParentDashboard } from './views/ParentDashboard.js';
import { createChildDashboard } from './views/ChildDashboard.js';
import { createSettingsPanel } from './views/SettingsPanel.js';

const THEME_PARENT_KEY = 'hearth:theme:parent';
const THEME_CHILD_KEY = 'hearth:theme:child';

function applyStoredTheme(viewMode: 'parent' | 'child'): void {
  const key = viewMode === 'parent' ? THEME_PARENT_KEY : THEME_CHILD_KEY;
  const stored = localStorage.getItem(key) as Theme | null;
  if (stored && THEMES.includes(stored)) {
    applyTheme(stored);
  } else {
    applyTheme(viewMode === 'parent' ? 'farmstead' : 'whimsy');
  }
}

function showDashboard(app: HTMLElement, user: User): void {
  app.innerHTML = '';
  if (user.type === 'parent') {
    applyStoredTheme('parent');
    app.appendChild(createParentDashboard(user.id));
  } else {
    applyStoredTheme('child');
    app.appendChild(createChildDashboard(user));
  }
}

function showSummary(app: HTMLElement): void {
  app.innerHTML = '';
  applyStoredTheme('parent');
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
  let cachedUsers: User[] = [];

  function switchToSettings(): void {
    nav?.setActive(null, false);
    const gate = createPinGate(
      (pin) => {
        const children = cachedUsers.filter((u) => u.type === 'child');
        app.innerHTML = '';
        app.appendChild(createSettingsPanel(pin, children, cachedUsers));
      },
      () => {
        // Return to selector if no user was active
        const savedId = loadActiveUserId();
        const user = savedId !== null ? cachedUsers.find((u) => u.id === savedId) : null;
        if (user) {
          nav?.setActive(user.id, false);
          showDashboard(app, user);
        } else {
          app.innerHTML = '';
          app.appendChild(
            renderUserSelector(cachedUsers, (u) => {
              handleUserSelected(u);
              nav?.setActive(u.id, false);
              showDashboard(app, u);
            }),
          );
        }
      },
      settingsApi.verifyPin,
    );
    app.innerHTML = '';
    app.appendChild(gate);
  }

  function activateNav(allUsers: User[], activeId: number | null): void {
    if (nav) return;
    cachedUsers = allUsers;
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
      switchToSettings,
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
    cachedUsers = allUsers;
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
