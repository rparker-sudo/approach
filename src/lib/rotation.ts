import { getExercise } from './exercises';
import { blocksOf } from './groups';
import { REST_FLOOR, tierOf, topReps } from './rest';
import type { Equipment, Exercise, ProgramExercise, RotationBlock, RotationPosition, Session } from './types';
import { blockOf } from './warmup';

/**
 * 2.4.0 rack rotation (program-design §4b; flag rackRotation). Pure functions; no React.
 * A group of 3–5 athletes shares one rack. Each block is a rotation of positions; everyone starts at a different position
 * and moves on one shared clock. Approach Strength's suggestions follow rules 1–9; coaches can change anything.
 */

export const SPOT_LABEL = 'Spot'; // Legal V3 (CLAUDE.md known conflict 4): never "Spot and coach" in user-facing text.
export const NOT_FOR_SESSION = 'Rack rotation is for weight-room sessions with racks.';

/** Needs the rack (or its pull-up bar): barbell lifts and bar pulls. */
export function usesRack(ex: Exercise): boolean {
  const needs = ex.equipment.every((s) => s.includes('barbell') || s.includes('pullup-bar') || s.includes('trap-bar') || s.includes('ssb'));
  return needs && ex.equipment.length > 0 && ex.equipment[0].length > 0;
}

const LOWER = new Set(['squat', 'hinge', 'single-leg', 'knee-ext', 'knee-flex', 'olympic', 'jump']);
const UPPER = new Set(['h-push', 'v-push', 'h-pull', 'v-pull', 'arm-flex', 'arm-ext', 'shoulder-iso']);
const region = (ex: Exercise) => (LOWER.has(ex.pattern) ? 'lower' : UPPER.has(ex.pattern) ? 'upper' : ex.category === 'core' ? 'core' : 'other');
/** Rule 3: the position right before the rack lift never tires the same muscles. */
export function sameMuscles(rack: Exercise, other: Exercise): boolean {
  const r = region(rack);
  if (r === 'other' || r === 'core') return false;
  if (r === 'lower') return region(other) === 'lower' || other.pattern === 'knee-care' || /wall-sit|spanish|lunge/.test(other.id);
  return region(other) === 'upper' && (other.pattern === rack.pattern || (rack.pattern.startsWith('h-push') && other.pattern === 'v-push'));
}

/** Work seconds at one position (rest-and-supersets §5): ~3 s per rep ("each" doubles; Y-T-W counts 3 shapes), 40 s holds. */
export function positionWorkSec(p: RotationPosition, rackReps?: string): number {
  if (p.kind === 'spot') return rackReps ? positionWorkSec({ kind: 'exercise', reps: rackReps, usesRack: true }) : 20;
  const ex = p.exerciseId ? getExercise(p.exerciseId) : undefined;
  const reps = p.reps;
  const hold = reps.match(/(\d+)\s*s/);
  if (hold) return Number(hold[1]) * (/each/i.test(reps) ? 2 : 1);
  const top = topReps(reps);
  if (top == null) return 40;
  const sides = /each/i.test(reps) ? (ex?.id === 'ytw' ? 3 : 2) : 1;
  return top * 3 * sides;
}

const r15 = (n: number) => Math.round(n / 15) * 15;

/** Rule 5: rotation time = longest position + about 20 s, rounded to 15 s. */
export function rotationTimeFor(positions: RotationPosition[]): number {
  const rack = positions.find((p) => p.usesRack && p.kind === 'exercise');
  const longest = Math.max(15, ...positions.map((p) => positionWorkSec(p, rack?.reps)));
  return Math.max(30, r15(longest + 20));
}

/** Rest each position gets before you're back at it: rotation time × (positions − 1). */
export const restPerPosition = (b: Pick<RotationBlock, 'rotationSec' | 'positions'>) => b.rotationSec * Math.max(0, b.positions.length - 1);
/** Rule 9: block time = rotation time × positions × rounds (minutes), plus 1 min between blocks (added by the caller). */
export const blockMinutes = (b: Pick<RotationBlock, 'rotationSec' | 'positions' | 'rounds'>) => (b.rotationSec * b.positions.length * b.rounds) / 60;

/**
 * Suggest a rotation for one block's rows (rules 1–7). `generated` raises the rotation time until the rack lift's rest meets
 * the tier floors (Approach Strength's sessions); a coach's suggestion shows the same numbers but never blocks.
 */
