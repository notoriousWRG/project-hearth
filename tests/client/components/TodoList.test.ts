// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createTodoList } from '../../../src/client/components/TodoList.js';
import type { Todo } from '../../../src/shared/types.js';

function makeTodo(overrides: Partial<Todo> = {}): Todo {
  return {
    id: 1,
    user_id: 10,
    title: 'Test todo',
    completed: false,
    position: 0,
    is_recurring: false,
    recurrence_rule: null,
    created_at: '2026-05-02T00:00:00.000Z',
    completed_at: null,
    ...overrides,
  };
}

function makeApi(todos: Todo[] = []) {
  return {
    list: vi.fn(async () => todos),
    create: vi.fn(async (data: { user_id: number; title: string }) =>
      makeTodo({ id: 99, title: data.title }),
    ),
    complete: vi.fn(async (id: number) => makeTodo({ id, completed: true })),
    remove: vi.fn(async () => undefined),
    update: vi.fn(async (_id: number, data: Partial<Todo>) => makeTodo(data)),
  };
}

describe('createTodoList', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  it('renders a section element', () => {
    const api = makeApi();
    const el = createTodoList(10, api);
    expect(el.tagName.toLowerCase()).toBe('section');
  });

  it('shows todos after loading', async () => {
    const api = makeApi([makeTodo({ title: 'Buy milk' })]);
    const el = createTodoList(10, api);
    container.appendChild(el);
    await vi.waitFor(() => {
      expect(el.textContent).toContain('Buy milk');
    });
  });

  it('shows empty state when no todos', async () => {
    const api = makeApi([]);
    const el = createTodoList(10, api);
    container.appendChild(el);
    await vi.waitFor(() => {
      expect(el.textContent).toContain('No todos');
    });
  });

  it('adds a todo when form is submitted', async () => {
    const api = makeApi([]);
    const el = createTodoList(10, api);
    container.appendChild(el);
    await vi.waitFor(() => expect(el.querySelector('form')).toBeTruthy());

    const input = el.querySelector('input[type="text"]') as HTMLInputElement;
    const form = el.querySelector('form') as HTMLFormElement;
    input.value = 'New task';
    form.dispatchEvent(new Event('submit', { bubbles: true }));

    await vi.waitFor(() => {
      expect(api.create).toHaveBeenCalledWith({ user_id: 10, title: 'New task' });
    });
  });

  it('marks a todo complete on button click', async () => {
    const api = makeApi([makeTodo({ id: 5 })]);
    const el = createTodoList(10, api);
    container.appendChild(el);
    await vi.waitFor(() => expect(el.querySelector('[data-action="complete"]')).toBeTruthy());

    const btn = el.querySelector('[data-action="complete"]') as HTMLButtonElement;
    btn.click();

    await vi.waitFor(() => {
      expect(api.complete).toHaveBeenCalledWith(5);
    });
  });

  it('deletes a todo on button click', async () => {
    const api = makeApi([makeTodo({ id: 7 })]);
    const el = createTodoList(10, api);
    container.appendChild(el);
    await vi.waitFor(() => expect(el.querySelector('[data-action="delete"]')).toBeTruthy());

    const btn = el.querySelector('[data-action="delete"]') as HTMLButtonElement;
    btn.click();

    await vi.waitFor(() => {
      expect(api.remove).toHaveBeenCalledWith(7);
    });
  });

  it('shows recurring indicator for recurring todos', async () => {
    const api = makeApi([makeTodo({ is_recurring: true, recurrence_rule: 'daily' })]);
    const el = createTodoList(10, api);
    container.appendChild(el);
    await vi.waitFor(() => {
      expect(el.querySelector('.todo-item--recurring')).toBeTruthy();
    });
  });

  it('complete button has aria-label', async () => {
    const api = makeApi([makeTodo({ title: 'Buy milk' })]);
    const el = createTodoList(10, api);
    container.appendChild(el);
    await vi.waitFor(() => {
      const btn = el.querySelector('[data-action="complete"]') as HTMLButtonElement;
      expect(btn.getAttribute('aria-label')).toContain('Buy milk');
    });
  });

  it('delete button has aria-label', async () => {
    const api = makeApi([makeTodo({ title: 'Buy milk' })]);
    const el = createTodoList(10, api);
    container.appendChild(el);
    await vi.waitFor(() => {
      const btn = el.querySelector('[data-action="delete"]') as HTMLButtonElement;
      expect(btn.getAttribute('aria-label')).toContain('Buy milk');
    });
  });

  it('section has aria-label', () => {
    const el = createTodoList(10, makeApi());
    expect(el.getAttribute('aria-label')).toBeTruthy();
  });

  it('shows error banner when api.list throws', async () => {
    const api = {
      list: vi.fn(async () => {
        throw new Error('Network error');
      }),
      create: vi.fn(),
      complete: vi.fn(),
      remove: vi.fn(),
      update: vi.fn(),
    };
    const el = createTodoList(10, api);
    container.appendChild(el);
    await vi.waitFor(() => {
      expect(el.querySelector('.error-banner')).toBeTruthy();
    });
  });
});
