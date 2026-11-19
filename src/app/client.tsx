import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { AdjustToLevel, LevelSwaps, SetLevelSheet } from '../components/LevelRoster';
import { Body, Button, Card, colors, H2, Label, Row, Screen, StatusChip, Text } from '../components/ui';
import { LEVEL_NAME } from '../lib/athlete';
import { backend, Readiness, TeamLog } from '../lib/backend';
import { clientRow } from '../lib/clients';
import { showAlert } from '../lib/dialog';
import { getExercise } from '../lib/exercises';
import { endDate, goalLabel, isGeneral, programLine } from '../lib/general';
import { useStore } from '../lib/store';
import { useTeams } from '../lib/team';
import type { WorkoutLog } from '../lib/types';
import { formatDate } from '../lib/util';

type Log = TeamLog & { entries: WorkoutLog['entries'] };

/**
 * 2.3.0 F38 client detail (trainer). Check-ins appear only while the client shares them (the server returns none
 * otherwise, including past ones: compliance T5). PRs are private to trainer and client.
 */
export default function ClientScreen() {
  const { teamId, userId } = useLocalSearchParams<{ teamId: string; userId: string }>();
  const { data } = useStore();
  const t = useTeams();
  const team = t.teams.find((x) => x.id === teamId);
  const member = (t.members[teamId] ?? []).find((m) => m.userId === userId);
  const [logs, setLogs] = useState<Log[] | null>(null);
  const [checkins, setCheckins] = useState<Readiness[]>([]);
  const [open, setOpen] = useState<string | null>(null);
  const [levelOpen, setLevelOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const shares = !!member?.perms.shareCheckins;

  useEffect(() => {
    if (!teamId || !userId) return;
    const since = new Date(Date.now() - 56 * 864e5).toISOString();
    const day14 = new Date(Date.now() - 13 * 864e5).toISOString().slice(0, 10);
    backend.clientLogs(teamId, userId, since).then(setLogs).catch(() => setError("Couldn't load this client's sessions. Pull to refresh."));
    backend.clientCheckins(teamId, userId, day14).then(setCheckins).catch(() => setCheckins([]));
  }, [teamId, userId, shares]);

  if (!team || !isGeneral(team) || !member) return <Screen><Body muted>Client not found.</Body></Screen>;
  const row = clientRow(team, member, data.programs, t.logs[team.id] ?? [], t.readiness[team.id] ?? []);
  const fmt = (k: string) => new Date(`${k}T12:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  const prs = (logs ?? []).filter((l) => (l.prCount ?? 0) > 0);

  return (
    <Screen>
      <Stack.Screen options={{ title: member.name }} />
      {/* 1. Name and level */}
      <Row style={{ gap: 8, flexWrap: 'wrap' }}>
        <H2>{member.name}</H2>
        <StatusChip label={member.levelConfirmed ? LEVEL_NAME[member.level ?? 1] : 'Level not confirmed'} />
      </Row>
      <Button small kind="secondary" title="Set level" onPress={() => setLevelOpen(true)} />
      {row.flags.map((f) => (
        <Text key={f.label} style={{ fontSize: 13, color: f.tone === 'warning' ? colors.warningText : colors.muted }}>{`${f.tone === 'warning' ? '! ' : '· '}${f.label}${f.line ? `. ${f.line}` : ''}`}</Text>
      ))}

      {/* 2. Program */}
      <Label>Program</Label>
      {row.programs.length === 0 ? <Body muted>No program.</Body> : null}
      {row.programs.map((p) => (
        <Card key={p.id}>
          <Text style={{ fontSize: 16, fontWeight: '600' }}>{p.name}</Text>
          <Text style={{ fontSize: 13, color: colors.muted }}>{`${goalLabel(p.goal)} · ${programLine(p)}${p.startDate ? ` · ${fmt(p.startDate)} – ${fmt(endDate(p))}` : ''}`}</Text>
          {p.groupKey === 'all' ? <Text style={{ fontSize: 13, color: colors.muted }}>All clients</Text> : p.groupName ? <Text style={{ fontSize: 13, color: colors.muted }}>{p.groupName}</Text> : null}
          <Button small kind="ghost" title="Open in builder" onPress={() => router.push(`/program/${p.id}`)} />
          {/* 6. Adjustments */}
          <AdjustToLevel program={p} member={member} />
          <LevelSwaps program={p} member={member} info={t.coachExtras[team.id]?.levels[member.userId]} />
        </Card>
      ))}

      {/* 3. This week */}
      <Label>This week</Label>
      <Text style={{ fontSize: 14 }}>{`${row.done} of ${row.planned} sessions done`}</Text>

      {/* 4. Recent sessions */}
      <Label>Recent sessions</Label>
      {error ? <Text style={{ fontSize: 13, color: colors.errorText }}>{error}</Text> : null}
      {logs && logs.length === 0 ? <Body muted>No sessions logged yet.</Body> : null}
      {(logs ?? []).slice(0, 15).map((l) => (
        <Card key={l.id} style={{ gap: 4 }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <Text style={{ fontWeight: '600', flex: 1 }} onPress={() => setOpen(open === l.id ? null : l.id)} accessibilityRole="button">
              {l.sessionName}
            </Text>
            <Text style={{ fontSize: 13, color: colors.muted }}>{formatDate(l.date)}</Text>
          </Row>
          <Text style={{ fontSize: 13, color: colors.muted }}>{`${l.setsDone} sets${l.note ? ` · "${l.note}"` : ''}`}</Text>
          {open === l.id ? (
            <View style={{ gap: 2 }}>
              {l.entries.map((e, i) => (
                <Text key={i} style={{ fontSize: 13 }}>
                  {getExercise(e.exerciseId).name}
                  <Text style={{ color: colors.muted }}>
                    {e.minutesDone != null
                      ? ` · ${e.minutesDone} min`
                      : ` · ${e.sets.filter((s) => s.done).map((s) => (s.weight ? `${s.weight} × ${s.reps}` : s.reps)).join(', ') || 'not done'}`}
                  </Text>
                </Text>
              ))}
            </View>
          ) : (
            <Text accessibilityRole="button" onPress={() => setOpen(l.id)} style={{ fontSize: 13, textDecorationLine: 'underline', minHeight: 44, paddingVertical: 12 }}>
              Show sets
            </Text>
          )}
        </Card>
      ))}

      {/* 5. PRs (private to trainer and client) */}
      <Label>PRs</Label>
      {prs.length ? prs.map((l) => <Text key={l.id} style={{ fontSize: 13 }}>{`${formatDate(l.date)} · ${l.sessionName} · ${l.prCount} new best${l.prCount === 1 ? '' : 's'}`}</Text>) : <Body muted>No new bests yet.</Body>}
      <Text style={{ fontSize: 12, color: colors.muted }}>Only you and {member.name.split(' ')[0]} see these.</Text>

      {/* 7. Check-ins (only if shared) */}
      <Label>Check-ins</Label>
      {!shares || checkins.length === 0 ? (
        <Body muted>{shares ? 'No check-ins in the last 14 days.' : 'No check-in shared'}</Body>
      ) : (
        checkins.map((c) => (
          <Text key={c.day} style={{ fontSize: 13 }}>
            {`${fmt(c.day)} · sleep ${c.sleep}/5 · soreness ${c.soreness}/5 · energy ${c.energy}/5 · Pain: ${c.pain ? 'yes' : 'no'}`}
          </Text>
        ))
      )}

      <Button
        kind="danger"
        title="Remove from my clients"
        onPress={() =>
          showAlert(`Remove ${member.name}?`, "They'll stop getting your programs and you'll lose access to their data.", [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Remove', style: 'destructive', onPress: () => t.removeMember(team.id, member.userId).then(() => router.back()).catch(() => {}) },
          ])
        }
      />
      {levelOpen ? (
        <SetLevelSheet
          general
          member={member}
          onClose={() => setLevelOpen(false)}
          onSave={async (lv) => {
            await t.setMemberLevel(team.id, member.userId, lv);
            setLevelOpen(false);
            showAlert('Level saved.');
          }}
        />
      ) : null}
    </Screen>
  );
}
