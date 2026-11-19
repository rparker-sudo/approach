import { fits, getExercise } from './exercises';
import { tierOf } from './rest';
import type { Equipment, Exercise, Pattern, Phase, ProgramExercise, ProgramPosition, Session, SessionWarmup, WarmupId } from './types';

/**
 * 2.4.0 session-specific warm-ups (`content/programs/warmups.md` v1.0, §1–§7). Pure functions; no React.
 *  - `buildWarmup(session, ctx)`: RAMP (Raise / Activate & mobilize / Potentiate) from the session's primary patterns and
 *    A-block type, rotated across the week, fitted to equipment, limited space, home, trainer mode and the position add-on.
 *  - `warmupFor(session, ctx)`: what a session actually shows (the coach's edited or template warm-up, none, or generated).
 *  - `rampSetsFor(exercise, workingWeight, ctx)`: ramp-up sets before a loaded tier A or P lift (§4).
 */

export type WarmupPart = 'raise' | 'activate' | 'potentiate';
export const WARMUP_PARTS: WarmupPart[] = ['raise', 'activate', 'potentiate'];
export const PART_TITLE: Record<WarmupPart, string> = { raise: 'Raise', activate: 'Activate', potentiate: 'Potentiate' };

export type SessionType = 'squat' | 'hinge' | 'single-leg' | 'push' | 'pull' | 'total' | 'power';
export const SESSION_TYPE_LABEL: Record<SessionType, string> = {
  squat: 'Lower: squat',
  hinge: 'Lower: hinge',
  'single-leg': 'Lower: single-leg/lateral',
  push: 'Upper: push',
  pull: 'Upper: pull',
  total: 'Total body',
  power: 'Power',
};
export type ABlockType = 'olympic' | 'vertical' | 'lateral' | 'throws' | 'none';

export type WarmupCtx = {
  phase: Phase;
  /** The program's (or group's) position. 'All positions' / missing = mixed group: no position add-on. */
  position?: ProgramPosition | null;
  /** Equipment the session runs with (gym list, or the athlete's home equipment). */
  equipment: Equipment[];
  limitedSpace?: boolean;
  home?: boolean;
  /** Trainer mode (general teams): Raise starts with easy cardio from the gym profile. */
  general?: boolean;
  /** Which lift day of the week this is (0-based): pools rotate so the warm-up doesn't repeat exactly (§2 step 4). */
  rotation?: number;
  /** Deload week: potentiation stops at about 70% (§5). */
  deload?: boolean;
  /** Fit to time compacted it (§1, program-design §4a step 4). */
  compact?: boolean;
};

/* ---------- §2 reading the session ---------- */
const LOWER: Pattern[] = ['squat', 'hinge', 'single-leg', 'knee-ext', 'knee-flex'];
const UPPER: Pattern[] = ['h-push', 'v-push', 'h-pull', 'v-pull', 'arm-flex', 'arm-ext', 'shoulder-iso'];
const POWER: Pattern[] = ['jump', 'olympic', 'throw'];
const LATERAL_JUMPS = new Set(['lateral-bound', 'skater-hop', 'line-hops', 'lateral-hurdle-hop']);
const isStrengthOrPower = (ex: Exercise) => ex.category === 'power' || ex.category === 'lower' || ex.category === 'upper';

/** Old slot roles → v3 blocks (spec §1.4 mapping), until generator v3 writes `block`. */
export function blockOf(pe: ProgramExercise): 'A' | 'B' | 'C' | 'D' | 'E' | null {
  const b = (pe as ProgramExercise & { block?: string }).block;
  if (b && 'ABCDE'.includes(b)) return b as 'A' | 'B' | 'C' | 'D' | 'E';
  switch (pe.role) {
    case 'power':
      return 'A';
    case 'main':
      return 'B';
    case 'secondary':
      return 'C';
    case 'accessory':
    case 'core':
      return 'D';
    case 'care':
    case 'mobility':
      return 'E';
    default:
      return null;
  }
}

