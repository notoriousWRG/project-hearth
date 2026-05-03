interface ProgressData {
  total: number;
  completed: number;
  percent: number;
  earned: number;
}

type ProgressPanelElement = HTMLElement & { update: (data: ProgressData) => void };

export function createProgressPanel(initial: ProgressData): ProgressPanelElement {
  const section = document.createElement('section') as ProgressPanelElement;
  section.className = 'progress-panel';

  const countEl = document.createElement('p');
  countEl.className = 'progress-panel__count';

  const track = document.createElement('div');
  track.className = 'progress-bar';

  const fill = document.createElement('div');
  fill.className = 'progress-bar__fill';
  track.appendChild(fill);

  const earnedEl = document.createElement('p');
  earnedEl.className = 'progress-panel__earned';

  section.appendChild(countEl);
  section.appendChild(track);
  section.appendChild(earnedEl);

  function render(data: ProgressData): void {
    if (data.total === 0) {
      countEl.textContent = 'No chores today';
      fill.style.width = '0%';
      earnedEl.textContent = `$${data.earned.toFixed(2)}`;
      return;
    }
    countEl.textContent = `${data.completed} of ${data.total}`;
    fill.style.width = `${data.percent}%`;
    earnedEl.textContent = `$${data.earned.toFixed(2)}`;
  }

  render(initial);

  section.update = (data: ProgressData) => render(data);

  return section;
}
