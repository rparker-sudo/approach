import { useMemo, useState } from 'react';
import { showAlert } from '../../lib/dialog';
import { Pressable, View } from 'react-native';
import AboveTheNet from '../../components/AboveTheNet';
import { MyEffortSummary, useEffort, useTeamProgramFor } from '../../components/EffortBoard';
import { router } from 'expo-router';
import { canBoard, Team } from '../../lib/backend';
import { dateKey } from '../../lib/calendar';
import { badges, lastBlockComplete } from '../../lib/effort';
import { useTeams } from '../../lib/team';
import ScreenHeader from '../../components/ScreenHeader';
import { Body, Button, Card, colors, Field, H2, Label, Row, Screen, Text } from '../../components/ui';
import { getExercise } from '../../lib/exercises';
import { useStore } from '../../lib/store';
import { estimateStrength, formatDate, parseNum } from '../../lib/util';

type LiftPoint = { date: string; e1rm: number; best: string };

export default function Progress() {
  const { data, addBodyLog, deleteLog } = useStore();
  const [bw, setBw] = useState('');

  const lifts = useMemo(() => {
    const map = new Map<string, LiftPoint[]>();
    for (const log of [...data.logs].reverse()) {
      for (const e of log.entries) {
        const ex = getExercise(e.exerciseId);
        if (!ex.weighted || (ex.category !== 'lower' && ex.category !== 'upper')) continue;
        let best = 0;
        let bestLabel = '';
        for (const s of e.sets) {
          if (!s.done) continue;
          const w = parseNum(s.weight);
          const r = parseNum(s.reps);
          const est = estimateStrength(w, r);
          if (est > best) {
            best = est;
            bestLabel = `${w} lb × ${r}`;
          }
        }
        if (best > 0) {
          const arr = map.get(e.exerciseId) ?? [];
          arr.push({ date: log.date, e1rm: best, best: bestLabel });
          map.set(e.exerciseId, arr);
        }
      }
    }
    return [...map.entries()].sort((a, b) => b[1].length - a[1].length);
  }, [data.logs]);

  const [now] = useState(() => Date.now());
  const last28 = data.logs.filter((l) => now - new Date(l.date).getTime() < 28 * 864e5).length;

  return (
    <Screen tab>
      <ScreenHeader title="Progress" subtitle="Touch height and strength" />
      <AboveTheNet />
      <TeamEffortCards />
      <Button kind="secondary" title="Jump test" onPress={() => router.push({ pathname: '/testing', params: { solo: '1' } })} />
      {(data.readinessLog ?? []).length ? (
        <Card>
          <H2>Check-ins</H2>
          {[...(data.readinessLog ?? [])].reverse().slice(0, 7).map((r) => (
            <Row key={r.day} style={{ justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 13, color: colors.muted }}>{formatDate(r.day + 'T12:00:00')}</Text>
              <Text style={{ fontSize: 13 }}>
                Sleep {r.sleep} · Sore {r.soreness} · Energy {r.energy}
                {r.pain ? ' · Pain' : ''}
              </Text>
            </Row>
          ))}
        </Card>
      ) : null}
      <Row style={{ gap: 12 }}>
        <Big label="Workouts" value={String(data.logs.length)} />
        <Big label="Last 4 weeks" value={String(last28)} />
      </Row>

      <Card>
        <H2>Strength</H2>
        {lifts.length === 0 ? (
          <Body muted>Log a workout with weights. Your lifts show up here.</Body>
        ) : (
          lifts.map(([id, points]) => <LiftRow key={id} name={getExercise(id).name} points={points} />)
        )}
        <Body muted style={{ fontSize: 12 }}>
          Estimated strength comes from your best set. It&apos;s an estimate; no need to test it.
        </Body>
      </Card>

      <Card>
        <H2>Body weight</H2>
        <Row>
          <View style={{ flex: 1 }}>
            <Field placeholder="Today's weight (lb)" keyboardType="decimal-pad" value={bw} onChangeText={setBw} />
          </View>
          <Button
            small
            title="Save"
            disabled={!(parseNum(bw) > 0)}
            onPress={() => {
              addBodyLog({ date: new Date().toISOString(), weightLb: parseNum(bw) });
              setBw('');
            }}
          />
        </Row>
        {data.bodyLogs.length > 0 ? (
          <Bars values={data.bodyLogs.slice(-12).map((b) => b.weightLb)} labels={data.bodyLogs.slice(-12).map((b) => formatDate(b.date).split(',').pop()!.trim())} />
        ) : (
          <Body muted style={{ fontSize: 13 }}>Optional. Stays on this phone.</Body>
        )}
      </Card>

      <Label>History</Label>
      {data.logs.length === 0 ? <Body muted>No workouts logged yet.</Body> : null}
      {data.logs.slice(0, 30).map((l) => {
        const sets = l.entries.reduce((n, e) => n + e.sets.filter((s) => s.done).length, 0);
        return (
          <Pressable
            key={l.id}
            onLongPress={() =>
              showAlert('Delete this workout?', undefined, [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Delete', style: 'destructive', onPress: () => deleteLog(l.id) },
              ])
            }
          >
            <Card style={{ padding: 12, gap: 2 }}>
              <Row style={{ justifyContent: 'space-between' }}>
                <Text style={{ fontWeight: '600', fontSize: 16 }}>{l.sessionName}</Text>
                <Text style={{ color: colors.muted, fontSize: 13 }}>{formatDate(l.date)}</Text>
              </Row>
              <Text style={{ color: colors.muted, fontSize: 13 }}>{sets} sets{l.note ? ` · ${l.note}` : ''}</Text>
            </Card>
          </Pressable>
        );
      })}
      {data.logs.length > 0 ? <Body muted style={{ fontSize: 12 }}>Press and hold a workout to delete it.</Body> : null}
    </Screen>
  );
}

