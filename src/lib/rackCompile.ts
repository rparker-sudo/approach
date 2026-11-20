import { exercisePool, fits, getExercise } from './exercises';
import { ladderOf } from './ladders';
import { REST_FLOOR, tierOf } from './rest';
import { positionWorkSec, sameMuscles } from './rotation';
import type { Equipment, Exercise, ProgramExercise, RotationBlock, RotationPosition, Session } from './types';

/**
 * 2.4.2 Part C · Rack-aware generation (program-planner-v3.md §2b–§2d; spec C1–C4). Pure functions; no React.
 * Compiles an Approach-generated weight-room day into three rotations (R1 Power = block A, R2 Strength = block B, R3 Secondary
 * = block C) for a rack group of 3–5, with at most one rack position and one barbell position per rotation, a spotter after
 * barbell squat or bench, rotation times that meet the rest floors, and fitting by rounds (rest is never shortened).
 * Stored in existing keys only: `Session.format = 'rack_rotation'`, `rotation`, row `group` letters, `fitLog`.
 */

const SPOT: RotationPosition = { kind: 'spot', reps: '', usesRack: false };

/** The group's barbell (cleans, RDLs, push press, squat, bench). Trap bar, DBs, KBs, boxes, bands and med balls don't count. */
export function barOf(ex: Exercise): boolean {
  return ex.equipment.length > 0 && ex.equipment.every((s) => s.includes('barbell') || s.includes('ssb'));
}
/** The rack (squat, bench, push press from the rack, or the rack's pull-up bar; §2b step 3 assumes the bar is on the rack). */
export function rackOf(ex: Exercise): boolean {
  if (ex.equipment.length && ex.equipment.every((s) => s.includes('pullup-bar') || (ex.id === 'inverted-row' && s.includes('barbell')))) return true;
  if (!barOf(ex)) return false;
  return ex.pattern === 'squat' || ex.pattern === 'h-push' || ex.id === 'push-press' || ex.id === 'push-jerk';
}
/** §2b step 4: barbell squat or bench gets a spotter right after it. */
export const needsSpot = (ex: Exercise) => barOf(ex) && (ex.pattern === 'squat' || ex.pattern === 'h-push');

/**
 * §2c / §2d filler switches when an item doesn't fit the room (no bands, med balls or hurdles): within the same ladder or pool,
 * never a different pattern for a lift (Pallof → Dead Bug; med-ball throw → a jump; Spanish squat → Isometric Split Squat).
 */
const FILLER_SWAP: Record<string, string[]> = {
  pallof: ['dead-bug'],
  'mb-rotational': ['squat-jump'],
  'mb-overhead': ['squat-jump'],
  'mb-chest-pass': ['squat-jump'],
  'mb-scoop-toss': ['squat-jump'],
  'spanish-squat': ['iso-split-squat', 'wall-sit'],
  'band-er': ['er-90-90-iso', 'ytw'],
  'er-90-90-iso': ['side-lying-er', 'ytw'],
  'face-pull': ['ytw', 'wall-slide'],
  'hurdle-hop': ['box-jump', 'pogo'],
  'lateral-hurdle-hop': ['lateral-bound', 'skater-hop'],
};

/** The exercise the room can do for a slot at the plan's top level: itself, its filler switch, or its ladder's fitting rung. */
export function roomRung(id: string, equipment: Equipment[]): string | null {
  const ex = getExercise(id);
  if (fits(ex, equipment)) return id;
  for (const s of FILLER_SWAP[id] ?? []) if (fits(getExercise(s), equipment)) return s;
  const found = ladderOf(id);
  if (found) {
    const pool = exercisePool(false);
    for (const rung of found.ladder.rungs.slice(found.rung)) for (const r of rung) {
      const e = pool.find((x) => x.id === r) ?? getExercise(r);
      if (e && fits(e, equipment)) return r;
    }
  }
  return null;
}

/** §2b step 3: the nearest rung down the same ladder that uses no rack (and no barbell when `noBar`). Same pattern only. */
function nonRackRung(id: string, equipment: Equipment[], noBar: boolean): string | null {
  const found = ladderOf(id);
  if (!found) return null;
  const pat = getExercise(id).pattern;
  for (const rung of found.ladder.rungs.slice(found.rung)) for (const r of rung) {
    const e = getExercise(r);
    if (r !== id && fits(e, equipment) && !rackOf(e) && (!noBar || !barOf(e)) && e.pattern === pat) return r;
  }
  return null;
}

