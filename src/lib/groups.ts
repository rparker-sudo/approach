import { ALL_EQUIPMENT, getExercise } from './exercises';
import { estimateMinutes, restFor, RestContext, tierOf, withFloor } from './rest';
import type { Equipment, Exercise, ProgramExercise, Session } from './types';

/**
 * Supersets (rest-and-supersets.md §4, §6) and circuits (circuits-and-stations.md Part 1).
 * A block is a lettered group: 2 = superset (A1/A2), 3–4 = circuit (A1–A4), 1 = straight sets (used for stations).
 * Pure functions; no React.
 */

/** Grip-heavy: rows, pull-ups, carries, deadlifts. */
const GRIP_IDS = new Set(['trap-bar-deadlift', 'rdl', 'db-rdl', 'db-rdl2', 'wrist-roller', 'hang-clean']);
export const isGrip = (ex: Exercise) => ex.pattern === 'h-pull' || ex.pattern === 'v-pull' || ex.pattern === 'carry' || GRIP_IDS.has(ex.id);
/** Loads the legs hard: lower-body tier A/B. */
export const isLegHeavy = (ex: Exercise, equipment?: Equipment[]) => ex.category === 'lower' && ['A', 'B'].includes(tierOf(ex, equipment));

/** The equipment one exercise uses in this gym (empty = none needed). */
function setupOf(ex: Exercise, gym: Equipment[]): Equipment[] {
  const fitting = ex.equipment.filter((s) => s.every((i) => gym.includes(i)));
  const list = fitting.length ? fitting : ex.equipment;
  // Prefer a portable setup (bands over a cable stack) so pairs stay doable from one spot.
  const FIXED: Equipment[] = ['barbell', 'trap-bar', 'cable', 'pullup-bar'];
  const fixedCount = (x: Equipment[]) => x.filter((i) => FIXED.includes(i)).length;
  return [...list].sort((a, b) => fixedCount(a) - fixedCount(b) || a.length - b.length)[0] ?? [];
}

/**
 * Doable from one spot. Fixed equipment (barbell rack, trap bar, cable, pull-up bar) is a station: if any exercise uses
 * one, every exercise that needs equipment must use that same item. Portable gear (dumbbells, kettlebells, bands,
 * bench, box, med ball) and no-equipment work go anywhere.
 */
export function oneStation(exs: Exercise[], gym: Equipment[] = ALL_EQUIPMENT): boolean {
  const FIXED: Equipment[] = ['barbell', 'trap-bar', 'cable', 'pullup-bar'];
  const setups = exs.map((e) => setupOf(e, gym));
  const fixed = [...new Set(setups.flatMap((s) => s.filter((i) => FIXED.includes(i))))];
  if (fixed.length > 1) return false;
  if (fixed.length === 0) return true;
  return setups.every((s) => s.length === 0 || s.includes(fixed[0]));
}

export const PAIR_REASONS = {
  power: 'Power exercises are done on their own, fresh.',
  heavy: 'Heavy lifts get straight sets. You can add a light mobility drill during the rest.',
  legs: 'Both of these work the legs hard. Pair one with an upper-body exercise.',
  sameArea: 'Both of these work the same area hard. Pair one with a different movement.',
  grip: 'Both of these are hard on grip.',
  station: 'These are at different stations. Pairs need to be done from one spot.',
};

export const CIRCUIT_REASONS = {
  heavy: "Power and heavy lifts aren't done in circuits. They need full rest.",
  legs: 'Only one leg-heavy exercise per circuit. Swap one for upper body or core.',
  grip: 'Only one grip-heavy exercise per circuit.',
  pattern: 'These two work the same movement. Pick a different one.',
  station: 'Circuits need to be done from one spot.',
  size: 'Circuits are 3–4 exercises.',
};

/** §4b: why two exercises can't be a superset, or null. */
export function pairReason(a: Exercise, b: Exercise, gym: Equipment[] = ALL_EQUIPMENT): string | null {
  const ta = tierOf(a, gym);
  const tb = tierOf(b, gym);
  if (ta === 'P' || tb === 'P') return PAIR_REASONS.power;
  if (ta === 'A' || tb === 'A') return PAIR_REASONS.heavy;
  if (isLegHeavy(a, gym) && isLegHeavy(b, gym)) return PAIR_REASONS.legs;
  if ((a.pattern === 'hinge' && b.pattern === 'hinge') || (a.pattern === 'v-push' && b.pattern === 'v-push')) return PAIR_REASONS.sameArea;
  if (isGrip(a) && isGrip(b)) return PAIR_REASONS.grip;
  if (!oneStation([a, b], gym)) return PAIR_REASONS.station;
  return null;
}