/** §2 step 1: the exercises in blocks A–C (Approach) or the first 4 strength or power exercises as written (coach). */
export function primaryExercises(session: Session): Exercise[] {
  const list = session.exercises.filter((pe) => !pe.cardio);
  const approach = session.source === 'approach' && list.some((pe) => blockOf(pe));
  if (approach) {
    return list.filter((pe) => ['A', 'B', 'C'].includes(blockOf(pe) ?? '')).map((pe) => getExercise(pe.exerciseId));
  }
  return list
    .map((pe) => getExercise(pe.exerciseId))
    .filter(isStrengthOrPower)
    .slice(0, 4);
}

/** §2 step 2: session type. */
export function sessionType(session: Session): SessionType {
  const prim = primaryExercises(session);
  const strength = prim.filter((e) => LOWER.includes(e.pattern) || UPPER.includes(e.pattern));
  const power = prim.filter((e) => POWER.includes(e.pattern));
  if (!strength.length && power.length) return 'power';
  if (power.length > strength.length) return 'power';
  const lower = strength.filter((e) => LOWER.includes(e.pattern));
  const upper = strength.filter((e) => UPPER.includes(e.pattern));
  if (lower.length && upper.length) return 'total';
  if (lower.length) {
    const p = lower[0].pattern;
    return p === 'squat' || p === 'knee-ext' ? 'squat' : p === 'hinge' || p === 'knee-flex' ? 'hinge' : 'single-leg';
  }
  if (upper.length) return ['h-push', 'v-push', 'arm-ext'].includes(upper[0].pattern) ? 'push' : 'pull';
  return 'total';
}

/** §2 step 3: A-block type from the session's power work. */
export function aBlockType(session: Session): ABlockType {
  const power = primaryExercises(session).filter((e) => POWER.includes(e.pattern));
  if (power.some((e) => e.pattern === 'olympic')) return 'olympic';
  const first = power[0];
  if (!first) return 'none';
  if (first.pattern === 'throw') return power.some((e) => e.pattern === 'jump') ? (LATERAL_JUMPS.has(power.find((e) => e.pattern === 'jump')!.id) ? 'lateral' : 'vertical') : 'throws';
  return LATERAL_JUMPS.has(first.id) ? 'lateral' : 'vertical';
}

