import type { MealPlanEntry, MealType, DayOfWeek, NewMealPlanEntry } from '../../shared/types.js';

interface MealApi {
  list: (weekStartDate: string) => Promise<MealPlanEntry[]>;
  upsert: (data: NewMealPlanEntry) => Promise<MealPlanEntry>;
  remove: (id: number) => Promise<void>;
  generateGrocery: (weekStartDate: string) => Promise<unknown[]>;
}

// Day order for display: Mon=1 … Sat=6, Sun=0
const DAY_ORDER: DayOfWeek[] = [1, 2, 3, 4, 5, 6, 0];
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MEAL_ORDER: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];
const MEAL_LABELS: Record<MealType, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snack',
};

// Returns ISO YYYY-MM-DD for the Monday of the given date
function getWeekStart(date: Date = new Date()): string {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = d.getDay(); // 0=Sun
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return toISODate(d);
}

function addWeeks(isoDate: string, n: number): string {
  const [y, m, day] = isoDate.split('-').map(Number);
  const d = new Date(y, m - 1, day + n * 7);
  return toISODate(d);
}

// Returns Date objects for Mon–Sun of the given week (weekStart = Monday ISO)
function getWeekDays(weekStart: string): Date[] {
  const [y, m, d] = weekStart.split('-').map(Number);
  return Array.from({ length: 7 }, (_, i) => new Date(y, m - 1, d + i));
}

function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatWeekLabel(weekStart: string): string {
  const [y, m, d] = weekStart.split('-').map(Number);
  const monday = new Date(y, m - 1, d);
  const sunday = new Date(y, m - 1, d + 6);
  const fmt = (date: Date) => date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return `${fmt(monday)} – ${fmt(sunday)}`;
}

type MealMap = Map<DayOfWeek, Map<MealType, MealPlanEntry>>;

function buildMealMap(entries: MealPlanEntry[]): MealMap {
  const map: MealMap = new Map();
  for (const dow of DAY_ORDER) map.set(dow, new Map());
  for (const entry of entries) {
    map.get(entry.day_of_week)?.set(entry.meal_type, entry);
  }
  return map;
}

