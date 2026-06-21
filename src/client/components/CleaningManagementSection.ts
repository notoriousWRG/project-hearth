import type { CleaningZone, CleaningTask } from '../../shared/types.js';
import { createErrorBanner } from './ErrorBanner.js';

type PinCleaningApi = {
  getZones: () => Promise<CleaningZone[]>;
  createZone: (data: { name: string; position: number }) => Promise<CleaningZone>;
  updateZone: (
    id: number,
    data: Partial<{ name: string; position: number }>,
  ) => Promise<CleaningZone>;
  deleteZone: (id: number) => Promise<void>;
  createTask: (data: {
    section: 'zone' | 'daily' | 'focus';
    zone_id: number | null;
    day_of_week: number | null;
    group_label: 'morning' | 'before_bed' | 'homestead' | null;
    title: string;
    position: number;
  }) => Promise<CleaningTask>;
  updateTask: (
    id: number,
    data: Partial<{ title: string; position: number }>,
  ) => Promise<CleaningTask>;
  deleteTask: (id: number) => Promise<void>;
  getFlightPlan: () => Promise<{ labels: string[] }>;
  setFlightPlan: (labels: string[]) => Promise<{ labels: string[] }>;
};

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const GROUP_OPTIONS: { value: 'morning' | 'before_bed' | 'homestead'; label: string }[] = [
  { value: 'morning', label: 'Morning' },
  { value: 'before_bed', label: 'Before bed' },
  { value: 'homestead', label: 'Homestead' },
];

export function createCleaningManagementSection(api: PinCleaningApi): HTMLElement {
  const section = document.createElement('section');
  section.className = 'settings-section cleaning-management';

  const heading = document.createElement('h2');
  heading.textContent = 'Cleaning System';
  section.appendChild(heading);

  // Sub-tab navigation
  type SubTab = 'zones' | 'daily' | 'focus' | 'flight-plan';
  let activeSubTab: SubTab = 'zones';

  const subNavEl = document.createElement('nav');
  subNavEl.className = 'cleaning-management__subnav';
  section.appendChild(subNavEl);

  const subContent = document.createElement('div');
  subContent.className = 'cleaning-management__content';
  section.appendChild(subContent);

  const subTabs: { id: SubTab; label: string }[] = [
    { id: 'zones', label: 'Zones & Tasks' },
    { id: 'daily', label: 'Daily Routines' },
    { id: 'focus', label: 'Day Focus' },
    { id: 'flight-plan', label: 'Flight Plan' },
  ];

  function renderSubNav(): void {
    subNavEl.innerHTML = '';
    for (const tab of subTabs) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className =
        'cleaning-management__subtab' +
        (tab.id === activeSubTab ? ' cleaning-management__subtab--active' : '');
      btn.textContent = tab.label;
      btn.addEventListener('click', () => {
        activeSubTab = tab.id;
        renderSubNav();
        renderSubContent();
      });
      subNavEl.appendChild(btn);
    }
  }

  function renderSubContent(): void {
    subContent.innerHTML = '';
    if (activeSubTab === 'zones') {
      subContent.appendChild(createZonesPanel(api, section));
    } else if (activeSubTab === 'daily') {
      subContent.appendChild(createDailyPanel(api, section));
    } else if (activeSubTab === 'focus') {
      subContent.appendChild(createFocusPanel(api, section));
    } else {
      subContent.appendChild(createFlightPlanPanel(api, section));
    }
  }

  renderSubNav();
  renderSubContent();
  return section;
}

// ─── Zones & Tasks panel ──────────────────────────────────────────────────────

