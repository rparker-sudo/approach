import type { EffortInput } from './backend/types';
import { addDays, breakOn, dateKey, fromKey, mondayOf, planForDate, today as todayDate } from './calendar';
import type { Program } from './types';

/**
 * Team effort board (P4). Ranks effort and improvement, never strength.
 * Pure functions: inputs come from team_effort (no weights, results, check-ins or nutrition).
 *
 * Rules (spec P4.1, compliance "Boards"):
 *  - Sessions: prescribed lift sessions completed. One counts per scheduled session per day; extras don't count.
 *  - Consistency: completed ÷ scheduled (sessions the calendar moved count on their new day). Today counts only once done.
 *  - Week streak: consecutive weeks with every prescribed session done. Weeks with no lifts (rest) never break it.
 *  - Hours: lift minutes + attended practice/match minutes, capped at 3 h a day and 15 h a week.
 *  - Jump gains (FA-4): inches gained in touch + broad jump vs. the first test in the range. Never %, never lift numbers.
 *  - Overall (D-024): points per OVERALL_POINTS. Extra recovery counts toward Hours and Overall only.
 *  - Breaks (TM-3): break days aren't scheduled, so they never lower Consistency; an all-break week neither breaks
 *    nor extends a streak, and earns no full-week points.
 *  - Two teams (D-027): athletes who follow another team's program (ranked = false) are left off Overall, Sessions,
 *    Extra recovery, Consistency and Streak; they stay on Attendance, Hours and Jump gains.
 */

export type EffortMetric = 'overall' | 'sessions' | 'extra' | 'consistency' | 'streak' | 'attendance' | 'hours' | 'jumpGains';
export const METRICS: { id: EffortMetric; label: string }[] = [
  { id: 'overall', label: 'Overall' },
  { id: 'sessions', label: 'Sessions' },
  { id: 'extra', label: 'Extra recovery' },
  { id: 'consistency', label: 'Consistency' },
  { id: 'streak', label: 'Streak' },
  { id: 'attendance', label: 'Attendance' },
  { id: 'hours', label: 'Hours' },
  { id: 'jumpGains', label: 'Jump gains' },
];

/** Overall points (D-024, signed off by Training Content 11/10). One config object. */
export const OVERALL_POINTS = { session: 10, extraRecovery: 5, extraPerWeek: 2, fullWeek: 5 } as const;
export const POINTS_LINE = `Session ${OVERALL_POINTS.session} · Extra recovery ${OVERALL_POINTS.extraRecovery} (up to ${OVERALL_POINTS.extraPerWeek} a week) · Full week ${OVERALL_POINTS.fullWeek}`;

/** Metrics that only count for athletes following this team's lift program (D-027). */
export const PROGRAM_METRICS: EffortMetric[] = ['overall', 'sessions', 'extra', 'consistency', 'streak'];

export const DAY_CAP_MIN = 180;
export const WEEK_CAP_MIN = 900;

export type EffortStats = {
  userId: string;
  boardName: string;
  isMe: boolean;
  /** Follows this team's lift program (D-027). */
  ranked: boolean;
  overall: number;
  /** Extra recovery sessions done (all of them; Overall counts at most 2 a week). */
  extra: number;
  sessions: number;
  scheduled: number;
  /** % (0–100), null when nothing was scheduled yet. */
  consistency: number | null;
  streak: number;
  /** Null without attendance permission. */
  attendance: number | null;
  hours: number;
  /** Inches. Null without testing permission or fewer than 2 jump tests. */
  jumpGains: number | null;
};

/** Dates (YYYY-MM-DD) from `since` through `until` with a prescribed lift session (mobility-only and testing days don't count). */
export function scheduledDays(program: Program, since: Date, until: Date): string[] {
  const out: string[] = [];
  for (let d = since; d <= until; d = addDays(d, 1)) {
    const p = planForDate(program, d);
    if (!p.sessionId || p.test) continue;
    const s = program.sessions.find((x) => x.id === p.sessionId);
    if (s && !s.mobility) out.push(p.date);
  }
  return out;
}

function weekKey(day: string) {
  return dateKey(mondayOf(fromKey(day)));
}

/** Lift + attendance minutes, capped at 3 h per day and 15 h per week. Returns hours (one decimal). */
export function cappedHours(perDay: Record<string, number>): number {
  const weeks: Record<string, number> = {};
  for (const [day, min] of Object.entries(perDay)) {
    const w = weekKey(day);
    weeks[w] = (weeks[w] ?? 0) + Math.min(DAY_CAP_MIN, Math.max(0, min));
  }
  const total = Object.values(weeks).reduce((n, m) => n + Math.min(WEEK_CAP_MIN, m), 0);
  return Math.round((total / 60) * 10) / 10;
}

