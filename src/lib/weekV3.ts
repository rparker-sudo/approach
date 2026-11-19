import { ALL_EQUIPMENT, getExercise } from './exercises';
import type { GeneratorInput } from './generator';
import { BLOCK_LABEL, blockFor, emphasize, IN2, POSITION_CARE, POST, PRE3, rowOf, T2, T3, T4, T5_DAY5, type Day, type Slot } from './generatorV3';
import { HOME_NAME, LIGHT_NAME, MOBILITY_NAME, WEEKDAY_FULL, type DayKind, type HomeType } from './homeV3';
import { WEEKDAYS, type DayType, type Experience, type Phase, type Program, type ProgramExercise, type ProgramPosition, type Session } from './types';
import { dateKey, weekPlan } from './calendar';
import { homeTypeOf } from './homeV3';
import { uid } from './util';

/**
 * 2.4.1 Part D (spec D1–D5, D-062): generator v3 builds the whole week from the coach's week setup
 * (Off · Weight room · Home workout · Mobility per weekday). Content: content/programs/home-and-mobility-v3.md v1.0.
 *  - §2a weight-room template by count and phase; §2c home types; §2d what moves home; §2e content swaps (never day moves);
 *  - §3 home templates (slot defaults = each ladder's home rung; each athlete's app resolves them);
 *  - §4 the mobility session; the H2 light home day for athletes over their cap.
 * The coach's days are never moved here (D2.1). Per-athlete rules (R6 caps, H3, H4 on another team's calendar) run in
 * calendar.weekPlan. Stored in existing keys only (D5).
 */

/** In-season bye-week Day 3 session name (Part C). */
export const BYE_DAY3 = 'Day 3 (bye week)';

export type SetupInput = GeneratorInput & { kinds: DayKind[]; clubInSeason?: boolean };

const isMatch = (t: DayType | undefined) => t === 'game' || t === 'tournament';

/* ---------- §2a weight-room templates ---------- */
/** A day with a squat or hinge B-block (every template except the upper days) is lower-heavy (H5). */
export function lowerHeavy(day: Pick<Day, 'slots'> | Pick<Session, 'exercises'>): boolean {
  const mains = 'slots' in day ? day.slots.filter((s) => s.role === 'main').map((s) => s.id) : day.exercises.filter((e) => e.role === 'main').map((e) => e.exerciseId);
  return mains.some((id) => getExercise(id).category !== 'upper');
}

const withPushPress = (d: Day): Day => ({ ...d, slots: [...d.slots.filter((s) => s.role === 'power'), { role: 'power', id: 'push-press' }, ...d.slots.filter((s) => s.role !== 'power')] });

/**
 * §2a: the weight-room sessions for `count` days in this phase, in template order (Day 1 first). With one weight-room day,
 * two sessions alternate week by week (the second isn't on the schedule; calendar.weekPlan swaps it in on odd weeks).
 */
export function roomTemplates(phase: Phase, count: number, experience: GeneratorInput['experience']): Day[] {
  void experience; // §2a is by day count and phase; the 5th day (Power + care) is in the table for 4+ days in every level.
  if (count <= 0) return [];
  if (phase === 'in') {
    // Day 1 Heavy + Day 2 Fast; a third day is a second Day 2 Fast at 2 sets (Day 3 only in a bye week, Part C); a 4th is
    // over everyone's in-season cap (3) and becomes each athlete's light day (calendar.weekPlan).
    const fast2: Day = { ...IN2[1], name: 'Day 2 Fast (2 sets)' };
    const list = [IN2[0], IN2[1], fast2, { ...IN2[1], name: 'Day 4 Fast (2 sets)' }];
    return count === 1 ? [IN2[0]] : list.slice(0, Math.min(count, 4)).concat(cycle(list, count - 4));
  }
  if (phase === 'pre') {
    if (count === 1) return [PRE3[0], { ...PRE3[2], name: `${PRE3[2].name} (alternate weeks)` }];
    if (count === 2) return [PRE3[0], withPushPress(PRE3[2])];
    if (count === 3) return PRE3;
    return [...PRE3, T5_DAY5, ...cycle(PRE3, count - 4)];
  }
  if (phase === 'post') {
    if (count <= 3) return POST.slice(0, count);
    return [...POST, T5_DAY5, ...cycle(POST, count - 4)];
  }
  // Off-season (Accumulation / Strength / Strength-Power).
  if (count === 1) return [T2[0], { ...T2[1], name: `${T2[1].name} (alternate weeks)` }];
  if (count === 2) return T2;
  if (count === 3) return T3;
  if (count === 4) return T4;
  return [...T4, T5_DAY5, ...cycle(T4, count - 5)].slice(0, count);
}
const cycle = (list: Day[], n: number) => Array.from({ length: Math.max(0, n) }, (_, i) => list[i % list.length]);

