import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { LENGTH_MAX, LENGTH_MIN, LENGTH_PICKS, PHASE_WORD, phaseRange } from '../lib/fit';
import { useStore } from '../lib/store';
import type { Program } from '../lib/types';
import Sheet from './Sheet';
import { Button, Card, Chip, ChipRow, colors, Label, Row, Text, Toggle } from './ui';

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const DAY_PLURAL = ['Mondays', 'Tuesdays', 'Wednesdays', 'Thursdays', 'Fridays', 'Saturdays', 'Sundays'];

/** Quick picks · Custom (20–120, 5-min steps) · Phase default (F51a). `value` null = phase default. */
function LengthPicker({ value, onChange, phaseLabel, defaultLabel }: { value: number | null; onChange: (v: number | null) => void; phaseLabel: string; defaultLabel: string }) {
  const custom = value != null && !LENGTH_PICKS.includes(value);
  const [showCustom, setShowCustom] = useState(custom);
  return (
    <View style={{ gap: 8 }}>
      <ChipRow>
        <Chip label={defaultLabel || phaseLabel} selected={value == null} onPress={() => { setShowCustom(false); onChange(null); }} />
        {LENGTH_PICKS.map((m) => (
          <Chip key={m} label={`${m}`} selected={value === m} onPress={() => { setShowCustom(false); onChange(m); }} />
        ))}
        <Chip label="Custom" selected={custom || showCustom} onPress={() => { setShowCustom(true); if (value == null) onChange(60); }} />
      </ChipRow>
      {custom || showCustom ? (
        <Row style={{ gap: 6, alignItems: 'center' }}>
          <Text style={{ fontSize: 14, minWidth: 64 }}>{`${value ?? 60} min`}</Text>
          <View style={{ flex: 1 }}>
            <Button small kind="ghost" title="−5 min" disabled={(value ?? 60) <= LENGTH_MIN} onPress={() => onChange(Math.max(LENGTH_MIN, (value ?? 60) - 5))} />
          </View>
          <View style={{ flex: 1 }}>
            <Button small kind="ghost" title="+5 min" disabled={(value ?? 60) >= LENGTH_MAX} onPress={() => onChange(Math.min(LENGTH_MAX, (value ?? 60) + 5))} />
          </View>
        </Row>
      ) : null}
    </View>
  );
}

/**
 * Program settings for coaches and trainers: F46a "Adjust exercises to each athlete's level" and F51a/b session length
 * (program default and per weekday). Length and level changes never make a session coach-built (§0.1).
 */
export default function ProgramSettings({ program }: { program: Program }) {
  const { saveProgram } = useStore();
  const [dayPick, setDayPick] = useState<number | null>(null);
  const general = !!program.general;
  const who = general ? 'client' : 'athlete';
  const [lo, hi] = phaseRange(program);
  const phaseLabel = general ? `Default (${lo}–${hi})` : `Phase default (${PHASE_WORD[program.phase]} ${lo}–${hi})`;
  const save = (patch: Partial<Program>) => saveProgram({ ...program, ...patch, ...(program.teamId && !program.groupKey?.startsWith('draft') ? { unposted: true } : null) });
  const on = program.levelAdjust !== false;
  const byDay = program.minutesByWeekday ?? Array(7).fill(null);
  const schedule = (general ? program.weeks?.[0]?.schedule : null) ?? program.liftSchedule ?? [];
  const liftDays = schedule.map((id, i) => (id ? i : -1)).filter((i) => i >= 0);
  const setDay = (d: number, v: number | null) => {
    const next = [...byDay];
    while (next.length < 7) next.push(null);
    next[d] = v;
    save({ minutesByWeekday: next.some((x) => x != null) ? next : undefined });
  };
  return (
    <Card style={{ gap: 10 }}>
      <Label>Program settings</Label>
      <Row style={{ justifyContent: 'space-between', minHeight: 44 }}>
        <Text style={{ fontSize: 15, fontWeight: '600', flex: 1 }}>{`Adjust exercises to each ${who}'s level`}</Text>
        <Toggle accessibilityLabel={`Adjust exercises to each ${who}'s level`} value={on} onValueChange={(v) => save({ levelAdjust: v ? undefined : false })} />
      </Row>
      <Text style={{ fontSize: 13, color: colors.muted }}>
        {on ? `${general ? 'Clients' : 'Athletes'} get the version of each exercise that fits their level. Sets, reps, and rest stay the same.` : 'Everyone gets exactly what you write.'}
      </Text>

      <Text style={{ fontSize: 15, fontWeight: '600' }}>Session length</Text>
      <LengthPicker value={program.sessionMinutes ?? null} phaseLabel={phaseLabel} defaultLabel={phaseLabel} onChange={(v) => save({ sessionMinutes: v ?? undefined })} />
      <Text style={{ fontSize: 13, color: colors.muted }}>Approach Strength fits its sessions to this. Your own sessions show the estimate.</Text>

      {liftDays.length ? (
        <View style={{ gap: 4 }}>
          {liftDays.map((d) => {
            const set = byDay[d];
            const len = set ?? program.sessionMinutes ?? hi;
            return (
              <Pressable key={d} accessibilityRole="button" onPress={() => setDayPick(d)} style={{ minHeight: 44, justifyContent: 'center' }}>
                <Text style={{ fontSize: 14 }}>
                  {`${DAY_NAMES[d]} · ${len} min`}
                  {set != null ? <Text style={{ fontSize: 13, color: colors.muted }}>{` ● Set for ${DAY_PLURAL[d]}.`}</Text> : null}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}

      {dayPick != null ? (
        <Sheet title={`Session length on ${DAY_PLURAL[dayPick]}`} onClose={() => setDayPick(null)}>
          <LengthPicker value={byDay[dayPick] ?? null} phaseLabel="Use program default" defaultLabel="Use program default" onChange={(v) => setDay(dayPick, v)} />
          <Text style={{ fontSize: 13, color: colors.muted }}>Approach Strength&apos;s sessions refit. Your own sessions show the new target.</Text>
          <Button title="Save" onPress={() => setDayPick(null)} />
        </Sheet>
      ) : null}
    </Card>
  );
}
