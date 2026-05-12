// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createGroceryView } from '../../../src/client/components/GroceryView.js';
import type {
  GroceryItem,
  InventoryItem,
  NewGroceryItem,
  NewInventoryItem,
} from '../../../src/shared/types.js';

function makeGroceryItem(overrides: Partial<GroceryItem> = {}): GroceryItem {
  return {
    id: 1,
    name: 'Milk',
    category: 'dairy',
    checked: false,
    source: 'manual',
    meal_plan_id: null,
    ...overrides,
  };
}

function makeInventoryItem(overrides: Partial<InventoryItem> = {}): InventoryItem {
  return {
    id: 1,
    name: 'Flour',
    category: 'pantry',
    location: 'pantry',
    notes: '',
    ...overrides,
  };
}

function makeApi(groceryItems: GroceryItem[] = [], inventoryItems: InventoryItem[] = []) {
  return {
    grocery: {
      list: vi.fn(async () => groceryItems),
      create: vi.fn(async (data: NewGroceryItem) => makeGroceryItem({ id: 99, name: data.name })),
      check: vi.fn(async (id: number, checked: boolean) => makeGroceryItem({ id, checked })),
      remove: vi.fn(async () => undefined),
      clearChecked: vi.fn(async () => ({ deleted: 0 })),
      export: vi.fn(async () => ({ text: '' })),
    },
    inventory: {
      list: vi.fn(async () => inventoryItems),
      create: vi.fn(async (data: NewInventoryItem) =>
        makeInventoryItem({ id: 99, name: data.name, location: data.location }),
      ),
      update: vi.fn(
        async (id: number, data: Partial<Pick<NewInventoryItem, 'category' | 'notes'>>) =>
          makeInventoryItem({ id, ...data }),
      ),
      remove: vi.fn(async () => undefined),
    },
  };
}

describe('createGroceryView', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
    vi.restoreAllMocks();
  });

  it('renders three tab buttons', () => {
    const el = createGroceryView(makeApi());
    container.appendChild(el);
    const tabs = Array.from(el.querySelectorAll<HTMLElement>('[data-tab]')).map(
      (t) => t.dataset.tab,
    );
    expect(tabs).toContain('shopping');
    expect(tabs).toContain('pantry');
    expect(tabs).toContain('icebox');
  });

  it('shopping tab is active by default', () => {
    const el = createGroceryView(makeApi());
    container.appendChild(el);
    const shoppingTab = el.querySelector('[data-tab="shopping"]') as HTMLButtonElement;
    expect(shoppingTab.className).toContain('--active');
  });

  it('shows shopping content by default', async () => {
    const api = makeApi([makeGroceryItem({ name: 'Eggs' })]);
    const el = createGroceryView(api);
    container.appendChild(el);
    await vi.waitFor(() => expect(el.textContent).toContain('Eggs'));
  });

  it('switching to pantry tab shows pantry inventory', async () => {
    const api = makeApi([], [makeInventoryItem({ name: 'Rice', location: 'pantry' })]);
    const el = createGroceryView(api);
    container.appendChild(el);

    (el.querySelector('[data-tab="pantry"]') as HTMLButtonElement).click();
    await vi.waitFor(() => expect(el.textContent).toContain('Rice'));
  });

  it('switching to icebox tab shows icebox inventory', async () => {
    const api = makeApi([], [makeInventoryItem({ name: 'Chicken', location: 'icebox' })]);
    const el = createGroceryView(api);
    container.appendChild(el);

    (el.querySelector('[data-tab="icebox"]') as HTMLButtonElement).click();
    await vi.waitFor(() => expect(el.textContent).toContain('Chicken'));
  });

  it('pantry tab is active after clicking it', () => {
    const el = createGroceryView(makeApi());
    container.appendChild(el);
    (el.querySelector('[data-tab="pantry"]') as HTMLButtonElement).click();
    const pantryTab = el.querySelector('[data-tab="pantry"]') as HTMLButtonElement;
    expect(pantryTab.className).toContain('--active');
    const shoppingTab = el.querySelector('[data-tab="shopping"]') as HTMLButtonElement;
    expect(shoppingTab.className).not.toContain('--active');
  });

  it('checked shopping items show move-to-pantry and move-to-icebox buttons', async () => {
    const api = makeApi([makeGroceryItem({ id: 5, name: 'Butter', checked: true })]);
    const el = createGroceryView(api);
    container.appendChild(el);

    await vi.waitFor(() => {
      expect(el.querySelector('[data-action="move-to-pantry"]')).toBeTruthy();
      expect(el.querySelector('[data-action="move-to-icebox"]')).toBeTruthy();
    });
  });

  it('unchecked items do not show move buttons', async () => {
    const api = makeApi([makeGroceryItem({ id: 1, name: 'Milk', checked: false })]);
    const el = createGroceryView(api);
    container.appendChild(el);

    await vi.waitFor(() => expect(el.textContent).toContain('Milk'));
    expect(el.querySelector('[data-action="move-to-pantry"]')).toBeNull();
  });

  it('move-to-pantry creates an inventory row and removes the grocery item', async () => {
    const checkedItem = makeGroceryItem({
      id: 5,
      name: 'Butter',
      category: 'dairy',
      checked: true,
    });
    const api = makeApi([checkedItem]);
    const el = createGroceryView(api);
    container.appendChild(el);

    await vi.waitFor(() => expect(el.querySelector('[data-action="move-to-pantry"]')).toBeTruthy());
    (el.querySelector('[data-action="move-to-pantry"]') as HTMLButtonElement).click();

    await vi.waitFor(() => {
      expect(api.inventory.create).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Butter', category: 'dairy', location: 'pantry' }),
      );
      expect(api.grocery.remove).toHaveBeenCalledWith(5);
    });
  });

  it('move-to-icebox creates an inventory row and removes the grocery item', async () => {
    const checkedItem = makeGroceryItem({
      id: 6,
      name: 'Salmon',
      category: 'protein',
      checked: true,
    });
    const api = makeApi([checkedItem]);
    const el = createGroceryView(api);
    container.appendChild(el);

    await vi.waitFor(() => expect(el.querySelector('[data-action="move-to-icebox"]')).toBeTruthy());
    (el.querySelector('[data-action="move-to-icebox"]') as HTMLButtonElement).click();

    await vi.waitFor(() => {
      expect(api.inventory.create).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Salmon', category: 'protein', location: 'icebox' }),
      );
      expect(api.grocery.remove).toHaveBeenCalledWith(6);
    });
  });
});
