import { addDays, dateKey, fromKey, weekdayOf } from './calendar';
import { ALL_EQUIPMENT, getExercise } from './exercises';
import type { GeneratorInput } from './generator';
import type { DayType, Phase, Program, ProgramExercise, ProgramPosition, Session, SlotRole } from './types';
import { uid } from './util';
import { FLAGS } from './flags';
import { planOf, rowFor, rxWeek } from './planner';

/**
 * 2.4.0 generator v3 (program-design §1–§9; spec Part 3; flag generatorV3). Approach Strength's volleyball programs:
 * annual plan → 4-week blocks → session architecture A–E → prescriptions by block and week → loading methods → weekly
 * templates → movement ladders → position emphasis → limits. The plan is written at the top rung; resolveSession gives each
 * athlete their rung and applies the block/week prescription, the methods they qualify for, and the §9 limits.
 */

export type BlockType = 'restore' | 'accumulation' | 'strength' | 'strength_power' | 'power' | 'maintain';
export type Method = 'straight' | 'top_backoff' | 'wave' | 'cluster' | 'contrast' | 'tempo' | 'iso';
export const BLOCK_LABEL: Record<BlockType, string> = {
  restore: 'Restore',
  accumulation: 'Accumulation',
  strength: 'Strength',
  strength_power: 'Strength-Power',
  power: 'Power',
  maintain: 'Maintain',
};
/** Tested lifts (§5): % of e1RM only for these. */
export const TESTED = new Set(['trap-bar-deadlift', 'back-squat', 'bench', 'goblet-squat', 'db-bench']);
/** Methods for advanced athletes with a coach-confirmed level only (§6, §9). */
export const ADVANCED_METHODS = new Set<Method>(['wave', 'cluster', 'contrast']);
export const DEPTH_JUMPS = new Set(['depth-jump']);
export const PLYO_CAP: Record<Phase, number> = { off: 70, pre: 40, in: 25, post: 70 };
export const DEPTH_CONTACT_CAP = 20;
export const DEPTH_BOX_NOTE = 'Box 12–18 in (45 cm max).';

/* ---------- §2 annual plan ---------- */
/** The block for a date: off-season Accumulation → Strength → Strength-Power, repeating from Strength. */
export function blockFor(phase: Phase, blockIndex: number, clubInSeason = false): BlockType {
  if (clubInSeason) return 'maintain';
  if (phase === 'post') return 'restore';
  if (phase === 'pre') return 'power';
  if (phase === 'in') return 'maintain';
  const seq: BlockType[] = ['accumulation', 'strength', 'strength_power'];
  return blockIndex < 3 ? seq[blockIndex] : seq[1 + ((blockIndex - 3) % 2)];
}

/**
 * Where a v3 program is on a date: block index and week (1–4; week 4 = deload). A coach break of 14+ days (TM-3) restarts the
 * current block at week 1 the day after the break.
 */
export function planWeek(program: Program, date: Date): { blockIndex: number; week: 1 | 2 | 3 | 4; block: BlockType; deload: boolean; taper?: boolean; phase?: Phase } {
  // 2.4.2 Part A (planner §1): a program with an end date follows its plan (derived from blockStart, endDate, endType and the
  // calendar; never stored). Without one it keeps the 2.4.1 rolling 4-week blocks below, unchanged.
  if (FLAGS.plannerV3 && program.endDate) {
    const plan = planOf(program);
    const row = plan ? rowFor(plan, date) : null;
    if (plan && row?.block) {
      let blockIndex = -1;
      for (const r of plan.rows.slice(0, row.week)) if (r.block && r.weekInBlock === 1) blockIndex++;
      return { blockIndex: Math.max(0, blockIndex), week: rxWeek(row), block: row.block, deload: row.deload, taper: row.taper, phase: row.phase };
    }
  }
  const d0 = fromKey(dateKey(date));
  let start = fromKey(program.blockStart ?? program.createdAt.slice(0, 10));
  let baseIndex = 0;
  for (const e of [...(program.events ?? [])].sort((a, b) => a.date.localeCompare(b.date))) {
    if (e.type !== 'break' || e.teamName || !e.endDate) continue;
    const len = Math.round((fromKey(e.endDate).getTime() - fromKey(e.date).getTime()) / 864e5) + 1;
    const after = addDays(fromKey(e.endDate), 1);
    if (len < 14 || after > d0 || after <= start) continue;
    // The block running when the break began restarts at week 1 the day after the break.
    const weeksBefore = Math.max(0, Math.floor((fromKey(e.date).getTime() - start.getTime()) / (7 * 864e5)));
    baseIndex += Math.floor(weeksBefore / 4);
    start = after;
  }
  const weeks = Math.max(0, Math.floor((d0.getTime() - start.getTime()) / (7 * 864e5)));
  const blockIndex = baseIndex + Math.floor(weeks / 4);
  const week = ((weeks % 4) + 1) as 1 | 2 | 3 | 4;
  const block = program.block === 'maintain' ? 'maintain' : blockFor(program.phase, blockIndex);
  return { blockIndex, week, block, deload: week === 4 && block !== 'maintain' };
}