/**
 * §2a order: the coach's weight-room days get the templates in order (Day 1 first). In-season, Day 1 Heavy goes on the earliest
 * weight-room day not within 2 days before a match (§7f); if none qualifies, Day 2 Fast goes there and Day 1 moves to the next
 * qualifying day. Returns the template index for each weight-room day (in day order).
 */
export function roomOrder(roomDays: number[], week: DayType[], phase: Phase, templates: number): number[] {
  const idx = roomDays.map((_, k) => k);
  if (phase !== 'in' || roomDays.length < 2 || templates < 2) return idx;
  const ok = (d: number) => !isMatch(week[(d + 1) % 7]) && !isMatch(week[(d + 2) % 7]) && !isMatch(week[d]);
  const first = roomDays.findIndex(ok);
  if (first <= 0) return idx;
  // Day 1 Heavy on `first`; the earlier days take Day 2 Fast, then the rest in order.
  const out: number[] = Array(roomDays.length).fill(-1);
  out[first] = 0;
  let next = 1;
  for (let k = 0; k < roomDays.length; k++) if (out[k] < 0) out[k] = next++;
  return out;
}

/* ---------- §2c / §2e home types ---------- */
/** §2c (and the §6 constants): home types by weight-room days (1–4) and home days, off/pre/post; in-season override. */
export function homeTypes(wr: number, homes: number, phase: Phase): HomeType[] {
  if (homes <= 0) return [];
  if (phase === 'in') return Array.from({ length: homes }, (_, i) => (i === 0 ? 'H-Upper' : 'H-Durability'));
  const w = Math.max(1, Math.min(4, wr));
  const base: HomeType[] =
    w === 1 ? (homes === 1 ? ['H-Total'] : homes === 2 ? ['H-Lower', 'H-Upper'] : ['H-Lower', 'H-Upper', 'H-Total'])
      : w === 2 ? ['H-Upper', 'H-Lower', 'H-Durability']
        : w === 3 ? ['H-Upper', 'H-Durability', 'H-Lower']
          : ['H-Durability', 'H-Upper', 'H-Lower'];
  return Array.from({ length: homes }, (_, i) => base[i] ?? 'H-Durability');
}

/**
 * §2c then §2e on the team's week: types go to the coach's home days earliest first; then
 *  1. H5: an H-Lower/H-Total next to a lower-heavy weight-room day swaps type with a home day that isn't; if none, it becomes
 *     H-Upper (or H-Durability when H-Upper is already in the week);
 *  2. H4: a home day the day before a match or tournament is H-Upper or H-Durability only.
 * (A home workout on a match day stays in the plan; each athlete gets that day Off in calendar.weekPlan.)
 */
export function assignHomeTypes(kinds: DayKind[], week: DayType[], phase: Phase, heavyDays: Set<number>): Map<number, HomeType> {
  const homeDays = kinds.map((k, i) => (k === 'home' ? i : -1)).filter((i) => i >= 0);
  const wr = kinds.filter((k) => k === 'room').length;
  const types = homeTypes(wr, homeDays.length, phase);
  const map = new Map<number, HomeType>(homeDays.map((d, i) => [d, types[i]]));
  const legs = (t: HomeType) => t === 'H-Lower' || t === 'H-Total';
  const nextToHeavy = (d: number) => heavyDays.has((d + 6) % 7) || heavyDays.has((d + 1) % 7);
  const beforeMatch = (d: number) => isMatch(week[(d + 1) % 7]);
  const bad = (d: number, t: HomeType) => (legs(t) && nextToHeavy(d)) || (legs(t) && beforeMatch(d));
  const fallback = (d: number) => {
    const has = new Set([...map.entries()].filter(([k]) => k !== d).map(([, t]) => t));
    return has.has('H-Upper') ? 'H-Durability' : 'H-Upper';
  };
  for (const d of homeDays) {
    const t = map.get(d)!;
    if (!bad(d, t)) continue;
    const other = homeDays.find((o) => o !== d && !bad(o, t) && !bad(d, map.get(o)!));
    if (other != null) {
      map.set(d, map.get(other)!);
      map.set(other, t);
    } else map.set(d, fallback(d));
  }
  return map;
}

