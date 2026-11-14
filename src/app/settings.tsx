import { router } from 'expo-router';
import { View } from 'react-native';
import { showAlert } from '../lib/dialog';
import { useState } from 'react';

import Constants from 'expo-constants';
import { PERM_LABELS } from '../components/Consent';
import YourChoices, { DEFAULT_CHOICES } from '../components/YourChoices';
import DeleteAccountDialog from '../components/DeleteAccountDialog';
import { Body, Button, Card, Chip, ChipRow, colors, Field, H2, Label, Lockup, Row, Screen, StatusChip, Text } from '../components/ui';
import { BoardNameMode, boardName, isDemoMode, PERM_KEYS, syncConfigProblem } from '../lib/backend';
import { LEGAL_TITLES, LegalPage, openLegal } from '../lib/legal';
import { useStore } from '../lib/store';
import { useTeams } from '../lib/team';
import { POSITIONS } from '../lib/types';
import { NUTRITION_DISCLAIMER } from '../lib/nutrition';
import { followsLowerLevel, ownLevel } from '../lib/athlete';
import { possessive } from '../lib/util';
import { levelLine } from '../components/VersionLine';
import HomeEquipmentSheet from '../components/HomeEquipmentSheet';
import { HOME_EQUIPMENT } from '../lib/generator';

/** G4 (Legal copy review §3). */
const HEAD_INJURY_LINE =
  "If you hit your head or have any signs of a concussion, stop training and tell your coach (and a parent or guardian if you're under 18). Follow your school's or club's concussion protocol. Only a licensed health care provider can clear you to return.";