export function createMealPlanGrid(api: MealApi): HTMLElement {
  const section = document.createElement('section');
  section.className = 'meal-plan';

  let currentWeek = getWeekStart();
  let mealMap: MealMap = buildMealMap([]);
  let editingSlot: { day: DayOfWeek; type: MealType } | null = null;

  // Toolbar
  const toolbar = document.createElement('div');
  toolbar.className = 'meal-plan__toolbar';

  const prevBtn = document.createElement('button');
  prevBtn.dataset.action = 'prev';
  prevBtn.textContent = '‹ Prev';

  const weekLabel = document.createElement('h2');
  weekLabel.className = 'meal-plan__week-label';

  const nextBtn = document.createElement('button');
  nextBtn.dataset.action = 'next';
  nextBtn.textContent = 'Next ›';

  const generateBtn = document.createElement('button');
  generateBtn.dataset.action = 'generate';
  generateBtn.textContent = 'Generate grocery list';

  const feedback = document.createElement('span');
  feedback.className = 'meal-plan__feedback';

  toolbar.appendChild(prevBtn);
  toolbar.appendChild(weekLabel);
  toolbar.appendChild(nextBtn);
  toolbar.appendChild(generateBtn);
  toolbar.appendChild(feedback);
  section.appendChild(toolbar);

  // Grid
  const grid = document.createElement('div');
  grid.className = 'meal-plan__grid';
  section.appendChild(grid);

  function showFeedback(msg: string) {
    feedback.textContent = msg;
    setTimeout(() => {
      feedback.textContent = '';
    }, 2500);
  }

  function renderGrid() {
    grid.innerHTML = '';
    weekLabel.textContent = formatWeekLabel(currentWeek);
    const weekDays = getWeekDays(currentWeek);
    const today = toISODate(new Date());

    // weekDays[0] = Monday, [1] = Tuesday, ..., [6] = Sunday
    // DAY_ORDER = [1,2,3,4,5,6,0] — offset from Monday: dow===0 means Sunday = index 6
    for (const dow of DAY_ORDER) {
      const dayOffset = dow === 0 ? 6 : dow - 1;
      const dayDate = weekDays[dayOffset];
      const dayIso = toISODate(dayDate);
      const isToday = dayIso === today;

      const col = document.createElement('div');
      col.className = `meal-day${isToday ? ' meal-day--today' : ''}`;

      const header = document.createElement('div');
      header.className = 'meal-day__header';

      const dayName = document.createElement('span');
      dayName.className = 'meal-day__name';
      dayName.textContent = DAY_NAMES[dow];

      const dayNum = document.createElement('span');
      dayNum.className = 'meal-day__date';
      dayNum.textContent = dayDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

      header.appendChild(dayName);
      header.appendChild(dayNum);
      col.appendChild(header);

      for (const mealType of MEAL_ORDER) {
        const entry = mealMap.get(dow)?.get(mealType);
        col.appendChild(renderSlot(dow, mealType, entry));
      }

      grid.appendChild(col);
    }
  }

  function renderSlot(
    dow: DayOfWeek,
    mealType: MealType,
    entry: MealPlanEntry | undefined,
  ): HTMLElement {
    const isEmpty = !entry?.description;
    const isEditing = editingSlot?.day === dow && editingSlot?.type === mealType;

    const slot = document.createElement('div');
    slot.className = `meal-slot${isEmpty && !isEditing ? ' meal-slot--empty' : ''}`;
    slot.dataset.day = String(dow);
    slot.dataset.type = mealType;

    const label = document.createElement('span');
    label.className = 'meal-slot__label';
    label.textContent = MEAL_LABELS[mealType];
    slot.appendChild(label);

    if (isEditing) {
      const input = document.createElement('input');
      input.className = 'meal-slot__input';
      input.type = 'text';
      input.value = entry?.description ?? '';
      input.placeholder = 'Add meal…';
      slot.appendChild(input);

      // Focus after paint
      requestAnimationFrame(() => input.focus());

      const save = async () => {
        const description = input.value.trim();
        editingSlot = null;

        if (description === (entry?.description ?? '')) {
          renderGrid();
          return;
        }

        try {
          if (!description && entry) {
            await api.remove(entry.id);
            mealMap.get(dow)?.delete(mealType);
          } else if (description) {
            const saved = await api.upsert({
              week_start_date: currentWeek,
              day_of_week: dow,
              meal_type: mealType,
              description,
            });
            mealMap.get(dow)?.set(mealType, saved);
          }
        } catch {
          // silently restore on error
        }
        renderGrid();
      };

      input.addEventListener('blur', save);
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          void save();
        }
        if (e.key === 'Escape') {
          editingSlot = null;
          renderGrid();
        }
      });
    } else {
      const text = document.createElement('span');
      text.className = `meal-slot__text${isEmpty ? ' meal-slot__placeholder' : ''}`;
      text.textContent = isEmpty ? '+ Add' : (entry?.description ?? '');
      slot.appendChild(text);

      slot.addEventListener('click', () => {
        editingSlot = { day: dow, type: mealType };
        renderGrid();
      });
    }

    return slot;
  }

  async function loadWeek() {
    const entries = await api.list(currentWeek);
    mealMap = buildMealMap(entries);
    renderGrid();
  }

  prevBtn.addEventListener('click', () => {
    editingSlot = null;
    currentWeek = addWeeks(currentWeek, -1);
    void loadWeek();
  });

  nextBtn.addEventListener('click', () => {
    editingSlot = null;
    currentWeek = addWeeks(currentWeek, 1);
    void loadWeek();
  });

  generateBtn.addEventListener('click', async () => {
    const created = await api.generateGrocery(currentWeek);
    showFeedback(
      created.length > 0
        ? `Added ${created.length} item${created.length !== 1 ? 's' : ''}`
        : 'Already up to date',
    );
  });

  void loadWeek();
  return section;
}