/* ---------- §3 home templates ---------- */
type HomeRow = { block: 'A' | 'B' | 'C' | 'D' | 'E'; id: string };
/** §3b home defaults (each ladder's home rung; ids from the catalog). */
const HOME_SLOTS: Record<HomeType, HomeRow[]> = {
  'H-Upper': [
    { block: 'B', id: 'pushup' },
    { block: 'C', id: 'doorframe-row' }, { block: 'C', id: 'pike-pushup' },
    { block: 'D', id: 'prone-pulldown' }, { block: 'D', id: 'dead-bug' },
  ],
  'H-Lower': [
    { block: 'A', id: 'line-hops' },
    { block: 'B', id: 'reverse-lunge' },
    { block: 'C', id: 'glute-bridge' }, { block: 'C', id: 'lateral-lunge' },
    { block: 'D', id: 'slider-ham-curl' }, { block: 'D', id: 'short-lever-copenhagen' },
  ],
  'H-Total': [
    { block: 'A', id: 'squat-jump' },
    { block: 'B', id: 'reverse-lunge' },
    { block: 'C', id: 'pushup' }, { block: 'C', id: 'doorframe-row' },
    { block: 'D', id: 'glute-bridge' }, { block: 'D', id: 'side-plank' },
  ],
  'H-Durability': [
    { block: 'C', id: 'iso-split-squat' }, { block: 'C', id: 'push-up-plus' },
    { block: 'D', id: 'slider-ham-curl' }, { block: 'D', id: 'short-lever-copenhagen' },
  ],
};
/** E-block slots by type (§3b): the kinds each E slot draws from (distinct exercises). */
const HOME_E: Record<HomeType, ('shoulder' | 'knee' | 'ankle' | 'core')[]> = {
  'H-Upper': ['shoulder', 'shoulder', 'shoulder'],
  'H-Lower': ['knee', 'ankle', 'ankle'],
  'H-Total': ['shoulder', 'knee', 'core'],
  'H-Durability': ['shoulder', 'shoulder', 'ankle', 'ankle', 'core'],
};
const E_POOL: Record<'shoulder' | 'knee' | 'ankle' | 'core', string[]> = {
  shoulder: ['ytw', 'wall-slide', 'push-up-plus'],
  knee: ['iso-split-squat', 'wall-sit'],
  ankle: ['soleus-calf-raise', 'tib-raise', 'calf-raise', 'ankle-balance'],
  core: ['dead-bug', 'plank'],
};
/** §8b at home: the position's first E items (bodyweight-capable). */
const HOME_E_PICKS: Partial<Record<ProgramPosition, string[]>> = {
  'Middle Blocker': ['soleus-calf-raise', 'tib-raise'],
  Setter: ['wrist-roller'],
  'Libero / DS': ['short-lever-copenhagen', 'soleus-calf-raise'],
};
export const HOME_JUMP_NOTE = 'Clear space, no low ceilings, sneakers on. Up to 20 contacts.';

/** One v3 home workout (§3a: home warm-up → A (jumps at home only) → B → C superset → D superset → E circuit). */
export function homeSession(type: HomeType, opts: { phase: Phase; position: ProgramPosition; homeJumps: boolean; moved?: { E?: string[]; D?: string[]; C?: string[] } }): Session {
  const jumps = opts.homeJumps && (opts.phase === 'off' || opts.phase === 'pre');
  const rows: ProgramExercise[] = [];
  const used = new Set<string>();
  const add = (block: HomeRow['block'], id: string) => {
    if (used.has(id)) return;
    used.add(id);
    const role = block === 'A' ? 'power' : block === 'B' ? 'main' : block === 'C' ? 'secondary' : block === 'D' ? (getExercise(id).category === 'core' ? 'core' : 'accessory') : 'care';
    rows.push({ exerciseId: id, sets: 2, reps: '10', effort: 'RPE 6', role, ...(block === 'C' || block === 'D' || block === 'E' ? { group: block } : {}), ...(block === 'A' ? { notes: HOME_JUMP_NOTE } : {}) });
  };
  for (const r of HOME_SLOTS[type]) if (r.block !== 'A' || jumps) add(r.block, r.id);
  for (const id of opts.moved?.C ?? []) add('C', id);
  for (const id of opts.moved?.D ?? []) add('D', id);
  // E: the position's picks first, then the slot defaults (no-equipment items first after picks), then moved care work.
  const picks = (HOME_E_PICKS[opts.position] ?? []).filter((id) => !used.has(id));
  const e: string[] = [...picks];
  const slots = HOME_E[type].slice(picks.length);
  for (const kind of slots) {
    const pool = picks.length && kind === 'shoulder' ? ['wall-slide', 'push-up-plus', 'ytw'] : E_POOL[kind];
    const next = pool.find((id) => !e.includes(id) && !used.has(id));
    if (next) e.push(next);
  }
  for (const id of opts.moved?.E ?? []) if (!e.includes(id) && e.length < HOME_E[type].length + 2) e.push(id);
  for (const id of e) add('E', id);
  return { id: uid(), name: HOME_NAME[type], focus: type === 'H-Durability' ? 'Care' : type.slice(2), exercises: rows, location: 'home', source: 'approach' };
}

