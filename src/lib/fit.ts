import { eventsOn, weekdayOf } from './calendar';
import { getExercise } from './exercises';
import { restSecFor } from './generator';
import { blockRests, blocksOf } from './groups';
import { topReps, type RestContext } from './rest';
import { rotationMinutes } from './rotation';
import { blockOf, compactOf, isSessionWarmup, needsRampUp, warmupFor, warmupMinutes, type WarmupCtx } from './warmup';
import type { Phase, Program, ProgramExercise, Session } from './types';
import { cooldownMinutes } from './coaching';

/**
 * 2.4.0 session length and Fit to time (`content/program-design.md` §4a, spec §1.4). Pure functions; no React.
 */

/* ---------- targets ---------- */
/** §4 phase targets (minutes) when the coach hasn't set a length; trainer mode 45–60 gym, 30 home. */
export const PHASE_RANGE: Record<Phase, [number, number]> = { off: [60, 75], pre: [55, 65], in: [40, 50], post: [45, 55] };
export const PHASE_WORD: Record<Phase, string> = { off: 'off-season', pre: 'preseason', in: 'in-season', post: 'post-season' };
export const LENGTH_PICKS = [30, 45, 60, 75, 90];
export const LENGTH_MIN = 20;
export const LENGTH_MAX = 120;
export const EXPRESS_UNDER = 25;

export function phaseRange(program: Pick<Program, 'phase' | 'general'>, home = false): [number, number] {
  if (program.general) return home ? [30, 30] : [45, 60];
  if (home) return [30, 30];
  return PHASE_RANGE[program.phase];
}

export type Target = { minutes: number; source: 'date' | 'weekday' | 'program' | 'phase'; label: string };

/** Priority: date → weekday → program → phase (F51c). The phase default fits to the top of its range. */
export function targetFor(program: Program, session: Session, date?: Date | null, weekday?: number | null): Target {
  const home = session.location === 'home';
  if (date) {
    const room = roomMinutesOn(program, date);
    if (room) return { minutes: room, source: 'date', label: `Target ${room} min (${date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })})` };
  }
  const wd = date ? weekdayOf(date) : weekday ?? program.liftSchedule.findIndex((id) => id === session.id);
  const byDay = wd != null && wd >= 0 ? program.minutesByWeekday?.[wd] : null;
  if (byDay) return { minutes: byDay, source: 'weekday', label: `Target ${byDay} min (${['Mondays', 'Tuesdays', 'Wednesdays', 'Thursdays', 'Fridays', 'Saturdays', 'Sundays'][wd!]})` };
  if (program.sessionMinutes) return { minutes: program.sessionMinutes, source: 'program', label: `Target ${program.sessionMinutes} min` };
  const [lo, hi] = phaseRange(program, home);
  return { minutes: hi, source: 'phase', label: lo === hi ? `Target ${hi} min` : `Target ${lo}–${hi} min (${program.general ? 'trainer default' : `${PHASE_WORD[program.phase]} default`})` };
}

/** This team's own weight room time on a date (calendar F51c). Another team's events never carry it (V4). */
export function roomMinutesOn(program: Program, date: Date): number | null {
  return eventsOn(program, date).find((e) => !e.teamName && typeof e.roomMinutes === 'number')?.roomMinutes ?? null;
}

/* ---------- estimate ---------- */
export type FitCtx = { rest: RestContext; warmup: WarmupCtx; kind: 'school' | 'home' };

/** Work seconds for one set (rest-and-supersets §5): about 3 s per rep ("each" doubles), 40 s for holds and carries, 20 s for a jump set. */
function workSec(pe: ProgramExercise): number {
  const ex = getExercise(pe.exerciseId);
  if (pe.cardio) return pe.cardio.minutes * 60;
  const top = topReps(pe.reps);
  if (top == null) return 40;
  if (ex.pattern === 'jump' || ex.pattern === 'throw') return 20;
  return top * 3 * (/each/i.test(pe.reps) ? 2 : 1);
}

/** About 1 min per ramp-up set (§4a): 3 for a barbell or Olympic lift, 1 for dumbbells. */
export function rampCount(list: ProgramExercise[], ctx: RestContext): number {
  return list.reduce((n, pe) => {
    const ex = getExercise(pe.exerciseId);
    if (!needsRampUp(ex, ctx.equipment)) return n;
    return n + (ex.equipment.some((s) => s.includes('barbell') || s.includes('trap-bar')) ? 3 : 1);
  }, 0);
}

