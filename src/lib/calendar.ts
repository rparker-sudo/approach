import type { CalendarEvent, DayType, Program, Session } from './types';
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

export function eventOn(program: Program, d: Date): CalendarEvent | undefined {
  const k = dateKey(d);
  return program.events?.find((e) => e.date === k);
}

/** A calendar event for that date, otherwise the default week. */
export function dayTypeOn(program: Program, d: Date): DayType {
  return eventOn(program, d)?.type ?? program.volleyballWeek[weekdayOf(d)];
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
};

const MATCH_WORD: Record<DayType, string> = { game: 'match', tournament: 'tournament', practice: 'practice', off: 'day off' };

/** The real plan for the 7 days starting at `monday`. */
export function weekPlan(program: Program, monday: Date): DayPlan[] {
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
  return plan;
}

export function planForDate(program: Program, d: Date): DayPlan {
  return weekPlan(program, mondayOf(d))[weekdayOf(d)];
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
  const rest = (program.events ?? []).filter((e) => e.date !== key);
  return { ...program, events: type ? [...rest, { date: key, type, label: label?.trim() || undefined }] : rest };
}

/** Set (session id or null = rest) or clear (undefined = back to automatic) the lift for a date. */
export function withOverride(program: Program, key: string, choice: string | null | undefined): Program {
  const overrides = { ...(program.overrides ?? {}) };
  if (choice === undefined) delete overrides[key];
  else overrides[key] = choice;
  return { ...program, overrides };
}
