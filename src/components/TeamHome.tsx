import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { backend, isDemoMode } from '../lib/backend';
import { useStore } from '../lib/store';
import { teamProgramId, useTeams } from '../lib/team';
import { formatDate } from '../lib/util';
import ScreenHeader from './ScreenHeader';
import { Body, Button, Card, colors, Field, H2, Icon, NetTape, Note, Pill, Row, Text } from './ui';

/** Monday 00:00 of this week. */
export function weekStart(d = new Date()) {
  const s = new Date(d);
  s.setHours(0, 0, 0, 0);
  s.setDate(s.getDate() - ((s.getDay() + 6) % 7));
  return s;
}

/** Coach home: the teams this coach manages. */
export default function TeamHome() {
  const { data } = useStore();
  const { account, teams, members, logs, postedFor, hasUnposted, syncing, lastError, refresh, createTeam } = useTeams();
  const insets = useSafeAreaInsets();
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function add() {
    setBusy(true);
    setError(null);
    try {
      const t = await createTeam(name);
      setName('');
      setAdding(false);
      router.push(`/team/${t.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't create the team.");
    } finally {
      setBusy(false);
    }
  }

  const since = weekStart().toISOString();

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ padding: 16, paddingTop: insets.top + 12, paddingBottom: 48, gap: 16 }}
      refreshControl={<RefreshControl refreshing={syncing} onRefresh={refresh} tintColor={colors.muted} />}
      keyboardShouldPersistTaps="handled"
    >
      <ScreenHeader title="Team" subtitle={account ? `Coach ${account.name}` : data.profile?.name} />

      {!account ? (
        <Card>
          <NetTape />
          <H2>Sign in to manage teams</H2>
          <Body muted>Teams need a coach account so athletes can join and get your workouts on their phones.</Body>
          <Button title="Sign in or create account" onPress={() => router.push('/account')} />
        </Card>
      ) : (
        <>
          {isDemoMode ? (
            <Note>Demo mode: teams live on this device only. Connect Supabase to sync with athletes' phones.</Note>
          ) : null}
          {lastError ? <Text style={{ color: colors.error, fontSize: 13 }}>{lastError}</Text> : null}
          {backend.needsUpdate?.() ? (
            <Note>
              Your database needs the 2.0 update for groups, the team calendar and check-ins. In Supabase → SQL Editor, run
              supabase/migrations/002_approach_2.sql (see the README). Everything else keeps working.
            </Note>
          ) : null}

          {teams.length === 0 && !adding ? (
            <Card>
              <NetTape />
              <H2>No teams yet</H2>
              <Body muted>Make a team for each roster, like Varsity or JV. Athletes join with the team's code.</Body>
            </Card>
          ) : null}

          {teams.map((t) => {
            const roster = members[t.id] ?? [];
            const weekLogs = (logs[t.id] ?? []).filter((l) => l.date >= since);
            const trained = new Set(weekLogs.map((l) => l.userId)).size;
            const local = data.programs.find((p) => p.id === teamProgramId(t.id));
            const tp = postedFor(t.id);
            const status = hasUnposted(t.id) && (local || tp) ? 'Changes not posted' : tp ? `Posted ${formatDate(tp.updatedAt)}` : 'No workout posted';
            const programName = local?.name ?? tp?.program.name;
            return (
              <Pressable key={t.id} accessibilityRole="button" onPress={() => router.push(`/team/${t.id}`)}>
                <Card>
                  <Row style={{ justifyContent: 'space-between' }}>
                    <View style={{ flex: 1, gap: 4 }}>
                      <H2>{t.name}</H2>
                      <Text style={{ fontSize: 13, color: colors.muted }}>
                        {roster.length} {roster.length === 1 ? 'athlete' : 'athletes'} · Code {t.joinCode}
                      </Text>
                    </View>
                    <Icon name="chevron.right" size={14} color={colors.faint} />
                  </Row>
                  <Row style={{ gap: 6, flexWrap: 'wrap' }}>
                    <Pill text={status} bg={status === 'Changes not posted' ? colors.day.game : undefined} />
                    {roster.length ? (
                      <Pill
                        text={`${trained}/${roster.length} trained this week`}
                        achievement={trained > 0 && trained === roster.length}
                      />
                    ) : null}
                  </Row>
                  {programName ? <Text style={{ fontSize: 13, color: colors.muted }}>{programName}</Text> : null}
                </Card>
              </Pressable>
            );
          })}

          {adding ? (
            <Card>
              <H2>New team</H2>
              <Field placeholder="Team name, e.g. Varsity" value={name} onChangeText={setName} autoFocus maxLength={60} />
              {error ? <Text style={{ color: colors.error, fontSize: 13 }}>{error}</Text> : null}
              <Row>
                <View style={{ flex: 1 }}>
                  <Button kind="ghost" title="Cancel" onPress={() => setAdding(false)} />
                </View>
                <View style={{ flex: 1 }}>
                  <Button title={busy ? 'Creating…' : 'Create'} disabled={!name.trim() || busy} onPress={add} />
                </View>
              </Row>
            </Card>
          ) : (
            <Button title="New team" icon="plus" onPress={() => setAdding(true)} />
          )}
        </>
      )}
    </ScrollView>
  );
}