/* ---------- §4 mobility, H2 light day ---------- */
/** §4a: M1 breathe · M2 flow (8-item pool; resolveSession picks by phase and rotates weekly) · M3 position care · M4 core · Close. */
export const MOBILITY_FLOW: [string, string][] = [
  ['worlds-greatest', '3 each'], ['hip-90-90', '5 each'], ['ankle-rock', '8 each'], ['thoracic-rotation', '5 each'],
  ['cat-camel', '8'], ['hip-flexor-stretch', '30s each'], ['lat-reach', '20s each'], ['band-hamstring', '30s each'],
];
export const MOBILITY_CARE: Record<ProgramPosition, [string, string][]> = {
  'Outside Hitter': [['wall-slide', '8'], ['ytw', '6 each'], ['push-up-plus', '8']],
  Opposite: [['wall-slide', '8'], ['ytw', '6 each'], ['push-up-plus', '8']],
  'Middle Blocker': [['soleus-calf-raise', '12'], ['iso-split-squat', '30s each'], ['tib-raise', '15']],
  Setter: [['wall-slide', '8'], ['ytw', '6 each'], ['wrist-roller', '15']],
  'Libero / DS': [['short-lever-copenhagen', '15s each'], ['lateral-lunge', '5 each'], ['ankle-balance', '4 each']],
  'All positions': [['wall-slide', '8'], ['iso-split-squat', '30s each'], ['side-plank', '15s each']],
};
export const MOBILITY_EFFORT_LINE = 'Easy. Move slowly and breathe. Nothing here should feel hard.';
export const AFTER_MATCH_LINE = 'After your match.';

/** The v3 mobility session as stored (the full flow pool; resolveSession picks what each day gets). */
export function mobilitySessionV3(position: ProgramPosition): Session {
  const row = (id: string, reps: string, role: ProgramExercise['role'], sets = 1): ProgramExercise => ({ exerciseId: id, sets, reps, effort: 'Easy', role });
  return {
    id: uid(),
    name: MOBILITY_NAME,
    focus: 'Mobility and care',
    mobility: true,
    location: 'home',
    source: 'approach',
    exercises: [
      row('crocodile-breathing', '5 breaths', 'mobility'),
      ...MOBILITY_FLOW.map(([id, reps]) => row(id, reps, 'mobility')),
      ...MOBILITY_CARE[position].map(([id, reps]) => row(id, reps, 'care', 2)),
      row('dead-bug', '6 each', 'core'),
      row('side-plank', '20s each', 'core'),
      row('crocodile-breathing', '3 breaths', 'mobility'),
    ],
  };
}

/** H2 light home day (§4c): mobility + care + core + one easy single-leg move; bodyweight, RPE ≤ 6. */
export function lightSessionV3(): Session {
  return {
    id: uid(),
    name: LIGHT_NAME,
    focus: 'Light: mobility, care and core',
    location: 'home',
    light: true,
    source: 'approach',
    exercises: [
      { exerciseId: 'worlds-greatest', sets: 1, reps: '3 each', effort: 'Easy', role: 'mobility' },
      { exerciseId: 'hip-90-90', sets: 1, reps: '5 each', effort: 'Easy', role: 'mobility' },
      { exerciseId: 'reverse-lunge', sets: 2, reps: '8 each', effort: 'RPE 6', role: 'accessory' },
      { exerciseId: 'wall-slide', sets: 2, reps: '10', effort: 'Light', role: 'care' },
      { exerciseId: 'iso-split-squat', sets: 2, reps: '30s each', effort: 'Light', role: 'care' },
      { exerciseId: 'dead-bug', sets: 2, reps: '6 each', effort: 'Easy', role: 'core' },
    ],
  };
}

/* ---------- build ---------- */
const UPPER_ACCESSORIES = new Set(['face-pull', 'rear-delt-fly']);
const KNEE_HOLDS = ['spanish-squat', 'iso-split-squat'];
const HOLDS = new Set(['spanish-squat', 'iso-split-squat', 'er-90-90-iso', 'wall-sit']);

/** §2d: one care item stays in each weight-room session as a filler in the B-block rests. */
function fillerFor(day: Day, position: ProgramPosition, used: Set<string>): string | null {
  const care = day.slots.filter((s) => s.role === 'care').map((s) => s.id);
  const picks = [...(POSITION_CARE[position] ?? []), ...care];
  const squatDay = day.slots.some((s) => s.role === 'main' && getExercise(s.id).pattern === 'squat');
  if (squatDay) {
    const knee = picks.find((id) => KNEE_HOLDS.includes(id));
    if (knee) return knee;
  }
  return picks.find((id) => !used.has(id) && HOLDS.has(id)) ?? picks.find((id) => !used.has(id)) ?? care[0] ?? null;
}

/**
 * Generator v3 from the week setup (spec D2): every session lands on the coach's day as the kind chosen. Weight-room days get
 * §2a, home days §2c/§2e types built from §3, mobility days §4; §2d moves work home with the coach note on the filler row.
 */
