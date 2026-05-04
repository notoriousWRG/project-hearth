// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createChoreList } from '../../../src/client/components/ChoreList.js';
import type { Chore } from '../../../src/shared/types.js';

function makeChore(overrides: Partial<Chore> = {}): Chore {
  return {
    id: 1,
    user_id: 10,
    title: 'Wash dishes',
    icon: null,
    completed: false,
    is_recurring: false,
    recurrence_rule: null,
    recurrence_days: null,
    is_bonus: false,
    bonus_amount: null,
    position: 0,
    created_at: '2026-05-02T00:00:00.000Z',
    completed_at: null,
    ...overrides,
  };
}

function makeApi(chores: Chore[] = []) {
  return {
    list: vi.fn(async () => chores),
    create: vi.fn(async (data: { user_id: number; title: string }) =>
      makeChore({ id: 99, title: data.title }),
    ),
    remove: vi.fn(async () => undefined),
  };
}

describe('createChoreList', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  it('renders a section element', () => {
    const el = createChoreList(10, makeApi());
    expect(el.tagName.toLowerCase()).toBe('section');
  });

  it('shows chores after loading', async () => {
    const api = makeApi([makeChore({ title: 'Vacuum' })]);
    const el = createChoreList(10, api);
    container.appendChild(el);
    await vi.waitFor(() => {
      expect(el.textContent).toContain('Vacuum');
    });
  });

  it('shows empty state when no chores', async () => {
    const el = createChoreList(10, makeApi([]));
    container.appendChild(el);
    await vi.waitFor(() => {
      expect(el.textContent).toContain('No chores');
    });
  });

  it('shows recurring indicator for recurring chores', async () => {
    const api = makeApi([makeChore({ is_recurring: true })]);
    const el = createChoreList(10, api);
    container.appendChild(el);
    await vi.waitFor(() => {
      expect(el.querySelector('.chore-item--recurring')).toBeTruthy();
    });
  });

  it('adds a chore via form', async () => {
    const api = makeApi([]);
    const el = createChoreList(10, api);
    container.appendChild(el);
    await vi.waitFor(() => expect(el.querySelector('form')).toBeTruthy());

    const input = el.querySelector('input[type="text"]') as HTMLInputElement;
    const form = el.querySelector('form') as HTMLFormElement;
    input.value = 'Mow lawn';
    form.dispatchEvent(new Event('submit', { bubbles: true }));

    await vi.waitFor(() => {
      expect(api.create).toHaveBeenCalledWith(expect.objectContaining({ title: 'Mow lawn' }));
    });
  });

  it('deletes a chore on button click', async () => {
    const api = makeApi([makeChore({ id: 3 })]);
    const el = createChoreList(10, api);
    container.appendChild(el);
    await vi.waitFor(() => expect(el.querySelector('[data-action="delete"]')).toBeTruthy());

    (el.querySelector('[data-action="delete"]') as HTMLButtonElement).click();

    await vi.waitFor(() => {
      expect(api.remove).toHaveBeenCalledWith(3);
    });
  });

  it('delete button has aria-label with chore title', async () => {
    const api = makeApi([makeChore({ title: 'Wash dishes' })]);
    const el = createChoreList(10, api);
    container.appendChild(el);
    await vi.waitFor(() => {
      const btn = el.querySelector('[data-action="delete"]') as HTMLButtonElement;
      expect(btn.getAttribute('aria-label')).toContain('Wash dishes');
    });
  });

  it('section has aria-label', () => {
    const el = createChoreList(10, makeApi());
    expect(el.getAttribute('aria-label')).toBeTruthy();
  });

  it('shows error banner when api.list throws', async () => {
    const api = {
      list: vi.fn(async () => {
        throw new Error('Network error');
      }),
      create: vi.fn(),
      remove: vi.fn(),
    };
    const el = createChoreList(10, api);
    container.appendChild(el);
    await vi.waitFor(() => {
      expect(el.querySelector('.error-banner')).toBeTruthy();
    });
  });
});
