import { useState } from 'react';
import { View } from 'react-native';
import { CUSTOM_TYPES, CustomInput, CustomType, customProblem, LIMITS, makeCustom, movementsFor } from '../lib/customExercise';
import { EQUIPMENT, equipmentLabel } from '../lib/exercises';
import { GENERAL_EQUIPMENT } from '../lib/generalLibrary';
import { LEVEL_NAME } from '../lib/athlete';
import type { Exercise } from '../lib/types';
import Sheet from './Sheet';
import { Button, Checkbox, Chip, ChipRow, colors, Field, Label, Row, Text, TextInput, Toggle } from './ui';

const BLANK: CustomInput = { name: '', cue: '', type: 'B', pattern: 'squat', level: 1, equipment: [], weighted: true, steps: [] };

/**
 * 2.3.1: create or edit a custom exercise for this program. Type, movement and level are required so the exercise
 * gets the same safety handling as library exercises (rest floors, pairing rules, effort caps, level versions).
 */
export default function CustomExerciseSheet({
  initial,
  general,
  onSave,
  onClose,
}: {
  initial?: CustomInput;
  general: boolean;
  onSave: (ex: Exercise) => void;
  onClose: () => void;
}) {
  const [c, setC] = useState<CustomInput>(initial ?? BLANK);
  const [steps, setSteps] = useState((initial?.steps ?? []).join('\n'));
  const set = (patch: Partial<CustomInput>) => setC((x) => ({ ...x, ...patch }));
  const moves = movementsFor(c.type, general);
  const items = [...EQUIPMENT.map((e) => ({ id: e.id, label: equipmentLabel(e.id, general) })), ...(general ? GENERAL_EQUIPMENT.map((e) => ({ id: e.id, label: e.label })) : [])];
  const full: CustomInput = { ...c, steps: steps.split('\n') };
  const problem = customProblem(full, general);
  const leader = general ? 'trainer' : 'coach';

  return (
    <Sheet title={initial?.id ? 'Edit custom exercise' : 'Create custom exercise'} onClose={onClose}>
      <Field label="Name" placeholder="e.g. Banded Lateral Walk" value={c.name} onChangeText={(name) => set({ name })} maxLength={LIMITS.name} />
      <Field label="One-line cue (optional)" placeholder="What to focus on" value={c.cue} onChangeText={(cue) => set({ cue })} maxLength={LIMITS.cue} />

      <Label>Type</Label>
      <ChipRow>
        {CUSTOM_TYPES.map((t) => (
          <Chip
            key={t.id}
            label={t.label}
            selected={c.type === t.id}
            onPress={() => {
              const next = movementsFor(t.id as CustomType, general);
              set({ type: t.id, pattern: next.some((m) => m.id === c.pattern) ? c.pattern : next[0].id });
            }}
          />
        ))}
      </ChipRow>
      <Text style={{ fontSize: 13, color: colors.muted }}>{CUSTOM_TYPES.find((t) => t.id === c.type)!.line}</Text>

      <Label>Movement</Label>
      <ChipRow>
        {moves.map((m) => (
          <Chip key={m.id} label={m.label} selected={c.pattern === m.id} onPress={() => set({ pattern: m.id })} />
        ))}
      </ChipRow>

      <Label>Level</Label>
      <ChipRow>
        {([1, 2, 3] as const).map((l) => (
          <Chip key={l} label={LEVEL_NAME[l]} selected={c.level === l} onPress={() => set({ level: l })} />
        ))}
      </ChipRow>
      <Text style={{ fontSize: 13, color: colors.muted }}>
        {`Anyone below this level gets the closest library exercise of the same movement instead. Your ${leader === 'coach' ? 'athletes' : 'clients'} never get it above their level.`}
      </Text>

      <Label>Equipment needed</Label>
      {items.map((e) => (
        <Checkbox
          key={e.id}
          checked={c.equipment.includes(e.id)}
          onChange={(v) => set({ equipment: v ? [...c.equipment, e.id] : c.equipment.filter((x) => x !== e.id) })}
          label={e.label}
        >
          <Text style={{ fontSize: 15 }}>{e.label}</Text>
        </Checkbox>
      ))}
      <Text style={{ fontSize: 13, color: colors.muted }}>Tick nothing if it needs no equipment.</Text>

      {c.type === 'D' ? null : (
        <Row style={{ justifyContent: 'space-between', minHeight: 44 }}>
          <Text style={{ fontSize: 15, flex: 1 }}>Log a weight</Text>
          <Toggle accessibilityLabel="Log a weight" value={c.weighted} onValueChange={(weighted) => set({ weighted })} />
        </Row>
      )}

      <Label>How to do it (optional)</Label>
      <TextInput
        multiline
        style={{ minHeight: 96, textAlignVertical: 'top' }}
        placeholder="One step per line"
        placeholderTextColor={colors.faint}
        value={steps}
        onChangeText={setSteps}
        accessibilityLabel="How-to steps, one per line"
      />

      {problem && c.name.trim() ? <Text style={{ fontSize: 13, color: colors.errorText }}>{problem}</Text> : null}
      <View style={{ gap: 8 }}>
        <Button title="Save exercise" disabled={!!problem} onPress={() => onSave(makeCustom(full))} />
        <Button kind="ghost" title="Cancel" onPress={onClose} />
      </View>
    </Sheet>
  );
}
