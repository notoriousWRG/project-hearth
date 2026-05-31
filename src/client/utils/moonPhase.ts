import type { MoonPhaseInfo, MoonPhaseName } from '../../shared/types.js';

// Julian Day Number algorithm for synodic position; accurate to within ~1 day.
// Reference epoch from Meeus "Astronomical Algorithms" ch.49: New Moon k=0.
const SYNODIC_PERIOD = 29.53058867;
const KNOWN_NEW_MOON_JD = 2451550.09765; // 2000-01-06.6 UT

function toJulianDay(date: Date): number {
  const y = date.getUTCFullYear();
  const m = date.getUTCMonth() + 1;
  const d = date.getUTCDate();
  const a = Math.floor((14 - m) / 12);
  const yr = y + 4800 - a;
  const mo = m + 12 * a - 3;
  return (
    d +
    Math.floor((153 * mo + 2) / 5) +
    365 * yr +
    Math.floor(yr / 4) -
    Math.floor(yr / 100) +
    Math.floor(yr / 400) -
    32045
  );
}

export function getMoonFraction(date: Date): number {
  const jd = toJulianDay(date);
  let fraction = ((jd - KNOWN_NEW_MOON_JD) / SYNODIC_PERIOD) % 1;
  if (fraction < 0) fraction += 1;
  return fraction;
}

const PHASES: { boundary: number; name: MoonPhaseName; emoji: string }[] = [
  { boundary: 0.0625, name: 'New Moon', emoji: '🌑' },
  { boundary: 0.1875, name: 'Waxing Crescent', emoji: '🌒' },
  { boundary: 0.3125, name: 'First Quarter', emoji: '🌓' },
  { boundary: 0.4375, name: 'Waxing Gibbous', emoji: '🌔' },
  { boundary: 0.5625, name: 'Full Moon', emoji: '🌕' },
  { boundary: 0.6875, name: 'Waning Gibbous', emoji: '🌖' },
  { boundary: 0.8125, name: 'Last Quarter', emoji: '🌗' },
  { boundary: 0.9375, name: 'Waning Crescent', emoji: '🌘' },
  { boundary: 1.0, name: 'New Moon', emoji: '🌑' },
];

export function getMoonPhase(date: Date): MoonPhaseInfo {
  const fraction = getMoonFraction(date);
  const entry = PHASES.find((p) => fraction < p.boundary) ?? PHASES[0];
  return { name: entry.name, emoji: entry.emoji, fraction };
}
