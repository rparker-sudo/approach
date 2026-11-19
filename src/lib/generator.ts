import { ALL_EQUIPMENT, CATALOG_V3_IDS, EXERCISES, fits, getExercise } from './exercises';
import { lengthTarget, restFor, RestContext, withFloor } from './rest';
import { autoGroup } from './groups';
import type {
  DayType,
  Equipment,
  Exercise,
  Experience,
  Pattern,
  Phase,
  Program,
  ProgramExercise,
  ProgramPosition,
  Session,
  SlotRole,
} from './types';
import { PHASES } from './types';
import { addDays, dayTypeOn, planForDate } from './calendar';
import { uid } from './util';

export type GeneratorInput = {
  name?: string;
  forName?: string;
  author?: string;
  position: ProgramPosition;
  phase: Phase;
  experience: Experience;
  volleyballWeek: DayType[];
  liftDaysPerWeek: number;
  /** Weekdays to lift on (Monday = 0). When missing, the best days are picked automatically. */
  liftDays?: number[];
  /** What the gym has. Missing = full weight room. */
  equipment?: Equipment[];
  /** v2.2 pass 3 (home-workouts.md §1): weight-room weekdays. Set = school + home week; liftDaysPerWeek is the total. */
  weightRoomDays?: number[];
  /** H7: level 1 jumps at home (off/pre-season only). */
  homeJumps?: boolean;
  /** "Save time with supersets" (§4d). Missing = on for in-season and home sessions. */
  supersets?: boolean;
};

const isMatch = (d: DayType) => d === 'game' || d === 'tournament';

/** Lift days are 1–7; more days build a different split, not just more of the same. */
export const MAX_LIFT_DAYS = 7;

/**
 * G2 lift-day caps (Training Content): beginner 3, intermediate 4, advanced 5; in-season 3 for everyone.
 * At least one day a week has no lifting or conditioning; days past the cap can only be mobility.
 */
export function liftDayCap(experience: Experience, phase: Phase): number {
  const byLevel = experience === 'beginner' ? 3 : experience === 'intermediate' ? 4 : 5;
  return phase === 'in' ? Math.min(3, byLevel) : byLevel;
}
export const liftCapMessage = (cap: number) => `Max ${cap} lift days for your level. Add mobility days instead.`;

/** Lift days in a program (mobility-only sessions don't count). */
export function liftDayCount(program: Pick<Program, 'liftSchedule' | 'sessions'>): number {
  return program.liftSchedule.filter((sid) => sid && !program.sessions.find((s) => s.id === sid)?.mobility).length;
}

/** Program has more lift days than its level and phase allow (made before 2.1). */
export function overCap(program: Program): boolean {
  return liftDayCount(program) > liftDayCap(program.experience, program.phase);
}

/**
 * Pick which weekdays to lift on, working around the volleyball week:
 * never on match days, avoid the day before a match, prefer days
 * with no volleyball, and spread sessions out.
 */
export function pickLiftDays(week: DayType[], count: number, only?: number[]): number[] {
  const score = week.map((d, i) => {
    if (isMatch(d) || (only && !only.includes(i))) return -1000;
    let s = d === 'off' ? 10 : 6;
    if (isMatch(week[(i + 1) % 7])) s -= 25; // day before a match
    if (isMatch(week[(i + 6) % 7])) s -= 4; // day after a match: recovery
    return s;
  });
  const chosen: number[] = [];
  const available = score.filter((s) => s > -1000).length;
  const n = Math.min(count, available);
  while (chosen.length < n) {
    let best = -1;
    let bestScore = -Infinity;
    for (let i = 0; i < 7; i++) {
      if (chosen.includes(i) || score[i] <= -1000) continue;
      let s = score[i];
      // Spread sessions: penalize days next to another lift day.
      if (chosen.includes((i + 1) % 7) || chosen.includes((i + 6) % 7)) s -= 8;
      if (s > bestScore) {
        bestScore = s;
        best = i;
      }
    }
    if (best < 0) break;
    chosen.push(best);
  }
  return chosen.sort((a, b) => a - b);
}

/* ======================================================================
 * Program builder v2: slot-based sessions.
 * Each lift-day count (1–7) has its own split. A session is a list of slots
 * (movement pattern + role); each slot is filled with an exercise that fits the
 * gym's equipment and the athlete's experience.
 * ==================================================================== */

type Slot = { patterns: Pattern[]; role: SlotRole; /** 'pos' = a care slot picked by position */ care?: boolean };
type Archetype = { name: string; focus: string; heavyLegs: boolean; slots: Slot[] };

const S = (role: SlotRole, ...patterns: Pattern[]): Slot => ({ role, patterns });
const CARE: Slot = { role: 'care', patterns: [], care: true };

