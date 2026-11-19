import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import type { Team } from '../lib/backend';
import { backend, Rack } from '../lib/backend';
import { dateKey, planForDate, today } from '../lib/calendar';
import { showAlert } from '../lib/dialog';
import { autoAssign } from '../lib/racks';
import { stationTime, STATION_TRANSITION_SEC, runState, StationRun } from '../lib/stations';
import { useTeams } from '../lib/team';
import { isGeneral, scheduleFor, weekIndex } from '../lib/general';
import type { Session } from '../lib/types';
import { useTeamProgramFor } from './EffortBoard';
import { Banner, Button, Card, colors, Row, Text } from './ui';
import { FLAGS } from '../lib/flags';
import { rotationRun, rotationState } from '../lib/rotationRun';

/**
 * F29a: running a Stations session. "Start stations" is blocked until everyone in today's session is on a rack (with a
 * one-tap balanced fill that skips athletes following another team's program). After start: Round x of N, Rotate in
 * m:ss, Rotate now (asks once per session), +1 min, End stations.
 */
export default function StationControls({ team }: { team: Team }) {
  const t = useTeams();
  const programFor = useTeamProgramFor(team.id);
  const program = programFor(null);
  const day = dateKey(today());
  // 2.3.0: a general team's whole-team program follows its week view (no volleyball calendar).
  const general = isGeneral(team);
  const gw = program && general ? weekIndex(program, today()) : null;
  const plan = program && !general ? planForDate(program, today()) : null;
  const sessionId = general ? (program && gw != null ? scheduleFor(program, gw)[(today().getDay() + 6) % 7] : null) : plan?.sessionId;
  const session: Session | undefined = program?.sessions.find((s) => s.id === sessionId);
  const [run, setRun] = useState<StationRun | null>(null);
  const [racks, setRacks] = useState<Rack[]>([]);
  const [now, setNow] = useState(() => Date.now());
  const [busy, setBusy] = useState(false);
  const asked = useRef(false);
  const rotating = FLAGS.rackRotation && session?.format === 'rack_rotation' && (session.rotation?.length ?? 0) > 0 && session.location !== 'home';
  const on = (session?.format === 'stations' && (session.stations?.length ?? 0) > 0 && session.location !== 'home') || rotating;

  const teamId = team.id;
  const [reload, setReload] = useState(0);
  useEffect(() => {
    if (!on) return;
    let alive = true;
    Promise.all([backend.getStationRun(teamId, day), backend.listRacks(teamId)])
      .then(([r, rk]) => {
        if (!alive) return;
        setRun(r);
        setRacks(rk);
      })
      .catch(() => {});
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      alive = false;
      clearInterval(tick);
    };
  }, [on, teamId, day, reload, t.syncing]);

  if (!on || !session || !program) return null;
  if (rotating) return <RotationControls teamId={team.id} day={day} session={session} run={run} now={now} busy={busy} onSave={async (r) => {
    setBusy(true);
    try {
      await backend.saveStationRun(r);
      setRun(r);
    } catch (e) {
      showAlert("Couldn't update the rotation", e instanceof Error ? e.message : 'Try again.');
    } finally {
      setBusy(false);
    }
  }} />;
  const stations = session.stations!;
  const roster = (t.members[team.id] ?? []).filter((m) => !(t.coachExtras[team.id]?.followingOther ?? []).includes(m.userId));
  const placed = new Set(racks.flatMap((r) => r.userIds));
  const missing = roster.filter((m) => !placed.has(m.userId));
  const stationSec = stationTime(session.exercises, stations, { phase: program.phase, equipment: program.equipment }) * 60;
  const rs = run ? runState(run, now) : null;
  const tooManyRacks = racks.filter((r) => r.userIds.length).length > stations.length;

  async function save(next: StationRun) {
    setBusy(true);
    try {
      await backend.saveStationRun(next);
      setRun(next);
    } catch (e) {
      showAlert("Couldn't update stations", e instanceof Error ? e.message : 'Try again.');
    } finally {
      setBusy(false);
    }
  }

  async function fillRacks() {
    // Balanced auto-assign for the athletes who aren't on a rack, added to the existing racks.
    const base = racks.length ? racks.map((r) => ({ name: r.name, userIds: [...r.userIds] })) : stations.map((_, i) => ({ name: `Rack ${i + 1}`, userIds: [] as string[] }));
    const groups = autoAssign(
      missing.map((m) => ({ userId: m.userId, level: m.level ?? null, position: m.position ?? null, groupId: m.groupId ?? null })),
      base.length,
      'balanced',
    );
    // Smallest racks get the largest new groups so sizes stay even.
    const order = base.map((r, i) => ({ i, n: r.userIds.length })).sort((a, b) => a.n - b.n);
    groups.sort((a, b) => b.length - a.length).forEach((g, k) => base[order[k % order.length].i].userIds.push(...g.map((a) => a.userId)));
    setBusy(true);
    try {
      await backend.saveRacks(team.id, base);
      setReload((n) => n + 1);
      showAlert('Racks updated', `${missing.length} ${general ? 'client' : 'athlete'}${missing.length === 1 ? '' : 's'} added to racks.`);
    } catch (e) {
      showAlert("Couldn't update racks", e instanceof Error ? e.message : 'Try again.');
    } finally {
      setBusy(false);
    }
  }

  if (!run || run.endedAt) {
    return (
      <Card>
        <Text style={{ fontSize: 16, fontWeight: '700' }}>{`Today: ${session.name} · Stations`}</Text>
        {run?.endedAt ? <Text style={{ fontSize: 13, color: colors.muted }}>Stations ended.</Text> : null}
        {/* 2.4.0 F29a / F28c: never blocked; neutral information. */}
        {missing.length ? (
          <>
            <Text style={{ fontSize: 14, color: colors.ink }}>{`${missing.length} ${general ? 'client' : 'athlete'}${missing.length === 1 ? " isn't" : "s aren't"} on a rack. They'll follow the standard order.`}</Text>
            <Button kind="secondary" title="Add them to racks" disabled={busy} onPress={fillRacks} />
          </>
        ) : null}
        {tooManyRacks ? <Text style={{ fontSize: 13, color: colors.ink }}>{`${racks.filter((r) => r.userIds.length).length} racks, ${stations.length} stations. One rack has no station each round.`}</Text> : null}
        <Button
          title="Start stations"
          disabled={busy}
          onPress={() =>
            save({
              teamId: team.id,
              day,
              sessionId: session.id,
              round: 0,
              rounds: stations.length,
              stationSec,
              transitionSec: session.stationTransitionSec ?? STATION_TRANSITION_SEC,
              rotateAt: new Date(Date.now() + stationSec * 1000).toISOString(),
              endedAt: null,
            })
          }
        />
      </Card>
    );
  }

  const label =
    rs!.phase === 'done'
      ? 'Stations done.'
      : rs!.phase === 'transition'
        ? `Rotating… Move to your next station · ${Math.floor(rs!.secondsLeft / 60)}:${String(rs!.secondsLeft % 60).padStart(2, '0')}`
        : `Stations · Round ${rs!.round + 1} of ${run.rounds} · Rotate in ${Math.floor(rs!.secondsLeft / 60)}:${String(rs!.secondsLeft % 60).padStart(2, '0')}`;
  return (
    <View style={{ gap: 8 }}>
      <Banner>{label}</Banner>
      <Row style={{ gap: 8, flexWrap: 'wrap' }}>
        {rs!.phase === 'station' ? (
          <Button
            small
            title="Rotate now"
            disabled={busy}
            onPress={() => {
              // [UX proposal] F29a: asks once per session.
              const go = () => save({ ...run, round: rs!.round, rotateAt: new Date().toISOString() });
              if (asked.current) return void go();
              asked.current = true;
              showAlert('Move every group to its next station?', undefined, [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Rotate', onPress: () => void go() },
              ]);
            }}
          />
        ) : null}
        {rs!.phase === 'station' ? (
          <Button small kind="secondary" title="+1 min" disabled={busy} onPress={() => save({ ...run, round: rs!.round, rotateAt: new Date(rs!.rotateAt + 60000).toISOString() })} />
        ) : null}
        <Button small kind="ghost" title="End stations" disabled={busy} onPress={() => save({ ...run, endedAt: new Date().toISOString() })} />
      </Row>
    </View>
  );
}

