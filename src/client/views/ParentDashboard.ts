import { createDailyOverview } from '../components/DailyOverview.js';
import { createTodoList } from '../components/TodoList.js';
import { createChoreList } from '../components/ChoreList.js';
import { createRemindersPanel } from '../components/RemindersPanel.js';
import { createMealPlanGrid } from '../components/MealPlanGrid.js';
import { createGroceryView } from '../components/GroceryView.js';
import { createDashboardNav } from '../components/DashboardNav.js';
import type { DashboardTab } from '../components/DashboardNav.js';
import * as api from '../utils/api.js';

export function createParentDashboard(userId: number): HTMLElement {
  const view = document.createElement('div');
  view.className = 'parent-dashboard';

  // Build structure upfront so all nodes are in the DOM before renderNav runs
  view.appendChild(createDailyOverview());

  const navSlot = document.createElement('div');
  view.appendChild(navSlot);

  const content = document.createElement('div');
  content.className = 'dashboard-content';
  view.appendChild(content);

  let activeTab: DashboardTab = 'overview';

  function renderNav() {
    navSlot.innerHTML = '';
    navSlot.appendChild(
      createDashboardNav(activeTab, (tab) => {
        activeTab = tab;
        renderNav();
        renderContent();
      }),
    );
  }

  function renderContent() {
    content.innerHTML = '';
    if (activeTab === 'overview') {
      const grid = document.createElement('div');
      grid.className = 'overview-grid';
      grid.appendChild(createTodoList(userId, api.todos));
      grid.appendChild(createChoreList(userId, api.chores));
      grid.appendChild(createRemindersPanel(api.reminders));
      content.appendChild(grid);
    } else if (activeTab === 'meals') {
      content.appendChild(
        createMealPlanGrid({ ...api.meals, listSavedMeals: api.savedMeals.list }),
      );
    } else {
      content.appendChild(createGroceryView({ grocery: api.grocery, inventory: api.inventory }));
    }
  }

  renderNav();
  renderContent();

  return view;
}
