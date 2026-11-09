import { Stack, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Body, BRAND, Button, Card, Chip, ChipRow, colors, Field, H2, Icon, Label, Note, Row, Screen, Text } from '../components/ui';
import {
  addDays,
  dateKey,
  DayPlan,
  eventOn,
  formatKey,
  fromKey,
  mondayOf,
  planForDate,
  today,
  upcomingEvents,
  weekPlan,
  weekdayOf,
  withEvent,
  withOverride,
} from '../lib/calendar';
import { showAlert } from '../lib/dialog';
import { useStore } from '../lib/store';
import { useTeams } from '../lib/team';
import type { DayType, Program } from '../lib/types';
import { DAY_TYPES, WEEKDAYS } from '../lib/types';

const TYPE_CHOICES: { id: DayType; label: string }[] = [
  { id: 'practice', label: 'Practice' },
  { id: 'game', label: 'Match' },
  { id: 'tournament', label: 'Tournament' },
  { id: 'off', label: 'No volleyball' },
];

export default function CalendarScreen() {
  const { programId } = useLocalSearchParams<{ programId: string }>();
  const { data, saveProgram } = useStore();
  const { postTeamProgram } = useTeams();
  const program = data.programs.find((p) => p.id === programId);
  const [month, setMonth] = useState(() => {
    const t = today();
    return new Date(t.getFullYear(), t.getMonth(), 1);
  });
  const [selected, setSelected] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);

  const weeks = useMemo(() => {
    if (!program) return [];
    const rows: DayPlan[][] = [];
    let monday = mondayOf(month);
    while (monday.getMonth() === month.getMonth() || addDays(monday, 6).getMonth() === month.getMonth()) {
      rows.push(weekPlan(program, monday));
      monday = addDays(monday, 7);
    }
    return rows;
  }, [program, month]);

  if (!program) return <Screen><Body muted>Program not found.</Body></Screen>;
  const coach = data.profile?.role === 'coach';
  const readOnly = !!program.teamId && !coach;
  const todayKey = dateKey(today());
  const upcoming = upcomingEvents(program, today(), 6);

  function save(next: Program) {
    saveProgram({ ...next, ...(next.teamId ? { unposted: true } : null) });
  }

  async function post() {
    setPosting(true);
    try {
      await postTeamProgram(program!.teamId!);
      showAlert('Calendar posted', `${program!.teamName ?? 'The team'} has the new dates.`);
    } catch (e) {
      showAlert("Couldn't post", e instanceof Error ? e.message : 'Try again.');
    } finally {
      setPosting(false);
    }
  }

  return (
    <Screen>
      <Stack.Screen options={{ title: 'Season calendar' }} />
      <Body muted style={{ fontSize: 13 }}>
        {readOnly
          ? `${program.teamName ?? 'Your team'}'s dates, set by your coach. Lifts move automatically around matches.`
          : 'Tap a date to mark a match, tournament or day off, or to choose that day\'s lift. Lifts move automatically around matches.'}
      </Body>

      {coach && program.teamId && program.unposted ? (
        <Card>
          <Text style={{ fontWeight: '600' }}>Changes not posted</Text>
          <Text style={{ fontSize: 13, color: colors.muted }}>Athletes see new dates after you post.</Text>
          <Button title={posting ? 'Posting…' : `Post to ${program.teamName ?? 'team'}`} disabled={posting} onPress={post} />
        </Card>
      ) : null}

      <Card style={{ padding: 12 }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <Pressable accessibilityLabel="Previous month" hitSlop={10} onPress={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}>
            <View style={{ transform: [{ rotate: '180deg' }] }}>
              <Icon name="chevron.right" size={18} color={colors.ink} />
            </View>
          </Pressable>
          <Text style={{ fontSize: 16, fontWeight: '600' }}>
            {month.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
          </Text>
          <Pressable accessibilityLabel="Next month" hitSlop={10} onPress={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}>
            <Icon name="chevron.right" size={18} color={colors.ink} />
          </Pressable>
        </Row>

        <View style={{ flexDirection: 'row', marginTop: 8 }}>
          {WEEKDAYS.map((d) => (
            <Text key={d} style={{ flex: 1, textAlign: 'center', fontSize: 12, color: colors.muted }}>
              {d.slice(0, 2)}
            </Text>
          ))}
        </View>

        {weeks.map((row) => (
          <View key={row[0].date} style={{ flexDirection: 'row', gap: 3, marginTop: 3 }}>
            {row.map((p) => {
              const d = fromKey(p.date);
              const inMonth = d.getMonth() === month.getMonth();
              const isToday = p.date === todayKey;
              const changed = p.source !== 'plan';
              return (
                <Pressable
                  key={p.date}
                  accessibilityRole="button"
                  accessibilityLabel={`${formatKey(p.date)}: ${DAY_TYPES.find((x) => x.id === p.dayType)!.label}${p.sessionId ? ', lift' : ''}${p.note ? `. ${p.note}` : ''}`}
                  onPress={() => setSelected(p.date)}
                  style={{
                    flex: 1,
                    aspectRatio: 0.82,
                    borderRadius: BRAND.radius.sm,
                    padding: 3,
                    backgroundColor: p.dayType === 'off' ? 'transparent' : colors.day[p.dayType],
                    borderWidth: isToday ? 2 : 1,
                    borderColor: isToday ? colors.ink : colors.line,
                    opacity: inMonth ? 1 : 0.35,
                    justifyContent: 'space-between',
                  }}
                >
                  <Row style={{ justifyContent: 'space-between', gap: 0 }}>
                    <Text style={{ fontSize: 12, fontWeight: isToday ? '600' : '400' }}>{d.getDate()}</Text>
                    {changed ? <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: colors.ink }} /> : null}
                  </Row>
                  <Text style={{ fontSize: 12, fontWeight: '600', textAlign: 'center' }}>
                    {p.dayType === 'tournament' ? 'T' : p.dayType === 'game' ? 'M' : ''}
                  </Text>
                  <View
                    style={{
                      height: 4,
                      borderRadius: 2,
                      backgroundColor: p.sessionId ? colors.ink : 'transparent',
                    }}
                  />
                </Pressable>
              );
            })}
          </View>
        ))}

        <Row style={{ flexWrap: 'wrap', gap: 10, marginTop: 10 }}>
          <Legend swatch={<View style={{ width: 14, height: 4, borderRadius: 2, backgroundColor: colors.ink }} />} text="Lift" />
          <Legend swatch={<Text style={{ fontSize: 12, fontWeight: '600' }}>M</Text>} text="Match" />
          <Legend swatch={<Text style={{ fontSize: 12, fontWeight: '600' }}>T</Text>} text="Tournament" />
          <Legend swatch={<View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: colors.ink }} />} text="Lift moved or chosen" />
        </Row>
      </Card>

      <View style={{ gap: 8 }}>
        <Label>Upcoming</Label>
        {upcoming.length === 0 ? (
          <Body muted style={{ fontSize: 13 }}>No matches or tournaments on the calendar yet.</Body>
        ) : (
          <Card style={{ gap: 0, paddingVertical: 4 }}>
            {upcoming.map((e, i) => (
              <Pressable
                key={e.date}
                onPress={() => {
                  const d = fromKey(e.date);
                  setMonth(new Date(d.getFullYear(), d.getMonth(), 1));
                  setSelected(e.date);
                }}
                style={{ paddingVertical: 10, borderTopWidth: i ? 1 : 0, borderTopColor: colors.line }}
              >
                <Row style={{ justifyContent: 'space-between' }}>
                  <Text style={{ fontWeight: '600' }}>{e.type === 'tournament' ? 'Tournament' : 'Match'}{e.label ? ` · ${e.label}` : ''}</Text>
                  <Text style={{ fontSize: 13, color: colors.muted }}>{formatKey(e.date)}</Text>
                </Row>
              </Pressable>
            ))}
          </Card>
        )}
      </View>

      {selected ? (
        <DaySheet
          program={program}
          dateKeyStr={selected}
          readOnly={readOnly}
          onClose={() => setSelected(null)}
          onSave={(next) => {
            save(next);
            setSelected(null);
          }}
        />
      ) : null}
    </Screen>
  );
}

