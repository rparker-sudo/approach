import { getExercise } from './exercises';
import { blockRests, blocksOf, isLegHeavy, straightRests } from './groups';
import { estimateMinutes, RestContext, tierOf } from './rest';
import type { Equipment, ProgramExercise, Session, Station } from './types';
import { uid } from './util';

/**
 * Rack-group station rotation (circuits-and-stations.md Part 2, spec 3.4). Pure functions; no React.
 * Part 1 (together): warm-up, every tier P exercise and the main tier A lift. Part 2: 2–6 stations, one block each.
 */

export const STATION_TRANSITION_SEC = 60;
export const PART1_REASON = 'Power and heavy lifts are done in Part 1, fresh, so no group does them tired at the end.';
export const NOT_HERE = 'Stations are for weight-room sessions with rack groups.';
export const NAME_HELPER = "Name stations after equipment, like 'DB bench.'";

/** Must stay in Part 1 for a team with a minor: tier P, and the main tier A lift. */
export function mustBePart1(pe: ProgramExercise, equipment?: Equipment[]): boolean {
  const t = tierOf(getExercise(pe.exerciseId), equipment);
  return t === 'P' || (t === 'A' && pe.role === 'main');
}

/** Stations format is offered for school sessions only (not home, light home, extra recovery, or load tests). */
export function stationsAllowed(session: Session): boolean {
  return session.location !== 'home' && !session.light && !session.mobility;
}

/** Blocks a session can split into: group letters, plus a one-letter block for each ungrouped exercise. */
export function withBlockLetters(list: ProgramExercise[]): ProgramExercise[] {
  const used = new Set(list.map((x) => x.group).filter(Boolean));
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').filter((c) => !used.has(c));
  return list.map((pe) => (pe.group ? pe : { ...pe, group: letters.shift() ?? 'Z' }));
}

/** Default stations: each Part 2 block (everything except Part 1 items) becomes a station, up to `count`. */
export function defaultStations(session: Session, count: number, equipment?: Equipment[]): { exercises: ProgramExercise[]; stations: Station[] } {
  const exercises = withBlockLetters(session.exercises);
  const blocks = [...blocksOf(exercises).entries()].filter(([, idx]) => idx.every((i) => !mustBePart1(exercises[i], equipment)));
  const n = Math.max(2, Math.min(6, count || blocks.length));
  const stations: Station[] = Array.from({ length: Math.min(n, blocks.length) }, (_, k) => ({ id: uid(), name: '', groups: [], minutes: 0, autoMinutes: true }));
  // One block per station; extra blocks stay in Part 1 order (the coach can move them).
  blocks.slice(0, stations.length).forEach(([g], k) => stations[k].groups.push(g));
  const timed = stations.map((st) => ({ ...st, minutes: stationMinutes(exercises, st, { equipment }) }));
  return { exercises, stations: suggestOrder(exercises, timed, equipment) };
}

/** Minutes a station needs: its block's sets × (work + rest) with floors, rounded up to a whole minute. */
export function stationMinutes(list: ProgramExercise[], st: Station, ctx: RestContext = {}): number {
  const idx = list.map((pe, i) => (pe.group && st.groups.includes(pe.group) ? i : -1)).filter((i) => i >= 0);
  if (!idx.length) return 1;
  const sub = idx.map((i) => list[i]);
  const rests = blockRests(sub, straightRests(sub, ctx), ctx);
  // estimateMinutes adds an 8 min warm-up; take it back out for a single station.
  const sec = (estimateMinutes(sub.map((pe, k) => ({ ex: getExercise(pe.exerciseId), sets: pe.sets, reps: pe.reps, restSec: rests[k] }))) - 8) * 60;
  return Math.max(1, Math.ceil(sec / 60));
}

export const stationTime = (list: ProgramExercise[], stations: Station[], ctx: RestContext = {}) =>
  Math.max(1, ...stations.map((st) => (st.autoMinutes === false ? st.minutes : stationMinutes(list, st, ctx))));

const legHeavy = (list: ProgramExercise[], st: Station, equipment?: Equipment[]) =>
  list.some((pe) => pe.group && st.groups.includes(pe.group) && isLegHeavy(getExercise(pe.exerciseId), equipment));
const upper = (list: ProgramExercise[], st: Station) => list.some((pe) => pe.group && st.groups.includes(pe.group) && getExercise(pe.exerciseId).category === 'upper');

/** Alternate lower / upper / core so no two leg-heavy stations are next to each other (including last → first). */
export function suggestOrder(list: ProgramExercise[], stations: Station[], equipment?: Equipment[]): Station[] {
  const legs = stations.filter((s) => legHeavy(list, s, equipment));
  const ups = stations.filter((s) => !legHeavy(list, s, equipment) && upper(list, s));
  const other = stations.filter((s) => !legHeavy(list, s, equipment) && !upper(list, s));
  const fillers = [...ups, ...other];
  const out: Station[] = [];
  while (legs.length || fillers.length) {
    if (legs.length) out.push(legs.shift()!);
    if (fillers.length) out.push(fillers.shift()!);
  }
  return out;
}