export type Layout = { name: string; rotations: { ids: (string | 'SPOT')[]; rotationSec: number; rounds: number }[] };

/**
 * §2c compiled templates (the acceptance examples), as written: exercises in rotation and position order, rotation times and
 * rounds. Training's D4 items (Day 2 R2 order, the timing arithmetic) are built as written and reported (known conflict 7).
 */
export const COMPILED: Layout[] = [
  {
    name: 'Day 1 Total: squat',
    rotations: [
      { ids: ['hang-clean', 'box-jump', 'ytw', 'copenhagen'], rotationSec: 75, rounds: 3 },
      { ids: ['back-squat', 'SPOT', 'db-row', 'pallof'], rotationSec: 75, rounds: 4 },
      { ids: ['bench', 'SPOT', 'db-rdl', 'spanish-squat'], rotationSec: 75, rounds: 3 },
    ],
  },
  {
    name: 'Day 2 Total: hinge',
    rotations: [
      { ids: ['push-press', 'mb-rotational', 'soleus-calf-raise', 'wall-slide'], rotationSec: 75, rounds: 3 },
      { ids: ['trap-bar-deadlift', 'weighted-pullup', 'face-pull', 'slider-ham-curl'], rotationSec: 90, rounds: 4 },
      { ids: ['split-squat', 'copenhagen', 'tib-raise', 'dead-bug'], rotationSec: 75, rounds: 3 },
    ],
  },
  {
    name: 'Day 1 Heavy',
    rotations: [
      { ids: ['hang-clean', 'box-jump', 'chin-up', 'wall-slide'], rotationSec: 75, rounds: 2 },
      { ids: ['back-squat', 'SPOT', 'spanish-squat', 'dead-bug'], rotationSec: 75, rounds: 3 },
      { ids: ['bench', 'SPOT', 'er-90-90-iso', 'soleus-calf-raise'], rotationSec: 75, rounds: 2 },
    ],
  },
];

/** §2c reps shown in the compiled tables (used for rows the template adds as fillers). */
const TABLE_REPS: Record<string, string> = {
  ytw: '6 each', copenhagen: '20s each', 'db-row': '8 each', pallof: '10 each', 'dead-bug': '6 each', 'db-rdl': '6 each', 'spanish-squat': '30s',
  'iso-split-squat': '30s each', 'soleus-calf-raise': '12', 'wall-slide': '8', 'face-pull': '12', 'slider-ham-curl': '8', 'tib-raise': '15',
  'chin-up': '5', 'er-90-90-iso': '20s each', 'mb-rotational': '4 each', 'squat-jump': '3',
};

const LETTERS = ['A', 'B', 'C'];
const r15 = (n: number) => Math.round(n / 15) * 15;

export type CompileOpts = {
  equipment: Equipment[];
  /** Rack group size (3–5; 4 by default). */
  groupSize: 3 | 4 | 5;
  /** Session length target, minutes (§4a), for fitting by rounds. */
  targetMinutes: number;
  /** Warm-up + transitions + cooldown minutes around the rotations (estimate of the rest of the session). */
  otherMinutes: number;
  /** Build a filler row (prescription for the block and week) for an id the session doesn't have yet. */
  rowFor: (id: string, role: ProgramExercise['role'], reps?: string) => ProgramExercise;
};

export type Compiled = { exercises: ProgramExercise[]; rotation: RotationBlock[]; fitLog: string[] };

const rankRole: Record<string, number> = { power: 0, main: 1, secondary: 2, accessory: 3, core: 4, care: 5, mobility: 6 };

/** §2b: compile a generated weight-room day. Rows other than the rotations (cooldown) are kept by the caller. */
export function compileDay(session: Session, opts: CompileOpts): Compiled {
  const rows = session.exercises.filter((r) => r.group !== 'CD');
  const layout = COMPILED.find((l) => l.name === session.name && l.rotations.every((r) => rows.some((x) => x.exerciseId === r.ids[0])));
  const plan = layout ? fromLayout(layout, rows, opts) : generic(rows, opts);
  return fit(fillPositions(plan, rows, opts), opts);
}

type Draft = { letter: string; items: { row: ProgramExercise | null; spot?: boolean }[]; rotationSec?: number; rounds?: number; fixedTime?: boolean };