/** Estimate = warm-up + ramp-up sets + every set's work and rest + transitions (30 s between blocks). Minutes. */
export function estimateSession(session: Session, ctx: FitCtx, opts: { compactWarmup?: boolean; rests?: number[] } = {}): number {
  const list = session.exercises;
  const rests = opts.rests ?? blockRests(list, list.map((pe) => (pe.cardio ? 60 : restSecFor(pe, ctx.rest))), ctx.rest);
  let sec = 0;
  // 2.4.0 rack rotation (§4b rule 9): a rotation block's time is rotation × positions × rounds, plus 1 min between blocks.
  const rot = session.format === 'rack_rotation' ? session.rotation ?? [] : [];
  const inRotation = new Set(rot.map((b) => b.group));
  if (rot.length) sec += rotationMinutes(rot) * 60;
  // 2.4.2 §3d: the cooldown (group 'CD') counts as its 2–3 min, together, with no rest between items.
  const cd = list.filter((pe) => pe.group === 'CD');
  if (cd.length) sec += cooldownMinutes(cd) * 60;
  for (const [i, pe] of list.entries()) {
    if (pe.filler || pe.group === 'CD' || (pe.group && inRotation.has(pe.group))) continue;
    sec += (pe.cardio ? 1 : pe.sets) * (workSec(pe) + (rests[i] ?? 0));
  }
  // Transitions between non-rotation blocks (rotation blocks already add 1 min between them).
  const blocks = new Set(list.filter((pe) => pe.group !== 'CD' && !(pe.group && inRotation.has(pe.group))).map((pe, i) => pe.group ?? `#${i}`)).size;
  sec += Math.max(0, blocks - (rot.length ? 0 : 1)) * 30;
  const w = warmupFor(session, { ...ctx.warmup, compact: opts.compactWarmup || ctx.warmup.compact });
  // A rotation's build-up round is its ramp-up (rule 6), so those lifts add no separate ramp-up time.
  const buildUp = new Set(rot.filter((b) => b.buildUpRound).map((b) => b.group));
  const ramps = rampCount(list.filter((pe) => !(pe.group && buildUp.has(pe.group))), ctx.rest);
  // warmups v1.1 §1a minutes are one decimal; the session estimate is whole minutes.
  return Math.round(sec / 60 + warmupMinutes(w, { phase: ctx.warmup.phase, home: ctx.warmup.home }) + ramps);
}

/* ---------- fitSession (§4a trim order) ---------- */
export type Trim = { key: string; step: number; text: string; saved: number };
export type FitResult = {
  session: Session;
  /** The warm-up was compacted (step 4). */
  compactWarmup: boolean;
  trims: Trim[];
  before: number;
  after: number;
  express: boolean;
  /** Still over the target after every trim. */
  overAfterAll: boolean;
};

const nameOf = (pe: ProgramExercise) => getExercise(pe.exerciseId).name;
const nextLetter = (list: ProgramExercise[]) => 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').find((c) => !list.some((x) => x.group === c)) ?? 'Z';
const idxOfBlock = (list: ProgramExercise[], b: string) => list.map((pe, i) => (blockOf(pe) === b && !pe.cardio ? i : -1)).filter((i) => i >= 0);

type Op = { key: string; step: number; apply: (s: Session) => { s: Session; text: string; compact?: boolean } | null };

