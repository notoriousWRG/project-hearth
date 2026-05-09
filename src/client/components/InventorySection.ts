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

export function createInventorySection(api: InventoryApi): HTMLElement {
  const section = document.createElement('section');
  section.className = 'inventory-section';

  // Location tabs
  const tabBar = document.createElement('div');
  tabBar.className = 'inventory-location-tabs';

  const pantryBtn = document.createElement('button');
  pantryBtn.type = 'button';
  pantryBtn.dataset.location = 'pantry';
  pantryBtn.textContent = 'Pantry';

  const iceboxBtn = document.createElement('button');
  iceboxBtn.type = 'button';
  iceboxBtn.dataset.location = 'icebox';
  iceboxBtn.textContent = 'Icebox';

  tabBar.appendChild(pantryBtn);
  tabBar.appendChild(iceboxBtn);
  section.appendChild(tabBar);

  // Add form
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

  const locationSelect = document.createElement('select');
  locationSelect.name = 'location';
  for (const loc of ['pantry', 'icebox'] as InventoryLocation[]) {
    const opt = document.createElement('option');
    opt.value = loc;
    opt.textContent = loc.charAt(0).toUpperCase() + loc.slice(1);
    locationSelect.appendChild(opt);
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
  form.appendChild(locationSelect);
  form.appendChild(notesInput);
  form.appendChild(addBtn);
  section.appendChild(form);

  // Content area
  const content = document.createElement('div');
  content.className = 'inventory-content';
  section.appendChild(content);

  let allItems: InventoryItem[] = [];
  let activeLocation: InventoryLocation = 'pantry';

  function updateTabStyles() {
    pantryBtn.className =
      'inventory-location-tab' +
      (activeLocation === 'pantry' ? ' inventory-location-tab--active' : '');
    iceboxBtn.className =
      'inventory-location-tab' +
      (activeLocation === 'icebox' ? ' inventory-location-tab--active' : '');
  }

  function rerender() {
    content.innerHTML = '';
    updateTabStyles();

    const locationItems = allItems.filter((i) => i.location === activeLocation);

    if (locationItems.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'inventory-empty';
      empty.textContent = 'No items in ' + activeLocation + '.';
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
      allItems = allItems.filter((i) => i.id !== item.id);
      rerender();
    });

    row.appendChild(name);
    row.appendChild(notesSpan);
    row.appendChild(editNotesBtn);
    row.appendChild(deleteBtn);
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
      allItems = allItems.map((i) => (i.id === updated.id ? updated : i));
      notesSpan.textContent = updated.notes || '';
      const editNotesBtn = document.createElement('button');
      editNotesBtn.type = 'button';
      editNotesBtn.dataset.action = 'edit-notes';
      editNotesBtn.textContent = 'Edit notes';
      editNotesBtn.addEventListener('click', () => {
        editNotesBtn.replaceWith(buildNotesEditor(updated, notesSpan));
      });
      wrapper.replaceWith(editNotesBtn);
    });

    cancelBtn.addEventListener('click', () => {
      const editNotesBtn = document.createElement('button');
      editNotesBtn.type = 'button';
      editNotesBtn.dataset.action = 'edit-notes';
      editNotesBtn.textContent = 'Edit notes';
      editNotesBtn.addEventListener('click', () => {
        editNotesBtn.replaceWith(buildNotesEditor(item, notesSpan));
      });
      wrapper.replaceWith(editNotesBtn);
    });

    wrapper.appendChild(input);
    wrapper.appendChild(saveBtn);
    wrapper.appendChild(cancelBtn);
    return wrapper;
  }

  pantryBtn.addEventListener('click', () => {
    activeLocation = 'pantry';
    rerender();
  });

  iceboxBtn.addEventListener('click', () => {
    activeLocation = 'icebox';
    rerender();
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = nameInput.value.trim();
    if (!name) return;
    const created = await api.create({
      name,
      category: catSelect.value as GroceryCategory,
      location: locationSelect.value as InventoryLocation,
      notes: notesInput.value.trim(),
    });
    allItems = [...allItems, created];
    activeLocation = created.location;
    nameInput.value = '';
    notesInput.value = '';
    rerender();
  });

  api
    .list()
    .then((fetched) => {
      allItems = fetched;
      rerender();
    })
    .catch(() => {
      section.insertBefore(createErrorBanner('Could not load inventory.'), section.firstChild);
    });

  rerender();
  return section;
}
