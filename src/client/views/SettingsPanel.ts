import type { User } from '../../shared/types.js';
import { createChoreManagementSection } from '../components/ChoreManagementSection.js';
import { createAllowanceConfigSection } from '../components/AllowanceConfigSection.js';
import { createUserManagementSection } from '../components/UserManagementSection.js';
import { createChoreHistorySection } from '../components/ChoreHistorySection.js';
import { applyTheme, THEMES, type Theme } from '../utils/theme.js';
import {
  createPinSettingsApi,
  createPinAllowanceApi,
  createPinStreaksApi,
  createPinChoreHistoryApi,
} from '../utils/api.js';
import * as api from '../utils/api.js';

type SettingsTab =
  | 'users'
  | 'chores'
  | 'history'
  | 'allowance'
  | 'balances'
  | 'theme'
  | 'pin'
  | 'reset-time';

const TAB_LABELS: Record<SettingsTab, string> = {
  users: 'Users',
  chores: 'Chores',
  history: 'History',
  allowance: 'Allowance',
  balances: 'Balances',
  theme: 'Theme',
  pin: 'PIN',
  'reset-time': 'Reset Time',
};

const THEME_PARENT_KEY = 'hearth:theme:parent';
const THEME_CHILD_KEY = 'hearth:theme:child';

export function createSettingsPanel(
  pin: string,
  childUsers: User[],
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _allUsers: User[],
): HTMLElement {
  const pinSettingsApi = createPinSettingsApi(pin);
  const pinAllowanceApi = createPinAllowanceApi(pin);
  const pinStreaksApi = createPinStreaksApi(pin);
  const pinChoreHistoryApi = createPinChoreHistoryApi(pin);

  const view = document.createElement('div');
  view.className = 'settings-panel';

  const header = document.createElement('header');
  header.className = 'settings-panel__header';
  const heading = document.createElement('h1');
  heading.textContent = '⚙️ Settings';
  header.appendChild(heading);
  view.appendChild(header);

  const navSlot = document.createElement('div');
  view.appendChild(navSlot);

  const content = document.createElement('div');
  content.className = 'settings-panel__content';
  view.appendChild(content);

  let activeTab: SettingsTab = 'users';

  function renderNav(): void {
    navSlot.innerHTML = '';
    const nav = document.createElement('nav');
    nav.className = 'settings-nav';
    for (const tab of Object.keys(TAB_LABELS) as SettingsTab[]) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'settings-nav__tab' + (tab === activeTab ? ' settings-nav__tab--active' : '');
      btn.dataset.tab = tab;
      btn.textContent = TAB_LABELS[tab];
      btn.addEventListener('click', () => {
        activeTab = tab;
        renderNav();
        renderContent();
      });
      nav.appendChild(btn);
    }
    navSlot.appendChild(nav);
  }

  function renderContent(): void {
    content.innerHTML = '';
    if (activeTab === 'users') {
      content.appendChild(createUserManagementSection(api.users));
    } else if (activeTab === 'chores') {
      content.appendChild(createChoreManagementSection(childUsers, api.chores, pinStreaksApi));
    } else if (activeTab === 'history') {
      content.appendChild(createChoreHistorySection(childUsers, pinChoreHistoryApi));
    } else if (activeTab === 'allowance') {
      content.appendChild(createAllowanceConfigSection(childUsers, pinAllowanceApi));
    } else if (activeTab === 'balances') {
      content.appendChild(createBalancesSection(childUsers, pinAllowanceApi));
    } else if (activeTab === 'theme') {
      content.appendChild(createThemeSection());
    } else if (activeTab === 'pin') {
      content.appendChild(createPinSection(pinSettingsApi));
    } else {
      content.appendChild(createResetTimeSection(pinSettingsApi));
    }
  }

  renderNav();
  renderContent();
  return view;
}

// ─── Theme section ────────────────────────────────────────────────────────────

