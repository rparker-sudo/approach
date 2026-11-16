import { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import { backend, canAttend, canTest } from '../lib/backend';
import { dateKey } from '../lib/calendar';
import {
  blockStart,
  computeEffort,
  EffortMetric,
  EffortStats,
  formatMetric,
  METRICS,
  POINTS_LINE,
  PROGRAM_METRICS,
  rank,
  seasonStart,
  topWithMe,
} from '../lib/effort';
import { useStore } from '../lib/store';
import { ALL, useTeams } from '../lib/team';
import type { Program } from '../lib/types';
import { Card, Chip, ChipRow, colors, Label, Row, Text } from './ui';
import { boardAccent, tint } from '../lib/accent';
import { possessive } from '../lib/util';

export type EffortRange = 'season' | 'block';

/** The team workout a member follows, with the team calendar applied (for scheduled sessions). */
export function useTeamProgramFor(teamId: string) {
  const { postedFor } = useTeams();
  const { data } = useStore();
  return useCallback(
    (groupId: string | null): Program | undefined => {
      const tp = (groupId ? postedFor(teamId, groupId) : undefined) ?? postedFor(teamId, ALL);
      const local = data.programs.find((p) => p.teamId === teamId && (p.groupKey ?? ALL) === (groupId ?? ALL)) ?? data.programs.find((p) => p.teamId === teamId);
      const base = tp?.program ?? local;
      if (!base) return undefined;
      const cal = data.teamCalendars?.[teamId];
      return { ...base, events: cal?.events ?? local?.events ?? base.events };
    },
    [postedFor, data.programs, data.teamCalendars, teamId],
  );
}

/** Fetches effort inputs and computes stats for a team. Never receives weights, results, check-ins or nutrition. */
export function useEffort(teamId: string, range: EffortRange) {
  const programFor = useTeamProgramFor(teamId);
  const [stats, setStats] = useState<EffortStats[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const whole = programFor(null);
  const since = range === 'season' ? seasonStart(whole) : blockStart(whole);
  const sinceKey = dateKey(since);
  const load = useCallback(async () => {
    try {
      const rows = await backend.teamEffort(teamId, sinceKey);
      setStats(computeEffort(rows, programFor, since));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamId, sinceKey, programFor]);
  useEffect(() => {
    let live = true;
    backend
      .teamEffort(teamId, sinceKey)
      .then((rows) => live && setStats(computeEffort(rows, programFor, since)))
      .catch((e) => live && setError(e instanceof Error ? e.message : 'Something went wrong.'));
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamId, sinceKey, programFor]);
  return { stats, error, reload: load };
}

/** F10: metric chips, Season / This block, ranked rows, own row highlighted (pinned when outside the top 10). */
export default function EffortBoard({ teamId, viewer }: { teamId: string; viewer: 'coach' | 'athlete' }) {
  const { teams, consentFor, account } = useTeams();
  const { data } = useStore();
  const team = teams.find((t) => t.id === teamId);
  const [range, setRange] = useState<EffortRange>('season');
  const [metric, setMetric] = useState<EffortMetric>('overall');
  const { stats, error } = useEffort(teamId, range);
  const programFor = useTeamProgramFor(teamId);
  const mine = consentFor(teamId);
  const accent = boardAccent(team?.settings.accentColor).color;
  // The athlete sees only the chips their permissions allow.
  // 2.3.0 F34: general teams never show the Attendance or Jump gains tabs.
  const general = team?.kind === 'general';
  const metrics = METRICS.filter(
    (m) =>
      !(general && (m.id === 'attendance' || m.id === 'jumpGains')) &&
      (viewer === 'coach' || ((m.id !== 'attendance' || canAttend(mine)) && (m.id !== 'jumpGains' || canTest(mine)))),
  );

  if (viewer === 'athlete' && team && !team.settings.effortBoard) {
    return (
      <Card>
        <Text style={{ fontSize: 14, color: colors.muted }}>{general ? 'Your trainer turned off the effort board.' : 'Your coach turned off the effort board.'}</Text>
      </Card>
    );
  }

  const list = stats ? rank(stats, metric) : [];
  const { top, me } = topWithMe(list);
  const whole_ = programFor(null);
  const from = range === 'season' ? seasonStart(whole_) : blockStart(whole_);
  const hasBreak = !!whole_ && (whole_.events ?? []).some((e) => e.type === 'break' && !e.teamName && (e.endDate ?? e.date) >= dateKey(from) && e.date <= dateKey(new Date()));
  const meStats = stats?.find((x) => x.isMe);
  // D-027: on a team whose program the athlete doesn't follow, no own row on program metrics.
  const notRankedHere = viewer === 'athlete' && meStats && !meStats.ranked && PROGRAM_METRICS.includes(metric);
  const programTeam = teams.find((t) => t.isLiftProgram && t.id !== teamId)?.name ?? (data.liftTeamId ? data.teamLevels?.[data.liftTeamId]?.teamName : undefined);
  const hidden = viewer === 'athlete' && account?.boardNameMode === 'hidden';
  const empty = !!stats && stats.every((x) => x.sessions === 0 && x.extra === 0) && (metric === 'overall' || metric === 'sessions');
  return (
    <View style={{ gap: 12 }}>
      <ChipRow>
        {metrics.map((m) => (
          <Chip key={m.id} label={m.label} selected={metric === m.id} onPress={() => setMetric(m.id)} />
        ))}
      </ChipRow>
      {metric === 'overall' ? <Text style={{ fontSize: 13, color: colors.muted }}>{POINTS_LINE}</Text> : null}
      <ChipRow>
        <Chip label="Season" selected={range === 'season'} onPress={() => setRange('season')} />
        <Chip label="This block" selected={range === 'block'} onPress={() => setRange('block')} />
      </ChipRow>
      {notRankedHere ? (
        <Text style={{ fontSize: 13, color: colors.muted }}>
          {`You're following ${programTeam ? possessive(programTeam) : "another team's"} lift program, so you're not ranked here. Attendance, Hours, and Jump gains still count.`}
        </Text>
      ) : null}
      <Card style={{ gap: 0, paddingVertical: 4 }}>
        {error ? <Text style={{ color: colors.errorText, fontSize: 13, paddingVertical: 12 }}>Couldn&apos;t load the board. Pull to refresh.</Text> : null}
        {!stats && !error ? <Text style={{ fontSize: 14, color: colors.muted, paddingVertical: 12 }}>Loading…</Text> : null}
        {empty || (stats && !list.length) ? (
          <Text style={{ fontSize: 14, color: colors.muted, paddingVertical: 12 }}>No sessions logged yet. The board fills in after the first workout.</Text>
        ) : null}
        {[...top, ...(me ? [me] : [])].map((r, i) => (
          <Row
            key={r.stats.userId}
            style={{
              paddingVertical: 10,
              paddingHorizontal: 8,
              borderTopWidth: i ? 1 : 0,
              borderTopColor: colors.line,
              // Own row: 4 px accent bar and a 12% accent tint; the text keeps the normal color.
              backgroundColor: r.stats.isMe ? tint(accent, 0.12) : 'transparent',
              borderLeftWidth: r.stats.isMe ? 4 : 0,
              borderLeftColor: accent,
              borderRadius: r.stats.isMe ? 8 : 0,
            }}
          >
            <Text style={{ width: 32, fontWeight: '600', fontVariant: ['tabular-nums'] }}>{r.rank || '–'}</Text>
            <Text style={{ flex: 1, fontWeight: r.stats.isMe ? '600' : '400' }}>{r.stats.isMe ? `${r.stats.boardName} (you)` : r.stats.boardName}</Text>
            <Text style={{ fontWeight: '600', fontVariant: ['tabular-nums'] }}>{formatMetric(r.value, metric)}</Text>
          </Row>
        ))}
        {hidden ? <Text style={{ fontSize: 13, color: colors.muted, paddingVertical: 10 }}>You&apos;re hidden on boards. Change in Settings → Privacy.</Text> : null}
      </Card>
      <Text style={{ fontSize: 12, color: colors.muted }}>
        {`Effort board ranks work, not weight. Change how you appear in Settings → Privacy.${hasBreak ? " Break weeks don't count against anyone." : ''}`}
      </Text>
    </View>
  );
}

/** Small summary for the athlete's Progress tab: their Overall rank. */
export function MyEffortSummary({ teamId }: { teamId: string }) {
  const { stats } = useEffort(teamId, 'season');
  if (!stats) return <Label>Team effort</Label>;
  const list = rank(stats, 'overall');
  const mine = list.find((r) => r.stats.isMe);
  return (
    <View style={{ gap: 4 }}>
      <Label>Team effort</Label>
      <Text style={{ fontSize: 16, fontWeight: '600' }}>
        {mine && mine.rank ? `#${mine.rank} of ${list.filter((r) => r.rank).length} · ${formatMetric(mine.value, 'overall')}` : 'Log your first team lift to get on the board.'}
      </Text>
      {list.filter((r) => r.rank).slice(0, 3).map((r) => (
        <Text key={r.stats.userId} style={{ fontSize: 13, color: colors.muted }}>{`${r.rank}. ${r.stats.boardName} · ${formatMetric(r.value, 'overall')}`}</Text>
      ))}
    </View>
  );
}