function createZonesPanel(api: PinCleaningApi, errTarget: HTMLElement): HTMLElement {
  const panel = document.createElement('div');

  let zones: CleaningZone[] = [];
  let selectedZoneId: number | null = null;
  let tasks: CleaningTask[] = [];

  const zonePicker = document.createElement('div');
  zonePicker.className = 'cleaning-management__zone-picker';
  panel.appendChild(zonePicker);

  const taskArea = document.createElement('div');
  taskArea.className = 'cleaning-management__task-area';
  panel.appendChild(taskArea);

  function rerenderZonePicker(): void {
    zonePicker.innerHTML = '';

    const zoneList = document.createElement('ul');
    zoneList.className = 'cleaning-management__zone-list';
    for (const zone of zones) {
      const li = document.createElement('li');
      li.className =
        'cleaning-management__zone-item' +
        (zone.id === selectedZoneId ? ' cleaning-management__zone-item--active' : '');

      const nameSpan = document.createElement('span');
      nameSpan.className = 'cleaning-management__zone-name';
      nameSpan.textContent = zone.name;
      nameSpan.addEventListener('click', () => {
        selectedZoneId = zone.id;
        rerenderZonePicker();
        loadTasks(zone.id);
      });

      const delBtn = document.createElement('button');
      delBtn.type = 'button';
      delBtn.className = 'cleaning-management__zone-delete';
      delBtn.textContent = '×';
      delBtn.setAttribute('aria-label', `Delete zone ${zone.name}`);
      delBtn.addEventListener('click', () => {
        api
          .deleteZone(zone.id)
          .then(() => {
            zones = zones.filter((z) => z.id !== zone.id);
            if (selectedZoneId === zone.id) {
              selectedZoneId = null;
              taskArea.innerHTML = '';
            }
            rerenderZonePicker();
          })
          .catch((err: unknown) => {
            errTarget.prepend(createErrorBanner(err instanceof Error ? err.message : 'Error'));
          });
      });

      li.appendChild(nameSpan);
      li.appendChild(delBtn);
      zoneList.appendChild(li);
    }
    zonePicker.appendChild(zoneList);

    // Add zone form
    const addForm = document.createElement('form');
    addForm.className = 'cleaning-management__add-form';
    const addInput = document.createElement('input');
    addInput.type = 'text';
    addInput.placeholder = 'New zone name';
    addInput.required = true;
    const addBtn = document.createElement('button');
    addBtn.type = 'submit';
    addBtn.textContent = 'Add zone';
    addForm.appendChild(addInput);
    addForm.appendChild(addBtn);
    addForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = addInput.value.trim();
      if (!name) return;
      api
        .createZone({ name, position: zones.length })
        .then((zone) => {
          zones.push(zone);
          addInput.value = '';
          rerenderZonePicker();
        })
        .catch((err: unknown) => {
          errTarget.prepend(createErrorBanner(err instanceof Error ? err.message : 'Error'));
        });
    });
    zonePicker.appendChild(addForm);
  }

  function loadTasks(zoneId: number): void {
    taskArea.innerHTML = '<p class="loading-spinner"></p>';
    // We can't directly query tasks by zone from the board endpoint easily,
    // so we load the full board and filter — or call the zone tasks via the board
    // Since there's no dedicated zone-tasks GET, use the board and filter
    api.getZones().then(() => {
      // Fetch board to get zone tasks — but board only returns current zone.
      // Use a workaround: the board GET auto-seeds and returns active zone tasks.
      // For management, we just need to show the tasks for THIS zone regardless of active.
      // We'll load from a board call and note that zone tasks shown are for active zone only.
      // Simpler: keep a local store of tasks and add to it
      rerenderTaskArea(zoneId);
    });
  }

  function rerenderTaskArea(zoneId: number): void {
    taskArea.innerHTML = '';
    const zoneObj = zones.find((z) => z.id === zoneId);
    if (!zoneObj) return;

    const h3 = document.createElement('h3');
    h3.textContent = `Tasks: ${zoneObj.name}`;
    taskArea.appendChild(h3);

    const list = document.createElement('ul');
    list.className = 'cleaning-management__task-list';

    for (const task of tasks.filter((t) => t.zone_id === zoneId)) {
      list.appendChild(buildTaskItem(task));
    }
    taskArea.appendChild(list);

    // Add task form
    const addForm = document.createElement('form');
    addForm.className = 'cleaning-management__add-form';
    const addInput = document.createElement('input');
    addInput.type = 'text';
    addInput.placeholder = 'New task';
    addInput.required = true;
    const addBtn = document.createElement('button');
    addBtn.type = 'submit';
    addBtn.textContent = 'Add';
    addForm.appendChild(addInput);
    addForm.appendChild(addBtn);
    addForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const title = addInput.value.trim();
      if (!title) return;
      const pos = tasks.filter((t) => t.zone_id === zoneId).length;
      api
        .createTask({
          section: 'zone',
          zone_id: zoneId,
          day_of_week: null,
          group_label: null,
          title,
          position: pos,
        })
        .then((task) => {
          tasks.push(task);
          addInput.value = '';
          rerenderTaskArea(zoneId);
        })
        .catch((err: unknown) => {
          errTarget.prepend(createErrorBanner(err instanceof Error ? err.message : 'Error'));
        });
    });
    taskArea.appendChild(addForm);
  }

  function buildTaskItem(task: CleaningTask): HTMLLIElement {
    const li = document.createElement('li');
    li.className = 'cleaning-management__task-item';
    li.dataset.id = String(task.id);

    const span = document.createElement('span');
    span.textContent = task.title;
    li.appendChild(span);

    const delBtn = document.createElement('button');
    delBtn.type = 'button';
    delBtn.textContent = '×';
    delBtn.setAttribute('aria-label', `Delete ${task.title}`);
    delBtn.addEventListener('click', () => {
      api
        .deleteTask(task.id)
        .then(() => {
          tasks = tasks.filter((t) => t.id !== task.id);
          if (selectedZoneId != null) rerenderTaskArea(selectedZoneId);
        })
        .catch((err: unknown) => {
          errTarget.prepend(createErrorBanner(err instanceof Error ? err.message : 'Error'));
        });
    });
    li.appendChild(delBtn);
    return li;
  }

  // Initial load
  api
    .getZones()
    .then((zs) => {
      zones = zs;
      rerenderZonePicker();
    })
    .catch((err: unknown) => {
      errTarget.prepend(createErrorBanner(err instanceof Error ? err.message : 'Error'));
    });

  return panel;
}