const A = {
  total: (n: string): Archetype => ({
    name: n,
    focus: 'Power, legs, push, pull and core in one session',
    heavyLegs: true,
    slots: [S('power', 'jump'), S('main', 'squat'), S('secondary', 'h-push'), S('secondary', 'h-pull'), S('accessory', 'hinge'), S('core', 'core-ext'), CARE],
  }),
  totalB: (n: string): Archetype => ({
    name: n,
    focus: 'Hinge strength, overhead work and single-leg control',
    heavyLegs: true,
    slots: [S('power', 'throw'), S('main', 'hinge'), S('secondary', 'v-push'), S('secondary', 'v-pull'), S('accessory', 'single-leg'), S('core', 'core-rot'), CARE],
  }),
  totalC: (n: string): Archetype => ({
    name: n,
    focus: 'Single-leg strength, pulling and carries',
    heavyLegs: false,
    slots: [S('power', 'jump', 'olympic'), S('main', 'single-leg'), S('secondary', 'h-pull'), S('accessory', 'h-push'), S('core', 'carry'), CARE],
  }),
  lower: (n: string): Archetype => ({
    name: n,
    focus: 'Squat strength, single-leg strength, hamstrings',
    heavyLegs: true,
    slots: [S('power', 'jump'), S('main', 'squat'), S('secondary', 'hinge'), S('accessory', 'single-leg'), S('core', 'core-ext'), CARE],
  }),
  lowerPower: (n: string): Archetype => ({
    name: n,
    focus: 'Jump power and hinge strength',
    heavyLegs: true,
    slots: [S('power', 'jump', 'olympic'), S('main', 'hinge'), S('secondary', 'single-leg'), S('accessory', 'ankle-care'), S('core', 'core-rot'), CARE],
  }),
  upper: (n: string): Archetype => ({
    name: n,
    focus: 'Push, pull and shoulder work',
    heavyLegs: false,
    slots: [S('power', 'throw'), S('main', 'h-push'), S('secondary', 'h-pull'), S('secondary', 'v-push'), S('accessory', 'v-pull'), CARE],
  }),
  upperVolume: (n: string): Archetype => ({
    name: n,
    focus: 'Upper-body volume and core',
    heavyLegs: false,
    slots: [S('main', 'v-pull'), S('secondary', 'v-push'), S('secondary', 'h-pull'), S('accessory', 'h-push'), S('core', 'core-ext'), CARE],
  }),
  power: (n: string): Archetype => ({
    name: n,
    focus: 'Jumps, throws and speed. Every rep fast.',
    heavyLegs: false,
    slots: [S('power', 'jump'), S('power', 'throw'), S('power', 'jump', 'olympic'), S('power', 'throw'), S('core', 'core-rot')],
  }),
  prehab: (n: string): Archetype => ({
    name: n,
    focus: 'Shoulders, knees, ankles, hands and core',
    heavyLegs: false,
    slots: [S('care', 'shoulder-care'), S('care', 'knee-care'), S('care', 'ankle-care'), S('care', 'hand-care'), S('core', 'core-ext'), S('core', 'core-rot')],
  }),
  // v2.2 pass 3 home archetypes (home-workouts.md §4). Exercises are bodyweight defaults; each athlete's app picks
  // their version from their home equipment and level (resolveSession).
  homeLower: (n: string): Archetype => ({
    name: n,
    focus: 'Single-leg strength, hamstrings, ankles',
    heavyLegs: true,
    slots: [S('main', 'single-leg'), S('secondary', 'hinge'), S('accessory', 'single-leg'), S('care', 'ankle-care'), S('core', 'core-rot'), CARE],
  }),
  homeUpper: (n: string): Archetype => ({
    name: n,
    focus: 'Push, pull, shoulders',
    heavyLegs: false,
    slots: [S('main', 'h-push'), S('secondary', 'h-pull'), S('secondary', 'v-push'), S('accessory', 'v-pull'), S('care', 'shoulder-care'), S('core', 'core-ext')],
  }),
  homeTotal: (n: string, lightLeaning = false): Archetype => ({
    name: n,
    focus: 'A bit of everything',
    heavyLegs: !lightLeaning,
    slots: lightLeaning
      ? [S('main', 'h-push'), S('secondary', 'h-pull'), S('secondary', 'hinge'), S('accessory', 'v-pull'), S('core', 'core-ext'), CARE]
      : [S('main', 'single-leg'), S('secondary', 'h-push'), S('secondary', 'h-pull'), S('accessory', 'hinge'), S('core', 'core-ext'), CARE],
  }),
  lightHome: (n: string): Archetype => ({
    name: n,
    focus: 'Easy movement. No weights today.',
    heavyLegs: false,
    slots: [S('mobility', 'mobility'), S('mobility', 'mobility'), CARE, S('care', 'ankle-care'), S('core', 'core-ext'), S('accessory', 'single-leg')],
  }),
  recovery: (n: string): Archetype => ({
    name: n,
    focus: 'Light movement and mobility',
    heavyLegs: false,
    slots: [S('mobility', 'mobility'), S('mobility', 'mobility'), S('care', 'shoulder-care'), S('care', 'ankle-care'), S('core', 'core-ext')],
  }),
};

