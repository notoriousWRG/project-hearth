// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createChoreManagementSection } from '../../../src/client/components/ChoreManagementSection.js';
import type { Chore, User } from '../../../src/shared/types.js';

function makeUser(overrides: Partial<User> = {}): User {
  return { id: 1, name: 'Kraft', type: 'child', icon: '🎨', display_order: 0, ...overrides };
}

function makeChore(overrides: Partial<Chore> = {}): Chore {
  return {
    id: 1,
    user_id: 1,
    title: 'Feed the chickens',
    icon: '🐔',
    completed: false,
    is_recurring: true,
    recurrence_rule: 'daily',
    is_bonus: false,
    bonus_amount: null,
    position: 0,
    created_at: '2026-05-02T00:00:00.000Z',
    completed_at: null,
    ...overrides,
  };
}

function makeChoreApi(chores: Chore[] = []) {
  return {
    list: vi.fn(async () => chores),
    create: vi.fn(async (data: Partial<Chore>) => makeChore({ id: 99, ...data })),
    update: vi.fn(async (id: number, data: Partial<Chore>) => makeChore({ id, ...data })),
    remove: vi.fn(async () => undefined),
    reorder: vi.fn(async () => chores),
    uncomplete: vi.fn(async (id: number) => makeChore({ id, completed: false })),
  };
}

const children: User[] = [
  makeUser({ id: 1, name: 'Kraft' }),
  makeUser({ id: 2, name: 'Golden', icon: '⭐' }),
];

describe('createChoreManagementSection', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  it('renders a tab button per child', () => {
    const el = createChoreManagementSection(children, makeChoreApi());
    const tabs = el.querySelectorAll('[data-child-id]');
    expect(tabs.length).toBe(2);
    expect(el.textContent).toContain('Kraft');
    expect(el.textContent).toContain('Golden');
  });

  it('loads chores for the first child on mount', async () => {
    const api = makeChoreApi([makeChore({ title: 'Feed the chickens' })]);
    const el = createChoreManagementSection(children, api);
    container.appendChild(el);
    await vi.waitFor(() => {
      expect(api.list).toHaveBeenCalledWith(1);
      const titleInput = el.querySelector('li.chore-row .chore-row__title') as HTMLInputElement;
      expect(titleInput?.value).toBe('Feed the chickens');
    });
  });

  it('switching tabs loads chores for that child', async () => {
    const api = makeChoreApi([]);
    const el = createChoreManagementSection(children, api);
    container.appendChild(el);
    await vi.waitFor(() => expect(api.list).toHaveBeenCalledWith(1));

    const goldenTab = el.querySelector('[data-child-id="2"]') as HTMLButtonElement;
    goldenTab.click();

    await vi.waitFor(() => {
      expect(api.list).toHaveBeenCalledWith(2);
    });
  });

  it('add form calls api.create with icon and title', async () => {
    const api = makeChoreApi([]);
    const el = createChoreManagementSection(children, api);
    container.appendChild(el);
    await vi.waitFor(() => expect(el.querySelector('form')).toBeTruthy());

    const iconInput = el.querySelector('input[data-field="icon"]') as HTMLInputElement;
    const titleInput = el.querySelector('input[data-field="title"]') as HTMLInputElement;
    const form = el.querySelector('form') as HTMLFormElement;

    iconInput.value = '🐕';
    titleInput.value = 'Walk the dog';
    form.dispatchEvent(new Event('submit', { bubbles: true }));

    await vi.waitFor(() => {
      expect(api.create).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Walk the dog', icon: '🐕', user_id: 1 }),
      );
    });
  });

  it('delete button calls api.remove', async () => {
    const api = makeChoreApi([makeChore({ id: 5 })]);
    const el = createChoreManagementSection(children, api);
    container.appendChild(el);
    await vi.waitFor(() => expect(el.querySelector('[data-action="delete"]')).toBeTruthy());

    (el.querySelector('[data-action="delete"]') as HTMLButtonElement).click();

    await vi.waitFor(() => {
      expect(api.remove).toHaveBeenCalledWith(5);
    });
  });

  it('completed chore shows an undo button', async () => {
    const api = makeChoreApi([makeChore({ id: 5, completed: true })]);
    const el = createChoreManagementSection(children, api);
    container.appendChild(el);
    await vi.waitFor(() => expect(el.querySelector('[data-action="uncomplete"]')).toBeTruthy());
  });

  it('undo button calls api.uncomplete with the chore id', async () => {
    const api = makeChoreApi([makeChore({ id: 5, completed: true })]);
    const el = createChoreManagementSection(children, api);
    container.appendChild(el);
    await vi.waitFor(() => expect(el.querySelector('[data-action="uncomplete"]')).toBeTruthy());

    (el.querySelector('[data-action="uncomplete"]') as HTMLButtonElement).click();

    await vi.waitFor(() => {
      expect(api.uncomplete).toHaveBeenCalledWith(5);
    });
  });

  it('up button calls api.reorder', async () => {
    const api = makeChoreApi([
      makeChore({ id: 1, position: 0 }),
      makeChore({ id: 2, title: 'Sweep', position: 1 }),
    ]);
    const el = createChoreManagementSection(children, api);
    container.appendChild(el);
    await vi.waitFor(() => expect(el.querySelectorAll('[data-action="move-up"]').length).toBe(2));

    // Click "up" on the second chore (id=2) — should move it above id=1
    const upBtns = el.querySelectorAll('[data-action="move-up"]');
    (upBtns[1] as HTMLButtonElement).click();

    await vi.waitFor(() => {
      expect(api.reorder).toHaveBeenCalledWith(1, [2, 1]);
    });
  });
});