/** Club season (§2): regular matches or tournaments on the athlete's combined calendar in the next 4 weeks. */
export function clubInSeason(events: { date: string; type: string; teamName?: string }[], from: Date): boolean {
  const k = dateKey(from);
  const end = dateKey(addDays(from, 28));
  const matches = events.filter((e) => (e.type === 'game' || e.type === 'tournament') && e.date >= k && e.date <= end);
  return matches.length >= 3;
}

/* ---------- §7 templates ---------- */
export type Slot = { role: SlotRole; id: string; method?: Method; note?: string };
export type Day = { name: string; focus: string; slots: Slot[]; heavyLegs?: boolean };
const A = (id: string, note?: string): Slot => ({ role: 'power', id, ...(note ? { note } : {}) });
const B = (id: string, method?: Method): Slot => ({ role: 'main', id, ...(method ? { method } : {}) });
const C = (id: string): Slot => ({ role: 'secondary', id });
const D = (id: string): Slot => ({ role: 'accessory', id });
const Core = (id: string): Slot => ({ role: 'core', id });
const E = (id: string): Slot => ({ role: 'care', id });

/** Durability circuits (§5e), by kind. */
const CIRCUIT: Record<string, string[]> = {
  knee: ['spanish-squat', 'iso-split-squat'],
  ankle: ['soleus-calf-raise', 'tib-raise'],
  shoulder: ['band-er', 'ytw', 'wall-slide'],
  hamstring: ['slider-ham-curl'],
  adductor: ['copenhagen'],
  hand: ['wrist-roller'],
};
const circuit = (...kinds: string[]) => kinds.flatMap((k) => CIRCUIT[k]).map(E);