function createThemeSection(): HTMLElement {
  const section = document.createElement('section');
  section.className = 'settings-section';

  const heading = document.createElement('h2');
  heading.textContent = 'Theme';
  section.appendChild(heading);

  function makeThemeGroup(label: string, storageKey: string, viewAttr: string): HTMLElement {
    const group = document.createElement('div');
    group.className = 'settings-theme-group';

    const groupLabel = document.createElement('p');
    groupLabel.textContent = label;
    group.appendChild(groupLabel);

    const stored = localStorage.getItem(storageKey) as Theme | null;
    const current: Theme = stored && THEMES.includes(stored) ? stored : 'farmstead';

    const btnRow = document.createElement('div');
    btnRow.className = 'settings-theme-btns';

    for (const theme of THEMES) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.dataset.theme = theme;
      btn.textContent = theme.charAt(0).toUpperCase() + theme.slice(1);
      btn.className =
        'settings-theme-btn' + (theme === current ? ' settings-theme-btn--active' : '');
      btn.addEventListener('click', () => {
        localStorage.setItem(storageKey, theme);
        // Apply theme if this is the currently active view
        if (document.documentElement.getAttribute('data-view') === viewAttr) {
          applyTheme(theme);
        }
        // Update active button
        for (const b of btnRow.querySelectorAll<HTMLButtonElement>('.settings-theme-btn')) {
          b.classList.toggle('settings-theme-btn--active', b.dataset.theme === theme);
        }
      });
      btnRow.appendChild(btn);
    }

    group.appendChild(btnRow);
    return group;
  }

  section.appendChild(makeThemeGroup('Parent view theme', THEME_PARENT_KEY, 'parent'));
  section.appendChild(makeThemeGroup('Child view theme', THEME_CHILD_KEY, 'child'));

  return section;
}

// ─── PIN section ──────────────────────────────────────────────────────────────

function createPinSection(pinSettingsApi: ReturnType<typeof createPinSettingsApi>): HTMLElement {
  const section = document.createElement('section');
  section.className = 'settings-section';

  const heading = document.createElement('h2');
  heading.textContent = 'Change PIN';
  section.appendChild(heading);

  const form = document.createElement('form');

  const newPinInput = document.createElement('input');
  newPinInput.type = 'password';
  newPinInput.inputMode = 'numeric';
  newPinInput.maxLength = 4;
  newPinInput.placeholder = 'New PIN';
  newPinInput.required = true;
  newPinInput.dataset.field = 'new-pin';

  const confirmInput = document.createElement('input');
  confirmInput.type = 'password';
  confirmInput.inputMode = 'numeric';
  confirmInput.maxLength = 4;
  confirmInput.placeholder = 'Confirm PIN';
  confirmInput.required = true;

  const errorMsg = document.createElement('p');
  errorMsg.className = 'settings-section__error';
  errorMsg.hidden = true;

  const successMsg = document.createElement('p');
  successMsg.className = 'settings-section__success';
  successMsg.hidden = true;
  successMsg.textContent = 'PIN changed.';

  const saveBtn = document.createElement('button');
  saveBtn.type = 'submit';
  saveBtn.textContent = 'Save PIN';

  form.appendChild(newPinInput);
  form.appendChild(confirmInput);
  form.appendChild(errorMsg);
  form.appendChild(successMsg);
  form.appendChild(saveBtn);

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    errorMsg.hidden = true;
    successMsg.hidden = true;
    if (newPinInput.value !== confirmInput.value) {
      errorMsg.textContent = 'PINs do not match.';
      errorMsg.hidden = false;
      return;
    }
    saveBtn.disabled = true;
    void pinSettingsApi.set('pin', newPinInput.value).then(() => {
      saveBtn.disabled = false;
      successMsg.hidden = false;
      newPinInput.value = '';
      confirmInput.value = '';
    });
  });

  section.appendChild(form);
  return section;
}

// ─── Balances section ─────────────────────────────────────────────────────────

