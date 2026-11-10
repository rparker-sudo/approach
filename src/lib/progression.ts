import { planForDate } from './calendar';
import { ALL_EQUIPMENT, getExercise } from './exercises';
import { testedWeight } from './testing';
import type { Equipment, Exercise, Phase, Program, ProgramExercise, Session, WorkoutLog } from './types';

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
  /** 'test': set from a strength check (P6.7). */
  reason: 'up' | 'same' | 'down' | 'test';
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

/** How the exercise is loaded with this gym's equipment (best setup available). */
function loading(ex: Exercise, equipment: Equipment[]): 'barbell' | 'dumbbell' | 'band' | 'other' {
  const setups = ex.equipment.filter((setup) => setup.every((i) => equipment.includes(i)));
  const list = setups.length ? setups : ex.equipment;
  if (list.some((s) => s.some((i) => i === 'barbell' || i === 'trap-bar'))) return 'barbell';
  if (list.some((s) => s.some((i) => i === 'dumbbells' || i === 'kettlebells'))) return 'dumbbell';
  if (list.every((s) => s.includes('bands'))) return 'band';
  return 'other';
}

/**
 * G5 progression cap: about 10% of the last weight, rounded down to 2.5 lb (at least 2.5),
 * and no more than +10 lb (barbell) or +5 lb (dumbbell, kettlebell, cable).
 */
export function increaseFor(lastWeight: number, kind: 'barbell' | 'dumbbell' | 'other'): number {
  const tenPct = Math.floor((lastWeight * 0.1) / 2.5) * 2.5;
  return Math.min(kind === 'barbell' ? 10 : 5, Math.max(2.5, tenPct));
}

/**
 * Suggested weight for the next session of an exercise (weighted lifts only).
 * Hit the top of the rep range on every set → add a small, capped step. In range → same.
 * Below the range two sessions in a row → drop ~5%.
 * No suggestions for band-only setups or timed/hold exercises.
 */
export function suggestWeight(
  logs: WorkoutLog[],
  pe: ProgramExercise,
  equipment: Equipment[] = ALL_EQUIPMENT,
  /** Latest strength-check estimate for this lift, and the program's phase (P6.7). */
  test?: { e1rm: number; phase: Phase },
): Suggestion | null {
  const ex = getExercise(pe.exerciseId);
  const range = repRange(pe.reps);
  if (!ex.weighted || !range || /\bhold\b/i.test(ex.name)) return null;
  const kind = loading(ex, equipment);
  if (kind === 'band') return null;
  const base = progressionSuggestion(logs, pe, range, kind);
  if (!test || (kind !== 'barbell' && kind !== 'dumbbell')) return base;
  // Tested lift: never above e1RM × the phase's upper %; a lower re-test lowers it.
  const step = kind === 'barbell' ? 5 : 2.5;
  const w = testedWeight(test.e1rm, test.phase, base?.weight ?? null, step);
  if (!base) return { weight: w, delta: 0, last: 'From your strength check', reason: 'test' };
  if (w >= base.weight) return base;
  const lastTop = base.weight - base.delta;
  return { weight: w, delta: w - lastTop, last: base.last, reason: 'test' };
}

function progressionSuggestion(
  logs: WorkoutLog[],
  pe: ProgramExercise,
  range: [number, number],
  kind: 'barbell' | 'dumbbell' | 'other',
): Suggestion | null {
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
    const inc = increaseFor(top, kind);
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
