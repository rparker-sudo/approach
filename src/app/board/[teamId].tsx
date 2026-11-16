import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Image, Platform, Pressable, useWindowDimensions, View } from 'react-native';
import { useEffort, useTeamProgramFor } from '../../components/EffortBoard';
import { Text } from '../../components/ui';
import { boardAccent, textOn } from '../../lib/accent';
import { backend, BoardMember, BoardTest, LiveProgress, Rack } from '../../lib/backend';
import { addDays, breakOn, dateKey, formatKey, mondayOf, planForDate, today } from '../../lib/calendar';
import { defaultTeamGoal, EffortMetric, formatMetric, liftDaysOf, METRICS, POINTS_LINE, rank, seasonStart, weeksRemaining } from '../../lib/effort';
import { ALL_EQUIPMENT, getExercise } from '../../lib/exercises';
import { adjustedFor, Level, resolveExercise } from '../../lib/resolve';
import { runState, stationFor, StationRun } from '../../lib/stations';
import { BATTERY_LABEL } from '../../lib/testing';
import { ALL, useTeams } from '../../lib/team';
import { isGeneral } from '../../lib/general';
import type { Program, TestBattery } from '../../lib/types';

/**
 * Coach board (v2.1-pass-2 P3 v1.3, F9): live view and Season view for a classroom display.
 * Shows board names, the resolved exercise, set x of y, last set's reps, rest countdowns, sets done, a "PR" badge
 * (no number), jump-test changes on testing days, team goal and effort ranks.
 * MUST NOT show check-ins, readiness, pain, body weight, nutrition, weights or loads, RPE, lift test results or changes,
 * estimated strength, or level (G-4).
 */

// Projector theme: always dark, text contrast ≥ 7:1.
const P = { bg: '#0B0B0C', tile: '#1C1D20', line: '#3A3D42', ink: '#FFFFFF', muted: '#C9CDD2' };
const PAGE_MS = 15000;
const GAP = 12;
/** Board signature (brand guide §8): plain mark + "Powered by Approach Strength" in Steel, never the team accent. */
const POWERED_BY = require('../../../assets/brand/powered-by-board.png');
const POWERED_BY_RATIO = 680 / 72;

type TileState = 'lifting' | 'resting' | 'not_started' | 'done';
type Tile = { member: BoardMember; live?: LiveProgress; prs: number; test?: BoardTest; state: TileState; upFirst?: string };
type Moment = { at: number; text: string };

export default function CoachBoard() {
  const { teamId } = useLocalSearchParams<{ teamId: string }>();
  const t = useTeams();
  const team = t.teams.find((x) => x.id === teamId);
  const isCoach = !!team && t.account?.role === 'coach' && team.coachId === t.account.id;
  if (!t.checked) return <View style={{ flex: 1, backgroundColor: P.bg }} />;
  if (!team || !isCoach) {
    return (
      <View style={{ flex: 1, backgroundColor: P.bg, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 16 }}>
        <Stack.Screen options={{ headerShown: false }} />
        <Text style={{ color: P.ink, fontSize: 24, textAlign: 'center' }}>
          {t.syncing ? 'Loading…' : team && isGeneral(team) ? 'This board is only for the trainer.' : "This board is only for this team's coach."}
        </Text>
        {!t.syncing ? <BoardButton label="Sign in" onPress={() => router.push('/account')} /> : null}
      </View>
    );
  }
  return <Board teamId={team.id} />;
}

/** Seconds left until an ISO time (never negative). */
const secsTo = (iso: string | null | undefined, now: number) => (iso ? Math.max(0, Math.ceil((new Date(iso).getTime() - now) / 1000)) : 0);
const clock = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
const ago = (at: number, now: number) => {
  const m = Math.floor((now - at) / 60000);
  return m < 1 ? 'now' : `${m}m`;
};

