// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createChoreManagementSection } from '../../../src/client/components/ChoreManagementSection.js';
import type { Chore, StreakRecord, User } from '../../../src/shared/types.js';

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
    recurrence_days: null,
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
    listAll: vi.fn(async () => chores),
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
      expect(api.listAll).toHaveBeenCalledWith(1);
      const titleInput = el.querySelector('li.chore-row .chore-row__title') as HTMLInputElement;
      expect(titleInput?.value).toBe('Feed the chickens');
    });
  });

  it('switching tabs loads chores for that child', async () => {
    const api = makeChoreApi([]);
    const el = createChoreManagementSection(children, api);
    container.appendChild(el);
    await vi.waitFor(() => expect(api.listAll).toHaveBeenCalledWith(1));

    const goldenTab = el.querySelector('[data-child-id="2"]') as HTMLButtonElement;
    goldenTab.click();

    await vi.waitFor(() => {
      expect(api.listAll).toHaveBeenCalledWith(2);
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

  it('renders a copy button for each other child per chore row', async () => {
    const api = makeChoreApi([makeChore({ id: 1, title: 'Feed the chickens' })]);
    const el = createChoreManagementSection(children, api);
    container.appendChild(el);
    await vi.waitFor(() => expect(el.querySelector('[data-action="copy-to"]')).toBeTruthy());

    const copyBtns = el.querySelectorAll('[data-action="copy-to"]');
    expect(copyBtns.length).toBe(1);
    expect((copyBtns[0] as HTMLButtonElement).dataset.targetId).toBe('2');
    expect(copyBtns[0].textContent).toContain('Golden');
  });

  it('copy button calls api.create with chore data for the target child', async () => {
    const activeChore = makeChore({ id: 1, title: 'Feed the chickens', icon: '🐔' });
    const api = makeChoreApi([activeChore]);
    // Target child (id=2) has no chores
    api.listAll.mockImplementation(async (userId: number) => (userId === 1 ? [activeChore] : []));
    const el = createChoreManagementSection(children, api);
    container.appendChild(el);
    await vi.waitFor(() => expect(el.querySelector('[data-action="copy-to"]')).toBeTruthy());

    (el.querySelector('[data-action="copy-to"]') as HTMLButtonElement).click();

    await vi.waitFor(() => {
      expect(api.create).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Feed the chickens', icon: '🐔', user_id: 2 }),
      );
    });
  });

  it('copy button does not call api.create when title already exists for target', async () => {
    const activeChore = makeChore({ id: 1, title: 'Feed the chickens' });
    const targetChore = makeChore({ id: 10, user_id: 2, title: 'Feed the chickens' });
    const api = makeChoreApi([activeChore]);
    api.listAll.mockImplementation(async (userId: number) =>
      userId === 1 ? [activeChore] : [targetChore],
    );
    const el = createChoreManagementSection(children, api);
    container.appendChild(el);
    await vi.waitFor(() => expect(el.querySelector('[data-action="copy-to"]')).toBeTruthy());

    (el.querySelector('[data-action="copy-to"]') as HTMLButtonElement).click();

    await vi.waitFor(() => {
      expect((el.querySelector('[data-action="copy-to"]') as HTMLButtonElement).textContent).toBe(
        'Already there',
      );
    });
    expect(api.create).not.toHaveBeenCalled();
  });

  it('no copy buttons when only one child exists', async () => {
    const api = makeChoreApi([makeChore({ id: 1 })]);
    const el = createChoreManagementSection([children[0]], api);
    container.appendChild(el);
    await vi.waitFor(() => expect(el.querySelector('[data-action="delete"]')).toBeTruthy());

    expect(el.querySelector('[data-action="copy-to"]')).toBeNull();
  });

  it('weekly chore not scheduled today appears under "Not scheduled today"', async () => {
    // Monday-only chore, but test runs on whatever day it is — use a day it definitely won't be
    // by picking days [0,1,2,3,4,5,6] minus today
    const todayDow = new Date().getDay();
    const offDay = todayDow === 1 ? 2 : 1; // pick a day that isn't today
    const api = makeChoreApi([
      makeChore({ id: 1, title: 'Daily chore', recurrence_rule: 'daily', recurrence_days: null }),
      makeChore({
        id: 2,
        title: 'Off-day chore',
        recurrence_rule: 'weekly',
        recurrence_days: [offDay as 0 | 1 | 2 | 3 | 4 | 5 | 6],
      }),
    ]);
    const el = createChoreManagementSection(children, api);
    container.appendChild(el);
    await vi.waitFor(() => {
      expect(el.querySelector('.chore-section-label')).toBeTruthy();
      expect(el.querySelector('.chore-section-label')!.textContent).toContain(
        'Not scheduled today',
      );
    });
  });

  it('inactive chore row does not have an undo button even when completed', async () => {
    const todayDow = new Date().getDay();
    const offDay = todayDow === 1 ? 2 : 1;
    const api = makeChoreApi([
      makeChore({
        id: 2,
        title: 'Off-day completed',
        completed: true,
        recurrence_rule: 'weekly',
        recurrence_days: [offDay as 0 | 1 | 2 | 3 | 4 | 5 | 6],
      }),
    ]);
    const el = createChoreManagementSection(children, api);
    container.appendChild(el);
    await vi.waitFor(() => expect(el.querySelector('.chore-row--inactive')).toBeTruthy());
    expect(el.querySelector('[data-action="uncomplete"]')).toBeNull();
  });

  it('add form has a frequency selector defaulting to daily', async () => {
    const api = makeChoreApi([]);
    const el = createChoreManagementSection(children, api);
    container.appendChild(el);
    await vi.waitFor(() => expect(el.querySelector('form')).toBeTruthy());

    const freqSelect = el.querySelector('select[data-field="frequency"]') as HTMLSelectElement;
    expect(freqSelect).toBeTruthy();
    expect(freqSelect.value).toBe('daily');
  });

  it('selecting weekly in add form shows day picker', async () => {
    const api = makeChoreApi([]);
    const el = createChoreManagementSection(children, api);
    container.appendChild(el);
    await vi.waitFor(() => expect(el.querySelector('select[data-field="frequency"]')).toBeTruthy());

    const freqSelect = el.querySelector('select[data-field="frequency"]') as HTMLSelectElement;
    freqSelect.value = 'weekly';
    freqSelect.dispatchEvent(new Event('change', { bubbles: true }));

    await vi.waitFor(() => {
      expect(el.querySelector('.chore-day-picker')).toBeTruthy();
    });
  });

  it('submitting weekly chore includes recurrence_rule weekly', async () => {
    const api = makeChoreApi([]);
    const el = createChoreManagementSection(children, api);
    container.appendChild(el);
    await vi.waitFor(() => expect(el.querySelector('form')).toBeTruthy());

    const freqSelect = el.querySelector('select[data-field="frequency"]') as HTMLSelectElement;
    freqSelect.value = 'weekly';
    freqSelect.dispatchEvent(new Event('change', { bubbles: true }));

    const titleInput = el.querySelector('input[data-field="title"]') as HTMLInputElement;
    titleInput.value = 'Water plants';
    el.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true }));

    await vi.waitFor(() => {
      expect(api.create).toHaveBeenCalledWith(
        expect.objectContaining({ recurrence_rule: 'weekly', title: 'Water plants' }),
      );
    });
  });

  it('chore row shows a frequency selector', async () => {
    const api = makeChoreApi([makeChore({ id: 1, recurrence_rule: 'daily' })]);
    const el = createChoreManagementSection(children, api);
    container.appendChild(el);
    await vi.waitFor(() => expect(el.querySelector('li.chore-row')).toBeTruthy());

    const rowSelect = el.querySelector('li.chore-row select.chore-row__freq') as HTMLSelectElement;
    expect(rowSelect).toBeTruthy();
    expect(rowSelect.value).toBe('daily');
  });

  it('weekly chore row shows day picker', async () => {
    const api = makeChoreApi([
      makeChore({ id: 1, recurrence_rule: 'weekly', recurrence_days: [1, 3] }),
    ]);
    const el = createChoreManagementSection(children, api);
    container.appendChild(el);
    await vi.waitFor(() => {
      expect(el.querySelector('.chore-day-picker')).toBeTruthy();
    });
  });

  it('copy button copies recurrence_days for weekly chores', async () => {
    const activeChore = makeChore({
      id: 1,
      title: 'Monday sweep',
      icon: '🧹',
      recurrence_rule: 'weekly',
      recurrence_days: [1],
    });
    const api = makeChoreApi([activeChore]);
    api.listAll.mockImplementation(async (userId: number) => (userId === 1 ? [activeChore] : []));
    const el = createChoreManagementSection(children, api);
    container.appendChild(el);
    await vi.waitFor(() => expect(el.querySelector('[data-action="copy-to"]')).toBeTruthy());

    (el.querySelector('[data-action="copy-to"]') as HTMLButtonElement).click();

    await vi.waitFor(() => {
      expect(api.create).toHaveBeenCalledWith(
        expect.objectContaining({
          recurrence_rule: 'weekly',
          recurrence_days: [1],
        }),
      );
    });
  });
});

