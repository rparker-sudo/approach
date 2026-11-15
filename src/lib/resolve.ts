import { addDays, dateKey, fromKey, today as todayDate } from './calendar';
import { ALL_EQUIPMENT, EXERCISES, fits, getExercise } from './exercises';
import { BEGINNER_EFFORT, homeAllowed, pickExercise, restSecFor } from './generator';
import { blockRests, blocksOf } from './groups';
import { BlockInfo, sessionForDate } from './progression';
import { estimateMinutes } from './rest';
import type { LevelTable } from './backend/types';
import type { Equipment, Exercise, Phase, Program, ProgramExercise, Session, WorkoutLog } from './types';

/**
 * The athlete layer (G-1, I1). Every session an athlete sees goes through `resolveSession`.
 * v2.2 pass 1 applies, in order:
 *  1. the day's version (deload week / coach-lightened day);
 *  2. level resolution for team programs (safety-guidelines §2a, G8);
 *  3. effort ceilings (R2: beginner 7, intermediate/advanced 8, in-season 7; returning from a break 6);
 *  4. rest (restFor tiers, coach setting within the floors);
 *  5. the session length estimate.
 * Pure functions; no React.
 */

export type Level = 1 | 2 | 3;

export type AthleteContext = {
  /** Level exercises resolve to: the lower of the athlete's team levels (Q-7), else their own experience. */
  level: Level;
  /** The athlete's whole workout history (G-2), for the return-from-break rule. */
  logs: WorkoutLog[];
  /** v2.2 pass 3: home equipment from this device (G-3). Missing = bodyweight. */
  homeEquipment?: Equipment[];
  /** Harder versions the athlete accepted (home bodyweight progression): exercise id → harder id. */
  harderPicks?: Record<string, string | null>;
};

export type ResolvedExercise = ProgramExercise & {
  /** The exercise in the coach's plan, when the athlete's version is different. */
  teamExerciseId?: string;
  /** Rest after each set for this athlete (coach setting within floors, else auto; in blocks: 15 s transitions and
   *  the rest after the round). */
  restSecResolved: number;
  /** Beginners: a circuit's 4th exercise done as straight sets after the circuit (C1). */
  afterCircuit?: boolean;
  /** Station this exercise belongs to (stations format). */
  stationId?: string;
};

export type ResolvedSession = {
  session: Session;
  exercises: ResolvedExercise[];
  /** Slots with no version at the athlete's level (left out). */
  dropped: number;
  swaps: { from: string; to: string }[];
  block: BlockInfo;
  light: boolean;
  /** G9: returning from a break this week. */
  easing: Easing;
  estMinutes: number;
  home: boolean;
  /** H2 light home day. */
  lightHome: boolean;
};

export type Easing = { active: boolean; until?: string };

/* ---------- 1.4 Return from a break (G9) ---------- */
/**
 * After 14+ days with no logged session (any program), the next 7 days are lighter:
 * strength effort tops out at RPE 6 and weight suggestions start about 10% lower.
 * The window starts on the first day back (the first log after the gap, or today if not logged yet).
 */
export function easingFor(logs: WorkoutLog[], today: Date = todayDate()): Easing {
  // Lift sessions only: gentle extra recovery doesn't end a break from lifting (judgment call, the safer reading).
  const days = [...new Set(logs.filter((l) => l.kind !== 'extra_recovery').map((l) => dateKey(new Date(l.date))))].sort();
  if (!days.length) return { active: false };
  const t = dateKey(today);
  const gap = (a: string, b: string) => Math.round((fromKey(b).getTime() - fromKey(a).getTime()) / 864e5);
  const past = days.filter((d) => d < t);
  const last = past[past.length - 1];
  // Not logged since the gap started: today is day 1 of the lighter week.
  if (last && gap(last, t) >= 14 && !days.includes(t)) return { active: true, until: dateKey(addDays(today, 6)) };
  // Came back recently: find the first log after the most recent 14+ day gap.
  let start: string | null = null;
  for (let i = 1; i < days.length; i++) if (gap(days[i - 1], days[i]) >= 14) start = days[i];
  if (start && start <= t && gap(start, t) < 7) return { active: true, until: dateKey(addDays(fromKey(start), 6)) };
  return { active: false };
}

/* ---------- 1.1 Level resolution (safety-guidelines §2a) ---------- */
const STRENGTH_ROLES = new Set(['main', 'secondary', 'accessory']);
export const isStrength = (pe: Pick<ProgramExercise, 'role'>, ex: Exercise) =>
  pe.role ? STRENGTH_ROLES.has(pe.role) : ex.category === 'lower' || ex.category === 'upper';

/**
 * The athlete's version of an exercise: keep it if it's at or below their level; else follow its `easier` chain
 * to the first exercise at or below their level that fits the program's equipment; else the lowest-level exercise
 * of the same pattern that fits; else null (drop the slot). Olympic lifts resolve to a jump below advanced.
 */
