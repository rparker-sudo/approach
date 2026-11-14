import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { useKeepAwake } from 'expo-keep-awake';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Platform, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Body, BRAND, Button, Card, Chip, ChipRow, colors, display, Icon, Label, Note, Pill, Row, Text, TextInput } from '../components/ui';
import { dateKey, today } from '../lib/calendar';
import { showAlert } from '../lib/dialog';
import { CATEGORY_LABEL, getExercise } from '../lib/exercises';
import { formatRest } from '../lib/generator';
import { repRange, suggestWeight, Suggestion } from '../lib/progression';
import { resolveFor } from '../lib/athlete';
import type { ResolvedExercise } from '../lib/resolve';
import VersionLine, { DroppedLine } from '../components/VersionLine';
import { EXTRA_RECOVERY_SESSIONS, RECOVERY_NOTE, recoveryProgram } from '../lib/recovery';
import { adjustRest, clock, Rest, secondsLeft, startRest } from '../lib/restTimer';
import { ConsentBanner } from '../components/Consent';
import { canLog } from '../lib/backend';
import { useStore } from '../lib/store';
import { useTeams } from '../lib/team';
import type { LoggedSet, WorkoutLog } from '../lib/types';
import { estimateStrength, uid } from '../lib/util';

type Entry = { exerciseId: string; sets: LoggedSet[] };
type Draft = { entries: Entry[]; index: number; note: string; startedAt: number };
type Summary = { sets: number; total: number; minutes: number; prs: string[]; team: boolean };

const draftKey = (programId: string, sessionId: string) => `approach/workout-draft/${programId}/${sessionId}/${dateKey(today())}`;

function buzz() {
  if (Platform.OS === 'web') {
    try {
      (navigator as Navigator & { vibrate?: (p: number | number[]) => boolean }).vibrate?.([200, 100, 200]);
    } catch {
      /* not supported */
    }
  } else {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  }
}

