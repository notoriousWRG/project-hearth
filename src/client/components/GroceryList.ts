import type {
  GroceryItem,
  GroceryCategory,
  NewGroceryItem,
  InventoryLocation,
} from '../../shared/types.js';
import { createErrorBanner } from './ErrorBanner.js';

interface GroceryApi {
  list: () => Promise<GroceryItem[]>;
  create: (data: NewGroceryItem) => Promise<GroceryItem>;
  check: (id: number, checked: boolean) => Promise<GroceryItem>;
  remove: (id: number) => Promise<void>;
  clearChecked: () => Promise<{ deleted: number }>;
  export: () => Promise<{ text: string }>;
}

const CATEGORY_ORDER: GroceryCategory[] = [
  'produce',
  'protein',
  'dairy',
  'pantry',
  'household',
  'other',
];

const CATEGORY_LABELS: Record<GroceryCategory, string> = {
  produce: 'Produce',
  protein: 'Protein',
  dairy: 'Dairy',
  pantry: 'Pantry',
  household: 'Household',
  other: 'Other',
};

function groupByCategory(items: GroceryItem[]): Map<GroceryCategory, GroceryItem[]> {
  const map = new Map<GroceryCategory, GroceryItem[]>();
  for (const cat of CATEGORY_ORDER) map.set(cat, []);
  for (const item of items) {
    const bucket = map.get(item.category) ?? map.get('other')!;
    bucket.push(item);
  }
  return map;
}

interface GroceryListOpts {
  onMoveToInventory?: (item: GroceryItem, location: InventoryLocation) => Promise<void>;
}

export function createGroceryList(api: GroceryApi, opts: GroceryListOpts = {}): HTMLElement {
  const section = document.createElement('section');
  section.className = 'grocery-list';

  // Toolbar
  const toolbar = document.createElement('div');
  toolbar.className = 'grocery-list__toolbar';

  const clearBtn = document.createElement('button');
  clearBtn.dataset.action = 'clear-checked';
  clearBtn.textContent = 'Clear checked';
  clearBtn.setAttribute('aria-label', 'Clear all checked items');
  toolbar.appendChild(clearBtn);

  const exportBtn = document.createElement('button');
  exportBtn.dataset.action = 'export';
  exportBtn.textContent = 'Export list';
  toolbar.appendChild(exportBtn);

  section.appendChild(toolbar);

  // Add form
  const form = document.createElement('form');
  form.className = 'grocery-list__add-form';

  const nameInput = document.createElement('input');
  nameInput.type = 'text';
  nameInput.placeholder = 'Item name…';
  nameInput.required = true;

  const catSelect = document.createElement('select');
  catSelect.name = 'category';
  for (const cat of CATEGORY_ORDER) {
    const opt = document.createElement('option');
    opt.value = cat;
    opt.textContent = CATEGORY_LABELS[cat];
    catSelect.appendChild(opt);
  }

  const addBtn = document.createElement('button');
  addBtn.type = 'submit';
  addBtn.textContent = 'Add';

  form.appendChild(nameInput);
  form.appendChild(catSelect);
  form.appendChild(addBtn);
  section.appendChild(form);

  // Content area (categories + empty state)
  const content = document.createElement('div');
  content.className = 'grocery-list__content';
  section.appendChild(content);

  let items: GroceryItem[] = [];

  function rerender() {
    content.innerHTML = '';
    if (items.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'grocery-list__empty';
      empty.textContent = 'Your list is empty.';
      content.appendChild(empty);
      return;
    }

    const grouped = groupByCategory(items);
    for (const cat of CATEGORY_ORDER) {
      const catItems = grouped.get(cat) ?? [];
      if (catItems.length === 0) continue;

      const catSection = document.createElement('div');
      catSection.className = 'grocery-category';
      catSection.dataset.category = cat;

      const title = document.createElement('h3');
      title.className = 'grocery-category__title';
      title.textContent = CATEGORY_LABELS[cat];
      catSection.appendChild(title);

      const ul = document.createElement('ul');
      for (const item of catItems) {
        ul.appendChild(renderItem(item));
      }
      catSection.appendChild(ul);
      content.appendChild(catSection);
    }
  }

  function renderItem(item: GroceryItem): HTMLLIElement {
    const li = document.createElement('li');
    li.className = `grocery-item${item.checked ? ' grocery-item--checked' : ''}`;
    li.dataset.id = String(item.id);

    const label = document.createElement('label');

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = item.checked;
    checkbox.addEventListener('change', async () => {
      const updated = await api.check(item.id, checkbox.checked);
      items = items.map((i) => (i.id === updated.id ? updated : i));
      rerender();
    });

    const name = document.createElement('span');
    name.className = 'grocery-item__name';
    name.textContent = item.name;

    label.appendChild(checkbox);
    label.appendChild(name);

    const deleteBtn = document.createElement('button');
    deleteBtn.dataset.action = 'delete';
    deleteBtn.textContent = '×';
    deleteBtn.setAttribute('aria-label', `Delete "${item.name}"`);
    deleteBtn.addEventListener('click', async () => {
      await api.remove(item.id);
      items = items.filter((i) => i.id !== item.id);
      rerender();
    });

    li.appendChild(label);
    li.appendChild(deleteBtn);

    if (opts.onMoveToInventory) {
      const moveActions = document.createElement('div');
      moveActions.className = 'grocery-item__move-actions';

      for (const loc of ['pantry', 'icebox'] as InventoryLocation[]) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.dataset.action = `move-to-${loc}`;
        btn.textContent = `→ ${loc.charAt(0).toUpperCase() + loc.slice(1)}`;
        btn.addEventListener('click', async () => {
          await opts.onMoveToInventory!(item, loc);
          items = items.filter((i) => i.id !== item.id);
          rerender();
        });
        moveActions.appendChild(btn);
      }

      li.appendChild(moveActions);
    }

    return li;
  }

  clearBtn.addEventListener('click', async () => {
    await api.clearChecked();
    items = items.filter((i) => !i.checked);
    rerender();
  });

  exportBtn.addEventListener('click', async () => {
    const { text } = await api.export();
    await navigator.clipboard.writeText(text);
    exportBtn.textContent = 'Copied!';
    setTimeout(() => {
      exportBtn.textContent = 'Export list';
    }, 2000);
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = nameInput.value.trim();
    if (!name) return;
    const created = await api.create({
      name,
      category: catSelect.value as GroceryCategory,
      checked: false,
      source: 'manual',
      meal_plan_id: null,
    });
    items = [...items, created];
    nameInput.value = '';
    rerender();
  });

  api
    .list()
    .then((fetched) => {
      items = fetched;
      rerender();
    })
    .catch(() => {
      section.insertBefore(createErrorBanner('Could not load grocery list.'), section.firstChild);
    });

  rerender();
  return section;
}