/** C1–C4: why 3–4 exercises can't be a circuit, or null. */
export function circuitReason(exs: Exercise[], gym: Equipment[] = ALL_EQUIPMENT): string | null {
  if (exs.length < 3 || exs.length > 4) return CIRCUIT_REASONS.size;
  if (exs.some((e) => ['P', 'A'].includes(tierOf(e, gym)))) return CIRCUIT_REASONS.heavy;
  if (exs.filter((e) => isLegHeavy(e, gym)).length > 1) return CIRCUIT_REASONS.legs;
  if (exs.filter(isGrip).length > 1) return CIRCUIT_REASONS.grip;
  const pats = exs.map((e) => e.pattern);
  if (new Set(pats).size < pats.length) return CIRCUIT_REASONS.pattern;
  if (!oneStation(exs, gym)) return CIRCUIT_REASONS.station;
  return null;
}

/** Why a block of these exercises isn't allowed, or null. */
export function blockReason(exs: Exercise[], gym?: Equipment[]): string | null {
  if (exs.length <= 1) return null;
  if (exs.length === 2) return pairReason(exs[0], exs[1], gym);
  return circuitReason(exs, gym);
}

/** C5: no AMRAP / "max reps" / "for time" on tier B in a circuit for minors (warning on adult teams). */
export const CLOCK_REASON = 'For athletes under 18, strength work in a circuit keeps its reps. No racing the clock.';
export function clockProblem(pe: ProgramExercise, inCircuit: boolean, gym?: Equipment[]): boolean {
  if (!inCircuit) return false;
  const ex = getExercise(pe.exerciseId);
  if (tierOf(ex, gym) !== 'B') return false;
  return /amrap|max reps|as many|for time/i.test(`${pe.reps} ${pe.effort}`);
}

/** Blocks in list order: letter → indexes. */
export function blocksOf(list: ProgramExercise[]): Map<string, number[]> {
  const m = new Map<string, number[]>();
  list.forEach((pe, i) => {
    if (!pe.group) return;
    m.set(pe.group, [...(m.get(pe.group) ?? []), i]);
  });
  return m;
}

/** "A1", "B2"… for grouped rows (2+ in the block); null for straight sets. */
export function labelOf(list: ProgramExercise[], i: number): string | null {
  const g = list[i].group;
  if (!g) return null;
  const idx = blocksOf(list).get(g) ?? [];
  if (idx.length < 2) return null;
  return `${g}${idx.indexOf(i) + 1}`;
}

/**
 * Rest in blocks (§4c, 1b). For each exercise: the straight-set rest (restFor / coach within floors), then:
 *  - not last in a block of 2+: 15 s transition;
 *  - last in a superset: the longer straight-set rest minus 15 s;
 *  - last in a circuit: the longest straight-set rest minus 15 s per extra exercise, at least 45 s;
 *  - filler: 0 (done during the previous rest).
 * A coach rest on the last exercise wins, within the floors (circuits: at least 45 s).
 */
export function blockRests(list: ProgramExercise[], straight: number[], ctx: RestContext = {}): number[] {
  const out = [...straight];
  list.forEach((pe, i) => {
    if (pe.filler) out[i] = 0;
  });
  for (const idx of blocksOf(list).values()) {
    if (idx.length < 2) continue;
    const longest = Math.max(...idx.map((i) => straight[i]));
    idx.forEach((i, k) => {
      if (k < idx.length - 1) {
        out[i] = 15;
        return;
      }
      const pe = list[i];
      const coach = pe.restSetByCoach && typeof pe.restSec === 'number' ? withFloor(getExercise(pe.exerciseId), pe.restSec, ctx.equipment) : null;
      const auto = idx.length === 2 ? Math.max(15, longest - 15) : Math.max(45, longest - 15 * (idx.length - 1));
      out[i] = coach != null ? (idx.length >= 3 ? Math.max(45, coach) : coach) : auto;
    });
  }
  return out;
}

/** Straight-set rest for every row (coach within floors, else auto). */
export function straightRests(list: ProgramExercise[], ctx: RestContext = {}): number[] {
  return list.map((pe) => {
    const ex = getExercise(pe.exerciseId);
    if (pe.restSetByCoach && typeof pe.restSec === 'number' && !pe.group) return withFloor(ex, pe.restSec, ctx.equipment);
    return restFor(ex, pe, ctx);
  });
}

export function sessionMinutes(list: ProgramExercise[], ctx: RestContext = {}, kind: 'school' | 'home' = 'school'): number {
  const rests = blockRests(list, straightRests(list, ctx), ctx);
  return estimateMinutes(
    list.map((pe, i) => ({ ex: getExercise(pe.exerciseId), sets: pe.filler ? 0 : pe.sets, reps: pe.reps, restSec: rests[i] })),
    kind,
  );
}

const nextLetter = (list: ProgramExercise[]) => {
  const used = new Set(list.map((x) => x.group).filter(Boolean));
  return 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').find((c) => !used.has(c)) ?? 'Z';
};

