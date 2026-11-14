import { useState } from 'react';
import { Pressable } from 'react-native';
import { HOME_EQUIPMENT } from '../lib/generator';
import { showAlert } from '../lib/dialog';
import { useStore } from '../lib/store';
import type { Equipment } from '../lib/types';
import Sheet from './Sheet';
import { Button, colors, Row, Text } from './ui';

/** F20: home equipment, stored on this device only (G-3). Nothing checked = bodyweight versions. */
export default function HomeEquipmentSheet({ onClose }: { onClose: () => void }) {
  const { data, mutate } = useStore();
  const [picked, setPicked] = useState<Equipment[]>(data.homeEquipment ?? []);
  const close = () => {
    mutate((d) => ({ ...d, homeEquipmentAsked: true })); // skipping counts as bodyweight only
    onClose();
  };
  return (
    <Sheet title="What do you have at home?" onClose={close}>
      <Text style={{ fontSize: 13, color: colors.muted }}>This stays on your phone. Your coach doesn&apos;t see it.</Text>
      {HOME_EQUIPMENT.map((e) => {
        const on = picked.includes(e.id);
        return (
          <Pressable
            key={e.id}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: on }}
            onPress={() => setPicked(on ? picked.filter((x) => x !== e.id) : [...picked, e.id])}
            style={{ minHeight: 44, justifyContent: 'center' }}
          >
            <Row style={{ gap: 10 }}>
              <Text style={{ fontSize: 18 }}>{on ? '☑' : '☐'}</Text>
              <Text style={{ fontSize: 16 }}>{e.label}</Text>
            </Row>
          </Pressable>
        );
      })}
      <Text style={{ fontSize: 13, color: colors.muted }}>Nothing checked? You&apos;ll get bodyweight versions.</Text>
      <Button
        title="Save"
        onPress={() => {
          mutate((d) => ({ ...d, homeEquipment: picked, homeEquipmentAsked: true }));
          onClose();
          showAlert('Home workouts updated.');
        }}
      />
    </Sheet>
  );
}
