import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Body, Button, Card, colors, Field, H1, H2, Label, OptionCard, Screen } from '../components/ui';
import { LiftDaysPicker, WeekEditor } from '../components/week';
import { generateProgram } from '../lib/generator';
import { useStore } from '../lib/store';
import type { DayType, Experience, Phase, Position, Role } from '../lib/types';
import { EXPERIENCE, PHASES, POSITIONS } from '../lib/types';

const DEFAULT_WEEK: DayType[] = ['practice', 'practice', 'game', 'practice', 'off', 'tournament', 'off'];

export default function Onboarding() {
  const { setProfile, saveProgram } = useStore();
  const [step, setStep] = useState(0);
  const [role, setRole] = useState<Role | null>(null);
  const [name, setName] = useState('');
  const [position, setPosition] = useState<Position | null>(null);
  const [experience, setExperience] = useState<Experience>('beginner');
  const [phase, setPhase] = useState<Phase>('in');
  const [week, setWeek] = useState<DayType[]>(DEFAULT_WEEK);
  const [liftDays, setLiftDays] = useState(2);
  const [weight, setWeight] = useState('');

  const lastStep = role === 'coach' ? 1 : 5;

  function finish() {
    const bw = parseFloat(weight);
    const profile = {
      name: name.trim(),
      role: role!,
      position: position ?? 'Outside Hitter',
      experience,
      phase,
      bodyWeightLb: Number.isFinite(bw) && bw > 0 ? bw : null,
      liftDaysPerWeek: liftDays,
      volleyballWeek: week,
    };
    setProfile(profile);
    if (role === 'athlete') {
      saveProgram(
        generateProgram({ position: profile.position, phase, experience, volleyballWeek: week, liftDaysPerWeek: liftDays }),
        true,
      );
    }
    router.replace('/');
  }

  const canNext =
    (step === 0 && role) ||
    (step === 1 && name.trim().length > 0) ||
    (step === 2 && position) ||
    step === 3 ||
    step === 4 ||
    step === 5;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Screen>
          {step === 0 && (
            <>
              <View style={{ gap: 8, marginTop: 12 }}>
                <H1>Volley Strength</H1>
                <Body muted>
                  Weight training and fuel plans built around your volleyball schedule. Lift smarter, recover better, play
                  fresher.
                </Body>
              </View>
              <Label>Who are you?</Label>
              <OptionCard
                icon="figure.strengthtraining.traditional"
                title="I'm an athlete"
                subtitle="Build my own training program and track my progress"
                selected={role === 'athlete'}
                onPress={() => setRole('athlete')}
              />
              <OptionCard
                icon="person.3.fill"
                title="I'm a coach"
                subtitle="Build programs for my players and send them out"
                selected={role === 'coach'}
                onPress={() => setRole('coach')}
              />
            </>
          )}

          {step === 1 && (
            <>
              <H1>What's your name?</H1>
              <Field
                autoFocus
                placeholder={role === 'coach' ? 'Coach Parker' : 'First name'}
                value={name}
                onChangeText={setName}
                returnKeyType="done"
              />
              {role === 'coach' ? (
                <Body muted>This appears on programs you send to players.</Body>
              ) : null}
            </>
          )}

          {step === 2 && (
            <>
              <H1>What position do you play?</H1>
              <Body muted>Your program adds injury-prevention work for your position.</Body>
              {POSITIONS.map((p) => (
                <OptionCard key={p} title={p} selected={position === p} onPress={() => setPosition(p)} />
              ))}
            </>
          )}

          {step === 3 && (
            <>
              <H1>Where are you at?</H1>
              <Label>Lifting experience</Label>
              {EXPERIENCE.map((e) => (
                <OptionCard key={e.id} title={e.label} subtitle={e.blurb} selected={experience === e.id} onPress={() => setExperience(e.id)} />
              ))}
              <Label>Time of year</Label>
              {PHASES.map((p) => (
                <OptionCard key={p.id} title={p.label} subtitle={p.blurb} selected={phase === p.id} onPress={() => setPhase(p.id)} />
              ))}
            </>
          )}

          {step === 4 && (
            <>
              <H1>Your volleyball week</H1>
              <Body muted>
                Set a typical week. Lifting days are planned around it: no lifting on match days and no heavy legs the day
                before.
              </Body>
              <Card>
                <WeekEditor value={week} onChange={setWeek} />
              </Card>
              <Card>
                <H2>How many days a week can you lift?</H2>
                <LiftDaysPicker value={liftDays} onChange={setLiftDays} />
                <Body muted style={{ fontSize: 13 }}>
                  In-season, 2 days is usually right. Off-season, 3–4.
                </Body>
              </Card>
            </>
          )}

          {step === 5 && (
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

          <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
            {step > 0 ? (
              <View style={{ flex: 1 }}>
                <Button kind="ghost" title="Back" onPress={() => setStep(step - 1)} />
              </View>
            ) : null}
            <View style={{ flex: 2 }}>
              {step < lastStep ? (
                <Button title="Next" disabled={!canNext} onPress={() => setStep(step + 1)} />
              ) : (
                <Button
                  title={role === 'coach' ? 'Get started' : 'Build my program'}
                  disabled={!canNext}
                  onPress={finish}
                />
              )}
            </View>
          </View>
        </Screen>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
