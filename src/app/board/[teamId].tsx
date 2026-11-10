import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform, Pressable, useWindowDimensions, View } from 'react-native';
import { useEffort, useTeamProgramFor } from '../../components/EffortBoard';
import { Text } from '../../components/ui';
import { backend, BoardMember, LiveProgress } from '../../lib/backend';
import { dateKey, planForDate, today } from '../../lib/calendar';
import { defaultTeamGoal, formatMetric, liftDaysOf, METRICS, rank, weeksRemaining } from '../../lib/effort';
import { ALL, useTeams } from '../../lib/team';

/**
 * Coach board (P3, F9): a read-only live view for a classroom display.
 * Shows only board names, workout status and sets done, a "PR" badge (no weight), team goal and effort ranks.
 * MUST NOT show check-ins, readiness, pain, body weight, nutrition, weights or loads, test results or estimated strength.
 */

// Projector theme: always dark, contrast ≥ 7:1.
const P = { bg: '#0B0B0C', tile: '#1C1D20', line: '#3A3D42', ink: '#FFFFFF', muted: '#C9CDD2', done: '#C9CDD2', doneInk: '#0B0B0C' };
const ROTATE_MS = 20000;

type Tile = { member: BoardMember; live?: LiveProgress; prs: number };

export default function CoachBoard() {
  const { teamId } = useLocalSearchParams<{ teamId: string }>();
  const t = useTeams();
  const team = t.teams.find((x) => x.id === teamId);
  const isCoach = !!team && t.account?.role === 'coach' && team.coachId === t.account.id;
  if (!t.checked) return <View style={{ flex: 1, backgroundColor: P.bg }} />;
  if (!team || !isCoach) {
    return (
      <View style={{ flex: 1, backgroundColor: P.bg, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <Stack.Screen options={{ headerShown: false }} />
        <Text style={{ color: P.ink, fontSize: 24, textAlign: 'center' }}>
          {t.syncing ? 'Loading…' : "This board is only for the team's coach. Sign in as the coach to open it."}
        </Text>
      </View>
    );
  }
  return <Board teamId={team.id} />;
}

function Board({ teamId }: { teamId: string }) {
  const t = useTeams();
  const team = t.teams.find((x) => x.id === teamId)!;
  const groups = useMemo(() => t.groups[teamId] ?? [], [t.groups, teamId]);
  const programFor = useTeamProgramFor(teamId);
  const { width, height } = useWindowDimensions();
  const [members, setMembers] = useState<BoardMember[] | null>(null);
  const [live, setLive] = useState<LiveProgress[]>([]);
  const [prs, setPrs] = useState<Record<string, number>>({});
  const [connected, setConnected] = useState(true);
  const [showEffort, setShowEffort] = useState(true);
  const [group, setGroup] = useState<string | null>(null);
  const [controls, setControls] = useState(true);
  const [panel, setPanel] = useState(0);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const day = dateKey(today());

  const load = useCallback(async () => {
    try {
      const startOfDay = today().toISOString();
      const [m, l, b] = await Promise.all([backend.boardMembers(teamId), backend.listLiveProgress(teamId, day), backend.bestsSince(teamId, startOfDay)]);
      setMembers(m);
      setLive(l);
      setPrs(b);
      setConnected(true);
    } catch {
      setConnected(false); // tiles keep their last values
    }
  }, [teamId, day]);

  useEffect(() => {
    let alive = true;
    Promise.resolve().then(() => {
      if (alive) load();
    });
    const unsub = backend.subscribeBoard(teamId, () => load(), (ok) => alive && setConnected(ok));
    // Backup poll in case a realtime message is missed (also covers demo mode).
    const poll = setInterval(load, 15000);
    return () => {
      alive = false;
      unsub();
      clearInterval(poll);
    };
  }, [teamId, load]);

  // Rotate the effort panel every 20 s.
  useEffect(() => {
    const r = setInterval(() => setPanel((n) => n + 1), ROTATE_MS);
    return () => clearInterval(r);
  }, []);

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

  // Today's session per group (header) and whether anyone lifts today.
  const sessions = useMemo(() => {
    const keys = [ALL, ...groups.map((g) => g.id)];
    return keys
      .map((k) => {
        const prog = programFor(k === ALL ? null : k);
        if (!prog) return null;
        const p = planForDate(prog, today());
        const name = p.test ? 'Testing day' : prog.sessions.find((s) => s.id === p.sessionId)?.name;
        return name ? { key: k, label: k === ALL ? 'Team' : groups.find((g) => g.id === k)?.name ?? 'Group', name } : null;
      })
      .filter((x): x is { key: string; label: string; name: string } => !!x);
  }, [groups, programFor]);

  const tiles: Tile[] = (members ?? [])
    .filter((m) => !group || (m.groupId ?? ALL) === group)
    .map((m) => ({ member: m, live: live.find((l) => l.userId === m.userId), prs: prs[m.userId] ?? 0 }))
    // Done tiles move to the end.
    .sort((a, b) => Number(a.live?.status === 'done') - Number(b.live?.status === 'done') || a.member.boardName.localeCompare(b.member.boardName));

  const cols = tiles.length > 20 ? 6 : tiles.length > 12 ? 5 : 4;
  const effortOn = team.settings.boardEffortPanel && showEffort;

  return (
    <View
      style={{ flex: 1, backgroundColor: P.bg }}
      onPointerMove={poke as never}
      onTouchStart={poke}
    >
      <Stack.Screen options={{ headerShown: false }} />
      {!connected ? (
        <View style={{ backgroundColor: '#E2A336', padding: 8 }}>
          <Text style={{ color: P.doneInk, fontWeight: '600', textAlign: 'center', fontSize: 18 }}>Reconnecting…</Text>
        </View>
      ) : null}

      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 32, paddingVertical: 20, gap: 24, flexWrap: 'wrap' }}>
        <Text style={{ color: P.ink, fontSize: Math.min(48, width / 28), fontWeight: '700' }}>{team.name}</Text>
        <Text style={{ color: P.muted, fontSize: Math.min(32, width / 40) }}>
          {today().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
        </Text>
        <Text style={{ color: P.ink, fontSize: Math.min(32, width / 40), flex: 1 }}>
          {sessions.map((s) => (sessions.length > 1 ? `${s.label}: ${s.name}` : s.name)).join(' · ')}
        </Text>
      </View>

      {/* Tiles */}
      <View style={{ flex: 1, paddingHorizontal: 24 }}>
        {members === null ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16 }}>
            {Array.from({ length: 8 }, (_, i) => (
              <View key={i} style={{ width: `${100 / 4 - 2}%`, height: 140, backgroundColor: P.tile, borderRadius: 16, opacity: 0.5 }} />
            ))}
          </View>
        ) : !sessions.length ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: P.ink, fontSize: 56, fontWeight: '700' }}>Rest day. See you tomorrow.</Text>
          </View>
        ) : (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16 }}>
            {tiles.map((tile) => (
              <BoardTile key={tile.member.userId} tile={tile} width={`${100 / cols - 1.5}%`} />
            ))}
          </View>
        )}
      </View>

      {/* Footer: team goal + rotating effort panel */}
      <View style={{ minHeight: height * 0.18, borderTopWidth: 1, borderTopColor: P.line, paddingHorizontal: 32, paddingVertical: 16, flexDirection: 'row', gap: 32 }}>
        <TeamGoal teamId={teamId} />
        {effortOn ? <EffortPanel teamId={teamId} index={panel} /> : null}
      </View>

      {/* Controls */}
      {controls ? (
        <View style={{ position: 'absolute', top: 16, right: 16, flexDirection: 'row', gap: 8, backgroundColor: 'rgba(28,29,32,0.9)', borderRadius: 12, padding: 8 }}>
          {team.settings.boardEffortPanel ? (
            <BoardButton label={showEffort ? 'Hide effort' : 'Show effort'} onPress={() => setShowEffort((v) => !v)} />
          ) : null}
          {groups.length ? (
            <BoardButton
              label={group ? groups.find((g) => g.id === group)?.name ?? 'Group' : 'All groups'}
              onPress={() => {
                const keys = [null, ...groups.map((g) => g.id)];
                setGroup(keys[(keys.indexOf(group) + 1) % keys.length]);
              }}
            />
          ) : null}
          <BoardButton label="Exit" onPress={() => (router.canGoBack() ? router.back() : router.replace(`/team/${teamId}`))} />
        </View>
      ) : null}
      {Platform.OS === 'web' && controls ? (
        <Text style={{ position: 'absolute', bottom: 8, right: 16, color: P.muted, fontSize: 14 }}>Press F11 for full screen</Text>
      ) : null}
    </View>
  );
}

