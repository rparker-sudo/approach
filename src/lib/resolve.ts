import { addDays, dateKey, fromKey, today as todayDate } from './calendar';
import { ALL_EQUIPMENT, EXERCISES, exercisePool, fits, getExercise, registerCustomExercises } from './exercises';
import { GENERAL_EASIER } from './generalLibrary';
import { BACK_AFTER_BREAK_RAMP, clampCardio, programWeeks, RPE_CEILING, shiftBeginner, weekIndex, withWeekRpe } from './general';
import { BEGINNER_EFFORT, homeAllowed, pickExercise, restSecFor } from './generator';
import { FLAGS } from './flags';
import { ladderResolve } from './ladders';
import { contactsOf, DEPTH_CONTACT_CAP, DEPTH_JUMPS, isVertical, PLYO_CAP, PLYO_CONTACTS, planWeek, prescribe, verticalFactor } from './generatorV3';
import { blockRests, blocksOf } from './groups';
import { BlockInfo, lighten, sessionForDate } from './progression';
import { addBack, estimateSession, fitSession, targetFor, undoneTrims, type FitCtx, type Target } from './fit';
import { warmupFor, type WarmupCtx } from './warmup';
import type { LevelTable } from './backend/types';
import type { Equipment, Exercise, Phase, Program, ProgramExercise, ProgramPosition, Session, SessionSource, SessionWarmup, WorkoutLog } from './types';

/**
 * The athlete layer (G-1, I1). Every session an athlete sees goes through `resolveSession`.
 * v2.2 pass 1 applies, in order:
 *  1. the day's version (deload week / coach-lightened day);
 *  2. level resolution for team programs (safety-guidelines §2a, G8);
 *  3. effort ceilings (R2: beginner 7, intermediate/advanced 8, in-season 7; returning from a break 6);
 *  4. rest (restFor tiers, coach setting within the floors);
 *  5. the session length estimate.
 * 2.4.0 (Training v3, D-044/D-045/D-046/D-047):
 *  - the generated-program limits (effort ceilings, rest floors, C1, H2, the trainer RPE 8 cap, ramp weeks) apply only to
 *    `source = 'approach'` sessions; a coach-built session is resolved exactly as written, rest as typed;
 *  - "Adjust exercises to each athlete's level" (athlete → session → program, most specific wins) turns the level swap
 *    and the G9 easing on or off;
 *  - the warm-up (generated, the coach's, or none), the session target, and Fit to time for generated sessions.
 * Pure functions; no React.
 */

/* ---------- 2.4.0 §0.1: who wrote the session ---------- */
/**
 * `session.source`, or the migration rule for sessions saved before 2.4.0: a session a coach or trainer posted (team
 * programs) is 'coach'; one that came straight from the generator (personal programs) is 'approach'.
 */
export function sourceOf(program: Pick<Program, 'teamId' | 'general' | 'postedAt'>, session: Pick<Session, 'source'>): SessionSource {
  if (session.source) return session.source;
  return program.teamId || program.general || program.postedAt ? 'coach' : 'approach';
}

/** §0.1: a coach's edit to exercises, sets, reps, effort, rest, grouping, order or stations makes the session theirs. */
export function coachEdit(session: Session): Session {
  return { ...session, source: 'coach', fitLog: undefined };
}

/* ---------- 2.4.0 §1.2: "Adjust exercises to each athlete's level" ---------- */
/**
 * Most specific wins (CLAUDE.md known conflict 3): an athlete in `levelAdjustOffFor` always gets the written program;
 * otherwise the session override (on or off); otherwise the program setting (default on).
 */
export function levelAdjustFor(program: Pick<Program, 'levelAdjust' | 'levelAdjustOffFor'>, session: Pick<Session, 'levelAdjust'> | null | undefined, userId?: string | null): boolean {
  if (userId && program.levelAdjustOffFor?.includes(userId)) return false;
  if (session && typeof session.levelAdjust === 'boolean') return session.levelAdjust;
  return program.levelAdjust !== false;
}