function Legend({ swatch, text }: { swatch: React.ReactNode; text: string }) {
  return (
    <Row style={{ gap: 6 }}>
      {swatch}
      <Text style={{ fontSize: 12, color: colors.muted }}>{text}</Text>
    </Row>
  );
}

/** Bottom sheet to edit one date: its volleyball and its lift. */
function DaySheet({
  program,
  dateKeyStr,
  readOnly,
  onClose,
  onSave,
}: {
  program: Program;
  dateKeyStr: string;
  readOnly: boolean;
  onClose: () => void;
  onSave: (p: Program) => void;
}) {
  const insets = useSafeAreaInsets();
  const date = fromKey(dateKeyStr);
  const existing = eventOn(program, date);
  const usual = program.volleyballWeek[weekdayOf(date)];
  const [type, setType] = useState<DayType | null>(existing?.type ?? null); // null = usual week
  const [label, setLabel] = useState(existing?.label ?? '');
  const [nextDayToo, setNextDayToo] = useState(false);
  const hasOverride = !!program.overrides && dateKeyStr in program.overrides;
  const [lift, setLift] = useState<string | null | 'auto'>(hasOverride ? program.overrides![dateKeyStr] : 'auto');

  // Preview the automatic plan with the event edits applied.
  let draft = withEvent(program, dateKeyStr, type, label);
  const nextKey = dateKey(addDays(date, 1));
  if (nextDayToo && type === 'tournament') draft = withEvent(draft, nextKey, 'tournament', label);
  const auto = planForDate(withOverride(draft, dateKeyStr, undefined), date);
  const autoName = program.sessions.find((s) => s.id === auto.sessionId)?.name ?? 'Rest';
  const current = planForDate(program, date);
  const currentName = program.sessions.find((s) => s.id === current.sessionId)?.name ?? 'Rest';

  function apply() {
    onSave(withOverride(draft, dateKeyStr, lift === 'auto' ? undefined : lift));
  }

  return (
    <Modal transparent animationType="slide" visible onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }} onPress={onClose} accessibilityLabel="Close" />
      <View
        style={{
          backgroundColor: colors.card,
          borderTopLeftRadius: BRAND.radius.lg,
          borderTopRightRadius: BRAND.radius.lg,
          borderWidth: 1,
          borderColor: colors.line,
          maxHeight: '85%',
        }}
      >
        <ScrollView contentContainerStyle={{ padding: 20, gap: 14, paddingBottom: 20 + insets.bottom }} keyboardShouldPersistTaps="handled">
          <H2>{formatKey(dateKeyStr, { weekday: 'long', month: 'long', day: 'numeric' })}</H2>

          {readOnly ? (
            <>
              <Text>
                {DAY_TYPES.find((x) => x.id === current.dayType)!.label}
                {current.event?.label ? ` · ${current.event.label}` : ''}
              </Text>
              <Text style={{ fontSize: 16, fontWeight: '600' }}>Lift: {currentName}</Text>
              {current.note ? <Note>{current.note}</Note> : null}
              <Button title="Close" onPress={onClose} />
            </>
          ) : (
            <>
              <Label>Volleyball</Label>
              <ChipRow>
                <Chip
                  label={`Usual (${DAY_TYPES.find((x) => x.id === usual)!.label})`}
                  selected={type === null}
                  onPress={() => setType(null)}
                />
                {TYPE_CHOICES.map((c) => (
                  <Chip key={c.id} label={c.label} selected={type === c.id} onPress={() => setType(c.id)} />
                ))}
              </ChipRow>
              {type === 'game' || type === 'tournament' ? (
                <Field
                  placeholder={type === 'tournament' ? 'Tournament name (optional)' : 'Opponent (optional)'}
                  value={label}
                  onChangeText={setLabel}
                  maxLength={40}
                />
              ) : null}
              {type === 'tournament' ? (
                <Chip
                  label={`Also ${formatKey(nextKey, { weekday: 'long' })} (2-day tournament)`}
                  selected={nextDayToo}
                  onPress={() => setNextDayToo(!nextDayToo)}
                />
              ) : null}

              <Label>Lift</Label>
              <ChipRow>
                <Chip label={`Auto: ${autoName}`} selected={lift === 'auto'} onPress={() => setLift('auto')} />
                <Chip label="Rest" selected={lift === null} onPress={() => setLift(null)} />
                {program.sessions.map((s) => (
                  <Chip key={s.id} label={s.name} selected={lift === s.id} onPress={() => setLift(s.id)} />
                ))}
              </ChipRow>
              {lift === 'auto' && auto.note ? <Note>{auto.note}</Note> : null}
              {lift !== 'auto' && (type === 'game' || type === 'tournament' || (type === null && (usual === 'game' || usual === 'tournament'))) && lift ? (
                <Text style={{ fontSize: 13, color: colors.warning }}>Lifting on a match day is not recommended.</Text>
              ) : null}

              <Row>
                <View style={{ flex: 1 }}>
                  <Button kind="ghost" title="Cancel" onPress={onClose} />
                </View>
                <View style={{ flex: 1 }}>
                  <Button title="Save" onPress={apply} />
                </View>
              </Row>
            </>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