/**
 * 2.4.0 F55a: rack rotation controls. One clock for the room (all racks start together): Start rotation (per block),
 * then "Rack rotation · B · Round 2 of 4 · Rotate in 0:42" with Rotate now (asks once), +15 s and End block.
 * Uses the existing station-run row (rotate_at); the block letter rides in its session id.
 */
function RotationControls({ teamId, day, session, run, now, busy, onSave }: { teamId: string; day: string; session: Session; run: StationRun | null; now: number; busy: boolean; onSave: (r: StationRun) => Promise<void> }) {
  const asked = useRef(false);
  const blocks = session.rotation ?? [];
  const st = run && run.sessionId.startsWith(`${session.id}#`) ? rotationState(run, session, now) : null;
  const nextIdx = st ? (st.done ? blocks.findIndex((b) => b.group === st.block.group) + 1 : -1) : 0;
  const clock = (sec: number) => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
  if (!st || st.done) {
    const b = blocks[nextIdx];
    return (
      <Card>
        <Text style={{ fontSize: 16, fontWeight: '700' }}>{`Today: ${session.name} · Rack rotation`}</Text>
        {st?.done ? <Text style={{ fontSize: 13, color: colors.muted }}>{`Block ${st.block.group} done.`}</Text> : null}
        {b ? (
          <Button title={nextIdx === 0 ? 'Start rotation' : `Start block ${b.group}`} disabled={busy} onPress={() => onSave(rotationRun(teamId, day, session, b, Date.now()))} />
        ) : (
          <Text style={{ fontSize: 13, color: colors.muted }}>Rotation finished.</Text>
        )}
      </Card>
    );
  }
  const label = `Rack rotation · ${st.block.group} · Round ${st.round + 1} of ${st.block.rounds}${st.block.buildUpRound && st.round === 0 ? ' · Build-up' : ''} · Rotate in ${clock(st.secondsLeft)}`;
  const rotateNow = () => onSave({ ...run!, round: st.tick + 1, rotateAt: new Date(Date.now() + st.block.rotationSec * 1000).toISOString() });
  return (
    <Banner>
      <View style={{ gap: 8 }}>
        <Text accessibilityLiveRegion="polite" style={{ fontSize: 16, fontWeight: '700' }}>{label}</Text>
        <Row style={{ gap: 6, flexWrap: 'wrap' }}>
          <Button
            small
            title="Rotate now"
            disabled={busy}
            onPress={() => {
              if (asked.current) return rotateNow();
              asked.current = true;
              showAlert('Rotate now?', 'Everyone moves to their next position.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Rotate now', onPress: rotateNow }]);
            }}
          />
          <Button small kind="secondary" title="+15 s" disabled={busy} onPress={() => onSave({ ...run!, rotateAt: new Date(new Date(run!.rotateAt).getTime() + 15000).toISOString() })} />
          <Button small kind="ghost" title="End block" disabled={busy} onPress={() => onSave({ ...run!, endedAt: new Date().toISOString() })} />
        </Row>
      </View>
    </Banner>
  );
}
