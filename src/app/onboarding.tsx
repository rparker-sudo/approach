import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Body, Button, Card, colors, Field, H1, H2, Label, Lockup, NetTape, Note, OptionCard, Screen } from '../components/ui';
import AccountForm from '../components/AccountForm';
import { AgeQuestion } from '../components/AgeGate';
import type { AgeAnswer } from '../lib/age';
import JoinTeamForm from '../components/JoinTeamForm';
import { LiftDayPicker, WeekEditor } from '../components/week';
import type { Team } from '../lib/backend';
import { backend } from '../lib/backend';
import { useTeams } from '../lib/team';
import EquipmentPicker from '../components/EquipmentPicker';
import { ALL_EQUIPMENT } from '../lib/exercises';
import { generateProgram, pickLiftDays } from '../lib/generator';
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

type Step = 'age' | 'role' | 'account' | 'join' | 'name' | 'position' | 'level' | 'week' | 'weight';

export default function Onboarding() {
  const { setProfile, saveProgram, block } = useStore();
  const [age, setAge] = useState<AgeAnswer | null>(null);
  const { account, updatePosition } = useOnboardingAccount();
  const [stepIndex, setStepIndex] = useState(0);
  const { code: linkCode } = useLocalSearchParams<{ code?: string }>();
  // Opened from a team QR code/link: they're an athlete joining that team.
  const [role, setRole] = useState<Role | null>(linkCode ? 'athlete' : null);
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
  const [weight, setWeight] = useState('');

  const effectiveRole: Role | null = account?.role ?? role;
  const steps: Step[] =
    effectiveRole === 'coach'
      ? ['age', 'role', 'account']
      : [
          'age',
          'role',
          'account',
          ...(account ? (['join'] as Step[]) : []),
          ...(!account ? (['name'] as Step[]) : []),
          'position',
          'level',
          ...(!team ? (['week'] as Step[]) : []),
          'weight',
        ];
  const step = steps[Math.min(stepIndex, steps.length - 1)];
  const isLast = stepIndex >= steps.length - 1;
  const next = () => setStepIndex((i) => Math.min(i + 1, steps.length - 1));
  const back = () => setStepIndex((i) => Math.max(i - 1, 0));

  function finish(roleOverride?: Role, nameOverride?: string) {
    const r = roleOverride ?? effectiveRole!;
    const bw = parseFloat(weight);
    const profile = {
      name: (nameOverride ?? account?.name ?? name).trim(),
      role: r,
      position: position ?? 'Outside Hitter',
      experience,
      phase,
      bodyWeightLb: Number.isFinite(bw) && bw > 0 ? bw : null,
      liftDaysPerWeek: liftDays.length,
      liftDays,
      volleyballWeek: week,
      equipment,
      // Birth year and under-18 only; the month isn't kept. A signed-in account's own values win (team sync copies them).
      ...(age ? { birthYear: account?.birthYear ?? age.birthYear, isMinor: account?.isMinor ?? age.isMinor } : {}),
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

  const canNext =
    (step === 'role' && !!role) ||
    (step === 'name' && name.trim().length > 0) ||
    (step === 'position' && !!position) ||
    step === 'level' ||
    (step === 'week' && liftDays.length > 0) ||
    step === 'weight';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Screen>
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
                title="I'm an athlete"
                subtitle="Build my program and track my progress"
                selected={role === 'athlete'}
                onPress={() => setRole('athlete')}
              />
              <OptionCard
                icon="person.3"
                title="I'm a coach"
                subtitle="Build programs and send them to players"
                selected={role === 'coach'}
                onPress={() => setRole('coach')}
                disabled={!!age?.isMinor}
                caption={age?.isMinor ? 'Coach accounts are for adults 18 and older.' : undefined}
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
              <H1>Enter your team code</H1>
              <Body muted>Your coach has a 6-character code for your team.</Body>
              {team ? (
                <Card>
                  <Label>Joined</Label>
                  <H2>{team.name}</H2>
                  {team.coachName ? <Body muted>Coach {team.coachName}</Body> : null}
                </Card>
              ) : (
                <JoinTeamForm onJoined={(t) => setTeam(t)} initialCode={linkCode} autoJoin={!!linkCode} />
              )}
              <Button kind={team ? 'primary' : 'ghost'} title={team ? 'Next' : 'Skip for now'} onPress={next} />
            </>
          )}

          {step === 'name' && (
            <>
              <H1>What's your name?</H1>
              <Field autoFocus placeholder="First name" value={name} onChangeText={setName} returnKeyType="done" />
            </>
          )}

          {step === 'position' && (
            <>
              <H1>What position do you play?</H1>
              <Body muted>Your program adds injury-prevention work for it.</Body>
              {POSITIONS.map((p) => (
                <OptionCard key={p} title={p} selected={position === p} onPress={() => setPosition(p)} />
              ))}
            </>
          )}

          {step === 'level' && (
            <>
              <H1>Where are you at?</H1>
              <Label>Lifting experience</Label>
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
                around them automatically. Only mark a match here if it's the same night every week.
              </Body>
              <Card>
                <WeekEditor value={week} onChange={setWeek} />
              </Card>
              <Card>
                <H2>Which days can you lift?</H2>
                <LiftDayPicker week={week} value={liftDays} onChange={setLiftDays} phase={phase} />
                <Body muted style={{ fontSize: 13 }}>
                  In-season, 2 days is usually right. Off-season, 3–4. You can change days anytime.
                </Body>
              </Card>
              <Card>
                <H2>What's in your gym?</H2>
                <EquipmentPicker value={equipment} onChange={setEquipment} />
              </Card>
            </>
          )}

          {step === 'weight' && (
            <>
              <H1>Body weight (optional)</H1>
              <Body muted>
                Used only to estimate how much carbs, protein and water you need. It stays on this phone. You can skip
                this.
              </Body>
              <Field
                placeholder="Pounds"
                keyboardType="decimal-pad"
                value={weight}
                onChangeText={setWeight}
              />
            </>
          )}

          {step === 'age' ? null : step === 'account' || step === 'join' ? (
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
