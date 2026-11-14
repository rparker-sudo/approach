import { addDays, dateKey, fromKey, today as todayDate } from './calendar';
import { ALL_EQUIPMENT, EXERCISES, fits, getExercise } from './exercises';
import { BEGINNER_EFFORT, restSecFor } from './generator';
import { BlockInfo, sessionForDate } from './progression';
import { estimateMinutes } from './rest';
import type { Equipment, Exercise, Phase, Program, ProgramExercise, Session, WorkoutLog } from './types';

/**
 * The athlete layer (G-1, I1). Every session an athlete sees goes through `resolveSession`.
 * v2.2 pass 1 applies, in order:
 *  1. the day's version (deload week / coach-lightened day);
 *  2. level resolution for team programs (safety-guidelines §2a, G8);
 *  3. effort ceilings (R2: beginner 7, intermediate/advanced 8, in-season 7; returning from a break 6);
 *  4. rest (restFor tiers, coach setting within the floors);
 *  5. the session length estimate.
 * Pure functions; no React.
 */

export type Level = 1 | 2 | 3;

export type AthleteContext = {
  /** Level exercises resolve to: the lower of the athlete's team levels (Q-7), else their own experience. */
  level: Level;
  /** The athlete's whole workout history (G-2), for the return-from-break rule. */
  logs: WorkoutLog[];
};

export type ResolvedExercise = ProgramExercise & {
  /** The exercise in the coach's plan, when the athlete's version is different. */
  teamExerciseId?: string;
  /** Rest after each set for this athlete (coach setting within floors, else auto). */
  restSecResolved: number;
};

export type ResolvedSession = {
  session: Session;
  exercises: ResolvedExercise[];
  /** Slots with no version at the athlete's level (left out). */
  dropped: number;
  swaps: { from: string; to: string }[];
  block: BlockInfo;
  light: boolean;
  /** G9: returning from a break this week. */
  easing: Easing;
  estMinutes: number;
};

export type Easing = { active: boolean; until?: string };

/* ---------- 1.4 Return from a break (G9) ---------- */
/**
 * After 14+ days with no logged session (any program), the next 7 days are lighter:
 * strength effort tops out at RPE 6 and weight suggestions start about 10% lower.
 * The window starts on the first day back (the first log after the gap, or today if not logged yet).
 */
export function easingFor(logs: WorkoutLog[], today: Date = todayDate()): Easing {
  const days = [...new Set(logs.map((l) => dateKey(new Date(l.date))))].sort();
  if (!days.length) return { active: false };
  const t = dateKey(today);
  const gap = (a: string, b: string) => Math.round((fromKey(b).getTime() - fromKey(a).getTime()) / 864e5);
  const past = days.filter((d) => d < t);
  const last = past[past.length - 1];
  // Not logged since the gap started: today is day 1 of the lighter week.
  if (last && gap(last, t) >= 14 && !days.includes(t)) return { active: true, until: dateKey(addDays(today, 6)) };
  // Came back recently: find the first log after the most recent 14+ day gap.
  let start: string | null = null;
  for (let i = 1; i < days.length; i++) if (gap(days[i - 1], days[i]) >= 14) start = days[i];
  if (start && start <= t && gap(start, t) < 7) return { active: true, until: dateKey(addDays(fromKey(start), 6)) };
  return { active: false };
}

/* ---------- 1.1 Level resolution (safety-guidelines §2a) ---------- */
const STRENGTH_ROLES = new Set(['main', 'secondary', 'accessory']);
const isStrength = (pe: ProgramExercise, ex: Exercise) =>
  pe.role ? STRENGTH_ROLES.has(pe.role) : ex.category === 'lower' || ex.category === 'upper';

/**
 * The athlete's version of an exercise: keep it if it's at or below their level; else follow its `easier` chain
 * to the first exercise at or below their level that fits the program's equipment; else the lowest-level exercise
 * of the same pattern that fits; else null (drop the slot). Olympic lifts resolve to a jump below advanced.
 */
