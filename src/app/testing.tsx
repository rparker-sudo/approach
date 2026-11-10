import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { Body, Button, Card, Chip, ChipRow, colors, Field, H2, Label, Note, Row, Screen, Text } from '../components/ui';
import { backend, canCheckIn, e1rm, JumpTestId, LoadTestId, TestResult } from '../lib/backend';
import { dateKey, planForDate, today } from '../lib/calendar';
import { ALL_EQUIPMENT } from '../lib/exercises';
import { suggestWeight } from '../lib/progression';
import { useStore } from '../lib/store';
import { useTeams } from '../lib/team';
import {
  BATTERY_LABEL,
  bestOf,
  eligibility,
  isDumbbellTest,
  JUMP_TESTS,
  LOAD_NAMES,
  loadTestsFor,
  repOptions,
  TEST_REST_SEC,
  WARMUP_LADDER,
} from '../lib/testing';
import type { TestBattery } from '../lib/types';
import { parseNum } from '../lib/util';

/**
 * Testing session (P6, F11). Order: warm-up → approach touch → broad jump → med-ball throw → strength checks.
 * Team athletes: results go to the coach (testing permission required). Solo athletes: jump tests only, kept on this phone.
 * Copy: "Testing day" / "Strength check"; estimates are always labeled. No true one-rep tests or max wording (docs/compliance.md).
 */
export default function TestingScreen() {
  const { teamId, solo } = useLocalSearchParams<{ teamId?: string; solo?: string }>();
  const { data, mutate, addTouchLog } = useStore();
  const t = useTeams();
  const team = t.teams.find((x) => x.id === teamId);
  const program = data.programs.find((p) => p.teamId === teamId) ?? null;
  const isSolo = !!solo || !team;
  const battery: TestBattery = (program && planForDate(program, today()).test) || 'jump';
  const perms = team ? t.consentFor(team.id) : undefined;
  const equipment = program?.equipment ?? ALL_EQUIPMENT;
  const day = dateKey(today());
  const [painToday, setPainToday] = useState<boolean | null>(null);
  const todayCheckIn = (data.readinessLog ?? []).find((r) => r.day === day);
  const elig = eligibility({
    onTeam: !isSolo,
    perms,
    experience: data.profile?.experience ?? 'beginner',
    todayCheckIn,
    painToday,
  });
  const lifts = isSolo ? [] : loadTestsFor(battery, equipment);
  const steps = ['warmup', ...JUMP_TESTS.map((j) => j.id), ...(lifts.length ? ['strength'] : []), 'results'] as const;
  const [step, setStep] = useState(0);
  const [jumps, setJumps] = useState<Partial<Record<JumpTestId, number>>>({});
  const [checks, setChecks] = useState<TestResult[]>([]);
  const [before] = useState(() => data.strengthEstimates ?? {});

  if (!isSolo && !elig.jumps) {
    return (
      <Screen>
        <Stack.Screen options={{ title: 'Testing day' }} />
        <Note>{elig.note ?? "Testing isn't turned on for you on this team."}</Note>
        <Button kind="ghost" title="Back" onPress={() => router.back()} />
      </Screen>
    );
  }

  const current = steps[step];
  const next = () => setStep((s) => Math.min(s + 1, steps.length - 1));

  async function saveJump(id: JumpTestId, value: number, unit: 'in' | 'ft') {
    if (id === 'touch') addTouchLog({ date: new Date().toISOString(), inches: value }); // feeds the existing touch log
    if (isSolo) {
      mutate((d) => ({ ...d, jumpTests: [...(d.jumpTests ?? []), { day, testId: id, value }] }));
    } else {
      await t.addTestResult({ teamId: team!.id, userId: t.account!.id, day, testId: id, value, unit, reps: null });
    }
    setJumps((j) => ({ ...j, [id]: value }));
    next();
  }

  return (
    <Screen>
      <Stack.Screen options={{ title: isSolo ? 'Jump test' : 'Testing session' }} />
      <Text style={{ fontSize: 13, color: colors.muted }}>
        {isSolo ? 'Jump tests, kept on this phone.' : `Testing day: ${BATTERY_LABEL[battery]}`} · Step {step + 1} of {steps.length}
      </Text>

      {current === 'warmup' ? (
        <Card>
          <H2>Warm-up</H2>
          <Body>Warm up with your team: 5–10 minutes of easy movement, then a few practice jumps at medium effort.</Body>
          <Button title="I'm warmed up" onPress={next} />
        </Card>
      ) : null}

      {JUMP_TESTS.map((j) =>
        current === j.id ? (
          <JumpStep
            key={j.id}
            name={j.id === 'throw' && team ? `${j.name} (${team.settings.medBallLb} lb ball)` : j.name}
            hint={j.hint}
            unit={j.unit}
            onSave={(v) => saveJump(j.id, v, j.unit)}
            onSkip={next}
          />
        ) : null,
      )}

      {current === 'strength' ? (
        <StrengthChecks
          teamId={team!.id}
          lifts={lifts}
          eligible={elig.strength}
          note={elig.note}
          askPain={!canCheckIn(perms) && painToday === null}
          onPain={setPainToday}
          onSaved={(r) => setChecks((c) => [...c, r])}
          onDone={next}
        />
      ) : null}

      {current === 'results' ? (
        <Results jumps={jumps} checks={checks} before={before} programId={program?.id ?? null} />
      ) : null}
    </Screen>
  );
}

