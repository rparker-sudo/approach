import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { backend } from '../lib/backend';
import { ALL_EQUIPMENT, getExercise } from '../lib/exercises';
import { blocksOf, labelOf } from '../lib/groups';
import {
  defaultStations,
  NAME_HELPER,
  NOT_HERE,
  STATION_TRANSITION_SEC,
  stationChecks,
  stationMinutes,
  stationsAllowed,
  stationsEstimate,
  suggestOrder,
  withBlockLetters,
} from '../lib/stations';
import { stationMinutesFrom, targetFor } from '../lib/fit';
import { warmupCtxFor } from '../lib/resolve';
import { warmupFor, warmupMinutes } from '../lib/warmup';
import type { Program, Session, Station } from '../lib/types';
import { FLAGS } from '../lib/flags';
import { NOT_FOR_SESSION, rotationAllowed, suggestSessionRotation } from '../lib/rotation';
import { showAlert } from '../lib/dialog';
import RotationEditor from './RotationEditor';
import { uid } from '../lib/util';
import { Button, Card, Chip, ChipRow, colors, Field, H2, Label, Row, Stepper, Text } from './ui';

/**
 * F28: Format Standard · Stations for a school session on a team with rack groups. Part 1 (together): warm-up, tier P
 * and the main tier A lift. Part 2: one block per station (straight sets, superset or circuit). Station names are
 * neutral (equipment names, never athletes, levels or positions; Legal §5).
 */
