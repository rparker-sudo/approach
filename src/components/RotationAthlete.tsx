import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { backend } from '../lib/backend';
import type { MyRack } from '../lib/backend/types';
import { dateKey, today } from '../lib/calendar';
import { getExercise } from '../lib/exercises';
import { FLAGS } from '../lib/flags';
import type { ResolvedExercise } from '../lib/resolve';
import { positionAt, positionName, SPOT_LABEL, startPosition } from '../lib/rotation';
import { rotationState, type RotationNow } from '../lib/rotationRun';
import { CoachingNote } from './Coaching';
import { isGeneratedLine, noteLines } from '../lib/coaching';
import type { StationRun } from '../lib/stations';
import type { RotationBlock, Session } from '../lib/types';
import { Card, colors, Text } from './ui';

/** The athlete's own version of a position (their rung of the written exercise). */
export function myPositionName(block: RotationBlock, i: number, exercises: ResolvedExercise[]): string {
  const p = block.positions[i];
  if (!p) return '';
  if (p.kind === 'spot') return SPOT_LABEL;
  const mine = exercises.find((e) => e.group === block.group && (e.teamExerciseId ?? e.exerciseId) === p.exerciseId);
  return positionName(p, mine ? getExercise(mine.exerciseId).name : undefined);
}

/** Live: my rack, the shared run, and the clock (polls every 5 s; the countdown runs locally from rotate_at). */
export function useRotation(teamId: string | undefined, session: Session | undefined): { rack: MyRack | null; run: StationRun | null; now: number; state: RotationNow | null } {
  const [rack, setRack] = useState<MyRack | null>(null);
  const [run, setRun] = useState<StationRun | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const on = FLAGS.rackRotation && !!teamId && session?.format === 'rack_rotation';
  useEffect(() => {
    if (!on || !teamId) return;
    let alive = true;
    const poll = () => backend.getStationRun(teamId, dateKey(today())).then((r) => alive && setRun(r)).catch(() => {});
    backend.myRack(teamId).then((r) => alive && setRack(r)).catch(() => {});
    poll();
    const p = setInterval(poll, 5000);
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      alive = false;
      clearInterval(p);
      clearInterval(t);
    };
  }, [on, teamId]);
  const state = on && session && run && run.sessionId.startsWith(`${session.id}#`) ? rotationState(run, session, now) : null;
  return { rack, run, now, state };
}

/** F54 Today card: "Rack 2 · Rack rotation" and one start line per block. */
export function RotationToday({ session, rack, exercises }: { session: Session; rack: MyRack | null; exercises: ResolvedExercise[] }) {
  if (!FLAGS.rackRotation || session.format !== 'rack_rotation') return null;
  if (!rack) return <Text style={{ fontSize: 13, color: colors.muted }}>You&apos;re not on a rack today. Follow the standard order.</Text>;
  const k = rack.myIndex ?? 0;
  return (
    <Card style={{ gap: 4 }}>
      <Text style={{ fontSize: 15, fontWeight: '700' }}>{`${rack.rackName} · Rack rotation`}</Text>
      {(session.rotation ?? []).map((b) => {
        const s = startPosition(k, b);
        return <Text key={b.group} style={{ fontSize: 14 }}>{`${b.group} · You start at Position ${s + 1} (${myPositionName(b, s, exercises)})`}</Text>;
      })}
    </Card>
  );
}

/**
 * F54 workout header during a block: "Rack 2 · B · Round 2 of 4" (+ "· Build-up"), the current position, and the shared
 * countdown "Rotate in 0:42 → Position 4 (Dead Bug)". A spot position: "Spot the next lifter." (partner names stay off
 * until the rack-names flag is on).
 */
export function RotationNowCard({ rack, state, exercises }: { rack: MyRack | null; state: RotationNow | null; exercises: ResolvedExercise[] }) {
  if (!rack || !state || state.done) return null;
  const b = state.block;
  const k = rack.myIndex ?? 0;
  const pos = positionAt(k, state.tick, b);
  const next = positionAt(k, state.tick + 1, b);
  const clock = `${Math.floor(state.secondsLeft / 60)}:${String(state.secondsLeft % 60).padStart(2, '0')}`;
  const spot = b.positions[pos]?.kind === 'spot';
  const lastTick = state.tick + 1 >= b.rounds * b.positions.length;
  return (
    <View style={{ gap: 4 }}>
      <Text style={{ fontSize: 13, color: colors.muted }}>{`${rack.rackName} · ${b.group} · Round ${state.round + 1} of ${b.rounds}${b.buildUpRound && state.round === 0 ? ' · Build-up' : ''}`}</Text>
      <Text style={{ fontSize: 20, fontWeight: '700' }}>{`Position ${pos + 1} · ${myPositionName(b, pos, exercises)}${b.positions[pos]?.reps ? ` × ${b.positions[pos].reps}` : ''}`}</Text>
      {spot ? <Text style={{ fontSize: 14 }}>Spot the next lifter. Nothing to log.</Text> : null}
      {/* 2.4.2 F62c: the cue (16 pt ink) and week note (13 pt muted) for this position. Spot positions have none. */}
      {!spot && FLAGS.plannerV3 ? (() => {
        const p = b.positions[pos];
        const pe = exercises.find((e) => e.group === b.group && (e.teamExerciseId ?? e.exerciseId) === p?.exerciseId);
        return pe?.notes && noteLines(pe.notes).some(isGeneratedLine) ? <CoachingNote notes={pe.notes} variant="athlete" /> : null;
      })() : null}
      <Text
        accessibilityLiveRegion="polite"
        accessibilityLabel={`Rotate in ${state.secondsLeft} seconds${lastTick ? '' : `, next Position ${next + 1}, ${myPositionName(b, next, exercises)}`}`}
        style={{ fontSize: 28, fontWeight: '700', fontVariant: ['tabular-nums'], minHeight: 48 }}
      >
        {lastTick ? `Block ends in ${clock}` : `Rotate in ${clock} → Position ${next + 1} (${myPositionName(b, next, exercises)})`}
      </Text>
      <Text style={{ fontSize: 13, color: colors.muted }}>{b.positions.map((_, i) => (i === pos ? `[${i + 1} You]` : `${i + 1}`)).join('  ')}</Text>
    </View>
  );
}

/** Today (F54): the rack rotation card with this athlete's start positions. */
export function RotationTodayLive({ teamId, session, exercises }: { teamId: string; session: Session; exercises: ResolvedExercise[] }) {
  const { rack } = useRotation(teamId, session);
  return <RotationToday session={session} rack={rack} exercises={exercises} />;
}