function BoardTile({ tile, width }: { tile: Tile; width: `${number}%` }) {
  const status = tile.live?.status ?? 'not_started';
  const done = status === 'done';
  const label = status === 'done' ? 'Done' : status === 'in_progress' ? 'In progress' : 'Not started';
  return (
    <View style={{ width, backgroundColor: P.tile, borderRadius: 16, padding: 18, gap: 10, borderWidth: 1, borderColor: P.line }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Text numberOfLines={1} style={{ color: P.ink, fontSize: 36, fontWeight: '700', flex: 1 }}>
          {tile.member.boardName}
        </Text>
        {tile.prs > 0 ? (
          <View style={{ borderWidth: 2, borderColor: P.done, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 }}>
            <Text style={{ color: P.done, fontWeight: '700', fontSize: 18 }}>PR</Text>
          </View>
        ) : null}
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ backgroundColor: done ? P.done : 'transparent', borderWidth: 2, borderColor: done ? P.done : P.line, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 4 }}>
          <Text style={{ color: done ? P.doneInk : P.ink, fontWeight: '700', fontSize: 18 }}>{label}</Text>
        </View>
        <Text style={{ color: P.ink, fontSize: 28, fontVariant: ['tabular-nums'] }}>
          {tile.live ? `Sets ${tile.live.setsDone} / ${tile.live.setsTotal}` : 'Sets –'}
        </Text>
      </View>
    </View>
  );
}

function BoardButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={{ paddingHorizontal: 14, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: P.line }}>
      <Text style={{ color: P.ink, fontSize: 16, fontWeight: '600' }}>{label}</Text>
    </Pressable>
  );
}

function TeamGoal({ teamId }: { teamId: string }) {
  const t = useTeams();
  const team = t.teams.find((x) => x.id === teamId)!;
  const programFor = useTeamProgramFor(teamId);
  const { stats } = useEffort(teamId, 'season');
  const whole = programFor(null);
  const total = (stats ?? []).reduce((n, s) => n + s.sessions, 0);
  const goal = team.settings.teamGoal ?? defaultTeamGoal(stats?.length ?? 0, whole ? liftDaysOf(whole) : 0, weeksRemaining(whole));
  const pct = goal ? Math.min(1, total / goal) : 0;
  return (
    <View style={{ flex: 1, gap: 10, justifyContent: 'center' }}>
      <Text style={{ color: P.muted, fontSize: 20, fontWeight: '600' }}>TEAM GOAL</Text>
      <Text style={{ color: P.ink, fontSize: 32, fontWeight: '700', fontVariant: ['tabular-nums'] }}>{`${total} / ${goal} sessions`}</Text>
      <View style={{ height: 16, borderRadius: 8, backgroundColor: P.tile, overflow: 'hidden' }}>
        <View style={{ width: `${pct * 100}%`, height: '100%', backgroundColor: P.done }} />
      </View>
    </View>
  );
}

function EffortPanel({ teamId, index }: { teamId: string; index: number }) {
  const { stats } = useEffort(teamId, 'season');
  const metric = METRICS[index % METRICS.length];
  const list = stats ? rank(stats, metric.id).slice(0, 5) : [];
  return (
    <View style={{ flex: 1.4, gap: 6, justifyContent: 'center' }}>
      <Text style={{ color: P.muted, fontSize: 20, fontWeight: '600' }}>{`EFFORT · ${metric.label.toUpperCase()}`}</Text>
      {list.length ? (
        list.map((r) => (
          <View key={r.stats.userId} style={{ flexDirection: 'row', gap: 16 }}>
            <Text style={{ color: P.muted, fontSize: 22, width: 32, fontVariant: ['tabular-nums'] }}>{r.rank}</Text>
            <Text style={{ color: P.ink, fontSize: 22, flex: 1 }}>{r.stats.boardName}</Text>
            <Text style={{ color: P.ink, fontSize: 22, fontWeight: '700', fontVariant: ['tabular-nums'] }}>{formatMetric(r.value, metric.id)}</Text>
          </View>
        ))
      ) : (
        <Text style={{ color: P.muted, fontSize: 20 }}>Nothing to rank yet.</Text>
      )}
    </View>
  );
}
