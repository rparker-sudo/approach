import { planForDate } from './calendar';
import { getExercise } from './exercises';
import type { Program, ProgramExercise, Session, WorkoutLog } from './types';

/**
 * Weekly progression.
 *  - Blocks: weeks 1..N-1 build, the last week deloads (default 4-week blocks).
 *  - Suggested weight (double progression) from the athlete's last log of an exercise.
 *  - Lighter days (deload week or a coach-lightened date) use fewer sets and easy effort.
 */

const DAY = 864e5;

function localMidnight(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function startOf(program: Program): Date {
  const key = program.blockStart ?? program.createdAt.slice(0, 10);
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export type BlockInfo = { week: number; weeks: number; deload: boolean; label: string };

export function blockInfo(program: Program, date: Date = new Date()): BlockInfo {
  const weeks = Math.max(2, program.blockWeeks ?? 4);
  const days = Math.floor((localMidnight(date).getTime() - startOf(program).getTime()) / DAY);
  const week = (((Math.floor(Math.max(days, 0) / 7) % weeks) + weeks) % weeks) + 1;
  const deload = week === weeks;
  return { week, weeks, deload, label: deload ? `Deload week (${week} of ${weeks})` : `Week ${week} of ${weeks}` };
}

/** Make a session lighter: ~40% fewer sets on strength work, easy effort. Light days also drop power work. */
export function lighten(exercises: ProgramExercise[], kind: 'deload' | 'light'): ProgramExercise[] {
  return exercises
    .filter((e) => !(kind === 'light' && (e.role ?? roleGuess(e)) === 'power'))
    .map((e) => {
      const role = e.role ?? roleGuess(e);
      if (role === 'care' || role === 'mobility' || role === 'core') return e;
      return {
        ...e,
        sets: Math.max(1, Math.round(e.sets * 0.6)),
        effort: role === 'power' ? 'Easy, fast' : 'Easy',
      };
    });
}

function roleGuess(e: ProgramExercise) {
  const c = getExercise(e.exerciseId).category;
  return c === 'power' ? 'power' : c === 'prehab' ? 'care' : c === 'core' ? 'core' : 'secondary';
}

/** "6–8" → [6, 8]; "5" → [5, 5]; "8 each" → [8, 8]; "30s" → null (timed). */
export function repRange(reps: string): [number, number] | null {
  if (/\d\s*s\b|yd|sec/i.test(reps)) return null;
  const nums = reps.match(/\d+/g)?.map(Number) ?? [];
  if (!nums.length) return null;
  return [nums[0], nums[1] ?? nums[0]];
}

export type Suggestion = {
  weight: number;
  /** Change from last time (lb), 0 = same. */
  delta: number;
  /** e.g. "135 × 8, 8, 8" */
  last: string;
  reason: 'up' | 'same' | 'down';
};

const round5 = (n: number) => Math.max(5, Math.round(n / 5) * 5);

type SetRecord = { weight: number; reps: number };

function doneSets(log: WorkoutLog, exerciseId: string): SetRecord[] {
  const entry = log.entries.find((e) => e.exerciseId === exerciseId);
  if (!entry) return [];
  return entry.sets
    .filter((s) => s.done)
    .map((s) => ({ weight: parseFloat(s.weight) || 0, reps: parseFloat(s.reps) || 0 }))
    .filter((s) => s.weight > 0);
}

/**
 * Suggested weight for the next session of an exercise (weighted lifts only).
 * Hit the top of the rep range on every set → add weight. In range → same.
 * Below the range two sessions in a row → drop ~5%.
 */
export function suggestWeight(logs: WorkoutLog[], pe: ProgramExercise): Suggestion | null {
  const ex = getExercise(pe.exerciseId);
  const range = repRange(pe.reps);
  if (!ex.weighted || !range) return null;
  const history = logs
    .filter((l) => doneSets(l, pe.exerciseId).length)
    .sort((a, b) => b.date.localeCompare(a.date));
  if (!history.length) return null;
  const last = doneSets(history[0], pe.exerciseId);
  const top = Math.max(...last.map((s) => s.weight));
  const working = last.filter((s) => s.weight === top);
  const lastText = `${top} × ${working.map((s) => s.reps).join(', ')}`;
  const [lo, hi] = range;
  if (working.every((s) => s.reps >= hi) && working.length >= Math.min(pe.sets, 2)) {
    const inc = 5;
    return { weight: top + inc, delta: inc, last: lastText, reason: 'up' };
  }
  const missed = (sets: SetRecord[]) => sets.some((s) => s.reps < lo);
  if (missed(working) && history[1] && missed(doneSets(history[1], pe.exerciseId))) {
    const w = round5(top * 0.95);
    return { weight: w, delta: w - top, last: lastText, reason: 'down' };
  }
  return { weight: top, delta: 0, last: lastText, reason: 'same' };
}

export type DaySession = {
  session: Session;
  /** Exercises as they should be done that day (deload / light applied). */
  exercises: ProgramExercise[];
  block: BlockInfo;
  light: boolean;
};

/** A session as it should be done on a given date. Coach-lightened days win over deload weeks. */
export function sessionForDate(program: Program, session: Session, date: Date = new Date()): DaySession {
  const block = blockInfo(program, date);
  const light = !!planForDate(program, date).light;
  const exercises = light ? lighten(session.exercises, 'light') : block.deload ? lighten(session.exercises, 'deload') : session.exercises;
  return { session, exercises, block, light };
}