/**
 * §4d / 1c auto-grouping. Pairs only when supersets are on or the session is over its target, and only until the
 * estimate fits. Order: accessories and core first, then secondary upper + lower, then upper push + pull. Never tier P
 * or A. If pairing alone doesn't fit, grow a pair to a trio (core or care first), then a fourth.
 */
export function autoGroup(session: Session, opts: { target: number; enabled: boolean; ctx?: RestContext; kind?: 'school' | 'home' }): Session {
  const ctx = opts.ctx ?? {};
  const gym = ctx.equipment ?? ALL_EQUIPMENT;
  let list = session.exercises.map((e) => ({ ...e }));
  const mins = () => sessionMinutes(list, ctx, opts.kind);
  if (!opts.enabled && mins() <= opts.target) return session;
  if (mins() <= opts.target) return session;
  const ex = (pe: ProgramExercise) => getExercise(pe.exerciseId);
  const free = () => list.map((pe, i) => ({ pe, i })).filter(({ pe }) => !pe.group && !pe.filler && !['P', 'A'].includes(tierOf(ex(pe), gym)));
  const isUpper = (e: Exercise) => e.category === 'upper';
  const isPush = (e: Exercise) => e.pattern === 'h-push' || e.pattern === 'v-push';
  const isPull = (e: Exercise) => e.pattern === 'h-pull' || e.pattern === 'v-pull';
  const passes: ((a: ProgramExercise, b: ProgramExercise) => boolean)[] = [
    (a, b) => ['accessory', 'core', 'care'].includes(a.role ?? '') && ['accessory', 'core', 'care'].includes(b.role ?? ''),
    (a, b) => (a.role === 'secondary' || b.role === 'secondary') && isUpper(ex(a)) !== isUpper(ex(b)),
    (a, b) => (isPush(ex(a)) && isPull(ex(b))) || (isPull(ex(a)) && isPush(ex(b))),
    () => true,
  ];
  const pairUp = (i: number, j: number) => {
    const g = nextLetter(list);
    const a = { ...list[i], group: g, autoGroup: true };
    const b = { ...list[j], group: g, autoGroup: true };
    const rest = list.filter((_, k) => k !== i && k !== j);
    rest.splice(Math.min(i, rest.length), 0, a, b);
    list = rest;
  };
  for (const ok of passes) {
    let paired = true;
    while (paired && mins() > opts.target) {
      paired = false;
      const f = free();
      outer: for (let x = 0; x < f.length; x++) {
        for (let y = x + 1; y < f.length; y++) {
          const a = f[x].pe;
          const b = f[y].pe;
          if (a.sets !== b.sets || !ok(a, b) || pairReason(ex(a), ex(b), gym)) continue;
          pairUp(f[x].i, f[y].i);
          paired = true;
          break outer;
        }
      }
    }
    if (mins() <= opts.target) break;
  }
  // Circuits: grow existing pairs to 3, then 4 (core or care first).
  for (const size of [3, 4]) {
    for (const [g, idx] of blocksOf(list)) {
      if (mins() <= opts.target) break;
      if (idx.length !== size - 1) continue;
      const cand = free()
        .filter(({ pe }) => pe.sets === list[idx[0]].sets)
        .sort((p, q) => Number(!['core', 'care'].includes(p.pe.role ?? '')) - Number(!['core', 'care'].includes(q.pe.role ?? '')));
      const pick = cand.find(({ pe }) => !circuitReason([...idx.map((k) => ex(list[k])), ex(pe)], gym));
      if (!pick) continue;
      const moved = { ...pick.pe, group: g, autoGroup: true };
      const without = list.filter((_, k) => k !== pick.i);
      const last = without.map((pe, k) => (pe.group === g ? k : -1)).filter((k) => k >= 0).pop()!;
      without.splice(last + 1, 0, moved);
      list = without;
    }
  }
  return { ...session, exercises: list };
}

/** Coach: group rows into one block (pair or circuit). Returns the new list, or a reason. */
export function groupRows(list: ProgramExercise[], rows: number[], gym?: Equipment[]): { list?: ProgramExercise[]; reason?: string } {
  const sorted = [...rows].sort((a, b) => a - b);
  if (sorted.length > 4) return { reason: CIRCUIT_REASONS.size };
  const reason = blockReason(sorted.map((i) => getExercise(list[i].exerciseId)), gym);
  if (reason) return { reason };
  const g = nextLetter(list);
  const picked = sorted.map((i) => ({ ...list[i], group: g, autoGroup: false }));
  const rest = list.filter((_, i) => !sorted.includes(i));
  rest.splice(Math.min(sorted[0], rest.length), 0, ...picked);
  return { list: rest };
}

/** Coach: ungroup a block (rows keep their order). */
export function ungroup(list: ProgramExercise[], letter: string): ProgramExercise[] {
  return list.map((pe) => (pe.group === letter ? { ...pe, group: undefined, autoGroup: false } : pe));
}
