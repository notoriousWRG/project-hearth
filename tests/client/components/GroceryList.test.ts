// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createGroceryList } from '../../../src/client/components/GroceryList.js';
import type { GroceryItem, NewGroceryItem } from '../../../src/shared/types.js';

function makeItem(overrides: Partial<GroceryItem> = {}): GroceryItem {
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

function makeApi(items: GroceryItem[] = []) {
  return {
    list: vi.fn(async () => items),
    create: vi.fn(async (data: NewGroceryItem) => makeItem({ id: 99, name: data.name })),
    check: vi.fn(async (id: number, checked: boolean) => makeItem({ id, checked })),
    remove: vi.fn(async () => undefined),
    clearChecked: vi.fn(async () => ({ deleted: 0 })),
    export: vi.fn(async () => ({ text: 'Produce\n- Apples\n\nDairy\n- Milk' })),
  };
}

describe('createGroceryList', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
    vi.restoreAllMocks();
  });

  it('renders items on load', async () => {
    const api = makeApi([makeItem({ id: 1, name: 'Eggs', category: 'dairy' })]);
    const el = createGroceryList(api);
    container.appendChild(el);
    await vi.waitFor(() => expect(el.textContent).toContain('Eggs'));
  });

  it('shows empty state when no items', async () => {
    const el = createGroceryList(makeApi([]));
    container.appendChild(el);
    await vi.waitFor(() => expect(el.textContent).toContain('empty'));
  });

  it('add form calls api.create and shows new item', async () => {
    const api = makeApi([]);
    const el = createGroceryList(api);
    container.appendChild(el);
    await vi.waitFor(() => expect(el.querySelector('.grocery-list__add-form')).toBeTruthy());

    const input = el.querySelector('input[type="text"]') as HTMLInputElement;
    const form = el.querySelector('.grocery-list__add-form') as HTMLFormElement;
    input.value = 'Apples';
    form.dispatchEvent(new Event('submit', { bubbles: true }));

    await vi.waitFor(() => {
      expect(api.create).toHaveBeenCalledWith(expect.objectContaining({ name: 'Apples' }));
      expect(el.textContent).toContain('Apples');
    });
  });

  it('checking an item calls api.check', async () => {
    const api = makeApi([makeItem({ id: 5, name: 'Butter' })]);
    const el = createGroceryList(api);
    container.appendChild(el);
    await vi.waitFor(() => expect(el.textContent).toContain('Butter'));

    const checkbox = el.querySelector('input[type="checkbox"]') as HTMLInputElement;
    checkbox.checked = true;
    checkbox.dispatchEvent(new Event('change'));

    await vi.waitFor(() => expect(api.check).toHaveBeenCalledWith(5, true));
  });

  it('delete button calls api.remove and removes item', async () => {
    const api = makeApi([makeItem({ id: 3, name: 'Cheese' })]);
    const el = createGroceryList(api);
    container.appendChild(el);
    await vi.waitFor(() => expect(el.textContent).toContain('Cheese'));

    (el.querySelector('[data-action="delete"]') as HTMLButtonElement).click();

    await vi.waitFor(() => {
      expect(api.remove).toHaveBeenCalledWith(3);
      expect(el.textContent).not.toContain('Cheese');
    });
  });

  it('clear-checked calls api.clearChecked', async () => {
    const api = makeApi([makeItem({ id: 2, checked: true })]);
    const el = createGroceryList(api);
    container.appendChild(el);
    await vi.waitFor(() => expect(el.querySelector('[data-action="clear-checked"]')).toBeTruthy());

    (el.querySelector('[data-action="clear-checked"]') as HTMLButtonElement).click();
    await vi.waitFor(() => expect(api.clearChecked).toHaveBeenCalled());
  });

  it('export button copies text to clipboard and shows Copied feedback', async () => {
    const writeText = vi.fn(async () => {});
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      writable: true,
      configurable: true,
    });

    const api = makeApi([makeItem()]);
    const el = createGroceryList(api);
    container.appendChild(el);
    await vi.waitFor(() => expect(el.querySelector('[data-action="export"]')).toBeTruthy());

    const exportBtn = el.querySelector('[data-action="export"]') as HTMLButtonElement;
    exportBtn.click();

    await vi.waitFor(() => {
      expect(api.export).toHaveBeenCalled();
      expect(writeText).toHaveBeenCalledWith('Produce\n- Apples\n\nDairy\n- Milk');
      expect(exportBtn.textContent).toContain('Copied');
    });
  });
});
