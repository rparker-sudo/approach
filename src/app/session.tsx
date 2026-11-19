import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, View } from 'react-native';
import { Body, Button, Card, colors, Field, H2, Label, Pill, Row, Screen, Stepper, Text, TextInput, Toggle, display, Icon } from '../components/ui';
import WarmupCard from '../components/WarmupCard';
import WarmupRow from '../components/WarmupEditor';
import { FitBanner, FitSheet } from '../components/FitToTime';
import CustomExerciseSheet from '../components/CustomExerciseSheet';
import { CustomInput, inputOf, roleOf } from '../lib/customExercise';
import { ALL_EQUIPMENT, CATEGORY_LABEL, EXERCISES, exercisePool, fits, getExercise } from '../lib/exercises';
import { clampCardio, INTENSITY_LABEL, TALK_TEST } from '../lib/general';
import { cardioFor, rxFor } from '../lib/starter';
import { formatRest, homeAllowed, restSecFor } from '../lib/generator';
import { useStore } from '../lib/store';
import { resolveFor } from '../lib/athlete';
import { restFor, tierOf } from '../lib/rest';
import { clampCardioFree, coachEdit, levelAdjustFor, sourceOf, warmupCtxFor } from '../lib/resolve';
import { blockRests, blocksOf, groupRows, labelOf, straightRests, ungroup } from '../lib/groups';
import { estimateSession, fitSession, targetFor, type FitCtx } from '../lib/fit';
import { SESSION_TYPE_LABEL, sessionType, warmupMinutes } from '../lib/warmup';
import StationsEditor from '../components/StationsEditor';
import VersionLine, { DroppedLine } from '../components/VersionLine';
import type { Exercise, ExerciseCategory, ProgramExercise, Session, SlotRole } from '../lib/types';

const CATS: ExerciseCategory[] = ['power', 'lower', 'upper', 'core', 'prehab'];

const TIER_WORD = { P: 'Power', A: 'Heavy', B: 'Compound', C: 'Accessory', D: 'Care' } as const;

