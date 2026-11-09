import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { dateKey, fromKey, isHeavyLegs, mondayOf, today, weekPlan } from '../lib/calendar';
import { dayAdvice, MAX_LIFT_DAYS, pickLiftDays } from '../lib/generator';
import type { DayType, Program } from '../lib/types';
import { DAY_TYPES, WEEKDAYS } from '../lib/types';
import { Body, Button, colors, Icon, Note, Row, Text } from './ui';

const ORDER: DayType[] = ['off', 'practice', 'game', 'tournament'];

/** Tap a day to cycle: Off → Practice → Match → Tournament. */
export function WeekEditor({ value, onChange }: { value: DayType[]; onChange: (w: DayType[]) => void }) {
  return (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: 'row', gap: 6 }}>
        {WEEKDAYS.map((d, i) => {
          const t = value[i];
          const meta = DAY_TYPES.find((x) => x.id === t)!;
          return (
            <Pressable
              key={d}
              accessibilityRole="button"
              accessibilityLabel={`${d}: ${meta.label}. Tap to change.`}
              onPress={() => {
                const next = [...value];
                next[i] = ORDER[(ORDER.indexOf(t) + 1) % ORDER.length];
                onChange(next);
              }}
              style={{
                flex: 1,
                alignItems: 'center',
                paddingVertical: 10,
                borderRadius: 8,
                backgroundColor: colors.day[t],
                borderWidth: 1,
                borderColor: t === 'off' ? colors.line : 'transparent',
              }}
            >
              <Text style={{ fontSize: 12, fontWeight: '600' }}>{d}</Text>
              <Text style={{ fontSize: 12, marginTop: 4 }}>{meta.short}</Text>
            </Pressable>
          );
        })}
      </View>
      <Body muted style={{ fontSize: 13 }}>
        Tap a day to change it: Off, Practice, Match, Tournament. Darker days are bigger days.
      </Body>
    </View>
  );
}

/**
 * Tap the days you lift. Shows each day's volleyball and a warning for match days
 * and the day before a match. "Suggest days" re-runs the automatic pick.
 */
export function LiftDayPicker({
  week,
  value,
  onChange,
}: {
  week: DayType[];
  value: number[];
  onChange: (days: number[]) => void;
}) {
  const [tooMany, setTooMany] = useState(false);
  const toggle = (i: number) => {
    if (value.includes(i)) {
      setTooMany(false);
      onChange(value.filter((d) => d !== i));
    } else if (value.length >= MAX_LIFT_DAYS) {
      setTooMany(true);
    } else {
      setTooMany(false);
      onChange([...value, i].sort((a, b) => a - b));
    }
  };
  const warnings = value
    .map((i) => ({ i, text: dayAdvice(week, i, true, true) }))
    .filter((w) => w.text && /Match/.test(w.text));
  return (
    <View style={{ gap: 10 }}>
      <View style={{ flexDirection: 'row', gap: 6 }}>
        {WEEKDAYS.map((d, i) => {
          const on = value.includes(i);
          const t = week[i];
          return (
            <Pressable
              key={d}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: on }}
              aria-checked={on}
              accessibilityLabel={`Lift on ${d}, ${DAY_TYPES.find((x) => x.id === t)!.label}`}
              onPress={() => toggle(i)}
              style={{
                flex: 1,
                alignItems: 'center',
                paddingVertical: 10,
                borderRadius: 8,
                gap: 4,
                backgroundColor: on ? colors.primaryBg : colors.card,
                borderWidth: 1,
                borderColor: on ? colors.primaryBg : colors.line,
              }}
            >
              <Text style={{ fontSize: 12, fontWeight: '600', color: on ? colors.primaryText : colors.ink }}>{d}</Text>
              <Text style={{ fontSize: 12, color: on ? colors.primaryText : colors.muted }}>
                {DAY_TYPES.find((x) => x.id === t)!.short}
              </Text>
              <Text style={{ fontSize: 12, fontWeight: '600', color: on ? colors.primaryText : colors.faint }}>{on ? 'Lift' : '–'}</Text>
            </Pressable>
          );
        })}
      </View>
      <Row style={{ justifyContent: 'space-between' }}>
        <Text style={{ fontSize: 13, color: colors.muted }}>
          {value.length} lift {value.length === 1 ? 'day' : 'days'} · tap to change
        </Text>
        <Button small kind="ghost" title="Suggest days" onPress={() => onChange(pickLiftDays(week, Math.max(value.length, 2)))} />
      </Row>
      {tooMany ? <Note>{`Up to ${MAX_LIFT_DAYS} lift days. Tap a day to turn it off first.`}</Note> : null}
      {warnings.map((w) => (
        <Note key={w.i}>{`${WEEKDAYS[w.i]}: ${w.text}`}</Note>
      ))}
    </View>
  );
}

/** One real week of a program, using calendar dates and automatic adjustments. */
export function ProgramWeek({
  program,
  onPressSession,
  monday = mondayOf(today()),
}: {
  program: Program;
  onPressSession?: (sessionId: string) => void;
  monday?: Date;
}) {
  const plan = weekPlan(program, monday);
  const types = plan.map((p) => p.dayType);
  const todayKey = dateKey(today());
  return (
    <View style={{ gap: 8 }}>
      {plan.map((p, i) => {
        const vb = p.dayType;
        const session = program.sessions.find((s) => s.id === p.sessionId);
        const advice = p.note ?? dayAdvice(types, i, !!session, isHeavyLegs(session));
        const vbLabel = DAY_TYPES.find((x) => x.id === vb)!.label;
        const isToday = p.date === todayKey;
        return (
          <Pressable
            key={p.date}
            disabled={!session || !onPressSession}
            onPress={() => session && onPressSession?.(session.id)}
            style={{
              flexDirection: 'row',
              gap: 12,
              padding: 12,
              borderRadius: 12,
              backgroundColor: colors.card,
              borderWidth: isToday ? 2 : 1,
              borderColor: isToday ? colors.ink : colors.line,
            }}
          >
            <View style={{ width: 48, alignItems: 'center' }}>
              <Text style={{ fontWeight: '600' }}>{WEEKDAYS[i]}</Text>
              <Text style={{ fontSize: 12, color: colors.muted }}>{fromKey(p.date).getDate()}</Text>
              <View style={{ marginTop: 4, backgroundColor: colors.day[vb], borderRadius: 4, borderWidth: vb === 'off' ? 1 : 0, borderColor: colors.line, paddingHorizontal: 4, paddingVertical: 2 }}>
                <Text style={{ fontSize: 12 }}>{DAY_TYPES.find((x) => x.id === vb)!.short}</Text>
              </View>
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              {p.event?.label ? <Text style={{ fontSize: 12, color: colors.muted }}>{p.event.label}</Text> : null}
              {session ? (
                <>
                  <Text style={{ fontWeight: '600', fontSize: 16 }}>{session.name}</Text>
                  <Text style={{ color: colors.muted, fontSize: 13 }}>
                    {session.exercises.length} exercises · {vb === 'off' ? 'No volleyball' : `${vbLabel} day`}
                  </Text>
                </>
              ) : (
                <Text style={{ color: colors.muted, fontSize: 16, fontWeight: '500' }}>
                  {vb === 'off' ? 'Rest' : `${vbLabel}, no lift`}
                </Text>
              )}
              {advice ? <Text style={{ color: colors.ink, fontSize: 12, marginTop: 4 }}>{advice}</Text> : null}
            </View>
            {session && onPressSession ? (
              <View style={{ alignSelf: 'center' }}>
                <Icon name="chevron.right" size={14} color={colors.faint} />
              </View>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}
