import type { CleaningBoard, CleaningTask } from '../../shared/types.js';
import { createErrorBanner } from './ErrorBanner.js';

interface CleaningApi {
  getBoard: () => Promise<CleaningBoard>;
  complete: (id: number) => Promise<CleaningTask>;
  uncomplete: (id: number) => Promise<CleaningTask>;
}

function renderTaskGroup(
  label: string,
  tasks: CleaningTask[],
  onToggle: (task: CleaningTask) => void,
  className: string,
): HTMLElement {
  const group = document.createElement('div');
  group.className = `cleaning-group ${className}`;

  const heading = document.createElement('h3');
  heading.className = 'cleaning-group__label';
  heading.textContent = label;
  group.appendChild(heading);

  if (tasks.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'cleaning-group__empty';
    empty.textContent = 'No tasks.';
    group.appendChild(empty);
    return group;
  }

  const list = document.createElement('ul');
  list.className = 'cleaning-group__list';

  for (const task of tasks) {
    const item = document.createElement('li');
    item.className = 'cleaning-task' + (task.completed ? ' cleaning-task--done' : '');
    item.dataset.id = String(task.id);

    const checkbox = document.createElement('button');
    checkbox.type = 'button';
    checkbox.className = 'cleaning-task__check';
    checkbox.setAttribute('aria-pressed', String(task.completed));
    checkbox.setAttribute(
      'aria-label',
      task.completed ? `Uncheck ${task.title}` : `Check ${task.title}`,
    );
    checkbox.textContent = task.completed ? '✓' : '';
    checkbox.addEventListener('click', () => onToggle(task));

    const title = document.createElement('span');
    title.className = 'cleaning-task__title';
    title.textContent = task.title;

    item.appendChild(checkbox);
    item.appendChild(title);
    list.appendChild(item);
  }

  group.appendChild(list);
  return group;
}

export function createCleaningBoard(api: CleaningApi): HTMLElement {
  const section = document.createElement('section');
  section.className = 'cleaning-board';
  section.setAttribute('aria-label', 'Home care');

  let board: CleaningBoard = {
    activeZone: null,
    todayFocus: '',
    zoneTasks: [],
    focusTasks: [],
    morningTasks: [],
    beforeBedTasks: [],
    homesteadTasks: [],
  };

  // Local task cache for optimistic updates
  let allTasks: CleaningTask[] = [];

  function rerender(): void {
    section.innerHTML = '';

    // Board header
    const header = document.createElement('div');
    header.className = 'cleaning-board__header';

    if (board.activeZone) {
      const zoneLabel = document.createElement('p');
      zoneLabel.className = 'cleaning-board__zone';
      zoneLabel.textContent = `This week: ${board.activeZone.name}`;
      header.appendChild(zoneLabel);
    }

    if (board.todayFocus) {
      const focusLabel = document.createElement('p');
      focusLabel.className = 'cleaning-board__focus';
      focusLabel.textContent = `Today: ${board.todayFocus}`;
      header.appendChild(focusLabel);
    }

    section.appendChild(header);

    function onToggle(task: CleaningTask): void {
      const action = task.completed ? api.uncomplete : api.complete;
      action(task.id)
        .then((updated) => {
          // Update in local cache
          allTasks = allTasks.map((t) => (t.id === updated.id ? updated : t));
          distributeToBoard();
          rerender();
        })
        .catch((err: unknown) => {
          section.prepend(createErrorBanner(err instanceof Error ? err.message : 'Error'));
        });
    }

    // Today's focus tasks
    if (board.focusTasks.length > 0) {
      section.appendChild(
        renderTaskGroup("Today's focus", board.focusTasks, onToggle, 'cleaning-group--focus'),
      );
    }

    // Morning routine
    section.appendChild(
      renderTaskGroup('Morning', board.morningTasks, onToggle, 'cleaning-group--morning'),
    );

    // Before bed
    section.appendChild(
      renderTaskGroup('Before bed', board.beforeBedTasks, onToggle, 'cleaning-group--bed'),
    );

    // Homestead
    section.appendChild(
      renderTaskGroup('Homestead', board.homesteadTasks, onToggle, 'cleaning-group--homestead'),
    );

    // Zone deep-clean
    if (board.activeZone) {
      section.appendChild(
        renderTaskGroup(
          `Deep clean: ${board.activeZone.name}`,
          board.zoneTasks,
          onToggle,
          'cleaning-group--zone',
        ),
      );
    }
  }

  function distributeToBoard(): void {
    board = {
      ...board,
      zoneTasks: allTasks.filter((t) => t.section === 'zone'),
      focusTasks: allTasks.filter((t) => t.section === 'focus'),
      morningTasks: allTasks.filter((t) => t.section === 'daily' && t.group_label === 'morning'),
      beforeBedTasks: allTasks.filter(
        (t) => t.section === 'daily' && t.group_label === 'before_bed',
      ),
      homesteadTasks: allTasks.filter(
        (t) => t.section === 'daily' && t.group_label === 'homestead',
      ),
    };
  }

  api
    .getBoard()
    .then((b) => {
      board = b;
      allTasks = [
        ...b.focusTasks,
        ...b.morningTasks,
        ...b.beforeBedTasks,
        ...b.homesteadTasks,
        ...b.zoneTasks,
      ];
      rerender();
    })
    .catch((err: unknown) => {
      section.prepend(createErrorBanner(err instanceof Error ? err.message : 'Error'));
    });

  rerender();
  return section;
}
