import { useState } from 'react';
import { View } from 'react-native';
import { Member, Team, TestResult } from '../lib/backend';
import { formatKey } from '../lib/calendar';
import { useTeams } from '../lib/team';
import { JUMP_TESTS, LOAD_NAMES } from '../lib/testing';
import { Button, colors, Field, Row, Text } from './ui';

const nameOf = (r: TestResult) => JUMP_TESTS.find((j) => j.id === r.testId)?.name ?? LOAD_NAMES[r.testId as keyof typeof LOAD_NAMES] ?? r.testId;

/** Coach athlete detail: Tests (dates, jump results, strength checks with estimate), Edit / Void (F11). Coach only. */
export default function TestsSection({ team, member }: { team: Team; member: Member }) {
  const { testResults, updateTestResult } = useTeams();
  const [editing, setEditing] = useState<string | null>(null);
  const [value, setValue] = useState('');
  const [reps, setReps] = useState('');
  const rows = (testResults[team.id] ?? []).filter((r) => r.userId === member.userId).sort((a, b) => b.day.localeCompare(a.day));
  if (!rows.length) return null;
  return (
    <View style={{ gap: 6 }}>
      <Text style={{ fontSize: 12, color: colors.muted }}>Tests</Text>
      {rows.map((r) => (
        <View key={r.id} style={{ gap: 4, opacity: r.voided ? 0.5 : 1 }}>
          <Text style={{ fontSize: 13 }}>
            {`${formatKey(r.day)} · ${nameOf(r)}: ${r.value} ${r.unit}${r.reps ? ` × ${r.reps}` : ''}`}
            {r.e1rm ? ` · estimated strength ~${Math.round(r.e1rm)} lb (estimate)` : ''}
            {r.voided ? ' · voided' : ''}
          </Text>
          {editing === r.id ? (
            <Row style={{ gap: 6 }}>
              <View style={{ flex: 1 }}>
                <Field keyboardType="decimal-pad" value={value} onChangeText={setValue} />
              </View>
              {r.reps != null ? (
                <View style={{ width: 70 }}>
                  <Field keyboardType="number-pad" value={reps} onChangeText={setReps} />
                </View>
              ) : null}
              <Button
                small
                title="Save"
                onPress={() => {
                  const v = Number(value);
                  const n = Number(reps);
                  if (!(v > 0) || (r.reps != null && !(n >= 1 && n <= 12))) return;
                  updateTestResult(team.id, r.id, r.reps != null ? { value: v, reps: n } : { value: v }).catch(() => {});
                  setEditing(null);
                }}
              />
            </Row>
          ) : (
            <Row style={{ gap: 6 }}>
              <Button
                small
                kind="ghost"
                title="Edit"
                onPress={() => {
                  setEditing(r.id);
                  setValue(String(r.value));
                  setReps(r.reps != null ? String(r.reps) : '');
                }}
              />
              <Button small kind="ghost" title={r.voided ? 'Restore' : 'Void'} onPress={() => updateTestResult(team.id, r.id, { voided: !r.voided }).catch(() => {})} />
            </Row>
          )}
        </View>
      ))}
    </View>
  );
}
