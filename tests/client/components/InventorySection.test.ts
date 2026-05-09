// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createInventorySection } from '../../../src/client/components/InventorySection.js';
import type { InventoryItem, NewInventoryItem } from '../../../src/shared/types.js';

function makeItem(overrides: Partial<InventoryItem> = {}): InventoryItem {
  return {
    id: 1,
    name: 'Flour',
    category: 'pantry',
    location: 'pantry',
    notes: '',
    ...overrides,
  };
}

function makeApi(items: InventoryItem[] = []) {
  return {
    list: vi.fn(async () => items),
    create: vi.fn(async (data: NewInventoryItem) =>
      makeItem({
        id: 99,
        name: data.name,
        category: data.category,
        location: data.location,
        notes: data.notes,
      }),
    ),
    update: vi.fn(async (id: number, data: Partial<Pick<NewInventoryItem, 'category' | 'notes'>>) =>
      makeItem({ id, ...data }),
    ),
    remove: vi.fn(async () => undefined),
  };
}

describe('createInventorySection', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
    vi.restoreAllMocks();
  });

  it('renders empty state when no items', async () => {
    const el = createInventorySection(makeApi([]));
    container.appendChild(el);
    await vi.waitFor(() => expect(el.textContent).toContain('No items'));
  });

  it('renders pantry items on load and icebox items on tab switch', async () => {
    const api = makeApi([
      makeItem({ id: 1, name: 'Flour', location: 'pantry' }),
      makeItem({ id: 2, name: 'Salmon', location: 'icebox' }),
    ]);
    const el = createInventorySection(api);
    container.appendChild(el);

    await vi.waitFor(() => expect(el.textContent).toContain('Flour'));
    expect(el.textContent).not.toContain('Salmon');

    (el.querySelector('[data-location="icebox"]') as HTMLButtonElement).click();
    await vi.waitFor(() => expect(el.textContent).toContain('Salmon'));
    expect(el.textContent).not.toContain('Flour');
  });

  it('add form calls api.create and shows new item', async () => {
    const api = makeApi([]);
    const el = createInventorySection(api);
    container.appendChild(el);
    await vi.waitFor(() => expect(el.querySelector('[data-field="item-name"]')).toBeTruthy());

    const nameInput = el.querySelector('[data-field="item-name"]') as HTMLInputElement;
    const form = el.querySelector('.inventory-add-form') as HTMLFormElement;
    nameInput.value = 'Rice';
    form.dispatchEvent(new Event('submit', { bubbles: true }));

    await vi.waitFor(() => {
      expect(api.create).toHaveBeenCalledWith(expect.objectContaining({ name: 'Rice' }));
      expect(el.textContent).toContain('Rice');
    });
  });

  it('edit-notes calls api.update with updated notes', async () => {
    const item = makeItem({ id: 3, name: 'Butter', location: 'icebox', notes: '' });
    const api = makeApi([item]);
    const el = createInventorySection(api);
    container.appendChild(el);

    (el.querySelector('[data-location="icebox"]') as HTMLButtonElement).click();
    await vi.waitFor(() => expect(el.textContent).toContain('Butter'));

    (el.querySelector('[data-action="edit-notes"]') as HTMLButtonElement).click();
    const notesInput = el.querySelector('[data-field="notes"]') as HTMLInputElement;
    notesInput.value = 'salted';
    (el.querySelector('[data-action="save-notes"]') as HTMLButtonElement).click();

    await vi.waitFor(() =>
      expect(api.update).toHaveBeenCalledWith(3, expect.objectContaining({ notes: 'salted' })),
    );
  });

  it('delete calls api.remove and removes item from list', async () => {
    const item = makeItem({ id: 7, name: 'Oats', location: 'pantry' });
    const api = makeApi([item]);
    const el = createInventorySection(api);
    container.appendChild(el);
    await vi.waitFor(() => expect(el.textContent).toContain('Oats'));

    (el.querySelector('[data-action="delete"]') as HTMLButtonElement).click();

    await vi.waitFor(() => {
      expect(api.remove).toHaveBeenCalledWith(7);
      expect(el.textContent).not.toContain('Oats');
    });
  });
});
