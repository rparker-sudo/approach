import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { rosterChip } from '../../components/Consent';
import ConsentSheet from '../../components/ConsentSheet';
import { weekStart } from '../../components/TeamHome';
import { Body, Button, Card, Chip, ChipRow, colors, display, Field, Icon, Label, Note, Pill, Row, StatusChip, Text } from '../../components/ui';
import { canCheckIn, isDemoMode } from '../../lib/backend';
import { openLegal } from '../../lib/legal';
import { dateKey, today } from '../../lib/calendar';
import { showAlert } from '../../lib/dialog';
import { shareTeamInvite } from '../../lib/share';
import { useStore } from '../../lib/store';
import { ALL, summarizeReadiness, teamProgramId, useTeams } from '../../lib/team';
import { PHASES } from '../../lib/types';
import { liftDayCount } from '../../lib/generator';
import { formatDate } from '../../lib/util';

export default function TeamScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data } = useStore();
  const t = useTeams();
  const team = t.teams.find((x) => x.id === id);
  const [busy, setBusy] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [newName, setNewName] = useState('');
  const [addingGroup, setAddingGroup] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [openMember, setOpenMember] = useState<string | null>(null);
  const [consentFor, setConsentFor] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!team) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, padding: 16 }}>
        <Body muted>{t.syncing ? 'Loading team…' : 'Team not found.'}</Body>
      </View>
    );
  }

  const groups = t.groups[team.id] ?? [];
  const roster = t.members[team.id] ?? [];
  const logs = t.logs[team.id] ?? [];
  const since = weekStart().toISOString();
  const day = dateKey(today());
  const cal = data.teamCalendars?.[team.id];
  const lightToday = (key: string) => !!cal?.lightDates[key]?.includes(day);
  const groupName_ = (gid: string | null | undefined) => (gid ? groups.find((g) => g.id === gid)?.name ?? 'Whole team' : 'Whole team');
  const workoutKeys = [ALL, ...groups.map((g) => g.id)];
  const anyUnposted = t.hasUnposted(team.id);
  const firstProgram = data.programs.find((p) => p.teamId === team.id);

  // Readiness: whole team, and per group. Only athletes with check-in consent (or adults) count.
  const checkins = t.readiness[team.id] ?? [];
  const canCheck = roster.filter((m) => canCheckIn(m.consentStatus));
  const withoutConsent = roster.length - canCheck.length;
  const overall = summarizeReadiness(checkins, canCheck.length);
  const perGroup = groups.map((g) => {
    const ids = canCheck.filter((m) => m.groupId === g.id).map((m) => m.userId);
    return { g, s: summarizeReadiness(checkins.filter((r) => ids.includes(r.userId)), ids.length) };
  });

  async function act(fn: () => Promise<void>, done?: string) {
    setBusy(true);
    setError(null);
    try {
      await fn();
      if (done) showAlert(done);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  }

  function lightenButton(key: string, label: string) {
    const on = lightToday(key);
    return (
      <Button
        key={key}
        small
        kind={on ? 'ghost' : 'primary'}
        title={on ? `Undo lighter day (${label})` : `Lighten today: ${label}`}
        disabled={busy}
        onPress={() =>
          act(
            () => t.setLightDay(team!.id, key, day, !on),
            on ? `Back to the normal workout for ${label}.` : `${label} has a lighter workout today: fewer sets, easy effort.`,
          )
        }
      />
    );
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
      <ConsentSheet
        member={roster.find((m) => m.userId === consentFor) ?? null}
        onClose={() => setConsentFor(null)}
        onSave={(status) => t.recordConsent(team.id, consentFor!, status)}
      />
      {error ? <Text style={{ color: colors.error, fontSize: 13 }}>{error}</Text> : null}

      {anyUnposted ? (
        <Card>
          <Text style={{ fontWeight: '600' }}>Changes not posted</Text>
          <Text style={{ fontSize: 13, color: colors.muted }}>Athletes get new workouts, days and calendar dates after you post.</Text>
          <Button title={busy ? 'Posting…' : 'Post all changes'} icon="square.and.arrow.up" disabled={busy} onPress={() => act(() => t.postTeam(team.id), 'Posted. Your athletes have the latest plan.')} />
        </Card>
      ) : null}

      {/* ---------- Readiness ---------- */}
      <Card>
        <Label>Today's readiness</Label>
        {roster.length === 0 ? (
          <Body muted>Athletes check in on their Lift screen each day: sleep, soreness, energy and pain.</Body>
        ) : (
          <>
            <Text style={{ fontSize: 16, fontWeight: '600' }}>
              {overall.checkedIn} of {canCheck.length} checked in
              {withoutConsent ? ` · ${withoutConsent} without check-in consent` : ''}
            </Text>
            {overall.checkedIn ? (
              <Text style={{ fontSize: 13, color: colors.muted }}>
                {overall.low.length} run down · {overall.pain.length} pain
              </Text>
            ) : null}
            {overall.suggest ? <Note>Several athletes are run down. Consider a lighter workout today. It's your call.</Note> : null}
            {perGroup
              .filter((x) => x.s.suggest)
              .map((x) => (
                <Note key={x.g.id}>{`${x.g.name}: ${x.s.low.length} of ${x.s.checkedIn} checked in are run down.`}</Note>
              ))}
            {overall.pain.length || overall.low.length ? (
              <View style={{ gap: 4 }}>
                <Text style={{ fontSize: 13, color: colors.muted }}>Check in with</Text>
                {[...overall.pain, ...overall.low.filter((r) => !r.pain)].map((r) => (
                  <Text key={r.userId} style={{ fontSize: 13 }}>
                    {r.userName}
                    <Text style={{ color: colors.muted }}>
                      {' '}
                      · sleep {r.sleep}/5 · soreness {r.soreness}/5 · energy {r.energy}/5
                      {r.pain ? ' · pain' : ''}
                    </Text>
                  </Text>
                ))}
              </View>
            ) : null}
            <View style={{ gap: 8 }}>
              {(overall.suggest || lightToday(ALL)) ? lightenButton(ALL, 'whole team') : null}
              {perGroup.filter((x) => x.s.suggest || lightToday(x.g.id)).map((x) => lightenButton(x.g.id, x.g.name))}
              {!overall.suggest && !lightToday(ALL) ? (
                <Text style={{ fontSize: 12, color: colors.faint }}>
                  You can lighten today anytime from here: <Text onPress={() => act(() => t.setLightDay(team.id, ALL, day, true), 'The whole team has a lighter workout today.')} style={{ fontSize: 12, textDecorationLine: 'underline', color: colors.muted }}>lighten for the whole team</Text>.
                </Text>
              ) : null}
            </View>
          </>
        )}
      </Card>

      {/* ---------- Team code ---------- */}
      <Card>
        <Label>Team code</Label>
        <Text selectable style={[display(32), { textAlign: 'center', paddingVertical: 4 }]}>
          {team.joinCode}
        </Text>
        <Text style={{ fontSize: 13, color: colors.muted, textAlign: 'center' }}>
          Athletes scan the QR code, or make an account and enter this code.
        </Text>
        {isDemoMode ? <Note>Demo mode: athletes on other phones can't join yet. Connect Supabase first (see the README).</Note> : null}
        <Row>
          <View style={{ flex: 1 }}>
            <Button title="Show QR code" onPress={() => router.push({ pathname: '/invite', params: { teamId: team.id } })} />
          </View>
          <View style={{ flex: 1 }}>
            <Button kind="secondary" title="Share link" icon="square.and.arrow.up" onPress={() => shareTeamInvite(team.name, team.joinCode, t.account?.name)} />
          </View>
        </Row>
        <Button kind="ghost" small title="Print parent consent form" onPress={() => openLegal('consent')} />
        <Text style={{ fontSize: 12, color: colors.muted, textAlign: 'center' }}>
          Athletes under 18 can view the plan but can't log until you record their signed form.
        </Text>
      </Card>

      {/* ---------- Workouts by group ---------- */}
      <View style={{ gap: 8 }}>
        <Label>Workouts</Label>
        <Text style={{ fontSize: 13, color: colors.muted }}>
          Each group can have its own workout. Athletes not in a group get the Whole team workout. The season calendar is shared.
        </Text>
        {workoutKeys.map((key) => {
          const program = data.programs.find((p) => p.id === teamProgramId(team.id, key));
          const tp = t.postedFor(team.id, key);
          const label = key === ALL ? 'Whole team' : groups.find((g) => g.id === key)?.name ?? 'Group';
          const count = key === ALL ? roster.filter((m) => !m.groupId).length : roster.filter((m) => m.groupId === key).length;
          const needsPost = !!program && (program.unposted || !tp);
          return (
            <Card key={key}>
              <Row style={{ justifyContent: 'space-between' }}>
                <Text style={{ fontSize: 16, fontWeight: '600' }}>{label}</Text>
                <Text style={{ fontSize: 13, color: colors.muted }}>
                  {count} {count === 1 ? 'athlete' : 'athletes'}
                </Text>
              </Row>
              {program ? (
                <Pressable accessibilityRole="button" onPress={() => router.push(`/program/${program.id}`)}>
                  <Row style={{ justifyContent: 'space-between' }}>
                    <View style={{ flex: 1, gap: 4 }}>
                      <Text style={{ fontWeight: '600' }}>{program.name}</Text>
                      <Row style={{ gap: 6, flexWrap: 'wrap' }}>
                        <Pill text={PHASES.find((p) => p.id === program.phase)!.label} bg={colors.day.game} />
                        <Pill text={`${liftDayCount(program)} lift days`} />
                        <Pill text={needsPost ? 'Not posted' : `Posted ${formatDate(tp!.updatedAt)}`} />
                        {lightToday(key) || lightToday(ALL) ? <Pill text="Light today" /> : null}
                      </Row>
                    </View>
                    <Icon name="chevron.right" size={14} color={colors.faint} />
                  </Row>
                </Pressable>
              ) : (
                <Text style={{ fontSize: 13, color: colors.muted }}>No workout yet.</Text>
              )}
              <Row>
                <View style={{ flex: 1 }}>
                  <Button
                    small
                    kind={program ? 'ghost' : 'primary'}
                    title={program ? 'Rebuild' : 'Build workout'}
                    icon="wand.and.stars"
                    onPress={() => router.push({ pathname: '/builder', params: { teamId: team.id, groupKey: key, ...(program ? { programId: program.id } : {}) } })}
                  />
                </View>
                {needsPost ? (
                  <View style={{ flex: 1 }}>
                    <Button small title="Post" disabled={busy} onPress={() => act(() => t.postTeamProgram(team.id, key), `${label} has the new workout.`)} />
                  </View>
                ) : null}
              </Row>
              {key !== ALL ? (
                <Text
                  accessibilityRole="button"
                  onPress={() =>
                    showAlert(`Delete ${label}?`, 'Athletes in this group move to the Whole team workout.', [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Delete', style: 'destructive', onPress: () => act(() => t.deleteGroup(key)) },
                    ])
                  }
                  style={{ fontSize: 12, color: colors.faint }}
                >
                  Delete group
                </Text>
              ) : null}
            </Card>
          );
        })}
        {addingGroup ? (
          <Card>
            <Field placeholder="Group name, e.g. Middles" value={groupName} onChangeText={setGroupName} autoFocus maxLength={40} />
            <Row>
              <View style={{ flex: 1 }}>
                <Button kind="ghost" title="Cancel" onPress={() => setAddingGroup(false)} />
              </View>
              <View style={{ flex: 1 }}>
                <Button
                  title="Add group"
                  disabled={!groupName.trim() || busy}
                  onPress={() =>
                    act(async () => {
                      await t.createGroup(team.id, groupName);
                      setGroupName('');
                      setAddingGroup(false);
                    })
                  }
                />
              </View>
            </Row>
          </Card>
        ) : (
          <Row>
            <View style={{ flex: 1 }}>
              <Button kind="ghost" small title="Add group" icon="plus" onPress={() => setAddingGroup(true)} />
            </View>
            <View style={{ flex: 1 }}>
              <Button
                kind="ghost"
                small
                title="Groups by position"
                disabled={busy}
                onPress={() => act(() => t.autoGroupByPosition(team.id), 'Made Hitters, Middles, Setters and Liberos / DS, and placed athletes by position.')}
              />
            </View>
          </Row>
        )}
        {firstProgram ? (
          <Button
            kind="secondary"
            title="Season calendar"
            icon="calendar"
            onPress={() => router.push({ pathname: '/calendar', params: { programId: firstProgram.id } })}
          />
        ) : null}
      </View>

      {/* ---------- Roster ---------- */}
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
              const open = openMember === m.userId;
              const ci = checkins.find((r) => r.userId === m.userId);
              const chip = rosterChip(m.consentStatus);
              return (
                <View key={m.userId} style={{ paddingVertical: 12, borderTopWidth: i ? 1 : 0, borderTopColor: colors.line, gap: 8 }}>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => {
                      // A minor with no form recorded: tapping the row records consent (F3).
                      if (m.consentStatus === 'pending' && !open) setConsentFor(m.userId);
                      setOpenMember(open ? null : m.userId);
                    }}
                  >
                    <Row style={{ alignItems: 'flex-start' }}>
                      <View style={{ flex: 1, gap: 2 }}>
                        <Text style={{ fontSize: 16, fontWeight: '600' }}>{m.name}</Text>
                        {chip ? (
                          <Pressable
                            accessibilityRole="button"
                            accessibilityLabel={`${chip.label}. Parent consent for ${m.name}`}
                            onPress={() => setConsentFor(m.userId)}
                            hitSlop={12}
                            style={{ alignSelf: 'flex-start', paddingVertical: 2 }}
                          >
                            <StatusChip label={chip.label} tone={chip.tone} />
                          </Pressable>
                        ) : null}
                        <Text style={{ fontSize: 13, color: colors.muted }}>
                          {m.position ?? 'Position not set'} · {groupName_(m.groupId)}
                          {mine[0] ? ` · Last lift ${formatDate(mine[0].date)}` : ' · No lifts logged'}
                        </Text>
                        {ci ? (
                          <Text style={{ fontSize: 12, color: ci.pain ? colors.warning : colors.muted }}>
                            Today: sleep {ci.sleep} · soreness {ci.soreness} · energy {ci.energy}
                            {ci.pain ? ' · pain' : ''}
                          </Text>
                        ) : null}
                      </View>
                      <Pill text={`${week} this week`} achievement={week > 0} />
                    </Row>
                  </Pressable>
                  {open ? (
                    <View style={{ gap: 8 }}>
                      {chip ? (
                        <Button
                          small
                          kind="secondary"
                          title={m.consentStatus === 'pending' ? 'Record parent consent' : 'Change parent consent'}
                          onPress={() => setConsentFor(m.userId)}
                        />
                      ) : null}
                      <Text style={{ fontSize: 12, color: colors.muted }}>Group</Text>
                      <ChipRow>
                        <Chip label="Whole team" selected={!m.groupId} onPress={() => act(() => t.assignGroup(team.id, m.userId, null))} />
                        {groups.map((g) => (
                          <Chip key={g.id} label={g.name} selected={m.groupId === g.id} onPress={() => act(() => t.assignGroup(team.id, m.userId, g.id))} />
                        ))}
                      </ChipRow>
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
                        Remove from team
                      </Text>
                    </View>
                  ) : null}
                </View>
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
                  onPress={() =>
                    act(async () => {
                      await t.renameTeam(team.id, newName);
                      setRenaming(false);
                    })
                  }
                />
              </View>
            </Row>
          </Card>
        ) : (
          <Button
            kind="ghost"
            title="Rename team"
            onPress={() => {
              setNewName(team.name);
              setRenaming(true);
            }}
          />
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
                onPress: () =>
                  act(async () => {
                    await t.deleteTeam(team.id);
                    router.back();
                  }),
              },
            ])
          }
        />
      </View>
    </ScrollView>
  );
}