export default function Settings() {
  const { data, setProfile, resetAll, setTheme, mutate } = useStore();
  const { account, teams, signOut, leaveTeam, deleteAccount, consentFor, setMyChoices, setBoardNameMode, setLiftProgram } = useTeams();
  const [savedChoices, setSavedChoices] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [homeSheet, setHomeSheet] = useState(false);
  const [name, setName] = useState(data.profile?.name ?? '');
  if (!data.profile) return null;
  const profile = data.profile;
  const coach = profile.role === 'coach';

  function leave(teamId: string) {
    const t = teams.find((x) => x.id === teamId)!;
    const rest = teams.filter((x) => x.id !== teamId);
    const wasProgram = t.isLiftProgram || (!teams.some((x) => x.isLiftProgram) && teams[0]?.id === teamId);
    leaveTeam(teamId)
      .then(() => {
        if (!wasProgram) return;
        // F15c: one-time notice on Today. The server falls back to the remaining (first-joined) team.
        const next = rest[0]; // listMyTeams is in joined order
        mutate((d) => ({
          ...d,
          leaveNotice: next
            ? `You left ${t.name}. You're now following ${possessive(next.name)} lift program.`
            : `You left ${t.name}. You're on your personal program now.`,
        }));
      })
      .catch(() => {});
  }

  function follow(teamId: string) {
    const t = teams.find((x) => x.id === teamId)!;
    showAlert(`Switch to ${possessive(t.name)} lift program?`, 'Starts with your next session. Your weight suggestions carry over.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Switch',
        onPress: () =>
          setLiftProgram(teamId)
            .then(() => showAlert(`Following ${possessive(t.name)} lift program from your next session.`))
            .catch(() => showAlert("Couldn't switch. Check your connection and try again.")),
      },
    ]);
  }

  function save() {
    setProfile({ ...profile, name: name.trim() || profile.name });
    router.back();
  }

  return (
    <Screen>
      <Field label="Name" value={name} onChangeText={setName} />
      {!coach ? (
        <>
          <Label>Position</Label>
          <ChipRow>
            {POSITIONS.map((p) => (
              <Chip key={p} label={p} selected={profile.position === p} onPress={() => setProfile({ ...profile, position: p })} />
            ))}
          </ChipRow>
        </>
      ) : null}
      <Button title="Save" onPress={save} />

      <Card>
        <H2>Appearance</H2>
        <ChipRow>
          <Chip label="Dark" selected={(data.theme ?? 'dark') === 'dark'} onPress={() => setTheme('dark')} />
          <Chip label="Light" selected={data.theme === 'light'} onPress={() => setTheme('light')} />
        </ChipRow>
      </Card>

      <Card>
        <H2>Account</H2>
        <Text style={{ fontSize: 13, color: isDemoMode ? colors.warning : colors.muted }}>
          {syncConfigProblem
            ? `Team sync: Off (${syncConfigProblem})`
            : isDemoMode
              ? 'Team sync: Demo mode (this device only)'
              : 'Team sync: On'}
        </Text>
        {account ? (
          <>
            <Body muted>
              Signed in as {account.email}
              {isDemoMode ? ' (demo mode, this device only)' : ''}.
            </Body>
            {!coach && teams.length ? (
              teams.map((t) => (
                <View key={t.id} style={{ gap: 6 }}>
                  <Row style={{ justifyContent: 'space-between' }}>
                    <View style={{ flex: 1, gap: 4 }}>
                      <Text style={{ fontWeight: '600' }}>{t.name}</Text>
                      {teams.length > 1 && t.isLiftProgram ? <StatusChip label="Lift program" /> : null}
                    </View>
                    <Button
                      small
                      kind="ghost"
                      title="Leave"
                      onPress={() =>
                        showAlert(`Leave ${t.name}?`, "You'll stop getting this team's workouts.", [
                          { text: 'Cancel', style: 'cancel' },
                          { text: 'Leave', style: 'destructive', onPress: () => leave(t.id) },
                        ])
                      }
                    />
                  </Row>
                  {teams.length > 1 && !t.isLiftProgram ? (
                    <Button small kind="secondary" title="Follow this team's lift program" onPress={() => follow(t.id)} />
                  ) : null}
                </View>
              ))
            ) : null}
            <Button kind="ghost" title="Sign out" onPress={() => signOut().then(() => router.back())} />
            <Button kind="danger" title="Delete my account" onPress={() => setDeleting(true)} />
            <DeleteAccountDialog
              visible={deleting}
              coach={coach}
              onCancel={() => setDeleting(false)}
              onDelete={async () => {
                await deleteAccount();
                setDeleting(false);
                resetAll(); // erase this phone's data too
                router.replace('/onboarding');
              }}
            />
          </>
        ) : (
          <>
            <Body muted>{coach ? 'Sign in to manage teams.' : 'Sign in to join your team.'}</Body>
            <Button kind="secondary" title="Sign in or create account" onPress={() => router.push('/account')} />
          </>
        )}
      </Card>

      {!coach && account && teams.length ? (
        <Card>
          <H2>Program</H2>
          {teams.map((t) => (
            <Text key={t.id} style={{ fontSize: 14 }}>
              {levelLine(t.name, t.myLevel ?? ownLevel(data), !!t.myLevelConfirmed)}
            </Text>
          ))}
          {followsLowerLevel(data) ? <Text style={{ fontSize: 14 }}>Your exercises follow the lower of your teams&apos; levels.</Text> : null}
          <Text style={{ fontSize: 13, color: colors.muted }}>Only your coach can change your level.</Text>
        </Card>
      ) : null}

      {account ? null : (
      <Card>
        <H2>Mode</H2>
        <Body muted>You&apos;re using the app as {coach ? 'a coach' : 'an athlete'}.</Body>
        <Button
          kind="ghost"
          title={coach ? 'Switch to athlete mode' : 'Switch to coach mode'}
          // Coach accounts are for adults 18 and older.
          disabled={!coach && profile.isMinor !== false}
          onPress={() => {
            setProfile({ ...profile, role: coach ? 'athlete' : 'coach' });
            router.back();
          }}
        />
      </Card>
      )}

      {!coach && account && teams.length ? (
        <Card>
          <H2>Privacy</H2>
          <Label>Show me on boards as</Label>
          <ChipRow>
            {(['short', 'initials', 'hidden'] as BoardNameMode[]).map((mode) => (
              <Chip
                key={mode}
                label={mode === 'hidden' ? 'Hidden' : boardName(account.name || profile.name, mode) ?? ''}
                selected={(account.boardNameMode ?? 'short') === mode}
                onPress={() => setBoardNameMode(mode).catch(() => {})}
              />
            ))}
          </ChipRow>
          <Text style={{ fontSize: 13, color: colors.muted }}>Boards never show your full last name, weights, tests, or check-ins.</Text>
          {account.isMinor === false ? (
            <>
              <Label>Your choices</Label>
              <YourChoices
                key={JSON.stringify(consentFor(teams[0].id))}
                initial={
                  consentFor(teams[0].id)?.participation && teams[0].myConsentVersion === 2
                    ? (({ participation: _p, ...rest }) => rest)(consentFor(teams[0].id)!)
                    : DEFAULT_CHOICES
                }
                saveLabel={savedChoices ? 'Saved' : 'Save choices'}
                onSave={async (c) => {
                  await setMyChoices(c);
                  setSavedChoices(true);
                }}
              />
            </>
          ) : (
            <Text style={{ fontSize: 13, color: colors.muted }}>Your coach records your other choices from your parent&apos;s form.</Text>
          )}
        </Card>
      ) : null}

      <Card>
        <H2>Your data</H2>
        <Body muted>{account ? 'Your profile and team workouts sync with your team. Body weight and personal notes stay on this phone.' : 'Everything is stored only on this phone. Nothing is uploaded.'}</Body>
        {!coach && account
          ? teams.map((t) => {
              const p = consentFor(t.id);
              if (!p) return null;
              return (
                <View key={t.id} style={{ gap: 2 }}>
                  <Text style={{ fontSize: 14, fontWeight: '600' }}>
                    {account.isMinor === false ? `Your choices${teams.length > 1 ? ` · ${t.name}` : ''}` : `Parent consent${teams.length > 1 ? ` · ${t.name}` : ''}`}
                  </Text>
                  {account.isMinor !== false && !p.participation ? <Text style={{ fontSize: 14 }}>Waiting for your parent&apos;s form.</Text> : null}
                  {PERM_KEYS.map((k) => (
                    <Text key={k} style={{ fontSize: 14 }}>
                      {`${PERM_LABELS[k]}: ${p[k] ? 'on' : 'off'}`}
                    </Text>
                  ))}
                </View>
              );
            })
          : null}
        <Button
          kind="danger"
          title="Erase all data"
          onPress={() =>
            showAlert('Erase everything?', 'This deletes your programs, workouts and settings from this phone.', [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Erase',
                style: 'destructive',
                onPress: () => {
                  signOut().catch(() => {});
                  resetAll();
                  router.replace('/onboarding');
                },
              },
            ])
          }
        />
      </Card>

      {!coach ? (
        <Card>
          <H2>Home equipment</H2>
          <Text style={{ fontSize: 14 }}>
            {(data.homeEquipment ?? []).length
              ? HOME_EQUIPMENT.filter((e) => data.homeEquipment!.includes(e.id)).map((e) => e.label).join(', ')
              : 'Bodyweight only'}
          </Text>
          <Text style={{ fontSize: 13, color: colors.muted }}>This stays on your phone. Your coach doesn&apos;t see it.</Text>
          <Button small kind="secondary" title="Change home equipment" onPress={() => setHomeSheet(true)} />
          {homeSheet ? <HomeEquipmentSheet onClose={() => setHomeSheet(false)} /> : null}
        </Card>
      ) : null}

      <Card>
        <H2>Safety</H2>
        <Body>{HEAD_INJURY_LINE}</Body>
        <Body muted style={{ fontSize: 13 }}>
          Training guidance is general education for healthy athletes. Learn new lifts with a qualified coach, and stop if anything hurts.
        </Body>
      </Card>

      <Card>
        <H2>Legal</H2>
        {(['privacy', 'terms', 'consent'] as LegalPage[]).map((p) => (
          <Button key={p} kind="ghost" title={LEGAL_TITLES[p]} onPress={() => openLegal(p)} />
        ))}
      </Card>

      <Card style={{ alignItems: 'center', paddingVertical: 24 }}>
        <Lockup badge={96} />
        <Text style={{ fontSize: 12, color: colors.faint }}>Version {(Constants.expoConfig?.version ?? '1.0.0').replace(/\.0$/, '')}</Text>
      </Card>

      <Body muted style={{ fontSize: 12 }}>{NUTRITION_DISCLAIMER}</Body>
    </Screen>
  );
}