/** The split for each number of lift days. */
export function splitFor(days: number): Archetype[] {
  switch (Math.max(1, Math.min(7, days))) {
    case 1:
      return [A.total('Total Body')];
    case 2:
      return [A.total('Total Body A'), A.totalB('Total Body B')];
    case 3:
      return [A.lower('Lower + Power'), A.upper('Upper'), A.totalC('Total Body')];
    case 4:
      return [A.lower('Lower'), A.upper('Upper'), A.lowerPower('Lower Power'), A.upperVolume('Upper Volume')];
    case 5:
      return [A.lower('Lower'), A.upper('Upper'), A.lowerPower('Lower Power'), A.upperVolume('Upper Volume'), A.prehab('Prehab + Core')];
    case 6:
      return [A.lower('Lower A'), A.upper('Upper A'), A.power('Power'), A.lowerPower('Lower B'), A.upperVolume('Upper B'), A.recovery('Recovery')];
    default:
      return [A.lower('Lower A'), A.upper('Upper A'), A.power('Power'), A.lowerPower('Lower B'), A.upperVolume('Upper B'), A.prehab('Prehab + Core'), A.recovery('Mobility')];
  }
}

/** Sets / reps / effort by phase and role. */
type Rx = { sets: number; reps: string; effort: string };
const RX: Record<Phase, Record<SlotRole, Rx>> = {
  off: {
    power: { sets: 3, reps: '3', effort: 'Max effort' },
    main: { sets: 4, reps: '5', effort: 'RPE 7–8' },
    secondary: { sets: 3, reps: '8', effort: 'RPE 7' },
    accessory: { sets: 3, reps: '10', effort: 'RPE 7' },
    core: { sets: 3, reps: '8', effort: 'Controlled' },
    care: { sets: 2, reps: '15', effort: 'Light' },
    mobility: { sets: 2, reps: '5', effort: 'Easy' },
  },
  pre: {
    power: { sets: 4, reps: '3', effort: 'Max effort' },
    main: { sets: 4, reps: '3–4', effort: 'RPE 7–8' },
    secondary: { sets: 3, reps: '6', effort: 'RPE 7' },
    accessory: { sets: 2, reps: '10', effort: 'RPE 7' },
    core: { sets: 3, reps: '8', effort: 'Controlled' },
    care: { sets: 2, reps: '15', effort: 'Light' },
    mobility: { sets: 2, reps: '5', effort: 'Easy' },
  },
  in: {
    power: { sets: 2, reps: '3', effort: 'Max effort' },
    main: { sets: 3, reps: '3', effort: 'RPE 6–7' },
    secondary: { sets: 2, reps: '6', effort: 'RPE 6' },
    accessory: { sets: 2, reps: '8', effort: 'RPE 6' },
    core: { sets: 2, reps: '8', effort: 'Controlled' },
    care: { sets: 2, reps: '15', effort: 'Light' },
    mobility: { sets: 2, reps: '5', effort: 'Easy' },
  },
  post: {
    power: { sets: 2, reps: '5', effort: 'Easy, fast' },
    main: { sets: 3, reps: '10', effort: 'RPE 6' },
    secondary: { sets: 3, reps: '10', effort: 'RPE 6' },
    accessory: { sets: 2, reps: '12', effort: 'RPE 6' },
    core: { sets: 3, reps: '8', effort: 'Controlled' },
    care: { sets: 2, reps: '15', effort: 'Light' },
    mobility: { sets: 2, reps: '5', effort: 'Easy' },
  },
};

/** home-workouts.md §5: bodyweight strength needs more reps for the same effort. */
const HOME_RX: Record<Phase, Record<SlotRole, Rx>> = (() => {
  const bw = 'Leave 2–3 reps in the tank';
  const base = (main: [number, string], sec: [number, string], acc: [number, string], core: [number, string]): Record<SlotRole, Rx> => ({
    power: { sets: 3, reps: '3', effort: 'Fast, land soft' },
    main: { sets: main[0], reps: main[1], effort: bw },
    secondary: { sets: sec[0], reps: sec[1], effort: bw },
    accessory: { sets: acc[0], reps: acc[1], effort: 'RPE 6' },
    core: { sets: core[0], reps: core[1], effort: 'Controlled' },
    care: { sets: 2, reps: '15', effort: 'Light' },
    mobility: { sets: 2, reps: '5', effort: 'Easy' },
  });
  return {
    off: base([3, '8–12'], [3, '10–12'], [2, '12–15'], [3, '8']),
    pre: base([3, '8–12'], [3, '10–12'], [2, '12–15'], [3, '8']),
    in: base([2, '8–10'], [2, '10'], [2, '12'], [2, '8']),
    post: base([3, '10–12'], [3, '12'], [2, '15'], [3, '8']),
  };
})();

/** H6: never at home (besides barbell, trap bar and cable, which aren't home equipment). */
export const HOME_EXCLUDED = new Set(['nordic', 'box-jump', 'hang-clean', 'trap-bar-jump']);
/** H7: the only jumps allowed at home, level 1, when the coach turns them on (off/pre-season). */
export const HOME_JUMPS = new Set(['pogo', 'squat-jump', 'broad-jump']);
export const HOME_JUMP_CUE = 'Clear space, no low ceilings, sneakers on.';
/** Home equipment the athlete can tick (F20). */
export const HOME_EQUIPMENT: { id: Equipment; label: string }[] = [
  { id: 'dumbbells', label: 'Dumbbells' },
  { id: 'kettlebells', label: 'Kettlebells' },
  { id: 'bands', label: 'Bands' },
  { id: 'pullup-bar', label: 'Pull-up bar' },
  { id: 'bench', label: 'Bench' },
  { id: 'box', label: 'Sturdy step or stairs' },
  { id: 'med-ball', label: 'Med ball' },
];