export function generateWeekV3(input: SetupInput): Program {
  const club = !!input.clubInSeason;
  const phase: Phase = club ? 'in' : input.phase;
  const kinds = input.kinds.slice(0, 7).concat(Array(Math.max(0, 7 - input.kinds.length)).fill('off')) as DayKind[];
  const week = input.volleyballWeek;
  const roomDays = kinds.map((k, i) => (k === 'room' ? i : -1)).filter((i) => i >= 0);
  const homeDays = kinds.map((k, i) => (k === 'home' ? i : -1)).filter((i) => i >= 0);
  const mobDays = kinds.map((k, i) => (k === 'mobility' ? i : -1)).filter((i) => i >= 0);

  // Weight room (§2a), with position emphasis (§8b).
  const tpl = roomTemplates(phase, roomDays.length, input.experience).map((d, i) => emphasize(d, input.position, i));
  const order = roomOrder(roomDays, week, phase, tpl.length);
  const heavyDays = new Set(roomDays.filter((d, k) => tpl[order[k]] && lowerHeavy(tpl[order[k]])));
  const types = assignHomeTypes(kinds, week, phase, heavyDays);

  // §2d: what moves home.
  const homes = homeDays.length;
  const firstOf = (want: HomeType[]) => homeDays.find((d) => want.includes(types.get(d)!));
  const careHome = firstOf(['H-Upper', 'H-Durability', 'H-Lower']);
  const upperHome = firstOf(['H-Upper']);
  const lowerHome = firstOf(['H-Lower']);
  const moved: Record<number, { E: string[]; D: string[]; C: string[] }> = {};
  const moveTo = (d: number | undefined, block: 'E' | 'D' | 'C', id: string) => {
    if (d == null) return false;
    (moved[d] ??= { E: [], D: [], C: [] })[block].push(id);
    return true;
  };
  const fillersUsed = new Set<string>();
  const roomSessions: Session[] = tpl.map((day, t) => {
    let rows = day.slots.map(rowOf);
    if (homes >= 1 && careHome != null) {
      const filler = fillerFor(day, input.position, fillersUsed);
      if (filler) fillersUsed.add(filler);
      const care = rows.filter((r) => r.role === 'care' && r.exerciseId !== filler);
      for (const r of care) moveTo(careHome, 'E', r.exerciseId);
      rows = rows.filter((r) => r.role !== 'care');
      if (filler) {
        const mainAt = rows.findIndex((r) => r.role === 'main');
        const note = `Care work is on ${WEEKDAY_FULL[careHome]}'s home workout.`;
        rows.splice(mainAt >= 0 ? mainAt + 1 : rows.length, 0, { ...rowOf({ role: 'care', id: filler } as Slot), filler: true, notes: note });
      }
    }
    if (homes >= 2 && upperHome != null) {
      const ups = rows.filter((r) => (r.role === 'accessory' || r.role === 'core') && UPPER_ACCESSORIES.has(r.exerciseId));
      for (const r of ups) moveTo(upperHome, 'D', r.exerciseId);
      rows = rows.filter((r) => !ups.includes(r));
    }
    if (homes >= 2 && roomDays.length <= 2 && lowerHome != null) {
      const uni = rows.filter((r) => r.role === 'secondary' && getExercise(r.exerciseId).pattern === 'single-leg');
      if (uni.length >= 2) {
        moveTo(lowerHome, 'C', uni[1].exerciseId);
        rows = rows.filter((r) => r !== uni[1]);
      }
    }
    if (mobDays.length >= 1 && homes === 0) {
      // Shoulder and ankle care shrink to 1 round in the weight room (the mobility day covers them); tendon holds stay.
      rows = rows.map((r) => (r.role === 'care' && ['shoulder-care', 'ankle-care'].includes(getExercise(r.exerciseId).pattern) ? { ...r, sets: 1 } : r));
    }
    void t;
    return { id: uid(), name: day.name, focus: day.focus, source: 'approach', exercises: rows };
  });

  // Part C: bye-week Day 3 (in-season, 3+ weight-room days): off-season Day 3 at Maintain volume, kept off the schedule;
  // calendar.weekPlan uses it instead of the second Day 2 Fast in a week with no match or tournament on the athlete's calendar.
  const bye: Session | null = phase === 'in' && roomDays.length >= 3
    ? { id: uid(), name: BYE_DAY3, focus: 'Total: hinge', source: 'approach', exercises: emphasize(T3[2], input.position, 2).slots.map(rowOf) }
    : null;
  const homeSessions = new Map<number, Session>(homeDays.map((d) => [d, homeSession(types.get(d)!, { phase, position: input.position, homeJumps: !!input.homeJumps, moved: moved[d] })]));
  const mobility = mobDays.length ? mobilitySessionV3(input.position) : null;
  const fullDays = roomDays.length + homes;
  // The H2 light day is only used by athletes over their cap (beginners and in-season: 3 full days).
  const light = fullDays > 3 ? lightSessionV3() : null;

  const liftSchedule: (string | null)[] = Array(7).fill(null);
  roomDays.forEach((d, k) => {
    const s = roomSessions[order[k]];
    if (s) liftSchedule[d] = s.id;
  });
  for (const [d, s] of homeSessions) liftSchedule[d] = s.id;
  if (mobility) for (const d of mobDays) liftSchedule[d] = mobility.id;

  const now = new Date();
  const block = blockFor(input.phase, 0, club);
  return {
    id: uid(),
    name: input.name?.trim() || `${BLOCK_LABEL[block]} – ${input.position}`,
    forName: input.forName,
    author: input.author,
    position: input.position,
    phase: input.phase,
    experience: input.experience,
    volleyballWeek: [...input.volleyballWeek],
    liftSchedule,
    sessions: [...roomSessions, ...(bye ? [bye] : []), ...homeSessions.values(), ...(mobility ? [mobility] : []), ...(light ? [light] : [])],
    createdAt: now.toISOString(),
    equipment: input.equipment ?? ALL_EQUIPMENT,
    blockStart: dateKey(now),
    blockWeeks: 4,
    block,
    weightRoomDays: roomDays,
    ...(input.homeJumps ? { homeJumps: true } : {}),
    ...(input.supersets != null ? { supersets: input.supersets } : {}),
  };
}

