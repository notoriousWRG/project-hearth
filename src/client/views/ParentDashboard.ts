import { createDailyOverview } from '../components/DailyOverview.js';
import { createEatingOutBar } from '../components/EatingOutBar.js';
import { createCleaningBoard } from '../components/CleaningBoard.js';
import { createMealPlanGrid } from '../components/MealPlanGrid.js';
import { createGroceryView } from '../components/GroceryView.js';
import { createDashboardNav } from '../components/DashboardNav.js';
import type { DashboardTab } from '../components/DashboardNav.js';
import * as api from '../utils/api.js';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function createParentDashboard(_userId: number): HTMLElement {
  const view = document.createElement('div');
  view.className = 'parent-dashboard';

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
      content.appendChild(createEatingOutBar(api.eatingOut));
      content.appendChild(createCleaningBoard(api.cleaning));
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