function Board({ teamId }: { teamId: string }) {
  const t = useTeams();
  const team = t.teams.find((x) => x.id === teamId)!;
  // 2.3.0 F44: in a general team this is the "Class board" and says clients (board-safe data only, as built).
  const g = isGeneral(team);
  const groups = useMemo(() => t.groups[teamId] ?? [], [t.groups, teamId]);
  const programFor = useTeamProgramFor(teamId);
  const { width } = useWindowDimensions();
  const accent = boardAccent(team.settings.accentColor).color;
  const [grid, setGrid] = useState({ w: 0, h: 0 });
  const [members, setMembers] = useState<BoardMember[] | null>(null);
  const [live, setLive] = useState<LiveProgress[]>([]);
  const [prs, setPrs] = useState<Record<string, number>>({});
  const [tests, setTests] = useState<BoardTest[]>([]);
  const [racks, setRacks] = useState<Rack[]>([]);
  const [run, setRun] = useState<StationRun | null>(null);
  const [connected, setConnected] = useState(true);
  const [lastOk, setLastOk] = useState(() => Date.now());
  const [view, setView] = useState<'live' | 'season'>('live');
  const [filter, setFilter] = useState<string | null>(null); // group id, `rack:<id>`, or null = all
  const [byRack, setByRack] = useState(true);
  const [controls, setControls] = useState(true);
  const [page, setPage] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const [ticker, setTicker] = useState<Moment[]>([]);
  const prev = useRef<Map<string, LiveProgress> | null>(null);
  const milestones = useRef<Record<string, number>>({});
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const day = dateKey(today());

  const load = useCallback(async () => {
    try {
      const startOfDay = today().toISOString();
      const [m, l, b, ts, rk, sr] = await Promise.all([
        backend.boardMembers(teamId),
        backend.listLiveProgress(teamId, day),
        backend.bestsSince(teamId, startOfDay),
        backend.boardTests(teamId, day),
        backend.listRacks(teamId),
        backend.getStationRun(teamId, day),
      ]);
      setRun(sr);
      setMembers(m);
      setLive(l);
      setPrs(b);
      setTests(ts);
      setRacks(rk);
      setConnected(true);
      setLastOk(Date.now());
    } catch {
      setConnected(false); // tiles keep their last values; rest countdowns keep running locally
    }
  }, [teamId, day]);

  useEffect(() => {
    let alive = true;
    Promise.resolve().then(() => {
      if (alive) load();
    });
    const unsub = backend.subscribeBoard(teamId, () => load(), (ok) => alive && setConnected(ok));
    // Backup poll in case a realtime message is missed (also covers demo mode).
    const poll = setInterval(load, 10000);
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      alive = false;
      unsub();
      clearInterval(poll);
      clearInterval(tick);
    };
  }, [teamId, load]);

  // Controls fade after 3 s without pointer movement.
  const poke = useCallback(() => {
    setControls(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setControls(false), 3000);
  }, []);
  useEffect(() => {
    const first = setTimeout(() => setControls(false), 3000);
    return () => clearTimeout(first);
  }, []);

  // Today's session per group, testing day, break.
  const keys = useMemo(() => [ALL, ...groups.map((g) => g.id)], [groups]);
  const groupName = useCallback((gid: string | null) => (gid ? groups.find((g) => g.id === gid)?.name ?? 'Team' : 'Team'), [groups]);
  const today_ = useMemo(() => {
    const per = keys
      .map((k) => {
        const prog = programFor(k === ALL ? null : k);
        if (!prog) return null;
        const p = planForDate(prog, today());
        const s = prog.sessions.find((x) => x.id === p.sessionId);
        return { key: k, label: k === ALL ? 'Team' : groupName(k), prog, plan: p, session: s };
      })
      .filter((x): x is NonNullable<typeof x> => !!x);
    const test = per.map((x) => x.plan.test).find(Boolean) as TestBattery | undefined;
    const onBreak = per.length > 0 && per.every((x) => !!breakOn(x.prog, today()));
    return { per, test, onBreak, lifting: per.filter((x) => x.session) };
  }, [keys, programFor, groupName]);

  const sessionNameOf = (sid: string | null) => today_.per.map((x) => x.prog.sessions.find((s) => s.id === sid)?.name).find(Boolean) ?? 'the workout';

  // Live ticker (in memory, derived from row changes): finishes, PRs (exercise name only), group milestones.
  useEffect(() => {
    if (!members) return;
    const byId = new Map(live.map((l) => [l.userId, l]));
    const name = (u: string) => members.find((m) => m.userId === u)?.boardName;
    const before = prev.current;
    prev.current = byId;
    if (!before) return; // first load: no moments for what already happened
    const moments: Moment[] = [];
    for (const l of live) {
      const n = name(l.userId);
      if (!n) continue;
      const was = before.get(l.userId);
      const doneNow = (l.state ?? (l.status === 'done' ? 'done' : '')) === 'done';
      const doneBefore = was && (was.state ?? (was.status === 'done' ? 'done' : '')) === 'done';
      if (doneNow && !doneBefore) moments.push({ at: Date.now(), text: `${n} finished ${sessionNameOf(l.sessionId)}` });
      if ((l.prToday ?? 0) > (was?.prToday ?? 0) && l.exerciseName) moments.push({ at: Date.now(), text: `${n} hit a PR on ${l.exerciseName}` });
    }
    // Group milestones at 50 / 75 / 100% done.
    const gkeys = [...new Set(members.map((m) => m.groupId ?? ALL))];
    for (const g of gkeys) {
      const inGroup = members.filter((m) => (m.groupId ?? ALL) === g);
      const done = inGroup.filter((m) => byId.get(m.userId)?.state === 'done' || byId.get(m.userId)?.status === 'done').length;
      const pct = inGroup.length ? (done / inGroup.length) * 100 : 0;
      const hit = [100, 75, 50].find((x) => pct >= x) ?? 0;
      if (hit > (milestones.current[g] ?? 0)) moments.push({ at: Date.now(), text: `${g === ALL ? 'Team' : groupName(g)}: ${done} of ${inGroup.length} done` });
      milestones.current[g] = Math.max(milestones.current[g] ?? 0, hit);
    }
    // The ticker records moments as rows change on the server (an external system), so it's kept as state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (moments.length) setTicker((old) => [...moments.reverse(), ...old].slice(0, 5));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [live, members]);

  // Up first: the athlete's resolved first exercise (G8). Levels are used here only to resolve, never shown.
  const extras = t.coachExtras[teamId];
  const upFirst = (m: BoardMember) => {
    const k = m.groupId && today_.per.some((x) => x.key === m.groupId) ? m.groupId : ALL;
    const entry = today_.per.find((x) => x.key === k) ?? today_.per[0];
    const first = entry?.session?.exercises[0];
    if (!entry || !first) return undefined;
    const info = extras?.levels[m.userId];
    // 2.2.1 J1: an exercise adjusted because of another team comes from the server's list (no level is sent).
    const adj = adjustedFor(info?.adjusted, first.exerciseId, entry.prog.equipment);
    if (adj !== undefined) return adj ? getExercise(adj).name : undefined;
    const lvl = (info?.teamLevel ?? 2) as Level;
    const r = resolveExercise(getExercise(first.exerciseId), lvl, entry.prog.equipment?.length ? entry.prog.equipment : ALL_EQUIPMENT);
    return r?.name;
  };

  const tileState = (l?: LiveProgress): TileState => {
    if (!l) return 'not_started';
    const s = l.state ?? (l.status === 'done' ? 'done' : l.status === 'in_progress' ? 'lifting' : 'idle');
    if (s === 'done') return 'done';
    if (s === 'resting') return secsTo(l.restEndsAt, now) > 0 ? 'resting' : 'lifting';
    if (s === 'lifting') return 'lifting';
    return 'not_started';
  };
  const ORDER: Record<TileState, number> = { resting: 0, lifting: 0, not_started: 1, done: 2 };
  // 3.1: athletes on a home day aren't on the live view (they aren't in the room).
  const atHome = (m: BoardMember) => {
    const k = m.groupId && today_.per.some((x) => x.key === m.groupId) ? m.groupId : ALL;
    return (today_.per.find((x) => x.key === k) ?? today_.per[0])?.session?.location === 'home';
  };
  const all: Tile[] = (members ?? []).filter((m) => !atHome(m)).map((m) => {
    const l = live.find((x) => x.userId === m.userId);
    return { member: m, live: l, prs: Math.max(prs[m.userId] ?? 0, l?.prToday ?? 0), test: tests.find((x) => x.userId === m.userId), state: tileState(l), upFirst: undefined };
  });
  for (const tile of all) if (tile.state === 'not_started') tile.upFirst = upFirst(tile.member);
  const rackOf = (u: string) => racks.find((r) => r.userIds.includes(u));
  const shown = all
    .filter((x) => !filter || (filter.startsWith('rack:') ? rackOf(x.member.userId)?.id === filter.slice(5) : (x.member.groupId ?? ALL) === filter))
    .sort((a, b) => ORDER[a.state] - ORDER[b.state] || a.member.boardName.localeCompare(b.member.boardName));

  // Header stats: only athletes on the board.
  const stats = {
    setsDone: all.reduce((n, x) => n + (x.live?.setsDone ?? 0), 0),
    setsTotal: all.reduce((n, x) => n + (x.live?.setsTotal ?? 0), 0),
    done: all.filter((x) => (today_.test ? testDone(x.test, today_.test) : x.state === 'done')).length,
    working: all.filter((x) => (today_.test ? (x.test?.jumpsDone ?? 0) > 0 && !testDone(x.test, today_.test) : x.state === 'lifting' || x.state === 'resting')).length,
    prs: all.reduce((n, x) => n + (x.prs > 0 ? x.prs : 0), 0),
  };

  // Sections: by rack (when racks exist and the toggle is on) or one grid. Empty racks are hidden; a rack whose
  // athletes are all hidden shows only its name.
  const arrange = byRack && racks.length > 0 && !filter?.startsWith('rack:');
  const sections: { title: string | null; tiles: Tile[] }[] = arrange
    ? [
        ...racks
          .filter((r) => r.userIds.length)
          .map((r) => {
            const tiles = shown.filter((x) => r.userIds.includes(x.member.userId));
            return { title: tiles.length ? `${r.name} · ${tiles.length} ${g ? 'client' : 'athlete'}${tiles.length === 1 ? '' : 's'}` : r.name, tiles };
          }),
        // [UX proposal] F9b: athletes on the board who aren't on a rack.
        ...(shown.some((x) => !rackOf(x.member.userId)) ? [{ title: g ? 'Other clients' : 'Other athletes', tiles: shown.filter((x) => !rackOf(x.member.userId)) }] : []),
      ]
    : [{ title: null, tiles: shown }];

  // [UX proposal] F9a: if the roster doesn't fit at the minimum tile height, page every 15 s.
  // Rack sections flow left to right and wrap: size tiles by simulating that flow so everything fits when it can.
  const fit = arrange ? fitFlow(sections.map((x) => x.tiles.length), grid.w, grid.h) : fitGrid(shown.length, grid.w, grid.h);
  const perPage = fit.perPage;
  const flow = 'lineOf' in fit ? (fit as Flow) : null;
  const pages = flow?.lineOf
    ? Math.max(1, Math.ceil((Math.max(0, ...flow.lineOf) + 1) / (flow.linesPerPage ?? 1)))
    : Math.max(1, Math.ceil(shown.length / Math.max(1, perPage)));
  useEffect(() => {
    if (pages <= 1) return;
    const r = setInterval(() => setPage((n) => n + 1), PAGE_MS);
    return () => clearInterval(r);
  }, [pages]);
  const pageIndex = page % pages;
  const onPage = new Set(
    flow?.lineOf
      ? sections.flatMap((sec, i) => (Math.floor(flow.lineOf![i] / (flow.linesPerPage ?? 1)) === pageIndex ? sec.tiles.map((x) => x.member.userId) : []))
      : shown.slice(pageIndex * perPage, (pageIndex + 1) * perPage).map((x) => x.member.userId),
  );

  const filterKeys: (string | null)[] = [null, ...groups.map((g) => g.id), ...racks.map((r) => `rack:${r.id}`)];
  const filterLabel = (k: string | null) => (!k ? 'All' : k.startsWith('rack:') ? racks.find((r) => `rack:${r.id}` === k)?.name ?? 'Rack' : groupName(k));
  const big = (n: number) => Math.max(14, Math.min(n, (n * width) / 1920));
  // F30: station grid during Part 2 of a Stations session.
  const stSession = today_.per.find((x) => x.session?.format === 'stations')?.session;
  const stList = stSession?.stations ?? [];
  const rs = run && stSession && stList.length ? runState(run, now) : null;
  const gridOn = !!rs && rs.phase !== 'done' && view === 'live';
  const sortedRacks = [...racks].sort((a, b) => a.sortOrder - b.sortOrder).filter((r) => r.userIds.length);

  const sessionLine = gridOn
    ? `Stations · Round ${rs!.round + 1} of ${run!.rounds}`
    : today_.test
    ? `Testing day: ${BATTERY_LABEL[today_.test]}`
    : today_.lifting.map((s) => (today_.lifting.length > 1 ? `${s.label}: ${s.session!.name}` : s.session!.name)).join(' · ');

  let body: React.ReactNode;
  if (view === 'season') body = <Season teamId={teamId} accent={accent} />;
  else if (gridOn)
    body = (
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16 }}>
        {stList.map((st, i) => {
          const rk = sortedRacks.find((_, k) => stationFor(k, rs!.round, stList.length) === i);
          const next = rk ? stList[stationFor(sortedRacks.indexOf(rk), rs!.round + 1, stList.length)] : null;
          const tiles = rk ? all.filter((x) => rk.userIds.includes(x.member.userId)) : [];
          const tw = Math.max(200, Math.floor((grid.w - 16 * (Math.min(stList.length, 3) - 1)) / Math.min(stList.length, 3)) - 24);
          return (
            <View key={st.id} style={{ width: tw + 24, gap: 6, padding: 12, borderRadius: 16, borderWidth: 1, borderColor: P.line }}>
              <Text style={{ color: P.ink, fontSize: big(32), fontWeight: '700' }}>{st.name}</Text>
              {rk ? (
                <Text style={{ color: P.muted, fontSize: big(24) }}>{`${rk.name} · ${st.name}${next && rs!.round + 1 < run!.rounds ? ` → ${next.name}` : ''}`}</Text>
              ) : (
                <Text style={{ color: P.muted, fontSize: big(24) }}>Open this round.</Text>
              )}
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {tiles.map((tile) => (
                  <BoardTile key={tile.member.userId} tile={tile} w={Math.floor((tw - 8) / 2)} h={120} accent={accent} now={now} groupName={groupName} test={today_.test} />
                ))}
              </View>
            </View>
          );
        })}
      </View>
    );
  else if (members === null)
    body = (
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: GAP }}>
        {Array.from({ length: 12 }, (_, i) => (
          <View key={i} style={{ width: `${100 / 6 - 1.2}%`, height: 150, backgroundColor: P.tile, borderRadius: 16, opacity: 0.5 }} />
        ))}
      </View>
    );
  else if (today_.onBreak && !live.length) body = <Empty text={g ? 'Break. No sessions today.' : 'Break week. No team lifting today.'} onSeason={() => setView('season')} />;
  else if (!today_.lifting.length && !today_.test && !live.length) body = <Empty text="Rest day. See you tomorrow." onSeason={() => setView('season')} />;
  else if (!members.length) body = <Empty text={g ? 'No clients to show yet. Clients appear once they allow the class board.' : 'No athletes to show yet. Athletes appear once their board permission is on.'} />;
  else
    body = (
      <View style={{ flexDirection: arrange ? 'row' : 'column', flexWrap: 'wrap', columnGap: 28, rowGap: 10 }}>
        {sections.map((sec, i) => {
          const tiles = sec.tiles.filter((x) => onPage.has(x.member.userId));
          if (sec.title && !tiles.length && sec.tiles.length) return null; // on another page
          if (flow?.lineOf && Math.floor(flow.lineOf[i] / (flow.linesPerPage ?? 1)) !== pageIndex) return null;
          return (
            <View key={i} style={{ gap: 8 }}>
              {sec.title ? <Text style={{ color: P.ink, fontSize: big(24), fontWeight: '700' }}>{sec.title}</Text> : null}
              <View style={{ flexDirection: 'row', flexWrap: arrange ? 'nowrap' : 'wrap', gap: GAP }}>
                {tiles.map((tile) => (
                  <BoardTile key={tile.member.userId} tile={tile} w={fit.w} h={fit.h} accent={accent} now={now} groupName={groupName} test={today_.test} />
                ))}
              </View>
            </View>
          );
        })}
      </View>
    );

  return (
    <View style={{ flex: 1, backgroundColor: P.bg }} onPointerMove={poke as never} onTouchStart={poke}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={{ height: 6, backgroundColor: accent }} />
      {!connected ? (
        <View style={{ backgroundColor: '#E2A336', padding: 8 }}>
          <Text style={{ color: P.bg, fontWeight: '600', textAlign: 'center', fontSize: 18 }}>
            {now - lastOk > 60000 ? `Reconnecting… Last update ${Math.floor((now - lastOk) / 60000)}m ago.` : 'Reconnecting…'}
          </Text>
        </View>
      ) : null}

      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 32, paddingVertical: 16, gap: 24, flexWrap: 'wrap' }}>
        <View style={{ flex: 1, minWidth: 280, gap: 4 }}>
          <Text style={{ color: P.ink, fontSize: big(48), fontWeight: '700' }}>{g ? `${team.name} · Class board` : team.name}</Text>
          <Text style={{ color: P.muted, fontSize: big(24) }}>
            {new Date(now).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })} ·{' '}
            {new Date(now).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
          </Text>
          {sessionLine ? <Text style={{ color: P.muted, fontSize: big(24) }}>{sessionLine}</Text> : null}
          {gridOn ? (
            <Text style={{ color: P.ink, fontSize: big(48), fontWeight: '700', fontVariant: ['tabular-nums'] }}>
              {rs!.phase === 'transition' ? `Move to your next station · ${clock(rs!.secondsLeft)}` : `Rotate in ${clock(rs!.secondsLeft)}`}
            </Text>
          ) : null}
        </View>
        {view === 'live' ? (
          <View style={{ flexDirection: 'row', gap: 28, flexWrap: 'wrap' }}>
            {!today_.test ? <Stat label="Sets today" value={`${stats.setsDone} / ${stats.setsTotal}`} size={big} /> : null}
            <Stat label={g ? 'Done' : 'Team done'} value={`${stats.done} / ${all.length}`} size={big} />
            <Stat label="Working now" value={String(stats.working)} size={big} />
            {!today_.test ? <Stat label="PRs today" value={String(stats.prs)} size={big} /> : null}
          </View>
        ) : null}
      </View>

      {/* Tiles or Season view */}
      <View
        style={{ flex: 1, paddingHorizontal: 24, paddingBottom: 8, overflow: 'hidden' }}
        onLayout={(e) => setGrid({ w: e.nativeEvent.layout.width - 48, h: e.nativeEvent.layout.height - 8 })}
      >
        {body}
      </View>

      {/* Footer: ticker (live view only) and the signature, bottom-right, 24 px from the edges at 1920 × 1080 (never over tiles). */}
      <View style={{ minHeight: view === 'live' ? 64 : 0, borderTopWidth: view === 'live' ? 1 : 0, borderTopColor: P.line, paddingLeft: 32, paddingRight: big(24), paddingTop: 12, paddingBottom: big(24), flexDirection: 'row', gap: 32, alignItems: 'center', alignContent: 'flex-end', flexWrap: 'wrap' }}>
        {view === 'live'
          ? ticker.map((m, i) => (
              <Text key={`${m.at}-${i}`} style={{ color: P.ink, fontSize: big(22) }}>
                {m.text} <Text style={{ color: P.muted, fontSize: big(18) }}>{ago(m.at, now)}</Text>
              </Text>
            ))
          : null}
        {view === 'live' && pages > 1 ? <Text style={{ color: P.muted, fontSize: big(18), marginLeft: 'auto' }}>{`${pageIndex + 1} / ${pages}`}</Text> : null}
        <Image
          source={POWERED_BY}
          accessibilityLabel="Powered by Approach Strength"
          style={{ marginLeft: view === 'live' && pages > 1 ? 0 : 'auto', alignSelf: 'flex-end', height: 24, width: 24 * POWERED_BY_RATIO }}
        />
      </View>

      {/* Controls */}
      {controls ? (
        <View style={{ position: 'absolute', top: 16, right: 16, flexDirection: 'row', gap: 8, backgroundColor: 'rgba(28,29,32,0.92)', borderRadius: 12, padding: 8, flexWrap: 'wrap' }}>
          {filterKeys.length > 1 ? (
            <BoardButton label={`Group: ${filterLabel(filter)}`} onPress={() => setFilter(filterKeys[(filterKeys.indexOf(filter) + 1) % filterKeys.length])} />
          ) : null}
          {racks.length ? <BoardButton label={byRack ? 'Arrange by rack: on' : 'Arrange by rack: off'} onPress={() => setByRack((v) => !v)} /> : null}
          <BoardButton label={view === 'live' ? 'Season view' : 'Live view'} onPress={() => setView((v) => (v === 'live' ? 'season' : 'live'))} />
          <BoardButton label="Exit" onPress={() => (router.canGoBack() ? router.back() : router.replace(`/team/${teamId}`))} />
        </View>
      ) : null}
      {Platform.OS === 'web' && controls ? (
        <Text style={{ position: 'absolute', top: 76, right: 20, color: P.muted, fontSize: 14 }}>Press F11 for full screen</Text>
      ) : null}
    </View>
  );
}