function JumpStep({ name, hint, unit, onSave, onSkip }: { name: string; hint: string; unit: 'in' | 'ft'; onSave: (v: number) => Promise<void>; onSkip: () => void }) {
  const [attempts, setAttempts] = useState(['', '', '']);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const values = attempts.map((a) => (parseNum(a) > 0 ? parseNum(a) : null));
  const best = bestOf(values);
  return (
    <Card>
      <H2>{name}</H2>
      <Text style={{ fontSize: 13, color: colors.muted }}>{`${hint} Best of 3.`}</Text>
      <Row style={{ gap: 8 }}>
        {attempts.map((a, i) => (
          <View key={i} style={{ flex: 1, gap: 4 }}>
            <Label>{`Try ${i + 1}`}</Label>
            <Field
              keyboardType="decimal-pad"
              value={a}
              onChangeText={(v) => setAttempts((x) => x.map((y, k) => (k === i ? v : y)))}
              placeholder={unit}
              style={values[i] != null && values[i] === best ? { borderColor: colors.ink, borderWidth: 2 } : undefined}
            />
          </View>
        ))}
      </Row>
      {best != null ? <Text style={{ fontSize: 15, fontWeight: '600' }}>{`Best: ${best} ${unit}`}</Text> : null}
      {error ? <Text style={{ color: colors.error, fontSize: 13 }}>{error}</Text> : null}
      <Button
        title={busy ? 'Saving…' : 'Save best'}
        disabled={best == null || busy}
        onPress={async () => {
          setBusy(true);
          setError(null);
          try {
            await onSave(best!);
          } catch (e) {
            setError(e instanceof Error ? e.message : 'Something went wrong.');
          } finally {
            setBusy(false);
          }
        }}
      />
      <Button kind="ghost" title="Skip this test" onPress={onSkip} />
    </Card>
  );
}

