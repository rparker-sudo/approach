import { GENERAL_POOL, fits } from './exercises';
import { ADULT_GOAL_RX, BACK_AFTER_BREAK_CARDIO, BACK_AFTER_BREAK_RAMP, defaultWeeks, goalLabel, Rx } from './general';
import type { CardioRx, Equipment, Exercise, Goal, Pattern, Program, ProgramExercise, Session, SlotRole, WarmupId } from './types';
import { uid } from './util';

/**
 * 2.3.0 F39a: a new general-team program. Not the volleyball generator: the goal fills each slot's defaults
 * (adult-goals.md §2) and the split follows §3. Everything is a starting point the trainer edits.
 */
type Slot = { pattern: Pattern; role: SlotRole };
type Template = { name: string; focus: string; warmup: WarmupId; slots: Slot[] };

const FULL_A: Template = { name: 'Full body A', focus: 'Full body', warmup: 'W1', slots: [
  { pattern: 'squat', role: 'main' }, { pattern: 'h-push', role: 'secondary' }, { pattern: 'h-pull', role: 'secondary' }, { pattern: 'hinge', role: 'accessory' }, { pattern: 'core-ext', role: 'core' },
] };
const FULL_B: Template = { name: 'Full body B', focus: 'Full body', warmup: 'W1', slots: [
  { pattern: 'hinge', role: 'main' }, { pattern: 'v-push', role: 'secondary' }, { pattern: 'v-pull', role: 'secondary' }, { pattern: 'single-leg', role: 'accessory' }, { pattern: 'core-rot', role: 'core' },
] };
const FULL_C: Template = { name: 'Full body C', focus: 'Full body', warmup: 'W1', slots: [
  { pattern: 'single-leg', role: 'main' }, { pattern: 'h-push', role: 'secondary' }, { pattern: 'h-pull', role: 'accessory' }, { pattern: 'shoulder-care', role: 'care' }, { pattern: 'core-ext', role: 'core' },
] };
const UPPER: Template = { name: 'Upper', focus: 'Upper body', warmup: 'W3', slots: [
  { pattern: 'h-push', role: 'main' }, { pattern: 'h-pull', role: 'secondary' }, { pattern: 'v-push', role: 'secondary' }, { pattern: 'v-pull', role: 'accessory' }, { pattern: 'arm-flex', role: 'accessory' }, { pattern: 'arm-ext', role: 'accessory' },
] };
const LOWER: Template = { name: 'Lower', focus: 'Lower body', warmup: 'W2', slots: [
  { pattern: 'squat', role: 'main' }, { pattern: 'hinge', role: 'secondary' }, { pattern: 'single-leg', role: 'accessory' }, { pattern: 'knee-flex', role: 'accessory' }, { pattern: 'core-ext', role: 'core' },
] };

/** Monday-first training days for n sessions (always leaves at least one day off). */
export const DAYS_FOR: Record<number, number[]> = { 1: [0], 2: [0, 3], 3: [0, 2, 4], 4: [0, 1, 3, 4], 5: [0, 1, 2, 4, 5], 6: [0, 1, 2, 3, 4, 5] };

function split(goal: Goal, n: number): Template[] {
  if (n === 4 && (goal === 'strength' || goal === 'muscle')) return [UPPER, LOWER, { ...UPPER, name: 'Upper 2' }, { ...LOWER, name: 'Lower 2' }];
  const cycle = [FULL_A, FULL_B, FULL_C];
  return Array.from({ length: n }, (_, i) => cycle[i % 3]);
}

function pick(pattern: Pattern, role: SlotRole, equipment: Equipment[], used: Set<string>): Exercise | undefined {
  const ok = GENERAL_POOL.filter((e) => e.pattern === pattern && fits(e, equipment) && !used.has(e.id) && e.level <= 2 && !e.durationOnly);
  const pref = (e: Exercise) => (role === 'main' ? (e.tier === 'A' ? 0 : e.tier === 'B' ? 1 : 2) : role === 'secondary' ? (e.tier === 'B' ? 0 : e.tier === 'A' ? 1 : 2) : e.tier === 'C' ? 0 : 1);
  return ok.sort((a, b) => pref(a) - pref(b) || Number(b.weighted) - Number(a.weighted) || a.id.localeCompare(b.id))[0];
}