export const T4: Day[] = [
  // 2.4.1 Part C: §7a Day 1 A-block as written, "Hang Power Clean + Depth Drop → Box Jump".
  { name: 'Day 1 Lower: squat', focus: 'Lower: squat', heavyLegs: true, slots: [A('hang-clean'), A('depth-drop'), A('box-jump'), B('back-squat'), C('split-squat'), C('copenhagen'), D('ghr'), Core('pallof'), ...circuit('knee', 'ankle')] },
  { name: 'Day 2 Upper: horizontal', focus: 'Upper: horizontal', slots: [A('mb-chest-pass'), A('mb-rotational'), B('bench'), C('db-row'), C('landmine-press'), D('face-pull'), D('chin-up'), ...circuit('shoulder')] },
  { name: 'Day 3 Lower: hinge', focus: 'Lower: hinge', heavyLegs: true, slots: [A('hang-high-pull'), A('hurdle-hop'), B('trap-bar-deadlift'), C('lateral-squat'), C('db-rdl'), D('nordic'), Core('ab-rollout'), ...circuit('hamstring', 'adductor')] },
  { name: 'Day 4 Upper: vertical', focus: 'Upper: vertical', slots: [A('push-press'), A('mb-overhead'), B('weighted-pullup'), C('db-incline-press'), C('chest-supported-row'), D('rear-delt-fly'), Core('suitcase-carry'), ...circuit('shoulder', 'hand')] },
];
export const T3: Day[] = [
  { name: 'Day 1 Lower + power', focus: 'Lower + power', heavyLegs: true, slots: [A('hang-clean'), A('box-jump'), B('back-squat'), C('split-squat'), C('nordic'), Core('pallof'), ...circuit('knee', 'ankle')] },
  { name: 'Day 2 Upper', focus: 'Upper', slots: [A('mb-overhead'), B('bench'), C('weighted-pullup'), C('db-row'), D('face-pull'), D('landmine-press'), ...circuit('shoulder')] },
  { name: 'Day 3 Total: hinge', focus: 'Total: hinge', heavyLegs: true, slots: [A('hang-high-pull'), A('hurdle-hop'), B('trap-bar-deadlift'), C('lateral-squat'), C('db-incline-press'), D('chin-up'), Core('suitcase-carry'), ...circuit('hamstring', 'adductor')] },
];
export const T2: Day[] = [
  { name: 'Day 1 Total: squat', focus: 'Total: squat', heavyLegs: true, slots: [A('hang-clean'), A('box-jump'), B('back-squat'), C('bench'), C('db-row'), D('db-rdl'), Core('pallof'), ...circuit('shoulder', 'knee').slice(0, 3)] },
  { name: 'Day 2 Total: hinge', focus: 'Total: hinge', heavyLegs: true, slots: [A('push-press'), A('mb-rotational'), B('trap-bar-deadlift'), C('split-squat'), C('weighted-pullup'), D('copenhagen'), D('face-pull'), ...circuit('ankle', 'hamstring')] },
];
export const T5_DAY5: Day = { name: 'Day 5 Power + care', focus: 'Power + care', slots: [A('clean-pull'), A('lateral-hurdle-hop'), A('mb-overhead'), A('mb-rotational'), A('mb-chest-pass'), A('trap-bar-jump'), ...circuit('shoulder', 'knee', 'ankle', 'adductor')] };
export const PRE3: Day[] = [
  { name: 'Day 1 Lower', focus: 'Lower', heavyLegs: true, slots: [{ ...A('hang-clean'), method: 'cluster' }, A('depth-jump', DEPTH_BOX_NOTE), B('back-squat'), C('lateral-squat'), C('copenhagen'), ...circuit('knee', 'ankle')] },
  { name: 'Day 2 Upper', focus: 'Upper', slots: [A('push-press'), A('mb-overhead'), B('bench'), C('weighted-pullup'), C('face-pull'), D('rear-delt-fly'), ...circuit('shoulder')] },
  { name: 'Day 3 Total', focus: 'Total', heavyLegs: true, slots: [A('jump-shrug'), A('single-leg-hop-stick'), B('trap-bar-deadlift'), C('split-squat'), C('db-row'), Core('pallof'), ...circuit('hamstring', 'hand')] },
];
export const IN2: Day[] = [
  { name: 'Day 1 Heavy', focus: 'Heavy', heavyLegs: true, slots: [A('hang-clean'), A('box-jump'), B('back-squat'), C('bench'), C('chin-up'), E('spanish-squat'), E('er-90-90-iso')] },
  { name: 'Day 2 Fast', focus: 'Fast', slots: [A('mb-overhead'), A('pogo'), B('trap-bar-jump'), C('db-row'), C('landmine-press'), E('soleus-calf-raise'), E('nordic')] },
];
export const POST: Day[] = [
  { name: 'Restore A', focus: 'Full body', slots: [A('pogo'), A('line-hops'), B('goblet-squat', 'tempo'), C('split-squat'), C('db-row'), D('glute-bridge'), ...circuit('shoulder', 'ankle')] },
  { name: 'Restore B', focus: 'Full body', slots: [A('skater-hop'), B('rdl', 'tempo'), C('lateral-lunge'), C('pushup'), Core('dead-bug'), ...circuit('knee', 'adductor')] },
  { name: 'Restore C', focus: 'Full body', slots: [A('pogo'), B('db-bench', 'tempo'), C('step-up'), C('inverted-row'), Core('side-plank'), ...circuit('hamstring', 'hand')] },
];