export default function Workout() {
  useKeepAwake();
  const { programId, sessionId, recovery } = useLocalSearchParams<{ programId: string; sessionId: string; recovery?: string }>();
  const { data, addLog, activeProgram } = useStore();
  const { consentFor, shareLiveProgress } = useTeams();
  const insets = useSafeAreaInsets();
  // v2.2 extra recovery (T4): a Training Content session wrapped as a one-session program (still resolved, G-1).
  const recoverySession = recovery ? EXTRA_RECOVERY_SESSIONS.find((x) => x.id === recovery) : undefined;
  const isRecovery = !!recoverySession;
  const program = useMemo(
    () =>
      recoverySession
        ? { ...recoveryProgram(recoverySession, activeProgram?.phase ?? 'off'), teamId: activeProgram?.teamId, teamName: activeProgram?.teamName }
        : data.programs.find((p) => p.id === programId),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [recoverySession, programId, data.programs],
  );
  const session = program?.sessions.find((s) => s.id === (recoverySession?.id ?? sessionId));
  // G-1: the athlete's version of today's session (day version, level, effort ceilings, easing, rest).
  // Resolved once when the workout opens, so finishing a set doesn't change the plan mid-workout.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const day = useMemo(() => (program && session ? resolveFor(data, program, session, today()) : null), [program, session]);
  const plan: ResolvedExercise[] = useMemo(() => day?.exercises ?? [], [day]);
  const suggestions = useMemo(
    () =>
      plan.map((pe) => {
        if (isRecovery) return null; // extra recovery never creates weight suggestions
        const est = data.strengthEstimates?.[pe.exerciseId];
        return suggestWeight(data.logs, pe, program?.equipment, est && program ? { e1rm: est.e1rm, phase: program.phase } : undefined, day?.easing.active);
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [plan, data.strengthEstimates, program],
  );

  const fresh = (): Draft => ({
    entries: plan.map((pe, i) => ({
      exerciseId: pe.exerciseId,
      sets: Array.from({ length: pe.sets }, (): LoggedSet => ({
        weight: suggestions[i] ? String(suggestions[i]!.weight) : '',
        reps: String(repRange(pe.reps)?.[0] ?? ''),
        done: false,
      })),
    })),
    index: 0,
    note: '',
    startedAt: Date.now(),
  });

  const [draft, setDraft] = useState<Draft | null>(null);
  const [mode, setMode] = useState<'focus' | 'list'>('focus');
  const [rest, setRest] = useState<Rest | null>(null);
  const [restDone, setRestDone] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [summary, setSummary] = useState<Summary | null>(null);
  const loaded = useRef(false);

  // Load an in-progress draft (closing the app mid-workout keeps your sets).
  useEffect(() => {
    if (!program || !session) return;
    AsyncStorage.getItem(draftKey(program.id, session.id))
      .then((raw) => {
        const saved = raw ? (JSON.parse(raw) as Draft) : null;
        setDraft(saved && saved.entries.length === plan.length ? saved : fresh());
      })
      .catch(() => setDraft(fresh()))
      .finally(() => {
        loaded.current = true;
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [programId, sessionId]);

  useEffect(() => {
    if (!loaded.current || !draft || !program || !session || summary) return;
    AsyncStorage.setItem(draftKey(program.id, session.id), JSON.stringify(draft)).catch(() => {});
  }, [draft, program, session, summary]);

  // P3 / D-025: share live progress with the coach board (debounced 2 s; boards permission is checked in
  // shareLiveProgress): sets done, the current (resolved) exercise, set x of y, last set's reps, and when the rest
  // ends. Never weights or RPE.
  const doneCount = draft ? draft.entries.reduce((n, e) => n + e.sets.filter((x) => x.done).length, 0) : 0;
  const totalCount = draft ? draft.entries.reduce((n, e) => n + e.sets.length, 0) : 0;
  const lastDone = useRef<{ reps: number | null }>({ reps: null });
  const curIndex = draft
    ? mode === 'focus'
      ? Math.min(draft.index, Math.max(0, plan.length - 1))
      : Math.max(0, draft.entries.findIndex((e) => e.sets.some((x) => !x.done)))
    : 0;
  const curEntry = draft?.entries[curIndex];
  const livePayload =
    draft && plan[curIndex] && curEntry
      ? {
          state: (rest ? 'resting' : 'lifting') as 'resting' | 'lifting',
          exerciseName: getExercise(plan[curIndex].exerciseId).name,
          setIndex: Math.min(curEntry.sets.filter((x) => x.done).length + 1, curEntry.sets.length),
          setCount: curEntry.sets.length,
          restEndsAt: rest ? new Date(rest.endAt).toISOString() : null,
        }
      : null;
  const liveKey = livePayload ? JSON.stringify([doneCount, livePayload]) : '';
  const lastShared = useRef('');
  useEffect(() => {
    if (isRecovery || !program?.teamId || !session || !livePayload || summary || liveKey === lastShared.current) return;
    if (doneCount === 0 && curIndex === 0) return; // nothing to show until the first set or a move
    const timer = setTimeout(() => {
      lastShared.current = liveKey;
      shareLiveProgress({
        teamId: program.teamId!,
        day: dateKey(today()),
        sessionId: session.id,
        setsDone: doneCount,
        setsTotal: totalCount,
        status: 'in_progress',
        ...livePayload,
        lastReps: lastDone.current.reps,
      });
    }, 2000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveKey, summary]);

  // Tick while resting.
  useEffect(() => {
    if (!rest) return;
    const t = setInterval(() => {
      const at = Date.now();
      setNow(at);
      if (secondsLeft(rest, at) === 0) {
        buzz();
        setRest(null);
        setRestDone(true);
      }
    }, 250);
    return () => clearInterval(t);
  }, [rest]);
  const left = rest ? secondsLeft(rest, now) : 0;
  useEffect(() => {
    if (!restDone) return;
    const t = setTimeout(() => setRestDone(false), 4000);
    return () => clearTimeout(t);
  }, [restDone]);

  if (!program || !session || !day) return <View style={{ flex: 1, backgroundColor: colors.bg }}><Body muted>Workout not found.</Body></View>;
  // Team workouts need parent consent on file for minors (the server enforces this too). Extra recovery stays on the
  // device until logging is allowed.
  if (program.teamId && !isRecovery && !canLog(consentFor(program.teamId))) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, padding: 16, gap: 16, paddingTop: insets.top + 16 }}>
        <Stack.Screen options={{ title: session.name }} />
        <ConsentBanner />
        <Button kind="ghost" title="Back" onPress={() => router.back()} />
      </View>
    );
  }
  if (!draft) return <View style={{ flex: 1, backgroundColor: colors.bg }} />;

  const entries = draft.entries;
  const total = entries.reduce((n, e) => n + e.sets.length, 0);
  const done = entries.reduce((n, e) => n + e.sets.filter((s) => s.done).length, 0);
  const idx = Math.min(draft.index, plan.length - 1);

  function update(patch: Partial<Draft>) {
    setDraft((d) => (d ? { ...d, ...patch } : d));
  }

  function setSet(ei: number, si: number, patch: Partial<LoggedSet>) {
    setDraft((d) =>
      d
        ? { ...d, entries: d.entries.map((e, i) => (i !== ei ? e : { ...e, sets: e.sets.map((s, j) => (j === si ? { ...s, ...patch } : s)) })) }
        : d,
    );
  }

  function toggleDone(ei: number, si: number) {
    const entry = entries[ei];
    const s = entry.sets[si];
    const nowDone = !s.done;
    setSet(ei, si, { done: nowDone });
    if (nowDone) lastDone.current = { reps: parseFloat(s.reps) || null };
    // Carry the weight forward to the next empty set.
    const next = entry.sets[si + 1];
    if (nowDone && next && !next.weight && s.weight) setSet(ei, si + 1, { weight: s.weight });
    if (!nowDone) return;
    const remainingHere = entry.sets.filter((x, j) => j !== si && !x.done).length;
    const remainingAll = total - done - 1;
    if (remainingAll <= 0) {
      setRest(null);
      return;
    }
    setRestDone(false);
    // No rest timer for 0 s (extra recovery: move straight on).
    if (plan[ei].restSecResolved > 0) setRest(startRest(plan[ei].restSecResolved, getExercise(plan[ei].exerciseId).name));
    else setRest(null);
    // Last set of this exercise: move on while you rest.
    if (remainingHere === 0 && mode === 'focus' && ei < plan.length - 1) update({ index: ei + 1 });
  }

  async function clearDraft() {
    await AsyncStorage.removeItem(draftKey(program!.id, session!.id)).catch(() => {});
  }

  function finish() {
    if (done === 0) {
      showAlert('No sets checked off', 'Tap Done next to each set you finish, then save.');
      return;
    }
    const minutes = Math.max(1, Math.round((Date.now() - draft!.startedAt) / 60000));
    const log: WorkoutLog = {
      id: uid(),
      date: new Date().toISOString(),
      programId: program!.id,
      sessionId: session!.id,
      sessionName: session!.name,
      entries,
      note: draft!.note.trim() || undefined,
      teamId: program!.teamId && canLog(consentFor(program!.teamId)) ? program!.teamId : undefined,
      synced: false,
      ...(isRecovery ? { kind: 'extra_recovery' as const, programId: 'extra-recovery' } : {}),
    };
    // New best estimated strength vs. earlier logs.
    const prs: string[] = [];
    for (const e of isRecovery ? [] : entries) {
      const ex = getExercise(e.exerciseId);
      if (!ex.weighted || (ex.category !== 'lower' && ex.category !== 'upper')) continue;
      const best = (sets: LoggedSet[]) => Math.max(0, ...sets.filter((s) => s.done).map((s) => estimateStrength(parseFloat(s.weight) || 0, parseFloat(s.reps) || 0)));
      const now1 = best(e.sets);
      const before = Math.max(0, ...data.logs.map((l) => best(l.entries.find((x) => x.exerciseId === e.exerciseId)?.sets ?? [])));
      if (now1 > 0 && before > 0 && now1 > before) prs.push(`${ex.name}: estimated strength ~${now1} lb (estimate, +${now1 - before})`);
    }
    // Lift minutes count toward effort hours (capped at 120 per workout); bests show as a "PR" badge on the board.
    addLog({ ...log, durationMin: Math.min(120, minutes), prCount: prs.length });
    if (program!.teamId && !isRecovery) {
      shareLiveProgress({
        teamId: program!.teamId,
        day: dateKey(today()),
        sessionId: session!.id,
        setsDone: done,
        setsTotal: total,
        status: 'done',
        state: 'done',
        exerciseName: null,
        restEndsAt: null,
        prToday: prs.length,
        finishedAt: new Date().toISOString(),
      });
    }
    clearDraft();
    setRest(null);
    setSummary({ sets: done, total, minutes, prs, team: !!program!.teamId });
  }

  function leave() {
    if (done === 0) {
      clearDraft();
      return router.back();
    }
    showAlert('Leave workout?', 'Your checked sets are saved. Come back today to pick up where you left off.', [
      { text: 'Keep going', style: 'cancel' },
      {
        text: 'Discard',
        style: 'destructive',
        onPress: () => {
          clearDraft();
          router.back();
        },
      },
      { text: 'Leave', onPress: () => router.back() },
    ]);
  }

  /* ---------- Summary after Finish ---------- */
  if (summary) {
    return (
      <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 48 }}>
        <Stack.Screen options={{ title: 'Workout saved', headerLeft: () => null, gestureEnabled: true }} />
        <Text style={[display(24), { textAlign: 'center', marginTop: 16 }]}>Done</Text>
        <Row style={{ gap: 12 }}>
          <Stat label="Sets" value={`${summary.sets}/${summary.total}`} />
          <Stat label="Minutes" value={String(summary.minutes)} />
        </Row>
        {summary.prs.length ? (
          <View style={{ backgroundColor: colors.achievement, borderRadius: BRAND.radius.md, padding: 14, gap: 4 }}>
            <Text style={{ color: colors.bg, fontWeight: '600' }}>New best</Text>
            {summary.prs.map((p) => (
              <Text key={p} style={{ color: colors.bg }}>{p}</Text>
            ))}
          </View>
        ) : null}
        <Note>{`${summary.team ? 'Your coach can see this workout. ' : ''}Refuel within an hour: protein and carbs.`}</Note>
        <Button title="Done" onPress={() => router.back()} />
      </ScrollView>
    );
  }

  const header = (
    <View style={{ gap: 6 }}>
      <Row style={{ justifyContent: 'space-between' }}>
        <Text style={{ fontSize: 13, color: colors.muted }}>
          {mode === 'focus' ? `Exercise ${idx + 1} of ${plan.length} · ` : ''}
          {done} of {total} sets
        </Text>
        <ChipRow>
          <Chip label="One at a time" selected={mode === 'focus'} onPress={() => setMode('focus')} />
          <Chip label="List" selected={mode === 'list'} onPress={() => setMode('list')} />
        </ChipRow>
      </Row>
      <View style={{ height: 6, backgroundColor: colors.chartGrid, borderRadius: 3 }}>
        <View style={{ width: `${total ? (done / total) * 100 : 0}%`, height: 6, backgroundColor: colors.achievement, borderRadius: 3 }} />
      </View>
      <Row style={{ gap: 6, flexWrap: 'wrap' }}>
        <Pill text={day.block.label} />
        {day.light ? <Pill text="Lightened by coach" bg={colors.day.game} /> : null}
        {day.easing.active ? <Pill text="Easing back in this week" /> : null}
      </Row>
      <DroppedLine count={day.dropped} />
      {isRecovery ? <Note>{RECOVERY_NOTE}</Note> : null}
    </View>
  );

  const restBarHeight = rest || restDone ? 76 : 0;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Stack.Screen
        options={{
          title: session.name,
          headerLeft: () => (
            <Pressable onPress={leave} hitSlop={10} style={{ paddingHorizontal: Platform.OS === 'web' ? 16 : 0 }}>
              <Text style={{ fontSize: 16, fontWeight: '600' }}>Close</Text>
            </Pressable>
          ),
        }}
      />
      <ScrollView
        contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 32 + restBarHeight + insets.bottom }}
        keyboardShouldPersistTaps="handled"
      >
        {header}

        {mode === 'focus' ? (
          <>
            <ExerciseCard pe={plan[idx]} teamId={program.teamId} entry={entries[idx]} suggestion={suggestions[idx]} ei={idx} big setSet={setSet} toggleDone={toggleDone} />
            <Row>
              <View style={{ flex: 1 }}>
                <Button kind="ghost" title="Previous" disabled={idx === 0} onPress={() => update({ index: idx - 1 })} />
              </View>
              <View style={{ flex: 1 }}>
                <Button kind="secondary" title="Next" disabled={idx >= plan.length - 1} onPress={() => update({ index: idx + 1 })} />
              </View>
            </Row>
            {idx < plan.length - 1 ? (
              <Text style={{ fontSize: 13, color: colors.muted }}>
                Next up: {getExercise(plan[idx + 1].exerciseId).name} · {plan[idx + 1].sets} × {plan[idx + 1].reps}
              </Text>
            ) : null}
          </>
        ) : (
          plan.map((pe, i) => (
            <ExerciseCard key={i} pe={pe} teamId={program.teamId} entry={entries[i]} suggestion={suggestions[i]} ei={i} setSet={setSet} toggleDone={toggleDone} />
          ))
        )}

        {mode === 'list' || idx === plan.length - 1 || done === total ? (
          <>
            <Label>How did it feel?</Label>
            <TextInput
              style={{ minHeight: 70, textAlignVertical: 'top' }}
              multiline
              placeholder="Optional note: sore knee, felt strong, etc."
              value={draft.note}
              onChangeText={(t) => update({ note: t })}
            />
            <Button title="Finish workout" icon="checkmark" onPress={finish} />
          </>
        ) : null}
      </ScrollView>

      {rest || restDone ? (
        <View
          accessibilityLiveRegion="polite"
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            paddingHorizontal: 16,
            paddingTop: 12,
            paddingBottom: 12 + insets.bottom,
            backgroundColor: restDone ? colors.primaryBg : colors.raised,
            borderTopWidth: 1,
            borderTopColor: colors.line,
          }}
        >
          {rest ? (
            <Row style={{ justifyContent: 'space-between' }}>
              <View>
                <Text style={{ fontSize: 12, color: colors.muted }}>Rest</Text>
                <Text style={{ fontSize: 32, fontWeight: '600' }}>{clock(left)}</Text>
              </View>
              <Row style={{ gap: 6 }}>
                <Button small kind="ghost" title="−15s" onPress={() => setRest((r) => (r ? adjustRest(r, -15) : r))} />
                <Button small kind="ghost" title="+15s" onPress={() => setRest((r) => (r ? adjustRest(r, 15) : r))} />
                <Button small title="Skip" onPress={() => setRest(null)} />
              </Row>
            </Row>
          ) : (
            <Text style={{ fontSize: 20, fontWeight: '600', color: colors.primaryText, textAlign: 'center', paddingVertical: 10 }}>
              Rest done. Next set.
            </Text>
          )}
        </View>
      ) : null}
    </View>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card style={{ flex: 1, gap: 2 }}>
      <Text style={{ fontSize: 32, fontWeight: '600' }}>{value}</Text>
      <Text style={{ fontSize: 13, color: colors.muted }}>{label}</Text>
    </Card>
  );
}

