import type { User } from '../../shared/types.js';
import { createChildChoreList } from '../components/ChildChoreList.js';
import { createProgressPanel } from '../components/ProgressPanel.js';
import { createBankingView } from './BankingView.js';
import * as api from '../utils/api.js';

export function createChildDashboard(user: User): HTMLElement {
  const wrapper = document.createElement('div');
  wrapper.className = 'child-dashboard-wrapper';

  function showBanking(): void {
    wrapper.innerHTML = '';
    wrapper.appendChild(createBankingView(user, showChores));
  }

  function showChores(): void {
    wrapper.innerHTML = '';

    const view = document.createElement('div');
    view.className = 'child-dashboard';

    const header = document.createElement('header');
    header.className = 'child-dashboard__header';
    const greeting = document.createElement('h1');
    greeting.className = 'child-dashboard__greeting';
    greeting.textContent = `Hi ${user.name}! ${user.icon}`;
    const earnedBadge = document.createElement('button');
    earnedBadge.type = 'button';
    earnedBadge.className = 'child-dashboard__earned';
    earnedBadge.textContent = '$0.00 this week';
    earnedBadge.addEventListener('click', showBanking);
    header.appendChild(greeting);
    header.appendChild(earnedBadge);
    view.appendChild(header);

    const progressPanel = createProgressPanel({ total: 0, completed: 0, percent: 0, earned: 0 });
    view.appendChild(progressPanel);

    async function refreshProgress(): Promise<void> {
      const [progress, banking] = await Promise.all([
        api.chores.progress(user.id),
        api.allowance.banking(user.id),
      ]);
      progressPanel.update(progress);
      const total = banking.thisWeekEarned + banking.todayEarned;
      earnedBadge.textContent = `$${total.toFixed(2)} this week`;
    }

    const choreList = createChildChoreList(user.id, api.chores, () => {
      void refreshProgress();
    });
    view.appendChild(choreList);

    void refreshProgress();
    wrapper.appendChild(view);
  }

  showChores();
  return wrapper;
}