/** §7 template for phase, days and level (5 days only for advanced). Club season uses Maintain. */
export function templateFor(phase: Phase, days: number, experience: GeneratorInput['experience'], club = false): Day[] {
  if (club || phase === 'in') return days >= 3 ? [...IN2, { ...T3[2], name: 'Day 3 (bye week)', focus: 'Total: hinge' }] : IN2;
  if (phase === 'pre') return PRE3.slice(0, Math.max(1, Math.min(3, days)));
  if (phase === 'post') return POST.slice(0, Math.max(2, Math.min(3, days)));
  if (days >= 5 && experience === 'advanced') return [...T4, T5_DAY5];
  if (days >= 4) return T4;
  if (days === 3) return T3;
  return T2;
}

/* ---------- §8b position emphasis ---------- */
const VERTICAL = new Set(['box-jump', 'depth-drop', 'depth-jump', 'hurdle-hop', 'pogo', 'squat-jump', 'cmj', 'broad-jump', 'continuous-broad-jump', 'trap-bar-jump', 'single-leg-box-jump', 'single-leg-hop-stick', 'seated-box-jump']);
const LATERAL = new Set(['lateral-bound', 'skater-hop', 'lateral-hurdle-hop', 'line-hops']);
export const isVertical = (id: string) => VERTICAL.has(id);
export const isLateral = (id: string) => LATERAL.has(id);

/** §8b care picks by position (the E-block leads with these). */
export const POSITION_CARE: Record<string, string[]> = {
  'Middle Blocker': ['spanish-squat', 'soleus-calf-raise'],
  'Outside Hitter': ['band-er', 'er-90-90-iso', 'spanish-squat'],
  Opposite: ['band-er', 'er-90-90-iso', 'spanish-squat'],
  Setter: ['wrist-roller', 'band-er'],
  'Libero / DS': ['copenhagen', 'soleus-calf-raise'],
};

/** Position changes picks, not the plan: plyo and durability emphasis, and the "Other" adjustments. */
export function emphasize(day: Day, position: ProgramPosition, dayIndex: number): Day {
  let slots = [...day.slots];
  const pos = position;
  if (pos === 'Middle Blocker') {
    // Vertical/reactive/lateral plyo; knee/tendon + ankle durability; an extra lateral plyo set.
    if (!slots.some((s) => isLateral(s.id)) && slots.some((s) => s.role === 'power')) slots.splice(slots.filter((s) => s.role === 'power').length, 0, A('lateral-bound', 'Extra lateral set (middle blocker).'));
    slots = withCare(slots, ['spanish-squat', 'soleus-calf-raise']);
  } else if (pos === 'Outside Hitter' || pos === 'Opposite') {
    // Vertical + single-leg plyo; shoulder (2) + knee; an extra throw set.
    slots = slots.map((s) => (s.role === 'power' && isLateral(s.id) ? { ...s, id: 'single-leg-box-jump' } : s));
    slots = withCare(slots, ['band-er', 'er-90-90-iso', 'spanish-squat']);
    const throwSlot = slots.find((s) => s.role === 'power' && getExercise(s.id).pattern === 'throw');
    if (throwSlot) throwSlot.note = 'Extra throw set (outside/opposite).';
  } else if (pos === 'Setter') {
    // Lateral, quick ground contacts; hand/wrist + shoulder; vertical contacts −20% (applied to each athlete's contacts).
    slots = withCare(slots, ['wrist-roller', 'band-er']);
  } else if (pos === 'Libero / DS') {
    // Lateral, low positions; adductor + ankle; Lateral Squat as the primary C lift; vertical contacts −30%.
    const cIdx = slots.findIndex((s) => s.role === 'secondary' && getExercise(s.id).category === 'lower');
    if (cIdx >= 0) slots[cIdx] = { ...slots[cIdx], id: 'lateral-squat' };
    else if (slots.some((s) => s.role === 'secondary')) slots.splice(slots.findIndex((s) => s.role === 'secondary'), 0, C('lateral-squat'));
    slots = withCare(slots, ['copenhagen', 'soleus-calf-raise']);
  }
  // No duplicate exercise in a session (keep the first).
  const seen = new Set<string>();
  return { ...day, slots: slots.filter((s) => (seen.has(s.id) ? false : (seen.add(s.id), true))) };
}
/** Make sure the durability circuit leads with the position's picks. */
function withCare(slots: Slot[], picks: string[]): Slot[] {
  const care = slots.filter((s) => s.role === 'care');
  const rest = slots.filter((s) => s.role !== 'care');
  const merged = [...picks.map(E), ...care.filter((c) => !picks.includes(c.id))].slice(0, Math.max(care.length, 2));
  return [...rest, ...merged];
}
/** Vertical-contact multiplier by position (§8b). */
export const verticalFactor = (p: ProgramPosition) => (p === 'Setter' ? 0.8 : p === 'Libero / DS' ? 0.7 : 1);