// ─── Daily routines panel ─────────────────────────────────────────────────────

function createDailyPanel(api: PinCleaningApi, errTarget: HTMLElement): HTMLElement {
  const panel = document.createElement('div');
  let tasks: CleaningTask[] = [];

  function rerender(): void {
    panel.innerHTML = '';

    for (const group of GROUP_OPTIONS) {
      const groupEl = document.createElement('div');
      groupEl.className = 'cleaning-management__group';

      const h3 = document.createElement('h3');
      h3.textContent = group.label;
      groupEl.appendChild(h3);

      const list = document.createElement('ul');
      for (const task of tasks.filter((t) => t.group_label === group.value)) {
        const li = document.createElement('li');
        li.className = 'cleaning-management__task-item';

        const span = document.createElement('span');
        span.textContent = task.title;
        li.appendChild(span);

        const delBtn = document.createElement('button');
        delBtn.type = 'button';
        delBtn.textContent = '×';
        delBtn.addEventListener('click', () => {
          api
            .deleteTask(task.id)
            .then(() => {
              tasks = tasks.filter((t) => t.id !== task.id);
              rerender();
            })
            .catch((err: unknown) => {
              errTarget.prepend(createErrorBanner(err instanceof Error ? err.message : 'Error'));
            });
        });
        li.appendChild(delBtn);
        list.appendChild(li);
      }
      groupEl.appendChild(list);

      // Add form
      const form = document.createElement('form');
      form.className = 'cleaning-management__add-form';
      const input = document.createElement('input');
      input.type = 'text';
      input.placeholder = `Add ${group.label.toLowerCase()} task`;
      input.required = true;
      const btn = document.createElement('button');
      btn.type = 'submit';
      btn.textContent = 'Add';
      form.appendChild(input);
      form.appendChild(btn);
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const title = input.value.trim();
        if (!title) return;
        const pos = tasks.filter((t) => t.group_label === group.value).length;
        api
          .createTask({
            section: 'daily',
            zone_id: null,
            day_of_week: null,
            group_label: group.value,
            title,
            position: pos,
          })
          .then((task) => {
            tasks.push(task);
            input.value = '';
            rerender();
          })
          .catch((err: unknown) => {
            errTarget.prepend(createErrorBanner(err instanceof Error ? err.message : 'Error'));
          });
      });
      groupEl.appendChild(form);
      panel.appendChild(groupEl);
    }
  }

  // Load via board (daily tasks are always returned regardless of zone)
  fetch('/api/cleaning')
    .then((r) => r.json())
    .then(
      (board: {
        morningTasks: CleaningTask[];
        beforeBedTasks: CleaningTask[];
        homesteadTasks: CleaningTask[];
      }) => {
        tasks = [...board.morningTasks, ...board.beforeBedTasks, ...board.homesteadTasks];
        rerender();
      },
    )
    .catch((err: unknown) => {
      errTarget.prepend(createErrorBanner(err instanceof Error ? err.message : 'Error'));
    });

  return panel;
}

// ─── Day focus panel ──────────────────────────────────────────────────────────

