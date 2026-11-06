import { Pressable, Text, View } from 'react-native';
import { getExercise } from '../lib/exercises';
import { dayAdvice } from '../lib/generator';
import type { DayType, Program } from '../lib/types';
import { DAY_TYPES, WEEKDAYS } from '../lib/types';
import { Chip, ChipRow, colors, Body } from './ui';

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
                borderRadius: 10,
                backgroundColor: colors.day[t],
                borderWidth: 1,
                borderColor: t === 'off' ? colors.line : 'transparent',
              }}
            >
              <Text style={{ fontSize: 12, fontWeight: '700', color: colors.muted }}>{d}</Text>
              <Text style={{ fontSize: 11, fontWeight: '700', color: colors.ink, marginTop: 4 }}>{meta.short}</Text>
            </Pressable>
          );
        })}
      </View>
      <Body muted style={{ fontSize: 13 }}>
        Tap a day to change it: Off → Practice → Match → Tournament.
      </Body>
    </View>
  );
}

export function LiftDaysPicker({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <ChipRow>
      {[2, 3, 4].map((n) => (
        <Chip key={n} label={`${n} days`} selected={value === n} onPress={() => onChange(n)} />
      ))}
    </ChipRow>
  );
}

/** Read-only week overview of a program. */
export function ProgramWeek({
  program,
  onPressSession,
  highlight,
}: {
  program: Program;
  onPressSession?: (sessionId: string) => void;
  highlight?: number;
}) {
  return (
    <View style={{ gap: 8 }}>
      {WEEKDAYS.map((d, i) => {
        const vb = program.volleyballWeek[i];
        const sid = program.liftSchedule[i];
        const session = program.sessions.find((s) => s.id === sid);
        const heavy = !!session?.exercises.some((e) => ['lower'].includes(getExercise(e.exerciseId).category));
        const advice = dayAdvice(program.volleyballWeek, i, !!session, heavy);
        const vbLabel = DAY_TYPES.find((x) => x.id === vb)!.label;
        return (
          <Pressable
            key={d}
            disabled={!session || !onPressSession}
            onPress={() => session && onPressSession?.(session.id)}
            style={{
              flexDirection: 'row',
              gap: 12,
              padding: 12,
              borderRadius: 12,
              backgroundColor: '#fff',
              borderWidth: highlight === i ? 2 : 1,
              borderColor: highlight === i ? colors.accent : colors.line,
            }}
          >
            <View style={{ width: 44, alignItems: 'center' }}>
              <Text style={{ fontWeight: '800', color: colors.ink }}>{d}</Text>
              <View style={{ marginTop: 4, backgroundColor: colors.day[vb], borderRadius: 6, paddingHorizontal: 4, paddingVertical: 2 }}>
                <Text style={{ fontSize: 10, fontWeight: '700', color: colors.muted }}>{DAY_TYPES.find((x) => x.id === vb)!.short}</Text>
              </View>
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              {session ? (
                <>
                  <Text style={{ fontWeight: '700', color: colors.ink, fontSize: 15 }}>{session.name}</Text>
                  <Text style={{ color: colors.muted, fontSize: 13 }}>
                    {session.exercises.length} exercises · {vb === 'off' ? 'No volleyball' : `${vbLabel} day`}
                  </Text>
                </>
              ) : (
                <Text style={{ color: colors.muted, fontSize: 15, fontWeight: '600' }}>
                  {vb === 'off' ? 'Rest' : `${vbLabel}, no lift`}
                </Text>
              )}
              {advice ? <Text style={{ color: colors.warn, fontSize: 12, marginTop: 2 }}>{advice}</Text> : null}
            </View>
            {session && onPressSession ? <Text style={{ color: colors.faint, fontSize: 20, alignSelf: 'center' }}>›</Text> : null}
          </Pressable>
        );
      })}
    </View>
  );
}
