import type { Chore, DayOfWeek, StreakRecord, User } from '../../shared/types.js';

interface ChoreManageApi {
  listAll: (userId: number) => Promise<Chore[]>;
  create: (data: Partial<Chore>) => Promise<Chore>;
  update: (id: number, data: Partial<Chore>) => Promise<Chore>;
  remove: (id: number) => Promise<void>;
  reorder: (userId: number, ids: number[]) => Promise<Chore[]>;
  uncomplete: (id: number) => Promise<Chore>;
}

function isActiveToday(chore: Chore): boolean {
  if (chore.recurrence_rule !== 'weekly') return true;
  const dow = new Date().getDay() as DayOfWeek;
  return chore.recurrence_days?.includes(dow) ?? false;
}

interface StreakApi {
  get: (userId: number) => Promise<StreakRecord>;
  reset: (userId: number) => Promise<StreakRecord>;
}

const DAY_LABELS: string[] = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function buildDayPicker(
  selectedDays: DayOfWeek[],
  onChange: (days: DayOfWeek[]) => void,
): HTMLElement {
  const wrap = document.createElement('div');
  wrap.className = 'chore-day-picker';

  DAY_LABELS.forEach((label, i) => {
    const day = i as DayOfWeek;
    const lbl = document.createElement('label');
    lbl.className = 'chore-day-picker__day';

    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.checked = selectedDays.includes(day);
    cb.setAttribute('aria-label', label);
    cb.addEventListener('change', () => {
      const current = DAY_LABELS.map((_, j) => {
        const sibling = wrap.querySelectorAll<HTMLInputElement>('input[type=checkbox]')[j];
        return sibling?.checked ? (j as DayOfWeek) : null;
      }).filter((d): d is DayOfWeek => d !== null);
      onChange(current);
    });

    const span = document.createElement('span');
    span.textContent = label;

    lbl.appendChild(cb);
    lbl.appendChild(span);
    wrap.appendChild(lbl);
  });

  return wrap;
}

