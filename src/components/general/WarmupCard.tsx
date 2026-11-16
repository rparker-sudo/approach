import { WARMUP_CUE, WARMUPS } from '../../lib/generalLibrary';
import { Card, colors, display, H2, Text } from '../ui';

/** F39c / general-library.md §6: the general warm-up shown before the session (static content). */
export default function WarmupCard({ id }: { id: 'W1' | 'W2' | 'W3' }) {
  const w = WARMUPS.find((x) => x.id === id)!;
  return (
    <Card style={{ gap: 4 }}>
      <Text style={[display(12), { color: colors.muted }]}>Warm-up</Text>
      <H2>{w.name}</H2>
      {w.blocks.map((b, i) => (
        <Text key={i} style={{ fontSize: 14 }}>{`${b.label}${b.amount ? ` · ${b.amount}` : ''}`}</Text>
      ))}
      <Text style={{ fontSize: 13, color: colors.muted }}>{WARMUP_CUE}</Text>
    </Card>
  );
}