/* ---------- §3 pools ---------- */
type Item = { id: string; reps: string };
const RAISE: { id: string; inPlace: string }[] = [
  { id: 'high-knees', inPlace: 'In place · 15 s' },
  { id: 'a-skip', inPlace: 'In place · 15 s' },
  { id: 'lateral-shuffle', inPlace: '3 shuffles each way × 3' },
  { id: 'carioca', inPlace: '3 steps each way × 3' },
  { id: 'walking-knee-hug', inPlace: 'Standing · 5 each' },
  { id: 'walking-quad-stretch', inPlace: 'Standing · 5 each' },
];
const POOLS: Record<Exclude<SessionType, 'total'>, Item[]> = {
  squat: [
    { id: 'ankle-rock', reps: '8 each' },
    { id: 'hip-90-90', reps: '5 each' },
    { id: 'worlds-greatest', reps: '3 each' },
    { id: 'band-lateral-walk', reps: '10 each way' },
    { id: 'glute-bridge', reps: '8 each' },
    { id: 'bodyweight-squat', reps: '8 (pause 2 s at the bottom)' },
  ],
  hinge: [
    { id: 'leg-swings', reps: '8 each direction' },
    { id: 'inchworm', reps: '4' },
    { id: 'cat-camel', reps: '6' },
    { id: 'glute-bridge', reps: '8 each' },
    { id: 'bird-dog', reps: '4 each' },
    { id: 'band-hamstring', reps: '20 s each' },
  ],
  'single-leg': [
    { id: 'lateral-lunge', reps: '5 each (no weight)' },
    { id: 'short-lever-copenhagen', reps: '15 s each' },
    { id: 'band-lateral-walk', reps: '10 each way' },
    { id: 'ankle-balance', reps: '4 each' },
    { id: 'hip-flexor-stretch', reps: '20 s each' },
    { id: 'walking-knee-hug', reps: '5 each' },
  ],
  push: [
    { id: 'arm-circles', reps: '10 each way' },
    { id: 'scap-pushup', reps: '8' },
    { id: 'push-up-plus', reps: '6' },
    { id: 'thoracic-rotation', reps: '5 each' },
    { id: 'band-pull-apart', reps: '15' },
    { id: 'wall-slide', reps: '6' },
  ],
  pull: [
    { id: 'wall-slide', reps: '6' },
    { id: 'lat-reach', reps: '20 s each' },
    { id: 'band-er', reps: '12 each' },
    { id: 'thoracic-rotation', reps: '5 each' },
    { id: 'cat-camel', reps: '6' },
    { id: 'er-90-90-iso', reps: '15 s each (light)' },
  ],
  power: [
    { id: 'worlds-greatest', reps: '3 each' },
    { id: 'ankle-rock', reps: '8 each' },
    { id: 'leg-swings', reps: '8 each direction' },
    { id: 'inchworm', reps: '4' },
    { id: 'band-lateral-walk', reps: '10 each way' },
  ],
};
/** "Band items fall back to their bodyweight options" (§2 step 5). Anything else that doesn't fit is skipped. */
const BODYWEIGHT_FALLBACK: Record<string, Item> = {
  'band-lateral-walk': { id: 'lateral-lunge', reps: '5 each (no weight)' },
  'band-hamstring': { id: 'leg-swings', reps: '8 each direction' },
  'band-pull-apart': { id: 'ytw', reps: '6 each (no weight)' },
  'band-er': { id: 'wall-slide', reps: '6' },
  'er-90-90-iso': { id: 'wall-slide', reps: '6' },
};
/** Position add-on (volleyball): one extra item from the position's care focus. */
const ADD_ON: Partial<Record<ProgramPosition, Item[]>> = {
  'Outside Hitter': [{ id: 'band-er', reps: '12 each' }, { id: 'er-90-90-iso', reps: '15 s each (light)' }],
  Opposite: [{ id: 'band-er', reps: '12 each' }, { id: 'er-90-90-iso', reps: '15 s each (light)' }],
  'Middle Blocker': [{ id: 'ankle-rock', reps: '8 each' }, { id: 'soleus-calf-raise', reps: '10' }],
  Setter: [{ id: 'wrist-roller', reps: 'Light · 15' }, { id: 'wall-slide', reps: '6' }],
  'Libero / DS': [{ id: 'short-lever-copenhagen', reps: '15 s each' }, { id: 'lateral-lunge', reps: '5 each (no weight)' }],
};
/** Trainer mode easy cardio, from the gym profile (§3a, §5). */
const CARDIO: { id: string; needs: Equipment }[] = [
  { id: 'bike', needs: 'bike' },
  { id: 'rower', needs: 'rower' },
  { id: 'treadmill-walk', needs: 'treadmill' },
  { id: 'elliptical', needs: 'elliptical' },
];

const row = (id: string, reps: string): ProgramExercise => ({ exerciseId: id, sets: 1, reps, effort: 'Easy' });
const custom = (name: string, reps: string): ProgramExercise => ({ exerciseId: 'warmup-item', customName: name, sets: 1, reps, effort: 'Easy' });

/** Fits the equipment (falls back for band items), not already used, and (home) needs nothing. */
function usable(item: Item, ctx: WarmupCtx, used: Set<string>): Item | null {
  const ok = (it: Item) => {
    if (used.has(it.id)) return false;
    const ex = getExercise(it.id);
    return ctx.home ? fits(ex, []) : fits(ex, ctx.equipment);
  };
  if (ok(item)) return item;
  const fb = BODYWEIGHT_FALLBACK[item.id];
  return fb && ok(fb) ? fb : null;
}

