import type { PhoneBookEntry } from '../../shared/types.js';
import type { createPinPhoneBookApi } from '../utils/api.js';

type PhoneBookApi = ReturnType<typeof createPinPhoneBookApi>;

export function createPhoneBookManagementSection(phoneBookApi: PhoneBookApi): HTMLElement {
  const section = document.createElement('section');
  section.className = 'settings-section';

  const heading = document.createElement('h2');
  heading.textContent = 'Phone Book';
  section.appendChild(heading);

  const desc = document.createElement('p');
  desc.textContent =
    'Contacts shown on the Phone Book tab. Emoji helps younger kids identify who to call.';
  section.appendChild(desc);

  const listEl = document.createElement('div');
  listEl.className = 'phone-book-mgmt__list';
  section.appendChild(listEl);

  const formSection = document.createElement('div');
  formSection.className = 'phone-book-mgmt__form-section';
  section.appendChild(formSection);

  let entries: PhoneBookEntry[] = [];
  let editingId: number | null = null;

  function renderList(): void {
    listEl.innerHTML = '';
    if (entries.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'phone-book-mgmt__empty';
      empty.textContent = 'No contacts yet.';
      listEl.appendChild(empty);
      return;
    }
    for (const entry of entries) {
      const row = document.createElement('div');
      row.className = 'phone-book-mgmt__row';

      const label = document.createElement('span');
      label.className = 'phone-book-mgmt__row-label';
      label.textContent = [entry.emoji, entry.name, entry.phone].filter(Boolean).join(' — ');
      row.appendChild(label);

      const actions = document.createElement('div');
      actions.className = 'phone-book-mgmt__row-actions';

      const editBtn = document.createElement('button');
      editBtn.type = 'button';
      editBtn.textContent = 'Edit';
      editBtn.addEventListener('click', () => startEdit(entry));
      actions.appendChild(editBtn);

      const deleteBtn = document.createElement('button');
      deleteBtn.type = 'button';
      deleteBtn.textContent = 'Delete';
      deleteBtn.className = 'btn-danger';
      deleteBtn.addEventListener('click', () => {
        void phoneBookApi.remove(entry.id).then(load);
      });
      actions.appendChild(deleteBtn);

      row.appendChild(actions);
      listEl.appendChild(row);
    }
  }

  function renderForm(prefill?: PhoneBookEntry): void {
    formSection.innerHTML = '';

    const formHeading = document.createElement('h3');
    formHeading.textContent = editingId !== null ? 'Edit Contact' : 'Add Contact';
    formSection.appendChild(formHeading);

    const form = document.createElement('form');
    form.className = 'phone-book-mgmt__form';

    function makeField(labelText: string, placeholder: string, value = ''): HTMLInputElement {
      const row = document.createElement('div');
      row.className = 'phone-book-mgmt__field';
      const lbl = document.createElement('label');
      lbl.textContent = labelText;
      const input = document.createElement('input');
      input.type = 'text';
      input.placeholder = placeholder;
      input.value = value;
      lbl.appendChild(input);
      row.appendChild(lbl);
      form.appendChild(row);
      return input;
    }

    const emojiInput = makeField('Emoji (optional)', '🐶', prefill?.emoji ?? '');
    const nameInput = makeField('Name', 'Grandma', prefill?.name ?? '');
    nameInput.required = true;
    const phoneInput = makeField('Phone number', '555-1234', prefill?.phone ?? '');
    phoneInput.required = true;

    const btnRow = document.createElement('div');
    btnRow.className = 'phone-book-mgmt__btn-row';

    const saveBtn = document.createElement('button');
    saveBtn.type = 'submit';
    saveBtn.textContent = editingId !== null ? 'Save' : 'Add Contact';

    btnRow.appendChild(saveBtn);

    if (editingId !== null) {
      const cancelBtn = document.createElement('button');
      cancelBtn.type = 'button';
      cancelBtn.textContent = 'Cancel';
      cancelBtn.addEventListener('click', () => {
        editingId = null;
        renderForm();
      });
      btnRow.appendChild(cancelBtn);
    }

    form.appendChild(btnRow);

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      saveBtn.disabled = true;
      const data = {
        name: nameInput.value.trim(),
        phone: phoneInput.value.trim(),
        emoji: emojiInput.value.trim(),
        position: 0,
      };
      const op =
        editingId !== null ? phoneBookApi.update(editingId, data) : phoneBookApi.create(data);
      void op.then(() => {
        editingId = null;
        load();
      });
    });

    formSection.appendChild(form);
  }

  function startEdit(entry: PhoneBookEntry): void {
    editingId = entry.id;
    renderForm(entry);
  }

  function load(): void {
    void phoneBookApi
      .list()
      .then((result) => {
        entries = result;
        renderList();
        if (editingId === null) renderForm();
      })
      .catch(() => {
        listEl.innerHTML = '<p style="color:var(--color-error,red)">Could not load contacts. Try restarting the server.</p>';
        renderForm();
      });
  }

  renderForm();
  load();

  return section;
}
