// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createUserManagementSection } from '../../../src/client/components/UserManagementSection.js';
import type { User, NewUser } from '../../../src/shared/types.js';

function makeUser(overrides: Partial<User> = {}): User {
  return { id: 1, name: 'Alice', type: 'parent', icon: '👩', display_order: 0, ...overrides };
}

function makeApi(users: User[] = []) {
  return {
    list: vi.fn(async () => users),
    create: vi.fn(async (data: NewUser) => makeUser({ id: 99, ...data })),
    update: vi.fn(async (id: number, data: Partial<NewUser>) => makeUser({ id, ...data })),
    remove: vi.fn(async () => undefined),
  };
}

const sampleUsers: User[] = [
  makeUser({ id: 1, name: 'Alice', type: 'parent', icon: '👩' }),
  makeUser({ id: 2, name: 'Kraft', type: 'child', icon: '🎨' }),
];

describe('createUserManagementSection', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  it('loads and renders users on mount', async () => {
    const api = makeApi(sampleUsers);
    const el = createUserManagementSection(api);
    container.appendChild(el);
    await vi.waitFor(() => {
      expect(api.list).toHaveBeenCalled();
      const nameInputs = el.querySelectorAll<HTMLInputElement>('.user-row [aria-label="Name"]');
      const names = Array.from(nameInputs).map((i) => i.value);
      expect(names).toContain('Alice');
      expect(names).toContain('Kraft');
    });
  });

  it('shows a type badge per user', async () => {
    const api = makeApi(sampleUsers);
    const el = createUserManagementSection(api);
    container.appendChild(el);
    await vi.waitFor(() => {
      const badges = el.querySelectorAll('.user-row__type');
      expect(badges.length).toBe(2);
      expect(badges[0].textContent).toBe('parent');
      expect(badges[1].textContent).toBe('child');
    });
  });

  it('add form calls api.create with name, type, and icon', async () => {
    const api = makeApi([]);
    const el = createUserManagementSection(api);
    container.appendChild(el);
    await vi.waitFor(() => expect(el.querySelector('form')).toBeTruthy());

    const iconInput = el.querySelector('input[data-field="icon"]') as HTMLInputElement;
    const nameInput = el.querySelector('input[data-field="name"]') as HTMLInputElement;
    const typeSelect = el.querySelector('select[data-field="type"]') as HTMLSelectElement;
    const form = el.querySelector('form') as HTMLFormElement;

    iconInput.value = '🧒';
    nameInput.value = 'Jamie';
    typeSelect.value = 'child';
    form.dispatchEvent(new Event('submit', { bubbles: true }));

    await vi.waitFor(() => {
      expect(api.create).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Jamie', type: 'child', icon: '🧒' }),
      );
    });
  });

  it('add form defaults to child type', async () => {
    const api = makeApi([]);
    const el = createUserManagementSection(api);
    container.appendChild(el);
    await vi.waitFor(() => expect(el.querySelector('form')).toBeTruthy());

    const typeSelect = el.querySelector('select[data-field="type"]') as HTMLSelectElement;
    expect(typeSelect.value).toBe('child');
  });

  it('delete button calls api.remove with user id', async () => {
    const api = makeApi([makeUser({ id: 5 })]);
    const el = createUserManagementSection(api);
    container.appendChild(el);
    await vi.waitFor(() => expect(el.querySelector('[data-action="delete"]')).toBeTruthy());

    (el.querySelector('[data-action="delete"]') as HTMLButtonElement).click();

    await vi.waitFor(() => {
      expect(api.remove).toHaveBeenCalledWith(5);
    });
  });

  it('shows reload notice after delete', async () => {
    const api = makeApi([makeUser({ id: 5 })]);
    const el = createUserManagementSection(api);
    container.appendChild(el);
    await vi.waitFor(() => expect(el.querySelector('[data-action="delete"]')).toBeTruthy());

    (el.querySelector('[data-action="delete"]') as HTMLButtonElement).click();

    await vi.waitFor(() => {
      const notice = el.querySelector('.settings-section__success') as HTMLElement;
      expect(notice?.hidden).toBe(false);
    });
  });

  it('shows reload notice after add', async () => {
    const api = makeApi([]);
    const el = createUserManagementSection(api);
    container.appendChild(el);
    await vi.waitFor(() => expect(el.querySelector('form')).toBeTruthy());

    const nameInput = el.querySelector('input[data-field="name"]') as HTMLInputElement;
    const form = el.querySelector('form') as HTMLFormElement;
    nameInput.value = 'Sam';
    form.dispatchEvent(new Event('submit', { bubbles: true }));

    await vi.waitFor(() => {
      const notice = el.querySelector('.settings-section__success') as HTMLElement;
      expect(notice?.hidden).toBe(false);
    });
  });

  it('shows empty message when no users exist', async () => {
    const api = makeApi([]);
    const el = createUserManagementSection(api);
    container.appendChild(el);
    await vi.waitFor(() => {
      expect(el.textContent).toContain('No users yet.');
    });
  });
});