function createBalancesSection(
  childUsers: User[],
  pinAllowanceApi: ReturnType<typeof createPinAllowanceApi>,
): HTMLElement {
  const section = document.createElement('section');
  section.className = 'settings-section';

  const heading = document.createElement('h2');
  heading.textContent = 'Balances';
  section.appendChild(heading);

  const desc = document.createElement('p');
  desc.textContent =
    'Adjust savings, tithe, and checking balances. Values are rounded to the nearest $0.25.';
  section.appendChild(desc);

  if (childUsers.length === 0) {
    const empty = document.createElement('p');
    empty.textContent = 'No children configured.';
    section.appendChild(empty);
    return section;
  }

  for (const child of childUsers) {
    const childSection = document.createElement('div');
    childSection.className = 'balances-child';

    const childHeading = document.createElement('h3');
    childHeading.textContent = `${child.icon || '⭐'} ${child.name}`;
    childSection.appendChild(childHeading);

    const form = document.createElement('form');
    form.className = 'balances-form';

    function makeField(label: string, fieldName: string): HTMLInputElement {
      const row = document.createElement('div');
      row.className = 'balances-field';
      const lbl = document.createElement('label');
      lbl.textContent = label;
      const input = document.createElement('input');
      input.type = 'number';
      input.name = fieldName;
      input.step = '0.25';
      input.min = '0';
      input.value = '0.00';
      lbl.appendChild(input);
      row.appendChild(lbl);
      form.appendChild(row);
      return input;
    }

    const savingsInput = makeField('Savings ($)', 'savings_balance');
    const titheInput = makeField('Tithe ($)', 'tithe_balance');
    const checkingInput = makeField('Checking ($)', 'checking_balance');

    const statusMsg = document.createElement('p');
    statusMsg.className = 'settings-section__success';
    statusMsg.hidden = true;
    statusMsg.textContent = 'Saved.';
    form.appendChild(statusMsg);

    const saveBtn = document.createElement('button');
    saveBtn.type = 'submit';
    saveBtn.textContent = 'Save';
    form.appendChild(saveBtn);

    // Load current values
    void pinAllowanceApi.get(child.id).then(({ config }) => {
      if (config) {
        savingsInput.value = config.savings_balance.toFixed(2);
        titheInput.value = config.tithe_balance.toFixed(2);
        checkingInput.value = config.checking_balance.toFixed(2);
      }
    });

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      statusMsg.hidden = true;
      saveBtn.disabled = true;
      void pinAllowanceApi
        .updateBalances(child.id, {
          savings_balance: Number(savingsInput.value),
          tithe_balance: Number(titheInput.value),
          checking_balance: Number(checkingInput.value),
        })
        .then((updated) => {
          savingsInput.value = updated.savingsBalance.toFixed(2);
          titheInput.value = updated.titheBalance.toFixed(2);
          checkingInput.value = updated.checkingBalance.toFixed(2);
          saveBtn.disabled = false;
          statusMsg.hidden = false;
          setTimeout(() => {
            statusMsg.hidden = true;
          }, 3000);
        });
    });

    childSection.appendChild(form);
    section.appendChild(childSection);
  }

  return section;
}

// ─── Reset time section ───────────────────────────────────────────────────────

function createResetTimeSection(
  pinSettingsApi: ReturnType<typeof createPinSettingsApi>,
): HTMLElement {
  const section = document.createElement('section');
  section.className = 'settings-section';

  const heading = document.createElement('h2');
  heading.textContent = 'Daily Reset Time';
  section.appendChild(heading);

  const desc = document.createElement('p');
  desc.textContent = 'Recurring chores reset at this time each day.';
  section.appendChild(desc);

  const form = document.createElement('form');

  const timeInput = document.createElement('input');
  timeInput.type = 'time';
  timeInput.dataset.field = 'reset-time';
  timeInput.value = '00:00';

  const successMsg = document.createElement('p');
  successMsg.className = 'settings-section__success';
  successMsg.hidden = true;
  successMsg.textContent = 'Saved.';

  const saveBtn = document.createElement('button');
  saveBtn.type = 'submit';
  saveBtn.textContent = 'Save';

  form.appendChild(timeInput);
  form.appendChild(successMsg);
  form.appendChild(saveBtn);

  // Load current value
  void pinSettingsApi.getAll().then((all) => {
    const stored = all['reset_time'];
    if (typeof stored === 'string') timeInput.value = stored;
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    successMsg.hidden = true;
    saveBtn.disabled = true;
    void pinSettingsApi.set('reset_time', timeInput.value).then(() => {
      saveBtn.disabled = false;
      successMsg.hidden = false;
    });
  });

  section.appendChild(form);
  return section;
}