/* ---------- §7f in-season placement ---------- */
const isMatch = (t: DayType) => t === 'game' || t === 'tournament';
/**
 * Lift days for a week (Monday first). In-season: Day 1 Heavy = earliest day after match-day +1, never within 2 days before a
 * match; Day 2 Fast = never the day before a match; never on match days. Other phases: spread, never on match days, heavy legs
 * not the day before a match.
 */
export function placeDays(week: DayType[], days: Day[], phase: Phase, club: boolean, only?: number[]): (number | null)[] {
  const out: (number | null)[] = days.map(() => null);
  const used = new Set<number>();
  const before = (i: number, n: number) => Array.from({ length: n }, (_, k) => week[(i + k + 1) % 7]).some(isMatch);
  const free = (i: number) => !isMatch(week[i]) && !used.has(i) && (!only || only.includes(i));
  if (phase === 'in' || club) {
    // Hard rules: never on a match day, never within 2 days before a match. Preference: not the day right after a match.
    const day1 = [0, 1, 2, 3, 4, 5, 6].find((i) => free(i) && !before(i, 2) && !isMatch(week[(i + 6) % 7])) ?? [0, 1, 2, 3, 4, 5, 6].find((i) => free(i) && !before(i, 2));
    if (day1 != null) {
      out[0] = day1;
      used.add(day1);
    }
    const day2 = [0, 1, 2, 3, 4, 5, 6].map((k) => ((day1 ?? 0) + 2 + k) % 7).find((i) => free(i) && !before(i, 1) && Math.abs(i - (day1 ?? -9)) > 1);
    const day2b = day2 ?? [0, 1, 2, 3, 4, 5, 6].find((i) => free(i) && !before(i, 1));
    if (days.length > 1 && day2b != null) {
      out[1] = day2b;
      used.add(day2b);
    }
    if (days.length > 2 && !week.some(isMatch)) {
      const d3 = [0, 1, 2, 3, 4, 5, 6].find((i) => free(i) && Math.abs(i - (out[0] ?? -9)) > 1 && Math.abs(i - (out[1] ?? -9)) > 1);
      if (d3 != null) out[2] = d3;
    }
    return out;
  }
  const order = days.length >= 4 ? [0, 1, 3, 4, 5, 2, 6] : days.length === 3 ? [0, 2, 4, 1, 3, 5, 6] : [1, 4, 0, 3, 2, 5, 6];
  days.forEach((d, k) => {
    const pick = order.find((i) => free(i) && !(d.heavyLegs && before(i, 1)));
    if (pick != null) {
      out[k] = pick;
      used.add(pick);
    }
  });
  return out;
}

/* ---------- build ---------- */
export const rowOf = (s: Slot): ProgramExercise => ({
  exerciseId: s.id,
  sets: 3,
  reps: '5',
  effort: 'RPE 7',
  role: s.role,
  ...(s.method ? { method: s.method } : {}),
  ...(s.note ? { notes: s.note } : {}),
});

