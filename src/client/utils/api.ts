import type {
  User,
  NewUser,
  Todo,
  NewTodo,
  Chore,
  NewChore,
  ChoreCompletion,
  StreakRecord,
  MealPlanEntry,
  NewMealPlanEntry,
  GroceryItem,
  NewGroceryItem,
  Reminder,
  NewReminder,
} from '../../shared/types.js';

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`/api${path}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`${method} /api${path} → ${res.status}: ${text}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

const get = <T>(path: string) => request<T>('GET', path);
const post = <T>(path: string, body: unknown) => request<T>('POST', path, body);
const put = <T>(path: string, body: unknown) => request<T>('PUT', path, body);
const patch = <T>(path: string, body: unknown) => request<T>('PATCH', path, body);
const del = (path: string) => request<void>('DELETE', path);

export const users = {
  list: () => get<User[]>('/users'),
  create: (data: NewUser) => post<User>('/users', data),
  update: (id: number, data: Partial<NewUser>) => put<User>(`/users/${id}`, data),
  remove: (id: number) => del(`/users/${id}`),
};

export const todos = {
  list: (userId: number) => get<Todo[]>(`/todos?userId=${userId}`),
  create: (data: NewTodo) => post<Todo>('/todos', data),
  update: (id: number, data: Partial<NewTodo>) => put<Todo>(`/todos/${id}`, data),
  complete: (id: number) => post<Todo>(`/todos/${id}/complete`, {}),
  remove: (id: number) => del(`/todos/${id}`),
};

export const chores = {
  list: (userId: number) => get<Chore[]>(`/chores?userId=${userId}`),
  create: (data: NewChore) => post<Chore>('/chores', data),
  update: (id: number, data: Partial<NewChore>) => put<Chore>(`/chores/${id}`, data),
  complete: (id: number, periodId: string) =>
    post<{ completion: ChoreCompletion; streak: StreakRecord }>(`/chores/${id}/complete`, {
      periodId,
    }),
  progress: (userId: number) =>
    get<{
      total: number;
      completed: number;
      percent: number;
      earned: number;
      streak_threshold: number;
    }>(`/chores/progress/${userId}`),
  remove: (id: number) => del(`/chores/${id}`),
};

export const streaks = {
  get: (userId: number) => get<StreakRecord>(`/streaks/${userId}`),
};

export const meals = {
  list: (weekStartDate: string) => get<MealPlanEntry[]>(`/meal-plan?week=${weekStartDate}`),
  upsert: (data: NewMealPlanEntry) => put<MealPlanEntry>('/meal-plan', data),
  remove: (id: number) => del(`/meal-plan/${id}`),
  generateGrocery: (weekStartDate: string) =>
    post<GroceryItem[]>('/meal-plan/generate-grocery', { week: weekStartDate }),
};

export const grocery = {
  list: () => get<GroceryItem[]>('/grocery'),
  create: (data: NewGroceryItem) => post<GroceryItem>('/grocery', data),
  update: (id: number, data: Partial<NewGroceryItem>) => put<GroceryItem>(`/grocery/${id}`, data),
  check: (id: number, checked: boolean) => patch<GroceryItem>(`/grocery/${id}/check`, { checked }),
  remove: (id: number) => del(`/grocery/${id}`),
  clearChecked: () => post<{ deleted: number }>('/grocery/clear-checked', {}),
};

export const reminders = {
  list: () => get<Reminder[]>('/reminders'),
  create: (data: NewReminder) => post<Reminder>('/reminders', data),
  update: (id: number, data: Partial<NewReminder>) => put<Reminder>(`/reminders/${id}`, data),
  dismiss: (id: number) => post<Reminder>(`/reminders/${id}/dismiss`, {}),
  remove: (id: number) => del(`/reminders/${id}`),
};

export const settings = {
  getAll: () => get<Record<string, unknown>>('/settings'),
  set: (key: string, value: unknown) => post<void>('/settings', { key, value }),
};
