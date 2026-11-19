import { useEffect, useState } from 'react';
import { NEXT_BLOCK_LINE } from '../lib/rollover';
import { useStore } from '../lib/store';
import type { Program } from '../lib/types';
import { Card, Text } from './ui';

/**
 * 2.4.1 R-5: "Your next block uses Approach Strength's new programming." shown once per program on this device, when a program
 * this device knew as a 2.3.0 block (no `block`) comes back as a v3 block. Seen state is device-only (AppData.generatorSeen,
 * G-3); no server field. No action needed.
 */
export default function NextBlockNotice({ program }: { program: Program }) {
  const { data, mutate } = useStore();
  const now = program.block ? 'v3' : 'v2';
  const was = data.generatorSeen?.[program.id];
  const [show] = useState(was === 'v2' && now === 'v3');
  useEffect(() => {
    if (was !== now) mutate((d) => ({ ...d, generatorSeen: { ...(d.generatorSeen ?? {}), [program.id]: now } }));
  }, [was, now, program.id, mutate]);
  if (!show) return null;
  return (
    <Card>
      <Text accessibilityRole="text" style={{ fontSize: 15 }}>{NEXT_BLOCK_LINE}</Text>
    </Card>
  );
}
