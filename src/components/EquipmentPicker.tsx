import { View } from 'react-native';
import { EQUIPMENT, EQUIPMENT_PRESETS } from '../lib/exercises';
import type { Equipment } from '../lib/types';
import { Chip, ChipRow, colors, Label, Text } from './ui';

/** "What's in your gym?" Presets plus individual items. Bodyweight is always available. */
export default function EquipmentPicker({ value, onChange }: { value: Equipment[]; onChange: (v: Equipment[]) => void }) {
  const same = (a: Equipment[], b: Equipment[]) => a.length === b.length && a.every((x) => b.includes(x));
  return (
    <View style={{ gap: 10 }}>
      <Label>Quick pick</Label>
      <ChipRow>
        {EQUIPMENT_PRESETS.map((p) => (
          <Chip key={p.id} label={p.label} selected={same(value, p.equipment)} onPress={() => onChange([...p.equipment])} />
        ))}
      </ChipRow>
      <Label>Or choose what you have</Label>
      <ChipRow>
        {EQUIPMENT.map((e) => (
          <Chip
            key={e.id}
            label={e.label}
            selected={value.includes(e.id)}
            onPress={() => onChange(value.includes(e.id) ? value.filter((x) => x !== e.id) : [...value, e.id])}
          />
        ))}
      </ChipRow>
      <Text style={{ fontSize: 13, color: colors.muted }}>
        Bodyweight exercises are always included. The program only uses what you pick.
      </Text>
    </View>
  );
}
