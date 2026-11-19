import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { backend } from '../lib/backend';
import { ALL_EQUIPMENT, getExercise } from '../lib/exercises';
import { formatRest } from '../lib/generator';
import { resolveExercise } from '../lib/resolve';
import { blockMinutes, positionName, restPerPosition, rotationTimeFor, SPOT_LABEL, startPosition, suggestRotation } from '../lib/rotation';
import type { Program, RotationBlock, RotationPosition, Session } from '../lib/types';
import { Button, Card, colors, Label, Row, Text, TextInput, Toggle } from './ui';

/**
 * F53 rotation cards (program-design §4b). One card per block: numbered positions, a Rack chip, the spotter toggle,
 * rotation time (Auto chip), rounds, build-up round, and live readouts (rest per position, block time, group fit).
 * Never blocks (F45): no rack position, two rack positions, or short rest all save as written. Every change is the
 * coach's edit (§0.1).
 */
export default function RotationEditor({ program, session, onChange }: { program: Program; session: Session; onChange: (s: Session) => void }) {
  const [groupSizes, setGroupSizes] = useState<{ name: string; n: number }[]>([]);
  useEffect(() => {
    let alive = true;
    if (!program.teamId) return;
    backend
      .listRacks(program.teamId)
      .then((r) => alive && setGroupSizes(r.filter((x) => x.userIds.length).map((x) => ({ name: x.name, n: x.userIds.length }))))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [program.teamId]);
  const blocks = session.rotation ?? [];
  const equipment = program.equipment?.length ? program.equipment : ALL_EQUIPMENT;
  const setBlock = (k: number, next: RotationBlock) => onChange({ ...session, rotation: blocks.map((b, i) => (i === k ? next : b)) });
  const rackReps = (b: RotationBlock) => b.positions.find((p) => p.usesRack && p.kind === 'exercise')?.reps;

  return (
    <View style={{ gap: 10 }}>
      {blocks.map((b, k) => {
        const rows = session.exercises.filter((pe) => pe.group === b.group);
        const auto = rotationTimeFor(b.positions);
        const rest = restPerPosition(b);
        const rackPos = b.positions.find((p) => p.usesRack && p.kind === 'exercise');
        const hasSpot = b.positions.some((p) => p.kind === 'spot');
        const suggested = JSON.stringify(suggestRotation(b.group, rows, { equipment })) === JSON.stringify(b);
        const movePos = (i: number, dir: -1 | 1) => {
          const j = i + dir;
          if (j < 0 || j >= b.positions.length) return;
          const list = [...b.positions];
          [list[i], list[j]] = [list[j], list[i]];
          setBlock(k, { ...b, positions: list });
        };
        const setPos = (i: number, patch: Partial<RotationPosition>) => setBlock(k, { ...b, positions: b.positions.map((p, x) => (x === i ? { ...p, ...patch } : p)) });
        const unused = rows.filter((r) => !b.positions.some((p) => p.exerciseId === r.exerciseId));
        return (
          <Card key={b.group} style={{ gap: 8 }}>
            <Row style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 }}>
              <Text style={{ fontSize: 16, fontWeight: '700' }}>{`${b.group} · Rack rotation`}</Text>
              {suggested ? <Text style={{ fontSize: 12, color: colors.muted, borderWidth: 1, borderColor: colors.line, borderRadius: 999, paddingHorizontal: 8 }}>Suggested</Text> : null}
            </Row>
            <Text style={{ fontSize: 13, color: colors.muted }}>
              {`${b.positions.length} positions · ${formatRest(b.rotationSec)} rotation · ${b.rounds} rounds · about ${Math.round(blockMinutes(b))} min`}
            </Text>
            {!b.positions.length ? <Text style={{ fontSize: 13, color: colors.muted }}>Add a position. Position 1 is usually the lift that needs the rack.</Text> : null}
            {b.positions.map((p, i) => {
              const ex = p.exerciseId ? getExercise(p.exerciseId) : null;
              const beginner = ex && program.levelAdjust !== false ? resolveExercise(ex, 1, equipment) : null;
              return (
                <View key={`${b.group}-${i}`} style={{ gap: 4, borderTopWidth: i ? 1 : 0, borderTopColor: colors.line, paddingTop: i ? 8 : 0 }}>
                  <Row style={{ gap: 6, alignItems: 'center' }}>
                    <Text style={{ fontSize: 15, fontWeight: '700', minWidth: 20 }}>{i + 1}</Text>
                    <Text style={{ fontSize: 15, flex: 1 }}>{positionName(p)}</Text>
                    {p.kind === 'exercise' ? (
                      <Pressable
                        accessibilityRole="switch"
                        accessibilityState={{ checked: p.usesRack }}
                        accessibilityLabel={`Rack position: ${positionName(p)}`}
                        onPress={() => setPos(i, { usesRack: !p.usesRack })}
                        style={{ minHeight: 44, minWidth: 44, justifyContent: 'center' }}
                      >
                        <Text style={{ fontSize: 12, fontWeight: '700', borderWidth: 1, borderColor: p.usesRack ? colors.ink : colors.line, borderRadius: 999, paddingHorizontal: 8, color: p.usesRack ? colors.ink : colors.muted }}>
                          {p.usesRack ? '▣ Rack' : 'Rack?'}
                        </Text>
                      </Pressable>
                    ) : null}
                    <Button small kind="ghost" title="↑" accessibilityLabel={`Move position ${i + 1} up`} disabled={i === 0} onPress={() => movePos(i, -1)} />
                    <Button small kind="ghost" title="↓" accessibilityLabel={`Move position ${i + 1} down`} disabled={i === b.positions.length - 1} onPress={() => movePos(i, 1)} />
                    <Button small kind="ghost" title="×" accessibilityLabel={`Remove position ${i + 1}`} onPress={() => setBlock(k, { ...b, positions: b.positions.filter((_, x) => x !== i) })} />
                  </Row>
                  {p.kind === 'exercise' ? (
                    <TextInput accessibilityLabel={`Prescription for position ${i + 1}`} value={p.reps} onChangeText={(t) => setPos(i, { reps: t })} />
                  ) : null}
                  {beginner && ex && beginner.id !== ex.id ? <Text style={{ fontSize: 12, color: colors.muted }}>{`Beginners: ${beginner.name}`}</Text> : null}
                </View>
              );
            })}
            {unused.length ? (
              <Row style={{ gap: 6, flexWrap: 'wrap' }}>
                {unused.map((r) => (
                  <Button
                    key={r.exerciseId}
                    small
                    kind="secondary"
                    title={`+ Add ${getExercise(r.exerciseId).name}`}
                    onPress={() => setBlock(k, { ...b, positions: [...b.positions, { kind: 'exercise', exerciseId: r.exerciseId, reps: r.reps, usesRack: false }] })}
                  />
                ))}
              </Row>
            ) : null}
            <Row style={{ justifyContent: 'space-between', minHeight: 44 }}>
              <Text style={{ fontSize: 14, flex: 1 }}>Add a spotter after the rack lift</Text>
              <Toggle
                accessibilityLabel="Add a spotter after the rack lift"
                value={hasSpot}
                onValueChange={(v) => {
                  const list = b.positions.filter((p) => p.kind !== 'spot');
                  if (v) {
                    const at = Math.max(0, list.findIndex((p) => p.usesRack)) + 1;
                    list.splice(at, 0, { kind: 'spot', reps: '', usesRack: false });
                  }
                  setBlock(k, { ...b, positions: list });
                }}
              />
            </Row>
            <Row style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 }}>
              <Label>Rotation time</Label>
              <Row style={{ gap: 6, alignItems: 'center' }}>
                <Button small kind="ghost" title="−15s" accessibilityLabel="Rotation time minus 15 seconds" disabled={b.rotationSec <= 15} onPress={() => setBlock(k, { ...b, rotationSec: Math.max(15, b.rotationSec - 15) })} />
                <Text style={{ minWidth: 48, textAlign: 'center', fontWeight: '600' }}>{formatRest(b.rotationSec)}</Text>
                <Button small kind="ghost" title="+15s" accessibilityLabel="Rotation time plus 15 seconds" disabled={b.rotationSec >= 300} onPress={() => setBlock(k, { ...b, rotationSec: Math.min(300, b.rotationSec + 15) })} />
                {auto !== b.rotationSec ? (
                  <Pressable accessibilityRole="button" accessibilityLabel={`Use auto rotation time ${formatRest(auto)}`} onPress={() => setBlock(k, { ...b, rotationSec: auto })} style={{ minHeight: 44, justifyContent: 'center' }}>
                    <Text style={{ fontSize: 12, borderWidth: 1, borderColor: colors.line, borderRadius: 999, paddingHorizontal: 8 }}>{`Auto ${formatRest(auto)}`}</Text>
                  </Pressable>
                ) : null}
              </Row>
            </Row>
            <Text style={{ fontSize: 12, color: colors.muted }}>Longest position plus about 20 s to move.</Text>
            <Row style={{ justifyContent: 'space-between' }}>
              <Label>Rounds</Label>
              <Row style={{ gap: 6, alignItems: 'center' }}>
                <Button small kind="ghost" title="−" accessibilityLabel="Fewer rounds" disabled={b.rounds <= 1} onPress={() => setBlock(k, { ...b, rounds: Math.max(1, b.rounds - 1) })} />
                <Text style={{ minWidth: 32, textAlign: 'center', fontWeight: '600' }}>{b.rounds}</Text>
                <Button small kind="ghost" title="+" accessibilityLabel="More rounds" disabled={b.rounds >= 10} onPress={() => setBlock(k, { ...b, rounds: Math.min(10, b.rounds + 1) })} />
              </Row>
            </Row>
            <Row style={{ justifyContent: 'space-between', minHeight: 44 }}>
              <Text style={{ fontSize: 14, flex: 1 }}>Round 1 is a build-up round</Text>
              <Toggle accessibilityLabel="Round 1 is a build-up round" value={b.buildUpRound} onValueChange={(v) => setBlock(k, { ...b, buildUpRound: v })} />
            </Row>
            {b.buildUpRound ? <Text style={{ fontSize: 12, color: colors.muted }}>Work sets start in round 2. Round 1 is ramp-up weight on the rack lift.</Text> : null}
            {/* Readouts: text only, no warning colors (F53). */}
            <Text style={{ fontSize: 13 }}>{`Rest between turns at each position: ${formatRest(rest)} (rotation × ${Math.max(0, b.positions.length - 1)} other positions).`}</Text>
            {rackPos ? <Text style={{ fontSize: 13 }}>{`${positionName(rackPos)} rest: ${formatRest(rest)}.`}</Text> : null}
            <Text style={{ fontSize: 13 }}>{`Block time: about ${Math.round(blockMinutes(b))} min (${formatRest(b.rotationSec)} × ${b.positions.length} positions × ${b.rounds} rounds).`}</Text>
            {groupSizes.map((g) => {
              const n = b.positions.length;
              if (g.n === n) return null;
              if (g.n < n) return <Text key={g.name} style={{ fontSize: 13, color: colors.muted }}>{`${g.name} has ${g.n} athlete${g.n === 1 ? '' : 's'}: ${n - g.n === 1 ? 'one position is' : `${n - g.n} positions are`} open each turn.`}</Text>;
              const shared = startPosition(n, b);
              return <Text key={g.name} style={{ fontSize: 13, color: colors.muted }}>{`${g.name} has ${g.n} athletes: Position ${shared + 1} (${positionName(b.positions[shared])}) takes ${g.n - n + 1} at once.`}</Text>;
            })}
            <Button small kind="ghost" title="Suggest positions" onPress={() => setBlock(k, suggestRotation(b.group, rows, { equipment }))} />
            {rackReps(b) == null && b.positions.length ? <Text style={{ fontSize: 12, color: colors.muted }}>No position uses the rack.</Text> : null}
          </Card>
        );
      })}
      <Text style={{ fontSize: 12, color: colors.muted }}>{`${SPOT_LABEL}: the athlete who just lifted spots the next lifter. Nothing to log.`}</Text>
    </View>
  );
}