/** The seven steps, as small operations in order. Each returns null when it doesn't apply. */
function operations(): Op[] {
  const groupBlock = (b: 'C' | 'D', key: string, step: number): Op => ({
    key,
    step,
    apply: (s) => {
      const idx = idxOfBlock(s.exercises, b).filter((i) => !s.exercises[i].group);
      if (idx.length < 2) return null;
      const g = nextLetter(s.exercises);
      const exercises = s.exercises.map((pe, i) => (idx.includes(i) ? { ...pe, group: g, autoGroup: true } : pe));
      const names = idx.map((i) => nameOf(s.exercises[i])).join(' + ');
      return { s: { ...s, exercises }, text: `Pair ${names} as a ${idx.length === 2 ? 'superset' : 'circuit'}` };
    },
  });
  return [
    groupBlock('C', 'pair-c', 1),
    groupBlock('D', 'pair-d', 1),
    {
      key: 'care-rests',
      step: 2,
      apply: (s) => {
        const e = idxOfBlock(s.exercises, 'E').filter((i) => !s.exercises[i].filler);
        if (!e.length) return null;
        const heavy = s.exercises.map((pe, i) => (['A', 'B'].includes(blockOf(pe) ?? '') ? i : -1)).filter((i) => i >= 0);
        const host = heavy.length ? s.exercises[heavy[heavy.length - 1]] : null;
        const fits = e.filter((i) => getExercise(s.exercises[i].exerciseId).tier === 'D');
        if (host && fits.length) {
          // Care drills ride in the rests of the last A/B lift (tier D only, no extra rest).
          const moving = fits.map((i) => ({ ...s.exercises[i], filler: true, group: undefined }));
          const rest = s.exercises.filter((_, i) => !fits.includes(i));
          const at = rest.indexOf(host) + 1;
          rest.splice(at, 0, ...moving);
          return { s: { ...s, exercises: rest }, text: `Move care work into the ${nameOf(host)} rests` };
        }
        if (e.every((i) => s.exercises[i].sets <= 1)) return null;
        return { s: { ...s, exercises: s.exercises.map((pe, i) => (e.includes(i) ? { ...pe, sets: 1 } : pe)) }, text: 'Care work: 1 round' };
      },
    },
    {
      key: 'd-sets',
      step: 3,
      apply: (s) => {
        const d = idxOfBlock(s.exercises, 'D').filter((i) => s.exercises[i].sets > 2);
        if (!d.length) return null;
        return { s: { ...s, exercises: s.exercises.map((pe, i) => (d.includes(i) ? { ...pe, sets: 2 } : pe)) }, text: `Accessories: ${s.exercises[d[0]].sets} → 2 sets` };
      },
    },
    {
      key: 'd-drop2',
      step: 3,
      apply: (s) => {
        const d = idxOfBlock(s.exercises, 'D');
        if (d.length < 2) return null;
        const drop = d[1];
        return { s: { ...s, exercises: s.exercises.filter((_, i) => i !== drop) }, text: `Drop ${nameOf(s.exercises[drop])}` };
      },
    },
    {
      key: 'd-drop',
      step: 3,
      apply: (s) => {
        const d = idxOfBlock(s.exercises, 'D');
        if (!d.length) return null;
        return { s: { ...s, exercises: s.exercises.filter((_, i) => !d.includes(i)) }, text: d.length === 1 ? `Drop ${nameOf(s.exercises[d[0]])}` : 'Drop the accessories' };
      },
    },
    { key: 'compact-warmup', step: 4, apply: (s) => ({ s, text: 'Compact warm-up', compact: true }) },
    {
      key: 'c-set',
      step: 5,
      apply: (s) => {
        const c = idxOfBlock(s.exercises, 'C').filter((i) => s.exercises[i].sets > 1);
        if (!c.length) return null;
        const names = c.map((i) => nameOf(s.exercises[i])).join(' + ');
        return { s: { ...s, exercises: s.exercises.map((pe, i) => (c.includes(i) ? { ...pe, sets: pe.sets - 1 } : pe)) }, text: `${names}: −1 set` };
      },
    },
    {
      key: 'a-drop',
      step: 6,
      apply: (s) => {
        const a = idxOfBlock(s.exercises, 'A');
        if (a.length < 2) return null;
        const exs = a.map((i) => getExercise(s.exercises[i].exerciseId));
        const keep = exs.findIndex((e) => e.pattern === 'olympic') >= 0 ? exs.findIndex((e) => e.pattern === 'olympic') : exs.findIndex((e) => e.pattern === 'jump') >= 0 ? exs.findIndex((e) => e.pattern === 'jump') : 0;
        const drop = a.filter((_, k) => k !== keep);
        const dropName = drop.map((i) => nameOf(s.exercises[i])).join(' + ');
        return { s: { ...s, exercises: s.exercises.filter((_, i) => !drop.includes(i)) }, text: `Drop ${dropName}, keep ${exs[keep].name}` };
      },
    },
    {
      key: 'a-set',
      step: 6,
      apply: (s) => {
        const a = idxOfBlock(s.exercises, 'A').filter((i) => s.exercises[i].sets > 2);
        if (!a.length) return null;
        return { s: { ...s, exercises: s.exercises.map((pe, i) => (a.includes(i) ? { ...pe, sets: pe.sets - 1 } : pe)) }, text: `${a.map((i) => nameOf(s.exercises[i])).join(' + ')}: −1 set` };
      },
    },
    {
      key: 'b-set',
      step: 7,
      apply: (s) => {
        // Never below 3 work sets; the B-block is never removed.
        const b = idxOfBlock(s.exercises, 'B').filter((i) => s.exercises[i].sets > 3);
        if (!b.length) return null;
        return { s: { ...s, exercises: s.exercises.map((pe, i) => (b.includes(i) ? { ...pe, sets: pe.sets - 1 } : pe)) }, text: `${b.map((i) => nameOf(s.exercises[i])).join(' + ')}: −1 set (stays at 3+)` };
      },
    },
  ];
}

