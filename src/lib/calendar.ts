import type { CalendarEvent, DayType, Experience, Program, Session, TestBattery } from './types';
import { WEEKDAYS } from './types';

/**
 * Turns a program's default week + calendar dates + per-date overrides into
 * the actual plan for real dates. Pure functions; no React.
 */

const isMatch = (t: DayType) => t === 'game' || t === 'tournament';

/* ---------- Local date helpers (no UTC surprises) ---------- */

export function dateKey(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

export function fromKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(d: Date, n: number): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() + n);
  return x;
}

/** 0 = Monday … 6 = Sunday */
export function weekdayOf(d: Date): number {
  return (d.getDay() + 6) % 7;
}

export function mondayOf(d: Date): Date {
  return addDays(d, -weekdayOf(d));
}

export function today(): Date {
  const n = new Date();
  return new Date(n.getFullYear(), n.getMonth(), n.getDate());
}

/* ---------- Day types ---------- */

const DAY_RANK: Record<DayType, number> = { tournament: 3, game: 2, practice: 1, off: 0 };

/** All volleyball events on a date (an athlete's combined schedule can have one per team). Breaks are separate. */
export function eventsOn(program: Program, d: Date): CalendarEvent[] {
  const k = dateKey(d);
  return (program.events ?? []).filter((e) => e.date === k && e.type !== 'break');
}

/** The event that decides the day: this program's own event first, else the biggest (tournament > game > practice). */
export function eventOn(program: Program, d: Date): CalendarEvent | undefined {
  const all = eventsOn(program, d);
  const own = all.find((e) => !e.teamName);
  const other = [...all.filter((e) => e.teamName)].sort((a, b) => DAY_RANK[b.type as DayType] - DAY_RANK[a.type as DayType])[0];
  if (own && other && DAY_RANK[other.type as DayType] > DAY_RANK[own.type as DayType]) return other;
  return own ?? other;
}

/** A calendar event for that date, otherwise the default week. Matches on any of the athlete's teams count (union, TM-2). */
export function dayTypeOn(program: Program, d: Date): DayType {
  return (eventOn(program, d)?.type as DayType | undefined) ?? program.volleyballWeek[weekdayOf(d)];
}

/** TM-3: a break on this program's team covering the date. Another team's break (teamName set) doesn't stop lifting. */
export function breakOn(program: Program, d: Date, includeOtherTeams = false): CalendarEvent | undefined {
  const k = dateKey(d);
  return (program.events ?? []).find(
    (e) => e.type === 'break' && k >= e.date && k <= (e.endDate ?? e.date) && (includeOtherTeams || !e.teamName),
  );
}

/** Add or replace a break from `start` to `end` (inclusive). `original` is the start date of the break being edited. */
export function withBreak(program: Program, start: string, end: string, original?: string, label?: string): Program {
  const rest = (program.events ?? []).filter((e) => !(e.type === 'break' && e.date === (original ?? start)));
  const [a, b] = start <= end ? [start, end] : [end, start];
  return { ...program, events: [...rest, { date: a, endDate: b, type: 'break', ...(label?.trim() ? { label: label.trim() } : {}) }] };
}

export function withoutBreak(program: Program, start: string): Program {
  return { ...program, events: (program.events ?? []).filter((e) => !(e.type === 'break' && e.date === start)) };
}

/** Sessions built around a big lower-body lift. Kept off the day before a match when possible. */
const HEAVY_LEG_LIFTS = ['back-squat', 'front-squat', 'trap-bar-deadlift', 'rdl', 'split-squat', 'hang-clean'];
export function isHeavyLegs(session: Session | undefined): boolean {
  return !!session?.exercises.some((e) => HEAVY_LEG_LIFTS.includes(e.exerciseId));
}

/* ---------- The plan ---------- */

export type DayPlan = {
  date: string;
  dayType: DayType;
  event?: CalendarEvent;
  sessionId: string | null;
  /** Why the app changed this day, if it did. */
  note?: string;
  /** 'plan' = default week, 'auto' = moved by the app, 'override' = chosen for this date. */
  source: 'plan' | 'auto' | 'override';
  /** The coach lightened this date (readiness). */
  light?: boolean;
  /** Testing day (P6): the lift is replaced by a Testing session. */
  test?: TestBattery;
  /** TM-3: a break on this program's team. No lift. */
  break?: boolean;
};

const MATCH_WORD: Record<DayType, string> = { game: 'match', tournament: 'tournament', practice: 'practice', off: 'day off' };

/* G2 caps (duplicated from generator.ts to avoid an import cycle): beginner 3, intermediate 4, advanced 5; in-season 3. */
const EXP_RANK: Record<Experience, number> = { beginner: 1, intermediate: 2, advanced: 3 };
function capFor(experience: Experience, phase: Program['phase']) {
  const byLevel = experience === 'beginner' ? 3 : experience === 'intermediate' ? 4 : 5;
  return phase === 'in' ? Math.min(3, byLevel) : byLevel;
}