export function resolveExercise(ex: Exercise, level: Level, equipment: Equipment[]): Exercise | null {
  if (ex.level <= level && !(ex.pattern === 'olympic' && level < 3)) return ex;
  if (ex.pattern === 'olympic') {
    const jumps = EXERCISES.filter((e) => e.pattern === 'jump' && e.level <= level && fits(e, equipment));
    return jumps.find((e) => e.id === 'box-jump') ?? jumps.find((e) => e.id === 'squat-jump') ?? jumps[0] ?? null;
  }
  const seen = new Set<string>();
  let cur: Exercise | undefined = ex;
  while (cur?.easier && !seen.has(cur.easier)) {
    seen.add(cur.easier);
    cur = EXERCISES.find((e) => e.id === cur!.easier);
    if (cur && cur.level <= level && fits(cur, equipment)) return cur;
  }
  const same = EXERCISES.filter((e) => e.pattern === ex.pattern && e.level <= level && fits(e, equipment)).sort(
    (a, b) => a.level - b.level || a.id.localeCompare(b.id),
  );
  return same[0] ?? null;
}

/* ---------- 3.1 Home sessions (home-workouts.md §4): each athlete's version for their home equipment and level ---------- */
export function resolveHomeExercise(ex: Exercise, role: ProgramExercise['role'], level: Level, equipment: Equipment[], jumps: boolean, used: Set<string>): Exercise | null {
  if (ex.pattern === 'jump' && !jumps) return null;
  return (
    pickExercise([ex.pattern], role ?? 'accessory', {
      equipment,
      maxLevel: level,
      usedWeek: new Set(),
      usedSession: used,
      allow: (e) => homeAllowed(e, jumps) && e.level <= level,
    }) ?? null
  );
}

/* ---------- 1.6 Effort ceilings ---------- */
export function effortCeiling(level: Level, phase: Phase, easing: boolean): number {
  if (easing) return 6;
  if (phase === 'in') return 7;
  return level === 1 ? 7 : 8;
}

/** Caps a strength effort at the ceiling. "Failure", "to failure" and "max" in strength work become the ceiling. */
export function capEffort(effort: string, ceiling: number): string {
  if (/fail|\bmax\b/i.test(effort)) return `RPE ${ceiling}`;
  const m = effort.match(/RPE\s*(\d+)(?:\s*[–-]\s*(\d+))?/i);
  if (!m) return effort;
  const lo = Number(m[1]);
  const hi = Number(m[2] ?? m[1]);
  if (hi <= ceiling) return effort;
  if (lo >= ceiling) return effort.replace(m[0], `RPE ${ceiling}`);
  return effort.replace(m[0], `RPE ${lo}–${ceiling}`);
}

/* ---------- resolveSession ---------- */
export function resolveSession(program: Program, session: Session, athlete: AthleteContext, date: Date = todayDate()): ResolvedSession {
  const day = sessionForDate(program, session, date);
  const home = session.location === 'home';
  const lightHome = !!session.light;
  const equipment = home ? (lightHome ? [] : athlete.homeEquipment ?? []) : program.equipment?.length ? program.equipment : ALL_EQUIPMENT;
  const jumps = home && !lightHome && !!program.homeJumps && (program.phase === 'off' || program.phase === 'pre');
  const easing = easingFor(athlete.logs, date);
  const team = !!program.teamId;
  const swaps: { from: string; to: string }[] = [];
  let dropped = 0;
  const out: ResolvedExercise[] = [];
  const usedHome = new Set<string>();
  for (const pe of day.exercises) {
    const original = getExercise(pe.exerciseId);
    // Every program resolves to the athlete's level (team programs per G8; personal and shared programs as a backstop to G1).
    // Home sessions: the best exercise for the slot from the athlete's home equipment and level (H6 pool).
    let resolved = home ? resolveHomeExercise(original, pe.role, athlete.level, equipment, jumps, usedHome) : resolveExercise(original, athlete.level, equipment);
    // Harder version the athlete accepted (only at or below their level, and allowed here).
    const harderId = resolved ? athlete.harderPicks?.[resolved.id] : null;
    if (resolved && harderId && !lightHome) {
      const harder = EXERCISES.find((e) => e.id === harderId);
      if (harder && harder.level <= athlete.level && (!home || (homeAllowed(harder, jumps) && fits(harder, equipment)))) resolved = harder;
    }
    if (resolved) usedHome.add(resolved.id);
    if (!resolved) {
      dropped++;
      continue;
    }
    let effort = pe.effort;
    if (resolved.id !== original.id) swaps.push({ from: original.name, to: resolved.name });
    if (isStrength(pe, resolved)) {
      if (team && athlete.level === 1) effort = BEGINNER_EFFORT[effort] ?? effort;
      // H2: light home day tops out at RPE 6.
      effort = capEffort(effort, lightHome ? 6 : effortCeiling(athlete.level, program.phase, easing.active));
    }
    const next: ProgramExercise = { ...pe, exerciseId: resolved.id, effort };
    out.push({
      ...next,
      ...(resolved.id !== original.id ? { teamExerciseId: original.id } : {}),
      restSecResolved: 0,
    });
  }
  // C1: beginners see at most 3 in a circuit; a 4th is done as straight sets after it.
  if (athlete.level === 1) {
    for (const [g, idx] of blocksOf(out)) {
      if (idx.length < 4) continue;
      for (const i of idx.slice(3)) out[i] = { ...out[i], group: undefined, afterCircuit: true };
      const extra = idx.slice(3).map((i) => out[i]);
      const rest = out.filter((_, i) => !idx.slice(3).includes(i));
      const last = rest.map((pe, k) => (pe.group === g ? k : -1)).filter((k) => k >= 0).pop()!;
      rest.splice(last + 1, 0, ...extra);
      out.splice(0, out.length, ...rest);
    }
  }
  // Rest: straight-set rest (coach within floors, else auto), then blocks (15 s transitions, rest after the round).
  const ctx = { phase: program.phase, equipment: home ? equipment : program.equipment, home, light: lightHome };
  const rests = blockRests(out, out.map((pe) => restSecFor(pe, ctx)), ctx);
  out.forEach((pe, i) => (pe.restSecResolved = rests[i]));
  // Stations: which station each block belongs to.
  if (session.format === 'stations') {
    for (const st of session.stations ?? []) for (const pe of out) if (pe.group && st.groups.includes(pe.group)) pe.stationId = st.id;
  }
  const estMinutes = estimateMinutes(
    out.map((e) => ({ ex: getExercise(e.exerciseId), sets: e.filler ? 0 : e.sets, reps: e.reps, restSec: e.restSecResolved })),
    home ? 'home' : 'school',
  );
  return { session: day.session, exercises: out, dropped, swaps, block: day.block, light: day.light, easing, estMinutes, home, lightHome };
}