/* ---------- D3 / §5.2 Recommend ---------- */
/** home-workouts §3 recommended totals for the phase (intermediate), weight room + home workouts. */
export function recommendedTotalV3(phase: Phase, rooms: number): number {
  return phase === 'off' ? 4 : phase === 'pre' ? (rooms >= 2 ? 4 : 3) : 3;
}

/**
 * §5.2 Recommend for me: fills Off days only, never changes a day the coach set. Mobility first (the day after a match or
 * tournament; else the day after the first lower-heavy weight-room day; never on a match day), then home workouts (not on a
 * match day; not the day before one unless it will be upper/care; not next to a lower-heavy day if it will be lower/total;
 * prefer days with no volleyball; spread out). Keeps ≥ 1 fully Off day (drops the last mobility day, then the last home day).
 */
export function recommendWeek(kinds: DayKind[], week: DayType[], phase: Phase, experience: GeneratorInput['experience'] = 'intermediate', want?: { homes?: number; mobility?: number }): { kinds: DayKind[]; filled: number[] } {
  const out = [...kinds];
  const rooms = out.filter((k) => k === 'room').length;
  const totalWanted = recommendedTotalV3(phase, rooms);
  const homesWanted = want?.homes ?? Math.max(0, totalWanted - rooms - out.filter((k) => k === 'home').length);
  const mobWanted = want?.mobility ?? Math.max(0, ((phase === 'in' || phase === 'post') ? 2 : 1) - out.filter((k) => k === 'mobility').length);
  const filled: number[] = [];
  const free = (i: number) => out[i] === 'off' && !filled.includes(i);
  const offLeft = () => out.filter((k) => k === 'off').length;
  // Mobility first.
  const tpl = roomTemplates(phase, rooms, experience);
  const roomDays = out.map((k, i) => (k === 'room' ? i : -1)).filter((i) => i >= 0);
  const order = roomOrder(roomDays, week, phase, tpl.length);
  const heavy = roomDays.filter((d, k) => tpl[order[k]] && lowerHeavy(tpl[order[k]]));
  for (let n = 0; n < mobWanted; n++) {
    const afterMatch = [0, 1, 2, 3, 4, 5, 6].find((i) => free(i) && !isMatch(week[i]) && isMatch(week[(i + 6) % 7]));
    const afterHeavy = heavy.map((d) => (d + 1) % 7).find((i) => free(i) && !isMatch(week[i]));
    const any = [0, 1, 2, 3, 4, 5, 6].find((i) => free(i) && !isMatch(week[i]) && week[i] !== 'practice');
    const pick = afterMatch ?? afterHeavy ?? any;
    if (pick == null || offLeft() <= 1) break;
    out[pick] = 'mobility';
    filled.push(pick);
  }
  // Home workouts next.
  const isHome = (i: number) => out[i] === 'home';
  for (let n = 0; n < homesWanted; n++) {
    if (offLeft() <= 1) break;
    const cands = [0, 1, 2, 3, 4, 5, 6].filter((i) => free(i) && !isMatch(week[i]));
    if (!cands.length) break;
    const score = (i: number) =>
      (isMatch(week[(i + 1) % 7]) ? 4 : 0) +
      (heavy.includes((i + 6) % 7) || heavy.includes((i + 1) % 7) ? 1 : 0) +
      (week[i] === 'off' ? 0 : 1) +
      (isHome((i + 6) % 7) || isHome((i + 1) % 7) ? 2 : 0);
    const pick = cands.sort((a, b) => score(a) - score(b) || a - b)[0];
    out[pick] = 'home';
    filled.push(pick);
  }
  // Keep at least one fully Off day.
  while (!out.includes('off') && filled.length) {
    const lastMob = [...filled].reverse().find((i) => out[i] === 'mobility');
    const drop = lastMob ?? [...filled].reverse().find((i) => out[i] === 'home');
    if (drop == null) break;
    out[drop] = 'off';
    filled.splice(filled.indexOf(drop), 1);
  }
  return { kinds: out, filled: filled.sort((a, b) => a - b) };
}

