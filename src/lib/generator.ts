import { ALL_EQUIPMENT, EXERCISES, fits, getExercise } from './exercises';
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
};

const isMatch = (d: DayType) => d === 'game' || d === 'tournament';

/** Lift days are 1–7; more days build a different split, not just more of the same. */
export const MAX_LIFT_DAYS = 7;

/**
 * Pick which weekdays to lift on, working around the volleyball week:
 * never on match days, avoid the day before a match, prefer days
 * with no volleyball, and spread sessions out.
 */
export function pickLiftDays(week: DayType[], count: number): number[] {
  const score = week.map((d, i) => {
    if (isMatch(d)) return -1000;
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
    focus: 'Push, pull and shoulder health',
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

/** Rest for an exercise in a program: the coach's setting, else a default by role/category (older programs). */
export function restSecFor(pe: ProgramExercise): number {
  if (typeof pe.restSec === 'number') return pe.restSec;
  if (pe.role) return REST_BY_ROLE[pe.role];
  const c = getExercise(pe.exerciseId).category;
  return c === 'power' ? 120 : c === 'lower' || c === 'upper' ? 90 : c === 'core' ? 60 : 45;
}

/** 150 → "2:30" */
export function formatRest(sec: number): string {
  if (sec <= 0) return 'No timer';
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
}

const HOLDS = new Set(['plank', 'side-plank', 'wall-sit', 'spanish-squat', 'copenhagen']);
const CARRIES = new Set(['suitcase-carry', 'farmer-carry']);

/** Reps written the way athletes read them: holds in seconds, one-sided work "each". */
const REP_OVERRIDE: Record<string, string> = {
  'ankle-balance': '6 each',
  'calf-raise': '12 each',
  'scap-pushup': '10',
  'tib-raise': '15',
  'band-er': '15 each',
  'wrist-roller': '15',
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

const MAX_LEVEL: Record<Experience, number> = { beginner: 1, intermediate: 2, advanced: 3 };
const BEGINNER_EFFORT: Record<string, string> = { 'RPE 7–8': 'RPE 6–7', 'RPE 7': 'RPE 6', 'RPE 6–7': 'RPE 6' };

/** Care patterns by position, used round-robin across sessions. */
const CARE_BY_POSITION: Record<ProgramPosition, Pattern[]> = {
  'All positions': ['shoulder-care', 'knee-care', 'ankle-care'],
  'Outside Hitter': ['shoulder-care', 'knee-care'],
  Opposite: ['shoulder-care', 'knee-care'],
  'Middle Blocker': ['knee-care', 'ankle-care', 'shoulder-care'],
  Setter: ['hand-care', 'shoulder-care'],
  'Libero / DS': ['ankle-care', 'knee-care'],
};

type PickCtx = { equipment: Equipment[]; maxLevel: number; usedWeek: Set<string>; usedSession: Set<string> };

/** Best exercise for a slot, or undefined when nothing fits at all. */
export function pickExercise(patterns: Pattern[], role: SlotRole, ctx: PickCtx): Exercise | undefined {
  const pool = EXERCISES.filter((e) => patterns.includes(e.pattern) && !ctx.usedSession.has(e.id));
  // Olympic lifts only for experienced lifters with a barbell.
  const allowed = pool.filter((e) => e.pattern !== 'olympic' || ctx.maxLevel >= 3);
  const usable = allowed.filter((e) => fits(e, ctx.equipment));
  const byLevel = usable.filter((e) => e.level <= ctx.maxLevel);
  const candidates = byLevel.length ? byLevel : usable.length ? usable : allowed.filter((e) => fits(e, []));
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

function buildSession(arch: Archetype, input: GeneratorInput, usedWeek: Set<string>, careIndex: { n: number }): Session {
  const equipment = input.equipment ?? ALL_EQUIPMENT;
  const ctx: PickCtx = { equipment, maxLevel: MAX_LEVEL[input.experience], usedWeek, usedSession: new Set() };
  // More lift days → shorter sessions, so total weekly work stays sensible.
  const days = input.liftDays?.length ?? input.liftDaysPerWeek;
  let slots = arch.slots;
  if (input.phase === 'in' || days >= 5) slots = slots.filter((sl, i) => !(sl.role === 'accessory' && i === slots.findIndex((x) => x.role === 'accessory')));
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
    const rx = RX[input.phase][slot.role];
    const strengthSlot = slot.role === 'main' || slot.role === 'secondary' || slot.role === 'accessory';
    let effort = strengthSlot && !ex.weighted ? 'Bodyweight' : rx.effort;
    if (input.experience === 'beginner') effort = BEGINNER_EFFORT[effort] ?? effort;
    let sets = rx.sets;
    if (input.experience === 'advanced' && input.phase === 'off' && slot.role === 'main') sets += 1;
    exercises.push({
      exerciseId: ex.id,
      sets,
      reps: repsFor(ex, rx, input.phase),
      effort,
      role: slot.role,
      restSec: REST_BY_ROLE[slot.role],
      notes:
        ex.id === 'hang-clean'
          ? 'Only with coaching. Swap for a jump otherwise.'
          : slot.role === 'main' && input.phase === 'in'
            ? 'Keep it crisp. Never grind a rep in-season.'
            : undefined,
    });
  }
  return { id: uid(), name: arch.name, focus: arch.focus, exercises };
}

export function generateProgram(input: GeneratorInput): Program {
  const days = input.liftDays?.length
    ? [...new Set(input.liftDays)].filter((d) => d >= 0 && d < 7).sort((a, b) => a - b)
    : pickLiftDays(input.volleyballWeek, input.liftDaysPerWeek);
  const split = splitFor(Math.max(days.length, 1));
  const usedWeek = new Set<string>();
  const careIndex = { n: 0 };
  const sessions = split.map((arch) => buildSession(arch, input, usedWeek, careIndex));

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
    sessions,
    createdAt: today.toISOString(),
    equipment: input.equipment ?? ALL_EQUIPMENT,
    blockStart: `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`,
    blockWeeks: 4,
  };
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
