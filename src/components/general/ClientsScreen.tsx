import { router, Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { Platform, Pressable, RefreshControl, ScrollView, View } from 'react-native';
import type { Team } from '../../lib/backend';
import { isDemoMode } from '../../lib/backend';
import { clientRow, sortRows, SortBy } from '../../lib/clients';
import { showAlert } from '../../lib/dialog';
import { GATE, gateState, goalLabel, LEGAL, programLine } from '../../lib/general';
import { LEVEL_NAME } from '../../lib/athlete';
import { shareClientInvite } from '../../lib/share';
import { useStore } from '../../lib/store';
import { ALL, isDraftKey, summarizeReadiness, useTeams } from '../../lib/team';
import EffortBoard from '../EffortBoard';
import StationControls from '../StationControls';
import { BoardColor } from '../TeamSettingsCard';
import Sheet from '../Sheet';
import { Body, Button, Card, Checkbox, Chip, ChipRow, colors, display, Field, H2, Icon, Label, Note, Pill, Row, StatusChip, Text, Toggle } from '../ui';
import { GateBanner } from './TrainerTerms';
import NewProgramSheet from './NewProgramSheet';

/**
 * 2.3.0 trainer home for a general team (F37 Clients, F35 groups, programs, F32 gate, invite, settings). Volleyball
 * teams never render this (team/[id] keeps the 2.2.1 screen for them).
 */
export default function ClientsScreen({ team }: { team: Team }) {
  const { data, mutate } = useStore();
  const t = useTeams();
  const [tab, setTab] = useState<'clients' | 'effort'>('clients');
  const [sort, setSort] = useState<SortBy>('flags');
  const [newProgram, setNewProgram] = useState(false);
  const [groupSheet, setGroupSheet] = useState<{ id: string | null; name: string; editing: 'name' | 'clients' } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const status = t.trainerStatus[team.id];
  const seen = (data.openSeen ?? []).includes(team.id);
  const gate = gateState(status, seen);
  const open = gate === 'open' || gate === 'terms';
  const [openedBanner, setOpenedBanner] = useState(false);
  // F32b: the first time the team shows as open on this device. Also remembers it, so a later clear reads as "paused".
  useEffect(() => {
    if (status?.verifiedAt && !seen) {
      mutate((d) => ({ ...d, openSeen: [...new Set([...(d.openSeen ?? []), team.id])] }));
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setOpenedBanner(true);
      showAlert(GATE.opened);
    }
  }, [status?.verifiedAt, seen, team.id, mutate]);

  const roster = t.members[team.id] ?? [];
  const groups = t.groups[team.id] ?? [];
  const logs = t.logs[team.id] ?? [];
  const today = t.readiness[team.id] ?? [];
  const rows = sortRows(roster.map((m) => clientRow(team, m, data.programs, logs, today)), sort);
  const programs = data.programs.filter((p) => p.teamId === team.id);
  const drafts = programs.filter((p) => isDraftKey(p.groupKey));
  const posted = programs.filter((p) => !isDraftKey(p.groupKey));
  const targetLabel = (key?: string) =>
    key === ALL ? 'All my clients' : key?.startsWith('client:') ? roster.find((m) => m.userId === key.slice(7))?.name ?? 'A former client' : groups.find((g) => g.id === key)?.name ?? 'Group';
  const sharers = roster.filter((m) => m.perms.shareCheckins);
  const ready = summarizeReadiness(today.filter((r) => sharers.some((m) => m.userId === r.userId)), sharers.length);
  const lightToday = !!data.teamCalendars?.[team.id]?.lightDates[ALL]?.includes(new Date().toISOString().slice(0, 10));

  async function act(fn: () => Promise<void>, done?: string) {
    setError(null);
    try {
      await fn();
      if (done) showAlert(done);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.');
    }
  }

  const invite = () => shareClientInvite(team.name, team.joinCode, t.account?.name);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ padding: 16, paddingBottom: 48, gap: 16 }}
      contentInsetAdjustmentBehavior="automatic"
      refreshControl={<RefreshControl refreshing={t.syncing} onRefresh={t.refresh} tintColor={colors.muted} />}
      keyboardShouldPersistTaps="handled"
    >
      <Stack.Screen options={{ title: team.name }} />
      <GateBanner teamId={team.id} state={gate} />
      {openedBanner && gate === 'open' ? (
        <Card>
          <Text style={{ fontSize: 15, fontWeight: '600' }}>{GATE.opened}</Text>
          <Row>
            <View style={{ flex: 1 }}>
              <Button small title="Share code" icon="square.and.arrow.up" onPress={invite} />
            </View>
            <View style={{ flex: 1 }}>
              <Button small kind="ghost" title="Dismiss" onPress={() => setOpenedBanner(false)} />
            </View>
          </Row>
        </Card>
      ) : null}
      {t.lastError ? <Text style={{ color: colors.errorText, fontSize: 13 }}>Couldn&apos;t load your clients. Pull to refresh.</Text> : null}
      {error ? <Text style={{ color: colors.errorText, fontSize: 13 }}>{error}</Text> : null}

      <ChipRow>
        <Chip label="Clients" selected={tab === 'clients'} onPress={() => setTab('clients')} />
        <Chip label="Effort" selected={tab === 'effort'} onPress={() => setTab('effort')} />
      </ChipRow>
      {tab === 'effort' ? (
        team.settings.effortBoard ? (
          <EffortBoard teamId={team.id} viewer="coach" />
        ) : (
          <Card>
            <Text style={{ fontSize: 14, color: colors.muted }}>The effort board is off. Turn it on under Clients → Settings → Boards.</Text>
            <EffortBoard teamId={team.id} viewer="coach" />
          </Card>
        )
      ) : null}

      {tab === 'clients' ? (
        <>
          {/* ---------- F37 Clients ---------- */}
          <Row style={{ justifyContent: 'space-between' }}>
            <Label>{`Clients · ${roster.length}`}</Label>
            <View style={{ width: 160 }}>
              <Button small kind="secondary" title="Invite clients" disabled={!open} onPress={() => router.push({ pathname: '/invite', params: { teamId: team.id } })} />
            </View>
          </Row>
          {roster.length ? (
            <ChipRow>
              <Text style={{ fontSize: 13, color: colors.muted, alignSelf: 'center' }}>Sort</Text>
              <Chip label="Name" selected={sort === 'name'} onPress={() => setSort('name')} />
              <Chip label="Last session" selected={sort === 'last'} onPress={() => setSort('last')} />
              <Chip label="Flags" selected={sort === 'flags'} onPress={() => setSort('flags')} />
            </ChipRow>
          ) : null}
          {t.syncing && !t.members[team.id] ? (
            <Card>
              {[0, 1, 2, 3, 4].map((i) => (
                <View key={i} style={{ height: 48, borderRadius: 8, backgroundColor: colors.raised }} />
              ))}
            </Card>
          ) : roster.length === 0 ? (
            <Card>
              <Body muted>{open ? 'No clients yet. Share your code to invite them.' : GATE.codeDimmed}</Body>
              {open ? <Button title="Invite clients" onPress={() => router.push({ pathname: '/invite', params: { teamId: team.id } })} /> : null}
            </Card>
          ) : (
            <Card style={{ gap: 0, paddingVertical: 4 }}>
              {rows.map((r, i) => (
                <Pressable
                  key={r.member.userId}
                  accessibilityRole="button"
                  accessibilityLabel={`${r.member.name}. ${r.line}. ${r.checkin}. ${r.flags.map((f) => f.label).join('. ')}`}
                  onPress={() => router.push({ pathname: '/client', params: { teamId: team.id, userId: r.member.userId } })}
                  style={{ minHeight: 64, paddingVertical: 12, borderTopWidth: i ? 1 : 0, borderTopColor: colors.line, gap: 4 }}
                >
                  <Row style={{ justifyContent: 'space-between' }}>
                    <Row style={{ gap: 8, flex: 1, flexWrap: 'wrap' }}>
                      <Text style={{ fontSize: 16, fontWeight: '600' }}>{r.member.name}</Text>
                      <StatusChip label={r.member.levelConfirmed ? LEVEL_NAME[r.member.level ?? 1] : 'Level not confirmed'} />
                    </Row>
                    <Icon name="chevron.right" size={14} color={colors.faint} />
                  </Row>
                  <Text style={{ fontSize: 13, color: colors.muted }}>{r.line}</Text>
                  <Text style={{ fontSize: 13, color: colors.muted }}>{r.checkin}</Text>
                  {r.flags.length ? (
                    <Row style={{ gap: 6, flexWrap: 'wrap' }}>
                      {r.flags.map((f) => (
                        <StatusChip key={f.label} label={`${f.tone === 'warning' ? '! ' : '· '}${f.label}`} tone={f.tone} />
                      ))}
                    </Row>
                  ) : null}
                  {r.flags.filter((f) => f.line).map((f) => (
                    <Text key={f.label} style={{ fontSize: 12, color: f.tone === 'warning' ? colors.warningText : colors.muted }}>{f.line}</Text>
                  ))}
                </Pressable>
              ))}
            </Card>
          )}

          {ready.suggest ? (
            <Card>
              <Note>Several clients in this class are run down. Consider a lighter session today. It&apos;s your call.</Note>
              <Button
                small
                kind={lightToday ? 'ghost' : 'primary'}
                title={lightToday ? 'Undo lighter day' : 'Lighten today for everyone'}
                onPress={() => act(() => t.setLightDay(team.id, ALL, new Date().toISOString().slice(0, 10), !lightToday))}
              />
            </Card>
          ) : null}

          {/* ---------- Programs ---------- */}
          <View style={{ gap: 8 }}>
            <Label>Programs</Label>
            <Text style={{ fontSize: 13, color: colors.muted }}>Build a program, then post it to all your clients, a group, or one client. Clients get the new program after you post.</Text>
            {[...drafts, ...posted].map((p) => (
              <Pressable key={p.id} accessibilityRole="button" onPress={() => router.push(`/program/${p.id}`)}>
                <Card>
                  <Row style={{ justifyContent: 'space-between' }}>
                    <View style={{ flex: 1, gap: 4 }}>
                      <Text style={{ fontWeight: '600', fontSize: 16 }}>{p.name}</Text>
                      <Text style={{ fontSize: 13, color: colors.muted }}>
                        {isDraftKey(p.groupKey) ? `${goalLabel(p.goal)} · Draft, not posted` : `${targetLabel(p.groupKey)} · ${programLine(p)}`}
                      </Text>
                      {p.unposted && !isDraftKey(p.groupKey) ? <Pill text="Changes not posted" bg={colors.day.game} /> : null}
                    </View>
                    <Icon name="chevron.right" size={14} color={colors.faint} />
                  </Row>
                </Card>
              </Pressable>
            ))}
            {!programs.length ? <Body muted>No programs yet.</Body> : null}
            <Button title="New program" icon="plus" onPress={() => setNewProgram(true)} />
            {!open ? <Text style={{ fontSize: 13, color: colors.muted }}>{GATE.cantPost}</Text> : null}
          </View>

          {/* ---------- F35 Groups ---------- */}
          <View style={{ gap: 8 }}>
            <Label>Groups</Label>
            {groups.length === 0 ? <Body muted>No groups yet. Groups help you post one program to a class.</Body> : null}
            {groups.map((g) => {
              const n = roster.filter((m) => m.groupId === g.id).length;
              const gp = posted.find((p) => p.groupKey === g.id);
              return (
                <Card key={g.id}>
                  <Text style={{ fontSize: 16, fontWeight: '600' }}>{g.name}</Text>
                  <Text style={{ fontSize: 13, color: colors.muted }}>{`${n} ${n === 1 ? 'client' : 'clients'} · ${gp ? `Program: ${programLine(gp)}` : 'No program.'}`}</Text>
                  <Row style={{ gap: 6 }}>
                    <View style={{ flex: 1 }}>
                      <Button small kind="ghost" title="Rename" onPress={() => setGroupSheet({ id: g.id, name: g.name, editing: 'name' })} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Button small kind="ghost" title="Edit clients" onPress={() => setGroupSheet({ id: g.id, name: g.name, editing: 'clients' })} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Button
                        small
                        kind="danger"
                        title="Delete"
                        onPress={() =>
                          showAlert(`Delete ${g.name}?`, 'Clients stay on your team. A program posted to this group stops for them.', [
                            { text: 'Cancel', style: 'cancel' },
                            { text: 'Delete', style: 'destructive', onPress: () => act(() => t.deleteGroup(g.id)) },
                          ])
                        }
                      />
                    </View>
                  </Row>
                </Card>
              );
            })}
            <Button kind="ghost" small title="Create group" icon="plus" onPress={() => setGroupSheet({ id: null, name: '', editing: 'name' })} />
          </View>

          {/* ---------- Code ---------- */}
          <Card style={!open ? { opacity: 0.6 } : undefined}>
            <Label>Your code</Label>
            <Text selectable={open} style={[display(32), { textAlign: 'center', paddingVertical: 4 }]}>
              {team.joinCode}
            </Text>
            <Text style={{ fontSize: 13, color: colors.muted, textAlign: 'center' }}>
              {open ? 'Clients scan the QR code, or make an account and enter this code.' : GATE.codeDimmed}
            </Text>
            {isDemoMode ? <Note>Demo mode: clients on other phones can&apos;t join yet. Connect Supabase first (see the README).</Note> : null}
            <Row>
              <View style={{ flex: 1 }}>
                <Button title="Show QR code" disabled={!open} onPress={() => router.push({ pathname: '/invite', params: { teamId: team.id } })} />
              </View>
              <View style={{ flex: 1 }}>
                <Button kind="secondary" title="Share link" icon="square.and.arrow.up" disabled={!open} onPress={invite} />
              </View>
            </Row>
          </Card>

          {/* ---------- Stations (as built), class board, racks ---------- */}
          <StationControls team={team} />
          <Button
            kind="secondary"
            title="Open class board"
            onPress={() => {
              if (Platform.OS === 'web' && typeof window !== 'undefined') window.open(`${window.location.pathname.replace(/\/team\/[^/]+\/?$/, '')}/board/${team.id}`, '_blank', 'noopener');
              else router.push(`/board/${team.id}`);
            }}
          />
          <Text style={{ fontSize: 13, color: colors.muted }}>Show the board only on your own device or a screen you control, to your own class.</Text>
          <Button kind="secondary" title="Racks" onPress={() => router.push({ pathname: '/racks', params: { teamId: team.id } })} />
          {programs[0] ? (
            <Button kind="secondary" title="Calendar" icon="calendar" onPress={() => router.push({ pathname: '/calendar', params: { programId: programs[0].id } })} />
          ) : null}

          {/* ---------- Settings ---------- */}
          <GeneralSettings team={team} />
        </>
      ) : null}

      {newProgram ? <NewProgramSheet team={team} onClose={() => setNewProgram(false)} /> : null}
      {groupSheet ? <GroupSheet team={team} state={groupSheet} onClose={() => setGroupSheet(null)} /> : null}
    </ScrollView>
  );
}