export default function StationsEditor({ program, session, onChange }: { program: Program; session: Session; onChange: (s: Session) => void }) {
  const [racks, setRacks] = useState<number | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    if (!program.teamId) return;
    backend
      .listRacks(program.teamId)
      .then((r) => alive && setRacks(r.filter((x) => x.userIds.length).length || r.length))
      .catch(() => alive && setRacks(0));
    return () => {
      alive = false;
    };
  }, [program.teamId]);

  const allowed = stationsAllowed(session);
  const on = session.format === 'stations';
  const ctx = { phase: program.phase, equipment: program.equipment };

  function setFormat(stations: boolean) {
    setMsg(null);
    if (!stations) {
      if (session.format === 'rack_rotation') {
        showAlert('Switch to Standard?', 'Positions become a normal exercise list.', [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Switch', onPress: () => onChange({ ...session, format: 'standard', rotation: undefined }) },
        ]);
        return;
      }
      onChange({ ...session, format: 'standard' });
      return;
    }
    if (!racks) {
      setMsg('Stations need rack groups.');
      return;
    }
    const d = defaultStations(session, racks, program.equipment);
    onChange({ ...session, format: 'stations', exercises: d.exercises, stations: d.stations, stationTransitionSec: STATION_TRANSITION_SEC });
  }

  // 2.4.0 F52: Rack rotation (flag rackRotation). Each block becomes a rotation card filled with suggested positions.
  const rotating = session.format === 'rack_rotation';
  function setRotation() {
    setMsg(null);
    if (!rotationAllowed(session)) {
      setMsg(NOT_FOR_SESSION);
      return;
    }
    if (!racks) {
      setMsg('Rack rotation uses your rack groups.');
      return;
    }
    const s2 = suggestSessionRotation(session, { equipment: program.equipment });
    onChange({ ...session, format: 'rack_rotation', exercises: s2.exercises, rotation: s2.rotation, stations: undefined });
  }
  const header = (
    <Card>
      <Label>Format</Label>
      <ChipRow>
        <Chip label="Standard" selected={!on && !rotating} onPress={() => setFormat(false)} />
        <Chip label="Stations" selected={on} onPress={() => (allowed ? setFormat(true) : setMsg(NOT_HERE))} />
        {FLAGS.rackRotation ? <Chip label="Rack rotation" selected={rotating} onPress={setRotation} /> : null}
      </ChipRow>
      {FLAGS.rackRotation && !rotationAllowed(session) ? <Text style={{ fontSize: 13, color: colors.muted }}>{NOT_FOR_SESSION}</Text> : null}
      {!allowed ? <Text style={{ fontSize: 13, color: colors.muted }}>{NOT_HERE}</Text> : null}
      {msg ? (
        <>
          <Text style={{ fontSize: 13, color: colors.warningText }}>{msg}</Text>
          {msg === 'Stations need rack groups.' || msg === 'Rack rotation uses your rack groups.' ? (
            <Button small kind="secondary" title="Set up racks" onPress={() => router.push({ pathname: '/racks', params: { teamId: program.teamId! } })} />
          ) : null}
        </>
      ) : null}
    </Card>
  );
  if (rotating && FLAGS.rackRotation) {
    return (
      <View style={{ gap: 10 }}>
        {header}
        <RotationEditor program={program} session={session} onChange={onChange} />
      </View>
    );
  }
  if (!on) return header;

  const list = withBlockLetters(session.exercises);
  const stations = session.stations ?? [];
  const inStation = new Set(stations.flatMap((s) => s.groups));
  const blocks = [...blocksOf(list).entries()];
  const blockName = (g: string) =>
    (blocksOf(list).get(g) ?? []).map((i) => `${labelOf(list, i) ?? ''} ${getExercise(list[i].exerciseId).name}`.trim()).join(' + ');
  const save = (next: Station[]) => onChange({ ...session, exercises: list, stations: next });
  const setStation = (k: number, patch: Partial<Station>) => save(stations.map((s, i) => (i === k ? { ...s, ...patch } : s)));
  const checks = stationChecks(list, stations, racks ?? 0, ctx);
  // §1.4: station time = (session length − warm-up − Part 1 − finish) ÷ stations − 1 min transition.
  const target = targetFor(program, session);
  const warmMin = warmupMinutes(warmupFor(session, warmupCtxFor(program, session, program.equipment?.length ? program.equipment : ALL_EQUIPMENT)), { phase: program.phase });
  const part1Only = stationsEstimate(list, stations, ctx).part1 - 8;
  const fromLength = stations.length ? stationMinutesFrom(target.minutes, warmMin, Math.max(0, part1Only), 0, stations.length) : null;
  const est = stationsEstimate(list, stations, ctx, fromLength);
  const anyCoachTime = stations.some((st) => st.autoMinutes === false);

  function putBlock(k: number, g: string) {
    // 2.4.0 (F45a): any exercise in any station, no message.
    setMsg(null);
    // Each card holds exactly one block.
    save(stations.map((s, i) => (i === k ? { ...s, groups: [g] } : { ...s, groups: s.groups.filter((x) => x !== g) })));
  }

  return (
    <View style={{ gap: 10 }}>
      {header}
      <Card>
        <H2>Part 1 · Together</H2>
        <Text style={{ fontSize: 13, color: colors.muted }}>Everyone does this first, fresh, at their own rack.</Text>
        {list
          .filter((pe) => !pe.group || !inStation.has(pe.group))
          .map((pe, i) => (
            <Text key={i} style={{ fontSize: 14 }}>{`${getExercise(pe.exerciseId).name} · ${pe.sets} × ${pe.reps}`}</Text>
          ))}
      </Card>
      <Label>Part 2 · Stations</Label>
      {stations.map((st, k) => {
        const need = fromLength ?? stationMinutes(list, st, ctx);
        return (
          <Card key={st.id}>
            <Row style={{ justifyContent: 'space-between' }}>
              <H2>{`Station ${k + 1}`}</H2>
              <Row style={{ gap: 4 }}>
                <Button small kind="ghost" title="↑" disabled={k === 0} onPress={() => save(stations.map((s, i) => (i === k - 1 ? stations[k] : i === k ? stations[k - 1] : s)))} />
                <Button small kind="ghost" title="↓" disabled={k === stations.length - 1} onPress={() => save(stations.map((s, i) => (i === k + 1 ? stations[k] : i === k ? stations[k + 1] : s)))} />
              </Row>
            </Row>
            <Field label="Name" placeholder="DB bench" maxLength={20} value={st.name} onChangeText={(v) => setStation(k, { name: v.slice(0, 20) })} />
            <Text style={{ fontSize: 12, color: colors.muted }}>{NAME_HELPER}</Text>
            <Text style={{ fontSize: 13, fontWeight: '600' }}>{st.groups.length ? blockName(st.groups[0]) : 'Pick a block for this station:'}</Text>
            <ChipRow>
              {blocks
                .filter(([g]) => !st.groups.includes(g))
                .map(([g]) => (
                  <Chip key={g} label={blockName(g)} selected={false} onPress={() => putBlock(k, g)} />
                ))}
            </ChipRow>
            <Row style={{ justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 13 }}>{st.autoMinutes === false ? `${st.minutes} min (set by you)` : `Auto · ${need} min`}</Text>
              <Stepper value={st.autoMinutes === false ? st.minutes : need} min={1} max={30} onChange={(v) => setStation(k, { minutes: v, autoMinutes: false })} />
            </Row>
            {st.autoMinutes === false ? <Text accessibilityRole="button" onPress={() => setStation(k, { autoMinutes: true })} style={{ fontSize: 13, textDecorationLine: 'underline' }}>Reset to auto</Text> : null}
            <Button small kind="danger" title="Remove station" onPress={() => save(stations.filter((_, i) => i !== k))} />
          </Card>
        );
      })}
      <Row style={{ gap: 8 }}>
        <View style={{ flex: 1 }}>
          <Button small kind="secondary" title="Add station" disabled={stations.length >= 6} onPress={() => save([...stations, { id: uid(), name: '', groups: [], minutes: 0, autoMinutes: true }])} />
        </View>
        <View style={{ flex: 1 }}>
          <Button small kind="ghost" title="Suggest order" onPress={() => save(suggestOrder(list, stations, program.equipment))} />
        </View>
      </Row>
      {checks.map((c, i) => (
        <Text key={i} style={{ fontSize: 13, color: colors.ink }}>{c.text}</Text>
      ))}
      <Text style={{ fontSize: 13, color: colors.muted }}>
        {anyCoachTime ? 'Station time set by you.' : fromLength ? `${fromLength} min each, from your ${target.minutes}-min session.` : ''}
      </Text>
      <Text style={{ fontSize: 14, fontWeight: '600', color: colors.ink }}>
        {`Part 1 · ${est.part1} min + ${stations.length} stations × (${est.per} + 1) min = about ${Math.round(est.total)} min · target ${target.minutes}`}
      </Text>
    </View>
  );
}
