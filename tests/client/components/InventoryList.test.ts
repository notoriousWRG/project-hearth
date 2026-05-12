// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createInventoryList } from '../../../src/client/components/InventoryList.js';
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

describe('createInventoryList', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
    vi.restoreAllMocks();
  });

  it('renders items for the given location only', async () => {
    const api = makeApi([
      makeItem({ id: 1, name: 'Flour', location: 'pantry' }),
      makeItem({ id: 2, name: 'Salmon', location: 'icebox' }),
    ]);
    const el = createInventoryList('pantry', api);
    container.appendChild(el);
    await vi.waitFor(() => {
      expect(el.textContent).toContain('Flour');
      expect(el.textContent).not.toContain('Salmon');
    });
  });

  it('renders empty state when no items for location', async () => {
    const api = makeApi([makeItem({ id: 1, name: 'Salmon', location: 'icebox' })]);
    const el = createInventoryList('pantry', api);
    container.appendChild(el);
    await vi.waitFor(() => expect(el.textContent).toContain('No items'));
  });

  it('add form creates item with the component location, no location picker visible', async () => {
    const api = makeApi([]);
    const el = createInventoryList('icebox', api);
    container.appendChild(el);
    await vi.waitFor(() => expect(el.querySelector('[data-field="item-name"]')).toBeTruthy());

    expect(el.querySelector('select[name="location"]')).toBeNull();

    const nameInput = el.querySelector('[data-field="item-name"]') as HTMLInputElement;
    const form = el.querySelector('form') as HTMLFormElement;
    nameInput.value = 'Chicken';
    form.dispatchEvent(new Event('submit', { bubbles: true }));

    await vi.waitFor(() => {
      expect(api.create).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Chicken', location: 'icebox' }),
      );
      expect(el.textContent).toContain('Chicken');
    });
  });

  it('delete calls api.remove and removes item from list', async () => {
    const item = makeItem({ id: 7, name: 'Oats', location: 'pantry' });
    const api = makeApi([item]);
    const el = createInventoryList('pantry', api);
    container.appendChild(el);
    await vi.waitFor(() => expect(el.textContent).toContain('Oats'));

    (el.querySelector('[data-action="delete"]') as HTMLButtonElement).click();

    await vi.waitFor(() => {
      expect(api.remove).toHaveBeenCalledWith(7);
      expect(el.textContent).not.toContain('Oats');
    });
  });

  it('edit-notes inline editor saves updated notes', async () => {
    const item = makeItem({ id: 3, name: 'Butter', location: 'pantry', notes: '' });
    const api = makeApi([item]);
    const el = createInventoryList('pantry', api);
    container.appendChild(el);
    await vi.waitFor(() => expect(el.textContent).toContain('Butter'));

    (el.querySelector('[data-action="edit-notes"]') as HTMLButtonElement).click();
    const notesInput = el.querySelector('[data-field="notes"]') as HTMLInputElement;
    notesInput.value = 'organic';
    (el.querySelector('[data-action="save-notes"]') as HTMLButtonElement).click();

    await vi.waitFor(() =>
      expect(api.update).toHaveBeenCalledWith(3, expect.objectContaining({ notes: 'organic' })),
    );
  });

  it('cancel notes editor restores edit-notes button', async () => {
    const item = makeItem({ id: 4, name: 'Oil', location: 'pantry', notes: '' });
    const api = makeApi([item]);
    const el = createInventoryList('pantry', api);
    container.appendChild(el);
    await vi.waitFor(() => expect(el.textContent).toContain('Oil'));

    (el.querySelector('[data-action="edit-notes"]') as HTMLButtonElement).click();
    expect(el.querySelector('[data-field="notes"]')).toBeTruthy();

    (el.querySelector('[data-action="cancel-notes"]') as HTMLButtonElement).click();
    expect(el.querySelector('[data-field="notes"]')).toBeNull();
    expect(el.querySelector('[data-action="edit-notes"]')).toBeTruthy();
  });
});