export function homeAllowed(ex: Exercise, jumps: boolean): boolean {
  if (HOME_EXCLUDED.has(ex.id) || ex.pattern === 'olympic') return false;
  if (ex.pattern === 'jump') return jumps && HOME_JUMPS.has(ex.id);
  if (ex.pattern === 'throw') return ex.equipment.some((s) => s.every((i) => i === 'med-ball'));
  return ex.equipment.some((s) => s.every((i) => !['barbell', 'trap-bar', 'cable'].includes(i)));
}

/** Default rest between sets by role, seconds. */
export const REST_BY_ROLE: Record<SlotRole, number> = {
  main: 150,
  power: 120,
  secondary: 90,
  accessory: 60,
  core: 60,
  care: 45,
  mobility: 30,
};

/**
 * Rest for an exercise in a program (v2.2): the coach's setting wins, but never below the floors
 * (tier A 2:00, tier P 1:30). Without a coach setting, the default comes from `restFor` (tier, reps, effort).
 * Programs built before v2.2 stored the old role default in `restSec`; that value is treated as "no coach setting".
 */
export function restSecFor(pe: ProgramExercise, ctx: RestContext = {}): number {
  const ex = getExercise(pe.exerciseId);
  if (isCoachRest(pe)) return withFloor(ex, pe.restSec!, ctx.equipment, ctx.free);
  return restFor(ex, pe, ctx);
}

/** True when the coach typed a rest (not a stored pre-v2.2 role default). */
export function isCoachRest(pe: ProgramExercise): boolean {
  if (typeof pe.restSec !== 'number') return false;
  return !(pe.role && pe.restSec === REST_BY_ROLE[pe.role] && !pe.restSetByCoach);
}

/** 150 → "2:30" */
export function formatRest(sec: number): string {
  if (sec <= 0) return 'No timer';
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
}

export const HOLDS = new Set(['plank', 'side-plank', 'wall-sit', 'spanish-squat', 'copenhagen', 'hip-flexor-stretch', 'lat-reach', 'band-hamstring', 'er-90-90-iso', 'short-lever-copenhagen']);
const CARRIES = new Set(['suitcase-carry', 'farmer-carry']);

/** Reps written the way athletes read them: holds in seconds, one-sided work "each". */
const REP_OVERRIDE: Record<string, string> = {
  'ankle-balance': '6 each',
  'calf-raise': '12 each',
  'scap-pushup': '10',
  'tib-raise': '15',
  'band-er': '15 each',
  'wrist-roller': '15',
  // v2.2 mobility (drill-library §4)
  'crocodile-breathing': '5 breaths',
  'cat-camel': '8',
  'hip-flexor-stretch': '30s each',
  'ankle-rock': '10 each',
  'lat-reach': '20s each',
  'band-hamstring': '30s each',
  // 2.4.0 catalog v3 notation (holds, line hops, movement prep in yards)
  'er-90-90-iso': '15s each',
  'short-lever-copenhagen': '15s each',
  'line-hops': '20',
  'a-skip': '10 yd',
  'lateral-shuffle': '10 yd',
  carioca: '10 yd',
  'high-knees': '10 yd',
  'walking-knee-hug': '10 yd',
  'walking-quad-stretch': '10 yd',
};

function repsFor(ex: Exercise, rx: Rx, phase: Phase): string {
  if (REP_OVERRIDE[ex.id]) return REP_OVERRIDE[ex.id];
  if (HOLDS.has(ex.id)) return ex.id === 'copenhagen' || ex.id === 'side-plank' ? '20s each' : '30s';
  if (CARRIES.has(ex.id)) return '30 yd each';
  if (ex.pattern === 'mobility') return '5 each';
  const oneSide = ex.pattern === 'single-leg' || ['mb-rotational', 'band-er', 'pallof', 'db-row', 'db-shoulder-press', 'landmine-press', 'lateral-bound', 'dead-bug', 'calf-raise', 'ankle-balance'].includes(ex.id);
  if (ex.pattern === 'jump' || ex.pattern === 'throw' || ex.pattern === 'olympic') return oneSide ? `${rx.reps} each` : rx.reps;
  if (ex.id === 'nordic') return phase === 'in' ? '3' : '4';
  if (ex.id === 'pullup') return phase === 'off' ? '5–8' : '4–6';
  return oneSide ? `${rx.reps} each` : rx.reps;
}

export const MAX_LEVEL: Record<Experience, number> = { beginner: 1, intermediate: 2, advanced: 3 };
export const BEGINNER_EFFORT: Record<string, string> = { 'RPE 7–8': 'RPE 6–7', 'RPE 7': 'RPE 6', 'RPE 6–7': 'RPE 6' };

