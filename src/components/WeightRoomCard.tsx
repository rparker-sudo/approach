import { useState } from 'react';
import { Pressable, useWindowDimensions, View } from 'react-native';
import EquipmentPicker from './EquipmentPicker';
import { SetupTitle } from './PlannerCards';
import { Button, Card, colors, Row, Stepper, Text } from './ui';
import { EQUIPMENT } from '../lib/exercises';
import { STYLE_TEXT, STYLES, styleInfo, suggestStyle } from '../lib/room';
import type { Equipment, GeneratedFormat } from '../lib/types';

/**
 * 2.4.2 Part B · F60 "Your weight room" card (planner §2a; spec B1–B3). Approach Strength suggests a style from the room and
 * says why; the coach can pick any style (D-045, F45). Athletes per session is never saved (spec B2).
 */
export default function WeightRoomCard(p: {
  racks: number;
  onRacks: (n: number) => void;
  /** The team's existing rack groups (null = still loading, -1 = couldn't load). */
  groups: number | null;
  equipment: Equipment[];
  onEquipment: (e: Equipment[]) => void;
  athletes: number;
  onAthletes: (n: number) => void;
  minutes: number;
  onMinutes: (m: number | null) => void;
  phaseDefault: number;
  /** The coach's pick (null = take the suggestion). */
  style: GeneratedFormat | null;
  onStyle: (s: GeneratedFormat) => void;
  tag?: string | null;
  onEditRacks?: () => void;
}) {
  const { width } = useWindowDimensions();
  const wide = width >= 900;
  const [editEq, setEditEq] = useState(false);
  const [editLen, setEditLen] = useState(false);
  const loading = p.groups === null;
  const sug = suggestStyle(p.racks, p.athletes, p.minutes);
  const chosen = p.style ?? sug.style;
  const info = styleInfo(chosen, p.racks, Math.max(0, p.groups ?? 0), sug.perRack);
  const eqText = p.equipment.length ? p.equipment.map((e) => EQUIPMENT.find((x) => x.id === e)?.label ?? e).join(', ') : 'Nothing selected: bodyweight and bands only';
  const line = (label: string, control: React.ReactNode, note?: React.ReactNode) => (
    <View style={{ flexDirection: wide ? 'row' : 'column', gap: wide ? 12 : 4, alignItems: wide ? 'center' : 'stretch' }}>
      <Text style={{ width: wide ? 200 : undefined, fontSize: 15, fontWeight: '600' }}>{label}</Text>
      {control}
      {note ? <View style={{ flex: 1 }}>{note}</View> : null}
    </View>
  );
  return (
    <Card style={{ gap: 12 }}>
      <SetupTitle n={3} title="Your weight room" tag={p.tag} />
      {line(
        'Racks or platforms',
        loading ? <Text style={{ color: colors.muted }}>…</Text> : <View accessibilityLabel={`Racks or platforms, ${p.racks}`}><Stepper value={p.racks} min={0} max={12} onChange={p.onRacks} /></View>,
        p.groups === -1 ? (
          <Text style={{ fontSize: 13, color: colors.muted }}>Couldn&apos;t load your racks. Set the number here.</Text>
        ) : p.groups != null && p.groups > 0 && p.groups !== p.racks ? (
          <Row style={{ flexWrap: 'wrap', gap: 4 }}>
            <Text style={{ fontSize: 13, color: colors.muted }}>{`You have ${p.groups} rack groups. Rack rotation uses them as they are.`}</Text>
            {p.onEditRacks ? <Text accessibilityRole="link" onPress={p.onEditRacks} style={{ fontSize: 13, fontWeight: '700', textDecorationLine: 'underline', minHeight: 44, paddingVertical: 12 }}>Edit racks</Text> : null}
          </Row>
        ) : p.groups != null && p.groups > 0 ? (
          <Text style={{ fontSize: 13, color: colors.muted }}>From your rack groups</Text>
        ) : null,
      )}
      {line(
        'Equipment',
        <Text style={{ flex: 1, fontSize: 15 }}>{eqText}</Text>,
        <Button small kind="secondary" title={editEq ? 'Done' : 'Edit'} onPress={() => setEditEq(!editEq)} />,
      )}
      {editEq ? <EquipmentPicker value={p.equipment} onChange={p.onEquipment} /> : null}
      {line(
        'Athletes per session',
        loading ? <Text style={{ color: colors.muted }}>…</Text> : <View accessibilityLabel={`Athletes per session, ${p.athletes}`}><Stepper value={p.athletes} min={1} max={60} onChange={p.onAthletes} /></View>,
        <Text style={{ fontSize: 13, color: colors.muted }}>From your roster. Lower it if fewer usually come. Used for the suggestion only. Not saved.</Text>,
      )}
      {line(
        'Session length',
        <Text style={{ fontSize: 15 }}>{`about ${p.minutes} min${p.minutes === p.phaseDefault ? ' (program default)' : ''}`}</Text>,
        <Button small kind="secondary" title={editLen ? 'Done' : 'Change'} onPress={() => setEditLen(!editLen)} />,
      )}
      {editLen ? (
        <Row style={{ gap: 8, flexWrap: 'wrap' }}>
          {[30, 45, 60, 75, 90].map((m) => (
            <Pressable key={m} accessibilityRole="button" accessibilityState={{ selected: p.minutes === m }} onPress={() => p.onMinutes(m === p.phaseDefault ? null : m)} style={{ minHeight: 44, minWidth: 56, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.line, borderRadius: 10, backgroundColor: p.minutes === m ? colors.primaryBg : colors.card }}>
              <Text style={{ color: p.minutes === m ? colors.primaryText : colors.ink, fontWeight: p.minutes === m ? '700' : '400' }}>{`${m}`}</Text>
            </Pressable>
          ))}
        </Row>
      ) : null}
      <View style={{ borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 10, gap: 8 }}>
        <Text style={{ fontSize: 15, fontWeight: '600' }}>Style</Text>
        {loading ? (
          <Text style={{ fontSize: 13, color: colors.muted }}>Working out a suggestion…</Text>
        ) : (
          <>
            <Text accessibilityLiveRegion="polite" style={{ fontSize: 13, fontVariant: ['tabular-nums'] }}>{sug.math}</Text>
            <View accessibilityRole="radiogroup" accessibilityLabel="Style" style={{ flexDirection: wide ? 'row' : 'column', gap: 8 }}>
              {STYLES.map((s) => {
                const on = chosen === s;
                const disabled = s === 'rack_rotation' && p.racks <= 0;
                const suggested = sug.style === s;
                return (
                  <Pressable
                    key={s}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: on, disabled }}
                    accessibilityLabel={`${STYLE_TEXT[s].title}${suggested ? ', suggested' : ''}`}
                    disabled={disabled}
                    onPress={() => p.onStyle(s)}
                    style={{ flex: wide ? 1 : undefined, minHeight: 64, padding: 12, gap: 4, opacity: disabled ? 0.4 : 1, borderRadius: 12, borderWidth: on ? 2 : 1, borderColor: on ? colors.ink : colors.line, backgroundColor: on ? colors.raised : colors.card }}
                  >
                    <Row style={{ gap: 6, flexWrap: 'wrap' }}>
                      <Text style={{ fontSize: 16 }}>{on ? '◉' : '○'}</Text>
                      <Text style={{ fontSize: 16, fontWeight: on ? '700' : '500' }}>{STYLE_TEXT[s].title}</Text>
                      {suggested ? <Text style={{ fontSize: 12, fontWeight: '700', color: colors.muted }}>Suggested</Text> : null}
                      {suggested && sug.express ? <Text style={{ fontSize: 12, fontWeight: '700' }}>Express</Text> : null}
                    </Row>
                    <Text style={{ fontSize: 13, color: colors.muted }}>{STYLE_TEXT[s].line}</Text>
                  </Pressable>
                );
              })}
            </View>
            <Text style={{ fontSize: 13 }}>{`Suggested: ${STYLE_TEXT[sug.style].title}. ${sug.reason}`}</Text>
            {sug.express ? <Text style={{ fontSize: 13 }}>Plus Express sessions. Short sessions: the essentials only.</Text> : null}
            <Text style={{ fontSize: 13, color: colors.muted }}>Home workout and mobility days are always Standard.</Text>
            {info.map((l) => (
              <Text key={l} style={{ fontSize: 13, color: colors.muted }}>{l}</Text>
            ))}
            {chosen === 'rack_rotation' && (p.groups ?? 0) > 0 && p.onEditRacks ? (
              <Text accessibilityRole="link" onPress={p.onEditRacks} style={{ fontSize: 13, fontWeight: '700', textDecorationLine: 'underline', minHeight: 44, paddingVertical: 12 }}>Edit racks</Text>
            ) : null}
          </>
        )}
      </View>
    </Card>
  );
}
