import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';
import { weekStart } from '../../components/TeamHome';
import { Body, Button, Card, colors, display, Field, H2, Label, Pill, Row, Text } from '../../components/ui';
import { ProgramWeek } from '../../components/week';
import { showAlert } from '../../lib/dialog';
import { shareTeamInvite } from '../../lib/share';
import { useStore } from '../../lib/store';
import { teamProgramId, useTeams } from '../../lib/team';
import { PHASES } from '../../lib/types';
import { formatDate } from '../../lib/util';

export default function TeamScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data } = useStore();
  const t = useTeams();
  const team = t.teams.find((x) => x.id === id);
  const [posting, setPosting] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [newName, setNewName] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!team) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, padding: 16 }}>
        <Body muted>{t.syncing ? 'Loading team…' : 'Team not found.'}</Body>
      </View>
    );
  }

  const program = data.programs.find((p) => p.id === teamProgramId(team.id));
  const tp = t.posted[team.id];
  const roster = t.members[team.id] ?? [];
  const logs = t.logs[team.id] ?? [];
  const since = weekStart().toISOString();
  const needsPost = !!program && (program.unposted || !tp);

  async function post() {
    setPosting(true);
    setError(null);
    try {
      await t.postTeamProgram(team!.id);
      showAlert('Workout posted', `Everyone on ${team!.name} has the new plan.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't post. Try again.");
    } finally {
      setPosting(false);
    }
  }

  async function act(fn: () => Promise<void>) {
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.');
    }
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ padding: 16, paddingBottom: 48, gap: 16 }}
      contentInsetAdjustmentBehavior="automatic"
      refreshControl={<RefreshControl refreshing={t.syncing} onRefresh={t.refresh} tintColor={colors.muted} />}
      keyboardShouldPersistTaps="handled"
    >
      <Stack.Screen options={{ title: team.name }} />
      {error ? <Text style={{ color: colors.error, fontSize: 13 }}>{error}</Text> : null}

      <Card>
        <Label>Team code</Label>
        <Text selectable style={[display(32), { textAlign: 'center', paddingVertical: 4 }]}>
          {team.joinCode}
        </Text>
        <Text style={{ fontSize: 13, color: colors.muted, textAlign: 'center' }}>
          Athletes make an account and enter this code to join.
        </Text>
        <Button
          kind="secondary"
          title="Invite athletes"
          icon="square.and.arrow.up"
          onPress={() => shareTeamInvite(team.name, team.joinCode, t.account?.name)}
        />
      </Card>

      <View style={{ gap: 8 }}>
        <Label>Team workout</Label>
        {program ? (
          <>
            <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <View style={{ flex: 1, gap: 6 }}>
                <H2>{program.name}</H2>
                <Row style={{ gap: 6, flexWrap: 'wrap' }}>
                  <Pill text={PHASES.find((p) => p.id === program.phase)!.label} bg={colors.day.game} />
                  <Pill text={needsPost ? (tp ? 'Changes not posted' : 'Not posted yet') : `Posted ${formatDate(tp!.updatedAt)}`} />
                </Row>
              </View>
            </Row>
            {needsPost ? (
              <Button title={posting ? 'Posting…' : `Post to ${team.name}`} icon="square.and.arrow.up" disabled={posting} onPress={post} />
            ) : null}
            <Text style={{ fontSize: 13, color: colors.muted }}>Tap a lift to edit it. Post again to send changes.</Text>
            <ProgramWeek
              program={program}
              onPressSession={(sessionId) => router.push({ pathname: '/session', params: { programId: program.id, sessionId } })}
            />
            <Button
              kind="ghost"
              title="Change schedule & rebuild"
              icon="arrow.triangle.2.circlepath"
              onPress={() => router.push({ pathname: '/builder', params: { programId: program.id, teamId: team.id } })}
            />
          </>
        ) : (
          <Card>
            <Body muted>No workout yet. Build one and post it, and every athlete on the roster gets it.</Body>
            <Button
              title="Build team workout"
              icon="wand.and.stars"
              onPress={() => router.push({ pathname: '/builder', params: { teamId: team.id } })}
            />
          </Card>
        )}
      </View>

      <View style={{ gap: 8 }}>
        <Label>{`Roster · ${roster.length}`}</Label>
        {roster.length === 0 ? (
          <Card>
            <Body muted>No athletes yet. Share the team code to invite them.</Body>
          </Card>
        ) : (
          <Card style={{ gap: 0, paddingVertical: 4 }}>
            {roster.map((m, i) => {
              const mine = logs.filter((l) => l.userId === m.userId);
              const week = mine.filter((l) => l.date >= since).length;
              return (
                <Row
                  key={m.userId}
                  style={{ paddingVertical: 12, borderTopWidth: i ? 1 : 0, borderTopColor: colors.line, alignItems: 'flex-start' }}
                >
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={{ fontSize: 16, fontWeight: '600' }}>{m.name}</Text>
                    <Text style={{ fontSize: 13, color: colors.muted }}>
                      {m.position ?? 'Position not set'}
                      {mine[0] ? ` · Last lift ${formatDate(mine[0].date)}` : ' · No lifts logged'}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 6 }}>
                    <Pill text={`${week} this week`} achievement={week > 0} />
                    <Text
                      accessibilityRole="button"
                      onPress={() =>
                        showAlert(`Remove ${m.name}?`, `They'll stop getting ${team.name} workouts.`, [
                          { text: 'Cancel', style: 'cancel' },
                          { text: 'Remove', style: 'destructive', onPress: () => act(() => t.removeMember(team.id, m.userId)) },
                        ])
                      }
                      style={{ fontSize: 12, color: colors.faint }}
                    >
                      Remove
                    </Text>
                  </View>
                </Row>
              );
            })}
          </Card>
        )}
      </View>

      {logs.length ? (
        <View style={{ gap: 8 }}>
          <Label>Recent lifts</Label>
          <Card style={{ gap: 0, paddingVertical: 4 }}>
            {logs.slice(0, 12).map((l, i) => (
              <View key={l.id} style={{ paddingVertical: 10, borderTopWidth: i ? 1 : 0, borderTopColor: colors.line, gap: 2 }}>
                <Row style={{ justifyContent: 'space-between' }}>
                  <Text style={{ fontWeight: '600' }}>{l.userName}</Text>
                  <Text style={{ fontSize: 13, color: colors.muted }}>{formatDate(l.date)}</Text>
                </Row>
                <Text style={{ fontSize: 13, color: colors.muted }}>
                  {l.sessionName} · {l.setsDone} sets{l.note ? ` · "${l.note}"` : ''}
                </Text>
              </View>
            ))}
          </Card>
        </View>
      ) : null}

      <View style={{ gap: 8 }}>
        <Label>Team settings</Label>
        {renaming ? (
          <Card>
            <Field label="Team name" value={newName} onChangeText={setNewName} autoFocus maxLength={60} />
            <Row>
              <View style={{ flex: 1 }}>
                <Button kind="ghost" title="Cancel" onPress={() => setRenaming(false)} />
              </View>
              <View style={{ flex: 1 }}>
                <Button
                  title="Save"
                  disabled={!newName.trim()}
                  onPress={() => act(async () => { await t.renameTeam(team.id, newName); setRenaming(false); })}
                />
              </View>
            </Row>
          </Card>
        ) : (
          <Button kind="ghost" title="Rename team" onPress={() => { setNewName(team.name); setRenaming(true); }} />
        )}
        <Button
          kind="danger"
          title="Delete team"
          onPress={() =>
            showAlert(`Delete ${team.name}?`, 'Athletes lose this team workout and their logs for this team are removed.', [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Delete',
                style: 'destructive',
                onPress: () => act(async () => { await t.deleteTeam(team.id); router.back(); }),
              },
            ])
          }
        />
      </View>
    </ScrollView>
  );
}