/**
 * Trims a session to fit `target` minutes, in the §4a order, stopping as soon as it fits. Rest is never shortened, the
 * B-block and the warm-up are never removed. `skip` = trims the coach undid (generated sessions, F51f).
 * `all` = list every applicable trim (Fit to time suggestions for coach-built sessions, F51e).
 */
function fitSessionCore(session: Session, target: number, ctx: FitCtx, opts: { skip?: string[]; all?: boolean } = {}): FitResult {
  const before = estimateSession(session, ctx);
  let cur: Session = session;
  let compact = false;
  const trims: Trim[] = [];
  let est = before;
  for (const op of operations()) {
    if (!opts.all && est <= target) break;
    if (opts.skip?.includes(op.key)) continue;
    if (op.key === 'compact-warmup' && (compact || !warmupFor(cur, ctx.warmup))) continue;
    const r = op.apply(cur);
    if (!r) continue;
    const nextCompact: boolean = compact || !!r.compact;
    const nextEst = estimateSession(r.s, ctx, { compactWarmup: nextCompact });
    if (op.key === 'compact-warmup') {
      const w = warmupMinutes(warmupFor(cur, { ...ctx.warmup, compact: true }), ctx.warmup);
      r.text = `Compact warm-up (${w} min)`;
    }
    trims.push({ key: op.key, step: op.step, text: r.text, saved: Math.max(0, est - nextEst) });
    cur = r.s;
    compact = nextCompact;
    est = nextEst;
  }
  const express = target < EXPRESS_UNDER && session.source === 'approach' && !opts.all;
  if (express) {
    const ex = expressSession(session);
    return { session: ex, compactWarmup: true, trims, before, after: estimateSession(ex, ctx, { compactWarmup: true }), express: true, overAfterAll: false };
  }
  return { session: cur, compactWarmup: compact, trims, before, after: est, express: false, overAfterAll: est > target };
}

/**
 * Express session (§4a): compact warm-up + A at 3 sets + B at 3 sets + one C superset at 2 rounds.
 * Built from the session's own exercises (A = first power, B = first main lift, C = first two secondary).
 */
function expressSessionCore(session: Session): Session {
  const list = session.exercises;
  const a = list.find((pe) => blockOf(pe) === 'A');
  const b = list.find((pe) => blockOf(pe) === 'B');
  const c = list.filter((pe) => blockOf(pe) === 'C').slice(0, 2);
  const exercises: ProgramExercise[] = [
    ...(a ? [{ ...a, sets: Math.min(a.sets, 3), group: undefined, filler: undefined }] : []),
    ...(b ? [{ ...b, sets: Math.min(b.sets, 3), group: undefined, filler: undefined }] : []),
    ...c.map((pe) => ({ ...pe, sets: Math.min(pe.sets, 2), group: c.length > 1 ? 'X' : undefined, autoGroup: c.length > 1 })),
  ];
  return { ...session, exercises };
}

/**
 * Under the target by 8+ min (generated sessions): add back in reverse order — a second care round, then accessory sets
 * (up to 3). Never adds A or B volume.
 */
