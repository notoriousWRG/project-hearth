export function createEatingOutConfigSection(pinSettingsApi: {
  getAll: () => Promise<Record<string, unknown>>;
  set: (key: string, value: unknown) => Promise<void>;
}): HTMLElement {
  const section = document.createElement('section');
  section.className = 'settings-section';

  const heading = document.createElement('h2');
  heading.textContent = 'Eating Out Allowance';
  section.appendChild(heading);

  const desc = document.createElement('p');
  desc.textContent = 'Set a weekly budget for eating out. It resets every Monday.';
  section.appendChild(desc);

  const form = document.createElement('form');

  const row = document.createElement('div');
  row.className = 'eating-out-config__row';

  const lbl = document.createElement('label');
  lbl.textContent = 'Weekly amount ($)';

  const input = document.createElement('input');
  input.type = 'number';
  input.min = '0';
  input.step = '0.01';
  input.value = '0.00';
  input.dataset.field = 'weekly-amount';

  lbl.appendChild(input);
  row.appendChild(lbl);
  form.appendChild(row);

  const successMsg = document.createElement('p');
  successMsg.className = 'settings-section__success';
  successMsg.hidden = true;
  successMsg.textContent = 'Saved.';
  form.appendChild(successMsg);

  const saveBtn = document.createElement('button');
  saveBtn.type = 'submit';
  saveBtn.textContent = 'Save';
  form.appendChild(saveBtn);

  void pinSettingsApi.getAll().then((all) => {
    const stored = all['eating_out_weekly_amount'];
    if (typeof stored === 'number') input.value = stored.toFixed(2);
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    successMsg.hidden = true;
    saveBtn.disabled = true;
    const amount = parseFloat(input.value);
    void pinSettingsApi.set('eating_out_weekly_amount', isNaN(amount) ? 0 : amount).then(() => {
      saveBtn.disabled = false;
      successMsg.hidden = false;
      setTimeout(() => {
        successMsg.hidden = true;
      }, 3000);
    });
  });

  section.appendChild(form);
  return section;
}