/**
 * The real plan for the 7 days starting at `monday`.
 * `athleteExperience`: the athlete's level (the lower of it and the program's sets the lift-day cap).
 * C14: every writer of lift days (onboarding, personal week, schedule, team calendar, coach lift days, automatic moves)
 * ends up here, so the cap (R6) and the full rest day (R5) are enforced on the final week, whatever the inputs.
 */
export function weekPlan(program: Program, monday: Date, athleteExperience?: Experience): DayPlan[] {
  const days = Array.from({ length: 7 }, (_, i) => addDays(monday, i));
  const types = days.map((d) => dayTypeOn(program, d));
  const nextType = (i: number) => (i < 6 ? types[i + 1] : dayTypeOn(program, addDays(days[6], 1)));
  const session = (id: string | null) => program.sessions.find((s) => s.id === id);

  const plan: DayPlan[] = days.map((d, i) => ({
    date: dateKey(d),
    dayType: types[i],
    event: eventOn(program, d),
    sessionId: program.liftSchedule[i] ?? null,
    source: 'plan',
  }));

  // 1. A lift that lands on a match/tournament day moves to the nearest good free day.
  for (let i = 0; i < 7; i++) {
    const sid = plan[i].sessionId;
    if (!sid || !isMatch(types[i])) continue;
    plan[i].sessionId = null;
    const heavy = isHeavyLegs(session(sid));
    let best = -1;
    let bestScore = Infinity;
    for (let j = 0; j < 7; j++) {
      if (j === i || isMatch(types[j]) || plan[j].sessionId) continue;
      let score = Math.abs(j - i);
      if (isMatch(nextType(j))) score += heavy ? 6 : 2; // avoid the day before a match
      if ((j > 0 && plan[j - 1].sessionId) || (j < 6 && plan[j + 1].sessionId)) score += 1; // spread lifts out
      if (score < bestScore) {
        bestScore = score;
        best = j;
      }
    }
    const why = `${MATCH_WORD[types[i]]} ${WEEKDAYS[i]}`;
    if (best >= 0) {
      plan[best] = { ...plan[best], sessionId: sid, source: 'auto', note: `Moved from ${WEEKDAYS[i]}: ${why}` };
      plan[i] = { ...plan[i], source: 'auto', note: `Lift moved to ${WEEKDAYS[best]}` };
    } else {
      plan[i] = { ...plan[i], source: 'auto', note: `Lift skipped: ${MATCH_WORD[types[i]]} week, no free day` };
    }
  }

  // 2. Heavy legs the day before a match: swap with a lighter lift this week if that one can go here.
  for (let i = 0; i < 7; i++) {
    const s = session(plan[i].sessionId);
    if (!s || !isHeavyLegs(s) || !isMatch(nextType(i))) continue;
    const j = plan.findIndex(
      (p, k) => k !== i && p.sessionId && !isHeavyLegs(session(p.sessionId)) && !isMatch(nextType(k)),
    );
    if (j < 0) continue;
    const light = plan[j].sessionId;
    plan[j] = { ...plan[j], sessionId: plan[i].sessionId, source: 'auto', note: `Swapped with ${WEEKDAYS[i]}: legs stay fresh for the ${MATCH_WORD[nextType(i)]}` };
    plan[i] = { ...plan[i], sessionId: light, source: 'auto', note: `Lighter lift: ${MATCH_WORD[nextType(i)]} tomorrow` };
  }

  // Coach-lightened dates.
  for (const p of plan) if (program.lightDates?.includes(p.date)) p.light = true;

  // 3. Choices for a specific date always win.
  for (const p of plan) {
    if (program.overrides && p.date in program.overrides) {
      p.sessionId = program.overrides[p.date];
      p.source = 'override';
      p.note = p.sessionId ? 'Lift chosen for this date' : 'Rest day chosen for this date';
    }
  }

  // 4. Break days (this program's team only): no lift sessions, no testing.
  for (let i = 0; i < 7; i++) {
    if (!breakOn(program, days[i])) continue;
    plan[i] = { ...plan[i], sessionId: null, break: true, note: 'Break week', source: plan[i].source };
  }

  // 5. Testing days replace that day's lift with a Testing session (the day keeps its day type).
  for (const p of plan) {
    if (p.break) continue;
    // A match added later within 48 hours cancels the testing day (P6.1).
    if (p.event?.test && !testBlocked(program, p.date)) {
      p.test = p.event.test;
      p.sessionId = null;
      p.note = 'Testing day';
    }
  }

  // 6. C14 / G2: lift-day cap and at least one day with nothing scheduled. Mobility-only sessions don't count toward the cap.
  const exp =
    athleteExperience && EXP_RANK[athleteExperience] < EXP_RANK[program.experience] ? athleteExperience : program.experience;
  const cap = capFor(exp, program.phase);
  // Mobility-only sessions and the light home day (H2) don't count toward the cap.
  const isLift = (p: DayPlan) => !!p.test || (!!p.sessionId && !session(p.sessionId)?.mobility && !session(p.sessionId)?.light);
  const lightSession = program.sessions.find((x) => x.light);
  let lightUsed = plan.some((p) => p.sessionId && session(p.sessionId)?.light);
  const drop = (p: DayPlan, note: string) => Object.assign(p, { sessionId: null, source: 'auto' as const, note });
  // Drop the latest lifts first, keeping dates the coach or athlete chose (overrides) and testing days when possible.
  const order = [...plan].reverse().sort((a, b) => Number(a.source === 'override') - Number(b.source === 'override'));
  let count = plan.filter(isLift).length;
  for (const p of order) {
    if (count <= cap) break;
    if (!isLift(p) || p.test) continue;
    // H2: one light home day a week beyond the cap (bodyweight, RPE ≤ 6), not on a match day.
    if (lightSession && !lightUsed && p.dayType !== 'game' && p.dayType !== 'tournament') {
      Object.assign(p, { sessionId: lightSession.id, source: 'auto' as const, note: `Light home day: max ${cap} full lift days for your level` });
      lightUsed = true;
    } else drop(p, `Lift skipped: max ${cap} lift days a week`);
    count--;
  }
  if (!plan.some((p) => !p.sessionId && !p.test)) {
    const p = order.find((x) => x.sessionId && !x.test);
    if (p) drop(p, 'Rest day: at least one day a week with no training');
  }
  return plan;
}