/** A §2c table: same exercises, rotations, positions and rotation times; each slot on its room-fitting rung. */
function fromLayout(layout: Layout, rows: ProgramExercise[], opts: CompileOpts): Draft[] {
  const used = new Set<string>();
  return layout.rotations.map((rot, k) => {
    const items = rot.ids.map((id) => {
      if (id === 'SPOT') return { row: null, spot: true };
      const have = rows.find((r) => r.exerciseId === id);
      const role = have?.role ?? (getExercise(id).category === 'core' ? 'core' : 'care');
      const row = have ?? opts.rowFor(id, role, TABLE_REPS[id]);
      used.add(id);
      return { row };
    });
    return { letter: LETTERS[k], items: roomItems(items, opts.equipment), rotationSec: rot.rotationSec, rounds: rot.rounds, fixedTime: true };
  });
}

/** Switch each item to the room's rung; a spot stays only after barbell squat/bench; drop what the room can't do. */
function roomItems(items: Draft['items'], equipment: Equipment[]): Draft['items'] {
  const out: Draft['items'] = [];
  for (const it of items) {
    if (it.spot) {
      const lift = out[0]?.row ? getExercise(out[0].row.exerciseId) : null;
      if (lift && needsSpot(lift)) out.push(it);
      continue;
    }
    const id = roomRung(it.row!.exerciseId, equipment);
    if (!id) continue;
    out.push({ row: id === it.row!.exerciseId ? it.row : { ...it.row!, exerciseId: id } });
  }
  return out;
}

/** §2b steps 1–5 for a template without a compiled table. */
function generic(rows0: ProgramExercise[], opts: CompileOpts): Draft[] {
  const rows = rows0
    .map((r) => {
      const id = roomRung(r.exerciseId, opts.equipment);
      return id ? (id === r.exerciseId ? r : { ...r, exerciseId: id }) : null;
    })
    .filter((r): r is ProgramExercise => !!r);
  const role = (r: ProgramExercise) => r.role ?? 'accessory';
  const R: ProgramExercise[][] = [rows.filter((r) => role(r) === 'power'), rows.filter((r) => role(r) === 'main'), rows.filter((r) => role(r) === 'secondary' || role(r) === 'accessory')];
  // No main lift: the first secondary leads R2.
  if (!R[1].length && R[2].length) R[1].push(R[2].shift()!);
  const cap = (k: number) => (void k, opts.groupSize === 3 ? 3 : 4);
  // Step 3: one rack and one bar per rotation; the lower-priority item moves to another rotation where they're free, else
  // switches down its own ladder to the nearest non-rack rung.
  const ex = (r: ProgramExercise) => getExercise(r.exerciseId);
  const counts = (list: ProgramExercise[]) => ({ rack: list.filter((r) => rackOf(ex(r))).length, bar: list.filter((r) => barOf(ex(r))).length });
  for (let k = 0; k < 3; k++) {
    let guard = 10;
    while (guard-- > 0) {
      const c = counts(R[k]);
      if (c.rack <= 1 && c.bar <= 1) break;
      const clash = [...R[k]].reverse().find((r) => (c.rack > 1 && rackOf(ex(r))) || (c.bar > 1 && barOf(ex(r))))!;
      R[k] = R[k].filter((r) => r !== clash);
      const target = [2, 0, 1].find((j) => j !== k && R[j].length < cap(j) && (!rackOf(ex(clash)) || counts(R[j]).rack === 0) && (!barOf(ex(clash)) || counts(R[j]).bar === 0));
      if (target != null) R[target].push(clash);
      else {
        const sw = nonRackRung(clash.exerciseId, opts.equipment, barOf(ex(clash)) && c.bar > 1);
        if (sw) R[k].push({ ...clash, exerciseId: sw });
      }
    }
  }
  // Step 2: more items than positions → the lowest-priority item moves to R3 or drops (D, then E).
  for (let k = 0; k < 2; k++) {
    const room = cap(k) - (R[k][0] && needsSpot(ex(R[k][0])) ? 1 : 0);
    while (R[k].length > room) {
      const last = R[k].pop()!;
      if (R[2].length < cap(2) && (!rackOf(ex(last)) || !counts(R[2]).rack) && (!barOf(ex(last)) || !counts(R[2]).bar)) R[2].push(last);
    }
  }
  return R.map((list, k) => {
    // Rack lift first (the rack item, else the barbell item, else the heaviest tier).
    const tierRank = (r: ProgramExercise) => ({ A: 0, P: 1, B: 2, C: 3, D: 4 })[tierOf(ex(r), opts.equipment)];
    const lead = [...list].sort((a, b) => Number(rackOf(ex(b))) - Number(rackOf(ex(a))) || Number(barOf(ex(b))) - Number(barOf(ex(a))) || tierRank(a) - tierRank(b) || rankRole[a.role ?? 'accessory'] - rankRole[b.role ?? 'accessory'])[0];
    const rest = list.filter((r) => r !== lead);
    const items: Draft['items'] = lead ? [{ row: lead }] : [];
    if (lead && needsSpot(ex(lead))) items.push({ row: null, spot: true });
    for (const r of rest) items.push({ row: r });
    return { letter: LETTERS[k], items };
  });
}

