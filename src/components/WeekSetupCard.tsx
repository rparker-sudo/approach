import { useMemo, useState } from 'react';
import { Pressable, useWindowDimensions, View } from 'react-native';
import { mondayOf, dateKey, addDays } from '../lib/calendar';
import { generateProgram, type GeneratorInput } from '../lib/generator';
import { type DayKind } from '../lib/homeV3';
import { recommendWeek, summaryLines, weekLine } from '../lib/weekV3';
import { PHASES, WEEKDAYS } from '../lib/types';
import type { CalendarEvent, DayType, Program } from '../lib/types';
import { Button, Card, Row, Text, Toggle, colors } from './ui';

/**
 * 2.4.1 UX F56 · Week setup card (spec D1–D3; home-and-mobility-v3 §5). The coach decides which kind of day each weekday is;
 * Approach Strength's programming decides the workouts. No session content here. Team (volleyball) programs only.
 */
export const KIND_LABEL: Record<DayKind, string> = { off: 'Off', room: 'Weight room', home: 'Home workout', mobility: 'Mobility' };
const KINDS: DayKind[] = ['off', 'room', 'home', 'mobility'];
const FULL_DAY = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const isMatch = (t: DayType | undefined) => t === 'game' || t === 'tournament';
type Props = {
  kinds: DayKind[];
  onChange: (k: DayKind[]) => void;
  asBuilt: DayKind[] | null;
  week: DayType[];
  events: CalendarEvent[];
  phase: Program['phase'];
  homeJumps: boolean;
  onHomeJumps: (v: boolean) => void;
  sessionMinutes: number | null;
  onSessionMinutes: (v: number | null) => void;
  minutesByWeekday?: (number | null)[];
  input: Omit<GeneratorInput, 'kinds'>;
  otherTeamAthletes?: number;
  onBuild: () => void;
};

