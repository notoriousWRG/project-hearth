import { users as usersApi } from './utils/api.js';
import { renderUserSelector, handleUserSelected } from './components/UserSelector.js';
import { applyTheme } from './utils/theme.js';
import { loadActiveUserId } from './utils/userState.js';

async function init(): Promise<void> {
  applyTheme('clean');

  const app = document.getElementById('app');
  if (!app) return;

  const savedId = loadActiveUserId();
  if (savedId !== null) {
    try {
      const allUsers = await usersApi.list();
      const user = allUsers.find((u) => u.id === savedId);
      if (user) {
        handleUserSelected(user);
        app.innerHTML = `<p>Welcome back, ${user.name}!</p>`;
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
      app.innerHTML = `<p>Hello, ${user.name}!</p>`;
    });
    app.appendChild(selector);
  } catch (err) {
    app.innerHTML = `<p>Could not load users. Is the server running?</p>`;
    console.error(err);
  }
}

init();
