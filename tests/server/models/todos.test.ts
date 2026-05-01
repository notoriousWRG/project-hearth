import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { createDb } from '../../../src/server/db/connection.js';
import { runSchema } from '../../../src/server/db/schema.js';
import { createUser } from '../../../src/server/models/users.js';
import {
  getTodosByUser,
  getTodoById,
  createTodo,
  updateTodo,
  deleteTodo,
  completeTodo,
  resetRecurringTodo,
  getRecurringTodos,
  reorderTodos,
} from '../../../src/server/models/todos.js';

let db: Database.Database;
let userId: number;

beforeEach(() => {
  db = createDb(':memory:');
  runSchema(db);
  userId = createUser(db, { name: 'Alice', type: 'parent', icon: '', display_order: 0 }).id;
});

afterEach(() => {
  db.close();
});

describe('todos model', () => {
  it('getTodosByUser returns empty initially', () => {
    expect(getTodosByUser(db, userId)).toEqual([]);
  });

  it('createTodo returns a todo with id and boolean fields', () => {
    const todo = createTodo(db, {
      user_id: userId,
      title: 'Buy milk',
      completed: false,
      position: 0,
      is_recurring: false,
      recurrence_rule: null,
    });
    expect(todo.id).toBeTypeOf('number');
    expect(todo.completed).toBe(false);
    expect(todo.is_recurring).toBe(false);
    expect(todo.created_at).toBeTypeOf('string');
    expect(todo.completed_at).toBeNull();
  });

  it('getTodosByUser only returns todos for that user', () => {
    const other = createUser(db, { name: 'Bob', type: 'child', icon: '', display_order: 1 }).id;
    createTodo(db, {
      user_id: userId,
      title: 'A',
      completed: false,
      position: 0,
      is_recurring: false,
      recurrence_rule: null,
    });
    createTodo(db, {
      user_id: other,
      title: 'B',
      completed: false,
      position: 0,
      is_recurring: false,
      recurrence_rule: null,
    });
    expect(getTodosByUser(db, userId)).toHaveLength(1);
    expect(getTodosByUser(db, other)).toHaveLength(1);
  });

  it('getTodoById returns undefined for missing id', () => {
    expect(getTodoById(db, 999)).toBeUndefined();
  });

  it('updateTodo modifies fields', () => {
    const todo = createTodo(db, {
      user_id: userId,
      title: 'Old',
      completed: false,
      position: 0,
      is_recurring: false,
      recurrence_rule: null,
    });
    const updated = updateTodo(db, todo.id, { title: 'New' });
    expect(updated?.title).toBe('New');
  });

  it('deleteTodo removes the todo', () => {
    const todo = createTodo(db, {
      user_id: userId,
      title: 'Delete me',
      completed: false,
      position: 0,
      is_recurring: false,
      recurrence_rule: null,
    });
    expect(deleteTodo(db, todo.id)).toBe(true);
    expect(getTodoById(db, todo.id)).toBeUndefined();
  });

  it('deleteTodo returns false for missing id', () => {
    expect(deleteTodo(db, 999)).toBe(false);
  });

  it('completeTodo sets completed=true and completed_at', () => {
    const todo = createTodo(db, {
      user_id: userId,
      title: 'T',
      completed: false,
      position: 0,
      is_recurring: false,
      recurrence_rule: null,
    });
    const done = completeTodo(db, todo.id, '2026-05-01T12:00:00Z');
    expect(done?.completed).toBe(true);
    expect(done?.completed_at).toBe('2026-05-01T12:00:00Z');
  });

  it('resetRecurringTodo clears completed and completed_at', () => {
    const todo = createTodo(db, {
      user_id: userId,
      title: 'T',
      completed: false,
      position: 0,
      is_recurring: true,
      recurrence_rule: 'daily',
    });
    completeTodo(db, todo.id, '2026-05-01T12:00:00Z');
    const reset = resetRecurringTodo(db, todo.id);
    expect(reset?.completed).toBe(false);
    expect(reset?.completed_at).toBeNull();
  });

  it('getRecurringTodos only returns is_recurring=true todos', () => {
    createTodo(db, {
      user_id: userId,
      title: 'Once',
      completed: false,
      position: 0,
      is_recurring: false,
      recurrence_rule: null,
    });
    createTodo(db, {
      user_id: userId,
      title: 'Daily',
      completed: false,
      position: 1,
      is_recurring: true,
      recurrence_rule: 'daily',
    });
    const recurring = getRecurringTodos(db, userId);
    expect(recurring).toHaveLength(1);
    expect(recurring[0].title).toBe('Daily');
  });

  it('reorderTodos updates position', () => {
    const a = createTodo(db, {
      user_id: userId,
      title: 'A',
      completed: false,
      position: 0,
      is_recurring: false,
      recurrence_rule: null,
    });
    const b = createTodo(db, {
      user_id: userId,
      title: 'B',
      completed: false,
      position: 1,
      is_recurring: false,
      recurrence_rule: null,
    });
    reorderTodos(db, userId, [b.id, a.id]);
    expect(getTodoById(db, b.id)?.position).toBe(0);
    expect(getTodoById(db, a.id)?.position).toBe(1);
  });

  it('enforces foreign key — rejects unknown user_id', () => {
    expect(() =>
      createTodo(db, {
        user_id: 9999,
        title: 'Orphan',
        completed: false,
        position: 0,
        is_recurring: false,
        recurrence_rule: null,
      }),
    ).toThrow();
  });
});
