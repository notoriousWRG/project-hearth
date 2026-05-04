// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createRemindersPanel } from '../../../src/client/components/RemindersPanel.js';
import type { Reminder } from '../../../src/shared/types.js';

function makeReminder(overrides: Partial<Reminder> = {}): Reminder {
  return {
    id: 1,
    title: 'Call dentist',
    due_date: '2026-05-02',
    dismissed: false,
    created_at: '2026-05-01T00:00:00.000Z',
    ...overrides,
  };
}

function makeApi(reminders: Reminder[] = []) {
  return {
    list: vi.fn(async () => reminders),
    dismiss: vi.fn(async (id: number) => makeReminder({ id, dismissed: true })),
  };
}

describe('createRemindersPanel', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  it('renders a section element', () => {
    const el = createRemindersPanel(makeApi());
    expect(el.tagName.toLowerCase()).toBe('section');
  });

  it('shows reminders after loading', async () => {
    const api = makeApi([makeReminder({ title: 'Pick up kids' })]);
    const el = createRemindersPanel(api);
    container.appendChild(el);
    await vi.waitFor(() => {
      expect(el.textContent).toContain('Pick up kids');
    });
  });

  it('shows empty state when no reminders', async () => {
    const el = createRemindersPanel(makeApi([]));
    container.appendChild(el);
    await vi.waitFor(() => {
      expect(el.textContent).toContain('No reminders');
    });
  });

  it('dismisses a reminder on button click', async () => {
    const api = makeApi([makeReminder({ id: 4 })]);
    const el = createRemindersPanel(api);
    container.appendChild(el);
    await vi.waitFor(() => expect(el.querySelector('[data-action="dismiss"]')).toBeTruthy());

    (el.querySelector('[data-action="dismiss"]') as HTMLButtonElement).click();

    await vi.waitFor(() => {
      expect(api.dismiss).toHaveBeenCalledWith(4);
    });
  });

  it('removes dismissed reminder from the list', async () => {
    const api = makeApi([makeReminder({ id: 4, title: 'Buy milk' })]);
    const el = createRemindersPanel(api);
    container.appendChild(el);
    await vi.waitFor(() => expect(el.textContent).toContain('Buy milk'));

    (el.querySelector('[data-action="dismiss"]') as HTMLButtonElement).click();

    await vi.waitFor(() => {
      expect(el.textContent).not.toContain('Buy milk');
    });
  });

  it('dismiss button has aria-label with reminder title', async () => {
    const api = makeApi([makeReminder({ title: 'Call dentist' })]);
    const el = createRemindersPanel(api);
    container.appendChild(el);
    await vi.waitFor(() => {
      const btn = el.querySelector('[data-action="dismiss"]') as HTMLButtonElement;
      expect(btn.getAttribute('aria-label')).toContain('Call dentist');
    });
  });

  it('section has aria-label', () => {
    const el = createRemindersPanel(makeApi());
    expect(el.getAttribute('aria-label')).toBeTruthy();
  });

  it('shows error banner when api.list throws', async () => {
    const api = {
      list: vi.fn(async () => {
        throw new Error('Network error');
      }),
      dismiss: vi.fn(),
    };
    const el = createRemindersPanel(api);
    container.appendChild(el);
    await vi.waitFor(() => {
      expect(el.querySelector('.error-banner')).toBeTruthy();
    });
  });
});