/** Care patterns by position, used round-robin across sessions. */
const CARE_BY_POSITION: Record<ProgramPosition, Pattern[]> = {
  'All positions': ['shoulder-care', 'knee-care', 'ankle-care'],
  'Outside Hitter': ['shoulder-care', 'knee-care'],
  Opposite: ['shoulder-care', 'knee-care'],
  'Middle Blocker': ['knee-care', 'ankle-care', 'shoulder-care'],
  Setter: ['hand-care', 'shoulder-care'],
  'Libero / DS': ['ankle-care', 'knee-care'],
};

type PickCtx = { equipment: Equipment[]; maxLevel: number; usedWeek: Set<string>; usedSession: Set<string>; allow?: (e: Exercise) => boolean; v3?: boolean };

/** Best exercise for a slot, or undefined when nothing fits at all. */
export function pickExercise(patterns: Pattern[], role: SlotRole, ctx: PickCtx): Exercise | undefined {
  // 2.4.0: the 2.3.0 generator never picks catalog v3 exercises (its output stays unchanged until generatorV3).
  const pool = EXERCISES.filter((e) => patterns.includes(e.pattern) && !ctx.usedSession.has(e.id) && (ctx.v3 || !CATALOG_V3_IDS.has(e.id)) && (!ctx.allow || ctx.allow(e)));
  // Olympic lifts only for experienced lifters with a barbell.
  const allowed = pool.filter((e) => e.pattern !== 'olympic' || ctx.maxLevel >= 3);
  const usable = allowed.filter((e) => fits(e, ctx.equipment));
  // G1: never above the athlete's level. If nothing at or below their level fits the gym, use a bodyweight
  // option at or below their level, or skip the slot (undefined). Never fall back to a harder exercise.
  const byLevel = usable.filter((e) => e.level <= ctx.maxLevel);
  const candidates = byLevel.length ? byLevel : allowed.filter((e) => fits(e, []) && e.level <= ctx.maxLevel);
  if (!candidates.length) return undefined;
  const target = role === 'main' ? ctx.maxLevel : role === 'secondary' ? Math.min(2, ctx.maxLevel) : 1;
  // For strength slots, prefer loading the athlete can progress: barbell/trap bar, then dumbbells/kettlebells/cable, then bands, then bodyweight.
  const loadRank = (e: Exercise) => {
    const setups = e.equipment.filter((setup) => setup.every((i) => ctx.equipment.includes(i)));
    const rank = (setup: Equipment[]) =>
      setup.some((i) => i === 'barbell' || i === 'trap-bar') ? 0 : setup.some((i) => i === 'dumbbells' || i === 'kettlebells' || i === 'cable') ? 1 : setup.includes('bands') ? 2 : 3;
    return Math.min(...setups.map(rank), 3);
  };
  const strength = role === 'main' || role === 'secondary' || role === 'accessory';
  const score = (e: Exercise) =>
    (strength ? loadRank(e) * (role === 'main' ? 1.5 : 1) : 0) +
    (ctx.usedWeek.has(e.id) ? 10 : 0) + // rotate variations across the week
    Math.abs(e.level - target) * 2 +
    (role === 'main' || role === 'secondary' ? (e.weighted ? 0 : 3) : 0) +
    (e.pattern === 'olympic' ? 1 : 0); // prefer jumps unless that's all there is
  return [...candidates].sort((a, b) => score(a) - score(b) || a.id.localeCompare(b.id))[0];
}

type BuildOpts = { home?: boolean; light?: boolean; jumps?: boolean };

