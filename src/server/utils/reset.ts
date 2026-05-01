export function parseResetTime(resetTime: string): { hours: number; minutes: number } {
  const [h, m] = resetTime.split(':').map(Number);
  return { hours: h, minutes: m };
}

export function getCurrentResetDate(now: Date, resetTime: string): string {
  const { hours, minutes } = parseResetTime(resetTime);
  const resetToday = new Date(now);
  resetToday.setHours(hours, minutes, 0, 0);

  if (now >= resetToday) {
    return toISODate(now);
  }

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  return toISODate(yesterday);
}

export function shouldReset(lastResetDate: string, resetTime: string, now: Date): boolean {
  const currentPeriod = getCurrentResetDate(now, resetTime);
  return currentPeriod > lastResetDate;
}

export function getNextResetDate(now: Date, resetTime: string): Date {
  const { hours, minutes } = parseResetTime(resetTime);
  const next = new Date(now);
  next.setHours(hours, minutes, 0, 0);

  if (next <= now) {
    next.setDate(next.getDate() + 1);
  }

  return next;
}

function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
