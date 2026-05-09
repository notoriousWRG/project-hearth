// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createSavedMealsSection } from '../../../src/client/components/SavedMealsSection.js';
import type { Meal } from '../../../src/shared/types.js';

function makeMeal(overrides: Partial<Meal> = {}): Meal {
  return {
    id: 1,
    name: 'Pasta',
    created_at: '2026-05-01T00:00:00.000Z',
    ingredients: [],
    ...overrides,
  };
}

function makeApi(meals: Meal[] = []) {
  return {
    list: vi.fn(async () => meals),
    get: vi.fn(async (id: number) => meals.find((m) => m.id === id) ?? makeMeal({ id })),
    create: vi.fn(async (data: { name: string }) => makeMeal({ id: 99, name: data.name })),
    update: vi.fn(async (id: number) => makeMeal({ id })),
    remove: vi.fn(async () => undefined),
  };
}

describe('createSavedMealsSection', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
    vi.restoreAllMocks();
  });

  it('renders empty state when no meals', async () => {
    const el = createSavedMealsSection(makeApi([]));
    container.appendChild(el);
    await vi.waitFor(() => expect(el.textContent).toContain('No saved meals'));
  });

  it('renders meal names on load', async () => {
    const api = makeApi([makeMeal({ id: 1, name: 'Tacos' }), makeMeal({ id: 2, name: 'Soup' })]);
    const el = createSavedMealsSection(api);
    container.appendChild(el);
    await vi.waitFor(() => {
      expect(el.textContent).toContain('Tacos');
      expect(el.textContent).toContain('Soup');
    });
  });

  it('calls api.create on form submit and appends row', async () => {
    const api = makeApi([]);
    const el = createSavedMealsSection(api);
    container.appendChild(el);
    await vi.waitFor(() => expect(el.querySelector('[data-field="meal-name"]')).toBeTruthy());

    const input = el.querySelector('[data-field="meal-name"]') as HTMLInputElement;
    const form = el.querySelector('.saved-meal-create') as HTMLFormElement;
    input.value = 'Chicken Soup';
    form.dispatchEvent(new Event('submit', { bubbles: true }));

    await vi.waitFor(() => {
      expect(api.create).toHaveBeenCalledWith(expect.objectContaining({ name: 'Chicken Soup' }));
      expect(el.textContent).toContain('Chicken Soup');
    });
  });

  it('expands row and fetches full meal on Edit click', async () => {
    const meal = makeMeal({
      id: 1,
      name: 'Tacos',
      ingredients: [{ id: 1, meal_id: 1, name: 'beef', category: 'protein', position: 0 }],
    });
    const api = makeApi([meal]);
    const el = createSavedMealsSection(api);
    container.appendChild(el);
    await vi.waitFor(() => expect(el.textContent).toContain('Tacos'));

    (el.querySelector('[data-action="edit"]') as HTMLButtonElement).click();

    await vi.waitFor(() => {
      expect(api.get).toHaveBeenCalledWith(1);
      expect(el.querySelector('.saved-meal-row--expanded')).toBeTruthy();
    });
  });

  it('calls api.update on Save', async () => {
    const meal = makeMeal({ id: 1, name: 'Tacos', ingredients: [] });
    const api = makeApi([meal]);
    const el = createSavedMealsSection(api);
    container.appendChild(el);
    await vi.waitFor(() => expect(el.textContent).toContain('Tacos'));

    (el.querySelector('[data-action="edit"]') as HTMLButtonElement).click();
    await vi.waitFor(() => expect(el.querySelector('.saved-meal-row--expanded')).toBeTruthy());

    (el.querySelector('[data-action="save"]') as HTMLButtonElement).click();
    await vi.waitFor(() =>
      expect(api.update).toHaveBeenCalledWith(1, expect.objectContaining({ name: 'Tacos' })),
    );
  });

  it('calls api.remove and removes row on Delete (confirmed)', async () => {
    vi.stubGlobal('confirm', () => true);
    const meal = makeMeal({ id: 5, name: 'Pizza', ingredients: [] });
    const api = makeApi([meal]);
    const el = createSavedMealsSection(api);
    container.appendChild(el);
    await vi.waitFor(() => expect(el.textContent).toContain('Pizza'));

    (el.querySelector('[data-action="edit"]') as HTMLButtonElement).click();
    await vi.waitFor(() => expect(el.querySelector('.saved-meal-row--expanded')).toBeTruthy());

    (el.querySelector('[data-action="delete"]') as HTMLButtonElement).click();
    await vi.waitFor(() => {
      expect(api.remove).toHaveBeenCalledWith(5);
      expect(el.textContent).not.toContain('Pizza');
    });
  });

  it('add-ingredient appends a blank ingredient row', async () => {
    const meal = makeMeal({ id: 1, name: 'Soup', ingredients: [] });
    const api = makeApi([meal]);
    const el = createSavedMealsSection(api);
    container.appendChild(el);
    await vi.waitFor(() => expect(el.textContent).toContain('Soup'));

    (el.querySelector('[data-action="edit"]') as HTMLButtonElement).click();
    await vi.waitFor(() => expect(el.querySelector('[data-action="add-ingredient"]')).toBeTruthy());

    (el.querySelector('[data-action="add-ingredient"]') as HTMLButtonElement).click();
    expect(el.querySelectorAll('.ingredient-row').length).toBe(1);
  });
});