function buildSession(arch: Archetype, input: GeneratorInput, usedWeek: Set<string>, careIndex: { n: number }, opts: BuildOpts = {}): Session {
  // Home sessions store bodyweight defaults (each athlete's app picks their version).
  const equipment = opts.home ? [] : input.equipment ?? ALL_EQUIPMENT;
  const ctx: PickCtx = {
    equipment,
    maxLevel: opts.home && opts.jumps ? Math.min(MAX_LEVEL[input.experience], 3) : MAX_LEVEL[input.experience],
    usedWeek,
    usedSession: new Set(),
    ...(opts.home ? { allow: (e: Exercise) => homeAllowed(e, !!opts.jumps) } : {}),
  };
  // More lift days → shorter sessions, so total weekly work stays sensible.
  const days = input.liftDays?.length ?? input.liftDaysPerWeek;
  let slots = opts.home && opts.jumps && arch.heavyLegs && (input.phase === 'off' || input.phase === 'pre') ? [S('power', 'jump'), ...arch.slots] : arch.slots;
  if (opts.light) slots = arch.slots;
  else if (input.phase === 'in' || days >= 5) slots = slots.filter((sl, i) => !(sl.role === 'accessory' && i === slots.findIndex((x) => x.role === 'accessory')));
  if (days >= 6 && input.phase !== 'off') slots = slots.filter((sl) => sl.role !== 'core' || sl.patterns.includes('core-rot'));

  const exercises: ProgramExercise[] = [];
  for (const slot of slots) {
    let patterns = slot.patterns;
    if (slot.care) {
      const list = CARE_BY_POSITION[input.position];
      patterns = [list[careIndex.n % list.length]];
      careIndex.n++;
    }
    const ex = pickExercise(patterns, slot.role, ctx);
    if (!ex) continue;
    ctx.usedSession.add(ex.id);
    usedWeek.add(ex.id);
    const rx = opts.home ? HOME_RX[input.phase][slot.role] : RX[input.phase][slot.role];
    const strengthSlot = slot.role === 'main' || slot.role === 'secondary' || slot.role === 'accessory';
    let effort = opts.home ? rx.effort : strengthSlot && !ex.weighted ? 'Bodyweight' : rx.effort;
    if (input.experience === 'beginner') effort = BEGINNER_EFFORT[effort] ?? effort;
    let sets = rx.sets;
    if (!opts.home && input.experience === 'advanced' && input.phase === 'off' && slot.role === 'main') sets += 1;
    // H2 light home day: 1–2 sets, RPE ≤ 6, easy.
    if (opts.light) {
      sets = slot.role === 'mobility' || slot.role === 'care' ? 1 : Math.min(2, sets);
      effort = slot.role === 'accessory' ? 'RPE 6' : slot.role === 'mobility' ? 'Easy' : slot.role === 'care' ? 'Light' : 'Easy';
    }
    exercises.push({
      exerciseId: ex.id,
      sets,
      reps: repsFor(ex, rx, input.phase),
      effort,
      role: slot.role,
      // v2.2: rest comes from restFor() (tier, reps, effort) unless the coach sets one.
      notes:
        opts.home && ex.pattern === 'jump'
          ? `${HOME_JUMP_CUE} Up to 20 contacts.`
          : ex.id === 'hang-clean'
          ? 'Only with coaching. Swap for a jump otherwise.'
          : slot.role === 'main' && input.phase === 'in'
            ? 'Keep it crisp. Never grind a rep in-season.'
            : undefined,
    });
  }
  return {
    id: uid(),
    name: arch.name,
    focus: arch.focus,
    exercises,
    ...(opts.home ? { location: 'home' as const } : {}),
    ...(opts.light ? { light: true } : {}),
  };
}

/** home-workouts.md §3: recommended total for the phase (intermediate/advanced), within the team's cap. */
export function recommendedTotal(phase: Phase, weightRoomDays: number[]): number {
  return phase === 'off' ? 4 : phase === 'pre' ? (weightRoomDays.length >= 2 ? 4 : 3) : 3;
}

/** §4: home archetypes for a number of school and home days. */
function homeSplit(school: number, home: number): Archetype[] {
  if (home <= 0) return [];
  if (school >= 4) return [A.homeTotal('Home Total', true)];
  if (school >= 2 && home === 1) return [A.homeUpper('Home Upper')];
  if (school === 3 && home >= 2) return [A.homeLower('Home Lower'), A.homeUpper('Home Upper')];
  const list = home === 1 ? [A.homeTotal('Home Total')] : home === 2 ? [A.homeLower('Home Lower'), A.homeUpper('Home Upper')] : [A.homeLower('Home Lower'), A.homeUpper('Home Upper'), A.homeTotal('Home Total')];
  return list.slice(0, home);
}

/**
 * School + home week (home-workouts.md §1–§4). School days = weight-room days (not match days), up to the total and cap.
 * Home days fill the rest using pickLiftDays scoring plus H4 (day before a match: upper or light only) and H5 (no two
 * leg-heavy days in a row, school or home; Home Upper is swapped in). A Light Home session is included for athletes
 * whose cap is lower than the team week (it's given per athlete, never scheduled by default).
 */