/** Take `n` items from a pool starting at the week's rotation offset. */
function take(pool: Item[], n: number, ctx: WarmupCtx, used: Set<string>): ProgramExercise[] {
  const out: ProgramExercise[] = [];
  const start = ((ctx.rotation ?? 0) * 2) % pool.length;
  for (let k = 0; k < pool.length && out.length < n; k++) {
    const it = usable(pool[(start + k) % pool.length], ctx, used);
    if (!it) continue;
    used.add(it.id);
    out.push(row(it.id, it.reps));
  }
  return out;
}

const lowerOf = (session: Session): Exclude<SessionType, 'total' | 'power' | 'push' | 'pull'> => {
  const p = primaryExercises(session).find((e) => LOWER.includes(e.pattern))?.pattern;
  return p === 'hinge' || p === 'knee-flex' ? 'hinge' : p === 'single-leg' ? 'single-leg' : 'squat';
};
const upperOf = (session: Session): 'push' | 'pull' => {
  const p = primaryExercises(session).find((e) => UPPER.includes(e.pattern))?.pattern;
  return p && ['h-pull', 'v-pull', 'arm-flex'].includes(p) ? 'pull' : 'push';
};

/* ---------- buildWarmup ---------- */
export function buildWarmup(session: Session, ctx: WarmupCtx): SessionWarmup {
  const type = sessionType(session);
  const a = aBlockType(session);
  const inSeason = ctx.phase === 'in';
  const compact = !!ctx.compact;
  const used = new Set<string>();

  // R · Raise
  const raise: ProgramExercise[] = [];
  const inPlace = !!ctx.limitedSpace || !!ctx.home;
  if (ctx.general && !ctx.home) {
    const machine = CARDIO.find((c) => ctx.equipment.includes(c.needs));
    raise.push(machine ? row(machine.id, '3 min · Easy') : row('walk-jog', '3 min · Easy'));
  }
  const raiseCount = compact ? 2 : ctx.general && !ctx.home ? 2 : ctx.home ? 3 : inSeason ? 2 : ctx.phase === 'post' ? 3 : 4;
  const start = ((ctx.rotation ?? 0) * 2) % RAISE.length;
  for (let k = 0; k < raiseCount; k++) {
    const d = RAISE[(start + k) % RAISE.length];
    used.add(d.id);
    raise.push(row(d.id, inPlace ? d.inPlace : compact ? '1 × 10 yd' : '2 × 10 yd'));
  }

  // A · Activate & mobilize
  let activate: ProgramExercise[] = [];
  const addOnPos = !ctx.general && ctx.position && ctx.position !== 'All positions' ? ADD_ON[ctx.position] : undefined;
  const base = ctx.home ? 3 : compact ? 3 : inSeason && addOnPos ? 3 : 4;
  if (type === 'total') {
    const lower = take(POOLS[lowerOf(session)], 2, ctx, used);
    const upper = take(POOLS[upperOf(session)], 2, ctx, used);
    const inch = usable({ id: 'inchworm', reps: '4' }, ctx, used);
    activate = [...lower, ...upper, ...(inch && !ctx.home && !compact ? [row(inch.id, inch.reps)] : [])].slice(0, ctx.home ? 3 : compact ? 4 : 5);
  } else {
    activate = take(POOLS[type], base, ctx, used);
  }
  if (addOnPos && !ctx.home) {
    const pick = addOnPos.map((it) => usable(it, ctx, used)).find(Boolean);
    if (pick) {
      used.add(pick.id);
      activate.push(row(pick.id, pick.reps));
    }
  }

  // P · Potentiate (all submaximal, rising effort)
  const pct = ctx.deload ? 70 : inSeason ? 80 : 75;
  const sets = inSeason || ctx.deload ? 1 : 2;
  const firstPlyo = primaryExercises(session).find((e) => e.pattern === 'jump');
  const throws = primaryExercises(session).filter((e) => e.pattern === 'throw');
  let potentiate: ProgramExercise[] = [];
  const hasJumps = session.exercises.some((pe) => getExercise(pe.exerciseId).pattern === 'jump');
  if (ctx.home) {
    potentiate = hasJumps ? [row('pogo', `${sets} × 10`)] : [];
  } else if (a === 'olympic') {
    potentiate = [custom('Empty-bar complex: RDL × 5 → hang high pull × 5 → front squat × 5', `${sets} round${sets > 1 ? 's' : ''} (or with a PVC or dowel)`)];
  } else if (a === 'vertical') {
    potentiate = [row('pogo', `${sets} × 10`), row('cmj', `${inSeason ? 2 : 3} at about ${pct}%`)];
    if (firstPlyo && !['pogo', 'cmj'].includes(firstPlyo.id)) potentiate.push(row(firstPlyo.id, `2 at about ${pct}%`));
  } else if (a === 'lateral') {
    potentiate = [row('skater-hop', `3 each at about ${pct}%`), row('line-hops', 'Side to side × 20')];
    if (firstPlyo && !['skater-hop', 'line-hops'].includes(firstPlyo.id)) potentiate.push(row(firstPlyo.id, `2 at about ${pct}%`));
  } else if (a === 'throws') {
    potentiate = [];
  } else if (type === 'push' || type === 'pull') {
    potentiate = [row('pushup', '6')];
    if (fits(getExercise('mb-chest-pass'), ctx.equipment)) potentiate.push(row('mb-chest-pass', '3 light'));
  } else {
    potentiate = [row('cmj', inSeason || ctx.deload ? `2 easy` : '3 easy'), row('bodyweight-squat', '5 fast')];
  }
  // Throws in the session: 2 light throws of each, building to about 80% (70% on a deload).
  if (!ctx.home && (a === 'throws' || (a === 'vertical' && throws.length))) {
    for (const t of throws) potentiate.push(row(t.id, `2 light throws, building to about ${ctx.deload ? 70 : 80}%`));
  }
  if (compact) potentiate = potentiate.slice(0, 1);

  return { raise, activate, potentiate, ...(compact ? { compact: true } : {}), ...(ctx.limitedSpace ? { limitedSpace: true } : {}) };
}