export type StationCheck = { tone: 'ok' | 'warn' | 'block'; text: string; stationIndex?: number };

/** F28c checks shown under the stations. */
export function stationChecks(list: ProgramExercise[], stations: Station[], racks: number, ctx: RestContext = {}, hasMinor = true): StationCheck[] {
  const out: StationCheck[] = [];
  const n = stations.length;
  if (n === racks) out.push({ tone: 'ok', text: `${n} stations · ${racks} racks ✓` });
  else if (n > racks) out.push({ tone: 'warn', text: `${n} stations, ${racks} racks. One station sits empty each round.` });
  else out.push({ tone: 'block', text: `${racks} racks, ${n} stations. Add a station or merge two racks.` });
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    if (n > 1 && i !== j && legHeavy(list, stations[i], ctx.equipment) && legHeavy(list, stations[j], ctx.equipment)) {
      out.push({ tone: 'warn', text: `Stations ${i + 1} and ${j + 1} are both leg-heavy, so groups do them back to back.` });
    }
  }
  stations.forEach((st, i) => {
    const need = stationMinutes(list, st, ctx);
    if (st.autoMinutes === false && st.minutes < need) out.push({ tone: 'warn', text: `Station ${i + 1} needs about ${need} min. Add time or cut a set.`, stationIndex: i });
    if (!st.name.trim()) out.push({ tone: 'block', text: `Station ${i + 1} needs a name.`, stationIndex: i });
    if (!st.groups.length) out.push({ tone: 'block', text: `Station ${i + 1} has no exercises.`, stationIndex: i });
  });
  const part1Bad = list.some((pe) => pe.group && stations.some((st) => st.groups.includes(pe.group!)) && mustBePart1(pe, ctx.equipment));
  if (part1Bad) out.push({ tone: hasMinor ? 'block' : 'warn', text: PART1_REASON });
  return out;
}

/** F28d: "Part 1 · 15 min + 4 stations × (8 + 1) min + Finish 0 min = about 56 min". */
export function stationsEstimate(list: ProgramExercise[], stations: Station[], ctx: RestContext = {}): { part1: number; per: number; total: number } {
  const inStation = new Set(stations.flatMap((s) => s.groups));
  const p1 = list.filter((pe) => !pe.group || !inStation.has(pe.group));
  const rests = blockRests(p1, straightRests(p1, ctx), ctx);
  const part1 = estimateMinutes(p1.map((pe, k) => ({ ex: getExercise(pe.exerciseId), sets: pe.sets, reps: pe.reps, restSec: rests[k] })));
  const per = stationTime(list, stations, ctx);
  return { part1, per, total: part1 + stations.length * (per + STATION_TRANSITION_SEC / 60) };
}

/** Rack k (0-based, rack sort order) is at station (k + round) mod n in a 0-based round. */
export const stationFor = (rackIndex: number, round: number, n: number) => (n ? (((rackIndex + round) % n) + n) % n : 0);

/** Shared rotation state (station_runs row). */
export type StationRun = {
  teamId: string;
  day: string;
  sessionId: string;
  round: number; // 0-based round when rotate_at was set
  rounds: number;
  stationSec: number;
  transitionSec: number;
  rotateAt: string; // end of the current round's station time
  endedAt?: string | null;
};

/**
 * Where everyone is now, from the shared row and the clock (works offline from the last rotate_at).
 * After rotate_at: a transition, then the next round runs for stationSec; rounds advance on their own.
 */
export function runState(run: StationRun, now: number): { round: number; phase: 'station' | 'transition' | 'done'; secondsLeft: number; rotateAt: number } {
  const t0 = new Date(run.rotateAt).getTime();
  if (run.endedAt) return { round: run.rounds, phase: 'done', secondsLeft: 0, rotateAt: t0 };
  if (now < t0) return { round: run.round, phase: 'station', secondsLeft: Math.ceil((t0 - now) / 1000), rotateAt: t0 };
  if (run.round + 1 >= run.rounds) return { round: run.rounds, phase: 'done', secondsLeft: 0, rotateAt: t0 };
  const trans = run.transitionSec * 1000;
  const cycle = trans + run.stationSec * 1000;
  const since = now - t0;
  const k = Math.floor(since / cycle);
  const into = since - k * cycle;
  const round = run.round + 1 + k;
  if (round >= run.rounds) return { round: run.rounds, phase: 'done', secondsLeft: 0, rotateAt: t0 + k * cycle };
  if (into < trans) return { round, phase: 'transition', secondsLeft: Math.ceil((trans - into) / 1000), rotateAt: t0 + k * cycle + cycle };
  const end = t0 + k * cycle + cycle;
  return { round, phase: 'station', secondsLeft: Math.ceil((end - now) / 1000), rotateAt: end };
}
