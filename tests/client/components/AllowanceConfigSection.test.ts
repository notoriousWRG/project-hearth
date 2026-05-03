// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createAllowanceConfigSection } from '../../../src/client/components/AllowanceConfigSection.js';
import type { AllowanceConfig, AllowanceTier, User } from '../../../src/shared/types.js';

function makeUser(overrides: Partial<User> = {}): User {
  return { id: 1, name: 'Kraft', type: 'child', icon: '🎨', display_order: 0, ...overrides };
}

function makeConfig(overrides: Partial<AllowanceConfig> = {}): AllowanceConfig {
  return {
    id: 1,
    user_id: 1,
    amount: 10,
    streak_threshold: 7,
    reset_day: 0,
    period_start: '2026-05-01',
    ...overrides,
  };
}

function makeTier(overrides: Partial<AllowanceTier> = {}): AllowanceTier {
  return { id: 1, config_id: 1, percent_complete: 100, percent_payout: 100, ...overrides };
}

function makeAllowanceApi(config: AllowanceConfig | null = null, tiers: AllowanceTier[] = []) {
  return {
    get: vi.fn(async () => ({ config, tiers })),
    save: vi.fn(async () => ({ config: config ?? makeConfig(), tiers })),
    payout: vi.fn(async () => config ?? makeConfig()),
  };
}

const children: User[] = [
  makeUser({ id: 1, name: 'Kraft' }),
  makeUser({ id: 2, name: 'Golden', icon: '⭐' }),
];

describe('createAllowanceConfigSection', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  it('renders child tabs', () => {
    const el = createAllowanceConfigSection(children, makeAllowanceApi());
    expect(el.querySelector('[data-child-id="1"]')).toBeTruthy();
    expect(el.querySelector('[data-child-id="2"]')).toBeTruthy();
  });

  it('loads and displays existing config', async () => {
    const api = makeAllowanceApi(makeConfig({ amount: 10 }), []);
    const el = createAllowanceConfigSection(children, api);
    container.appendChild(el);
    await vi.waitFor(() => {
      expect(api.get).toHaveBeenCalledWith(1);
      const amountInput = el.querySelector('input[data-field="amount"]') as HTMLInputElement;
      expect(amountInput?.value).toBe('10');
    });
  });

  it('displays existing tiers', async () => {
    const api = makeAllowanceApi(makeConfig(), [
      makeTier({ percent_complete: 50, percent_payout: 50 }),
      makeTier({ id: 2, percent_complete: 100, percent_payout: 100 }),
    ]);
    const el = createAllowanceConfigSection(children, api);
    container.appendChild(el);
    await vi.waitFor(() => {
      const rows = el.querySelectorAll('.tier-row');
      expect(rows.length).toBe(2);
    });
  });

  it('add tier button adds a new row', async () => {
    const api = makeAllowanceApi(makeConfig(), []);
    const el = createAllowanceConfigSection(children, api);
    container.appendChild(el);
    await vi.waitFor(() => expect(el.querySelector('[data-action="add-tier"]')).toBeTruthy());

    (el.querySelector('[data-action="add-tier"]') as HTMLButtonElement).click();

    expect(el.querySelectorAll('.tier-row').length).toBe(1);
  });

  it('delete tier button removes the row', async () => {
    const api = makeAllowanceApi(makeConfig(), [makeTier()]);
    const el = createAllowanceConfigSection(children, api);
    container.appendChild(el);
    await vi.waitFor(() => expect(el.querySelector('.tier-row')).toBeTruthy());

    (el.querySelector('[data-action="delete-tier"]') as HTMLButtonElement).click();

    expect(el.querySelectorAll('.tier-row').length).toBe(0);
  });

  it('save calls allowanceApi.save with correct payload', async () => {
    const api = makeAllowanceApi(makeConfig({ amount: 10, streak_threshold: 7 }), [
      makeTier({ percent_complete: 100, percent_payout: 100 }),
    ]);
    const el = createAllowanceConfigSection(children, api);
    container.appendChild(el);
    await vi.waitFor(() => expect(el.querySelector('[data-action="save"]')).toBeTruthy());

    (el.querySelector('[data-action="save"]') as HTMLButtonElement).click();

    await vi.waitFor(() => {
      expect(api.save).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          amount: 10,
          streak_threshold: 7,
          tiers: expect.arrayContaining([
            expect.objectContaining({ percent_complete: 100, percent_payout: 100 }),
          ]),
        }),
      );
    });
  });

  it('switching tabs loads config for that child', async () => {
    const api = makeAllowanceApi(null, []);
    const el = createAllowanceConfigSection(children, api);
    container.appendChild(el);
    await vi.waitFor(() => expect(api.get).toHaveBeenCalledWith(1));

    (el.querySelector('[data-child-id="2"]') as HTMLButtonElement).click();

    await vi.waitFor(() => {
      expect(api.get).toHaveBeenCalledWith(2);
    });
  });
});
