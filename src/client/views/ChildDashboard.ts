import type { User } from '../../shared/types.js';
import { createChildChoreList } from '../components/ChildChoreList.js';
import { createProgressPanel } from '../components/ProgressPanel.js';
import { createStreakDisplay } from '../components/StreakDisplay.js';
import * as api from '../utils/api.js';

export function createChildDashboard(user: User): HTMLElement {
  const view = document.createElement('div');
  view.className = 'child-dashboard';

  const header = document.createElement('header');
  header.className = 'child-dashboard__header';
  const greeting = document.createElement('h1');
  greeting.className = 'child-dashboard__greeting';
  greeting.textContent = `Hi ${user.name}! ${user.icon}`;
  const earnedBadge = document.createElement('div');
  earnedBadge.className = 'child-dashboard__earned';
  earnedBadge.textContent = '$0.00';
  header.appendChild(greeting);
  header.appendChild(earnedBadge);
  view.appendChild(header);

  // Placeholders rendered immediately, populated once data arrives
  const progressPanel = createProgressPanel({ total: 0, completed: 0, percent: 0, earned: 0 });
  view.appendChild(progressPanel);

  // Streak display starts hidden (no streak yet)
  const streakEl = createStreakDisplay(
    { id: 0, user_id: user.id, current_streak: 0, longest_streak: 0, last_completed_date: null },
    7,
  );
  view.appendChild(streakEl);

  async function refreshProgress(): Promise<void> {
    const [progress, streak] = await Promise.all([
      api.chores.progress(user.id),
      api.streaks.get(user.id),
    ]);
    progressPanel.update(progress);
    streakEl.update(streak, progress.streak_threshold);
    earnedBadge.textContent = `$${progress.earned.toFixed(2)}`;
  }

  const choreList = createChildChoreList(user.id, api.chores, () => {
    void refreshProgress();
  });
  view.appendChild(choreList);

  void refreshProgress();

  return view;
}
