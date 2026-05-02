import type { User } from '../shared/types.js';
import { users as usersApi } from './utils/api.js';
import { renderUserSelector, handleUserSelected } from './components/UserSelector.js';
import { applyTheme } from './utils/theme.js';
import { loadActiveUserId } from './utils/userState.js';
import { createParentDashboard } from './views/ParentDashboard.js';

function showDashboard(app: HTMLElement, user: User): void {
  app.innerHTML = '';
  if (user.type === 'parent') {
    app.appendChild(createParentDashboard(user.id));
  } else {
    app.innerHTML = `<p>Child dashboard coming soon (M6).</p>`;
  }
}

async function init(): Promise<void> {
  applyTheme('farmstead');

  const app = document.getElementById('app');
  if (!app) return;

  const savedId = loadActiveUserId();
  if (savedId !== null) {
    try {
      const allUsers = await usersApi.list();
      const user = allUsers.find((u) => u.id === savedId);
      if (user) {
        handleUserSelected(user);
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
