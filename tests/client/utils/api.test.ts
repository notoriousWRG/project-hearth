import { describe, it, expect, vi, beforeEach } from 'vitest';
import { meals, grocery } from '../../../src/client/utils/api.js';

function makeFetchMock(status = 200, body: unknown = []) {
  return vi.fn().mockResolvedValue({
    ok: true,
    status,
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(''),
  });
}

describe('meals API client', () => {
  beforeEach(() => {
    global.fetch = makeFetchMock();
  });

  it('meals.list uses ?week= query param', async () => {
    await meals.list('2026-04-27');
    expect(global.fetch).toHaveBeenCalledWith('/api/meal-plan?week=2026-04-27', expect.any(Object));
  });

  it('meals.upsert uses PUT method', async () => {
    await meals.upsert({
      week_start_date: '2026-04-27',
      day_of_week: 1,
      meal_type: 'dinner',
      description: 'Pasta',
    });
    const [, options] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [
      string,
      RequestInit,
    ];
    expect(options.method).toBe('PUT');
  });

  it('meals.generateGrocery sends { week } in body', async () => {
    await meals.generateGrocery('2026-04-27');
    const [, options] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [
      string,
      RequestInit,
    ];
    const body = JSON.parse(options.body as string) as Record<string, unknown>;
    expect(body).toEqual({ week: '2026-04-27' });
    expect(body).not.toHaveProperty('weekStartDate');
  });
});

describe('grocery API client', () => {
  beforeEach(() => {
    global.fetch = makeFetchMock(200, { id: 1, checked: true });
  });

  it('grocery.check uses PATCH method', async () => {
    await grocery.check(1, true);
    const [, options] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [
      string,
      RequestInit,
    ];
    expect(options.method).toBe('PATCH');
  });

  it('grocery.check calls correct path', async () => {
    await grocery.check(42, false);
    const [url] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [string];
    expect(url).toBe('/api/grocery/42/check');
  });
});