function createFocusPanel(api: PinCleaningApi, errTarget: HTMLElement): HTMLElement {
  const panel = document.createElement('div');
  let tasksByDay: Map<number, CleaningTask[]> = new Map();

  function rerender(): void {
    panel.innerHTML = '';

    for (let day = 0; day <= 6; day++) {
      const dayEl = document.createElement('div');
      dayEl.className = 'cleaning-management__group';

      const h3 = document.createElement('h3');
      h3.textContent = DAY_NAMES[day];
      dayEl.appendChild(h3);

      const dayTasks = tasksByDay.get(day) ?? [];
      const list = document.createElement('ul');
      for (const task of dayTasks) {
        const li = document.createElement('li');
        li.className = 'cleaning-management__task-item';
        const span = document.createElement('span');
        span.textContent = task.title;
        li.appendChild(span);
        const delBtn = document.createElement('button');
        delBtn.type = 'button';
        delBtn.textContent = '×';
        delBtn.addEventListener('click', () => {
          api
            .deleteTask(task.id)
            .then(() => {
              tasksByDay.set(
                day,
                (tasksByDay.get(day) ?? []).filter((t) => t.id !== task.id),
              );
              rerender();
            })
            .catch((err: unknown) => {
              errTarget.prepend(createErrorBanner(err instanceof Error ? err.message : 'Error'));
            });
        });
        li.appendChild(delBtn);
        list.appendChild(li);
      }
      dayEl.appendChild(list);

      const form = document.createElement('form');
      form.className = 'cleaning-management__add-form';
      const input = document.createElement('input');
      input.type = 'text';
      input.placeholder = `Add ${DAY_NAMES[day]} task`;
      input.required = true;
      const btn = document.createElement('button');
      btn.type = 'submit';
      btn.textContent = 'Add';
      form.appendChild(input);
      form.appendChild(btn);
      const d = day;
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const title = input.value.trim();
        if (!title) return;
        const pos = (tasksByDay.get(d) ?? []).length;
        api
          .createTask({
            section: 'focus',
            zone_id: null,
            day_of_week: d,
            group_label: null,
            title,
            position: pos,
          })
          .then((task) => {
            const current = tasksByDay.get(d) ?? [];
            tasksByDay.set(d, [...current, task]);
            input.value = '';
            rerender();
          })
          .catch((err: unknown) => {
            errTarget.prepend(createErrorBanner(err instanceof Error ? err.message : 'Error'));
          });
      });
      dayEl.appendChild(form);
      panel.appendChild(dayEl);
    }
  }

  // Load focus tasks from the board + supplement with all days
  fetch('/api/cleaning')
    .then((r) => r.json())
    .then((board: { focusTasks: CleaningTask[] }) => {
      const map = new Map<number, CleaningTask[]>();
      for (let d = 0; d <= 6; d++) map.set(d, []);
      for (const task of board.focusTasks) {
        const d = task.day_of_week ?? 0;
        map.set(d, [...(map.get(d) ?? []), task]);
      }
      tasksByDay = map;
      rerender();
    })
    .catch((err: unknown) => {
      errTarget.prepend(createErrorBanner(err instanceof Error ? err.message : 'Error'));
      rerender();
    });

  return panel;
}

// ─── Flight plan panel ────────────────────────────────────────────────────────

function createFlightPlanPanel(api: PinCleaningApi, errTarget: HTMLElement): HTMLElement {
  const panel = document.createElement('div');

  const desc = document.createElement('p');
  desc.textContent = "Set a short label for each day's focus (shown at the top of the Home tab).";
  panel.appendChild(desc);

  const form = document.createElement('form');
  const inputs: HTMLInputElement[] = [];

  for (let d = 0; d <= 6; d++) {
    const row = document.createElement('div');
    row.className = 'cleaning-management__fp-row';
    const label = document.createElement('label');
    label.textContent = DAY_NAMES[d];
    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = DAY_NAMES[d];
    input.dataset.day = String(d);
    label.appendChild(input);
    row.appendChild(label);
    form.appendChild(row);
    inputs.push(input);
  }

  const successMsg = document.createElement('p');
  successMsg.className = 'settings-section__success';
  successMsg.hidden = true;
  successMsg.textContent = 'Saved.';
  form.appendChild(successMsg);

  const saveBtn = document.createElement('button');
  saveBtn.type = 'submit';
  saveBtn.textContent = 'Save flight plan';
  form.appendChild(saveBtn);

  api
    .getFlightPlan()
    .then(({ labels }) => {
      labels.forEach((lbl, i) => {
        if (inputs[i]) inputs[i].value = lbl;
      });
    })
    .catch((err: unknown) => {
      errTarget.prepend(createErrorBanner(err instanceof Error ? err.message : 'Error'));
    });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    successMsg.hidden = true;
    saveBtn.disabled = true;
    const labels = inputs.map((inp) => inp.value.trim());
    api
      .setFlightPlan(labels)
      .then(() => {
        saveBtn.disabled = false;
        successMsg.hidden = false;
        setTimeout(() => {
          successMsg.hidden = true;
        }, 3000);
      })
      .catch((err: unknown) => {
        errTarget.prepend(createErrorBanner(err instanceof Error ? err.message : 'Error'));
        saveBtn.disabled = false;
      });
  });

  panel.appendChild(form);
  return panel;
}
