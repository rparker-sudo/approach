import type { Equipment, Exercise, Phase, ProgramExercise, SlotRole } from './types';

/**
 * Rest times, session length and demand tiers (v2.2 pass 1, `rest-and-supersets.md` §2, §3, §5, §7).
 * Pure functions; no React.
 */

export type Tier = 'P' | 'A' | 'B' | 'C' | 'D';

/** §7 tier assignments for all exercises (64 + 6 mobility + 4 home). */
const TIERS: Record<string, Tier> = {};
const add = (t: Tier, ids: string[]) => ids.forEach((id) => (TIERS[id] = t));
add('P', ['pogo', 'squat-jump', 'broad-jump', 'box-jump', 'lateral-bound', 'trap-bar-jump', 'hang-clean', 'mb-slam', 'mb-overhead', 'mb-rotational', 'mb-chest-pass', 'kb-swing']);
add('A', ['back-squat', 'front-squat', 'trap-bar-deadlift', 'rdl', 'bench', 'hip-thrust']);
add('B', [
  'goblet-squat', 'db-rdl2', 'nordic', 'reverse-lunge', 'split-squat', 'step-up', 'db-rdl', 'lateral-lunge', 'db-floor-press', 'db-bench',
  'db-shoulder-press', 'landmine-press', 'pike-pushup', 'pushup', 'incline-pushup', 'db-row', 'cable-row', 'inverted-row', 'lat-pulldown',
  'pullup', 'doorframe-row', 'bodyweight-squat', 'glute-bridge',
]);
add('C', [
  'band-good-morning', 'calf-raise', 'band-row', 'band-pulldown', 'prone-pulldown', 'suitcase-carry', 'farmer-carry', 'backpack-carry',
  'dead-bug', 'plank', 'ab-rollout', 'side-plank', 'pallof', 'wall-sit', 'copenhagen', 'spanish-squat', 'wrist-roller',
]);
add('D', [
  'tib-raise', 'ankle-balance', 'band-er', 'band-pull-apart', 'face-pull', 'ytw', 'scap-pushup', 'worlds-greatest', 'hip-90-90',
  'thoracic-rotation', 'crocodile-breathing', 'cat-camel', 'hip-flexor-stretch', 'ankle-rock', 'lat-reach', 'band-hamstring',
]);

/** Tier from §7. `hip-thrust` is tier A only when done with a barbell setup, otherwise B. Unknown ids fall back by category. */
export function tierOf(ex: Exercise, equipment?: Equipment[]): Tier {
  if (ex.id === 'hip-thrust') return !equipment || equipment.includes('barbell') ? 'A' : 'B';
  const t = TIERS[ex.id];
  if (t) return t;
  // 2.3.0 general library: tiers come from general-library.md §4a (only those exercises carry `scope`).
  if (ex.scope) return ex.tier;
  if (ex.category === 'power') return 'P';
  if (ex.category === 'prehab') return 'D';
  if (ex.category === 'core') return 'C';
  return 'B';
}

export const TIER_IDS = TIERS;

/** Floors (MUST): tier A ≥ 2:00, tier P ≥ 1:30, even if the coach typed less. */
export const REST_FLOOR: Partial<Record<Tier, number>> = { A: 120, P: 90 };
export const FLOOR_MESSAGE: Partial<Record<Tier, string>> = {
  A: 'Heavy lifts need at least 2:00 rest.',
  P: 'Power work needs at least 1:30 rest.',
};

export type RestContext = {
  phase?: Phase;
  equipment?: Equipment[];
  /** Bodyweight home session (pass 3). */
  home?: boolean;
  /** Light home day or extra recovery (pass 2/3). */
  light?: boolean;
  /** Testing-day load attempt. */
  testing?: boolean;
};

/** Top of the prescribed rep range; null for holds, carries and timed work. */
export function topReps(reps: string): number | null {
  if (/\d\s*s\b|yd|sec|breath/i.test(reps)) return null;
  const nums = reps.match(/\d+/g)?.map(Number) ?? [];
  if (!nums.length) return null;
  return nums[nums.length > 1 ? 1 : 0];
}

function rpeOf(effort: string): number | null {
  // "RPE 7–8" counts as 7 (the adjustment is for sets prescribed at RPE 8 or above).
  const m = effort.match(/RPE\s*(\d+)/i);
  return m ? Number(m[1]) : null;
}

const round15 = (n: number) => Math.round(n / 15) * 15;

/** §3 rest table for straight sets, with the listed adjustments. Seconds between sets. */
export function restFor(ex: Exercise, rx: Pick<ProgramExercise, 'reps' | 'effort'> & { role?: SlotRole }, ctx: RestContext = {}): number {
  if (ctx.testing) return 180;
  if (ctx.light) return 30;
  const tier = tierOf(ex, ctx.equipment);
  const top = topReps(rx.reps);
  const col = top == null ? 3 : top <= 5 ? 0 : top <= 8 ? 1 : top <= 12 ? 2 : 3;
  const TABLE: Record<Tier, number[]> = {
    P: [ex.pattern === 'olympic' ? 150 : 120, 120, 120, 120],
    A: [180, 150, 120, 90],
    B: [120, 90, 75, 60],
    C: [75, 60, 60, 45],
    D: [30, 30, 30, 30],
  };
  let rest = TABLE[tier][col];
  const rpe = rpeOf(rx.effort);
  if ((tier === 'P' && /max effort/i.test(rx.effort)) || (tier === 'A' && rpe != null && rpe >= 8)) {
    rest = Math.max(TABLE[tier][0], rest + 30);
  }
  if (ctx.home) {
    if (tier === 'B') rest = Math.min(rest, 90);
    if (tier === 'C') rest = 45;
  }
  return Math.max(REST_FLOOR[tier] ?? 0, round15(rest));
}

/** Apply the floors to any rest value (coach-set or auto). */
export function withFloor(ex: Exercise, sec: number, equipment?: Equipment[]): number {
  return Math.max(REST_FLOOR[tierOf(ex, equipment)] ?? 0, sec);
}

/** §5 session length targets, minutes. */
export function lengthTarget(phase: Phase, kind: 'school' | 'home' | 'light' = 'school'): number {
  if (kind === 'home') return 30;
  if (kind === 'light') return 20;
  return phase === 'off' ? 60 : phase === 'pre' ? 50 : phase === 'in' ? 40 : 45;
}

/**
 * §5 estimate: warm-up (8 min school, 5 home) + for each exercise sets × (work + rest).
 * Work: about 3 s per rep (one-sided "each" counts both sides), 40 s for holds and carries, 20 s for one jump set.
 */
export function estimateMinutes(
  items: { ex: Exercise; sets: number; reps: string; restSec: number }[],
  kind: 'school' | 'home' = 'school',
): number {
  let sec = (kind === 'home' ? 5 : 8) * 60;
  for (const it of items) {
    const top = topReps(it.reps);
    let work: number;
    if (top == null) work = 40;
    else if (it.ex.pattern === 'jump' || it.ex.pattern === 'throw') work = 20;
    else work = top * 3 * (/each/i.test(it.reps) ? 2 : 1);
    sec += it.sets * (work + it.restSec);
  }
  return Math.round(sec / 60);
}

/** "about 45 min" (rounded to 5). */
export function formatMinutes(min: number): string {
  return `about ${Math.max(5, Math.round(min / 5) * 5)} min`;
}
