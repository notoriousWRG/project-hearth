import type { User } from '../../shared/types.js';
import { createChildChoreList } from '../components/ChildChoreList.js';
import { createProgressPanel } from '../components/ProgressPanel.js';
import { createStreakDisplay } from '../components/StreakDisplay.js';
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

    const streakEl = createStreakDisplay(
      {
        id: 0,
        user_id: user.id,
        current_streak: 0,
        longest_streak: 0,
        last_completed_date: null,
      },
      7,
    );
    view.appendChild(streakEl);

    async function refreshProgress(): Promise<void> {
      const [progress, streak, banking] = await Promise.all([
        api.chores.progress(user.id),
        api.streaks.get(user.id),
        api.allowance.banking(user.id),
      ]);
      progressPanel.update(progress);
      streakEl.update(streak, progress.streak_threshold);
      earnedBadge.textContent = `$${banking.thisWeekEarned.toFixed(2)} this week`;
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
