import type { CalendarEvent, DayType, Experience, Program, Session, TestBattery } from './types';
import { WEEKDAYS } from './types';
import { sourceOf } from './source';
import { getExercise } from './exercises';
import { CAP_REPLACE_ORDER, homeTypeOf, isSetupProgram } from './homeV3';
import { FLAGS } from './flags';

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
 * 2.4.0: Approach-generated (every lift session is `source = 'approach'`), with the legacy rule of Legal ruling #1b
 * (`sourceOf` in source.ts).
 */
export function generatedWeek(program: Program): boolean {
  return program.sessions.filter((x) => !x.mobility).every((x) => sourceOf(program, x) === 'approach');
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
  const setup = isSetupProgram(program);
  for (let i = 0; i < 7; i++) {
    const sid = plan[i].sessionId;
    if (!sid || !isMatch(types[i])) continue;
    // 2.4.1 week setup (H4, §2e): a home workout on a match or tournament day is Off; mobility stays (the 12-min version).
    const s0 = session(sid);
    if (setup && s0?.mobility) continue;
    if (setup && s0?.location === 'home') {
      plan[i] = { ...plan[i], sessionId: null, source: 'auto', note: `${MATCH_WORD[types[i]]} day: no home workout` };
      continue;
    }
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
      (p, k) => k !== i && p.sessionId && !isHeavyLegs(session(p.sessionId)) && !isMatch(nextType(k)) && (!setup || isRoom(session(p.sessionId))),
    );
    if (j < 0) continue;
    const light = plan[j].sessionId;
    plan[j] = { ...plan[j], sessionId: plan[i].sessionId, source: 'auto', note: `Swapped with ${WEEKDAYS[i]}: legs stay fresh for the ${MATCH_WORD[nextType(i)]}` };
    plan[i] = { ...plan[i], sessionId: light, source: 'auto', note: `Lighter lift: ${MATCH_WORD[nextType(i)]} tomorrow` };
  }

  // 2.4.1 week setup, per athlete: one weight-room day alternates its two sessions week by week (§2a), and a home H-Lower /
  // H-Total the day before a match or next to a lower-heavy weight-room day becomes upper body or care (§2e: content, never
  // a day move).
  if (setup) setupContent(program, plan, types, nextType, monday);

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

  // 2.4.2 F59g: after a program's end date there's no session (UX proposal; Product to confirm). Rolling programs never end.
  if (FLAGS.plannerV3 && program.endDate) {
    for (const p of plan) if (p.date > program.endDate) Object.assign(p, { sessionId: null, note: 'Program finished', source: 'auto' as const });
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
  // 2.4.0 (spec §0.3, §1.1 item 5): generated weeks only. A coach-built program keeps every day the coach chose.
  if (!generatedWeek(program)) return plan;
  if (setup) return setupCaps(program, plan, athleteExperience);
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

/* ---------- 2.4.1 week setup (spec D2.5; home-and-mobility-v3 §2e, §5.3) ---------- */
const isRoom = (s: Session | undefined) => !!s && !s.location && !s.mobility && !s.light;
/** A weight-room session with a squat or hinge B-block (H5). */
const roomLowerHeavy = (s: Session | undefined) => isRoom(s) && s!.exercises.some((e) => e.role === 'main' && getExercise(e.exerciseId).category !== 'upper');

function setupContent(program: Program, plan: DayPlan[], types: DayType[], nextType: (i: number) => DayType, monday: Date) {
  const session = (id: string | null) => program.sessions.find((s) => s.id === id);
  // One weight-room day: the template's two sessions alternate week by week from the block start.
  const rooms = program.sessions.filter(isRoom);
  const scheduled = new Set(program.liftSchedule.filter((x): x is string => !!x && isRoom(session(x))));
  if (rooms.length === 2 && scheduled.size === 1) {
    const start = fromKey(program.blockStart ?? program.createdAt.slice(0, 10));
    const odd = Math.floor((monday.getTime() - mondayOf(start).getTime()) / (7 * 864e5)) % 2 === 1;
    const alt = rooms.find((r) => !scheduled.has(r.id));
    if (odd && alt) for (const p of plan) if (p.sessionId && scheduled.has(p.sessionId)) p.sessionId = alt.id;
  }
  // Part C: in-season bye week (no match or tournament Mon–Sun on the athlete's calendar): the second Day 2 Fast becomes Day 3.
  const bye = program.sessions.find((s) => s.name === 'Day 3 (bye week)');
  if (bye && !types.some((t) => isMatch(t))) {
    const fast2 = program.sessions.find((s) => / \(2 sets\)$/.test(s.name) && s.name.startsWith('Day 2'));
    if (fast2) for (const p of plan) if (p.sessionId === fast2.id) Object.assign(p, { sessionId: bye.id, note: 'Bye week: Day 3' });
  }
  const upperOrCare = program.sessions.filter((s) => ['H-Upper', 'H-Durability'].includes(homeTypeOf(s) ?? ''));
  const light = program.sessions.find((s) => s.light);
  for (let i = 0; i < 7; i++) {
    const t = homeTypeOf(session(plan[i].sessionId));
    if (t !== 'H-Lower' && t !== 'H-Total') continue;
    const beforeMatch = isMatch(nextType(i));
    const nextToHeavy = (i > 0 && roomLowerHeavy(session(plan[i - 1].sessionId))) || (i < 6 && roomLowerHeavy(session(plan[i + 1].sessionId)));
    if (!beforeMatch && !nextToHeavy) continue;
    const used = new Set(plan.map((p) => p.sessionId));
    const swap = upperOrCare.find((s) => !used.has(s.id)) ?? upperOrCare[0] ?? light;
    plan[i] = swap
      ? { ...plan[i], sessionId: swap.id, source: 'auto', note: beforeMatch ? `${MATCH_WORD[nextType(i)]} tomorrow: upper body or care at home` : 'Legs stay fresh: upper body or care at home' }
      : { ...plan[i], sessionId: null, source: 'auto', note: 'Rest day: legs stay fresh' };
  }
}

/**
 * Per-athlete limits for a week-setup program (spec D2.5, home-and-mobility §5.3). Weight room + home workouts count toward the
 * R6 cap; mobility never does and is never dropped for the cap.
 *  1. One home workout becomes the light day (order H-Durability → H-Lower → H-Total → H-Upper); 2. further home workouts are
 *  Off (same order); 3. weight-room days alone over the cap: the last one in template order is the light day (if unused), then
 *  Off; 4. H3: no fully Off day → the lowest-priority non-weight-room session is Off (home in cap order, then light, mobility last).
 */
function setupCaps(program: Program, plan: DayPlan[], athleteExperience?: Experience): DayPlan[] {
  const session = (id: string | null) => program.sessions.find((s) => s.id === id);
  const exp = athleteExperience && EXP_RANK[athleteExperience] < EXP_RANK[program.experience] ? athleteExperience : program.experience;
  const cap = capFor(exp, program.phase);
  const light = program.sessions.find((s) => s.light);
  let lightUsed = plan.some((p) => session(p.sessionId)?.light);
  const counts = (p: DayPlan) => !!p.test || (!!p.sessionId && !session(p.sessionId)?.mobility && !session(p.sessionId)?.light);
  let count = plan.filter(counts).length;
  const toLight = (p: DayPlan) => {
    if (light && !lightUsed && p.dayType !== 'game' && p.dayType !== 'tournament') {
      Object.assign(p, { sessionId: light.id, source: 'auto' as const, note: `Light day: max ${cap} full lift days for your level` });
      lightUsed = true;
    } else Object.assign(p, { sessionId: null, source: 'auto' as const, note: `Off: max ${cap} lift days a week` });
  };
  const rank = (p: DayPlan) => CAP_REPLACE_ORDER.indexOf(homeTypeOf(session(p.sessionId))!);
  const homes = plan.filter((p) => homeTypeOf(session(p.sessionId)) && p.source !== 'override').sort((a, b) => rank(a) - rank(b) || b.date.localeCompare(a.date));
  for (const p of homes) {
    if (count <= cap) break;
    toLight(p);
    count--;
  }
  if (count > cap) {
    const order = new Map(program.sessions.filter(isRoom).map((s, k) => [s.id, k]));
    const rooms = plan.filter((p) => isRoom(session(p.sessionId)) && !p.test && p.source !== 'override').sort((a, b) => (order.get(b.sessionId!) ?? 0) - (order.get(a.sessionId!) ?? 0));
    for (const p of rooms) {
      if (count <= cap) break;
      toLight(p);
      count--;
    }
  }
  if (!plan.some((p) => !p.sessionId && !p.test)) {
    const prio = (p: DayPlan) => {
      const s = session(p.sessionId);
      if (homeTypeOf(s)) return rank(p);
      if (s?.light) return 4;
      if (s?.mobility) return 5;
      return 99;
    };
    const p = plan.filter((x) => x.sessionId && !x.test && prio(x) < 99).sort((a, b) => prio(a) - prio(b))[0];
    if (p) Object.assign(p, { sessionId: null, source: 'auto' as const, note: 'Rest day: at least one day a week with no training' });
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
  // 2.4.0: the date's weight room time stays with the date.
  const room = typeof existing?.roomMinutes === 'number' ? { roomMinutes: existing.roomMinutes } : {};
  if (!type) {
    return { ...program, events: test || room.roomMinutes ? [...rest, { date: key, type: program.volleyballWeek[weekdayOf(fromKey(key))], ...(test ? { test } : {}), ...room }] : rest };
  }
  return { ...program, events: [...rest, { date: key, type, label: label?.trim() || undefined, ...(test ? { test } : {}), ...room }] };
}

/**
 * 2.4.0 F51c: "Weight room time on Wed Dec 3: 30 min" (null removes it). Kept on this team's own event for the date (a
 * usual-week event is added when there isn't one). Only this team's coach and members see it (V4).
 */
export function withRoomMinutes(program: Program, key: string, minutes: number | null): Program {
  const own = (e: CalendarEvent) => e.type !== 'break' && !e.teamName;
  const existing = (program.events ?? []).find((e) => e.date === key && own(e));
  const rest = (program.events ?? []).filter((e) => !(e.date === key && own(e)));
  const usual = program.volleyballWeek[weekdayOf(fromKey(key))];
  if (minutes == null) {
    if (!existing) return program;
    const { roomMinutes: _r, ...ev } = existing;
    // An event that only carried the room time goes away.
    const onlyRoom = ev.type === usual && !ev.label && !ev.test;
    return { ...program, events: onlyRoom ? rest : [...rest, ev] };
  }
  return { ...program, events: [...rest, { ...(existing ?? { date: key, type: usual }), roomMinutes: minutes }] };
}

/** Set (session id or null = rest) or clear (undefined = back to automatic) the lift for a date. */
export function withOverride(program: Program, key: string, choice: string | null | undefined): Program {
  const overrides = { ...(program.overrides ?? {}) };
  if (choice === undefined) delete overrides[key];
  else overrides[key] = choice;
  return { ...program, overrides };
}