function ExerciseCard({
  pe,
  teamId,
  entry,
  suggestion,
  ei,
  big,
  setSet,
  toggleDone,
}: {
  pe: ResolvedExercise;
  teamId?: string;
  entry: Entry;
  suggestion: Suggestion | null;
  ei: number;
  big?: boolean;
  setSet: (ei: number, si: number, patch: Partial<LoggedSet>) => void;
  toggleDone: (ei: number, si: number) => void;
}) {
  const info = getExercise(pe.exerciseId);
  const timed = !repRange(pe.reps);
  return (
    <Card>
      <Text style={[display(12), { color: colors.muted }]}>{CATEGORY_LABEL[info.category]}</Text>
      <Pressable accessibilityRole="link" onPress={() => router.push(`/exercise/${info.id}`)}>
        <Row style={{ gap: 6 }}>
          <Text style={{ fontSize: big ? 24 : 20, fontWeight: '600', flexShrink: 1 }}>{info.name}</Text>
          <Icon name="chevron.right" size={14} color={colors.faint} />
        </Row>
      </Pressable>
      <VersionLine exerciseId={pe.exerciseId} teamExerciseId={pe.teamExerciseId} teamId={teamId} />
      <Text style={{ fontSize: 16, fontWeight: '600' }}>
        {pe.sets} × {pe.reps} <Text style={{ fontSize: 13, color: colors.muted }}>· {pe.effort} {pe.restSecResolved > 0 ? ` · Rest ${formatRest(pe.restSecResolved)}` : ''}</Text>
      </Text>
      {info.weighted && !timed ? (
        suggestion ? (
          <Text style={{ fontSize: 13 }}>
            Last: {suggestion.last} →{' '}
            <Text style={{ fontWeight: '600' }}>
              {suggestion.reason === 'easing' ? `Start at ${suggestion.weight} (lighter week)` : suggestion.reason === 'test' ? `Start at ${suggestion.weight} (from your strength check)` : suggestion.reason === 'up' ? `Try ${suggestion.weight} (+${suggestion.delta})` : suggestion.reason === 'down' ? `Try ${suggestion.weight} (${suggestion.delta})` : `Stay at ${suggestion.weight}`}
            </Text>
          </Text>
        ) : (
          <Text style={{ fontSize: 13, color: colors.muted }}>Pick a weight you could lift 2–3 more times.</Text>
        )
      ) : null}
      {pe.notes ? <Text style={{ fontSize: 13 }}>Coach: {pe.notes}</Text> : null}
      {big ? <Body muted style={{ fontSize: 13 }}>{info.cue}</Body> : null}

      <Row style={{ gap: 8 }}>
        <Text style={{ width: 30, fontSize: 12, color: colors.muted }}>Set</Text>
        {info.weighted ? <Text style={{ flex: 1, fontSize: 12, color: colors.muted }}>Weight (lb)</Text> : null}
        <Text style={{ flex: 1, fontSize: 12, color: colors.muted }}>{timed ? 'Time / reps' : 'Reps'}</Text>
        <Text style={{ width: big ? 72 : 44, fontSize: 12, color: colors.muted, textAlign: 'center' }}>Done</Text>
      </Row>
      {entry.sets.map((s, si) => (
        <Row key={si} style={{ gap: 8 }}>
          <Text style={{ width: 30, fontWeight: '600', color: colors.muted }}>{si + 1}</Text>
          {info.weighted ? (
            <TextInput
              style={{ flex: 1, minWidth: 0, paddingVertical: big ? 12 : 8 }}
              keyboardType="decimal-pad"
              placeholder="—"
              value={s.weight}
              onChangeText={(t) => setSet(ei, si, { weight: t })}
            />
          ) : null}
          <TextInput
            style={{ flex: 1, minWidth: 0, paddingVertical: big ? 12 : 8 }}
            keyboardType="numbers-and-punctuation"
            value={s.reps}
            onChangeText={(t) => setSet(ei, si, { reps: t })}
          />
          <Pressable
            accessibilityRole="checkbox"
            accessibilityState={{ checked: s.done }}
            aria-checked={s.done}
            accessibilityLabel={`Set ${si + 1} done`}
            onPress={() => toggleDone(ei, si)}
            style={{
              width: big ? 72 : 44,
              height: big ? 48 : 40,
              borderRadius: BRAND.radius.md,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: s.done ? colors.achievement : 'transparent',
              borderWidth: s.done ? 0 : 2,
              borderColor: colors.line,
            }}
          >
            {s.done ? <Icon name="checkmark" size={18} color={colors.bg} /> : big ? <Text style={{ fontWeight: '600' }}>Done</Text> : null}
          </Pressable>
        </Row>
      ))}
    </Card>
  );
}
