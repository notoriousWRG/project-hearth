export type DashboardTab = 'overview' | 'meals' | 'grocery';

const TAB_LABELS: Record<DashboardTab, string> = {
  overview: 'Home',
  meals: 'Meal Plan',
  grocery: 'Grocery',
};

export function createDashboardNav(
  active: DashboardTab,
  onChange: (tab: DashboardTab) => void,
): HTMLElement {
  const nav = document.createElement('nav');
  nav.className = 'dashboard-nav';

  for (const tab of ['overview', 'meals', 'grocery'] as DashboardTab[]) {
    const btn = document.createElement('button');
    btn.className = `dashboard-nav__tab${tab === active ? ' dashboard-nav__tab--active' : ''}`;
    btn.dataset.tab = tab;
    btn.textContent = TAB_LABELS[tab];
    btn.addEventListener('click', () => onChange(tab));
    nav.appendChild(btn);
  }

  return nav;
}
