import { runState, type StationRun } from './stations';
import type { RotationBlock, Session } from './types';

/**
 * 2.4.0 rack rotation clock (program-design §4b; F55): the existing station-run row drives it (rotate_at; one clock for the
 * room). A rotation tick = one rotation; a round = every position once. `sessionId` carries `<session id>#<block letter>`.
 */
export function rotationRun(teamId: string, day: string, session: Session, block: RotationBlock, now: number): StationRun {
  return {
    teamId,
    day,
    sessionId: `${session.id}#${block.group}`,
    round: 0,
    rounds: Math.max(1, block.positions.length * block.rounds),
    stationSec: block.rotationSec,
    transitionSec: 0,
    rotateAt: new Date(now + block.rotationSec * 1000).toISOString(),
    endedAt: null,
  };
}

export type RotationNow = { block: RotationBlock; tick: number; round: number; secondsLeft: number; done: boolean };

/** Where the room is: the block, rotation tick (0-based), round, and seconds to the next rotation. */
export function rotationState(run: StationRun, session: Session, now: number): RotationNow | null {
  const group = run.sessionId.split('#')[1];
  const block = (session.rotation ?? []).find((b) => b.group === group);
  if (!block) return null;
  const st = runState(run, now);
  const n = Math.max(1, block.positions.length);
  const done = st.phase === 'done' || !!run.endedAt;
  const tick = Math.min(st.round, block.rounds * n - 1);
  return { block, tick, round: Math.floor(tick / n), secondsLeft: st.secondsLeft, done };
}
