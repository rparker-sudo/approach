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
  const on = session?.format === 'stations' && (session.stations?.length ?? 0) > 0 && session.location !== 'home';

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
        {missing.length ? (
          <>
            <Text style={{ fontSize: 14, color: colors.warningText }}>{`${missing.length} ${general ? 'client' : 'athlete'}${missing.length === 1 ? " isn't" : "s aren't"} on a rack.`}</Text>
            <Button kind="secondary" title="Add the rest to racks (balanced)" disabled={busy} onPress={fillRacks} />
          </>
        ) : null}
        {tooManyRacks ? <Text style={{ fontSize: 13, color: colors.errorText }}>{`${racks.filter((r) => r.userIds.length).length} racks, ${stations.length} stations. Add a station or merge two racks.`}</Text> : null}
        <Button
          title="Start stations"
          disabled={busy || missing.length > 0 || tooManyRacks}
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