/** F35 create / rename / edit clients. A client is in one group per team; moving shows the warning line. */
function GroupSheet({ team, state, onClose }: { team: Team; state: { id: string | null; name: string; editing: 'name' | 'clients' }; onClose: () => void }) {
  const t = useTeams();
  const roster = t.members[team.id] ?? [];
  const groups = t.groups[team.id] ?? [];
  const [name, setName] = useState(state.name);
  const [picked, setPicked] = useState<string[]>(state.id ? roster.filter((m) => m.groupId === state.id).map((m) => m.userId) : []);
  const [step, setStep] = useState<'name' | 'clients'>(state.editing);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    setError(null);
    try {
      let id = state.id;
      if (!id) id = (await t.createGroup(team.id, name.trim())).id;
      else if (name.trim() !== state.name) await t.renameGroup(id, name.trim());
      if (step === 'clients' || !state.id) {
        for (const m of roster) {
          const want = picked.includes(m.userId);
          if (want && m.groupId !== id) await t.assignGroup(team.id, m.userId, id);
          if (!want && m.groupId === id) await t.assignGroup(team.id, m.userId, null);
        }
      }
      onClose();
    } catch {
      setError("Couldn't save the group. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet title={state.id ? state.name : 'Create group'} onClose={onClose}>
      {step === 'name' ? (
        <>
          <Field label="Group name" placeholder="Mon/Wed 6am class" value={name} onChangeText={setName} maxLength={30} autoFocus />
          <Text style={{ fontSize: 13, color: colors.muted }}>{LEGAL.groupHelper}</Text>
          {state.id ? (
            <Button title={busy ? 'Saving…' : 'Save'} disabled={!name.trim() || busy} onPress={save} />
          ) : (
            <Button title="Create" disabled={!name.trim()} onPress={() => setStep('clients')} />
          )}
        </>
      ) : (
        <>
          <Label>Add clients</Label>
          {roster.length === 0 ? <Body muted>No clients yet.</Body> : null}
          {roster.map((m) => {
            const other = m.groupId && m.groupId !== state.id ? groups.find((g) => g.id === m.groupId) : undefined;
            const on = picked.includes(m.userId);
            return (
              <View key={m.userId} style={{ gap: 2 }}>
                <Checkbox checked={on} onChange={(v) => setPicked((s) => (v ? [...s, m.userId] : s.filter((x) => x !== m.userId)))} label={m.name}>
                  <Text style={{ fontSize: 15 }}>{m.name}</Text>
                </Checkbox>
                {other && on ? <Text style={{ fontSize: 13, color: colors.warningText }}>{`In ${other.name}. Saving moves them here.`}</Text> : null}
              </View>
            );
          })}
          <Button title={busy ? 'Saving…' : 'Save'} disabled={busy || !name.trim()} onPress={save} />
        </>
      )}
      {error ? <Text style={{ fontSize: 13, color: colors.errorText }}>{error}</Text> : null}
      <Button kind="ghost" title="Cancel" onPress={onClose} />
    </Sheet>
  );
}

/** Team settings for a general team: type (read-only, Legal T4), boards (effort board off by default), gym equipment, rename, delete. */
function GeneralSettings({ team }: { team: Team }) {
  const t = useTeams();
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(team.name);
  const [error, setError] = useState<string | null>(null);
  return (
    <View style={{ gap: 8 }}>
      <Label>Settings</Label>
      <Card>
        <Text style={{ fontSize: 15 }}>Type: Training clients (adults 18+)</Text>
      </Card>
      <Card>
        <H2>Boards</H2>
        <Row style={{ justifyContent: 'space-between', minHeight: 44 }}>
          <Text style={{ fontSize: 15, flex: 1 }}>Effort board</Text>
          <Toggle accessibilityLabel="Effort board" value={team.settings.effortBoard} onValueChange={(v) => t.updateTeamSettings(team.id, { effortBoard: v }).catch(() => setError("Couldn't save. Try again."))} />
        </Row>
        <Text style={{ fontSize: 12, color: colors.muted }}>Off by default. It counts sessions, consistency, and streaks only, never weights or check-ins.</Text>
        <BoardColor team={team} />
      </Card>
      <Button kind="secondary" title="Gym equipment" onPress={() => router.push({ pathname: '/gym', params: { teamId: team.id } })} />
      {renaming ? (
        <Card>
          <Field label="Team name" value={name} onChangeText={setName} autoFocus maxLength={40} />
          <Row>
            <View style={{ flex: 1 }}>
              <Button kind="ghost" title="Cancel" onPress={() => setRenaming(false)} />
            </View>
            <View style={{ flex: 1 }}>
              <Button
                title="Save"
                disabled={!name.trim()}
                onPress={() =>
                  t
                    .renameTeam(team.id, name)
                    .then(() => setRenaming(false))
                    .catch(() => setError("Couldn't save. Try again."))
                }
              />
            </View>
          </Row>
        </Card>
      ) : (
        <Button kind="ghost" title="Rename team" onPress={() => setRenaming(true)} />
      )}
      {error ? <Text style={{ fontSize: 13, color: colors.errorText }}>{error}</Text> : null}
      <Button
        kind="danger"
        title="Delete team"
        onPress={() =>
          showAlert(`Delete ${team.name}?`, 'Programs you posted are removed. Clients keep the history on their phones.', [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Delete',
              style: 'destructive',
              onPress: () =>
                t
                  .deleteTeam(team.id)
                  .then(() => router.back())
                  .catch(() => setError("Couldn't delete the team. Try again.")),
            },
          ])
        }
      />
    </View>
  );
}