/** generator v3: the program written at the top rung, with `block` set; prescriptions come from the block and week. */
export function generateProgramV3(input: GeneratorInput & { clubInSeason?: boolean }): Program {
  const club = !!input.clubInSeason;
  // §9 / R6: never more lift days than the level allows (beginner 3 · intermediate 4 · advanced 5 · in-season 3).
  const r6 = Math.min(input.experience === 'beginner' ? 3 : input.experience === 'intermediate' ? 4 : 5, input.phase === 'in' || club ? 3 : 5);
  const days = Math.max(1, Math.min(r6, input.liftDays?.length ?? input.liftDaysPerWeek));
  const tpl = templateFor(input.phase, days, input.experience, club).map((d, i) => emphasize(d, input.position, i));
  // Rows store the block's week-1 prescription for the program's level so the coach sees real numbers (2.4.1).
  const level = (input.experience === 'beginner' ? 1 : input.experience === 'intermediate' ? 2 : 3) as 1 | 2 | 3;
  const b0 = blockFor(input.phase, 0, club);
  const week1 = (s: Slot) => {
    const row = rowOf(s);
    const rx = prescribe(row, row.exerciseId, b0, 1, { level, confirmed: false, minor: true, phase: input.phase, position: input.position, dayIndex: 0 });
    return { ...row, sets: rx.sets, reps: rx.reps, effort: rx.effort };
  };
  const sessions: Session[] = tpl.map((d) => ({ id: uid(), name: d.name, focus: d.focus, source: 'approach', exercises: d.slots.map(week1) }));
  const placed = input.liftDays?.length
    ? placeDays(input.volleyballWeek, tpl, input.phase, club, input.liftDays)
    : placeDays(input.volleyballWeek, tpl, input.phase, club);
  const liftSchedule: (string | null)[] = Array(7).fill(null);
  placed.forEach((d, k) => {
    if (d != null && sessions[k]) liftSchedule[d] = sessions[k].id;
  });
  const now = new Date();
  return {
    id: uid(),
    name: input.name?.trim() || `${BLOCK_LABEL[blockFor(input.phase, 0, club)]} – ${input.position}`,
    forName: input.forName,
    author: input.author,
    position: input.position,
    phase: input.phase,
    experience: input.experience,
    volleyballWeek: [...input.volleyballWeek],
    liftSchedule,
    sessions,
    createdAt: now.toISOString(),
    equipment: input.equipment ?? ALL_EQUIPMENT,
    blockStart: dateKey(now),
    blockWeeks: 4,
    block: blockFor(input.phase, 0, club),
  };
}

/* ---------- §5 prescriptions ---------- */
/**
 * `level`: the level the prescription is written for (the athlete's, or 3 when "Adjust to level" is off).
 * `gateLevel`: the athlete's own level, always. The §9 athlete gates (contrast, cluster, wave, depth jumps) use it, so turning
 * level adjust off never unlocks advanced methods (2.4.1 B5, D-054).
 */
export type V3Ctx = { level: 1 | 2 | 3; gateLevel?: 1 | 2 | 3; confirmed: boolean; minor: boolean; phase: Phase; position: ProgramPosition; dayIndex: number };
export type Rx = { sets: number; reps: string; effort: string; pct?: number; method: Method; restSec: number; contacts?: number };