export default function SessionScreen() {
  const { programId, sessionId } = useLocalSearchParams<{ programId: string; sessionId: string }>();
  const { data, saveProgram } = useStore();
  const program = data.programs.find((p) => p.id === programId);
  const session = program?.sessions.find((s) => s.id === sessionId);
  const [picker, setPicker] = useState<{ replaceIndex: number | null } | null>(null);
  // 2.3.1: create or edit a custom exercise; `replaceIndex` is where it goes once saved (null = add, undefined = edit only).
  const [custom, setCustom] = useState<{ initial?: CustomInput; replaceIndex?: number | null } | null>(null);
  const [selected, setSelected] = useState<number[]>([]);
  const [fitOpen, setFitOpen] = useState(false);
  const [showAll, setShowAll] = useState(false);

  if (!program || !session) return <Screen><Body muted>Session not found.</Body></Screen>;
  const coach = data.profile?.role === 'coach';
  const canStart = !coach && data.activeProgramId === program.id;

  const general = !!program.general;
  // Athletes see their version of the team's workout (G-1: resolveSession).
  if (program.teamId && !coach) {
    const resolved = resolveFor(data, program, session);
    const differs = Math.abs(resolved.estMinutes - resolved.target.minutes) >= 5 && resolved.target.source !== 'phase';
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
        <Text style={{ fontSize: 13, color: colors.muted }}>
          {`${session.focus} · ${resolved.express ? 'Express · ' : ''}About ${resolved.estMinutes} min`}
          {differs ? <Text style={{ color: colors.muted }}>{` (planned for ${resolved.target.minutes})`}</Text> : null}
        </Text>
        {resolved.warmup ? (
          <WarmupCard
            warmup={resolved.warmup}
            minutes={warmupMinutes(resolved.warmup, { phase: program.phase, home: resolved.home })}
            typeLabel={SESSION_TYPE_LABEL[sessionType({ ...session, exercises: resolved.exercises })]}
            done={[]}
            coachWord={general ? 'trainer' : 'coach'}
          />
        ) : null}
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
  const source = sourceOf(program, session);
  const approach = source === 'approach';
  // 2.4.0: coach-built sessions use the coach's rest as typed; auto rest is a suggestion beside the field (§1.1 item 2).
  const restCtx = { phase: program.phase, equipment: home ? [] : program.equipment, home, light: !!session.light, free: !approach };
  const rests = blockRests(session.exercises, session.exercises.map((e) => (e.cardio ? 60 : e.group ? straightRests([e], restCtx)[0] : restSecFor(e, restCtx))), restCtx);
  const wctx = warmupCtxFor(program, session, home ? [] : gym);
  const fitCtx: FitCtx = { rest: restCtx, warmup: wctx, kind: home ? 'home' : 'school' };
  const target = targetFor(program, session);
  const minutes = estimateSession(session, fitCtx, { rests });
  // Generated sessions show what fitting does (F51f); coach-built sessions show the estimate and offer Fit to time (F51e).
  const fitted = approach && !session.light && !session.mobility ? fitSession(session, target.minutes, fitCtx, { skip: (session.fitLog ?? []).filter((l) => l.startsWith('undo:')).map((l) => l.slice(5)) }) : null;
  const shownMinutes = fitted ? fitted.after : minutes;
  const swapping = picker?.replaceIndex != null ? getExercise(session.exercises[picker.replaceIndex].exerciseId) : null;
  // 2.3.0: general teams pick from the whole library + the general library, limited to the gym equipment profile (F39c).
  // 2.4.0 (§1.1 item 7): home sessions open on the H6 filter (no barbell/cable at home) with "Show all exercises".
  const pool = exercisePool(general);
  const homeFilter = (x: Exercise) => !home || showAll || homeAllowed(x, true);
  const usable = pool.filter((x) => fits(x, gym) && homeFilter(x));
  const pickerGroups: { title: string; items: typeof EXERCISES; dim?: boolean }[] = [
    ...(swapping ? [{ title: 'Same movement', items: usable.filter((x) => x.pattern === swapping.pattern && x.id !== swapping.id) }] : []),
    ...(general ? [...CATS, 'cardio' as ExerciseCategory] : CATS).map((c) => ({
      title: CATEGORY_LABEL[c],
      items: usable.filter((x) => x.category === c && (!swapping || x.pattern !== swapping.pattern)),
    })),
    ...(general ? [] : [{ title: 'Needs other equipment', items: EXERCISES.filter((x) => !fits(x, gym) && homeFilter(x)), dim: true }]),
  ];
  const goal = program.goal ?? 'general';
  const adjust = levelAdjustFor(program, session);
  /** Approach's auto rest for a row (the suggestion chip). */
  const autoRestOf = (e: ProgramExercise, _i: number) => (e.cardio ? 60 : restFor(getExercise(e.exerciseId), e, { ...restCtx, free: false }));

  /** Saves the session as it is: warm-up, length and level-toggle changes keep the session's source (§0.1). */
  function update(next: Session) {
    saveProgram({
      ...program!,
      sessions: program!.sessions.map((s) => (s.id === next.id ? next : s)),
      // Coach edits to a team workout wait for "Post to team".
      ...(program!.teamId ? { unposted: true } : null),
    });
  }
  /** Any change to an exercise, set, rep, effort, rest, grouping, order or station: the session becomes the coach's (§0.1). */
  function edit(next: Session) {
    update(coachEdit(next));
  }
  function setEx(i: number, patch: Partial<ProgramExercise>) {
    // Any manual change to a grouped row removes its "Auto" tag.
    edit({ ...session!, exercises: session!.exercises.map((e, k) => (k === i ? { ...e, ...patch, ...(e.group ? { autoGroup: false } : {}) } : e)) });
  }
  function toggleSelect(i: number) {
    setSelected((sel) => (sel.includes(i) ? sel.filter((x) => x !== i) : [...sel, i]));
  }
  function groupSelected() {
    // 2.4.0 (F45a): any two or more exercises; no blocked pairs, no reasons.
    edit({ ...session!, exercises: groupRows(session!.exercises, selected).list });
    setSelected([]);
  }
  function move(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= session!.exercises.length) return;
    const list = [...session!.exercises];
    [list[i], list[j]] = [list[j], list[i]];
    edit({ ...session!, exercises: list });
  }
  /** Any rest, including 0:00 (§1.1 item 2). Saved as typed. */
  function setRest(i: number, sec: number) {
    setEx(i, { restSec: Math.min(600, Math.max(0, sec)), restSetByCoach: true });
  }
  /** "Auto 3:00" chip: back to the automatic value. */
  function autoRest(i: number) {
    setEx(i, { restSec: undefined, restSetByCoach: undefined });
  }
  /**
   * The level toggle never changes the session's source (§0.1 and the Part 1 criterion). §1.2's "becomes 'coach'" sentence
   * conflicts with that criterion; resolveSession honors "off" on a generated session too (athletes get the written
   * exercises, Approach's limits still apply). Reported for Product.
   */
  function setLevelAdjust(v: boolean) {
    update({ ...session!, levelAdjust: v });
  }
  function remove(i: number) {
    edit({ ...session!, exercises: session!.exercises.filter((_, k) => k !== i) });
  }
  /** The row a new exercise gets: goal defaults in trainer teams; custom exercises follow their type. */
  function rowFor(ex: Exercise): ProgramExercise {
    if (general) {
      const role: SlotRole = ex.category === 'power' ? 'power' : ex.category === 'core' ? 'core' : ex.category === 'prehab' ? (ex.pattern === 'mobility' ? 'mobility' : 'care') : ex.tier === 'A' ? 'main' : ex.tier === 'B' ? 'secondary' : 'accessory';
      const rx = rxFor(goal, role) ?? { sets: 3, reps: '8–10', effort: 'RPE 7' };
      return { exerciseId: ex.id, sets: rx.sets, reps: rx.reps, effort: rx.effort, role };
    }
    if (ex.custom) {
      const role = roleOf(ex.tier, ex.pattern);
      if (role === 'power') return { exerciseId: ex.id, sets: 3, reps: '3', effort: 'Max effort', role };
      if (role === 'care' || role === 'mobility') return { exerciseId: ex.id, sets: 2, reps: '10', effort: 'Easy', role };
      return { exerciseId: ex.id, sets: 3, reps: '8–10', effort: 'RPE 7', role };
    }
    return { exerciseId: ex.id, sets: 3, reps: '8', effort: 'RPE 7', role: 'accessory' };
  }
  /** Save a custom exercise into this program, and (when it came from Add/Swap) put it in the session, in one save. */
  function saveCustom(ex: Exercise, replaceIndex: number | null | undefined) {
    const list = [...(program!.customExercises ?? []).filter((x) => x.id !== ex.id), ex];
    let exercises = session!.exercises;
    if (replaceIndex === null) exercises = [...exercises, rowFor(ex)];
    else if (typeof replaceIndex === 'number') exercises = exercises.map((e, k) => (k === replaceIndex ? { ...rowFor(ex), sets: e.sets, reps: e.reps, effort: e.effort } : e));
    saveProgram({
      ...program!,
      customExercises: list,
      sessions: program!.sessions.map((s) => (s.id === session!.id ? { ...session!, exercises, source: 'coach' as const, fitLog: undefined } : s)),
      ...(program!.teamId ? { unposted: true } : null),
    });
    setCustom(null);
  }
  function pick(exerciseId: string) {
    const ex = getExercise(exerciseId);
    if (general && ex.durationOnly) {
      // F41: a cardio block is minutes + Easy/Moderate only (Back after a break defaults to Easy, 10 min).
      const rx = clampCardio(cardioFor(goal), program!.goal);
      const row: ProgramExercise = { exerciseId, sets: 1, reps: `${rx.minutes} min`, effort: INTENSITY_LABEL[rx.intensity], cardio: rx };
      if (picker?.replaceIndex != null) edit({ ...session!, exercises: session!.exercises.map((e, k) => (k === picker.replaceIndex ? row : e)) });
      else edit({ ...session!, exercises: [...session!.exercises, row] });
      setPicker(null);
      return;
    }
    if (picker?.replaceIndex != null) {
      setEx(picker.replaceIndex, { exerciseId, ...(general ? { cardio: undefined } : {}) });
    } else {
      // The goal fills the slot's defaults in trainer teams (adult-goals.md §2); custom exercises follow their type.
      edit({ ...session!, exercises: [...session!.exercises, rowFor(ex)] });
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
      {fitted?.express ? <Pill text="Express" /> : null}
      {/* F46b (spec §1.2; CLAUDE.md known conflict 3): stays enabled when the program setting is off. */}
      <Card>
        <Row style={{ justifyContent: 'space-between', minHeight: 44 }}>
          <Text style={{ fontSize: 15, fontWeight: '600', flex: 1 }}>Adjust to level</Text>
          <Toggle accessibilityLabel="Adjust to level" value={adjust} onValueChange={setLevelAdjust} />
        </Row>
        <Text style={{ fontSize: 13, color: colors.muted }}>
          {`Program setting: ${program.levelAdjust === false ? 'Off' : 'On'}${typeof session.levelAdjust === 'boolean' ? ' · this session is set separately' : ''}`}
        </Text>
        {typeof session.levelAdjust === 'boolean' ? (
          <Text accessibilityRole="button" onPress={() => update({ ...session, levelAdjust: undefined })} style={{ fontSize: 13, textDecorationLine: 'underline', minHeight: 44, paddingVertical: 12 }}>
            Use the program setting
          </Text>
        ) : null}
      </Card>
      {!session.light && !session.mobility ? <WarmupRow session={session} ctx={wctx} teamId={program.teamId} general={general} onChange={update} /> : null}
      {fitted ? <FitBanner session={session} target={target.minutes} ctx={fitCtx} onChange={update} /> : null}
      {program.teamId ? <StationsEditor program={program} session={session} onChange={edit} /> : null}

      {session.exercises.map((e, i) => {
        const info = getExercise(e.exerciseId);
        const rest = rests[i];
        const label = labelOf(session.exercises, i);
        const block = e.group ? blocksOf(session.exercises).get(e.group) ?? [] : [];
        const firstInBlock = block.length >= 2 && block[0] === i;
        const lastInBlock = block.length >= 2 && block[block.length - 1] === i;
        if (general && e.cardio) {
          return (
            <Card key={`${e.exerciseId}-${i}`}>
              <Text style={[display(12), { color: colors.muted }]}>Cardio</Text>
              <Pressable accessibilityRole="link" onPress={() => router.push(`/exercise/${info.id}`)} style={{ minHeight: 44, justifyContent: 'center' }}>
                <H2>{info.name}</H2>
              </Pressable>
              <Row style={{ justifyContent: 'space-between' }}>
                <Label>Minutes</Label>
                {/* F41 (2.4.0): 5–180 min; minutes and Easy/Moderate stay the only fields (adult rule A4). */}
                <Stepper value={e.cardio.minutes} min={5} max={180} onChange={(n) => setEx(i, { cardio: clampCardioFree({ ...e.cardio!, minutes: n }), reps: `${n} min` })} />
              </Row>
              <Label>Effort</Label>
              <Row style={{ gap: 6 }}>
                {(['easy', 'moderate'] as const).map((k) => (
                  <View key={k} style={{ flex: 1 }}>
                    <Button
                      small
                      kind={e.cardio!.intensity === k ? 'primary' : 'ghost'}
                      title={INTENSITY_LABEL[k]}
                      onPress={() => setEx(i, { cardio: { ...e.cardio!, intensity: k }, effort: INTENSITY_LABEL[k] })}
                    />
                  </View>
                ))}
              </Row>
              <Text style={{ fontSize: 13, color: colors.muted }}>{TALK_TEST[e.cardio.intensity]}</Text>
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
              <Text accessibilityRole="button" onPress={() => edit({ ...session, exercises: ungroup(session.exercises, e.group!) })} style={{ fontSize: 13, textDecorationLine: 'underline', minHeight: 44, minWidth: 44, paddingVertical: 12, textAlignVertical: 'center' }}>
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
                {/* 2.4.0 (§1.1 item 1, D-049): any text or RPE saves. No block, warning, or note. */}
                <TextInput style={{ minWidth: 0 }} value={e.effort} onChangeText={(t) => setEx(i, { effort: t })} />
              </View>
            </Row>
            <Row style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 }}>
              <Label>Rest</Label>
              <Row style={{ gap: 6 }}>
                <Button small kind="ghost" title="−15s" accessibilityLabel="Rest minus 15 seconds" onPress={() => setRest(i, rest - 15)} />
                <Text style={{ minWidth: 64, textAlign: 'center', fontWeight: '600' }}>{formatRest(rest)}</Text>
                <Button small kind="ghost" title="+15s" accessibilityLabel="Rest plus 15 seconds" onPress={() => setRest(i, rest + 15)} />
              </Row>
            </Row>
            {autoRestOf(e, i) !== rest && !e.group ? (
              <Pressable accessibilityRole="button" accessibilityLabel={`Use auto rest ${formatRest(autoRestOf(e, i))}`} onPress={() => autoRest(i)} style={{ alignSelf: 'flex-end', minHeight: 44, justifyContent: 'center' }}>
                <Text style={{ fontSize: 12, borderWidth: 1, borderColor: colors.line, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 }}>{`Auto ${formatRest(autoRestOf(e, i))}`}</Text>
              </Pressable>
            ) : null}
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
          {lastInBlock && block.length >= 4 && approach ? (
            <Text style={{ fontSize: 13, color: colors.muted }}>Beginners do the first 3 as the circuit, then the rest as straight sets after.</Text>
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
          <Button small kind="ghost" title="Clear selection" onPress={() => setSelected([])} />
        </Card>
      ) : null}

      {/* F51d: text only, no warning color (it isn't an error). */}
      <Text style={{ fontSize: 14, fontWeight: '600', color: colors.ink }}>
        {`about ${shownMinutes} min · target ${target.minutes}${shownMinutes - target.minutes > 0 ? ` · ${shownMinutes - target.minutes} over` : target.minutes - shownMinutes >= 8 ? ` · ${target.minutes - shownMinutes} under` : ''}`}
      </Text>
      <Text style={{ fontSize: 13, color: colors.muted }}>{target.label}</Text>
      {!approach && minutes > target.minutes ? <Button small kind="secondary" title="Fit to time" onPress={() => setFitOpen(true)} /> : null}
      {general ? (
        <Text accessibilityRole="link" onPress={() => router.push({ pathname: '/gym', params: { teamId: program.teamId! } })} style={{ fontSize: 13, textDecorationLine: 'underline', minHeight: 44, paddingVertical: 12 }}>
          Missing something? Add equipment in Gym equipment.
        </Text>
      ) : null}

      <Button kind="secondary" title="Add exercise" icon="plus" onPress={() => setPicker({ replaceIndex: null })} />

      <Card>
        <Label>What does effort mean?</Label>
        <Body style={{ fontSize: 14 }}>RPE is how hard a set feels, 1–10. RPE 7 means about 3 reps left in the tank.</Body>
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
            {home ? (
              <Row style={{ justifyContent: 'space-between', minHeight: 44 }}>
                <Text style={{ fontSize: 15, flex: 1 }}>Show all exercises</Text>
                <Toggle accessibilityLabel="Show all exercises" value={showAll} onValueChange={setShowAll} />
              </Row>
            ) : null}
            {/* 2.3.1: the coach's own exercises for this program. */}
            <Button
              kind="secondary"
              icon="plus"
              title="Create custom exercise"
              onPress={() => {
                setCustom({ replaceIndex: picker?.replaceIndex ?? null });
                setPicker(null);
              }}
            />
            {(program.customExercises ?? []).length ? (
              <View style={{ gap: 8 }}>
                <Label>Your exercises</Label>
                {(program.customExercises ?? []).map((x) => (
                  <Card key={x.id} style={{ padding: 12, gap: 6 }}>
                    <Pressable accessibilityRole="button" onPress={() => pick(x.id)} style={{ minHeight: 44, justifyContent: 'center' }}>
                      <Text style={{ fontWeight: '600', fontSize: 16 }}>{x.name}</Text>
                      {x.cue ? <Text style={{ color: colors.muted, fontSize: 13 }}>{x.cue}</Text> : null}
                    </Pressable>
                    <Button
                      small
                      kind="ghost"
                      title="Edit"
                      onPress={() => {
                        setCustom({ initial: inputOf(x) });
                        setPicker(null);
                      }}
                    />
                  </Card>
                ))}
              </View>
            ) : null}
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
      {fitOpen ? <FitSheet session={session} target={target.minutes} ctx={fitCtx} onChange={edit} onClose={() => setFitOpen(false)} /> : null}
      {custom ? (
        <CustomExerciseSheet initial={custom.initial} general={general} onClose={() => setCustom(null)} onSave={(ex) => saveCustom(ex, custom.initial ? undefined : custom.replaceIndex)} />
      ) : null}
    </Screen>
  );
}