function testDone(t: BoardTest | undefined, battery: TestBattery) {
  if (!t) return false;
  return t.jumpsDone >= 3 && (battery === 'jump' || t.strengthDone);
}

function Stat({ label, value, size }: { label: string; value: string; size: (n: number) => number }) {
  return (
    <View style={{ gap: 2 }}>
      <Text style={{ color: P.muted, fontSize: size(18) }}>{label}</Text>
      <Text style={{ color: P.ink, fontSize: size(40), fontWeight: '700', fontVariant: ['tabular-nums'] }}>{value}</Text>
    </View>
  );
}

function Empty({ text, onSeason }: { text: string; onSeason?: () => void }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 24 }}>
      <Text style={{ color: P.ink, fontSize: 48, fontWeight: '700', textAlign: 'center' }}>{text}</Text>
      {onSeason ? <BoardButton label="Season view" onPress={onSeason} /> : null}
    </View>
  );
}

/** Rack mode: the largest tile (min height 150) at which the wrapped sections fit; otherwise the minimum size, paged. */
type Flow = { w: number; h: number; perPage: number; lineOf?: number[]; linesPerPage?: number };
function fitFlow(counts: number[], w: number, h: number): Flow {
  const n = counts.reduce((a, b) => a + b, 0);
  if (!n || !w || !h) return { w: 280, h: 170, perPage: Math.max(n, 1) };
  const HEADER = 40;
  const COL_GAP = 28;
  const ROW_GAP = 10;
  const lineOf = (tw: number) => {
    const out: number[] = [];
    let line = 0;
    let x = 0;
    for (const k of counts) {
      const sw = Math.max(1, k) * tw + (Math.max(1, k) - 1) * GAP;
      if (x > 0 && x + COL_GAP + sw > w) {
        line++;
        x = sw;
      } else x += (x > 0 ? COL_GAP : 0) + sw;
      out.push(line);
    }
    return out;
  };
  const height = (lines: number, th: number) => lines * (HEADER + th) + (lines - 1) * ROW_GAP;
  for (let tw = Math.floor((w - GAP * 5) / 6); tw >= 160; tw -= 8) {
    const th = Math.max(150, Math.floor(tw * 0.8));
    const lines = Math.max(0, ...lineOf(tw)) + 1;
    if (height(lines, th) <= h) return { w: tw, h: th, perPage: n };
  }
  // Doesn't fit at the minimum size: page by whole lines of rack sections (never cut a section).
  const tw = Math.max(160, Math.floor((w - GAP * 5) / 6));
  const linesPerPage = Math.max(1, Math.floor((h + ROW_GAP) / (HEADER + 150 + ROW_GAP)));
  return { w: tw, h: 150, perPage: n, lineOf: lineOf(tw), linesPerPage };
}