const OLY: Record<BlockType, [number, string, string]> = {
  restore: [3, '3', 'RPE 5–6'],
  accumulation: [4, '3', 'RPE 6–7'],
  strength: [5, '2', 'RPE 7'],
  strength_power: [5, '2', 'RPE 7–8'],
  power: [5, '2', 'RPE 7–8'],
  maintain: [3, '2', 'RPE 7'],
};
const THROW: Record<BlockType, [number, string]> = { restore: [2, '5'], accumulation: [3, '5'], strength: [3, '4'], strength_power: [3, '3'], power: [3, '3'], maintain: [2, '3'] };
/** Plyo contacts per session (§5a, top of each range). */
export const PLYO_CONTACTS: Record<BlockType, number> = { restore: 60, accumulation: 70, strength: 60, strength_power: 50, power: 40, maintain: 25 };
/** B-block by block and week: sets × reps, % (tested), RPE (untested), method. */
const MAIN: Record<BlockType, { sr: [number, string][]; pct: number[]; rpe: string; method: Method }> = {
  restore: { sr: [[3, '8']], pct: [60, 62.5, 65], rpe: 'RPE 6', method: 'tempo' },
  accumulation: { sr: [[4, '6–8']], pct: [65, 70, 72.5], rpe: 'RPE 7', method: 'straight' },
  strength: { sr: [[5, '5'], [5, '4'], [4, '3']], pct: [75, 80, 82.5], rpe: 'RPE 7–8', method: 'top_backoff' },
  strength_power: { sr: [[4, '3']], pct: [80, 82.5, 85], rpe: 'RPE 8', method: 'contrast' },
  power: { sr: [[3, '3'], [3, '2'], [3, '2']], pct: [80, 82.5, 85], rpe: 'RPE 7–8', method: 'cluster' },
  maintain: { sr: [[3, '3']], pct: [80, 80, 80], rpe: 'RPE 7', method: 'straight' },
};
const SEC: Record<BlockType, [number, string, string]> = {
  restore: [3, '8–10', 'RPE 7'],
  accumulation: [4, '8–10', 'RPE 7'],
  strength: [4, '5–6', 'RPE 7–8'],
  strength_power: [3, '4–5', 'RPE 7–8'],
  power: [3, '4–5', 'RPE 7–8'],
  maintain: [3, '5–6', 'RPE 7'],
};
const ACC: Record<BlockType, [number, string, string]> = {
  restore: [3, '10–12', 'RPE 7–8'],
  accumulation: [3, '10–12', 'RPE 7–8'],
  strength: [3, '8–10', 'RPE 7'],
  strength_power: [3, '8–10', 'RPE 7'],
  power: [2, '8–10', 'RPE 7'],
  maintain: [2, '8–10', 'RPE 7'],
};
const ISO = new Set(['spanish-squat', 'iso-split-squat', 'er-90-90-iso', 'wall-sit']);

/** Effort one RPE lower for beginners (§8). */
const down1 = (effort: string) => effort.replace(/RPE\s*(\d+)(?:(\s*[–-]\s*)(\d+))?/i, (_m, a: string, sep?: string, b?: string) => (b ? `RPE ${Number(a) - 1}${sep}${Number(b) - 1}` : `RPE ${Number(a) - 1}`));

/**
 * The prescription for one slot on a date. The method qualifies by level: contrast, cluster and wave only for advanced
 * athletes with a coach-confirmed level; beginners straight or tempo; otherwise top set + back-offs for intermediate+.
 * Week 4 deload: about week-1 intensity, RPE 6, about −40% sets, plyo contacts −50%, same rest.
 */