function Big({ label, value }: { label: string; value: string }) {
  return (
    <Card style={{ flex: 1, gap: 2 }}>
      <Text style={{ fontSize: 32, fontWeight: '600' }}>{value}</Text>
      <Text style={{ fontSize: 13, color: colors.muted }}>{label}</Text>
    </Card>
  );
}

function LiftRow({ name, points }: { name: string; points: LiftPoint[] }) {
  const first = points[0].e1rm;
  const last = points[points.length - 1];
  const change = last.e1rm - first;
  return (
    <View style={{ gap: 6, paddingVertical: 6, borderTopWidth: 1, borderTopColor: colors.line }}>
      <Row style={{ justifyContent: 'space-between' }}>
        <Text style={{ fontWeight: '600', fontSize: 16, flex: 1 }}>{name}</Text>
        <Text style={{ fontWeight: '600' }}>~{last.e1rm} lb (estimate)</Text>
      </Row>
      <Row style={{ justifyContent: 'space-between' }}>
        <Text style={{ color: colors.muted, fontSize: 12 }}>Last best set: {last.best}</Text>
        {points.length > 1 ? (
          <Text style={{ color: change > 0 ? colors.achievement : colors.muted, fontSize: 12, fontWeight: '600' }}>
            {change >= 0 ? '+' : ''}
            {change} lb estimated strength
          </Text>
        ) : null}
      </Row>
      {points.length > 1 ? <Bars values={points.slice(-10).map((p) => p.e1rm)} /> : null}
    </View>
  );
}

function Bars({ values, labels }: { values: number[]; labels?: string[] }) {
  const max = Math.max(...values);
  const min = Math.min(...values);
  const span = Math.max(max - min, 1);
  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 4, height: 54 }}>
        {values.map((v, i) => (
          <View key={i} style={{ flex: 1, height: 12 + ((v - min) / span) * 42, backgroundColor: i === values.length - 1 ? colors.chartLine : colors.chartGrid, borderRadius: 2 }} />
        ))}
      </View>
      {labels ? (
        <View style={{ flexDirection: 'row', gap: 4, marginTop: 4 }}>
          {labels.map((l, i) => (
            <Text key={i} numberOfLines={1} style={{ flex: 1, fontSize: 9, color: colors.muted, textAlign: 'center' }}>
              {values[i]}
            </Text>
          ))}
        </View>
      ) : null}
    </View>
  );
}

/** P4: the athlete's team effort card (their rank, link to the full list) and private badges. */
function TeamEffortCards() {
  const { teams, consentFor } = useTeams();
  const shown = teams.filter((t) => t.settings.effortBoard);
  if (!shown.length) return null;
  return (
    <>
      {shown.map((t) => (
        <TeamEffortCard key={t.id} team={t} onBoards={canBoard(consentFor(t.id))} />
      ))}
    </>
  );
}

function TeamEffortCard({ team, onBoards }: { team: Team; onBoards: boolean }) {
  const { data } = useStore();
  const { testResults } = useTeams();
  const programFor = useTeamProgramFor(team.id);
  const { stats } = useEffort(team.id, 'season');
  const me = stats?.find((x) => x.isMe);
  const logDays = new Set(data.logs.filter((l) => l.teamId === team.id).map((l) => dateKey(new Date(l.date))));
  const touches = (testResults[team.id] ?? []).filter((r) => r.testId === 'touch' && !r.voided).sort((a, b) => a.day.localeCompare(b.day));
  const newTouchBest = touches.length >= 2 && touches[touches.length - 1].value > Math.max(...touches.slice(0, -1).map((r) => r.value));
  // Private: only on this athlete's Progress tab, never shown to teammates.
  const mine = badges(me, lastBlockComplete(programFor(null), logDays), newTouchBest);
  return (
    <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: '/effort', params: { teamId: team.id } })}>
      <Card>
        <MyEffortSummary teamId={team.id} />
        {!onBoards ? <Text style={{ fontSize: 12, color: colors.muted }}>You&apos;re not shown to teammates on boards.</Text> : null}
        {mine.length ? (
          <Row style={{ gap: 6, flexWrap: 'wrap' }}>
            {mine.map((b) => (
              <View key={b} style={{ borderWidth: 1, borderColor: colors.line, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 }}>
                <Text style={{ fontSize: 12, fontWeight: '600' }}>{b}</Text>
              </View>
            ))}
          </Row>
        ) : null}
        <Text style={{ fontSize: 13, color: colors.muted }}>See the full list</Text>
      </Card>
    </Pressable>
  );
}