/** Consecutive weeks (newest first) with every prescribed session done. Rest weeks are skipped, not breaks. */
export function weekStreak(scheduled: string[], done: Set<string>, today: Date): number {
  const todayKey = dateKey(today);
  const byWeek = new Map<string, string[]>();
  for (const d of scheduled) {
    const w = weekKey(d);
    byWeek.set(w, [...(byWeek.get(w) ?? []), d]);
  }
  const weeks = [...byWeek.keys()].sort().reverse();
  let streak = 0;
  for (const w of weeks) {
    const days = byWeek.get(w)!;
    const missed = days.filter((d) => !done.has(d) && d < todayKey);
    const pending = days.filter((d) => !done.has(d) && d >= todayKey);
    if (missed.length) break;
    if (pending.length) continue; // this week can still be completed: neither counts nor breaks
    streak++;
  }
  return streak;
}

/**
 * Stats for each member. `programFor` returns the team workout the member follows
 * (their group's, else the whole team's), with the team calendar applied.
 * `scheduledThrough` is the last day schedules count to (normally today, via planned sessions up to the end of today's week for streaks).
 */
export function computeEffort(
  rows: EffortInput[],
  programFor: (groupId: string | null) => Program | undefined,
  since: Date,
  today: Date = todayDate(),
): EffortStats[] {
  const todayKey = dateKey(today);
  const weekEnd = addDays(mondayOf(today), 6);
  return rows.map((r) => {
    const program = programFor(r.groupId);
    const lifts = r.logs.filter((l) => (l.kind ?? 'lift') === 'lift');
    const extras = r.logs.filter((l) => l.kind === 'extra_recovery' && dateKey(new Date(l.at)) >= dateKey(since) && dateKey(new Date(l.at)) <= todayKey);
    const logDays = new Set(lifts.map((l) => dateKey(new Date(l.at))));
    // Scheduled through the end of this week (for streaks); consistency uses past days plus today once done.
    const planned = program ? scheduledDays(program, since, weekEnd) : [];
    const pastOrToday = planned.filter((d) => d < todayKey || (d === todayKey && logDays.has(d)));
    const done = new Set(pastOrToday.filter((d) => logDays.has(d)));
    const perDay: Record<string, number> = {};
    for (const l of r.logs) {
      const d = dateKey(new Date(l.at));
      if (d < dateKey(since) || d > todayKey) continue;
      perDay[d] = (perDay[d] ?? 0) + Math.min(120, Math.max(0, l.minutes ?? 0));
    }
    for (const a of r.attendance ?? []) {
      if (a.day < dateKey(since) || a.day > todayKey) continue;
      perDay[a.day] = (perDay[a.day] ?? 0) + a.minutes;
    }
    // Overall: 10 per prescribed session, 5 per extra recovery (max 2 counted per Mon–Sun week), 5 per full week
    // (every prescribed session that week done), awarded when the week ends.
    const extraWeeks: Record<string, number> = {};
    for (const l of extras) {
      const w = weekKey(dateKey(new Date(l.at)));
      extraWeeks[w] = (extraWeeks[w] ?? 0) + 1;
    }
    const extraPts = Object.values(extraWeeks).reduce((n, c) => n + Math.min(OVERALL_POINTS.extraPerWeek, c), 0) * OVERALL_POINTS.extraRecovery;
    const fullWeeks = fullWeeksDone(planned, logDays, today);
    return {
      userId: r.userId,
      boardName: r.boardName,
      isMe: r.isMe,
      ranked: r.ranked ?? true,
      overall: done.size * OVERALL_POINTS.session + extraPts + fullWeeks * OVERALL_POINTS.fullWeek,
      extra: extras.length,
      sessions: done.size,
      scheduled: pastOrToday.length,
      consistency: pastOrToday.length ? Math.round((done.size / pastOrToday.length) * 100) : null,
      streak: weekStreak(planned, logDays, today),
      attendance: r.attendance ? r.attendance.filter((a) => a.day >= dateKey(since) && a.day <= todayKey).length : null,
      hours: cappedHours(perDay),
      jumpGains: r.jumpGain,
    };
  });
}

/** Weeks that have ended with at least one prescribed session and all of them done (rest and break days don't matter). */
export function fullWeeksDone(scheduled: string[], done: Set<string>, today: Date): number {
  const thisWeek = dateKey(mondayOf(today));
  const byWeek = new Map<string, string[]>();
  for (const d of scheduled) byWeek.set(weekKey(d), [...(byWeek.get(weekKey(d)) ?? []), d]);
  return [...byWeek.entries()].filter(([w, days]) => w < thisWeek && days.every((d) => done.has(d))).length;
}

export function metricValue(s: EffortStats, m: EffortMetric): number | null {
  switch (m) {
    case 'overall':
      return s.overall;
    case 'extra':
      return s.extra;
    case 'consistency':
      return s.consistency;
    case 'sessions':
      return s.sessions;
    case 'streak':
      return s.streak;
    case 'attendance':
      return s.attendance;
    case 'hours':
      return s.hours;
    case 'jumpGains':
      return s.jumpGains;
  }
}

export function formatMetric(v: number | null, m: EffortMetric): string {
  if (v == null) return '–';
  switch (m) {
    case 'consistency':
      return `${v}%`;
    case 'streak':
      return `${v} wk`;
    case 'hours':
      return `${v} h`;
    case 'overall':
      return `${v} pts`;
    case 'jumpGains':
      return `${v > 0 ? '+' : ''}${v} in`;
    default:
      return String(v);
  }
}

