import type {
  InventoryItem,
  NewInventoryItem,
  InventoryLocation,
  GroceryCategory,
} from '../../shared/types.js';
import { createErrorBanner } from './ErrorBanner.js';

interface InventoryApi {
  list: (location?: InventoryLocation) => Promise<InventoryItem[]>;
  create: (data: NewInventoryItem) => Promise<InventoryItem>;
  update: (
    id: number,
    data: Partial<Pick<NewInventoryItem, 'category' | 'notes'>>,
  ) => Promise<InventoryItem>;
  remove: (id: number) => Promise<void>;
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

function groupByCategory(items: InventoryItem[]): Map<GroceryCategory, InventoryItem[]> {
  const map = new Map<GroceryCategory, InventoryItem[]>();
  for (const cat of CATEGORY_ORDER) map.set(cat, []);
  for (const item of items) {
    const bucket = map.get(item.category) ?? map.get('other')!;
    bucket.push(item);
  }
  return map;
}

interface InventoryListOpts {
  onAddToShoppingList?: (item: InventoryItem) => Promise<void>;
}

export function createInventoryList(
  location: InventoryLocation,
  api: InventoryApi,
  opts: InventoryListOpts = {},
): HTMLElement {
  const section = document.createElement('section');
  section.className = 'inventory-section';

  const form = document.createElement('form');
  form.className = 'inventory-add-form';

  const nameInput = document.createElement('input');
  nameInput.type = 'text';
  nameInput.placeholder = 'Item name…';
  nameInput.required = true;
  nameInput.dataset.field = 'item-name';

  const catSelect = document.createElement('select');
  catSelect.name = 'category';
  for (const cat of CATEGORY_ORDER) {
    const opt = document.createElement('option');
    opt.value = cat;
    opt.textContent = CATEGORY_LABELS[cat];
    catSelect.appendChild(opt);
  }

  const notesInput = document.createElement('input');
  notesInput.type = 'text';
  notesInput.placeholder = 'Notes (optional)';
  notesInput.name = 'notes';

  const addBtn = document.createElement('button');
  addBtn.type = 'submit';
  addBtn.textContent = 'Add';

  form.appendChild(nameInput);
  form.appendChild(catSelect);
  form.appendChild(notesInput);
  form.appendChild(addBtn);
  section.appendChild(form);

  const content = document.createElement('div');
  content.className = 'inventory-content';
  section.appendChild(content);

  let items: InventoryItem[] = [];

  function rerender() {
    content.innerHTML = '';
    const locationItems = items.filter((i) => i.location === location);

    if (locationItems.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'inventory-empty';
      empty.textContent = `No items in ${location}.`;
      content.appendChild(empty);
      return;
    }

    const grouped = groupByCategory(locationItems);
    for (const cat of CATEGORY_ORDER) {
      const catItems = grouped.get(cat) ?? [];
      if (catItems.length === 0) continue;

      const catSection = document.createElement('div');
      catSection.className = 'inventory-category';

      const title = document.createElement('h3');
      title.className = 'inventory-category__title';
      title.textContent = CATEGORY_LABELS[cat];
      catSection.appendChild(title);

      for (const item of catItems) {
        catSection.appendChild(renderItem(item));
      }
      content.appendChild(catSection);
    }
  }

  function renderItem(item: InventoryItem): HTMLElement {
    const row = document.createElement('div');
    row.className = 'inventory-item';
    row.dataset.id = String(item.id);

    const name = document.createElement('span');
    name.className = 'inventory-item__name';
    name.textContent = item.name;

    const notesSpan = document.createElement('span');
    notesSpan.className = 'inventory-item__notes';
    notesSpan.textContent = item.notes || '';

    const editNotesBtn = document.createElement('button');
    editNotesBtn.type = 'button';
    editNotesBtn.dataset.action = 'edit-notes';
    editNotesBtn.textContent = 'Edit notes';

    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.dataset.action = 'delete';
    deleteBtn.textContent = '×';
    deleteBtn.setAttribute('aria-label', `Delete "${item.name}"`);

    editNotesBtn.addEventListener('click', () => {
      editNotesBtn.replaceWith(buildNotesEditor(item, notesSpan));
    });

    deleteBtn.addEventListener('click', async () => {
      await api.remove(item.id);
      items = items.filter((i) => i.id !== item.id);
      rerender();
    });

    row.appendChild(name);
    row.appendChild(notesSpan);
    row.appendChild(editNotesBtn);
    row.appendChild(deleteBtn);

    if (opts.onAddToShoppingList) {
      const addBtn = document.createElement('button');
      addBtn.type = 'button';
      addBtn.dataset.action = 'add-to-shopping';
      addBtn.textContent = '+ List';
      addBtn.setAttribute('aria-label', `Add "${item.name}" to shopping list`);
      addBtn.addEventListener('click', async () => {
        addBtn.disabled = true;
        await opts.onAddToShoppingList!(item);
        items = items.filter((i) => i.id !== item.id);
        rerender();
      });
      row.appendChild(addBtn);
    }

    return row;
  }

  function buildNotesEditor(item: InventoryItem, notesSpan: HTMLElement): HTMLElement {
    const wrapper = document.createElement('span');

    const input = document.createElement('input');
    input.type = 'text';
    input.value = item.notes ?? '';
    input.dataset.field = 'notes';

    const saveBtn = document.createElement('button');
    saveBtn.type = 'button';
    saveBtn.dataset.action = 'save-notes';
    saveBtn.textContent = 'Save';

    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.dataset.action = 'cancel-notes';
    cancelBtn.textContent = 'Cancel';

    saveBtn.addEventListener('click', async () => {
      const updated = await api.update(item.id, { notes: input.value });
      items = items.map((i) => (i.id === updated.id ? updated : i));
      notesSpan.textContent = updated.notes || '';
      const newEditBtn = makeEditNotesBtn(updated, notesSpan);
      wrapper.replaceWith(newEditBtn);
    });

    cancelBtn.addEventListener('click', () => {
      const newEditBtn = makeEditNotesBtn(item, notesSpan);
      wrapper.replaceWith(newEditBtn);
    });

    wrapper.appendChild(input);
    wrapper.appendChild(saveBtn);
    wrapper.appendChild(cancelBtn);
    return wrapper;
  }

  function makeEditNotesBtn(item: InventoryItem, notesSpan: HTMLElement): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.dataset.action = 'edit-notes';
    btn.textContent = 'Edit notes';
    btn.addEventListener('click', () => {
      btn.replaceWith(buildNotesEditor(item, notesSpan));
    });
    return btn;
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = nameInput.value.trim();
    if (!name) return;
    const created = await api.create({
      name,
      category: catSelect.value as GroceryCategory,
      location,
      notes: notesInput.value.trim(),
    });
    items = [...items, created];
    nameInput.value = '';
    notesInput.value = '';
    rerender();
  });

  api
    .list()
    .then((fetched) => {
      items = fetched;
      rerender();
    })
    .catch(() => {
      section.insertBefore(createErrorBanner('Could not load inventory.'), section.firstChild);
    });

  rerender();
  return section;
}