/** P6.1: testing can't be within 48 hours before a match or tournament (or on one). */
export function testBlocked(program: Program, key: string): string | null {
  const d = fromKey(key);
  for (let i = 0; i <= 2; i++) {
    if (isMatch(dayTypeOn(program, addDays(d, i)))) return "Testing can't be within 2 days before a match";
  }
  return null;
}

/** Add (battery) or remove (null) a testing day on a date. The day keeps its underlying day type. */
export function withTest(program: Program, key: string, battery: TestBattery | null): Program {
  const own = (e: CalendarEvent) => e.type !== 'break' && !e.teamName;
  const existing = (program.events ?? []).find((e) => e.date === key && own(e));
  const rest = (program.events ?? []).filter((e) => !(e.date === key && own(e)));
  const base = program.volleyballWeek[weekdayOf(fromKey(key))];
  if (battery) return { ...program, events: [...rest, { ...(existing ?? { date: key, type: base }), test: battery }] };
  if (!existing) return program;
  const { test: _t, ...ev } = existing;
  // An event that only existed for the test (same type as the usual week, no label) goes away.
  const keep = ev.type !== base || !!ev.label;
  return { ...program, events: keep ? [...rest, ev] : rest };
}

export function planForDate(program: Program, d: Date, athleteExperience?: Experience): DayPlan {
  return weekPlan(program, mondayOf(d), athleteExperience)[weekdayOf(d)];
}

/** Events from `from` onward, soonest first. */
export function upcomingEvents(program: Program, from: Date = today(), limit = 5): CalendarEvent[] {
  const k = dateKey(from);
  return [...(program.events ?? [])]
    .filter((e) => e.date >= k && (e.type === 'game' || e.type === 'tournament'))
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, limit);
}

export function formatKey(key: string, opts: Intl.DateTimeFormatOptions = { weekday: 'short', month: 'short', day: 'numeric' }) {
  return fromKey(key).toLocaleDateString(undefined, opts);
}

/** Set, change or clear (type null) the event on a date. */
export function withEvent(program: Program, key: string, type: DayType | null, label?: string): Program {
  // Only this program's own day event changes; breaks and other teams' events stay.
  const own = (e: CalendarEvent) => e.type !== 'break' && !e.teamName;
  const existing = (program.events ?? []).find((e) => e.date === key && own(e));
  const rest = (program.events ?? []).filter((e) => !(e.date === key && own(e)));
  // A testing day stays on the date unless the day becomes a match (then it can't be a testing day).
  const test = existing?.test && type !== 'game' && type !== 'tournament' ? existing.test : undefined;
  if (!type) {
    return { ...program, events: test ? [...rest, { date: key, type: program.volleyballWeek[weekdayOf(fromKey(key))], test }] : rest };
  }
  return { ...program, events: [...rest, { date: key, type, label: label?.trim() || undefined, ...(test ? { test } : {}) }] };
}

/** Set (session id or null = rest) or clear (undefined = back to automatic) the lift for a date. */
export function withOverride(program: Program, key: string, choice: string | null | undefined): Program {
  const overrides = { ...(program.overrides ?? {}) };
  if (choice === undefined) delete overrides[key];
  else overrides[key] = choice;
  return { ...program, overrides };
}