function schoolHomeWeek(input: GeneratorInput): { sessions: Session[]; schedule: (string | null)[] } {
  const week = input.volleyballWeek;
  const cap = liftDayCap(input.experience, input.phase);
  const total = Math.max(0, Math.min(input.liftDaysPerWeek, cap));
  const schoolDays = [...new Set(input.weightRoomDays ?? [])].filter((d) => d >= 0 && d < 7 && !isMatch(week[d])).sort((a, b) => a - b).slice(0, total);
  const homeCount = Math.max(0, total - schoolDays.length);
  const usedWeek = new Set<string>();
  const careIndex = { n: 0 };
  const schoolArch = schoolDays.length ? splitFor(schoolDays.length) : [];
  const school = schoolArch.map((a) => ({ s: buildSession(a, input, usedWeek, careIndex), heavy: a.heavyLegs }));
  const jumps = !!input.homeJumps && (input.phase === 'off' || input.phase === 'pre');
  const homeArch = homeSplit(schoolDays.length, homeCount);
  const home = homeArch.map((a) => ({ s: buildSession(a, input, usedWeek, careIndex, { home: true, jumps }), heavy: a.heavyLegs, arch: a }));
  const light = buildSession(A.lightHome('Light Home'), input, usedWeek, careIndex, { home: true, light: true });

  const schedule: (string | null)[] = Array(7).fill(null);
  const heavyOn: boolean[] = Array(7).fill(false);
  // School sessions: heavy legs not the day before a match (existing logic).
  const left = [...school];
  for (const d of schoolDays) {
    const beforeMatch = isMatch(week[(d + 1) % 7]);
    let idx = beforeMatch ? left.findIndex((x) => !x.heavy) : 0;
    if (idx < 0) idx = 0;
    const [pick] = left.splice(idx, 1);
    if (pick) {
      schedule[d] = pick.s.id;
      heavyOn[d] = pick.heavy;
    }
  }
  // Home days (H3–H5): leg-heavy home sessions pick first, only on days that aren't next to another leg-heavy day or
  // before a match; then the rest. Scoring follows pickLiftDays (prefer no volleyball, avoid the day after a match,
  // spread sessions out). A leg-heavy session with no valid day becomes Home Upper.
  const sessions: Session[] = [...school.map((x) => x.s)];
  const pending = [...home].sort((a, b) => Number(b.heavy) - Number(a.heavy));
  const score = (d: number) => {
    let sc = week[d] === 'off' ? 10 : 6;
    if (isMatch(week[(d + 6) % 7])) sc -= 4;
    if (isMatch(week[(d + 1) % 7])) sc -= 25;
    if (schedule[(d + 1) % 7] || schedule[(d + 6) % 7]) sc -= 8;
    return sc;
  };
  const freeDays = () => [0, 1, 2, 3, 4, 5, 6].filter((d) => !schedule[d] && !isMatch(week[d]));
  while (pending.length) {
    let pick = pending.shift()!;
    // Keep at least one day with no training (H3): total ≤ cap ≤ 5 already leaves two.
    let days = freeDays();
    if (pick.heavy) {
      const ok = days.filter((d) => !heavyOn[(d + 1) % 7] && !heavyOn[(d + 6) % 7] && !isMatch(week[(d + 1) % 7]));
      if (!ok.length) {
        const sub = A.homeUpper(sessions.some((x) => x.name === 'Home Upper') || pending.some((x) => x.s.name === 'Home Upper') ? 'Home Upper B' : 'Home Upper');
        pick = { s: buildSession(sub, input, usedWeek, careIndex, { home: true }), heavy: false, arch: sub };
      } else days = ok;
    }
    if (!days.length) break;
    const d = [...days].sort((a, b) => score(b) - score(a) || a - b)[0];
    schedule[d] = pick.s.id;
    heavyOn[d] = pick.heavy;
    sessions.push(pick.s);
  }
  sessions.push(light);
  return { sessions, schedule };
}