/**
 * The week setup for a generator input: the coach's kinds when given (the Week setup card); otherwise (older callers that pass
 * weight-room days and a total) the weight-room days plus home workouts placed by §5.2, no mobility; otherwise the lift days.
 */
export function kindsFor(input: GeneratorInput & { kinds?: DayKind[] }): DayKind[] {
  if (input.kinds?.length) return input.kinds;
  const base: DayKind[] = Array(7).fill('off');
  if (input.weightRoomDays?.length) {
    for (const d of input.weightRoomDays) base[d] = 'room';
    const homes = Math.max(0, input.liftDaysPerWeek - input.weightRoomDays.length);
    return recommendWeek(base, input.volleyballWeek, input.phase, input.experience, { homes, mobility: 0 }).kinds;
  }
  return base;
}

/* ---------- §3c home prescriptions (resolveSession) ---------- */
type BlockKey = 'restore' | 'accumulation' | 'strength' | 'strength_power' | 'power' | 'maintain';
type Rx3 = [number, string, string];
const HOME_RX_V3: Record<BlockKey, { A: [number, string] | null; B: Rx3; C: Rx3; D: Rx3; E: Rx3 }> = {
  restore: { A: null, B: [3, '10–12', 'RPE 6, tempo 3-1-1'], C: [3, '10–12', 'RPE 6'], D: [2, '12–15', 'RPE 6'], E: [2, '12–15', 'Light'] },
  accumulation: { A: [2, '5'], B: [3, '10–12', 'RPE 6–7'], C: [3, '10–12', 'RPE 6–7'], D: [3, '12–15', 'RPE 6–7'], E: [2, '12–15', 'Light'] },
  strength: { A: [2, '4'], B: [3, '8–10', 'RPE 7'], C: [3, '8–10', 'RPE 7'], D: [3, '10–12', 'RPE 7'], E: [2, '12–15', 'Light'] },
  strength_power: { A: [2, '3'], B: [3, '6–8', 'RPE 7, fast up'], C: [3, '8', 'RPE 7'], D: [2, '10–12', 'RPE 7'], E: [2, '12–15', 'Light'] },
  power: { A: [2, '3'], B: [3, '6–8', 'RPE 7, fast up'], C: [3, '8', 'RPE 7'], D: [2, '10–12', 'RPE 7'], E: [2, '12–15', 'Light'] },
  maintain: { A: null, B: [2, '8–10', 'RPE 6'], C: [2, '8–10', 'RPE 6'], D: [2, '10', 'RPE 6'], E: [1, '12–15', 'Light'] },
};
const HOME_HOLDS = new Set(['iso-split-squat', 'wall-sit', 'spanish-squat', 'side-plank', 'short-lever-copenhagen', 'copenhagen', 'plank', 'er-90-90-iso']);
const ONE_SIDED_HOLDS = new Set(['iso-split-squat', 'side-plank', 'short-lever-copenhagen', 'copenhagen']);
const ONE_SIDED = new Set(['line-hops', 'skater-hop', 'dead-bug']);
const down1 = (effort: string) => effort.replace(/RPE\s*(\d+)(?:(\s*[–-]\s*)(\d+))?/i, (_m, a: string, sep?: string, b?: string) => (b ? `RPE ${Number(a) - 1}${sep}${Number(b) - 1}` : `RPE ${Number(a) - 1}`));
const top = (r: string) => r.match(/(\d+)\s*$/)?.[1] ?? r;

/**
 * One home-workout row for this athlete on this block and week (§3c): the block-letter prescription (H-Durability: 2 ×
 * 12–15 / 30–45 s, RPE 6), week 2 top of the range on B and C, week 3 tempo 3-1-1 on B (the harder-version suggestion stays
 * the athlete's own choice), week 4 deload about −40% sets at RPE 6; RPE ≤ 7 at home, beginners one step lower.
 * `exerciseId` is the athlete's resolved exercise (holds and one-sided work keep time/"each" notation).
 */
