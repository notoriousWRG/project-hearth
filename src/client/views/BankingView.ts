import type { User } from '../../shared/types.js';
import { allowance as allowanceApi } from '../utils/api.js';

export function createBankingView(user: User, onBack: () => void): HTMLElement {
  const view = document.createElement('div');
  view.className = 'banking-view';

  const backBtn = document.createElement('button');
  backBtn.type = 'button';
  backBtn.className = 'banking-back-btn';
  backBtn.textContent = '← Back';
  backBtn.addEventListener('click', onBack);
  view.appendChild(backBtn);

  const heading = document.createElement('h2');
  heading.className = 'banking-heading';
  heading.textContent = `${user.icon || '⭐'} ${user.name}'s Bank`;
  view.appendChild(heading);

  const grid = document.createElement('div');
  grid.className = 'banking-grid';
  view.appendChild(grid);

  function makeBucket(label: string, valueEl: HTMLElement): HTMLElement {
    const card = document.createElement('div');
    card.className = 'banking-bucket';
    const lbl = document.createElement('div');
    lbl.className = 'banking-bucket__label';
    lbl.textContent = label;
    card.appendChild(lbl);
    card.appendChild(valueEl);
    return card;
  }

  const weekEl = document.createElement('div');
  weekEl.className = 'banking-bucket__value';
  weekEl.textContent = '—';

  const savingsEl = document.createElement('div');
  savingsEl.className = 'banking-bucket__value';
  savingsEl.textContent = '—';

  const titheEl = document.createElement('div');
  titheEl.className = 'banking-bucket__value';
  titheEl.textContent = '—';

  const checkingEl = document.createElement('div');
  checkingEl.className = 'banking-bucket__value';
  checkingEl.textContent = '—';

  grid.appendChild(makeBucket('This week', weekEl));
  grid.appendChild(makeBucket('Savings', savingsEl));
  grid.appendChild(makeBucket('Tithe', titheEl));
  grid.appendChild(makeBucket('Checking', checkingEl));

  function fmt(n: number): string {
    return `$${n.toFixed(2)}`;
  }

  void allowanceApi.banking(user.id).then((data) => {
    weekEl.textContent = fmt(data.thisWeekEarned);
    savingsEl.textContent = fmt(data.savingsBalance);
    titheEl.textContent = fmt(data.titheBalance);
    checkingEl.textContent = fmt(data.checkingBalance);
  });

  return view;
}