function StrengthChecks({
  teamId,
  lifts,
  eligible,
  note,
  askPain,
  onPain,
  onSaved,
  onDone,
}: {
  teamId: string;
  lifts: LoadTestId[];
  eligible: boolean;
  note: string | null;
  askPain: boolean;
  onPain: (pain: boolean) => void;
  onSaved: (r: TestResult) => void;
  onDone: () => void;
}) {
  const t = useTeams();
  const [confirmed, setConfirmed] = useState(!!t.testSessions[teamId]);
  const [index, setIndex] = useState(0);

  // Locked until the coach confirms supervision today (P6.3). Check again every 10 s.
  useEffect(() => {
    if (confirmed) return;
    const check = () =>
      backend
        .getTestSessions([teamId], dateKey(today()))
        .then((s) => {
          if (s.some((x) => x.battery !== 'jump')) setConfirmed(true);
        })
        .catch(() => {});
    const first = setTimeout(check, 0);
    const timer = setInterval(check, 10000);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
    };
  }, [confirmed, teamId]);

  if (askPain) {
    // Without check-in permission: ask on the spot, and don't store the answer.
    return (
      <Card>
        <H2>Any pain today?</H2>
        <Row>
          <View style={{ flex: 1 }}>
            <Button kind="secondary" title="Yes" onPress={() => onPain(true)} />
          </View>
          <View style={{ flex: 1 }}>
            <Button kind="secondary" title="No" onPress={() => onPain(false)} />
          </View>
        </Row>
      </Card>
    );
  }
  if (!eligible) {
    return (
      <Card>
        <H2>Strength checks</H2>
        <Body>{note}</Body>
        <Button title="See results" onPress={onDone} />
      </Card>
    );
  }
  if (!confirmed) {
    return (
      <Card>
        <H2>Strength checks</H2>
        <Body>Strength checks open when your coach confirms they&apos;re supervising.</Body>
        <Button kind="ghost" title="Skip to results" onPress={onDone} />
      </Card>
    );
  }
  const id = lifts[index];
  return (
    <LiftCheck
      key={id}
      teamId={teamId}
      id={id}
      onSaved={(r) => {
        onSaved(r);
        if (index + 1 < lifts.length) setIndex(index + 1);
        else onDone();
      }}
      onSkip={() => (index + 1 < lifts.length ? setIndex(index + 1) : onDone())}
    />
  );
}

