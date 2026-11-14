import type { JumpTestId, LoadTestId, Perms, TestResult } from './backend/types';
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
  /** v2.2 level rule (spec 1.1, Q-7): minors need this team's coach-confirmed intermediate/advanced and no coach-set
   *  beginner on another team; adults need the lower of their levels to be intermediate or above. */
  levelOk: boolean;
  /** v2.2: a match or tournament within 48 hours on any of the athlete's teams (union), or a break. */
  scheduleBlocked?: boolean;
  todayCheckIn?: Pick<ReadinessEntry, 'sleep' | 'soreness' | 'energy' | 'pain'>;
  /** Answer to "Any pain today?" when the athlete has no check-in permission (not saved). */
  painToday?: boolean | null;
}): Eligibility {
  if (!opts.onTeam) return { jumps: true, strength: false, note: 'Strength checks are for athletes on a team, with their coach.' };
  if (!canTest(opts.perms)) return { jumps: false, strength: false, note: "Testing isn't turned on for you on this team." };
  if (!opts.levelOk) return { jumps: true, strength: false, note: 'Strength checks are for intermediate and advanced athletes, with a level your coach has confirmed.' };
  if (opts.scheduleBlocked) return { jumps: true, strength: false, note: 'Skip strength checks today. Talk to your coach.' };
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

/**
 * P6.10 change since last test (private: athlete and coach only). Compared with the athlete's most recent earlier
 * non-voided result for the same test: jump tests in their unit (inches / feet), lifts by estimated strength (lb).
 * First result ever → "Baseline set". A lower result shows plainly as a change ("−5 lb").
 */
export function changeSince(all: Pick<TestResult, 'id' | 'userId' | 'testId' | 'day' | 'value' | 'unit' | 'e1rm' | 'voided'>[], r: Pick<TestResult, 'id' | 'userId' | 'testId' | 'day' | 'value' | 'unit' | 'e1rm'>): string {
  const list = all.filter((x) => x.userId === r.userId && x.testId === r.testId && !x.voided);
  const idx = list.findIndex((x) => x.id === r.id);
  const earlier = list.filter((x, i) => x.day < r.day || (x.day === r.day && idx >= 0 && i < idx)).sort((a, b) => a.day.localeCompare(b.day));
  const prev = earlier[earlier.length - 1];
  if (!prev) return 'Baseline set';
  const lift = r.e1rm != null && prev.e1rm != null;
  const d = Math.round(((lift ? r.e1rm! - prev.e1rm! : r.value - prev.value) as number) * 10) / 10;
  const unit = lift ? 'lb' : r.unit;
  const sign = d > 0 ? '+' : d < 0 ? '−' : '±';
  const when = new Date(`${prev.day}T12:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  return `${sign}${Math.abs(d)} ${unit} since ${when}`;
}

export const UPS_AND_DOWNS = 'Strength checks go up and down. Your program adjusts.';