export function prescribe(pe: ProgramExercise, exerciseId: string, block: BlockType, week: 1 | 2 | 3 | 4, ctx: V3Ctx, maintainDay = 0): Rx {
  const ex = getExercise(exerciseId);
  const deload = week === 4 && block !== 'maintain';
  const wk = deload ? 0 : Math.min(2, week - 1);
  const advancedOk = (ctx.gateLevel ?? ctx.level) === 3 && ctx.confirmed;
  // R-2 case 1 (2.4.1): an athlete who doesn't qualify gets straight sets with the same sets × reps (contrast pair → two
  // straight-set exercises; cluster triples → straight sets of 3; wave → straight sets at the middle wave value).
  const qualify = (m: Method): Method => (ADVANCED_METHODS.has(m) && !advancedOk ? 'straight' : ctx.level === 1 && m === 'top_backoff' ? 'straight' : m);
  let rx: Rx;
  const role = pe.role ?? 'accessory';
  if (role === 'power') {
    if (ex.pattern === 'olympic' || (ex.pattern === 'jump' && ex.weighted)) {
      const [s, r, e] = OLY[block];
      rx = { sets: s, reps: r, effort: e, method: qualify((pe.method as Method) ?? 'straight'), restSec: 150 };
    } else if (ex.pattern === 'throw') {
      const [s, r] = THROW[block];
      rx = { sets: s, reps: r, effort: 'Max effort', method: 'straight', restSec: 90 };
    } else {
      // Plyometrics: the session's contact budget split across its plyo slots (set by the caller via `contacts`).
      rx = { sets: 3, reps: '5', effort: 'Max effort', method: 'straight', restSec: 75 };
    }
  } else if (role === 'main') {
    const m = MAIN[block];
    const [s, r] = block === 'maintain' ? (maintainDay === 1 ? [2, '5'] : [3, '3']) : m.sr[Math.min(m.sr.length - 1, wk)];
    const pct = block === 'maintain' ? (maintainDay === 1 ? 70 : 80) : m.pct[wk];
    const effort = block === 'maintain' ? (maintainDay === 1 ? 'RPE 6' : 'RPE 7') : m.rpe;
    // 2.4.1 Part C: wave loading (§6) in Strength-Power weeks 2–3, B-block: 3 waves of 5-3-2 for advanced athletes with a
    // coach-confirmed level. R-2: everyone else gets straight sets, same number of sets, reps = the middle wave value (3).
    const wave = block === 'strength_power' && !deload && (week === 2 || week === 3);
    const method = qualify(wave ? 'wave' : (pe.method as Method) ?? m.method);
    const [ws, wr] = wave ? (method === 'wave' ? [3, '5-3-2'] : [3, '3']) : [s, r];
    rx = { sets: ws, reps: wr, effort, ...(TESTED.has(exerciseId) ? { pct } : {}), method: ctx.level === 1 && method !== 'tempo' ? (block === 'restore' ? 'tempo' : 'straight') : method, restSec: 180 };
  } else if (role === 'secondary' && (ISO.has(exerciseId) || exerciseId === 'copenhagen' || exerciseId === 'short-lever-copenhagen')) {
    // Holds in a C slot keep time notation (§5e): 2–3 × 15–20 s each side.
    rx = { sets: Math.min(3, SEC[block][0]), reps: '20s each', effort: 'Controlled', method: 'iso', restSec: 60 };
  } else if (role === 'secondary') {
    const [s, r, e] = SEC[block];
    rx = { sets: s, reps: /each/.test(pe.reps) || ex.pattern === 'single-leg' ? `${r} each` : r, effort: e, method: 'straight', restSec: 105 };
  } else if (role === 'accessory' || role === 'core') {
    const [s, r, e] = ACC[block];
    rx = { sets: s, reps: r, effort: e, method: 'straight', restSec: 60 };
  } else {
    const iso = ISO.has(exerciseId);
    rx = iso
      ? { sets: 3, reps: '30s', effort: 'About 70% effort', method: 'iso', restSec: 30 }
      : exerciseId === 'copenhagen' || exerciseId === 'short-lever-copenhagen'
        ? { sets: 2, reps: '20s each', effort: 'Controlled', method: 'iso', restSec: 30 }
        : exerciseId === 'nordic'
          ? { sets: 2, reps: '4', effort: 'Controlled', method: 'straight', restSec: 45 }
          : { sets: 2, reps: '12–15', effort: 'Light', method: 'straight', restSec: 30 };
  }
  if (deload && role !== 'care') {
    rx = { ...rx, sets: Math.max(1, Math.round(rx.sets * 0.6)), effort: role === 'power' ? 'Easy, fast' : 'RPE 6', ...(rx.pct ? { pct: MAIN[block].pct[0] } : {}) };
  }
  if (ctx.level === 1 && /RPE/.test(rx.effort)) rx = { ...rx, effort: down1(rx.effort) };
  // §9 limits: % caps (≤ 85% minors, ≤ 90% adults); strength RPE ≤ 8 (beginners ≤ 7) applied by resolveSession's ceilings.
  if (rx.pct != null) rx = { ...rx, pct: Math.min(rx.pct, ctx.minor ? 85 : 90) };
  return rx;
}

/** Contacts in one jump row (every foot strike; "each" doubles). */
export function contactsOf(sets: number, reps: string): number {
  const n = Number(reps.match(/\d+/)?.[0] ?? 0);
  return sets * n * (/each/i.test(reps) ? 2 : 1);
}

export { weekdayOf };
