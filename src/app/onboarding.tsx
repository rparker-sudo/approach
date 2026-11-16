import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Body, Button, Card, colors, Field, H1, H2, Label, Lockup, NetTape, Note, OptionCard, Screen, Text } from '../components/ui';
import AccountForm from '../components/AccountForm';
import { AgeQuestion } from '../components/AgeGate';
import type { AgeAnswer } from '../lib/age';
import JoinTeamForm from '../components/JoinTeamForm';
import { LiftDayPicker, WeekEditor } from '../components/week';
import type { Team } from '../lib/backend';
import { backend } from '../lib/backend';
import { roleParam } from '../lib/signin';
import { useTeams } from '../lib/team';
import EquipmentPicker from '../components/EquipmentPicker';
import { ALL_EQUIPMENT } from '../lib/exercises';
import { generateProgram, liftDayCap, pickLiftDays } from '../lib/generator';
import { useStore } from '../lib/store';
import type { DayType, Equipment, Experience, Phase, Position, Role } from '../lib/types';
import { EXPERIENCE, PHASES, POSITIONS } from '../lib/types';

function useOnboardingAccount() {
  const { account } = useTeams();
  return {
    account,
    updatePosition: (position: Position) => {
      backend.updateAccount({ position }).catch(() => {});
    },
  };
}

// Practices only. Matches and tournaments go on the season calendar by date, since they change week to week.
const DEFAULT_WEEK: DayType[] = ['practice', 'practice', 'practice', 'practice', 'practice', 'off', 'off'];

type Step = 'welcome' | 'age' | 'role' | 'account' | 'join' | 'name' | 'position' | 'level' | 'week';

/**
 * Welcome → Log in (its own screen) or Create an account (2.2.1 §9, UX F1 v3.2). The age question is asked only on the
 * Create path, before any email, name or role; logging in never asks it.
 */