/** "2 weight-room days + 2 home days." plus the beginners' line when caps apply (F19a). */
export function weekSummary(program: Program): { line: string; beginners: string | null } {
  const sess = (sid: string | null) => program.sessions.find((x) => x.id === sid);
  const days = program.liftSchedule.map(sess).filter((x): x is Session => !!x && !x.mobility && !x.light);
  const school = days.filter((x) => x.location !== 'home').length;
  const home = days.length - school;
  const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? '' : 's'}`;
  const line = home ? `${plural(school, 'weight-room day')} + ${plural(home, 'home day')}.` : `${plural(school, 'lift day')}.`;
  const bcap = liftDayCap('beginner', program.phase);
  if (days.length <= bcap) return { line, beginners: null };
  const hasLight = program.sessions.some((x) => x.light);
  const bSchool = Math.min(school, bcap);
  const bHome = Math.max(0, bcap - bSchool);
  return {
    line,
    beginners: `Beginners: ${bSchool} weight-room${bHome ? ` + ${bHome} home` : ''}${hasLight ? ' + 1 light home day' : ''} (max ${bcap} full lift days for their level).`,
  };
}

export function generateProgram(input: GeneratorInput): Program {
  if (input.weightRoomDays) return withAutoGroups(finishProgram(input, schoolHomeWeek(input)), input);
  return withAutoGroups(generateStandard(input), input);
}

/** §4d auto-pairing for each session (only when supersets are on or a session is over its target). */
function withAutoGroups(program: Program, input: GeneratorInput): Program {
  return {
    ...program,
    // 2.4.0 (§0.1): everything the generator writes is Approach's until a coach edits it.
    sessions: program.sessions.map((s0) => {
      const s: Session = { ...s0, source: 'approach' };
      if (s.mobility || s.light) return s;
      const home = s.location === 'home';
      const enabled = input.supersets ?? (input.phase === 'in' || home);
      return autoGroup(s, {
        target: lengthTarget(input.phase, home ? 'home' : 'school'),
        enabled,
        ctx: { phase: input.phase, equipment: home ? [] : program.equipment, home },
        kind: home ? 'home' : 'school',
      });
    }),
    ...(input.supersets != null ? { supersets: input.supersets } : {}),
  };
}

function finishProgram(input: GeneratorInput, week: { sessions: Session[]; schedule: (string | null)[] }): Program {
  const phaseLabel = PHASES.find((p) => p.id === input.phase)?.label ?? '';
  const today = new Date();
  return {
    id: uid(),
    name: input.name?.trim() || `${phaseLabel} – ${input.position}`,
    forName: input.forName,
    author: input.author,
    position: input.position,
    phase: input.phase,
    experience: input.experience,
    volleyballWeek: [...input.volleyballWeek],
    liftSchedule: week.schedule,
    sessions: week.sessions,
    createdAt: today.toISOString(),
    equipment: input.equipment ?? ALL_EQUIPMENT,
    blockStart: `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`,
    blockWeeks: 4,
    weightRoomDays: [...(input.weightRoomDays ?? [])],
    ...(input.homeJumps ? { homeJumps: true } : {}),
  };
}

function generateStandard(input: GeneratorInput): Program {
  const cap = liftDayCap(input.experience, input.phase);
  const chosen = input.liftDays?.length
    ? [...new Set(input.liftDays)].filter((d) => d >= 0 && d < 7).sort((a, b) => a - b)
    : pickLiftDays(input.volleyballWeek, Math.min(input.liftDaysPerWeek, cap));
  // G2: lift on the best `cap` of the chosen days; extra days (keeping one day fully off) are mobility only.
  const days = chosen.length > cap ? pickLiftDays(input.volleyballWeek, cap, chosen) : chosen;
  const extra = chosen.filter((d) => !days.includes(d)).slice(0, Math.max(0, 6 - days.length));
  const split = splitFor(Math.max(days.length, 1));
  const usedWeek = new Set<string>();
  const careIndex = { n: 0 };
  const sessions = split.map((arch) => buildSession(arch, input, usedWeek, careIndex));
  const mobility = extra.length ? { ...buildSession(A.recovery('Mobility'), input, usedWeek, careIndex), mobility: true } : null;

  // Put the heavy-leg sessions on days that are not right before a match.
  const liftSchedule: (string | null)[] = Array(7).fill(null);
  const remaining = sessions.map((s, i) => ({ s, heavy: split[i].heavyLegs }));
  for (const d of days) {
    const beforeMatch = isMatch(input.volleyballWeek[(d + 1) % 7]);
    let idx = beforeMatch ? remaining.findIndex((r) => !r.heavy) : 0;
    if (idx < 0) idx = 0;
    const [pick] = remaining.splice(idx, 1);
    if (pick) liftSchedule[d] = pick.s.id;
  }
  if (mobility) for (const d of extra) liftSchedule[d] = mobility.id;

  const phaseLabel = PHASES.find((p) => p.id === input.phase)?.label ?? '';
  const today = new Date();
  return {
    id: uid(),
    name: input.name?.trim() || `${phaseLabel} – ${input.position}`,
    forName: input.forName,
    author: input.author,
    position: input.position,
    phase: input.phase,
    experience: input.experience,
    volleyballWeek: [...input.volleyballWeek],
    liftSchedule,
    sessions: mobility ? [...sessions, mobility] : sessions,
    createdAt: today.toISOString(),
    equipment: input.equipment ?? ALL_EQUIPMENT,
    blockStart: `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`,
    blockWeeks: 4,
  };
}

/** A mobility/recovery session for a program (days past the lift-day cap). */
export function mobilitySession(program: Program): Session {
  const input: GeneratorInput = {
    position: program.position,
    phase: program.phase,
    experience: program.experience,
    volleyballWeek: program.volleyballWeek,
    liftDaysPerWeek: liftDayCount(program),
    equipment: program.equipment,
  };
  return { ...buildSession(A.recovery('Mobility'), input, new Set(), { n: 0 }), mobility: true, source: 'approach' };
}

/** Short reasons shown under each day, so athletes understand the plan. */
export function dayAdvice(week: DayType[], i: number, liftsToday: boolean, heavyLower: boolean): string | null {
  const today = week[i];
  const tomorrow = week[(i + 1) % 7];
  const yesterday = week[(i + 6) % 7];
  if (isMatch(today)) return 'Match day. No lifting. Eat early, sip water all day.';
  if (isMatch(tomorrow) && liftsToday && heavyLower) return 'Match tomorrow. Keep the legs light today.';
  if (isMatch(tomorrow)) return 'Match tomorrow. Rest the legs. Carbs and water tonight.';
  if (isMatch(yesterday) && !liftsToday) return 'Day after a match. Recover, stretch, sleep.';
  if (today === 'practice' && liftsToday) return 'Lift after practice, not before.';
  return null;
}

/** One short line for the top of the Lift screen, in the brand voice. Uses real calendar dates. */
export function captainLine(program: Program, date: Date): string {
  const today = planForDate(program, date);
  const session = program.sessions.find((s) => s.id === today.sessionId);
  if (isMatch(today.dayType)) return today.dayType === 'tournament' ? 'Tournament day. Fuel early, fuel often.' : 'Match day. Trust the work.';
  if (session) {
    const legs = session.exercises.some((e) => ['back-squat', 'front-squat', 'goblet-squat', 'trap-bar-deadlift', 'split-squat', 'rdl', 'db-rdl', 'step-up', 'hip-thrust'].includes(e.exerciseId));
    const sets = session.exercises[0] ? session.exercises.find((e) => e.sets >= 3)?.sets ?? session.exercises[0].sets : 3;
    return legs ? `Legs today. ${sets} sets, you've got this.` : `Upper body today. ${sets} sets, stay sharp.`;
  }
  for (let d = 1; d <= 2; d++) {
    if (isMatch(dayTypeOn(program, addDays(date, d)))) return d === 1 ? 'Match tomorrow. Carbs tonight.' : 'Match in 2 days. Carbs tonight.';
  }
  return 'Recovery day. Sleep is training too.';
}