/** rank 0 / value null: listed without a rank ("–"), e.g. consistency before anything was scheduled. */
export type Ranked = { stats: EffortStats; rank: number; value: number | null };

/**
 * One ranked list per metric. Ties share a rank (1, 1, 3).
 * Attendance and improvement leave out members without permission. Consistency lists members with nothing
 * scheduled yet at the end, unranked.
 */
export function rank(stats: EffortStats[], m: EffortMetric): Ranked[] {
  const all = stats.filter((s) => s.ranked || !PROGRAM_METRICS.includes(m)).map((s) => ({ stats: s, value: metricValue(s, m) }));
  const rows = all
    .filter((r): r is { stats: EffortStats; value: number } => r.value != null)
    .sort((a, b) => b.value - a.value || a.stats.boardName.localeCompare(b.stats.boardName));
  let lastValue: number | null = null;
  let lastRank = 0;
  const ranked: Ranked[] = rows.map((r, i) => {
    const rnk = r.value === lastValue ? lastRank : i + 1;
    lastValue = r.value;
    lastRank = rnk;
    return { ...r, rank: rnk };
  });
  if (m !== 'consistency') return ranked;
  const unranked = all.filter((r) => r.value == null).sort((a, b) => a.stats.boardName.localeCompare(b.stats.boardName));
  return [...ranked, ...unranked.map((r) => ({ stats: r.stats, value: null, rank: 0 }))];
}

/** Top 10, plus the viewer's own row pinned at the bottom when they're below it (P4.3). */
export function topWithMe(list: Ranked[], n = 10): { top: Ranked[]; me: Ranked | null } {
  const top = list.slice(0, n);
  const mine = list.find((r) => r.stats.isMe);
  return { top, me: mine && !top.includes(mine) ? mine : null };
}

/** Default team goal (P4.5): athletes × prescribed sessions/week × weeks remaining × 0.8. */
export function defaultTeamGoal(athletes: number, sessionsPerWeek: number, weeksRemaining: number): number {
  return Math.round(athletes * sessionsPerWeek * Math.max(1, weeksRemaining) * 0.8);
}

/** Weeks from today to the team's last match or tournament on the calendar (8 when none are set).
 *  Weeks that are entirely a coach-set break are left out (TM-3: excluded from the default team goal). */
export function weeksRemaining(program: Program | undefined, today: Date = todayDate()): number {
  const last = (program?.events ?? [])
    .filter((e) => (e.type === 'game' || e.type === 'tournament') && !e.teamName)
    .map((e) => e.date)
    .sort()
    .pop();
  const weeks = last ? Math.max(1, Math.ceil((fromKey(last).getTime() - today.getTime()) / (7 * 864e5))) : 8;
  if (!program) return weeks;
  let breakWeeks = 0;
  for (let w = 0; w < weeks; w++) {
    const mon = addDays(mondayOf(today), 7 * w);
    if (Array.from({ length: 7 }, (_, i) => addDays(mon, i)).every((d) => !!breakOn(program, d))) breakWeeks++;
  }
  return Math.max(1, weeks - breakWeeks);
}

/** Private badges (P4.7), for the athlete's own Progress tab only. */
export function badges(me: EffortStats | undefined, blockDone: boolean, newTouchBest: boolean): string[] {
  const out: string[] = [];
  if (me && me.streak >= 4) out.push('4-week streak');
  if (blockDone) out.push('Block complete');
  if (newTouchBest) out.push('New touch best');
  return out;
}

/** Season start: when the team workout was built. Block start: start of the current training block. */
export function seasonStart(program: Program | undefined): Date {
  return program ? fromKey(program.createdAt.slice(0, 10)) : addDays(todayDate(), -90);
}

export function blockStart(program: Program | undefined, today: Date = todayDate()): Date {
  if (!program) return addDays(today, -28);
  const start = fromKey(program.blockStart ?? program.createdAt.slice(0, 10));
  const weeks = Math.max(2, program.blockWeeks ?? 4);
  const days = Math.max(0, Math.floor((today.getTime() - start.getTime()) / 864e5));
  return addDays(start, Math.floor(days / (weeks * 7)) * weeks * 7);
}

/** Every prescribed session in the last finished block was done. */
export function lastBlockComplete(program: Program | undefined, logDays: Set<string>, today: Date = todayDate()): boolean {
  if (!program) return false;
  const cur = blockStart(program, today);
  const weeks = Math.max(2, program.blockWeeks ?? 4);
  const prev = addDays(cur, -weeks * 7);
  if (prev < fromKey(program.createdAt.slice(0, 10))) return false;
  const days = scheduledDays(program, prev, addDays(cur, -1));
  return days.length > 0 && days.every((d) => logDays.has(d));
}

/** Prescribed lift sessions per week in a program (mobility-only sessions don't count). */
export function liftDaysOf(program: Program): number {
  return program.liftSchedule.filter((sid) => sid && !program.sessions.find((s) => s.id === sid)?.mobility).length;
}
