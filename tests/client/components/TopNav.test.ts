// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createTopNav } from '../../../src/client/components/TopNav.js';
import type { User } from '../../../src/shared/types.js';

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 1,
    name: 'WR',
    type: 'parent',
    icon: '🌿',
    display_order: 0,
    ...overrides,
  };
}

const users: User[] = [
  makeUser({ id: 1, name: 'WR', type: 'parent', icon: '🌿' }),
  makeUser({ id: 2, name: 'Scales', type: 'parent', icon: '⚖️' }),
  makeUser({ id: 3, name: 'Kraft', type: 'child', icon: '🎨' }),
];

describe('createTopNav', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  it('renders a nav element', () => {
    const el = createTopNav(users, null, vi.fn(), vi.fn());
    expect(el.tagName.toLowerCase()).toBe('nav');
  });

  it('renders a button for each user', () => {
    const el = createTopNav(users, null, vi.fn(), vi.fn());
    const userBtns = el.querySelectorAll('[data-user-id]');
    expect(userBtns.length).toBe(3);
  });

  it('renders a summary button', () => {
    const el = createTopNav(users, null, vi.fn(), vi.fn());
    expect(el.querySelector('[data-summary]')).toBeTruthy();
  });

  it('shows user icons and names', () => {
    const el = createTopNav(users, null, vi.fn(), vi.fn());
    expect(el.textContent).toContain('WR');
    expect(el.textContent).toContain('🌿');
    expect(el.textContent).toContain('Kraft');
  });

  it('marks the active user button with --active class', () => {
    const el = createTopNav(users, 2, vi.fn(), vi.fn());
    const activeBtn = el.querySelector('.top-nav__btn--active');
    expect(activeBtn).toBeTruthy();
    expect((activeBtn as HTMLElement).dataset.userId).toBe('2');
  });

  it('no button is active when activeId is null', () => {
    const el = createTopNav(users, null, vi.fn(), vi.fn());
    expect(el.querySelector('.top-nav__btn--active')).toBeFalsy();
  });

  it('calls onSelectUser with the correct user on click', () => {
    const onSelectUser = vi.fn();
    const el = createTopNav(users, null, onSelectUser, vi.fn());
    const btn = el.querySelector('[data-user-id="3"]') as HTMLButtonElement;
    btn.click();
    expect(onSelectUser).toHaveBeenCalledWith(users[2]);
  });

  it('calls onSelectSummary when summary button is clicked', () => {
    const onSelectSummary = vi.fn();
    const el = createTopNav(users, null, vi.fn(), onSelectSummary);
    (el.querySelector('[data-summary]') as HTMLButtonElement).click();
    expect(onSelectSummary).toHaveBeenCalled();
  });

  it('setActive moves the active class to a user button', () => {
    const el = createTopNav(users, 1, vi.fn(), vi.fn());
    container.appendChild(el);

    el.setActive(3, false);

    const active = el.querySelector('.top-nav__btn--active') as HTMLElement;
    expect(active?.dataset.userId).toBe('3');
  });

  it('setActive with isSummary=true marks the summary button', () => {
    const el = createTopNav(users, 1, vi.fn(), vi.fn());
    container.appendChild(el);

    el.setActive(null, true);

    const active = el.querySelector('.top-nav__btn--active') as HTMLElement;
    expect(active?.dataset.summary).toBeDefined();
  });

  it('setActive with null and isSummary=false clears all active states', () => {
    const el = createTopNav(users, 1, vi.fn(), vi.fn());
    container.appendChild(el);

    el.setActive(null, false);

    expect(el.querySelector('.top-nav__btn--active')).toBeFalsy();
  });
});