export function homeRxV3(pe: ProgramExercise, exerciseId: string, type: HomeType, block: BlockKey, week: 1 | 2 | 3 | 4, level: 1 | 2 | 3): ProgramExercise | null {
  const role = pe.role ?? 'accessory';
  const letter = role === 'power' ? 'A' : role === 'main' ? 'B' : role === 'secondary' ? 'C' : role === 'care' ? 'E' : 'D';
  const ex = getExercise(exerciseId);
  let sets: number;
  let reps: string;
  let effort: string;
  if (letter === 'A') {
    const a = HOME_RX_V3[block].A;
    if (!a) return null;
    [sets, reps] = a;
    effort = 'Fast, land soft';
  } else if (type === 'H-Durability') {
    [sets, reps, effort] = [2, '12–15', 'RPE 6'];
  } else {
    [sets, reps, effort] = HOME_RX_V3[block][letter];
  }
  const deload = week === 4 && block !== 'maintain';
  if (!deload && week === 2 && (letter === 'B' || letter === 'C')) reps = top(reps);
  if (!deload && week === 3 && letter === 'B' && !/tempo/.test(effort)) effort = `${effort}, tempo 3-1-1`;
  if (deload) {
    sets = Math.max(1, Math.round(sets * 0.6));
    if (letter !== 'A' && letter !== 'E') effort = 'RPE 6';
  }
  if (HOME_HOLDS.has(exerciseId)) reps = ONE_SIDED_HOLDS.has(exerciseId) ? (letter === 'E' || type === 'H-Durability' ? '30s each' : '20s each') : '30s';
  else if (exerciseId === 'dead-bug') reps = '6 each';
  else if (ex.pattern === 'single-leg' || ONE_SIDED.has(exerciseId)) reps = `${reps} each`;
  if (level === 1 && /RPE/.test(effort)) effort = down1(effort);
  return { ...pe, sets, reps, effort };
}

/* ---------- F56e summary lines ---------- */
const LEVELS: { exp: Experience; label: string }[] = [
  { exp: 'beginner', label: 'Beginners' },
  { exp: 'intermediate', label: 'Intermediates' },
  { exp: 'advanced', label: 'Advanced athletes' },
];

/** F56e week line: "2 weight room + 1 home workout + 1 mobility day." */
export function weekLine(kinds: DayKind[]): string {
  const n = (k: DayKind) => kinds.filter((x) => x === k).length;
  const parts = [
    n('room') ? `${n('room')} weight room` : '',
    n('home') ? `${n('home')} home workout${n('home') === 1 ? '' : 's'}` : '',
    n('mobility') ? `${n('mobility')} mobility day${n('mobility') === 1 ? '' : 's'}` : '',
  ].filter(Boolean);
  return parts.length ? `${parts.join(' + ')}.` : 'No training days set.';
}

/** What an athlete at this level gets in the program's first week (weekPlan = what the app will do). */
function levelCounts(program: Program, monday: Date, exp: Experience) {
  const plan = weekPlan(program, monday, exp);
  const s = (id: string | null) => program.sessions.find((x) => x.id === id);
  let room = 0, home = 0, light = 0, mob = 0;
  for (const p of plan) {
    const x = s(p.sessionId);
    if (!x) continue;
    if (x.light) light++;
    else if (x.mobility) mob++;
    else if (homeTypeOf(x)) home++;
    else room++;
  }
  return { plan, room, home, light, mob };
}

/**
 * F56e summary lines, from the program these days build (so they always match the built program): the week line, per-level
 * lines when a level's week differs, and day exceptions. Neutral reasons only; never another team's events.
 */
export function summaryLines(kinds: DayKind[], program: Program, monday: Date, phase: Program['phase']): { week: string; levels: string[]; exceptions: string[] } {
  const week = weekLine(kinds);
  const levels: string[] = [];
  const base = kinds.filter((k) => k === 'room' || k === 'home').length;
  const lines = LEVELS.map(({ exp, label }) => {
    const c = levelCounts(program, monday, exp);
    const cap = phase === 'in' ? 3 : exp === 'beginner' ? 3 : exp === 'intermediate' ? 4 : 5;
    const parts = [
      c.room ? `${c.room} weight room` : '',
      c.home ? `${c.home} home workout${c.home === 1 ? '' : 's'}` : '',
      c.light ? `${c.light} light day` : '',
      c.mob ? `${c.mob} mobility day${c.mob === 1 ? '' : 's'}` : '',
    ].filter(Boolean);
    const same = c.room === kinds.filter((k) => k === 'room').length && c.home === kinds.filter((k) => k === 'home').length && !c.light && c.mob === kinds.filter((k) => k === 'mobility').length;
    return { exp, label, same, text: parts.join(' + '), cap, over: base > cap, c };
  });
  const diff = lines.filter((l) => !l.same);
  if (phase === 'in' && diff.length === lines.length && new Set(diff.map((d) => d.text)).size === 1) {
    levels.push(`In season: ${diff[0].text} (max 3 full lift days).`);
  } else {
    for (const l of diff) levels.push(`${l.label}: ${l.text} (max ${l.cap} full lift days for their level).`);
  }
  // Day exceptions (everyone, from the intermediate week).
  const exceptions: string[] = [];
  const plan = lines[1].c.plan;
  kinds.forEach((k, i) => {
    if (k === 'home' && isMatch(plan[i].dayType) && !plan[i].sessionId) exceptions.push(`${WEEKDAYS[i]}: ${plan[i].dayType === 'tournament' ? 'tournament' : 'match'} day, so the home workout is Off for athletes.`);
    if (k === 'mobility' && !plan[i].sessionId && /Rest day/.test(plan[i].note ?? '')) exceptions.push(`No day off this week, so ${WEEKDAYS[i]}'s mobility is Off for athletes.`);
  });
  return { week, levels, exceptions };
}

