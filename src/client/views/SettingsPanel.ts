import type { User } from '../../shared/types.js';
import { createChoreManagementSection } from '../components/ChoreManagementSection.js';
import { createAllowanceConfigSection } from '../components/AllowanceConfigSection.js';
import { applyTheme, THEMES, type Theme } from '../utils/theme.js';
import { createPinSettingsApi, createPinAllowanceApi } from '../utils/api.js';
import * as api from '../utils/api.js';

type SettingsTab = 'chores' | 'allowance' | 'theme' | 'pin' | 'payout' | 'reset-time';

const TAB_LABELS: Record<SettingsTab, string> = {
  chores: 'Chores',
  allowance: 'Allowance',
  theme: 'Theme',
  pin: 'PIN',
  payout: 'Payout',
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

  let activeTab: SettingsTab = 'chores';

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
    if (activeTab === 'chores') {
      content.appendChild(createChoreManagementSection(childUsers, api.chores));
    } else if (activeTab === 'allowance') {
      content.appendChild(createAllowanceConfigSection(childUsers, pinAllowanceApi));
    } else if (activeTab === 'theme') {
      content.appendChild(createThemeSection());
    } else if (activeTab === 'pin') {
      content.appendChild(createPinSection(pinSettingsApi));
    } else if (activeTab === 'payout') {
      content.appendChild(createPayoutSection(childUsers, pinAllowanceApi));
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

// ─── Payout section ───────────────────────────────────────────────────────────

function createPayoutSection(
  childUsers: User[],
  pinAllowanceApi: ReturnType<typeof createPinAllowanceApi>,
): HTMLElement {
  const section = document.createElement('section');
  section.className = 'settings-section';

  const heading = document.createElement('h2');
  heading.textContent = 'Mark as Paid';
  section.appendChild(heading);

  const desc = document.createElement('p');
  desc.textContent = 'Mark the current allowance period as paid for a child.';
  section.appendChild(desc);

  for (const child of childUsers) {
    const row = document.createElement('div');
    row.className = 'payout-row';

    const nameSpan = document.createElement('span');
    nameSpan.textContent = `${child.icon || '⭐'} ${child.name}`;

    const msg = document.createElement('span');
    msg.className = 'payout-row__msg';
    msg.hidden = true;
    msg.textContent = 'Paid!';

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.dataset.action = 'payout';
    btn.dataset.childId = String(child.id);
    btn.textContent = 'Mark as Paid';
    btn.addEventListener('click', () => {
      btn.disabled = true;
      void pinAllowanceApi.payout(child.id).then(() => {
        btn.disabled = false;
        msg.hidden = false;
        setTimeout(() => {
          msg.hidden = true;
        }, 3000);
      });
    });

    row.appendChild(nameSpan);
    row.appendChild(btn);
    row.appendChild(msg);
    section.appendChild(row);
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
