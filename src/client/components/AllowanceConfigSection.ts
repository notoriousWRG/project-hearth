import type { AllowanceConfig, AllowanceTier, User } from '../../shared/types.js';
import type { AllowanceSavePayload } from '../utils/api.js';

interface AllowanceApi {
  get: (userId: number) => Promise<{ config: AllowanceConfig | null; tiers: AllowanceTier[] }>;
  save: (
    userId: number,
    data: AllowanceSavePayload,
  ) => Promise<{ config: AllowanceConfig; tiers: AllowanceTier[] }>;
  payout: (userId: number) => Promise<AllowanceConfig>;
}

export function createAllowanceConfigSection(
  childUsers: User[],
  allowanceApi: AllowanceApi,
): HTMLElement {
  const section = document.createElement('section');
  section.className = 'settings-section';

  const heading = document.createElement('h2');
  heading.textContent = 'Allowance Config';
  section.appendChild(heading);

  if (childUsers.length === 0) {
    const empty = document.createElement('p');
    empty.textContent = 'No children configured.';
    section.appendChild(empty);
    return section;
  }

  const tabStrip = document.createElement('div');
  tabStrip.className = 'settings-child-tabs';
  section.appendChild(tabStrip);

  const content = document.createElement('div');
  section.appendChild(content);

  let activeChildId = childUsers[0].id;
  let currentConfig: AllowanceConfig | null = null;
  // Local tier state (not yet saved)
  let localTiers: { percent_complete: number; percent_payout: number }[] = [];

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
        loadConfig();
      });
      tabStrip.appendChild(btn);
    }
  }

  function renderTierRow(
    tier: { percent_complete: number; percent_payout: number },
    index: number,
  ): HTMLLIElement {
    const li = document.createElement('li');
    li.className = 'tier-row';

    const completeInput = document.createElement('input');
    completeInput.type = 'number';
    completeInput.min = '0';
    completeInput.max = '100';
    completeInput.value = String(tier.percent_complete);
    completeInput.dataset.field = 'percent-complete';
    completeInput.addEventListener('input', () => {
      localTiers[index] = {
        ...localTiers[index],
        percent_complete: Number(completeInput.value),
      };
    });

    const arrow = document.createElement('span');
    arrow.textContent = '→';

    const payoutInput = document.createElement('input');
    payoutInput.type = 'number';
    payoutInput.min = '0';
    payoutInput.max = '100';
    payoutInput.value = String(tier.percent_payout);
    payoutInput.dataset.field = 'percent-payout';
    payoutInput.addEventListener('input', () => {
      localTiers[index] = {
        ...localTiers[index],
        percent_payout: Number(payoutInput.value),
      };
    });

    const delBtn = document.createElement('button');
    delBtn.type = 'button';
    delBtn.dataset.action = 'delete-tier';
    delBtn.textContent = '×';
    delBtn.addEventListener('click', () => {
      localTiers.splice(index, 1);
      renderContent(currentConfig);
    });

    li.appendChild(completeInput);
    li.appendChild(arrow);
    li.appendChild(payoutInput);
    li.appendChild(delBtn);
    return li;
  }

  function renderContent(config: AllowanceConfig | null): void {
    content.innerHTML = '';

    const amountLabel = document.createElement('label');
    amountLabel.textContent = 'Allowance amount ($)';
    const amountInput = document.createElement('input');
    amountInput.type = 'number';
    amountInput.min = '0';
    amountInput.step = '0.01';
    amountInput.dataset.field = 'amount';
    amountInput.value = config ? String(config.amount) : '0';
    amountLabel.appendChild(amountInput);
    content.appendChild(amountLabel);

    const streakLabel = document.createElement('label');
    streakLabel.textContent = 'Streak bonus threshold (days)';
    const streakInput = document.createElement('input');
    streakInput.type = 'number';
    streakInput.min = '1';
    streakInput.dataset.field = 'streak-threshold';
    streakInput.value = config ? String(config.streak_threshold) : '7';
    streakLabel.appendChild(streakInput);
    content.appendChild(streakLabel);

    const tiersHeading = document.createElement('h3');
    tiersHeading.textContent = 'Completion tiers';
    content.appendChild(tiersHeading);

    const tiersList = document.createElement('ul');
    localTiers.forEach((tier, index) => tiersList.appendChild(renderTierRow(tier, index)));
    content.appendChild(tiersList);

    const addTierBtn = document.createElement('button');
    addTierBtn.type = 'button';
    addTierBtn.dataset.action = 'add-tier';
    addTierBtn.textContent = '+ Add tier';
    addTierBtn.addEventListener('click', () => {
      localTiers.push({ percent_complete: 100, percent_payout: 100 });
      renderContent(currentConfig);
    });
    content.appendChild(addTierBtn);

    const saveBtn = document.createElement('button');
    saveBtn.type = 'button';
    saveBtn.dataset.action = 'save';
    saveBtn.textContent = 'Save';
    saveBtn.addEventListener('click', () => {
      const payload: AllowanceSavePayload = {
        amount: Number(amountInput.value),
        streak_threshold: Number(streakInput.value),
        reset_day: config?.reset_day ?? 0,
        period_start: config?.period_start ?? new Date().toISOString().slice(0, 10),
        tiers: localTiers.map((t) => ({ ...t })),
      };
      saveBtn.disabled = true;
      void allowanceApi.save(activeChildId, payload).then(() => {
        saveBtn.disabled = false;
      });
    });
    content.appendChild(saveBtn);
  }

  function loadConfig(): void {
    allowanceApi.get(activeChildId).then(({ config, tiers }) => {
      currentConfig = config;
      localTiers = tiers.map((t) => ({
        percent_complete: t.percent_complete,
        percent_payout: t.percent_payout,
      }));
      renderContent(config);
    });
  }

  renderTabs();
  loadConfig();

  return section;
}
