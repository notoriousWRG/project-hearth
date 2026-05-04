import type { Todo, NewTodo } from '../../shared/types.js';
import { createErrorBanner } from './ErrorBanner.js';

interface TodoApi {
  list: (userId: number) => Promise<Todo[]>;
  create: (data: Pick<NewTodo, 'user_id' | 'title'>) => Promise<Todo>;
  complete: (id: number) => Promise<Todo>;
  remove: (id: number) => Promise<void>;
  update: (id: number, data: Partial<Todo>) => Promise<Todo>;
}

function renderTodoItem(todo: Todo, onComplete: () => void, onDelete: () => void): HTMLLIElement {
  const li = document.createElement('li');
  li.className = `todo-item${todo.completed ? ' todo-item--completed' : ''}${todo.is_recurring ? ' todo-item--recurring' : ''}`;
  li.dataset.id = String(todo.id);

  const completeBtn = document.createElement('button');
  completeBtn.dataset.action = 'complete';
  completeBtn.textContent = todo.completed ? '✓' : '○';
  completeBtn.disabled = todo.completed;
  completeBtn.setAttribute(
    'aria-label',
    todo.completed ? `${todo.title} — completed` : `Mark "${todo.title}" complete`,
  );
  completeBtn.addEventListener('click', onComplete);

  const titleSpan = document.createElement('span');
  titleSpan.className = 'todo-item__title';
  titleSpan.textContent = todo.title;

  const deleteBtn = document.createElement('button');
  deleteBtn.dataset.action = 'delete';
  deleteBtn.textContent = '×';
  deleteBtn.setAttribute('aria-label', `Delete "${todo.title}"`);
  deleteBtn.addEventListener('click', onDelete);

  li.appendChild(completeBtn);
  li.appendChild(titleSpan);
  li.appendChild(deleteBtn);
  return li;
}

export function createTodoList(userId: number, api: TodoApi): HTMLElement {
  const section = document.createElement('section');
  section.className = 'todo-list';
  section.setAttribute('aria-label', 'To-Do list');

  const heading = document.createElement('h2');
  heading.textContent = 'To-Do';
  section.appendChild(heading);

  const form = document.createElement('form');
  const input = document.createElement('input');
  input.type = 'text';
  input.placeholder = 'Add a todo…';
  input.required = true;
  const addBtn = document.createElement('button');
  addBtn.type = 'submit';
  addBtn.textContent = 'Add';
  form.appendChild(input);
  form.appendChild(addBtn);
  section.appendChild(form);

  const list = document.createElement('ul');
  section.appendChild(list);

  const emptyMsg = document.createElement('p');
  emptyMsg.className = 'todo-list__empty';
  emptyMsg.textContent = 'No todos yet.';
  section.appendChild(emptyMsg);

  let todos: Todo[] = [];

  const spinner = document.createElement('div');
  spinner.className = 'loading-spinner';
  spinner.setAttribute('aria-label', 'Loading todos');
  section.appendChild(spinner);

  function rerender() {
    list.innerHTML = '';
    emptyMsg.style.display = todos.length === 0 ? '' : 'none';
    for (const todo of todos) {
      const li = renderTodoItem(
        todo,
        async () => {
          const updated = await api.complete(todo.id);
          todos = todos.map((t) => (t.id === updated.id ? updated : t));
          rerender();
        },
        async () => {
          await api.remove(todo.id);
          todos = todos.filter((t) => t.id !== todo.id);
          rerender();
        },
      );
      list.appendChild(li);
    }
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = input.value.trim();
    if (!title) return;
    try {
      const created = await api.create({ user_id: userId, title });
      todos = [...todos, created];
      input.value = '';
      rerender();
    } catch {
      section.insertBefore(
        createErrorBanner('Could not add todo. Please try again.'),
        section.firstChild,
      );
    }
  });

  api
    .list(userId)
    .then((fetched) => {
      todos = fetched;
      rerender();
    })
    .catch(() => {
      section.insertBefore(createErrorBanner('Could not load todos.'), section.firstChild);
    })
    .finally(() => {
      spinner.remove();
    });

  rerender();
  return section;
}
