// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createMealPlanGrid } from '../../../src/client/components/MealPlanGrid.js';
import type { MealPlanEntry, NewMealPlanEntry } from '../../../src/shared/types.js';

function makeEntry(overrides: Partial<MealPlanEntry> = {}): MealPlanEntry {
  return {
    id: 1,
    week_start_date: '2026-05-04',
    day_of_week: 1,
    meal_type: 'dinner',
    description: 'Pasta',
    meal_id: null,
    ...overrides,
  };
}

function makeApi(entries: MealPlanEntry[] = []) {
  return {
    list: vi.fn(async () => entries),
    upsert: vi.fn(async (data: NewMealPlanEntry) => makeEntry({ id: 99, ...data })),
    remove: vi.fn(async () => undefined),
    generateGrocery: vi.fn(async () => []),
    listSavedMeals: vi.fn(async () => [
      { id: 10, name: 'Tacos' },
      { id: 11, name: 'Soup' },
    ]),
  };
}

describe('createMealPlanGrid', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
    vi.restoreAllMocks();
  });

  it('renders 7 day columns', async () => {
    const el = createMealPlanGrid(makeApi());
    container.appendChild(el);
    await vi.waitFor(() => expect(el.querySelectorAll('.meal-day').length).toBe(7));
  });

  it('clicking a slot enters edit mode with text input', async () => {
    const el = createMealPlanGrid(makeApi());
    container.appendChild(el);
    await vi.waitFor(() => expect(el.querySelector('.meal-slot')).toBeTruthy());

    (el.querySelector('.meal-slot') as HTMLElement).click();
    expect(el.querySelector('.meal-slot__input')).toBeTruthy();
  });

  it('blur on text input calls api.upsert with meal_id: null', async () => {
    const api = makeApi();
    const el = createMealPlanGrid(api);
    container.appendChild(el);
    await vi.waitFor(() => expect(el.querySelector('.meal-slot')).toBeTruthy());

    (el.querySelector('.meal-slot') as HTMLElement).click();
    const input = el.querySelector('.meal-slot__input') as HTMLInputElement;
    input.value = 'Chicken';
    input.dispatchEvent(new Event('blur'));

    await vi.waitFor(() =>
      expect(api.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ description: 'Chicken', meal_id: null }),
      ),
    );
  });

  it('shows Pick saved meal button in edit mode', async () => {
    const el = createMealPlanGrid(makeApi());
    container.appendChild(el);
    await vi.waitFor(() => expect(el.querySelector('.meal-slot')).toBeTruthy());

    (el.querySelector('.meal-slot') as HTMLElement).click();
    expect(el.querySelector('[data-action="pick-meal"]')).toBeTruthy();
  });

  it('clicking pick-meal shows a select with saved meals', async () => {
    const el = createMealPlanGrid(makeApi());
    container.appendChild(el);
    await vi.waitFor(() => expect(el.querySelector('.meal-slot')).toBeTruthy());

    (el.querySelector('.meal-slot') as HTMLElement).click();
    await vi.waitFor(() => expect(el.querySelector('[data-action="pick-meal"]')).toBeTruthy());

    (el.querySelector('[data-action="pick-meal"]') as HTMLButtonElement).click();
    await vi.waitFor(() => expect(el.querySelector('.meal-slot__saved-meal-picker')).toBeTruthy());

    const select = el.querySelector('.meal-slot__saved-meal-picker') as HTMLSelectElement;
    expect(select.options.length).toBeGreaterThan(1);
    expect(select.textContent).toContain('Tacos');
    expect(select.textContent).toContain('Soup');
  });

  it('selecting a saved meal calls api.upsert with correct meal_id', async () => {
    const api = makeApi();
    const el = createMealPlanGrid(api);
    container.appendChild(el);
    await vi.waitFor(() => expect(el.querySelector('.meal-slot')).toBeTruthy());

    (el.querySelector('.meal-slot') as HTMLElement).click();
    await vi.waitFor(() => expect(el.querySelector('[data-action="pick-meal"]')).toBeTruthy());

    (el.querySelector('[data-action="pick-meal"]') as HTMLButtonElement).click();
    await vi.waitFor(() => expect(el.querySelector('.meal-slot__saved-meal-picker')).toBeTruthy());

    const select = el.querySelector('.meal-slot__saved-meal-picker') as HTMLSelectElement;
    select.value = '10';
    select.dispatchEvent(new Event('change'));

    await vi.waitFor(() =>
      expect(api.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ meal_id: 10, description: 'Tacos' }),
      ),
    );
  });

  it('generate button calls api.generateGrocery and shows feedback', async () => {
    const api = makeApi([makeEntry()]);
    api.generateGrocery = vi.fn(async () => [{ id: 1 } as never]);
    const el = createMealPlanGrid(api);
    container.appendChild(el);
    await vi.waitFor(() => expect(el.querySelector('[data-action="generate"]')).toBeTruthy());

    (el.querySelector('[data-action="generate"]') as HTMLButtonElement).click();

    await vi.waitFor(() => {
      expect(api.generateGrocery).toHaveBeenCalled();
      expect(el.querySelector('.meal-plan__feedback')?.textContent).toContain('Added 1');
    });
  });

  it('zero-items generate shows inventory-aware message', async () => {
    const api = makeApi();
    api.generateGrocery = vi.fn(async () => []);
    const el = createMealPlanGrid(api);
    container.appendChild(el);
    await vi.waitFor(() => expect(el.querySelector('[data-action="generate"]')).toBeTruthy());

    (el.querySelector('[data-action="generate"]') as HTMLButtonElement).click();

    await vi.waitFor(() => {
      const feedback = el.querySelector('.meal-plan__feedback')?.textContent ?? '';
      expect(feedback).toContain('pantry');
    });
  });
});
