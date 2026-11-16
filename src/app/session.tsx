import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, View } from 'react-native';
import { Body, Button, Card, colors, Field, H2, Label, Row, Screen, Stepper, Text, TextInput, Toggle, display, Icon } from '../components/ui';
import WarmupCard from '../components/general/WarmupCard';
import { ALL_EQUIPMENT, CATEGORY_LABEL, EXERCISES, exercisePool, fits, getExercise } from '../lib/exercises';
import { CARDIO_BREAK_LINE, cardioProblems, CIRCUIT_LINE, clampCardio, generalEffortProblem, INTENSITY_LABEL, TALK_TEST } from '../lib/general';
import { WARMUPS } from '../lib/generalLibrary';
import { cardioFor, rxFor } from '../lib/starter';
import { formatRest, restSecFor } from '../lib/generator';
import { useStore } from '../lib/store';
import { resolveFor } from '../lib/athlete';
import { estimateMinutes, FLOOR_MESSAGE, formatMinutes, REST_FLOOR, tierOf , lengthTarget } from '../lib/rest';
import { effortProblem } from '../lib/resolve';
import { blockRests, blocksOf, clockProblem, CLOCK_REASON, groupRows, labelOf, straightRests, ungroup } from '../lib/groups';
import StationsEditor from '../components/StationsEditor';
import { useTeams } from '../lib/team';
import VersionLine, { DroppedLine } from '../components/VersionLine';
import type { ExerciseCategory, ProgramExercise, Session, SlotRole } from '../lib/types';

const CATS: ExerciseCategory[] = ['power', 'lower', 'upper', 'core', 'prehab'];
const TIER_WORD = { P: 'Power', A: 'Heavy', B: 'Compound', C: 'Accessory', D: 'Care' } as const;