/** 6 columns (fewer for small rosters); minimum tile height 150 px. perPage = tiles that fit. */
function fitGrid(n: number, w: number, h: number): { w: number; h: number; perPage: number } {
  if (!n || !w || !h) return { w: 280, h: 170, perPage: Math.max(n, 1) };
  const cols = Math.min(6, Math.max(1, n));
  const tw = Math.floor((w - GAP * (cols - 1)) / cols);
  const rowsFit = Math.max(1, Math.floor((h + GAP) / (150 + GAP)));
  const rows = Math.min(rowsFit, Math.ceil(n / cols));
  const th = Math.max(150, Math.min(Math.floor((h - GAP * (rows - 1)) / rows), Math.floor(tw * 0.8)));
  return { w: tw, h: th, perPage: rowsFit * cols };
}

const TEST_NAME: Record<string, string> = { touch: 'Touch', broad: 'Broad', throw: 'Throw' };

function BoardTile({
  tile,
  w,
  h,
  accent,
  now,
  groupName,
  test,
}: {
  tile: Tile;
  w: number;
  h: number;
  accent: string;
  now: number;
  groupName: (g: string | null) => string;
  test?: TestBattery;
}) {
  const l = tile.live;
  const s = (n: number) => Math.max(12, Math.min(n, (n * h) / 200, (n * w) / 300));
  const rest = tile.state === 'resting' ? secsTo(l?.restEndsAt, now) : 0;
  const done = tile.state === 'done';
  const pill =
    tile.state === 'resting'
      ? { text: `Rest ${clock(rest)}`, fill: accent, ink: textOn(accent), border: accent }
      : tile.state === 'done'
        ? { text: 'Done', fill: accent, ink: textOn(accent), border: accent }
        : tile.state === 'lifting'
          ? { text: 'Lifting', fill: '#3A3D42', ink: P.ink, border: '#3A3D42' }
          : { text: 'Not started', fill: 'transparent', ink: P.ink, border: P.muted };
  let line2: string | null = null;
  let line3: string | null = null;
  if (test) {
    // Testing-day mode: battery progress and jump changes only. Never raw values or lift values.
    const t = tile.test;
    line2 = !t || t.jumpsDone < 3 ? `Jump tests ${t?.jumpsDone ?? 0} / 3` : test !== 'jump' && t.strengthDone ? 'Strength check ✓' : 'Jump tests ✓';
  } else if (tile.state === 'not_started') line2 = tile.upFirst ? `Up first: ${tile.upFirst}` : null;
  else if (done) line2 = l?.finishedAt ? `Finished ${new Date(l.finishedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}` : 'Finished';
  else if (l?.groupLabel) {
    // F23: "A1 DB Bench · A2 One-Arm Row" then "Round 2 of 3".
    const cut = l.groupLabel.lastIndexOf(' · Round ');
    line2 = cut > 0 ? l.groupLabel.slice(0, cut) : l.groupLabel;
    line3 = cut > 0 ? l.groupLabel.slice(cut + 3) : null;
  } else {
    line2 = l?.exerciseName ?? null;
    line3 = l?.setIndex && l.setCount ? `Set ${l.setIndex} of ${l.setCount}${l.lastReps ? ` · last set ${l.lastReps} reps` : ''}` : null;
  }
  const pct = l && l.setsTotal ? Math.min(1, l.setsDone / l.setsTotal) : 0;
  return (
    <View
      style={{
        width: w,
        height: h,
        backgroundColor: P.tile,
        borderRadius: 16,
        padding: Math.max(10, h * 0.07),
        borderWidth: done ? 3 : 2,
        borderStyle: tile.state === 'not_started' ? 'dashed' : 'solid',
        borderColor: done ? accent : P.line,
        justifyContent: 'space-between',
        overflow: 'hidden',
      }}
    >
      <View style={{ gap: 2 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text numberOfLines={1} style={{ color: P.ink, fontSize: s(32), fontWeight: '700', flexShrink: 1 }}>
            {tile.member.boardName}
          </Text>
          {tile.prs > 0 && !test ? (
            <View style={{ borderWidth: 2, borderColor: accent, borderRadius: 8, paddingHorizontal: 6 }}>
              <Text style={{ color: P.ink, fontWeight: '700', fontSize: s(16) }}>PR</Text>
            </View>
          ) : null}
        </View>
        <Text numberOfLines={1} style={{ color: P.muted, fontSize: s(18) }}>{groupName(tile.member.groupId)}</Text>
        {line2 ? <Text numberOfLines={1} style={{ color: P.ink, fontSize: s(24) }}>{line2}</Text> : null}
        {line3 ? <Text numberOfLines={1} style={{ color: P.ink, fontSize: s(20), fontVariant: ['tabular-nums'] }}>{line3}</Text> : null}
        {test && tile.test?.changes.length ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {tile.test.changes.map((c) => (
              <View key={c.test} style={{ borderWidth: 1.5, borderColor: accent, borderRadius: 999, paddingHorizontal: 8 }}>
                <Text style={{ color: P.ink, fontSize: s(18), fontVariant: ['tabular-nums'] }}>
                  {c.delta != null && c.delta > 0 ? `${TEST_NAME[c.test]} +${c.delta} ${c.unit}` : `${TEST_NAME[c.test]} Tested ✓`}
                </Text>
              </View>
            ))}
          </View>
        ) : null}
      </View>
      <View style={{ gap: 6 }}>
        {!test && l && l.setsTotal ? (
          <View style={{ gap: 2 }}>
            <View style={{ height: 8, borderRadius: 4, backgroundColor: '#2A2C30', overflow: 'hidden' }}>
              <View style={{ width: `${pct * 100}%`, height: '100%', backgroundColor: accent }} />
            </View>
            <Text style={{ color: P.ink, fontSize: s(20), fontVariant: ['tabular-nums'] }}>{`Sets ${l.setsDone} / ${l.setsTotal}`}</Text>
          </View>
        ) : null}
        <View style={{ alignSelf: 'flex-start', backgroundColor: pill.fill, borderWidth: 2, borderColor: pill.border, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 2 }}>
          <Text style={{ color: pill.ink, fontWeight: '700', fontSize: s(18), fontVariant: ['tabular-nums'] }}>{pill.text}</Text>
        </View>
      </View>
    </View>
  );
}

function BoardButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={{ paddingHorizontal: 14, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: P.line, minHeight: 44, justifyContent: 'center' }}>
      <Text style={{ color: P.ink, fontSize: 16, fontWeight: '600' }}>{label}</Text>
    </Pressable>
  );
}

