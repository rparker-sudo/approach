import { addDays, breakOn, dateKey, dayTypeOn, formatKey, fromKey, planForDate, testBlocked, today as todayDate } from './calendar';
import type { Program, TestBattery } from './types';

/**
 * Testing-date suggestions (testing-day-checklist.md Part 3, spec 1.9.3). Suggestions only: the coach can pick any
 * date that passes the hard rules (no match within 48 h, not a match day, not a break day).
 */

export type DateSuggestion = { date: string; reason: string };
export type Suggestions = { battery: TestBattery; dates: DateSuggestion[]; jumpOnly?: boolean };

export const BATTERY_FOR_PHASE: Record<Program['phase'], TestBattery> = { off: 'full', pre: 'full', in: 'mid', post: 'jump' };
export const NO_DATE_MESSAGE = 'No good date in this phase. Pick one, or test jumps only.';
export const BREAK_MESSAGE = 'This date is in a break.';

const isMatch = (t: string) => t === 'game' || t === 'tournament';

function blockStart(program: Program): Date {
  return fromKey(program.blockStart ?? program.createdAt.slice(0, 10));
}

/** A lift day that passes the hard rules. */
export function goodTestDay(program: Program, d: Date): boolean {
  if (isMatch(dayTypeOn(program, d)) || breakOn(program, d)) return false;
  if (testBlocked(program, dateKey(d))) return false;
  const p = planForDate(program, d);
  return !!p.sessionId || !!p.test;
}

const liftDaysIn = (program: Program, from: Date, days = 7) =>
  Array.from({ length: days }, (_, i) => addDays(from, i)).filter((d) => goodTestDay(program, d));

const short = (d: Date) => formatKey(dateKey(d), { weekday: 'short', month: 'short', day: 'numeric' });

export function suggestTestDates(program: Program, from: Date = todayDate()): Suggestions {
  const battery = BATTERY_FOR_PHASE[program.phase];
  const weeks = Math.max(2, program.blockWeeks ?? 4);
  const start = blockStart(program);
  const fromKey_ = dateKey(from);
  const out: DateSuggestion[] = [];
  const push = (d: Date | undefined, reason: string) => {
    if (d && dateKey(d) >= fromKey_ && !out.some((x) => x.date === dateKey(d))) out.push({ date: dateKey(d), reason });
  };
  const blockAt = (k: number) => addDays(start, k * weeks * 7);

  if (program.phase === 'off') {
    // Last lift day of week 1 of the block; if that fails, the next lift day in week 2.
    for (let k = 0; k < 12 && out.length < 3; k++) {
      const bs = blockAt(k);
      const w1 = liftDaysIn(program, bs).filter((d) => dateKey(d) >= fromKey_);
      if (w1.length) push(w1[w1.length - 1], 'end of week 1');
      else push(liftDaysIn(program, addDays(bs, 7)).find((d) => dateKey(d) >= fromKey_), 'week 2');
    }
  } else if (program.phase === 'pre') {
    // No prior block in Approach Strength: last lift day of preseason week 1. Then the last lift day of each deload week.
    const firstBlock = program.blockStart == null || program.blockStart === program.createdAt.slice(0, 10);
    if (firstBlock) {
      const w1 = liftDaysIn(program, start);
      push(w1[w1.length - 1], 'end of week 1');
    }
    for (let k = 0; k < 12 && out.length < 3; k++) {
      const dl = addDays(blockAt(k), (weeks - 1) * 7);
      const days = liftDaysIn(program, dl).filter((d) => dateKey(d) >= fromKey_);
      if (days.length) push(days[days.length - 1], 'end of deload week');
      else push(liftDaysIn(program, addDays(dl, 7)).find((d) => dateKey(d) >= fromKey_), 'start of next block');
    }
  } else if (program.phase === 'in') {
    // A lift day in the middle third of the season (first to last match on the calendar), in a week with no tournament,
    // at least 48 h before the next match. Closest to the midpoint first. Widen to any in-season week; else jumps only.
    const matches = (program.events ?? []).filter((e) => isMatch(e.type) && !e.teamName).map((e) => e.date).sort();
    if (!matches.length) return { battery, dates: [] };
    const a = fromKey(matches[0]);
    const b = fromKey(matches[matches.length - 1]);
    const span = Math.round((b.getTime() - a.getTime()) / 864e5);
    const mid = addDays(a, Math.round(span / 2));
    const monday = (d: Date) => addDays(d, -((d.getDay() + 6) % 7));
    const pick = (lo: Date, hi: Date) => {
      const found: Date[] = [];
      for (let m = monday(lo); m <= hi; m = addDays(m, 7)) {
        const week = Array.from({ length: 7 }, (_, i) => addDays(m, i));
        if (week.some((d) => dayTypeOn(program, d) === 'tournament')) continue;
        found.push(...week.filter((d) => d >= lo && d <= hi && dateKey(d) >= fromKey_ && goodTestDay(program, d)));
      }
      return found.sort((x, y) => Math.abs(x.getTime() - mid.getTime()) - Math.abs(y.getTime() - mid.getTime()));
    };
    let found = pick(addDays(a, Math.round(span / 3)), addDays(a, Math.round((2 * span) / 3)));
    if (!found.length) found = pick(a, b);
    if (!found.length) return { battery: 'jump', dates: [], jumpOnly: true };
    found.slice(0, 3).forEach((d) => push(d, 'no tournament this week'));
  } else {
    // Post-season: first lift day of the block, then the next lift day.
    for (let k = 0; k < 12 && out.length < 3; k++) {
      const days = liftDaysIn(program, blockAt(k), weeks * 7).filter((d) => dateKey(d) >= fromKey_);
      push(days[0], k === 0 && dateKey(blockAt(0)) >= fromKey_ ? 'start of post-season' : 'next lift day');
    }
  }
  out.sort((x, y) => x.date.localeCompare(y.date));
  return { battery, dates: out.slice(0, 3).map((x) => ({ ...x, reason: `${short(fromKey(x.date))} · ${x.reason}` })) };
}

/** Spacing note: a full battery within 4 weeks of the last one on this team (suggestion only; still saves). */
export function spacingNote(program: Program, key: string, battery: TestBattery | null): string | null {
  if (battery !== 'full') return null;
  const prev = (program.events ?? [])
    .filter((e) => e.test === 'full' && !e.teamName && e.date < key)
    .map((e) => e.date)
    .sort()
    .pop();
  if (!prev) return null;
  const days = Math.round((fromKey(key).getTime() - fromKey(prev).getTime()) / 864e5);
  if (days >= 28) return null;
  const w = Math.max(1, Math.round(days / 7));
  return `Last full battery was ${w} week${w === 1 ? '' : 's'} ago. Most teams test every 6–12 weeks.`;
}