function makeStreak(overrides: Partial<StreakRecord> = {}): StreakRecord {
  return {
    id: 1,
    user_id: 1,
    current_streak: 5,
    longest_streak: 10,
    last_completed_date: '2026-05-02',
    ...overrides,
  };
}

function makeStreakApi(streak: StreakRecord = makeStreak()) {
  return {
    get: vi.fn(async () => streak),
    reset: vi.fn(async () => makeStreak({ current_streak: 0, last_completed_date: null })),
  };
}

describe('createChoreManagementSection — streak', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  it('shows streak info when streakApi is provided', async () => {
    const api = makeChoreApi([]);
    const streakApi = makeStreakApi(makeStreak({ current_streak: 5, longest_streak: 10 }));
    const el = createChoreManagementSection([children[0]], api, streakApi);
    container.appendChild(el);
    await vi.waitFor(() => {
      expect(el.querySelector('.chore-streak-info')).toBeTruthy();
      expect(el.querySelector('.chore-streak-info')!.textContent).toContain('5 day streak');
      expect(el.querySelector('.chore-streak-info')!.textContent).toContain('Best: 10');
    });
  });

  it('does not show streak section when streakApi is omitted', async () => {
    const api = makeChoreApi([]);
    const el = createChoreManagementSection([children[0]], api);
    container.appendChild(el);
    await vi.waitFor(() => expect(el.querySelector('form')).toBeTruthy());
    expect(el.querySelector('.chore-streak-info')).toBeNull();
  });

  it('reset button calls streakApi.reset', async () => {
    const api = makeChoreApi([]);
    const streakApi = makeStreakApi();
    const el = createChoreManagementSection([children[0]], api, streakApi);
    container.appendChild(el);
    await vi.waitFor(() => expect(el.querySelector('[data-action="reset-streak"]')).toBeTruthy());

    (el.querySelector('[data-action="reset-streak"]') as HTMLButtonElement).click();

    await vi.waitFor(() => {
      expect(streakApi.reset).toHaveBeenCalledWith(1);
    });
  });

  it('updates streak display after reset', async () => {
    const api = makeChoreApi([]);
    const streakApi = makeStreakApi(makeStreak({ current_streak: 7, longest_streak: 7 }));
    const el = createChoreManagementSection([children[0]], api, streakApi);
    container.appendChild(el);
    await vi.waitFor(() => expect(el.querySelector('[data-action="reset-streak"]')).toBeTruthy());

    (el.querySelector('[data-action="reset-streak"]') as HTMLButtonElement).click();

    await vi.waitFor(() => {
      expect(el.querySelector('.chore-streak-info')!.textContent).toContain('0 day streak');
    });
  });
});