/** Swaps an athlete at a given level would get on a session (coach athlete detail). */
export function swapsFor(program: Program, session: Session, level: Level): { from: string; to: string | null }[] {
  const equipment = program.equipment?.length ? program.equipment : ALL_EQUIPMENT;
  const out: { from: string; to: string | null }[] = [];
  for (const pe of session.exercises) {
    const ex = getExercise(pe.exerciseId);
    const r = resolveExercise(ex, level, equipment);
    if (!r) out.push({ from: ex.name, to: null });
    else if (r.id !== ex.id) out.push({ from: ex.name, to: r.name });
  }
  return out;
}

/* ---------- 2.2.1 J1: the coach app's level table for member_levels ---------- */
const equipKey = (equipment?: Equipment[]) => (equipment?.length ? [...equipment].sort().join(',') : 'all');

/** Key for one program exercise in the level table (exercise + the program's equipment). */
export const levelKey = (exerciseId: string, equipment?: Equipment[]) => `${exerciseId}@${equipKey(equipment)}`;

/**
 * For each exercise in these programs: what it resolves to at levels 1, 2 and 3 (null = left out). The server uses it to
 * return only the adjusted exercises for each athlete, never another team's level (2.2.1 §6 J1).
 */
export function levelTable(programs: (Program | undefined)[]): LevelTable {
  const out: LevelTable = {};
  for (const program of programs) {
    if (!program) continue;
    const equipment = program.equipment?.length ? program.equipment : ALL_EQUIPMENT;
    for (const session of program.sessions) {
      for (const pe of session.exercises) {
        const k = levelKey(pe.exerciseId, program.equipment);
        if (out[k]) continue;
        const ex = getExercise(pe.exerciseId);
        out[k] = ([1, 2, 3] as Level[]).map((l) => resolveExercise(ex, l, equipment)?.id ?? null) as LevelTable[string];
      }
    }
  }
  return out;
}

/** What this athlete gets for a program exercise, given member_levels' `adjusted` map (undefined = not adjusted). */
export function adjustedFor(adjusted: Record<string, string | null> | undefined, exerciseId: string, equipment?: Equipment[]): string | null | undefined {
  if (!adjusted) return undefined;
  const k = levelKey(exerciseId, equipment);
  return k in adjusted ? adjusted[k] : undefined;
}

/* ---------- 1.6 Coach effort clamp (builder, D-028) ---------- */
export type EffortProblem = { block: boolean; message: string };

/**
 * Strength slots: above RPE 8 (7 in-season), "failure", "to failure" and "max" are blocked for teams with any minor,
 * and a warning on adult-only teams. Power slots may keep "Max effort" (max speed). Other slots aren't clamped.
 */
export function effortProblem(pe: Pick<ProgramExercise, 'role' | 'effort' | 'exerciseId'>, phase: Phase, hasMinor: boolean): EffortProblem | null {
  const ex = getExercise(pe.exerciseId);
  if (!isStrength(pe, ex)) return null;
  const ceiling = phase === 'in' ? 7 : 8;
  const nums = (pe.effort.match(/RPE\s*(\d+)(?:\s*[–-]\s*(\d+))?/i) ?? []).slice(1).filter(Boolean).map(Number);
  const tooHard = /fail|\bmax\b/i.test(pe.effort) || nums.some((n) => n > ceiling);
  if (!tooHard) return null;
  return {
    block: hasMinor,
    message: `For athletes under 18, strength work stays at RPE ${ceiling} or below. Stop with about 2 reps left.`,
  };
}
