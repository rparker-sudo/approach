import { useState } from 'react';
import { showAlert } from '../lib/dialog';
import { Pressable, View } from 'react-native';
import { useStore } from '../lib/store';
import { BRAND } from '../lib/theme';
import { formatDate, parseNum } from '../lib/util';
import { Button, Card, Chip, ChipRow, colors, display, Label, NetTape, Row, Text, TextInput } from './ui';

const M_TO_IN = 39.3701;
export const NET_PRESETS = [
  { id: 'women', label: 'Women 2.24 m', inches: Math.round(BRAND.netHeightsM.women * M_TO_IN * 10) / 10 },
  { id: 'men', label: 'Men 2.43 m', inches: Math.round(BRAND.netHeightsM.men * M_TO_IN * 10) / 10 },
];

/** 124 → 10′ 4″ */
export function feetInches(inches: number): string {
  const whole = Math.round(inches);
  return `${Math.floor(whole / 12)}′ ${whole % 12}″`;
}

function signedInches(n: number): string {
  const r = Math.round(n);
  return `${r >= 0 ? '+' : '−'}${Math.abs(r)}″`;
}

/**
 * Signature stat: approach touch height and how far it reaches above the net
 * (touch height − net height). Uses only measurements the athlete enters.
 */
export default function AboveTheNet() {
  const { data, addTouchLog, deleteTouchLog, setNetHeight } = useStore();
  const logs = data.touchLogs ?? [];
  const net = data.netHeightIn ?? NET_PRESETS[0].inches;
  const preset = NET_PRESETS.find((p) => Math.abs(p.inches - net) < 0.05)?.id ?? 'custom';

  const [ft, setFt] = useState('');
  const [inch, setInch] = useState('');
  const [customNet, setCustomNet] = useState(preset === 'custom' ? String(net) : '');
  const [message, setMessage] = useState<string | null>(null);

  const latest = logs[logs.length - 1];
  const best = logs.reduce((m, l) => Math.max(m, l.inches), 0);

  function save() {
    const total = parseNum(ft) * 12 + parseNum(inch);
    if (total < 60 || total > 160) {
      showAlert('Check that height', 'Enter your standing-reach-plus-jump touch in feet and inches, like 9 ft 8 in.');
      return;
    }
    const prevBest = best;
    addTouchLog({ date: new Date().toISOString(), inches: total });
    setFt('');
    setInch('');
    if (prevBest > 0 && total > prevBest) {
      const gain = Math.round(total - prevBest);
      setMessage(`New touch PR: ${gain} ${gain === 1 ? 'inch' : 'inches'} higher above the net.`);
    } else {
      setMessage(null);
    }
  }

  return (
    <Card>
      <NetTape />
      {latest ? (
        <Row style={{ alignItems: 'flex-start' }}>
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={[display(12), { color: colors.muted }]}>Approach touch</Text>
            <Text style={{ fontSize: 32, fontWeight: '600' }}>{feetInches(latest.inches)}</Text>
          </View>
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={[display(12), { color: colors.muted }]}>Above the net</Text>
            <Text style={{ fontSize: 32, fontWeight: '600', color: latest.inches - net > 0 ? colors.achievement : colors.ink }}>
              {signedInches(latest.inches - net)}
            </Text>
          </View>
        </Row>
      ) : (
        <View style={{ gap: 4 }}>
          <Text style={[display(12), { color: colors.muted }]}>Above the net</Text>
          <Text style={{ fontSize: 16, color: colors.muted }}>
            Log your approach touch to see how far you reach above the net.
          </Text>
        </View>
      )}

      {message ? (
        <View style={{ backgroundColor: colors.achievement, borderRadius: 8, padding: 10 }}>
          <Text style={{ color: colors.bg, fontWeight: '600' }}>{message}</Text>
        </View>
      ) : null}

      {logs.length > 1 ? <TouchBars logs={logs.slice(-10).map((l) => l.inches)} net={net} /> : null}

      <Label>Log a touch</Label>
      <Row style={{ gap: 8 }}>
        <TextInput style={{ flex: 1, minWidth: 0 }} placeholder="ft" keyboardType="number-pad" value={ft} onChangeText={setFt} />
        <TextInput style={{ flex: 1, minWidth: 0 }} placeholder="in" keyboardType="decimal-pad" value={inch} onChangeText={setInch} />
        <Button small title="Save" disabled={!ft} onPress={save} />
      </Row>

      <Label>Net height</Label>
      <ChipRow>
        {NET_PRESETS.map((p) => (
          <Chip key={p.id} label={p.label} selected={preset === p.id} onPress={() => setNetHeight(p.inches)} />
        ))}
        <Chip
          label="Custom (youth)"
          selected={preset === 'custom'}
          onPress={() => setCustomNet(customNet || String(Math.round(net)))}
        />
      </ChipRow>
      {preset === 'custom' || customNet ? (
        <Row style={{ gap: 8 }}>
          <TextInput
            style={{ flex: 1, minWidth: 0 }}
            placeholder="Net height in inches, e.g. 84"
            keyboardType="decimal-pad"
            value={customNet}
            onChangeText={setCustomNet}
          />
          <Button
            small
            kind="ghost"
            title="Use"
            disabled={!(parseNum(customNet) > 48)}
            onPress={() => {
              setNetHeight(parseNum(customNet));
              setCustomNet('');
            }}
          />
        </Row>
      ) : null}
      <Text style={{ fontSize: 12, color: colors.muted }}>Net: {feetInches(net)}. Measure touch with a vertec or tape on a wall.</Text>

      {logs.length > 0 ? (
        <View style={{ gap: 6 }}>
          {[...logs].reverse().slice(0, 5).map((l) => (
            <Pressable
              key={l.date}
              onLongPress={() =>
                showAlert('Delete this touch?', undefined, [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Delete', style: 'destructive', onPress: () => deleteTouchLog(l.date) },
                ])
              }
            >
              <Row style={{ justifyContent: 'space-between' }}>
                <Text style={{ fontSize: 13, color: colors.muted }}>{formatDate(l.date)}</Text>
                <Text style={{ fontSize: 13 }}>
                  {feetInches(l.inches)} · {signedInches(l.inches - net)}
                  {l.inches === best ? '  PR' : ''}
                </Text>
              </Row>
            </Pressable>
          ))}
        </View>
      ) : null}
    </Card>
  );
}

/** Touch history with the net as a gridline. */
function TouchBars({ logs, net }: { logs: number[]; net: number }) {
  const min = Math.min(net, ...logs) - 2;
  const max = Math.max(net, ...logs) + 2;
  const h = 64;
  const y = (v: number) => ((v - min) / (max - min)) * h;
  return (
    <View style={{ gap: 4 }}>
      <View style={{ height: h, flexDirection: 'row', alignItems: 'flex-end', gap: 6 }}>
        <View style={{ position: 'absolute', left: 0, right: 0, bottom: y(net), height: 1, backgroundColor: colors.chartGrid }} />
        {logs.map((v, i) => (
          <View key={i} style={{ flex: 1, alignItems: 'center' }}>
            <View style={{ width: 6, height: Math.max(4, y(v)), backgroundColor: colors.chartLine, borderRadius: 3 }} />
          </View>
        ))}
      </View>
      <Text style={{ fontSize: 12, color: colors.faint }}>Line = net height</Text>
    </View>
  );
}