export function suggestRotation(group: string, rows: ProgramExercise[], ctx: { equipment?: Equipment[]; generated?: boolean; athletes?: number } = {}): RotationBlock {
  const exs = rows.map((r) => getExercise(r.exerciseId));
  // Rule 1: one rack position (the heaviest tier among rack exercises), first.
  const rank = (e: Exercise) => ({ A: 0, P: 1, B: 2, C: 3, D: 4 })[tierOf(e, ctx.equipment)];
  const rackIdx = exs.map((e, i) => (usesRack(e) ? i : -1)).filter((i) => i >= 0).sort((a, b) => rank(exs[a]) - rank(exs[b]))[0];
  const order = [...rows.keys()];
  if (rackIdx != null) {
    order.splice(order.indexOf(rackIdx), 1);
    order.unshift(rackIdx);
  }
  const rack = rackIdx != null ? exs[rackIdx] : null;
  // Rule 3: the last position (right before the rack lift) never tires the same muscles.
  if (rack && order.length > 2) {
    const last = order[order.length - 1];
    if (sameMuscles(rack, exs[last])) {
      const k = order.slice(1, -1).findIndex((i) => !sameMuscles(rack, exs[i]));
      if (k >= 0) [order[k + 1], order[order.length - 1]] = [order[order.length - 1], order[k + 1]];
    }
  }
  const positions: RotationPosition[] = order.map((i) => ({ kind: 'exercise', exerciseId: rows[i].exerciseId, reps: rows[i].reps, usesRack: i === rackIdx }));
  // Rule 2: a spotter right after barbell squat or bench at RPE 7+.
  const rackRow = rackIdx != null ? rows[rackIdx] : null;
  const rpe = Number(rackRow?.effort.match(/RPE\s*(\d+)/i)?.[1] ?? 0);
  if (rack && rackRow && (rack.pattern === 'squat' || (rack.pattern === 'h-push' && rack.equipment.some((s) => s.includes('barbell')))) && rpe >= 7 && rack.equipment.some((s) => s.includes('barbell') || s.includes('ssb'))) {
    positions.splice(1, 0, { kind: 'spot', reps: '', usesRack: false });
  }
  // Rule 7: positions ≥ athletes (5 athletes share a non-rack position; 3 leave one empty).
  let rotationSec = rotationTimeFor(positions);
  // Rule 5 (generated only): the rack lift's rest meets the floors; if not, the rotation time goes up.
  if (ctx.generated && rack) {
    const floor = REST_FLOOR[tierOf(rack, ctx.equipment)] ?? 0;
    while (rotationSec * Math.max(1, positions.length - 1) < floor) rotationSec += 15;
  }
  // Rule 6: rounds = the rack lift's sets; a build-up round first for tier A or P.
  const buildUpRound = !!rack && ['A', 'P'].includes(tierOf(rack, ctx.equipment));
  const sets = rackRow?.sets ?? Math.max(...rows.map((r) => r.sets));
  return { group, positions, rotationSec, rounds: sets + (buildUpRound ? 1 : 0), buildUpRound };
}

/** Suggestions for every block of a session (ungrouped rows become their own block letters). */
export function suggestSessionRotation(session: Session, ctx: { equipment?: Equipment[]; generated?: boolean } = {}): { exercises: ProgramExercise[]; rotation: RotationBlock[] } {
  // Ungrouped rows join their v3 block (power → A, main → B, secondary → C, accessory/core → D, care → E; spec §1.4
  // mapping) so a 2.3.0 session becomes A/B/C… rotations; anything else gets its own letter.
  const used = new Set(session.exercises.map((x) => x.group).filter(Boolean));
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').filter((c) => !used.has(c));
  const byBlock = new Map<string, string>();
  const exercises = session.exercises.map((pe) => {
    if (pe.group) return pe;
    const b = blockOf(pe);
    if (b && !used.has(b)) {
      if (!byBlock.has(b)) byBlock.set(b, b);
      return { ...pe, group: b };
    }
    return { ...pe, group: letters.shift() ?? 'Z' };
  });
  const rotation = [...blocksOf(exercises).entries()].map(([g, idx]) => suggestRotation(g, idx.map((i) => exercises[i]), ctx));
  return { exercises, rotation };
}

/**
 * Rule 7 stagger: athlete k (their order in the rack group) starts at position k. With more athletes than positions, the
 * extra athlete shares the last non-rack, non-spot position. No two athletes share otherwise.
 */
export function startPosition(k: number, block: Pick<RotationBlock, 'positions'>): number {
  const n = block.positions.length;
  if (k < n) return k;
  const shared = [...block.positions.keys()].reverse().find((i) => !block.positions[i].usesRack && block.positions[i].kind !== 'spot');
  return shared ?? n - 1;
}

/** Position after `tick` rotations on the shared clock. */
export const positionAt = (k: number, tick: number, block: Pick<RotationBlock, 'positions'>) => (startPosition(k, block) + tick) % block.positions.length;

/** Display name of a position (the athlete's own version when given). */
export function positionName(p: RotationPosition, resolvedName?: string): string {
  if (p.kind === 'spot') return SPOT_LABEL;
  return resolvedName ?? (p.exerciseId ? getExercise(p.exerciseId).name : '');
}

/** Total rotation minutes for a session's rotation blocks (+1 min between blocks), for the §4a estimate. */
export function rotationMinutes(rotation: RotationBlock[]): number {
  if (!rotation.length) return 0;
  return rotation.reduce((n, b) => n + blockMinutes(b), 0) + Math.max(0, rotation.length - 1);
}

/** Session format check: rack rotation needs a weight-room session (not home, light home, recovery). */
export const rotationAllowed = (s: Session) => s.location !== 'home' && !s.light && !s.mobility;
