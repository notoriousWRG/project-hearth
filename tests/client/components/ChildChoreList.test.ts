// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createChildChoreList } from '../../../src/client/components/ChildChoreList.js';
import type { Chore, ChoreCompletion, StreakRecord } from '../../../src/shared/types.js';

function makeChore(overrides: Partial<Chore> = {}): Chore {
  return {
    id: 1,
    user_id: 10,
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

function makeCompletion(): { completion: ChoreCompletion; streak: StreakRecord } {
  return {
    completion: { id: 1, chore_id: 1, completed_at: '2026-05-02', period_id: '2026-05-02' },
    streak: {
      id: 1,
      user_id: 10,
      current_streak: 1,
      longest_streak: 1,
      last_completed_date: '2026-05-02',
    },
  };
}

function makeApi(chores: Chore[] = []) {
  return {
    list: vi.fn(async () => chores),
    complete: vi.fn(async () => makeCompletion()),
  };
}

describe('createChildChoreList', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  it('renders a section element', () => {
    const el = createChildChoreList(10, makeApi(), vi.fn());
    expect(el.tagName.toLowerCase()).toBe('section');
  });

  it('shows chore title and icon after loading', async () => {
    const api = makeApi([makeChore({ title: 'Feed the chickens', icon: '🐔' })]);
    const el = createChildChoreList(10, api, vi.fn());
    container.appendChild(el);
    await vi.waitFor(() => {
      expect(el.textContent).toContain('Feed the chickens');
      expect(el.textContent).toContain('🐔');
    });
  });

  it('renders each chore as a button', async () => {
    const api = makeApi([makeChore({ id: 1 }), makeChore({ id: 2, title: 'Water plants' })]);
    const el = createChildChoreList(10, api, vi.fn());
    container.appendChild(el);
    await vi.waitFor(() => {
      const buttons = el.querySelectorAll('.child-chore-item');
      expect(buttons.length).toBe(2);
    });
  });

  it('chore buttons have child-chore-item class (for tap-target sizing)', async () => {
    const api = makeApi([makeChore()]);
    const el = createChildChoreList(10, api, vi.fn());
    container.appendChild(el);
    await vi.waitFor(() => {
      const btn = el.querySelector('.child-chore-item');
      expect(btn).toBeTruthy();
      expect(btn!.tagName.toLowerCase()).toBe('button');
    });
  });

  it('calls complete and fires onComplete when incomplete chore is tapped', async () => {
    const api = makeApi([makeChore({ id: 5 })]);
    const onComplete = vi.fn();
    const el = createChildChoreList(10, api, onComplete);
    container.appendChild(el);

    await vi.waitFor(() => expect(el.querySelector('.child-chore-item')).toBeTruthy());

    const btn = el.querySelector('.child-chore-item') as HTMLButtonElement;
    btn.click();

    await vi.waitFor(() => {
      expect(api.complete).toHaveBeenCalledWith(5, expect.any(String));
      expect(onComplete).toHaveBeenCalled();
    });
  });

  it('adds completing class on tap before done', async () => {
    const api = makeApi([makeChore({ id: 5 })]);
    const el = createChildChoreList(10, api, vi.fn());
    container.appendChild(el);

    await vi.waitFor(() => expect(el.querySelector('.child-chore-item')).toBeTruthy());

    const btn = el.querySelector('.child-chore-item') as HTMLButtonElement;
    btn.click();

    await vi.waitFor(() => {
      expect(
        btn.classList.contains('child-chore-item--completing') ||
          btn.classList.contains('child-chore-item--done'),
      ).toBe(true);
    });
  });

  it('marks completed chore with done class after completion', async () => {
    const api = makeApi([makeChore({ id: 5 })]);
    const el = createChildChoreList(10, api, vi.fn());
    container.appendChild(el);

    await vi.waitFor(() => expect(el.querySelector('.child-chore-item')).toBeTruthy());

    const btn = el.querySelector('.child-chore-item') as HTMLButtonElement;
    btn.click();

    await vi.waitFor(() => {
      expect(btn.classList.contains('child-chore-item--done')).toBe(true);
    });
  });

  it('already-completed chores show done class on load', async () => {
    const api = makeApi([makeChore({ completed: true, completed_at: '2026-05-02T10:00:00Z' })]);
    const el = createChildChoreList(10, api, vi.fn());
    container.appendChild(el);

    await vi.waitFor(() => {
      const btn = el.querySelector('.child-chore-item');
      expect(btn?.classList.contains('child-chore-item--done')).toBe(true);
    });
  });

  it('completed chores do not fire complete on click', async () => {
    const api = makeApi([makeChore({ completed: true, completed_at: '2026-05-02T10:00:00Z' })]);
    const onComplete = vi.fn();
    const el = createChildChoreList(10, api, onComplete);
    container.appendChild(el);

    await vi.waitFor(() => expect(el.querySelector('.child-chore-item--done')).toBeTruthy());

    const btn = el.querySelector('.child-chore-item') as HTMLButtonElement;
    btn.click();

    // Wait a tick, confirm not called
    await new Promise((r) => setTimeout(r, 50));
    expect(api.complete).not.toHaveBeenCalled();
    expect(onComplete).not.toHaveBeenCalled();
  });

  it('shows bonus indicator for bonus chores', async () => {
    const api = makeApi([makeChore({ is_bonus: true, bonus_amount: 1.5 })]);
    const el = createChildChoreList(10, api, vi.fn());
    container.appendChild(el);

    await vi.waitFor(() => {
      expect(el.querySelector('.child-chore-item--bonus')).toBeTruthy();
    });
  });

  it('chore button has aria-label with chore title', async () => {
    const api = makeApi([makeChore({ title: 'Water the garden' })]);
    const el = createChildChoreList(10, api, vi.fn());
    container.appendChild(el);

    await vi.waitFor(() => {
      const btn = el.querySelector('.child-chore-item') as HTMLButtonElement;
      expect(btn.getAttribute('aria-label')).toBe('Water the garden');
    });
  });

  it('completed chore button aria-label includes done', async () => {
    const api = makeApi([makeChore({ title: 'Feed the chickens', completed: true })]);
    const el = createChildChoreList(10, api, vi.fn());
    container.appendChild(el);

    await vi.waitFor(() => {
      const btn = el.querySelector('.child-chore-item') as HTMLButtonElement;
      expect(btn.getAttribute('aria-label')).toContain('done');
    });
  });

  it('chore button has aria-pressed=false for incomplete chores', async () => {
    const api = makeApi([makeChore({ completed: false })]);
    const el = createChildChoreList(10, api, vi.fn());
    container.appendChild(el);

    await vi.waitFor(() => {
      const btn = el.querySelector('.child-chore-item') as HTMLButtonElement;
      expect(btn.getAttribute('aria-pressed')).toBe('false');
    });
  });

  it('chore button has aria-pressed=true for completed chores', async () => {
    const api = makeApi([makeChore({ completed: true })]);
    const el = createChildChoreList(10, api, vi.fn());
    container.appendChild(el);

    await vi.waitFor(() => {
      const btn = el.querySelector('.child-chore-item') as HTMLButtonElement;
      expect(btn.getAttribute('aria-pressed')).toBe('true');
    });
  });

  it('does not fire complete twice when tapped rapidly', async () => {
    const api = makeApi([makeChore({ id: 5 })]);
    const el = createChildChoreList(10, api, vi.fn());
    container.appendChild(el);

    await vi.waitFor(() => expect(el.querySelector('.child-chore-item')).toBeTruthy());

    const btn = el.querySelector('.child-chore-item') as HTMLButtonElement;
    btn.click();
    btn.click();
    btn.click();

    await vi.waitFor(() => expect(btn.classList.contains('child-chore-item--done')).toBe(true));
    expect(api.complete).toHaveBeenCalledTimes(1);
  });

  it('shows empty state when no chores', async () => {
    const api = makeApi([]);
    const el = createChildChoreList(10, api, vi.fn());
    container.appendChild(el);

    await vi.waitFor(() => {
      expect(el.textContent).toContain('No chores');
    });
  });

  it('shows error banner when api.list throws', async () => {
    const api = {
      list: vi.fn(async () => {
        throw new Error('Network error');
      }),
      complete: vi.fn(),
    };
    const el = createChildChoreList(10, api, vi.fn());
    container.appendChild(el);

    await vi.waitFor(() => {
      expect(el.querySelector('.error-banner')).toBeTruthy();
    });
  });

  it('shows error banner when complete fails', async () => {
    const api = {
      list: vi.fn(async () => [makeChore({ id: 5 })]),
      complete: vi.fn(async () => {
        throw new Error('Server error');
      }),
    };
    const el = createChildChoreList(10, api, vi.fn());
    container.appendChild(el);

    await vi.waitFor(() => expect(el.querySelector('.child-chore-item')).toBeTruthy());

    const btn = el.querySelector('.child-chore-item') as HTMLButtonElement;
    btn.click();

    await vi.waitFor(() => {
      expect(el.querySelector('.error-banner')).toBeTruthy();
    });
  });
});
