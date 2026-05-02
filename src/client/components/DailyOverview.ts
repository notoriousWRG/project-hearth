export function createDailyOverview(now: Date = new Date()): HTMLElement {
  const header = document.createElement('header');
  header.className = 'daily-overview';

  const dateStr = now.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  const hour = now.getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const greetEl = document.createElement('p');
  greetEl.className = 'daily-overview__greeting';
  greetEl.textContent = greeting;

  const dateEl = document.createElement('h1');
  dateEl.className = 'daily-overview__date';
  dateEl.textContent = dateStr;

  header.appendChild(greetEl);
  header.appendChild(dateEl);
  return header;
}
