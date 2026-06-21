import type {
  GroceryItem,
  NewGroceryItem,
  InventoryItem,
  NewInventoryItem,
  InventoryLocation,
} from '../../shared/types.js';
import { createGroceryList } from './GroceryList.js';
import { createInventoryList } from './InventoryList.js';

interface GroceryApi {
  list: () => Promise<GroceryItem[]>;
  create: (data: NewGroceryItem) => Promise<GroceryItem>;
  check: (id: number, checked: boolean) => Promise<GroceryItem>;
  remove: (id: number) => Promise<void>;
  clearChecked: () => Promise<{ deleted: number }>;
  export: () => Promise<{ text: string }>;
}

interface InventoryApi {
  list: (location?: InventoryLocation) => Promise<InventoryItem[]>;
  create: (data: NewInventoryItem) => Promise<InventoryItem>;
  update: (
    id: number,
    data: Partial<Pick<NewInventoryItem, 'category' | 'notes'>>,
  ) => Promise<InventoryItem>;
  remove: (id: number) => Promise<void>;
}

interface GroceryViewApi {
  grocery: GroceryApi;
  inventory: InventoryApi;
}

type GroceryTab = 'shopping' | 'pantry' | 'icebox';

const TAB_LABELS: Record<GroceryTab, string> = {
  shopping: 'Shopping',
  pantry: 'Pantry',
  icebox: 'Icebox',
};

const TABS: GroceryTab[] = ['shopping', 'pantry', 'icebox'];

export function createGroceryView(api: GroceryViewApi): HTMLElement {
  const view = document.createElement('div');
  view.className = 'grocery-view';

  const tabBar = document.createElement('div');
  tabBar.className = 'grocery-view__tabs';
  view.appendChild(tabBar);

  const content = document.createElement('div');
  content.className = 'grocery-view__content';
  view.appendChild(content);

  let activeTab: GroceryTab = 'shopping';

  function renderTabs() {
    tabBar.innerHTML = '';
    for (const tab of TABS) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.dataset.tab = tab;
      btn.className = 'grocery-tab' + (tab === activeTab ? ' grocery-tab--active' : '');
      btn.textContent = TAB_LABELS[tab];
      btn.addEventListener('click', () => {
        activeTab = tab;
        renderTabs();
        renderContent();
      });
      tabBar.appendChild(btn);
    }
  }

  function renderContent() {
    content.innerHTML = '';
    if (activeTab === 'shopping') {
      content.appendChild(
        createGroceryList(api.grocery, {
          onMoveToInventory: async (item: GroceryItem, location: InventoryLocation) => {
            await api.inventory.create({
              name: item.name,
              category: item.category,
              location,
              notes: '',
            });
            await api.grocery.remove(item.id);
          },
        }),
      );
    } else {
      content.appendChild(
        createInventoryList(activeTab, api.inventory, {
          onAddToShoppingList: async (item: InventoryItem) => {
            await api.grocery.create({
              name: item.name,
              category: item.category,
              checked: false,
              source: 'manual',
              meal_plan_id: null,
            });
            await api.inventory.remove(item.id);
          },
        }),
      );
    }
  }

  renderTabs();
  renderContent();
  return view;
}
