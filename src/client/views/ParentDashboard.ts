import { createDailyOverview } from '../components/DailyOverview.js';
import { createTodoList } from '../components/TodoList.js';
import { createChoreList } from '../components/ChoreList.js';
import { createRemindersPanel } from '../components/RemindersPanel.js';
import * as api from '../utils/api.js';

export function createParentDashboard(userId: number): HTMLElement {
  const view = document.createElement('div');
  view.className = 'parent-dashboard';

  view.appendChild(createDailyOverview());
  view.appendChild(createTodoList(userId, api.todos));
  view.appendChild(createChoreList(userId, api.chores));
  view.appendChild(createRemindersPanel(api.reminders));

  return view;
}