/** Fillers when the room needs them (no bands, med balls…) or a rotation has fewer exercises than positions (§2b step 2). */
const FALLBACK_FILLERS = ['dead-bug', 'wall-slide', 'ytw', 'soleus-calf-raise', 'tib-raise', 'side-plank'];

/**
 * §2b step 2: positions = the rack group's size (3–5; 4 by default). A rotation with fewer exercises takes fillers from the
 * day's core/E pool (R2 first, then R3, then R1), then the standard filler pool. Step 5: the position before the rack lift
 * (the last one) is never same-muscle work.
 */
function fillPositions(drafts: Draft[], rows: ProgramExercise[], opts: CompileOpts): Draft[] {
  const want = opts.groupSize === 3 ? 3 : 4;
  const inUse = new Set(drafts.flatMap((d) => d.items.map((it) => it.row?.exerciseId).filter(Boolean) as string[]));
  const pool: ProgramExercise[] = rows.filter((r) => ['core', 'care', 'mobility'].includes(r.role ?? '') && !inUse.has(r.exerciseId));
  for (const id of FALLBACK_FILLERS) if (!pool.some((r) => r.exerciseId === id) && !inUse.has(id)) pool.push(opts.rowFor(id, getExercise(id).category === 'core' ? 'core' : 'care', TABLE_REPS[id]));
  const out = drafts.map((d) => ({ ...d, items: [...d.items] }));
  for (const k of [1, 2, 0]) {
    const d = out[k];
    if (!d || !d.items.length) continue;
    const lead = d.items[0].row ? getExercise(d.items[0].row.exerciseId) : null;
    // Groups of 3 (§2d): drop position 4 (the spotter stays).
    if (d.items.length > want) d.items = d.items.slice(0, want);
    while (d.items.length < want) {
      const idx = pool.findIndex((r) => {
        const id = roomRung(r.exerciseId, opts.equipment);
        return !!id && !inUse.has(id) && (!lead || !sameMuscles(lead, getExercise(id)));
      });
      if (idx < 0) break;
      const r = pool.splice(idx, 1)[0];
      const id = roomRung(r.exerciseId, opts.equipment)!;
      inUse.add(id);
      d.items.push({ row: { ...r, exerciseId: id } });
    }
    // (A §2c table keeps its positions as written: known conflict 7, Training's D4 items.)
    if (lead && d.items.length > 2 && !d.fixedTime) {
      const last = d.items.length - 1;
      if (d.items[last].row && sameMuscles(lead, getExercise(d.items[last].row!.exerciseId))) {
        const j = d.items.findIndex((it, i) => i > 0 && i < last && !it.spot && it.row && !sameMuscles(lead, getExercise(it.row.exerciseId)));
        if (j > 0) [d.items[j], d.items[last]] = [d.items[last], d.items[j]];
        else {
          // No other position can go there: a filler that isn't same-muscle work takes the place.
          const idx = pool.findIndex((r) => {
            const id = roomRung(r.exerciseId, opts.equipment);
            return !!id && !inUse.has(id) && !sameMuscles(lead, getExercise(id));
          });
          if (idx >= 0) {
            const r = pool.splice(idx, 1)[0];
            const id = roomRung(r.exerciseId, opts.equipment)!;
            inUse.add(id);
            d.items[last] = { row: { ...r, exerciseId: id } };
          }
        }
      }
    }
  }
  return out;
}