/* ---------- what a session shows ---------- */
export const isSessionWarmup = (w: Session['warmup']): w is SessionWarmup => !!w && typeof w === 'object';
export const isLegacyWarmup = (w: Session['warmup']): w is WarmupId => typeof w === 'string';

/** None for light home days and mobility/recovery sessions (§5: the session is the warm-up). Testing days are handled by the testing screen. */
export function warmupApplies(session: Session): boolean {
  return !session.light && !session.mobility;
}

/**
 * The warm-up a session shows: null when removed (or the session has none); the coach's version when edited (or from a
 * template); otherwise generated from the session (a 2.3.0 W1–W3 id also generates: W1–W3 are replaced).
 */
export function warmupFor(session: Session, ctx: WarmupCtx): (SessionWarmup & { source: 'approach' | 'edited' | 'template' }) | null {
  if (!warmupApplies(session) || session.warmup === null) return null;
  const w = session.warmup;
  if (isSessionWarmup(w) && (w.edited || w.template)) {
    // Every part emptied (or the team default is None): no card (F47).
    if (!w.raise.length && !w.activate.length && !w.potentiate.length) return null;
    const base = { ...w, source: (w.template && !w.edited ? 'template' : 'edited') as 'template' | 'edited' };
    return ctx.compact && !w.compact ? { ...base, ...compactOf(w), compact: true } : base;
  }
  const limitedSpace = isSessionWarmup(w) && w.limitedSpace != null ? w.limitedSpace : ctx.limitedSpace;
  const compact = !!ctx.compact || (isSessionWarmup(w) && !!w.compact);
  return { ...buildWarmup(session, { ...ctx, limitedSpace, compact }), source: 'approach' };
}