export default function SessionScreen() {
  const { programId, sessionId } = useLocalSearchParams<{ programId: string; sessionId: string }>();
  const { data, saveProgram } = useStore();
  const program = data.programs.find((p) => p.id === programId);
  const session = program?.sessions.find((s) => s.id === sessionId);
  const [picker, setPicker] = useState<{ replaceIndex: number | null } | null>(null);
  const [floorNote, setFloorNote] = useState<Record<number, string>>({});
  const [selected, setSelected] = useState<number[]>([]);
  const [groupMsg, setGroupMsg] = useState<string | null>(null);
  const { members } = useTeams();

  if (!program || !session) return <Screen><Body muted>Session not found.</Body></Screen>;
  const coach = data.profile?.role === 'coach';
  const canStart = !coach && data.activeProgramId === program.id;

  const general = !!program.general;
  // Athletes see their version of the team's workout (G-1: resolveSession).
  if (program.teamId && !coach) {
    const resolved = resolveFor(data, program, session);
    const warm = general && session.warmup !== null ? WARMUPS.find((w) => w.id === (session.warmup ?? 'W1')) : undefined;
    return (
      <Screen>
        <Stack.Screen options={{ title: session.name }} />
        {canStart ? (
          <Button
            title="Start this workout"
            icon="play.fill"
            onPress={() => router.push({ pathname: '/workout', params: { programId: program.id, sessionId: session.id } })}
          />
        ) : null}
        <Body muted style={{ fontSize: 13 }}>{`${session.focus} · ${formatMinutes(resolved.estMinutes)}`}</Body>
        {warm ? <WarmupCard id={warm.id} /> : null}
        {resolved.exercises.map((e, i) => {
          const info = getExercise(e.exerciseId);
          if (e.cardio) {
            return (
              <Card key={`${e.exerciseId}-${i}`} style={{ gap: 6 }}>
                <Text style={[display(12), { color: colors.muted }]}>Cardio</Text>
                <H2>{`${info.name} · ${e.cardio.minutes} min · ${INTENSITY_LABEL[e.cardio.intensity]}`}</H2>
                <Text style={{ fontSize: 13, color: colors.muted }}>{TALK_TEST[e.cardio.intensity]}</Text>
                {e.notes ? <Text style={{ fontSize: 13 }}>Trainer: {e.notes}</Text> : null}
              </Card>
            );
          }
          return (
            <Card key={`${e.exerciseId}-${i}`} style={{ gap: 6 }}>
              <Text style={[display(12), { color: colors.muted }]}>{CATEGORY_LABEL[info.category]}</Text>
              <Pressable accessibilityRole="link" onPress={() => router.push(`/exercise/${info.id}`)} style={{ minHeight: 44, justifyContent: 'center' }}>
                <H2>{info.name}</H2>
              </Pressable>
              <VersionLine exerciseId={e.exerciseId} teamExerciseId={e.teamExerciseId} teamId={program.teamId} />
              <Text style={{ fontSize: 16, fontWeight: '600' }}>
                {e.sets} × {e.reps} <Text style={{ fontSize: 13, color: colors.muted }}>· {e.effort} · Rest {formatRest(e.restSecResolved)}</Text>
              </Text>
              {e.notes ? <Text style={{ fontSize: 13 }}>{general ? 'Trainer' : 'Coach'}: {e.notes}</Text> : null}
              <Body muted style={{ fontSize: 13 }}>{info.cue}</Body>
            </Card>
          );
        })}
        <DroppedLine count={resolved.dropped} />
      </Screen>
    );
  }

  const gym = program.equipment ?? ALL_EQUIPMENT;
  const home = session.location === 'home';
  const restCtx = { phase: program.phase, equipment: home ? [] : program.equipment, home, light: !!session.light };
  const rests = blockRests(session.exercises, session.exercises.map((e) => (e.group ? straightRests([e], restCtx)[0] : restSecFor(e, restCtx))), restCtx);
  const minutes = estimateMinutes(
    session.exercises.map((e, i) => ({ ex: getExercise(e.exerciseId), sets: e.filler ? 0 : e.sets, reps: e.reps, restSec: rests[i] })),
    home ? 'home' : 'school',
  );
  const target = lengthTarget(program.phase, session.light ? 'light' : home ? 'home' : 'school');
  const hasMinor = !!program.teamId && (members[program.teamId] ?? []).some((m) => m.isMinor !== false);
  const swapping = picker?.replaceIndex != null ? getExercise(session.exercises[picker.replaceIndex].exerciseId) : null;
  // 2.3.0: general teams pick from the whole library + the general library, limited to the gym equipment profile (F39c).
  const pool = exercisePool(general);
  const usable = pool.filter((x) => fits(x, gym));
  const pickerGroups: { title: string; items: typeof EXERCISES; dim?: boolean }[] = [
    ...(swapping ? [{ title: 'Same movement', items: usable.filter((x) => x.pattern === swapping.pattern && x.id !== swapping.id) }] : []),
    ...(general ? [...CATS, 'cardio' as ExerciseCategory] : CATS).map((c) => ({
      title: CATEGORY_LABEL[c],
      items: usable.filter((x) => x.category === c && (!swapping || x.pattern !== swapping.pattern)),
    })),
    ...(general ? [] : [{ title: 'Needs other equipment', items: EXERCISES.filter((x) => !fits(x, gym)), dim: true }]),
  ];
  const goal = program.goal ?? 'general';
  const sessionProblems = general ? cardioProblems(session, program.goal) : [];

  function update(next: Session) {
    saveProgram({
      ...program!,
      sessions: program!.sessions.map((s) => (s.id === next.id ? next : s)),
      // Coach edits to a team workout wait for "Post to team".
      ...(program!.teamId ? { unposted: true } : null),
    });
  }
  function setEx(i: number, patch: Partial<ProgramExercise>) {
    // Any manual change to a grouped row removes its "Auto" tag.
    update({ ...session!, exercises: session!.exercises.map((e, k) => (k === i ? { ...e, ...patch, ...(e.group ? { autoGroup: false } : {}) } : e)) });
  }
  function toggleSelect(i: number) {
    setGroupMsg(null);
    setSelected((sel) => (sel.includes(i) ? sel.filter((x) => x !== i) : [...sel, i]));
  }
  function groupSelected() {
    const res = groupRows(session!.exercises, selected, program!.equipment);
    if (res.reason) {
      setGroupMsg(res.reason);
      return;
    }
    update({ ...session!, exercises: res.list! });
    setSelected([]);
  }
  function move(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= session!.exercises.length) return;
    const list = [...session!.exercises];
    [list[i], list[j]] = [list[j], list[i]];
    update({ ...session!, exercises: list });
  }
  /** Coach rest wins, within the floors (tier A ≥ 2:00, tier P ≥ 1:30). Below the floor resets to it, with the reason. */
  function setRest(i: number, sec: number) {
    const ex = getExercise(session!.exercises[i].exerciseId);
    const floor = REST_FLOOR[tierOf(ex, program!.equipment)] ?? 0;
    const next = Math.min(600, Math.max(floor, sec));
    setFloorNote((n) => ({ ...n, [i]: sec < floor ? FLOOR_MESSAGE[tierOf(ex, program!.equipment)] ?? '' : '' }));
    setEx(i, { restSec: next, restSetByCoach: true });
  }
  function remove(i: number) {
    update({ ...session!, exercises: session!.exercises.filter((_, k) => k !== i) });
  }
  function pick(exerciseId: string) {
    const ex = getExercise(exerciseId);
    if (general && ex.durationOnly) {
      // F41: a cardio block is minutes + Easy/Moderate only.
      const rx = clampCardio(cardioFor(goal), program!.goal);
      const row: ProgramExercise = { exerciseId, sets: 1, reps: `${rx.minutes} min`, effort: INTENSITY_LABEL[rx.intensity], cardio: rx };
      if (picker?.replaceIndex != null) update({ ...session!, exercises: session!.exercises.map((e, k) => (k === picker.replaceIndex ? row : e)) });
      else update({ ...session!, exercises: [...session!.exercises, row] });
      setPicker(null);
      return;
    }
    if (picker?.replaceIndex != null) {
      setEx(picker.replaceIndex, { exerciseId, ...(general ? { cardio: undefined } : {}) });
    } else if (general) {
      // The goal fills the slot's defaults (adult-goals.md §2).
      const role: SlotRole = ex.category === 'power' ? 'power' : ex.category === 'core' ? 'core' : ex.category === 'prehab' ? (ex.pattern === 'mobility' ? 'mobility' : 'care') : ex.tier === 'A' ? 'main' : ex.tier === 'B' ? 'secondary' : 'accessory';
      const rx = rxFor(goal, role) ?? { sets: 3, reps: '8–10', effort: 'RPE 7' };
      update({ ...session!, exercises: [...session!.exercises, { exerciseId, sets: rx.sets, reps: rx.reps, effort: rx.effort, role }] });
    } else {
      update({ ...session!, exercises: [...session!.exercises, { exerciseId, sets: 3, reps: '8', effort: 'RPE 7', role: 'accessory' }] });
    }
    setPicker(null);
  }

  return (
    <Screen>
      <Stack.Screen options={{ title: session.name }} />
      {program.teamId ? (
        <Body muted style={{ fontSize: 13 }}>
          {general ? 'Changes save on this phone. Post the program to send it to your clients.' : `Changes save on this phone. Post the team workout to send them to ${program.teamName ?? 'the team'}.`}
        </Body>
      ) : null}
      {canStart ? (
        <Button
          title="Start this workout"
          icon="play.fill"
          onPress={() => router.push({ pathname: '/workout', params: { programId: program.id, sessionId: session.id } })}
        />
      ) : null}

      <Field label="Session name" value={session.name} onChangeText={(t) => update({ ...session, name: t })} />
      <Row style={{ gap: 6, flexWrap: 'wrap' }}>
        <Text style={{ fontSize: 13, fontWeight: '600' }}>{session.light ? '🏠 Light home' : home ? '🏠 Home' : '🏋 Weight room'}</Text>
        <Text style={{ fontSize: 13, color: colors.muted }}>{session.focus}</Text>
      </Row>
      {home ? (
        <Body muted style={{ fontSize: 13 }}>
          {general
            ? 'Each client gets the best version for their home equipment and level. Your sets, reps, and effort stay the same.'
            : 'Each athlete gets the best version for their home equipment and level. Your sets, reps, and effort stay the same.'}
        </Body>
      ) : null}
      {general ? (
        <Card>
          <Row style={{ justifyContent: 'space-between', minHeight: 44 }}>
            <Text style={{ fontSize: 15, fontWeight: '600', flex: 1 }}>General warm-up</Text>
            <Toggle accessibilityLabel="General warm-up" value={session.warmup !== null} onValueChange={(v) => update({ ...session, warmup: v ? 'W1' : null })} />
          </Row>
          {session.warmup !== null ? (
            <Row style={{ gap: 6, flexWrap: 'wrap' }}>
              {WARMUPS.map((w) => (
                <Button key={w.id} small kind={(session.warmup ?? 'W1') === w.id ? 'primary' : 'ghost'} title={w.name} onPress={() => update({ ...session, warmup: w.id })} />
              ))}
            </Row>
          ) : null}
        </Card>
      ) : null}
      {sessionProblems.map((m) => (
        <Text key={m} accessibilityRole="alert" style={{ fontSize: 13, color: colors.errorText }}>{m}</Text>
      ))}
      {program.teamId ? <StationsEditor program={program} session={session} hasMinor={hasMinor} onChange={update} /> : null}

      {session.exercises.map((e, i) => {
        const info = getExercise(e.exerciseId);
        const rest = rests[i];
        const label = labelOf(session.exercises, i);
        const block = e.group ? blocksOf(session.exercises).get(e.group) ?? [] : [];
        const firstInBlock = block.length >= 2 && block[0] === i;
        const lastInBlock = block.length >= 2 && block[block.length - 1] === i;
        const generalProblem = general ? generalEffortProblem(e) : null;
        const problem = general ? (generalProblem ? { block: true, message: generalProblem } : null) : program.teamId ? effortProblem(e, program.phase, hasMinor) : null;
        const clock = clockProblem(e, block.length >= 3, program.equipment);
        if (general && e.cardio) {
          const max = program.goal === 'back_after_break' ? 15 : 60;
          return (
            <Card key={`${e.exerciseId}-${i}`}>
              <Text style={[display(12), { color: colors.muted }]}>Cardio</Text>
              <Pressable accessibilityRole="link" onPress={() => router.push(`/exercise/${info.id}`)} style={{ minHeight: 44, justifyContent: 'center' }}>
                <H2>{info.name}</H2>
              </Pressable>
              <Row style={{ justifyContent: 'space-between' }}>
                <Label>Minutes</Label>
                <Stepper value={e.cardio.minutes} min={5} max={max} onChange={(n) => setEx(i, { cardio: clampCardio({ ...e.cardio!, minutes: n }, program.goal), reps: `${n} min` })} />
              </Row>
              <Label>Effort</Label>
              <Row style={{ gap: 6 }}>
                {(['easy', 'moderate'] as const).map((k) => (
                  <View key={k} style={{ flex: 1 }}>
                    <Button
                      small
                      kind={e.cardio!.intensity === k ? 'primary' : 'ghost'}
                      title={INTENSITY_LABEL[k]}
                      disabled={k === 'moderate' && program.goal === 'back_after_break'}
                      onPress={() => setEx(i, { cardio: { ...e.cardio!, intensity: k }, effort: INTENSITY_LABEL[k] })}
                    />
                  </View>
                ))}
              </Row>
              <Text style={{ fontSize: 13, color: colors.muted }}>{TALK_TEST[e.cardio.intensity]}</Text>
              {program.goal === 'back_after_break' ? <Text style={{ fontSize: 13, color: colors.muted }}>{CARDIO_BREAK_LINE}</Text> : null}
              <Row>
                <View style={{ flex: 1 }}>
                  <Button small kind="ghost" title="Swap" onPress={() => setPicker({ replaceIndex: i })} />
                </View>
                <View style={{ flex: 1 }}>
                  <Button small kind="danger" title="Remove" onPress={() => remove(i)} />
                </View>
              </Row>
            </Card>
          );
        }
        const prevHeavy = i > 0 && ['A', 'P'].includes(tierOf(getExercise(session.exercises[i - 1].exerciseId), program.equipment));
        return (
          <View key={`${e.exerciseId}-${i}`} style={{ gap: 6 }}>
          {firstInBlock ? (
            <Row style={{ justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 14, fontWeight: '700' }}>
                {`${block.length === 2 ? 'Superset' : 'Circuit'} · ${Math.min(...block.map((k) => session.exercises[k].sets))} rounds`}
                {e.autoGroup ? '  · Auto' : ''}
              </Text>
              <Text accessibilityRole="button" onPress={() => update({ ...session, exercises: ungroup(session.exercises, e.group!) })} style={{ fontSize: 13, textDecorationLine: 'underline' }}>
                {block.length === 2 ? 'Unpair' : 'Ungroup'}
              </Text>
            </Row>
          ) : null}
          <Card style={block.length >= 2 ? { borderLeftWidth: 4, borderLeftColor: colors.ink } : undefined}>
            <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <View style={{ flex: 1 }}>
                <Row style={{ gap: 8 }}>
                  <Pressable
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: selected.includes(i) }}
                    accessibilityLabel={`Select ${info.name}`}
                    onPress={() => toggleSelect(i)}
                    style={{ minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}
                  >
                    <Text style={{ fontSize: 18 }}>{selected.includes(i) ? '☑' : '☐'}</Text>
                  </Pressable>
                  {label ? <Text style={{ fontSize: 16, fontWeight: '800' }}>{label}</Text> : null}
                  <Text style={[display(12), { color: colors.muted }]}>{CATEGORY_LABEL[info.category]}</Text>
                  {/* Coach-only tier chip (F19c), words not letters. */}
                  <Text style={{ fontSize: 11, color: colors.muted, borderWidth: 1, borderColor: colors.line, borderRadius: 999, paddingHorizontal: 6 }}>
                    {TIER_WORD[tierOf(info, program.equipment)]}
                  </Text>
                  {e.filler ? <Text style={{ fontSize: 12, color: colors.muted }}>During rest</Text> : null}
                </Row>
                <Pressable accessibilityRole="link" onPress={() => router.push(`/exercise/${info.id}`)} style={{ minHeight: 44, justifyContent: 'center' }}>
                  <H2>{info.name}</H2>
                </Pressable>
                <Body muted style={{ fontSize: 13 }}>{info.cue}</Body>
                {!fits(info, gym) ? <Text style={{ fontSize: 12, color: colors.warningText }}>Needs equipment this program doesn&apos;t have.</Text> : null}
              </View>
              <View style={{ gap: 2 }}>
                <Pressable accessibilityLabel="Move up" onPress={() => move(i, -1)} hitSlop={6}>
                  <Icon name="chevron.up" size={16} color={colors.muted} />
                </Pressable>
                <Pressable accessibilityLabel="Move down" onPress={() => move(i, 1)} hitSlop={6}>
                  <Icon name="chevron.down" size={16} color={colors.muted} />
                </Pressable>
              </View>
            </Row>
            <Row style={{ justifyContent: 'space-between' }}>
              <Label>Sets</Label>
              <Stepper value={e.sets} min={1} max={10} onChange={(n) => setEx(i, { sets: n })} />
            </Row>
            <Row>
              <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
                <Label>Reps</Label>
                <TextInput style={{ minWidth: 0 }} value={e.reps} onChangeText={(t) => setEx(i, { reps: t })} />
              </View>
              <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
                <Label>Effort</Label>
                <TextInput
                  style={{ minWidth: 0, ...(problem ? { borderColor: problem.block ? colors.error : colors.warning, borderWidth: 2 } : null) }}
                  value={e.effort}
                  onChangeText={(t) => setEx(i, { effort: t })}
                  accessibilityHint={problem?.message}
                />
              </View>
            </Row>
            {problem ? (
              <Text accessibilityRole="alert" style={{ fontSize: 13, color: problem.block ? colors.errorText : colors.warningText }}>
                {problem.block || general ? problem.message : `${problem.message} This team is all adults, so you can still post it.`}
              </Text>
            ) : null}
            {clock ? (
              <Text accessibilityRole="alert" style={{ fontSize: 13, color: !general && hasMinor ? colors.errorText : colors.warningText }}>{general ? CIRCUIT_LINE : CLOCK_REASON}</Text>
            ) : null}
            <Row style={{ justifyContent: 'space-between' }}>
              <Label>Rest</Label>
              <Row style={{ gap: 6 }}>
                <Button small kind="ghost" title="−15s" onPress={() => setRest(i, rest - 15)} />
                <Text style={{ minWidth: 64, textAlign: 'center', fontWeight: '600' }}>{formatRest(rest)}</Text>
                <Button small kind="ghost" title="+15s" onPress={() => setRest(i, rest + 15)} />
              </Row>
            </Row>
            {floorNote[i] ? <Text style={{ fontSize: 13, color: colors.muted }}>{floorNote[i]}</Text> : null}
            {block.length >= 2 ? (
              <Text style={{ fontSize: 13, color: colors.muted }}>
                {lastInBlock ? `Rest ${formatRest(rest)} after the ${block.length === 2 ? 'pair' : 'round'}.` : `15 s to ${labelOf(session.exercises, block[block.indexOf(i) + 1])}.`}
              </Text>
            ) : null}
            {tierOf(info, program.equipment) === 'D' && prevHeavy && !e.group ? (
              <Text accessibilityRole="button" onPress={() => setEx(i, { filler: !e.filler })} style={{ fontSize: 13, textDecorationLine: 'underline' }}>
                {e.filler ? 'Do as its own exercise' : 'Do during the rest of the lift above'}
              </Text>
            ) : null}
            <TextInput
              style={{ fontSize: 14 }}
              placeholder="Notes (optional)"
              placeholderTextColor={colors.faint}
              value={e.notes ?? ''}
              onChangeText={(t) => setEx(i, { notes: t })}
            />
            <Row>
              <View style={{ flex: 1 }}>
                <Button small kind="ghost" title="Swap" onPress={() => setPicker({ replaceIndex: i })} />
              </View>
              <View style={{ flex: 1 }}>
                <Button small kind="danger" title="Remove" onPress={() => remove(i)} />
              </View>
            </Row>
          </Card>
          {lastInBlock && block.length === 4 ? (
            <Text style={{ fontSize: 13, color: colors.muted }}>Beginners do A1–A3 as the circuit, then A4 as straight sets after.</Text>
          ) : null}
          {lastInBlock && new Set(block.map((k) => session.exercises[k].sets)).size > 1 ? (
            <Text style={{ fontSize: 13, color: colors.muted }}>Extra sets are done on their own at the end.</Text>
          ) : null}
          </View>
        );
      })}

      {selected.length >= 2 ? (
        <Card>
          <Button title={selected.length === 2 ? 'Pair as superset' : 'Group as circuit'} onPress={groupSelected} />
          {groupMsg ? <Text accessibilityRole="alert" style={{ fontSize: 13, color: colors.errorText }}>{groupMsg}</Text> : null}
          <Button small kind="ghost" title="Clear selection" onPress={() => setSelected([])} />
        </Card>
      ) : null}

      <Text style={{ fontSize: 14, fontWeight: '600', color: minutes > target ? colors.warningText : colors.ink }}>
        {`${formatMinutes(minutes)} · target ${target}${minutes > target ? ' ●' : ''}`}
      </Text>
      {general ? (
        <Text accessibilityRole="link" onPress={() => router.push({ pathname: '/gym', params: { teamId: program.teamId! } })} style={{ fontSize: 13, textDecorationLine: 'underline', minHeight: 44, paddingVertical: 12 }}>
          Missing something? Add equipment in Gym equipment.
        </Text>
      ) : null}

      <Button kind="secondary" title="Add exercise" icon="plus" onPress={() => setPicker({ replaceIndex: null })} />

      <Card>
        <Label>What does effort mean?</Label>
        <Body style={{ fontSize: 14 }}>
          {general
            ? 'RPE is how hard a set feels, 1–10. RPE 7 means about 3 reps left in the tank. Strength sets stop with about 2 reps left: RPE 8 or below.'
            : 'RPE is how hard a set feels, 1–10. RPE 7 means about 3 reps left in the tank. Strength sets stop with about 2 reps left: RPE 8 or below, RPE 7 in-season.'}
        </Body>
      </Card>

      <Modal visible={!!picker} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setPicker(null)}>
        <View style={{ flex: 1, backgroundColor: colors.bg }}>
          <Row style={{ justifyContent: 'space-between', padding: 16 }}>
            <H2>{picker?.replaceIndex != null ? 'Swap exercise' : 'Add exercise'}</H2>
            <Pressable onPress={() => setPicker(null)} hitSlop={10}>
              <Text style={{ fontWeight: '600', fontSize: 16 }}>Cancel</Text>
            </Pressable>
          </Row>
          <ScrollView contentContainerStyle={{ padding: 16, paddingTop: 0, gap: 8, paddingBottom: 48 }}>
            {pickerGroups.map((g) =>
              g.items.length ? (
                <View key={g.title} style={{ gap: 8 }}>
                  <Label>{g.title}</Label>
                  {g.items.map((x) => (
                    <Pressable key={x.id} onPress={() => pick(x.id)}>
                      <Card style={{ padding: 12, gap: 2, opacity: g.dim ? 0.6 : 1 }}>
                        <Text style={{ fontWeight: '600', fontSize: 16 }}>{x.name}</Text>
                        <Text style={{ color: colors.muted, fontSize: 13 }}>{x.cue}</Text>
                      </Card>
                    </Pressable>
                  ))}
                </View>
              ) : null,
            )}
          </ScrollView>
        </View>
      </Modal>
    </Screen>
  );
}