function addBackCore(session: Session, target: number, ctx: FitCtx): { session: Session; lines: string[] } {
  let cur = session;
  const lines: string[] = [];
  if (target - estimateSession(cur, ctx) < 8) return { session: cur, lines };
  const e = idxOfBlock(cur.exercises, 'E').filter((i) => cur.exercises[i].sets < 2 && !cur.exercises[i].filler);
  if (e.length) {
    cur = { ...cur, exercises: cur.exercises.map((pe, i) => (e.includes(i) ? { ...pe, sets: 2 } : pe)) };
    lines.push('Care work: 2 rounds');
  }
  if (target - estimateSession(cur, ctx) >= 8) {
    const d = idxOfBlock(cur.exercises, 'D').filter((i) => cur.exercises[i].sets < 3);
    if (d.length) {
      cur = { ...cur, exercises: cur.exercises.map((pe, i) => (d.includes(i) ? { ...pe, sets: pe.sets + 1 } : pe)) };
      lines.push('Accessories: +1 set');
    }
  }
  return { session: cur, lines };
}

/**
 * Fit to time for a coach-built session (F51e): apply the chosen trims, in Training's order, to the session as it was when
 * the sheet opened. The compact warm-up is saved on the session's warm-up.
 */
function applyTrimsCore(session: Session, keys: string[], ctx: FitCtx): Session {
  let cur = session;
  for (const op of operations()) {
    if (!keys.includes(op.key)) continue;
    const r = op.apply(cur);
    if (!r) continue;
    cur = r.s;
    if (r.compact) {
      const w = cur.warmup;
      if (w === null) continue;
      if (isSessionWarmup(w) && (w.edited || w.template)) cur = { ...cur, warmup: { ...w, ...compactOf(w), compact: true } };
      else {
        const shown = warmupFor(cur, ctx.warmup);
        cur = { ...cur, warmup: { raise: [], activate: [], potentiate: [], ...(isSessionWarmup(w) ? w : {}), compact: true, ...(shown?.limitedSpace ? { limitedSpace: true } : {}) } };
      }
    }
  }
  return cur;
}

/** The trims a coach undid on a generated session (`fitLog` entries `undo:<key>`). */
export const undoneTrims = (session: Session) => (session.fitLog ?? []).filter((l) => l.startsWith('undo:')).map((l) => l.slice(5));

/** Station time (§4a): (session length − warm-up − Part 1 − finish) ÷ stations − 1 min transition. */
export function stationMinutesFrom(length: number, warmup: number, part1: number, finish: number, stations: number): number {
  if (stations <= 0) return 0;
  return Math.max(1, Math.floor((length - warmup - part1 - finish) / stations - 1));
}

export { blocksOf };

/* 2.4.2 F61e: the cooldown rows (group 'CD') are never trimmed, paired or moved by Fit to time; they stay at the end. */
const splitCD = (session: Session) => ({ core: { ...session, exercises: session.exercises.filter((pe) => pe.group !== 'CD') }, cd: session.exercises.filter((pe) => pe.group === 'CD') });
const withCD = (s: Session, cd: ProgramExercise[]): Session => (cd.length ? { ...s, exercises: [...s.exercises.filter((pe) => pe.group !== 'CD'), ...cd] } : s);
export function fitSession(session: Session, target: number, ctx: FitCtx, opts: { skip?: string[]; all?: boolean } = {}): FitResult {
  const { core, cd } = splitCD(session);
  if (!cd.length) return fitSessionCore(session, target, ctx, opts);
  const m = cooldownMinutes(cd);
  const r = fitSessionCore(core, target - m, ctx, opts);
  return { ...r, session: withCD(r.session, cd), before: r.before + m, after: r.after + m };
}
export function addBack(session: Session, target: number, ctx: FitCtx): { session: Session; lines: string[] } {
  const { core, cd } = splitCD(session);
  if (!cd.length) return addBackCore(session, target, ctx);
  const r = addBackCore(core, target - cooldownMinutes(cd), ctx);
  return { ...r, session: withCD(r.session, cd) };
}
export function applyTrims(session: Session, keys: string[], ctx: FitCtx): Session {
  const { core, cd } = splitCD(session);
  return withCD(applyTrimsCore(core, keys, ctx), cd);
}
export function expressSession(session: Session): Session {
  const { core, cd } = splitCD(session);
  return withCD(expressSessionCore(core), cd);
}