export function createChoreManagementSection(
  childUsers: User[],
  api: ChoreManageApi,
  streakApi?: StreakApi,
): HTMLElement {
  const section = document.createElement('section');
  section.className = 'settings-section';

  const heading = document.createElement('h2');
  heading.textContent = 'Manage Chores';
  section.appendChild(heading);

  if (childUsers.length === 0) {
    const empty = document.createElement('p');
    empty.textContent = 'No children configured.';
    section.appendChild(empty);
    return section;
  }

  // Tab strip
  const tabStrip = document.createElement('div');
  tabStrip.className = 'settings-child-tabs';
  section.appendChild(tabStrip);

  const content = document.createElement('div');
  section.appendChild(content);

  let activeChildId = childUsers[0].id;
  let chores: Chore[] = [];
  let streak: StreakRecord | null = null;

  function renderTabs(): void {
    tabStrip.innerHTML = '';
    for (const child of childUsers) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.dataset.childId = String(child.id);
      btn.textContent = `${child.icon || '⭐'} ${child.name}`;
      btn.className =
        'settings-child-tab' + (child.id === activeChildId ? ' settings-child-tab--active' : '');
      btn.addEventListener('click', () => {
        activeChildId = child.id;
        renderTabs();
        loadChores();
      });
      tabStrip.appendChild(btn);
    }
  }

  function renderChoreRow(chore: Chore, index: number, active: boolean): HTMLLIElement {
    const li = document.createElement('li');
    li.className = 'chore-row' + (active ? '' : ' chore-row--inactive');
    li.dataset.choreId = String(chore.id);

    const iconInput = document.createElement('input');
    iconInput.type = 'text';
    iconInput.value = chore.icon || '';
    iconInput.maxLength = 2;
    iconInput.className = 'chore-row__icon';
    iconInput.setAttribute('aria-label', 'Icon');
    iconInput.addEventListener('blur', () => {
      void api.update(chore.id, { icon: iconInput.value });
    });

    const titleInput = document.createElement('input');
    titleInput.type = 'text';
    titleInput.value = chore.title;
    titleInput.className = 'chore-row__title';
    titleInput.setAttribute('aria-label', 'Title');
    titleInput.addEventListener('blur', () => {
      void api.update(chore.id, { title: titleInput.value });
    });

    // Frequency selector
    const freqSelect = document.createElement('select');
    freqSelect.className = 'chore-row__freq';
    freqSelect.setAttribute('aria-label', 'Frequency');
    const dailyOpt = document.createElement('option');
    dailyOpt.value = 'daily';
    dailyOpt.textContent = 'Daily';
    const weeklyOpt = document.createElement('option');
    weeklyOpt.value = 'weekly';
    weeklyOpt.textContent = 'Weekly';
    freqSelect.appendChild(dailyOpt);
    freqSelect.appendChild(weeklyOpt);
    freqSelect.value = chore.recurrence_rule === 'weekly' ? 'weekly' : 'daily';

    const upBtn = document.createElement('button');
    upBtn.type = 'button';
    upBtn.dataset.action = 'move-up';
    upBtn.textContent = '↑';
    upBtn.disabled = index === 0;
    upBtn.addEventListener('click', () => {
      const ids = chores.map((c) => c.id);
      const i = ids.indexOf(chore.id);
      if (i <= 0) return;
      [ids[i - 1], ids[i]] = [ids[i], ids[i - 1]];
      void api.reorder(activeChildId, ids).then(() => loadChores());
    });

    const downBtn = document.createElement('button');
    downBtn.type = 'button';
    downBtn.dataset.action = 'move-down';
    downBtn.textContent = '↓';
    downBtn.disabled = index === chores.length - 1;
    downBtn.addEventListener('click', () => {
      const ids = chores.map((c) => c.id);
      const i = ids.indexOf(chore.id);
      if (i >= ids.length - 1) return;
      [ids[i], ids[i + 1]] = [ids[i + 1], ids[i]];
      void api.reorder(activeChildId, ids).then(() => loadChores());
    });

    const delBtn = document.createElement('button');
    delBtn.type = 'button';
    delBtn.dataset.action = 'delete';
    delBtn.textContent = 'Delete';
    delBtn.addEventListener('click', () => {
      void api.remove(chore.id).then(() => loadChores());
    });

    // Controls row
    const controls = document.createElement('div');
    controls.className = 'chore-row__controls';
    controls.appendChild(iconInput);
    controls.appendChild(titleInput);
    controls.appendChild(freqSelect);

    if (active && chore.completed) {
      const undoBtn = document.createElement('button');
      undoBtn.type = 'button';
      undoBtn.dataset.action = 'uncomplete';
      undoBtn.textContent = '✓ Undo';
      undoBtn.addEventListener('click', () => {
        void api.uncomplete(chore.id).then(() => loadChores());
      });
      controls.appendChild(undoBtn);
    }

    controls.appendChild(upBtn);
    controls.appendChild(downBtn);
    controls.appendChild(delBtn);

    for (const target of childUsers.filter((c) => c.id !== activeChildId)) {
      const copyBtn = document.createElement('button');
      copyBtn.type = 'button';
      copyBtn.dataset.action = 'copy-to';
      copyBtn.dataset.targetId = String(target.id);
      copyBtn.textContent = `→ ${target.icon || '⭐'} ${target.name}`;
      copyBtn.addEventListener('click', () => {
        copyBtn.disabled = true;
        void api.listAll(target.id).then((targetChores) => {
          const currentTitle = titleInput.value.trim().toLowerCase();
          const duplicate = targetChores.some((c) => c.title.trim().toLowerCase() === currentTitle);
          if (duplicate) {
            copyBtn.textContent = 'Already there';
            setTimeout(() => {
              copyBtn.textContent = `→ ${target.icon || '⭐'} ${target.name}`;
              copyBtn.disabled = false;
            }, 2000);
            return;
          }
          void api
            .create({
              user_id: target.id,
              title: titleInput.value.trim(),
              icon: iconInput.value,
              completed: false,
              is_recurring: chore.is_recurring,
              recurrence_rule: chore.recurrence_rule,
              recurrence_days: chore.recurrence_days,
              is_bonus: false,
              bonus_amount: null,
              position: targetChores.length,
            })
            .then(() => {
              copyBtn.textContent = '✓ Copied';
              setTimeout(() => {
                copyBtn.textContent = `→ ${target.icon || '⭐'} ${target.name}`;
                copyBtn.disabled = false;
              }, 2000);
            });
        });
      });
      controls.appendChild(copyBtn);
    }

    li.appendChild(controls);

    // Day picker — below controls, only when weekly
    let dayPickerEl: HTMLElement | null = null;

    function syncDayPicker(): void {
      if (dayPickerEl) dayPickerEl.remove();
      dayPickerEl = null;
      if (freqSelect.value === 'weekly') {
        dayPickerEl = buildDayPicker(chore.recurrence_days ?? [], (days) => {
          void api.update(chore.id, { recurrence_days: days });
        });
        li.appendChild(dayPickerEl);
      }
    }

    freqSelect.addEventListener('change', () => {
      const isWeekly = freqSelect.value === 'weekly';
      void api
        .update(chore.id, {
          recurrence_rule: isWeekly ? 'weekly' : 'daily',
          recurrence_days: isWeekly ? (chore.recurrence_days ?? []) : null,
        })
        .then(() => {
          chore = { ...chore, recurrence_rule: isWeekly ? 'weekly' : 'daily' };
          syncDayPicker();
        });
    });

    syncDayPicker();

    return li;
  }

  function renderContent(): void {
    content.innerHTML = '';

    // Streak display
    if (streakApi && streak) {
      const streakDiv = document.createElement('div');
      streakDiv.className = 'chore-streak-info';

      const streakText = document.createElement('span');
      streakText.textContent = `🔥 ${streak.current_streak} day streak · Best: ${streak.longest_streak}`;

      const resetBtn = document.createElement('button');
      resetBtn.type = 'button';
      resetBtn.dataset.action = 'reset-streak';
      resetBtn.textContent = 'Reset streak';
      resetBtn.addEventListener('click', () => {
        resetBtn.disabled = true;
        void streakApi.reset(activeChildId).then((updated) => {
          streak = updated;
          renderContent();
        });
      });

      streakDiv.appendChild(streakText);
      streakDiv.appendChild(resetBtn);
      content.appendChild(streakDiv);
    }

    // Add form
    const form = document.createElement('form');
    const iconInput = document.createElement('input');
    iconInput.type = 'text';
    iconInput.dataset.field = 'icon';
    iconInput.maxLength = 2;
    iconInput.placeholder = '🏡';
    iconInput.className = 'chore-row__icon';

    const titleInput = document.createElement('input');
    titleInput.type = 'text';
    titleInput.dataset.field = 'title';
    titleInput.placeholder = 'New chore…';
    titleInput.required = true;
    titleInput.className = 'chore-row__title';

    // Frequency selector for new chore
    const freqSelect = document.createElement('select');
    freqSelect.dataset.field = 'frequency';
    freqSelect.className = 'chore-row__freq';
    freqSelect.setAttribute('aria-label', 'Frequency');
    const dailyOpt = document.createElement('option');
    dailyOpt.value = 'daily';
    dailyOpt.textContent = 'Daily';
    const weeklyOpt = document.createElement('option');
    weeklyOpt.value = 'weekly';
    weeklyOpt.textContent = 'Weekly';
    freqSelect.appendChild(dailyOpt);
    freqSelect.appendChild(weeklyOpt);

    const addBtn = document.createElement('button');
    addBtn.type = 'submit';
    addBtn.textContent = 'Add';

    // Controls row for the add form
    const formControls = document.createElement('div');
    formControls.className = 'chore-row__controls';
    formControls.appendChild(iconInput);
    formControls.appendChild(titleInput);
    formControls.appendChild(freqSelect);
    formControls.appendChild(addBtn);
    form.appendChild(formControls);

    // Day picker for new chore — below the controls row
    let newChoreDays: DayOfWeek[] = [];
    let newDayPickerEl: HTMLElement | null = null;

    function syncNewDayPicker(): void {
      if (newDayPickerEl) newDayPickerEl.remove();
      newDayPickerEl = null;
      if (freqSelect.value === 'weekly') {
        newDayPickerEl = buildDayPicker(newChoreDays, (days) => {
          newChoreDays = days;
        });
        form.appendChild(newDayPickerEl);
      }
    }

    freqSelect.addEventListener('change', () => {
      newChoreDays = [];
      syncNewDayPicker();
    });

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const title = titleInput.value.trim();
      if (!title) return;
      const isWeekly = freqSelect.value === 'weekly';
      void api
        .create({
          user_id: activeChildId,
          title,
          icon: iconInput.value.trim(),
          completed: false,
          is_recurring: true,
          recurrence_rule: isWeekly ? 'weekly' : 'daily',
          recurrence_days: isWeekly ? newChoreDays : null,
          is_bonus: false,
          bonus_amount: null,
          position: chores.length,
        })
        .then(() => {
          titleInput.value = '';
          iconInput.value = '';
          freqSelect.value = 'daily';
          newChoreDays = [];
          syncNewDayPicker();
          loadChores();
        });
    });
    content.appendChild(form);

    // Chore list — split active (today) and inactive (off-day weekly)
    if (chores.length === 0) {
      const empty = document.createElement('p');
      empty.textContent = 'No chores yet.';
      content.appendChild(empty);
    } else {
      const active = chores.filter(isActiveToday);
      const inactive = chores.filter((c) => !isActiveToday(c));

      const ul = document.createElement('ul');
      active.forEach((chore, index) => ul.appendChild(renderChoreRow(chore, index, true)));
      content.appendChild(ul);

      if (inactive.length > 0) {
        const heading = document.createElement('p');
        heading.className = 'chore-section-label';
        heading.textContent = 'Not scheduled today';
        content.appendChild(heading);

        const inactiveUl = document.createElement('ul');
        inactive.forEach((chore, index) =>
          inactiveUl.appendChild(renderChoreRow(chore, index, false)),
        );
        content.appendChild(inactiveUl);
      }
    }
  }

  function loadChores(): void {
    const choresFetch = api.listAll(activeChildId);
    const streakFetch = streakApi ? streakApi.get(activeChildId) : Promise.resolve(null);
    void Promise.all([choresFetch, streakFetch]).then(([fetchedChores, fetchedStreak]) => {
      chores = fetchedChores;
      streak = fetchedStreak;
      renderContent();
    });
  }

  renderTabs();
  loadChores();

  return section;
}