export default function Onboarding() {
  const { data, setProfile, saveProgram, block } = useStore();
  const [age, setAge] = useState<AgeAnswer | null>(null);
  const { account, updatePosition } = useOnboardingAccount();
  const [stepIndex, setStepIndex] = useState(0);
  const params = useLocalSearchParams<{ code?: string; role?: string; create?: string }>();
  const linkCode = typeof params.code === 'string' && params.code ? params.code : undefined;
  // From Log in's "New here? Create an account": straight to the age question.
  const startCreate = params.create === '1';
  // Opened from a team QR code/link: they're an athlete joining that team. From the website, `role` preselects the role
  // card, after the age question (unknown values are ignored).
  const [role, setRole] = useState<Role | null>(linkCode ? 'athlete' : roleParam(params.role));
  const [team, setTeam] = useState<Team | null>(null);
  const [name, setName] = useState('');
  const [position, setPosition] = useState<Position | null>(null);
  const [experience, setExperience] = useState<Experience>('beginner');
  const [phase, setPhase] = useState<Phase>('in');
  const [week, setWeekState] = useState<DayType[]>(DEFAULT_WEEK);
  const [liftDays, setLiftDaysState] = useState<number[]>(() => pickLiftDays(DEFAULT_WEEK, 2));
  const [equipment, setEquipment] = useState<Equipment[]>(ALL_EQUIPMENT);
  const [daysTouched, setDaysTouched] = useState(false);
  const setLiftDays = (d: number[]) => {
    setDaysTouched(true);
    setLiftDaysState(d);
  };
  const setWeek = (w: DayType[]) => {
    setWeekState(w);
    if (!daysTouched) setLiftDaysState(pickLiftDays(w, liftDays.length || 2));
  };

  const effectiveRole: Role | null = account?.role ?? role;
  const intro: Step[] = startCreate ? [] : ['welcome'];
  const steps: Step[] =
    effectiveRole === 'coach'
      ? [...intro, 'age', 'role', 'account']
      : [
          ...intro,
          'age',
          'role',
          'account',
          ...(account ? (['join'] as Step[]) : []),
          ...(!account ? (['name'] as Step[]) : []),
          // 2.3.0 F33: no position step for a general (trainer) team.
          ...(team?.kind === 'general' ? [] : (['position'] as Step[])),
          'level',
          ...(!team ? (['week'] as Step[]) : []),
        ];
  const step = steps[Math.min(stepIndex, steps.length - 1)];
  const isLast = stepIndex >= steps.length - 1;
  const next = () => setStepIndex((i) => Math.min(i + 1, steps.length - 1));
  const back = () => setStepIndex((i) => Math.max(i - 1, 0));

  function finish(roleOverride?: Role, nameOverride?: string) {
    const r = roleOverride ?? effectiveRole!;
    const profile = {
      name: (nameOverride ?? account?.name ?? name).trim(),
      role: r,
      position: position ?? 'Outside Hitter',
      experience,
      phase,
      // P7.2: no body weight step (Fuel no longer uses it). It's optional in Progress, on this phone only.
      bodyWeightLb: null,
      liftDaysPerWeek: liftDays.length,
      liftDays,
      volleyballWeek: week,
      equipment,
      // Birth year and under-18 only; the month isn't kept. A signed-in account's own values win (team sync copies them).
      ...(age ? { birthYear: account?.birthYear ?? age.birthYear, isMinor: account?.isMinor ?? age.isMinor } : {}),
      hasAccount: !!account || roleOverride === 'coach',
    };
    setProfile(profile);
    if (r === 'athlete') {
      if (account && position) updatePosition(position);
      // Team athletes follow the coach's posted workout. Solo athletes get their own program.
      if (!team) {
        saveProgram(
          generateProgram({ position: profile.position, phase, experience, volleyballWeek: week, liftDaysPerWeek: liftDays.length, liftDays, equipment }),
          true,
        );
      }
    }
    router.replace('/');
  }

  // A signed-in user (or a device set up without an account) never sees Welcome again.
  if (data.profile && (account || !data.profile.hasAccount)) return <Redirect href="/" />;

  const canNext =
    (step === 'role' && !!role) ||
    (step === 'name' && name.trim().length > 0) ||
    (step === 'position' && !!position) ||
    step === 'level' ||
    (step === 'week' && liftDays.length > 0);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Screen>
          {step === 'welcome' && (
            <View style={{ gap: 16, marginTop: 48 }}>
              <Lockup badge={132} />
              <View style={{ gap: 12, marginTop: 24 }}>
                <Button large title="Log in" onPress={() => router.push({ pathname: '/sign-in', params: linkCode ? { code: linkCode } : {} })} />
                <Button large kind="secondary" title="Create an account" onPress={next} />
              </View>
            </View>
          )}

          {step === 'age' && (
            <AgeQuestion
              onAnswer={(a) => {
                if (a.under13) {
                  block(); // saves only the not-eligible flag
                  return;
                }
                setAge(a);
                // Coach accounts are for adults 18 and older.
                if (a.isMinor && role === 'coach') setRole(null);
                next();
              }}
            />
          )}
          {step === 'age' && stepIndex > 0 ? <Button kind="ghost" title="Back" onPress={back} /> : null}

          {step === 'role' && (
            <>
              <View style={{ gap: 20, marginTop: 24, marginBottom: 8 }}>
                <Lockup badge={132} />
                <NetTape />
                <Body muted style={{ textAlign: 'center' }}>
                  Lifting and fuel built around your volleyball week.
                </Body>
              </View>
              {linkCode ? <Note>{`You're joining a team (code ${linkCode.toUpperCase()}). Choose athlete, then make your account.`}</Note> : null}
              <Label>Who are you?</Label>
              <OptionCard
                icon="dumbbell"
                title="I'm an athlete or client"
                subtitle="Build my program and track my progress"
                selected={role === 'athlete'}
                onPress={() => setRole('athlete')}
              />
              <OptionCard
                icon="person.3"
                title="I'm a coach or trainer"
                subtitle="Build programs and send them to players"
                selected={role === 'coach'}
                onPress={() => setRole('coach')}
                disabled={!!age?.isMinor}
                caption={age?.isMinor ? 'Coach and trainer accounts are for adults 18 and older.' : undefined}
              />
            </>
          )}

          {step === 'account' && (
            <>
              <H1>{role === 'coach' ? 'Coach account' : 'Join your team'}</H1>
              <Body muted>
                {role === 'coach'
                  ? 'Your account holds your teams. Athletes join with a code, and every workout you post shows up on their phones.'
                  : 'Make an account to join your team. Your coach posts the workouts and sees what you log.'}
              </Body>
              <AccountForm
                role={role ?? 'athlete'}
                age={age}
                loginParams={linkCode ? { code: linkCode } : undefined}
                onDone={(a) => {
                  if (a.role === 'coach') finish('coach', a.name);
                  else next();
                }}
              />
              {role === 'athlete' ? (
                <Button
                  kind="ghost"
                  title="Train solo, no account"
                  onPress={next}
                />
              ) : null}
            </>
          )}

          {step === 'join' && (
            <>
              <H1>{team?.kind === 'general' ? 'Enter your code' : 'Enter your team code'}</H1>
              <Body muted>{team?.kind === 'general' ? 'Your trainer has a 6-character code.' : 'Your coach has a 6-character code for your team.'}</Body>
              {team ? (
                <Card>
                  <Label>Joined</Label>
                  <H2>{team.name}</H2>
                  {team.coachName ? <Body muted>{team.kind === 'general' ? `Trainer ${team.coachName}` : `Coach ${team.coachName}`}</Body> : null}
                </Card>
              ) : (
                <JoinTeamForm onJoined={(t) => setTeam(t)} initialCode={linkCode} autoJoin={!!linkCode} />
              )}
              <Button kind={team ? 'primary' : 'ghost'} title={team ? 'Next' : 'Skip for now'} onPress={next} />
            </>
          )}

          {step === 'name' && (
            <>
              <H1>What&apos;s your name?</H1>
              <Field autoFocus placeholder="First name" value={name} onChangeText={setName} returnKeyType="done" />
            </>
          )}

          {step === 'position' && (
            <>
              <H1>What position do you play?</H1>
              <Body muted>Your program adds prep work for the demands of your position.</Body>
              {POSITIONS.map((p) => (
                <OptionCard key={p} title={p} selected={position === p} onPress={() => setPosition(p)} />
              ))}
            </>
          )}

          {step === 'level' && (
            <>
              <H1>Where are you at?</H1>
              <Label>Lifting experience</Label>
              {team?.kind === 'general' ? <Text style={{ fontSize: 13, color: colors.muted }}>Your trainer confirms this.</Text> : null}
              {EXPERIENCE.map((e) => (
                <OptionCard key={e.id} title={e.label} subtitle={e.blurb} selected={experience === e.id} onPress={() => setExperience(e.id)} />
              ))}
              {team ? null : <Label>Time of year</Label>}
              {(team ? [] : PHASES).map((p) => (
                <OptionCard key={p.id} title={p.label} subtitle={p.blurb} selected={phase === p.id} onPress={() => setPhase(p.id)} />
              ))}
            </>
          )}

          {step === 'week' && (
            <>
              <H1>Your volleyball week</H1>
              <Body muted>
                Set your usual practice week. Add match and tournament dates on the season calendar later; lifts move
                around them automatically. Only mark a match here if it&apos;s the same night every week.
              </Body>
              <Card>
                <WeekEditor value={week} onChange={setWeek} />
              </Card>
              <Card>
                <H2>Which days can you lift?</H2>
                <LiftDayPicker week={week} value={liftDays} onChange={setLiftDays} cap={liftDayCap(experience, phase)} />
                <Body muted style={{ fontSize: 13 }}>
                  In-season, 2 days is usually right. Off-season, 3–4. You can change days anytime. Keep at least one day
                  fully off.
                </Body>
              </Card>
              <Card>
                <H2>What&apos;s in your gym?</H2>
                <EquipmentPicker value={equipment} onChange={setEquipment} />
              </Card>
            </>
          )}


          {step === 'age' || step === 'welcome' ? null : step === 'account' || step === 'join' ? (
            stepIndex > 0 ? <Button kind="ghost" title="Back" onPress={back} /> : null
          ) : (
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
              {stepIndex > 0 ? (
                <View style={{ flex: 1 }}>
                  <Button kind="ghost" title="Back" onPress={back} />
                </View>
              ) : null}
              <View style={{ flex: 2 }}>
                {!isLast ? (
                  <Button title="Next" disabled={!canNext} onPress={next} />
                ) : (
                  <Button title={team ? 'Go to my team plan' : 'Build my program'} disabled={!canNext} onPress={() => finish()} />
                )}
              </View>
            </View>
          )}
        </Screen>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