/** A coach's warm-up shortened for Fit to time: first 2 Raise, first 4 Activate, first Potentiate step. */
export function compactOf(w: SessionWarmup): Pick<SessionWarmup, WarmupPart> {
  return { raise: w.raise.slice(0, 2), activate: w.activate.slice(0, 4), potentiate: w.potentiate.slice(0, 1) };
}

/** Rough warm-up length (§1 totals): drills, activation items, potentiation steps, plus a minute of moving between parts. */
export function warmupMinutes(w: Pick<SessionWarmup, WarmupPart> & { compact?: boolean } | null, ctx: Pick<WarmupCtx, 'phase' | 'home'>): number {
  if (!w) return 0;
  let min = 1;
  for (const r of w.raise) {
    const m = r.reps.match(/(\d+)\s*min/);
    min += m ? Number(m[1]) : /^2 ×/.test(r.reps) ? 0.75 : 0.45;
  }
  min += w.activate.length * 0.8;
  for (const p of w.potentiate) min += p.customName ? 2.5 : 1;
  const floor = ctx.home ? 6 : w.compact ? (ctx.phase === 'in' ? 5 : 6) : 0;
  return Math.max(floor, Math.round(min));
}

/** Display name of a warm-up row (library exercise or the coach's own item). */
export const warmupName = (pe: ProgramExercise) => pe.customName ?? getExercise(pe.exerciseId).name;

/* ---------- §4 ramp-up sets ---------- */
export type RampSet = { label: string; weight: number | null; reps: number };
export type RampCtx = {
  /** Work sets are at 85%+ of e1RM (adds the 85% × 1 single above 185 lb). */
  heavyPct?: boolean;
  /** An earlier heavy lift in this session used the same pattern (skip the bar × 8). */
  samePatternBefore?: boolean;
  equipment?: Equipment[];
};
export const BAR_LB = 45;
export const RAMP_REST_SEC = 60;
const r5 = (n: number) => Math.max(BAR_LB, Math.round(n / 5) * 5);
const lbl = (w: number, reps: number) => (w <= BAR_LB ? `Bar × ${reps}` : `${w} lb × ${reps}`);

/** Loaded tier A or P exercises get ramp-up sets (throws are potentiated with light throws instead). */
export function needsRampUp(ex: Exercise, equipment?: Equipment[]): boolean {
  if (!ex.weighted || ex.durationOnly || ex.pattern === 'throw' || ex.pattern === 'cardio') return false;
  const t = tierOf(ex, equipment);
  return t === 'A' || t === 'P';
}

const isDumbbell = (ex: Exercise) => !ex.equipment.some((s) => s.includes('barbell') || s.includes('trap-bar'));

/** §4 table. `workingWeight` is the first work set's weight (lb); null/0 = not known yet ("Bar or light weight × 8"). */
export function rampSetsFor(ex: Exercise, workingWeight: number | null | undefined, ctx: RampCtx = {}): RampSet[] {
  if (!workingWeight || workingWeight <= 0) return [{ label: 'Bar or light weight × 8', weight: null, reps: 8 }];
  const W = workingWeight;
  const at = (p: number, reps: number): RampSet => {
    const w = r5(W * p);
    return { label: lbl(w, reps), weight: w, reps };
  };
  const bar = (reps: number): RampSet => ({ label: `Bar × ${reps}`, weight: BAR_LB, reps });
  if (ex.pattern === 'olympic') return [bar(5), at(0.5, 3), at(0.7, 2)];
  if (W <= 95 || isDumbbell(ex)) {
    const w = Math.max(5, Math.round((W * 0.5) / 5) * 5);
    return [{ label: isDumbbell(ex) ? `${w} lb × 5` : lbl(w, 5), weight: w, reps: 5 }];
  }
  const out: RampSet[] = W <= 185 ? [bar(8), at(0.5, 5), at(0.7, 3)] : [bar(8), at(0.4, 5), at(0.6, 3), at(0.75, 2), ...(ctx.heavyPct ? [at(0.85, 1)] : [])];
  return ctx.samePatternBefore ? out.slice(1) : out;
}
