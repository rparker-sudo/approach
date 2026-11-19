import { View } from 'react-native';
import type { Rack } from '../lib/backend';
import { positionAt, positionName } from '../lib/rotation';
import type { RotationBlock } from '../lib/types';
import { Text } from './ui';

const P = { tile: '#1C1D20', line: '#3A3D42', ink: '#FFFFFF', muted: '#C9CDD2' };

/**
 * F55b ring view for one rack: N nodes clockwise from the top. Each node: "1 · Back Squat", the board name(s) of whoever
 * is there, RACK on the rack position, "Spot" on the spot node, "Open" when empty. Board-safe only (G-4): position,
 * exercise name, board name, round. Hidden athletes and those without board consent show as "Open".
 * Order in the rack = by user id (the same order as the athlete's my_index).
 */
export default function RotationRing({
  rack,
  block,
  tick,
  names,
  lifting,
  accent,
  size,
  round,
  rounds,
  big,
}: {
  rack: Rack;
  block: RotationBlock;
  tick: number;
  names: Map<string, string>;
  lifting: Set<string>;
  accent: string;
  size: number;
  round: number;
  rounds: number;
  big: (n: number) => number;
}) {
  const n = Math.max(1, block.positions.length);
  const order = [...rack.userIds].sort();
  const at: string[][] = block.positions.map(() => []);
  order.forEach((u, k) => {
    const name = names.get(u);
    if (name) at[positionAt(k, tick, block)].push(u);
  });
  const node = { w: Math.max(120, Math.round(size * 0.36)), h: Math.max(64, Math.round(size * 0.2)) };
  const r = size / 2 - Math.max(node.w, node.h) / 2;
  const list = block.positions.map((p, i) => `${at[i].map((u) => names.get(u)).join(' + ') || 'Open'} → ${positionName(p)}`).join(' · ');
  return (
    <View style={{ gap: 8, padding: 12, borderRadius: 16, borderWidth: 1, borderColor: P.line }}>
      <Text style={{ color: P.ink, fontSize: big(32), fontWeight: '700' }}>{`${rack.name} · ${rack.userIds.length} athletes`}</Text>
      <View style={{ width: size, height: size, position: 'relative' }} accessibilityLabel={`${rack.name} rotation: ${list}`}>
        <View style={{ position: 'absolute', left: size / 2 - r, top: size / 2 - r, width: r * 2, height: r * 2, borderRadius: r, borderWidth: 1, borderColor: P.line }} />
        <View style={{ position: 'absolute', left: 0, right: 0, top: size / 2 - 14, alignItems: 'center' }}>
          <Text style={{ color: P.muted, fontSize: big(20) }}>{`Round ${round + 1} of ${rounds}`}</Text>
        </View>
        {block.positions.map((p, i) => {
          const a = -Math.PI / 2 + (2 * Math.PI * i) / n;
          const x = size / 2 + r * Math.cos(a) - node.w / 2;
          const y = size / 2 + r * Math.sin(a) - node.h / 2;
          const who = at[i];
          const busy = who.some((u) => lifting.has(u)) && p.kind === 'exercise';
          return (
            <View
              key={i}
              style={{ position: 'absolute', left: x, top: y, width: node.w, minHeight: node.h, backgroundColor: P.tile, borderRadius: 12, borderWidth: busy ? 3 : 1, borderColor: busy ? accent : P.line, padding: 6, gap: 2 }}
            >
              <Text numberOfLines={1} style={{ color: P.muted, fontSize: big(20) }}>{`${i + 1} · ${positionName(p)}`}</Text>
              <Text numberOfLines={2} style={{ color: P.ink, fontSize: big(24), fontWeight: '700' }}>{who.length ? who.map((u) => names.get(u)).join(', ') : 'Open'}</Text>
              {p.usesRack ? <Text style={{ color: P.muted, fontSize: big(14), fontWeight: '700', letterSpacing: 1 }}>RACK</Text> : null}
              {busy ? <Text style={{ color: P.ink, fontSize: big(14) }}>Lifting</Text> : null}
            </View>
          );
        })}
      </View>
      <Text style={{ color: P.muted, fontSize: big(20) }}>{list}</Text>
    </View>
  );
}
