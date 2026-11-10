import type { JumpTestId, LoadTestId, Perms } from './backend/types';
import { canTest } from './backend/types';
import { isLow } from './readiness';
import type { Equipment, Experience, Phase, ReadinessEntry, TestBattery } from './types';

/**
 * Testing days (P6, Training Content safety guidelines §4a as restated in the spec).
 * Copy rule: "Testing day" / "Strength check". No max wording (docs/compliance.md); estimates are always labeled.
 */

export const BATTERY_LABEL: Record<TestBattery, string> = { full: 'Full battery', jump: 'Jump tests', mid: 'Mid-season check' };

export const JUMP_TESTS: { id: JumpTestId; name: string; unit: 'in' | 'ft'; hint: string }[] = [
  { id: 'touch', name: 'Approach touch', unit: 'in', hint: 'Highest touch with your full approach, in inches.' },
  { id: 'broad', name: 'Broad jump', unit: 'in', hint: 'From the start line to your back heel, in inches.' },
  { id: 'throw', name: 'Med-ball overhead throw', unit: 'ft', hint: 'Distance in feet.' },
];

export const LOAD_NAMES: Record<LoadTestId, string> = {
  'trap-bar-deadlift': 'Trap bar deadlift',
  'back-squat': 'Back squat',
  bench: 'Bench press',
  'goblet-squat': 'Goblet squat',
  'db-bench': 'Dumbbell bench press',
};

/** Strength checks in the battery, in order (power first: jumps come before these). */
export function loadTestsFor(battery: TestBattery, equipment: Equipment[]): LoadTestId[] {
  if (battery === 'jump') return [];
  const has = (e: Equipment) => equipment.includes(e);
  const out: LoadTestId[] = [];
  if (has('trap-bar')) out.push('trap-bar-deadlift');
  if (battery === 'mid') return out;
  if (has('barbell')) {
    out.push('back-squat');
    if (has('bench')) out.push('bench');
  } else if (has('dumbbells') || has('kettlebells')) {
    // Dumbbell gyms: goblet squat and DB bench, 8-rep checks.
    out.push('goblet-squat');
    if (has('dumbbells') && has('bench')) out.push('db-bench');
  }
  return out;
}

/** Reps for a strength check: 5RM (advanced may choose 3RM on squat and bench); dumbbell checks are 8RM. */
export function repOptions(id: LoadTestId, experience: Experience): number[] {
  if (id === 'goblet-squat' || id === 'db-bench') return [8];
  if ((id === 'back-squat' || id === 'bench') && experience === 'advanced') return [5, 3];
  return [5];
}

export const isDumbbellTest = (id: LoadTestId) => id === 'goblet-squat' || id === 'db-bench';

export type Eligibility = { jumps: boolean; strength: boolean; note: string | null };

/**
 * P6.4 eligibility, checked per athlete. Load tests need: on a team, testing permission, intermediate or advanced,
 * not a solo program, and today's check-in isn't pain or "run down" (or, without check-in permission, the on-the-spot
 * "Any pain today?" answer, which isn't stored).
 */
export function eligibility(opts: {
  onTeam: boolean;
  perms: Perms | undefined;
  experience: Experience;
  todayCheckIn?: Pick<ReadinessEntry, 'sleep' | 'soreness' | 'energy' | 'pain'>;
  /** Answer to "Any pain today?" when the athlete has no check-in permission (not saved). */
  painToday?: boolean | null;
}): Eligibility {
  if (!opts.onTeam) return { jumps: true, strength: false, note: 'Strength checks are for athletes on a team, with their coach.' };
  if (!canTest(opts.perms)) return { jumps: false, strength: false, note: "Testing isn't turned on for you on this team." };
  if (opts.experience === 'beginner') return { jumps: true, strength: false, note: 'Strength checks are for intermediate and advanced athletes' };
  const ci = opts.todayCheckIn;
  if ((ci && (ci.pain || isLow(ci))) || opts.painToday) return { jumps: true, strength: false, note: 'Skip strength checks today. Talk to your coach.' };
  return { jumps: true, strength: true, note: null };
}

/** Working-weight range from a strength check, by phase (P6.7). */
export const PHASE_RANGE: Record<Phase, [number, number]> = { off: [0.7, 0.8], pre: [0.75, 0.85], in: [0.7, 0.8], post: [0.6, 0.7] };

/** Round down to the loading step (5 lb barbell, 2.5 lb dumbbell) so a cap is never exceeded. */
export function roundDown(w: number, step: number): number {
  return Math.max(step, Math.floor(w / step) * step);
}

/**
 * Working weight for a tested lift: min(e1RM × phase upper %, progression suggestion); with no history, e1RM × phase lower %.
 * The RPE target still rules: if it's hit at a lower weight, the athlete uses the lower weight.
 */
export function testedWeight(est: number, phase: Phase, progression: number | null, step: number): number {
  const [lo, hi] = PHASE_RANGE[phase];
  const cap = roundDown(est * hi, step);
  if (progression == null) return roundDown(est * lo, step);
  return Math.min(cap, roundDown(progression, step));
}

/** Best of up to three attempts. */
export function bestOf(attempts: (number | null)[]): number | null {
  const v = attempts.filter((a): a is number => a != null && a > 0);
  return v.length ? Math.max(...v) : null;
}

/**
 * Warm-up ladder shown before each strength check, as a checklist. The spec refers to §4a for it, which isn't in
 * the repo; this generic ladder is a placeholder for Training Content to confirm.
 */
export const WARMUP_LADDER = ['Empty bar or a light weight × 8', 'About half your working weight × 5', 'About 70% × 3', 'About 85% × 1–2'];

export const TEST_REST_SEC = 180;
