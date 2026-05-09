import type { Meal, GroceryCategory, NewMealIngredient } from '../../shared/types.js';

export interface SavedMealsApi {
  list: () => Promise<Meal[]>;
  get: (id: number) => Promise<Meal>;
  create: (data: { name: string }) => Promise<Meal>;
  update: (id: number, data: { name: string; ingredients: NewMealIngredient[] }) => Promise<Meal>;
  remove: (id: number) => Promise<void>;
}

const CATEGORIES: GroceryCategory[] = [
  'produce',
  'protein',
  'pantry',
  'dairy',
  'household',
  'other',
];

export function createSavedMealsSection(api: SavedMealsApi): HTMLElement {
  const section = document.createElement('section');
  section.className = 'settings-section saved-meals-section';

  const heading = document.createElement('h2');
  heading.textContent = 'Saved Meals';
  section.appendChild(heading);

  const createForm = document.createElement('form');
  createForm.className = 'saved-meal-create';

  const createInput = document.createElement('input');
  createInput.type = 'text';
  createInput.placeholder = 'New meal name…';
  createInput.dataset.field = 'meal-name';
  createInput.required = true;

  const createBtn = document.createElement('button');
  createBtn.type = 'submit';
  createBtn.textContent = 'Create';

  createForm.appendChild(createInput);
  createForm.appendChild(createBtn);
  section.appendChild(createForm);

  const list = document.createElement('div');
  list.className = 'saved-meal-list';
  section.appendChild(list);

  let meals: Meal[] = [];
  let expandedId: number | null = null;
  let editState: { name: string; ingredients: NewMealIngredient[] } | null = null;

  function render(): void {
    list.innerHTML = '';
    if (meals.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'saved-meals-empty';
      empty.textContent = 'No saved meals yet.';
      list.appendChild(empty);
      return;
    }
    for (const meal of meals) {
      list.appendChild(buildRow(meal));
    }
  }

  function buildRow(meal: Meal): HTMLElement {
    const isExpanded = expandedId === meal.id;
    const row = document.createElement('div');
    row.className = 'saved-meal-row' + (isExpanded ? ' saved-meal-row--expanded' : '');
    row.dataset.mealId = String(meal.id);

    const header = document.createElement('div');
    header.className = 'saved-meal-row__header';

    const nameSpan = document.createElement('span');
    nameSpan.className = 'saved-meal-row__name';
    nameSpan.textContent = meal.name;

    const editBtn = document.createElement('button');
    editBtn.type = 'button';
    editBtn.dataset.action = 'edit';
    editBtn.textContent = isExpanded ? 'Close' : 'Edit';
    editBtn.addEventListener('click', () => {
      if (expandedId === meal.id) {
        expandedId = null;
        editState = null;
        render();
      } else {
        void openEditor(meal.id);
      }
    });

    header.appendChild(nameSpan);
    header.appendChild(editBtn);
    row.appendChild(header);

    if (isExpanded && editState) {
      row.appendChild(buildEditor(meal.id));
    }

    return row;
  }

  async function openEditor(id: number): Promise<void> {
    const full = await api.get(id);
    const mealIdx = meals.findIndex((m) => m.id === id);
    if (mealIdx !== -1) meals[mealIdx] = full;
    expandedId = id;
    editState = {
      name: full.name,
      ingredients: full.ingredients.map((i) => ({
        name: i.name,
        category: i.category,
        position: i.position,
      })),
    };
    render();
  }

  function buildEditor(mealId: number): HTMLElement {
    const editor = document.createElement('div');
    editor.className = 'saved-meal-row__editor';

    const nameLabel = document.createElement('label');
    nameLabel.className = 'editor-name-row';
    nameLabel.textContent = 'Name: ';
    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.value = editState!.name;
    nameInput.dataset.field = 'edit-name';
    nameInput.addEventListener('input', () => {
      editState!.name = nameInput.value;
    });
    nameLabel.appendChild(nameInput);
    editor.appendChild(nameLabel);

    const ingList = document.createElement('div');
    ingList.className = 'ingredient-list';
    editor.appendChild(ingList);

    function renderIngredients(): void {
      ingList.innerHTML = '';
      editState!.ingredients.forEach((ing, idx) => {
        ingList.appendChild(buildIngredientRow(ing, idx));
      });
    }

    function buildIngredientRow(ing: NewMealIngredient, idx: number): HTMLElement {
      const row = document.createElement('div');
      row.className = 'ingredient-row';

      const ingNameInput = document.createElement('input');
      ingNameInput.type = 'text';
      ingNameInput.value = ing.name;
      ingNameInput.placeholder = 'Ingredient name';
      ingNameInput.className = 'ingredient-row__name';
      ingNameInput.addEventListener('input', () => {
        editState!.ingredients[idx].name = ingNameInput.value;
      });

      const catSelect = document.createElement('select');
      catSelect.className = 'ingredient-row__category';
      for (const cat of CATEGORIES) {
        const opt = document.createElement('option');
        opt.value = cat;
        opt.textContent = cat;
        opt.selected = cat === ing.category;
        catSelect.appendChild(opt);
      }
      catSelect.addEventListener('change', () => {
        editState!.ingredients[idx].category = catSelect.value as GroceryCategory;
      });

      const reorderWrap = document.createElement('div');
      reorderWrap.className = 'ingredient-row__reorder';

      const upBtn = document.createElement('button');
      upBtn.type = 'button';
      upBtn.textContent = '↑';
      upBtn.setAttribute('aria-label', 'Move up');
      upBtn.disabled = idx === 0;
      upBtn.addEventListener('click', () => {
        const arr = editState!.ingredients;
        [arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]];
        renderIngredients();
      });

      const downBtn = document.createElement('button');
      downBtn.type = 'button';
      downBtn.textContent = '↓';
      downBtn.setAttribute('aria-label', 'Move down');
      downBtn.disabled = idx === editState!.ingredients.length - 1;
      downBtn.addEventListener('click', () => {
        const arr = editState!.ingredients;
        [arr[idx + 1], arr[idx]] = [arr[idx], arr[idx + 1]];
        renderIngredients();
      });

      reorderWrap.appendChild(upBtn);
      reorderWrap.appendChild(downBtn);

      const removeBtn = document.createElement('button');
      removeBtn.type = 'button';
      removeBtn.textContent = '✕';
      removeBtn.setAttribute('aria-label', 'Remove ingredient');
      removeBtn.className = 'ingredient-row__remove';
      removeBtn.addEventListener('click', () => {
        editState!.ingredients.splice(idx, 1);
        renderIngredients();
      });

      row.appendChild(ingNameInput);
      row.appendChild(catSelect);
      row.appendChild(reorderWrap);
      row.appendChild(removeBtn);
      return row;
    }

    renderIngredients();

    const addIngBtn = document.createElement('button');
    addIngBtn.type = 'button';
    addIngBtn.dataset.action = 'add-ingredient';
    addIngBtn.textContent = '+ Add ingredient';
    addIngBtn.className = 'saved-meal-add-ingredient';
    addIngBtn.addEventListener('click', () => {
      editState!.ingredients.push({
        name: '',
        category: 'other',
        position: editState!.ingredients.length,
      });
      renderIngredients();
    });
    editor.appendChild(addIngBtn);

    const actions = document.createElement('div');
    actions.className = 'saved-meal-actions';

    const saveBtn = document.createElement('button');
    saveBtn.type = 'button';
    saveBtn.dataset.action = 'save';
    saveBtn.textContent = 'Save';
    saveBtn.addEventListener('click', () => {
      const ingredients = editState!.ingredients.map((ing, i) => ({ ...ing, position: i }));
      saveBtn.disabled = true;
      void api
        .update(mealId, { name: editState!.name, ingredients })
        .then((updated) => {
          const idx = meals.findIndex((m) => m.id === mealId);
          if (idx !== -1) meals[idx] = updated;
          expandedId = null;
          editState = null;
          render();
        })
        .catch(() => {
          saveBtn.disabled = false;
        });
    });

    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.dataset.action = 'cancel';
    cancelBtn.textContent = 'Cancel';
    cancelBtn.addEventListener('click', () => {
      expandedId = null;
      editState = null;
      render();
    });

    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.dataset.action = 'delete';
    deleteBtn.className = 'saved-meal-delete';
    deleteBtn.textContent = 'Delete meal';
    deleteBtn.addEventListener('click', () => {
      if (!window.confirm(`Delete "${editState!.name}"?`)) return;
      deleteBtn.disabled = true;
      void api
        .remove(mealId)
        .then(() => {
          meals = meals.filter((m) => m.id !== mealId);
          expandedId = null;
          editState = null;
          render();
        })
        .catch(() => {
          deleteBtn.disabled = false;
        });
    });

    actions.appendChild(saveBtn);
    actions.appendChild(cancelBtn);
    actions.appendChild(deleteBtn);
    editor.appendChild(actions);

    return editor;
  }

  createForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = createInput.value.trim();
    if (!name) return;
    createBtn.disabled = true;
    void api
      .create({ name })
      .then((created) => {
        meals.push(created);
        meals.sort((a, b) => a.name.localeCompare(b.name));
        createInput.value = '';
        createBtn.disabled = false;
        render();
      })
      .catch(() => {
        createBtn.disabled = false;
      });
  });

  void api.list().then((loaded) => {
    meals = loaded;
    render();
  });

  return section;
}