/** F9e Season view: team goal and pace on the left, the effort leaderboard (Overall first) on the right. */
function Season({ teamId, accent }: { teamId: string; accent: string }) {
  const t = useTeams();
  const team = t.teams.find((x) => x.id === teamId)!;
  const programFor = useTeamProgramFor(teamId);
  const { stats } = useEffort(teamId, 'season');
  const [metric, setMetric] = useState<EffortMetric>('overall');
  const whole = programFor(null);
  const total = (stats ?? []).reduce((n, s) => n + s.sessions, 0);
  const goal = team.settings.teamGoal ?? defaultTeamGoal(stats?.filter((s) => s.ranked).length ?? 0, whole ? liftDaysOf(whole) : 0, weeksRemaining(whole));
  const pct = goal ? Math.min(1, total / goal) : 0;
  const finish = projectedFinish(whole, total, goal);
  const list = stats ? rank(stats, metric).filter((r) => r.rank).slice(0, 10) : [];
  const hasBreaks = (whole?.events ?? []).some((e) => e.type === 'break' && !e.teamName);
  return (
    <View style={{ flex: 1, flexDirection: 'row', gap: 48, paddingTop: 8, flexWrap: 'wrap' }}>
      <View style={{ flex: 1, minWidth: 320, gap: 16 }}>
        <Text style={{ color: P.muted, fontSize: 22, fontWeight: '600' }}>TEAM GOAL</Text>
        <Text style={{ color: P.ink, fontSize: 40, fontWeight: '700', fontVariant: ['tabular-nums'] }}>{`Team total: ${total} / ${goal} sessions`}</Text>
        <View style={{ height: 28, borderRadius: 14, backgroundColor: P.tile, overflow: 'hidden' }}>
          <View style={{ width: `${pct * 100}%`, height: '100%', backgroundColor: accent }} />
        </View>
        <Text style={{ color: P.ink, fontSize: 28, fontVariant: ['tabular-nums'] }}>{`${Math.max(0, goal - total)} to go`}</Text>
        {finish ? <Text style={{ color: P.ink, fontSize: 24 }}>{`On pace to finish week of ${finish}`}</Text> : null}
        {hasBreaks ? <Text style={{ color: P.muted, fontSize: 20 }}>Break weeks don&apos;t count toward the goal.</Text> : null}
        <View style={{ marginTop: 12, gap: 6 }}>
          <Text style={{ color: P.muted, fontSize: 20, fontWeight: '600' }}>How Overall points work</Text>
          <Text style={{ color: P.ink, fontSize: 22 }}>{POINTS_LINE}</Text>
        </View>
      </View>
      <View style={{ flex: 1.2, minWidth: 360, gap: 10 }}>
        {team.settings.boardEffortPanel ? (
          <>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {METRICS.map((m) => (
                <Pressable
                  key={m.id}
                  accessibilityRole="button"
                  onPress={() => setMetric(m.id)}
                  style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, borderWidth: 2, borderColor: metric === m.id ? P.ink : P.line }}
                >
                  <Text style={{ color: P.ink, fontSize: 18, fontWeight: metric === m.id ? '700' : '400' }}>{m.label}</Text>
                </Pressable>
              ))}
            </View>
            {list.length ? (
              list.map((r) => (
                <View
                  key={r.stats.userId}
                  style={{ flexDirection: 'row', gap: 16, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 10, borderWidth: 2, borderColor: r.rank <= 3 ? accent : 'transparent' }}
                >
                  <Text style={{ color: P.muted, fontSize: 26, width: 40, fontVariant: ['tabular-nums'] }}>{r.rank}</Text>
                  <Text style={{ color: P.ink, fontSize: 26, flex: 1 }}>{r.stats.boardName}</Text>
                  <Text style={{ color: P.ink, fontSize: 26, fontWeight: '700', fontVariant: ['tabular-nums'] }}>{formatMetric(r.value, metric)}</Text>
                </View>
              ))
            ) : (
              <Text style={{ color: P.muted, fontSize: 22 }}>No sessions logged yet. The board fills in after the first workout.</Text>
            )}
          </>
        ) : (
          <Text style={{ color: P.muted, fontSize: 28 }}>Leaderboard off</Text>
        )}
      </View>
    </View>
  );
}

/** Week (Monday) the team reaches the goal at its pace so far; null before any sessions. */
function projectedFinish(program: Program | undefined, total: number, goal: number): string | null {
  if (!program || total <= 0 || total >= goal) return null;
  const start = seasonStart(program);
  const weeks = Math.max(1, (today().getTime() - start.getTime()) / (7 * 864e5));
  const perWeek = total / weeks;
  const need = Math.ceil((goal - total) / perWeek);
  return formatKey(dateKey(mondayOf(addDays(today(), need * 7))), { month: 'short', day: 'numeric' });
}