export default function WeekSetupCard(p: Props) {
  const { width } = useWindowDimensions();
  const wide = width >= 900;
  const [tags, setTags] = useState<number[]>([]);
  const [undo, setUndo] = useState<{ prev: DayKind[]; text: string } | null>(null);
  const [nothing, setNothing] = useState(false);
  const monday = mondayOf(new Date());
  const phaseDefault = p.phase === 'off' ? 60 : p.phase === 'pre' ? 50 : p.phase === 'in' ? 40 : 45;
  const context = (i: number): string => {
    const key = dateKey(addDays(monday, i));
    // Own team only (compliance § Multiple teams): events from another team carry teamName and never show here.
    const ev = p.events.find((e) => e.date === key && !e.teamName && e.type !== 'break');
    const t = ev?.type ?? p.week[i];
    return t === 'game' ? 'Match' : t === 'tournament' ? 'Tournament' : t === 'practice' ? 'Practice' : '—';
  };
  const typeOn = (i: number): DayType => {
    const key = dateKey(addDays(monday, i));
    return (p.events.find((e) => e.date === key && !e.teamName && e.type !== 'break')?.type as DayType | undefined) ?? p.week[i];
  };
  const length = (i: number, k: DayKind) => {
    if (k === 'off') return '';
    if (k === 'mobility') return isMatch(typeOn(i)) ? '12 min' : `${p.phase === 'in' ? 15 : p.phase === 'post' ? 25 : 20} min`;
    if (k === 'home') return '30 min';
    return `${p.minutesByWeekday?.[i] ?? p.sessionMinutes ?? phaseDefault} min`;
  };
  const info = (i: number, k: DayKind): string | null => {
    if (k === 'mobility' && isMatch(typeOn(i))) return 'Match day: athletes get the 12-min after-your-match version.';
    if (k === 'home' && isMatch(typeOn(i))) return 'Match day: athletes get this day Off (no home workout on a match day).';
    if (k === 'home' && isMatch(typeOn((i + 1) % 7))) return 'Day before a match: this home workout will be upper body or care.';
    return null;
  };
  const set = (i: number, k: DayKind) => {
    const next = [...p.kinds];
    next[i] = k;
    setTags((t) => t.filter((x) => x !== i));
    setNothing(false);
    p.onChange(next);
  };
  const recommend = () => {
    const r = recommendWeek(p.kinds, p.week, p.phase);
    if (!r.filled.length) {
      setNothing(true);
      return;
    }
    const homes = r.filled.filter((i) => r.kinds[i] === 'home').length;
    const mobs = r.filled.filter((i) => r.kinds[i] === 'mobility').length;
    const text = `Recommended ${[homes ? `${homes} home workout${homes === 1 ? '' : 's'}` : '', mobs ? `${mobs} mobility day${mobs === 1 ? '' : 's'}` : ''].filter(Boolean).join(' and ')}.`;
    setUndo({ prev: p.kinds, text });
    setTags(r.filled);
    p.onChange(r.kinds);
  };
  const program = useMemo(() => {
    try {
      return generateProgram({ ...p.input, kinds: p.kinds, liftDaysPerWeek: Math.max(1, p.kinds.filter((k) => k === 'room' || k === 'home').length) });
    } catch {
      return null;
    }
  }, [p.input, p.kinds]);
  const summary = program ? summaryLines(p.kinds, { ...program, teamId: 'preview', events: p.events.filter((e) => !e.teamName) }, monday, p.phase) : null;
  const allOff = p.kinds.every((k) => k === 'off');
  const changed = !!p.asBuilt && p.asBuilt.some((k, i) => k !== p.kinds[i]);
  const phaseLabel = PHASES.find((x) => x.id === p.phase)?.label ?? '';
  const weekOf = monday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  return (
    <Card style={{ gap: 10 }}>
      <Row style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={{ fontSize: 17, fontWeight: '700' }}>Week setup</Text>
        <Button small kind="secondary" title={wide ? 'Recommend for me' : 'Recommend'} onPress={recommend} />
      </Row>
      <Text style={{ fontSize: 13, color: colors.muted }}>{`Week of ${weekOf} · ${phaseLabel}${p.asBuilt && !changed ? ' · As built' : ''}`}</Text>
      {undo ? (
        <Row style={{ gap: 8, alignItems: 'center' }}>
          <Text style={{ fontSize: 13 }}>{undo.text}</Text>
          <Text
            accessibilityRole="button"
            onPress={() => {
              p.onChange(undo.prev);
              setTags([]);
              setUndo(null);
            }}
            style={{ fontSize: 13, fontWeight: '700', textDecorationLine: 'underline', minHeight: 44, paddingVertical: 12 }}
          >
            Undo
          </Text>
        </Row>
      ) : null}
      {nothing ? <Text style={{ fontSize: 13, color: colors.muted }}>Your week already has the recommended days.</Text> : null}
      {p.week.every((t) => t === 'off') ? <Text style={{ fontSize: 13, color: colors.muted }}>Add your practice days in Team → Schedule</Text> : null}

      {p.kinds.map((k, i) => {
        const line = info(i, k);
        const ctx = context(i);
        const seg = (
          <View accessibilityRole="radiogroup" accessibilityLabel={`${FULL_DAY[i]}, ${ctx === '—' ? 'no volleyball' : ctx}. Day type.`} style={{ flexDirection: 'row', flex: wide ? 1 : undefined, borderWidth: 1, borderColor: colors.line, borderRadius: 10, overflow: 'hidden' }}>
            {KINDS.map((opt) => {
              const on = k === opt;
              const label = !wide && opt === 'home' ? 'Home' : KIND_LABEL[opt];
              return (
                <Pressable
                  key={opt}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: on }}
                  accessibilityLabel={`${KIND_LABEL[opt]}${on ? ', selected' : ''}`}
                  onPress={() => set(i, opt)}
                  style={{ flex: 1, minHeight: 44, minWidth: 56, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4, backgroundColor: on ? colors.primaryBg : colors.card }}
                >
                  <Text style={{ fontSize: width < 360 ? 12 : 13, fontWeight: on ? '700' : '400', color: on ? colors.primaryText : colors.ink }}>{label}</Text>
                </Pressable>
              );
            })}
          </View>
        );
        return (
          <View key={i} style={{ gap: 4, paddingVertical: 6, borderTopWidth: i ? 1 : 0, borderTopColor: colors.line }}>
            {wide ? (
              <Row style={{ alignItems: 'center', gap: 12, minHeight: 56 }}>
                <Text style={{ width: 64, fontWeight: '700' }} accessibilityLabel={FULL_DAY[i]}>{WEEKDAYS[i]}</Text>
                <Text style={{ width: 180, color: colors.muted }}>{ctx}</Text>
                {seg}
                <Text style={{ width: 64, color: colors.muted, textAlign: 'right' }}>{length(i, k)}</Text>
                {tags.includes(i) ? <Text style={{ fontSize: 12, fontWeight: '700' }}>Recommended</Text> : null}
              </Row>
            ) : (
              <>
                <Row style={{ justifyContent: 'space-between' }}>
                  <Text style={{ fontWeight: '700' }} accessibilityLabel={`${FULL_DAY[i]}, ${ctx}`}>{`${WEEKDAYS[i]} · ${ctx}`}</Text>
                  <Text style={{ color: colors.muted }}>{`${length(i, k)}${tags.includes(i) ? ' · Recommended' : ''}`}</Text>
                </Row>
                {seg}
              </>
            )}
            {line ? <Text style={{ fontSize: 13, color: colors.muted }}>{line}</Text> : null}
          </View>
        );
      })}

      <View style={{ gap: 6, borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 10 }}>
        <Text style={{ fontSize: 15 }}>{`Session length: about ${p.sessionMinutes ?? phaseDefault} min`}</Text>
        <Row style={{ gap: 8, flexWrap: 'wrap' }}>
          {[30, 45, 60, 75, 90].map((m) => (
            <Pressable
              key={m}
              accessibilityRole="button"
              accessibilityState={{ selected: (p.sessionMinutes ?? phaseDefault) === m }}
              onPress={() => p.onSessionMinutes(m === phaseDefault ? null : m)}
              style={{ minHeight: 44, minWidth: 56, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.line, borderRadius: 10, backgroundColor: (p.sessionMinutes ?? phaseDefault) === m ? colors.primaryBg : colors.card }}
            >
              <Text style={{ color: (p.sessionMinutes ?? phaseDefault) === m ? colors.primaryText : colors.ink, fontWeight: (p.sessionMinutes ?? phaseDefault) === m ? '700' : '400' }}>{`${m}`}</Text>
            </Pressable>
          ))}
        </Row>
        <Row style={{ justifyContent: 'space-between', minHeight: 44, alignItems: 'center' }}>
          <Text style={{ fontSize: 15, flex: 1 }}>Jumps at home</Text>
          <Toggle accessibilityLabel="Jumps at home" value={p.homeJumps} onValueChange={p.onHomeJumps} />
        </Row>
        <Text style={{ fontSize: 13, color: colors.muted }}>
          {`Level 1 jumps (up to 20 contacts) in home workouts in off-season and preseason.${p.phase === 'off' || p.phase === 'pre' ? '' : ' Not added at this time of year.'} Athletes see: Clear space, no low ceilings, sneakers on.`}
        </Text>
      </View>

      <View accessibilityLiveRegion="polite" style={{ gap: 4, borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 10 }}>
        <Text style={{ fontSize: 15, fontWeight: '600' }}>{summary?.week ?? weekLine(p.kinds)}</Text>
        {summary?.levels.map((l) => <Text key={l} style={{ fontSize: 13, color: colors.muted }}>{l}</Text>)}
        {summary?.exceptions.map((l) => <Text key={l} style={{ fontSize: 13, color: colors.muted }}>{l}</Text>)}
        {p.otherTeamAthletes ? (
          <Text style={{ fontSize: 13, color: colors.muted }}>{`${p.otherTeamAthletes} athlete${p.otherTeamAthletes === 1 ? '' : 's'} also train${p.otherTeamAthletes === 1 ? 's' : ''} with another team. Their weeks may shift around that team's matches.`}</Text>
        ) : null}
      </View>

      {changed ? <Text style={{ fontSize: 13, color: colors.muted }}>Changes apply from the next week that hasn&apos;t started.</Text> : null}
      {allOff ? <Text style={{ fontSize: 13, color: colors.muted }}>Pick at least one day.</Text> : null}
      <Button title={p.asBuilt ? 'Rebuild program' : 'Build program'} icon="wand.and.stars" disabled={allOff} onPress={p.onBuild} />
      {changed && p.asBuilt ? (
        <Text accessibilityRole="button" onPress={() => p.onChange(p.asBuilt!)} style={{ fontSize: 13, textDecorationLine: 'underline', minHeight: 44, paddingVertical: 12 }}>
          Cancel changes
        </Text>
      ) : null}
    </Card>
  );
}