export function resolveExercise(ex: Exercise, level: Level, equipment: Equipment[]): Exercise | null {
  if (ex.level <= level && !(ex.pattern === 'olympic' && level < 3)) return ex;
  if (ex.pattern === 'olympic') {
    const jumps = EXERCISES.filter((e) => e.pattern === 'jump' && e.level <= level && fits(e, equipment));
    return jumps.find((e) => e.id === 'box-jump') ?? jumps.find((e) => e.id === 'squat-jump') ?? jumps[0] ?? null;
  }
  const seen = new Set<string>();
  let cur: Exercise | undefined = ex;
  while (cur?.easier && !seen.has(cur.easier)) {
    seen.add(cur.easier);
    cur = EXERCISES.find((e) => e.id === cur!.easier);
    if (cur && cur.level <= level && fits(cur, equipment)) return cur;
  }
  const same = EXERCISES.filter((e) => e.pattern === ex.pattern && e.level <= level && fits(e, equipment)).sort(
    (a, b) => a.level - b.level || a.id.localeCompare(b.id),
  );
  return same[0] ?? null;
}

/* ---------- 1.6 Effort ceilings ---------- */
export function effortCeiling(level: Level, phase: Phase, easing: boolean): number {
  if (easing) return 6;
  if (phase === 'in') return 7;
  return level === 1 ? 7 : 8;
}

/** Caps a strength effort at the ceiling. "Failure", "to failure" and "max" in strength work become the ceiling. */
export function capEffort(effort: string, ceiling: number): string {
  if (/fail|\bmax\b/i.test(effort)) return `RPE ${ceiling}`;
  const m = effort.match(/RPE\s*(\d+)(?:\s*[–-]\s*(\d+))?/i);
  if (!m) return effort;
  const lo = Number(m[1]);
  const hi = Number(m[2] ?? m[1]);
  if (hi <= ceiling) return effort;
  if (lo >= ceiling) return effort.replace(m[0], `RPE ${ceiling}`);
  return effort.replace(m[0], `RPE ${lo}–${ceiling}`);
}

/* ---------- resolveSession ---------- */
export function resolveSession(program: Program, session: Session, athlete: AthleteContext, date: Date = todayDate()): ResolvedSession {
  const day = sessionForDate(program, session, date);
  const equipment = program.equipment?.length ? program.equipment : ALL_EQUIPMENT;
  const easing = easingFor(athlete.logs, date);
  const team = !!program.teamId;
  const swaps: { from: string; to: string }[] = [];
  let dropped = 0;
  const out: ResolvedExercise[] = [];
  for (const pe of day.exercises) {
    const original = getExercise(pe.exerciseId);
    // Every program resolves to the athlete's level (team programs per G8; personal and shared programs as a backstop to G1).
    const resolved = resolveExercise(original, athlete.level, equipment);
    if (!resolved) {
      dropped++;
      continue;
    }
    let effort = pe.effort;
    if (resolved.id !== original.id) swaps.push({ from: original.name, to: resolved.name });
    if (isStrength(pe, resolved)) {
      if (team && athlete.level === 1) effort = BEGINNER_EFFORT[effort] ?? effort;
      effort = capEffort(effort, effortCeiling(athlete.level, program.phase, easing.active));
    }
    const next: ProgramExercise = { ...pe, exerciseId: resolved.id, effort };
    out.push({
      ...next,
      ...(resolved.id !== original.id ? { teamExerciseId: original.id } : {}),
      restSecResolved: restSecFor(next, { phase: program.phase, equipment: program.equipment }),
    });
  }
  const estMinutes = estimateMinutes(out.map((e) => ({ ex: getExercise(e.exerciseId), sets: e.sets, reps: e.reps, restSec: e.restSecResolved })));
  return { session: day.session, exercises: out, dropped, swaps, block: day.block, light: day.light, easing, estMinutes };
}

/** Swaps an athlete at a given level would get on a session (coach athlete detail). */
export function swapsFor(program: Program, session: Session, level: Level): { from: string; to: string | null }[] {
  const equipment = program.equipment?.length ? program.equipment : ALL_EQUIPMENT;
  const out: { from: string; to: string | null }[] = [];
  for (const pe of session.exercises) {
    const ex = getExercise(pe.exerciseId);
    const r = resolveExercise(ex, level, equipment);
    if (!r) out.push({ from: ex.name, to: null });
    else if (r.id !== ex.id) out.push({ from: ex.name, to: r.name });
  }
  return out;
}