function LiftCheck({ teamId, id, onSaved, onSkip }: { teamId: string; id: LoadTestId; onSaved: (r: TestResult) => void; onSkip: () => void }) {
  const t = useTeams();
  const { data } = useStore();
  const options = repOptions(id, data.profile?.experience ?? 'intermediate');
  const [warm, setWarm] = useState<boolean[]>(WARMUP_LADDER.map(() => false));
  const [attempts, setAttempts] = useState<{ weight: string; reps: string }[]>([]);
  const [restUntil, setRestUntil] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [weight, setWeight] = useState('');
  const [reps, setReps] = useState(options[0]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const unit = 'lb';

  useEffect(() => {
    if (!restUntil) return;
    const timer = setInterval(() => {
      const at = Date.now();
      setNow(at);
      if (at >= restUntil) setRestUntil(null);
    }, 250);
    return () => clearInterval(timer);
  }, [restUntil]);
  const left = restUntil ? Math.max(0, Math.ceil((restUntil - now) / 1000)) : 0;

  return (
    <Card>
      <H2>{`${LOAD_NAMES[id]} · ${reps}-rep strength check`}</H2>
      <Label>Warm-up</Label>
      {WARMUP_LADDER.map((w, i) => (
        <Chip key={w} label={`${warm[i] ? '✓ ' : ''}${w}`} selected={warm[i]} onPress={() => setWarm((x) => x.map((y, k) => (k === i ? !y : y)))} />
      ))}
      <Label>Working attempts (up to 3)</Label>
      {attempts.map((a, i) => (
        <Text key={i} style={{ fontSize: 14 }}>{`Attempt ${i + 1}: ${a.weight} ${unit} × ${a.reps}`}</Text>
      ))}
      {attempts.length < 3 ? (
        <AttemptRow
          onDone={(a) => {
            setAttempts((x) => [...x, a]);
            setRestUntil(Date.now() + TEST_REST_SEC * 1000);
          }}
        />
      ) : null}
      {restUntil ? <Text style={{ fontSize: 22, fontWeight: '600', fontVariant: ['tabular-nums'] }}>{`Rest ${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`}</Text> : null}
      <Note>Your coach stops the set when form breaks. Never grind.</Note>

      <Label>Enter your last good-form set</Label>
      <Row style={{ gap: 8 }}>
        <View style={{ flex: 1 }}>
          <Field keyboardType="decimal-pad" placeholder={isDumbbellTest(id) ? 'lb (each dumbbell)' : 'lb'} value={weight} onChangeText={setWeight} />
        </View>
        <ChipRow>
          {options.map((r) => (
            <Chip key={r} label={`× ${r}`} selected={reps === r} onPress={() => setReps(r)} />
          ))}
        </ChipRow>
      </Row>
      {parseNum(weight) > 0 ? (
        <Text style={{ fontSize: 15 }}>{`Estimated strength: ~${Math.round(e1rm(parseNum(weight), reps))} lb (estimate)`}</Text>
      ) : null}
      {error ? <Text style={{ color: colors.error, fontSize: 13 }}>{error}</Text> : null}
      <Button
        title={busy ? 'Saving…' : 'Save strength check'}
        disabled={!(parseNum(weight) > 0) || busy}
        onPress={async () => {
          setBusy(true);
          setError(null);
          try {
            const r = await t.addTestResult({ teamId, userId: t.account!.id, day: dateKey(today()), testId: id, value: parseNum(weight), unit, reps });
            onSaved(r);
          } catch (e) {
            setError(e instanceof Error ? e.message : 'Something went wrong.');
          } finally {
            setBusy(false);
          }
        }}
      />
      <Button kind="ghost" title="Skip this lift" onPress={onSkip} />
    </Card>
  );
}

function AttemptRow({ onDone }: { onDone: (a: { weight: string; reps: string }) => void }) {
  const [weight, setWeight] = useState('');
  const [reps, setReps] = useState('');
  return (
    <Row style={{ gap: 8 }}>
      <View style={{ flex: 1 }}>
        <Field keyboardType="decimal-pad" placeholder="lb" value={weight} onChangeText={setWeight} />
      </View>
      <View style={{ flex: 1 }}>
        <Field keyboardType="number-pad" placeholder="reps" value={reps} onChangeText={setReps} />
      </View>
      <Button
        small
        title="Done"
        disabled={!(parseNum(weight) > 0 && parseNum(reps) > 0)}
        onPress={() => {
          onDone({ weight, reps });
          setWeight('');
          setReps('');
        }}
      />
    </Row>
  );
}

function Results({
  jumps,
  checks,
  before,
  programId,
}: {
  jumps: Partial<Record<JumpTestId, number>>;
  checks: TestResult[];
  before: Record<string, { e1rm: number; day: string }>;
  programId: string | null;
}) {
  const { data } = useStore();
  const program = data.programs.find((p) => p.id === programId);
  // Before → after for each tested lift in the athlete's program (P6.7).
  const changes = useMemo(() => {
    if (!program) return [];
    const out: { name: string; from: number | null; to: number | null }[] = [];
    for (const c of checks) {
      const pe = program.sessions.flatMap((s) => s.exercises).find((e) => e.exerciseId === c.testId);
      if (!pe || c.e1rm == null) continue;
      const prev = before[c.testId];
      const from = suggestWeight(data.logs, pe, program.equipment, prev ? { e1rm: prev.e1rm, phase: program.phase } : undefined)?.weight ?? null;
      const to = suggestWeight(data.logs, pe, program.equipment, { e1rm: c.e1rm, phase: program.phase })?.weight ?? null;
      out.push({ name: LOAD_NAMES[c.testId as LoadTestId], from, to });
    }
    return out;
  }, [program, checks, before, data.logs]);
  return (
    <Card>
      <H2>Results</H2>
      {JUMP_TESTS.filter((j) => jumps[j.id] != null).map((j) => (
        <Text key={j.id} style={{ fontSize: 15 }}>{`${j.name}: ${jumps[j.id]} ${j.unit}`}</Text>
      ))}
      {checks.map((c) => (
        <Text key={c.id} style={{ fontSize: 15 }}>{`${LOAD_NAMES[c.testId as LoadTestId]}: Estimated strength: ~${Math.round(c.e1rm ?? 0)} lb (estimate)`}</Text>
      ))}
      {changes.length ? (
        <>
          <Label>Updated your starting weights</Label>
          {changes.map((c) => (
            <Text key={c.name} style={{ fontSize: 15 }}>{`${c.name}: ${c.from ?? '–'} → ${c.to ?? '–'} lb`}</Text>
          ))}
        </>
      ) : null}
      {!Object.keys(jumps).length && !checks.length ? <Body muted>No results saved today.</Body> : null}
      <Button title="Done" onPress={() => router.back()} />
    </Card>
  );
}