/** The goal's defaults for a role (Back after a break: week 1 of the ramp). */
export function rxFor(goal: Goal, role: SlotRole): Rx {
  if (goal === 'back_after_break') {
    const r = BACK_AFTER_BREAK_RAMP[1];
    if (role === 'power') return null;
    if (role === 'core' || role === 'care' || role === 'mobility') return ADULT_GOAL_RX.general[role] as Rx;
    return { sets: role === 'main' ? r.mainSets : r.otherSets, reps: r.reps, effort: r.effort };
  }
  return ADULT_GOAL_RX[goal][role] as Rx;
}

export function cardioFor(goal: Goal): CardioRx {
  return goal === 'back_after_break' ? BACK_AFTER_BREAK_CARDIO : (ADULT_GOAL_RX[goal].cardio as CardioRx);
}

/** A cardio row for this gym (the first cardio exercise that fits, else walk-jog). */
export function cardioRow(goal: Goal, equipment: Equipment[]): ProgramExercise {
  const ex = GENERAL_POOL.find((e) => e.durationOnly && e.id !== 'walk-jog' && e.level === 1 && fits(e, equipment)) ?? GENERAL_POOL.find((e) => e.id === 'walk-jog')!;
  const rx = cardioFor(goal);
  return { exerciseId: ex.id, sets: 1, reps: `${rx.minutes} min`, effort: rx.intensity === 'easy' ? 'Easy' : 'Moderate', cardio: rx };
}

export function starterSessions(goal: Goal, n: number, equipment: Equipment[]): Session[] {
  return split(goal, n).map((t) => {
    const used = new Set<string>();
    const exercises: ProgramExercise[] = [];
    const slots = goal === 'muscle' && t.focus === 'Full body' ? [...t.slots, { pattern: 'shoulder-iso' as Pattern, role: 'accessory' as SlotRole }] : t.slots;
    for (const s of slots) {
      const ex = pick(s.pattern, s.role, equipment, used);
      const rx = rxFor(goal, s.role);
      if (!ex || !rx) continue;
      used.add(ex.id);
      exercises.push({ exerciseId: ex.id, sets: rx.sets, reps: rx.reps, effort: rx.effort, role: s.role });
    }
    if (goal === 'general' || goal === 'back_after_break') exercises.push(cardioRow(goal, equipment));
    // 2.4.0: goal defaults applied by Approach (§0.1); the warm-up is generated (W1–W3 replaced, warmups.md §5).
    return { id: uid(), name: t.name, focus: t.focus, exercises, source: 'approach' as const };
  });
}

export function newGeneralProgram(opts: { id: string; teamId: string; teamName: string; groupKey: string; goal: Goal; weeks: number; perWeek: number; name: string; equipment: Equipment[]; author?: string }): Program {
  const sessions = starterSessions(opts.goal, opts.perWeek, opts.equipment);
  const days = DAYS_FOR[opts.perWeek] ?? DAYS_FOR[3];
  const liftSchedule: (string | null)[] = Array(7).fill(null);
  days.forEach((d, i) => (liftSchedule[d] = sessions[i]?.id ?? null));
  return {
    id: opts.id,
    name: opts.name || `${goalLabel(opts.goal)} · ${opts.weeks} weeks`,
    author: opts.author,
    position: 'All positions',
    phase: 'off',
    experience: 'intermediate',
    volleyballWeek: ['off', 'off', 'off', 'off', 'off', 'off', 'off'],
    liftSchedule,
    sessions,
    createdAt: new Date().toISOString(),
    teamId: opts.teamId,
    teamName: opts.teamName,
    groupKey: opts.groupKey,
    unposted: true,
    events: [],
    equipment: opts.equipment,
    general: true,
    goal: opts.goal,
    weeks: defaultWeeks(opts.goal, opts.weeks),
  };
}