/** The warm-up context for a session (position add-on, equipment, limited space, home, trainer cardio, rotation, deload). */
export function warmupCtxFor(program: Program, session: Session, equipment: Equipment[], extra: { deload?: boolean; home?: boolean; compact?: boolean } = {}): WarmupCtx {
  const w = session.warmup;
  const limited = w && typeof w === 'object' ? !!w.limitedSpace : false;
  const rotation = Math.max(0, program.sessions.filter((x) => !x.mobility).findIndex((x) => x.id === session.id));
  return {
    phase: program.phase,
    position: (program.position ?? null) as ProgramPosition | null,
    equipment,
    limitedSpace: limited,
    home: extra.home ?? session.location === 'home',
    general: !!program.general,
    rotation,
    deload: extra.deload,
    compact: extra.compact,
  };
}

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
  /** 2.4.0: the athlete's account id (for the per-athlete "Adjust to level" override). */
  userId?: string | null;
  /** 2.4.0 generator v3: the team coach confirmed the level (advanced methods and depth jumps need it, §9). */
  levelConfirmed?: boolean;
  /** 2.4.0 generator v3: under 18 (% caps ≤ 85). Missing = treated as a minor (the safer reading). */
  minor?: boolean;
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
  /** 2.4.0: who wrote the session (§0.1). */
  source: SessionSource;
  /** 2.4.0: level versions applied for this athlete (§1.2). */
  levelAdjust: boolean;
  /** 2.4.0: the warm-up card (null = none). */
  warmup: (SessionWarmup & { source: 'approach' | 'edited' | 'template' }) | null;
  /** 2.4.0: the session's target length (date → weekday → program → phase). */
  target: Target;
  /** 2.4.0: generated sessions under ~25 min (§4a Express). */
  express: boolean;
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
export function resolveExercise(ex: Exercise, level: Level, equipment: Equipment[], pool: Exercise[] = EXERCISES): Exercise | null {
  const general = pool !== EXERCISES && pool !== exercisePool(false);
  // 2.3.0 general teams: the exercise must also fit the gym equipment profile (F40); volleyball keeps 2.2.1 behavior.
  // 2.4.0 catalogV3: Olympic derivatives are gated by their own level (L2 for intermediate athletes; HPC stays L3).
  const olympicGate = !FLAGS.catalogV3 && ex.pattern === 'olympic' && level < 3;
  if (ex.level <= level && !olympicGate && (!general || fits(ex, equipment))) return ex;
  // 2.4.0 catalogV3: movement ladders (program-design §8a) when the exercise is on one.
  if (FLAGS.catalogV3) {
    // General gyms: the trainer library's easier option (e.g., the assisted pull-up) first, when it fits (catalog §3 note).
    const alt = general ? GENERAL_EASIER[ex.id] : undefined;
    const altEx = alt ? pool.find((x) => x.id === alt) : undefined;
    if (altEx && altEx.level <= level && fits(altEx, equipment)) return altEx;
    const rung = ladderResolve(ex, level, equipment, general ? pool : exercisePool(false));
    if (rung) return rung;
  }
  if (ex.pattern === 'olympic') {
    const jumps = pool.filter((e) => e.pattern === 'jump' && e.level <= level && fits(e, equipment));
    return jumps.find((e) => e.id === 'box-jump') ?? jumps.find((e) => e.id === 'squat-jump') ?? jumps[0] ?? null;
  }
  const seen = new Set<string>();
  let cur: Exercise | undefined = ex;
  const easierOf = (e: Exercise): string | undefined => {
    const alt = general ? GENERAL_EASIER[e.id] : undefined;
    const altEx = alt ? pool.find((x) => x.id === alt) : undefined;
    return altEx && fits(altEx, equipment) ? alt : e.easier;
  };
  while (cur && easierOf(cur) && !seen.has(easierOf(cur)!)) {
    const next: string = easierOf(cur)!;
    seen.add(next);
    cur = pool.find((e) => e.id === next);
    if (cur && cur.level <= level && fits(cur, equipment)) return cur;
  }
  const same = pool.filter((e) => e.pattern === ex.pattern && e.level <= level && fits(e, equipment)).sort(
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

/**
 * Coach views (builder, week grid): the session's estimate against its target, as written (coach-built) or as fitted
 * (Approach-generated, minus any trim the coach undid). No athlete layer.
 */
export function coachEstimate(program: Program, session: Session, date?: Date | null, weekday?: number | null): { minutes: number; target: Target; express: boolean } {
  registerCustomExercises(program.customExercises);
  const home = session.location === 'home';
  const equipment = home ? [] : program.equipment?.length ? program.equipment : ALL_EQUIPMENT;
  const approach = sourceOf(program, session) === 'approach';
  const ctx: FitCtx = {
    rest: { phase: program.phase, equipment: home ? [] : program.equipment, home, light: !!session.light, free: !approach },
    warmup: warmupCtxFor(program, session, equipment),
    kind: home ? 'home' : 'school',
  };
  const target = targetFor(program, session, date, weekday);
  if (approach && !session.light && !session.mobility) {
    const fit = fitSession(session, target.minutes, ctx, { skip: undoneTrims(session) });
    return { minutes: fit.after, target, express: fit.express };
  }
  return { minutes: estimateSession(session, ctx), target, express: false };
}

/* ---------- resolveSession ---------- */
export function resolveSession(program: Program, session: Session, athlete: AthleteContext, date: Date = todayDate()): ResolvedSession {
  // 2.3.1: the program's own exercises resolve like library ones (level, tier, equipment).
  registerCustomExercises(program.customExercises);
  if (program.general) return resolveGeneral(program, session, athlete, date);
  const day = sessionForDate(program, session, date);
  const home = session.location === 'home';
  const lightHome = !!session.light;
  const equipment = home ? (lightHome ? [] : athlete.homeEquipment ?? []) : program.equipment?.length ? program.equipment : ALL_EQUIPMENT;
  const source = sourceOf(program, session);
  const approach = source === 'approach';
  // H7: home jumps when the coach turns them on; Approach's own sessions add them in off-season and preseason only.
  const jumps = home && !lightHome && !!program.homeJumps && (!approach || program.phase === 'off' || program.phase === 'pre');
  const adjust = levelAdjustFor(program, session, athlete.userId);
  // G9 easing is part of the level adjustment (§1.2): off means exactly what the coach wrote.
  const easing = adjust ? easingFor(athlete.logs, date) : { active: false };
  const team = !!program.teamId;
  const swaps: { from: string; to: string }[] = [];
  let dropped = 0;
  const out: ResolvedExercise[] = [];
  const usedHome = new Set<string>();
  const restCtx = { phase: program.phase, equipment: home ? equipment : program.equipment, home, light: lightHome, free: !approach };
  const target = targetFor(program, session, date);
  const fitCtx: FitCtx = { rest: restCtx, warmup: warmupCtxFor(program, session, equipment, { deload: day.block.deload }), kind: home ? 'home' : 'school' };
  // §1.4: Approach-generated sessions fit the day's target automatically (minus any trim the coach undid).
  // 2.4.0 generator v3: the block and week drive the prescription (deload handled there, not by the 2.3.0 lighten).
  const v3 = approach && !!program.block;
  const v3w = v3 ? planWeek(program, date) : null;
  let written: ProgramExercise[] = v3 ? (day.light ? lighten(session.exercises, 'light') : session.exercises) : day.exercises;
  if (v3 && v3w) written = applyV3(program, session, written, v3w, athlete, adjust);
  let compactWarmup = false;
  let express = false;
  if (approach && !lightHome && !session.mobility) {
    const fit = fitSession({ ...session, exercises: written }, target.minutes, fitCtx, { skip: undoneTrims(session) });
    const more = fit.trims.length || fit.express ? { session: fit.session } : addBack(fit.session, target.minutes, fitCtx);
    written = more.session.exercises;
    compactWarmup = fit.compactWarmup;
    express = fit.express;
  }
  for (const pe of written) {
    const original = getExercise(pe.exerciseId);
    // Every program resolves to the athlete's level (team programs per G8; personal and shared programs as a backstop to G1),
    // unless "Adjust to level" is off for this athlete, session or program (2.4.0 §1.2).
    // Home sessions: the best exercise for the slot from the athlete's home equipment and level (H6 pool). A coach's own
    // exercise stays when the athlete has the equipment for it (H6 is a suggestion filter now, §1.1 item 7).
    let resolved: Exercise | null;
    if (!adjust) resolved = original;
    else if (home && !approach && fits(original, equipment) && original.level <= athlete.level) resolved = original;
    else if (home && v3 && FLAGS.catalogV3) resolved = ladderResolve(original, athlete.level, equipment, exercisePool(false), { home: true }) ?? resolveHomeExercise(original, pe.role, athlete.level, equipment, jumps, usedHome);
    else resolved = home ? resolveHomeExercise(original, pe.role, athlete.level, equipment, jumps, usedHome) : resolveExercise(original, athlete.level, equipment);
    // §9 (generated): depth jumps only for advanced athletes with a coach-confirmed level; otherwise the next rung.
    if (v3 && resolved && DEPTH_JUMPS.has(resolved.id) && !(athlete.level === 3 && athlete.levelConfirmed)) resolved = getExercise('depth-drop');
    // Harder version the athlete accepted (only at or below their level, and allowed here).
    const harderId = resolved && adjust ? athlete.harderPicks?.[resolved.id] : null;
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
      if (approach) {
        // program-design §9 / R2 (generated sessions only): beginner effort, the ceilings, H2 light home day ≤ RPE 6.
        // (v3 prescriptions already set beginners one RPE lower.)
        if (team && athlete.level === 1 && !v3) effort = BEGINNER_EFFORT[effort] ?? effort;
        effort = capEffort(effort, lightHome ? 6 : effortCeiling(athlete.level, program.phase, easing.active));
      } else if (easing.active) {
        // Coach-built: exactly as written, except the G9 easing-back-in week while "Adjust to level" is on.
        effort = capEffort(effort, 6);
      }
    }
    const next: ProgramExercise = { ...pe, exerciseId: resolved.id, effort };
    out.push({
      ...next,
      ...(resolved.id !== original.id ? { teamExerciseId: original.id } : {}),
      restSecResolved: 0,
    });
  }
  // C1: beginners see at most 3 in a circuit; a 4th is done as straight sets after it (generated sessions only, §0.1).
  if (athlete.level === 1 && approach && adjust) {
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
  // Rest: straight-set rest (generated: within floors; coach-built: as typed), then blocks (15 s transitions, rest after the round).
  const rests = blockRests(out, out.map((pe) => restSecFor(pe, restCtx)), restCtx);
  out.forEach((pe, i) => (pe.restSecResolved = rests[i]));
  // Stations: which station each block belongs to.
  if (session.format === 'stations') {
    for (const st of session.stations ?? []) for (const pe of out) if (pe.group && st.groups.includes(pe.group)) pe.stationId = st.id;
  }
  // The warm-up is built from what this athlete actually does today (their versions).
  const mine: Session = { ...session, exercises: out };
  const wctx = { ...fitCtx.warmup, compact: compactWarmup };
  const warmup = warmupFor(mine, wctx);
  const estMinutes = estimateSession(mine, { ...fitCtx, warmup: wctx }, { rests });
  return { session: day.session, exercises: out, dropped, swaps, block: day.block, light: day.light, easing, estMinutes, home, lightHome, source, levelAdjust: adjust, warmup, target, express };
}

/** F51d / F51g athlete Today: "About 52 min" (+ " (planned for 45)" when a set target differs by 5+), "Express · " first. */
export function lengthLine(r: Pick<ResolvedSession, 'estMinutes' | 'target' | 'express'>): { text: string; planned: string | null } {
  const planned = r.target.source !== 'phase' && Math.abs(r.estMinutes - r.target.minutes) >= 5 ? `(planned for ${r.target.minutes})` : null;
  return { text: `${r.express ? 'Express · ' : ''}About ${r.estMinutes} min`, planned };
}

/** Swaps an athlete at a given level would get on a session (coach athlete detail). */
export function swapsFor(program: Program, session: Session, level: Level): { from: string; to: string | null }[] {
  const equipment = program.equipment?.length ? program.equipment : ALL_EQUIPMENT;
  const out: { from: string; to: string | null }[] = [];
  for (const pe of session.exercises) {
    const ex = getExercise(pe.exerciseId);
    if (pe.cardio) continue;
    const r = resolveExercise(ex, level, equipment, exercisePool(!!program.general));
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
    registerCustomExercises(program.customExercises);
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

/* ---------- 2.3.0 general teams (adult-training-rules.md, adult-goals.md) ---------- */
/**
 * The general-team version of resolveSession (same G-1 entry point; never called for volleyball programs):
 *  1. the week: deload (about −40% sets, RPE 6, same rest) or a trainer-lightened date; "Back after a break" ramp weeks 1–4
 *     (week 1 level 1 only, week 2 max level 2, no power in weeks 1–2, the ramp's sets/reps/effort);
 *  2. level resolution with the general library and the gym equipment profile (G8, F40);
 *  3. effort: the week's RPE on main/secondary, beginners one RPE lower (a default), then the RPE 8 cap (6 when easing back, G9);
 *  4. cardio stays duration-only (5–60 min, Easy/Moderate; Back after a break: Easy, ≤ 15);
 *  5. rest floors and the estimate as built.
 */
function resolveGeneral(program: Program, session: Session, athlete: AthleteContext, date: Date): ResolvedSession {
  const pool = exercisePool(true);
  const home = session.location === 'home';
  const equipment = home ? athlete.homeEquipment ?? [] : program.equipment?.length ? program.equipment : ALL_EQUIPMENT;
  // 2.4.0: adult rules A1/A3/§4/§5 and the ramp weeks shape Approach's goal defaults only; a trainer-built session is as written.
  const source = sourceOf(program, session);
  const approach = source === 'approach';
  const adjust = levelAdjustFor(program, session, athlete.userId);
  const easing = adjust ? easingFor(athlete.logs, date) : { active: false };
  const w = weekIndex(program, date) ?? 0;
  const plan = program.weeks?.[w];
  // The "Back after a break" ramp is part of the goal the trainer chose (adult-goals.md), not a builder limit: it stays for
  // every session of that program (judgment call; its v2.3.0 check isn't in spec §0.3). Its level cap follows "Adjust to level".
  const ramp = program.goal === 'back_after_break' && w < 4 ? BACK_AFTER_BREAK_RAMP[(w + 1) as 1 | 2 | 3 | 4] : null;
  const light = !!program.lightDates?.includes(dateKey(date));
  const deload = !ramp && !!plan?.deload;
  const level = (adjust && ramp?.maxLevel ? Math.min(athlete.level, ramp.maxLevel) : athlete.level) as Level;
  const ceiling = easing.active ? 6 : approach ? RPE_CEILING : null;
  const swaps: { from: string; to: string }[] = [];
  let dropped = 0;
  const out: ResolvedExercise[] = [];
  const usedHome = new Set<string>();
  for (const pe of session.exercises) {
    const original = getExercise(pe.exerciseId);
    const role = pe.role ?? (original.category === 'power' ? 'power' : undefined);
    // No power (jumps or throws) in ramp weeks 1–2; light days drop power as built.
    if ((ramp && !ramp.power && (role === 'power' || original.tier === 'P')) || (light && role === 'power')) continue;
    if (pe.cardio || original.durationOnly) {
      const resolved = !adjust ? original : resolveExercise(original, level, equipment, pool) ?? (fits(getExercise('walk-jog'), equipment) ? getExercise('walk-jog') : null);
      if (!resolved) {
        dropped++;
        continue;
      }
      if (resolved.id !== original.id) swaps.push({ from: original.name, to: resolved.name });
      // A4 stays (minutes + Easy/Moderate only). The 60-min and Back-after-a-break limits apply to Approach's defaults only (F41).
      const rx = approach ? clampCardio(pe.cardio ?? { minutes: 10, intensity: 'easy' }, program.goal) : clampCardioFree(pe.cardio ?? { minutes: 10, intensity: 'easy' });
      out.push({ ...pe, exerciseId: resolved.id, sets: 1, reps: `${rx.minutes} min`, effort: rx.intensity === 'easy' ? 'Easy' : 'Moderate', cardio: rx, ...(resolved.id !== original.id ? { teamExerciseId: original.id } : {}), restSecResolved: 0 });
      continue;
    }
    let resolved: Exercise | null;
    if (!adjust) resolved = original;
    else if (home && !approach && fits(original, equipment) && original.level <= level) resolved = original;
    else resolved = home ? resolveHomeExercise(original, pe.role, level, equipment, false, usedHome) : resolveExercise(original, level, equipment, pool);
    const harderId = resolved && adjust ? athlete.harderPicks?.[resolved.id] : null;
    if (resolved && harderId) {
      const harder = pool.find((e) => e.id === harderId);
      if (harder && harder.level <= level && fits(harder, equipment)) resolved = harder;
    }
    if (!resolved) {
      dropped++;
      continue;
    }
    usedHome.add(resolved.id);
    if (resolved.id !== original.id) swaps.push({ from: original.name, to: resolved.name });
    let { sets, reps, effort } = pe;
    const strength = isStrength(pe, resolved);
    const mainish = pe.role === 'main' || pe.role === 'secondary';
    if (ramp && strength) {
      sets = pe.role === 'main' ? ramp.mainSets : Math.min(sets, ramp.otherSets);
      reps = ramp.reps;
      effort = ramp.effort;
    } else if (plan?.rpe != null && mainish && !deload) {
      effort = withWeekRpe(effort, plan.rpe);
    }
    if (approach && strength && athlete.level === 1 && !ramp && adjust) effort = shiftBeginner(effort);
    if (deload || light) {
      if (strength || role === 'power') {
        sets = Math.max(1, Math.round(sets * 0.6));
        effort = role === 'power' ? 'Easy, fast' : light ? 'Easy' : 'RPE 6';
      }
    }
    if (strength && ceiling != null) effort = capEffort(effort, ceiling);
    out.push({ ...pe, exerciseId: resolved.id, sets, reps, effort, ...(resolved.id !== original.id ? { teamExerciseId: original.id } : {}), restSecResolved: 0 });
  }
  if (athlete.level === 1 && approach && adjust) {
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
  const ctx = { phase: program.phase, equipment: home ? equipment : program.equipment, home, light: false, free: !approach };
  // Cardio has no rest table: a 60 s transition after the block (general-library.md §4a).
  const rests = blockRests(out, out.map((pe) => (pe.cardio ? 60 : restSecFor(pe, ctx))), ctx);
  out.forEach((pe, i) => (pe.restSecResolved = rests[i]));
  if (session.format === 'stations') {
    for (const st of session.stations ?? []) for (const pe of out) if (pe.group && st.groups.includes(pe.group)) pe.stationId = st.id;
  }
  // 2.4.0: generated warm-up (easy cardio from the gym profile, then drills; replaces W1–W3) and the estimate against the target.
  const target = targetFor(program, session, date);
  const mine: Session = { ...session, exercises: out };
  const wctx = warmupCtxFor(program, session, equipment, { deload });
  const warmup = warmupFor(mine, wctx);
  const estMinutes = estimateSession(mine, { rest: ctx, warmup: wctx, kind: home ? 'home' : 'school' }, { rests });
  const weeks = programWeeks(program);
  const block: BlockInfo = {
    week: w + 1,
    weeks,
    deload,
    label: ramp ? `Ramp week ${w + 1} of 4` : deload ? `Deload week (${w + 1} of ${weeks})` : `Week ${w + 1} of ${weeks}`,
  };
  return { session, exercises: out, dropped, swaps, block, light, easing, estMinutes, home, lightHome: false, source, levelAdjust: adjust, warmup, target, express: false };
}

/** F41 (2.4.0): a trainer's cardio block is minutes (5–180) + Easy/Moderate. Nothing else (adult rule A4). */
export function clampCardioFree(rx: { minutes: number; intensity: 'easy' | 'moderate' }) {
  return { minutes: Math.min(180, Math.max(5, Math.round(rx.minutes))), intensity: rx.intensity === 'moderate' ? ('moderate' as const) : ('easy' as const) };
}

/**
 * generator v3 prescriptions for one athlete on one date (program-design §3, §5, §6, §9): each slot gets the block/week
 * sets, reps, effort, % (tested lifts only, capped ≤ 85% minors / ≤ 90% adults) and the method the athlete qualifies for
 * (contrast/cluster/wave: advanced + coach-confirmed only; beginners straight or tempo). Plyo contacts stay under the
 * phase cap (setter −20%, libero/DS −30% vertical); depth jumps ≤ 20 contacts.
 */
function applyV3(program: Program, session: Session, list: ProgramExercise[], w: ReturnType<typeof planWeek>, athlete: AthleteContext, adjust: boolean): ProgramExercise[] {
  const level = (adjust ? athlete.level : 3) as Level;
  const ctx = { level, confirmed: !!athlete.levelConfirmed, minor: athlete.minor !== false, phase: program.phase, position: program.position, dayIndex: 0 };
  const maintainDay = Math.max(0, program.sessions.filter((s) => !s.mobility).findIndex((s) => s.id === session.id)) % 2;
  const out = list.map((pe) => {
    const rx = prescribe(pe, pe.exerciseId, w.block, w.week, ctx, maintainDay);
    return { ...pe, sets: rx.sets, reps: rx.reps, effort: rx.effort, method: rx.method, restSec: rx.restSec, restSetByCoach: true, ...(rx.pct != null ? { pct: rx.pct } : { pct: undefined }) };
  });
  // Plyo contact budget for the session (§5a top of range, deload −50%), never above the §9 phase cap.
  const jumps = out.map((pe, i) => (getExercise(pe.exerciseId).pattern === 'jump' && !getExercise(pe.exerciseId).weighted ? i : -1)).filter((i) => i >= 0);
  if (jumps.length) {
    const base = Math.min(PLYO_CAP[program.phase], PLYO_CONTACTS[w.block]);
    const cap = base * (w.deload ? 0.5 : 1);
    const per = Math.max(3, Math.floor(base / jumps.length));
    for (const i of jumps) {
      const id = out[i].exerciseId;
      const each = /each/.test(out[i].reps) || getExercise(id).pattern === 'single-leg' || ['lateral-bound', 'skater-hop', 'single-leg-box-jump', 'single-leg-hop-stick'].includes(id);
      const factor = isVertical(id) ? verticalFactor(program.position) : 1;
      let budget = Math.floor(per * factor);
      if (DEPTH_JUMPS.has(id) || id === 'depth-drop') budget = Math.min(budget, DEPTH_CONTACT_CAP);
      if (w.deload) budget = Math.floor(budget * 0.5);
      const sets = out[i].sets >= 2 ? Math.min(out[i].sets, 4) : 3;
      const reps = Math.max(1, Math.floor(budget / sets / (each ? 2 : 1)));
      out[i] = { ...out[i], sets, reps: each ? `${reps} each` : String(reps) };
    }
    // Final guard: total contacts ≤ the cap.
    let total = jumps.reduce((n, i) => n + contactsOf(out[i].sets, out[i].reps), 0);
    for (const i of [...jumps].reverse()) {
      while (total > cap && out[i].sets > 1) {
        total -= contactsOf(1, out[i].reps);
        out[i] = { ...out[i], sets: out[i].sets - 1 };
      }
    }
  }
  return out;
}