/** Steps 6–8: rotation time, rounds, build-up round; then fit by rounds (never below 3 for the main lift), then fillers. */
function fit(drafts: Draft[], opts: CompileOpts): Compiled {
  const blocks: { letter: string; rows: ProgramExercise[]; block: RotationBlock }[] = [];
  for (const d of drafts) {
    // Groups of 3 (§2d): drop position 4 (the spotter stays).
    const items = d.items.filter((it) => it.row || it.spot).slice(0, opts.groupSize === 3 ? 3 : 4);
    if (!items.length) continue;
    const lead = items[0].row ? getExercise(items[0].row.exerciseId) : null;
    const positions: RotationPosition[] = items.map((it) =>
      it.spot ? SPOT : { kind: 'exercise', exerciseId: it.row!.exerciseId, reps: it.row!.reps, usesRack: it === items[0] },
    );
    const leadRow = items[0].row;
    let rotationSec = d.fixedTime && d.rotationSec ? d.rotationSec : Math.max(30, r15(Math.max(15, ...positions.map((p) => positionWorkSec(p, leadRow?.reps))) + 20));
    const floor = lead ? REST_FLOOR[tierOf(lead, opts.equipment)] ?? 0 : 0;
    while (rotationSec * Math.max(1, positions.length - 1) < floor) rotationSec += 15;
    const rounds = d.rounds ?? Math.max(2, leadRow?.sets ?? 3);
    // Step 7: round 1 is the build-up round for tier A and Olympic lifts.
    const buildUpRound = !!lead && (tierOf(lead, opts.equipment) === 'A' || lead.pattern === 'olympic');
    blocks.push({
      letter: d.letter,
      rows: items.filter((it) => it.row).map((it) => ({ ...it.row!, group: d.letter, autoGroup: undefined, filler: undefined })),
      block: { group: d.letter, positions, rotationSec, rounds, buildUpRound },
    });
  }
  // §2b step 8 / D-068.4: drop rounds (R3, then R1, then R2; never below 3 for the main lift counting the build-up round), then
  // the lowest-priority filler. Rest is never shortened. Each fit is a fitLog line (undo as today).
  const fitLog: string[] = [];
  const minutes = () => opts.otherMinutes + blocks.reduce((n, b) => n + (b.block.rotationSec * b.block.positions.length * b.block.rounds) / 60, 0) + Math.max(0, blocks.length - 1);
  const minRounds = (b: (typeof blocks)[number]) => (b.letter === 'B' ? 3 : 2);
  const from: Record<string, number> = Object.fromEntries(blocks.map((b) => [b.letter, b.block.rounds]));
  let guard = 50;
  while (minutes() > opts.targetMinutes && guard-- > 0) {
    const b = ['C', 'A', 'B'].map((l) => blocks.find((x) => x.letter === l)).find((x) => x && x.block.rounds > minRounds(x));
    if (b) {
      b.block = { ...b.block, rounds: b.block.rounds - 1 };
      continue;
    }
    // Then the lowest-priority filler (the last non-lead position of R3, then R1).
    const fb = ['C', 'A'].map((l) => blocks.find((x) => x.letter === l)).find((x) => x && x.block.positions.filter((p) => p.kind === 'exercise').length > 2);
    if (!fb) break;
    const idx = fb.block.positions.map((p, i) => (p.kind === 'exercise' && i > 0 ? i : -1)).filter((i) => i >= 0).pop()!;
    const id = fb.block.positions[idx].exerciseId!;
    fb.block = { ...fb.block, positions: fb.block.positions.filter((_, i) => i !== idx) };
    fb.rows = fb.rows.filter((r) => r.exerciseId !== id);
    fitLog.push(`${fb.letter}: dropped ${getExercise(id).name}.`);
  }
  for (const b of blocks) {
    if (b.block.rounds < from[b.letter]) fitLog.unshift(`${b.letter}: ${from[b.letter]} → ${b.block.rounds} rounds${b.block.buildUpRound ? ' (build-up round kept)' : ''}.`);
  }
  fitLog.sort((a, b) => a.localeCompare(b));
  return { exercises: blocks.flatMap((b) => b.rows), rotation: blocks.map((b) => b.block), fitLog };
}

/** Rack-lift rest for a rotation block: rotation time × (positions − 1). */
export const rackRest = (b: Pick<RotationBlock, 'rotationSec' | 'positions'>) => b.rotationSec * Math.max(1, b.positions.length - 1);
