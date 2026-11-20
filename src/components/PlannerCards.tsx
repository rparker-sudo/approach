import { useState } from 'react';
import { Pressable, useWindowDimensions, View } from 'react-native';
import { addDays, dateKey, fromKey, weekdayOf } from '../lib/calendar';
import type { DayKind } from '../lib/homeV3';
import {
  blockWeekLabel,
  dateError,
  dmd,
  END_TYPE_TEXT,
  END_TYPES,
  endFromWeeks,
  endSuggestions,
  lengthLine,
  md,
  PHASE_NAME,
  rangeLabel,
  summaryLine,
  weeksBetween,
  type Plan,
  type PlanInput,
  type PlanRow,
} from '../lib/planner';
import { WEEKDAYS, type CalendarEvent, type EndType } from '../lib/types';
import { Button, Card, colors, Field, OptionCard, Row, StatusChip, Stepper, Text } from './ui';

/**
 * 2.4.2 Part A screens (UX user-flows-planner-v3.md F57–F59). Coach only. Built only when FLAGS.plannerV3 is on.
 * Known conflict 3 (Legal): testing labels are "Testing day …" only; known conflict 4: "Ends fresh" → "Tapers into".
 */

/** F57 numbered card title with an optional header tag ("As built", "From your last program"). */
export function SetupTitle({ n, title, tag }: { n: number; title: string; tag?: string | null }) {
  return (
    <Row style={{ justifyContent: 'space-between', alignItems: 'center' }}>
      <Text accessibilityRole="header" style={{ fontSize: 20, fontWeight: '600' }}>{`${n} ${title}`}</Text>
      {tag ? <Text style={{ fontSize: 12, fontWeight: '700', color: colors.muted }}>{tag}</Text> : null}
    </Row>
  );
}

export type LengthValue = { start: string; mode: 'end' | 'weeks'; end: string; weeks: number; endType: EndType; endTypePicked: boolean };

/** F58 Program length card. */
export function ProgramLengthCard(p: {
  value: LengthValue;
  onChange: (v: LengthValue) => void;
  /** This team's own calendar events (another team's never reach this card). */
  events: CalendarEvent[];
  isNew: boolean;
  /** The program has started: Starts is read-only ("Started Nov 30."). */
  started: boolean;
  /** A program saved before 2.4.2 (no endDate) and not changed yet. */
  rolling: boolean;
  tag?: string | null;
  todayKey: string;
  /** F57b line (phases from the calendar) or the next-phase line (F59g). */
  phaseLine?: string | null;
  calendarState?: 'loading' | 'error' | 'ok';
  onOpenCalendar?: () => void;
}) {
  const { width } = useWindowDimensions();
  const wide = width >= 900;
  const v = p.value;
  const end = v.mode === 'weeks' ? endFromWeeks(v.start, v.weeks) : v.end;
  const err = /^\d{4}-\d{2}-\d{2}$/.test(v.start) && /^\d{4}-\d{2}-\d{2}$/.test(end) ? dateError(v.start, end, p.isNew, p.todayKey) : null;
  const chips = /^\d{4}-\d{2}-\d{2}$/.test(v.start) ? endSuggestions(p.events.filter((e) => !e.teamName), v.start) : [];
  const set = (patch: Partial<LengthValue>) => p.onChange({ ...v, ...patch });
  const switchMode = (mode: 'end' | 'weeks') => {
    if (mode === v.mode) return;
    // Switching keeps the same end: 8 weeks ↔ Sun Jan 24.
    if (mode === 'end') set({ mode, end });
    else set({ mode, weeks: Math.min(52, weeksBetween(v.start, v.end || end)) });
  };
  const seg = (
    <View accessibilityRole="radiogroup" accessibilityLabel="Ends by" style={{ flexDirection: 'row', borderWidth: 1, borderColor: colors.line, borderRadius: 10, overflow: 'hidden' }}>
      {(['end', 'weeks'] as const).map((m) => {
        const on = v.mode === m && !p.rolling;
        return (
          <Pressable key={m} accessibilityRole="radio" accessibilityState={{ checked: on }} onPress={() => switchMode(m)} style={{ flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8, backgroundColor: on ? colors.primaryBg : colors.card }}>
            <Text style={{ fontSize: 14, fontWeight: on ? '700' : '400', color: on ? colors.primaryText : colors.ink }}>{m === 'end' ? 'End date' : 'Number of weeks'}</Text>
          </Pressable>
        );
      })}
    </View>
  );
  return (
    <Card style={{ gap: 10 }}>
      <SetupTitle n={1} title="Program length" tag={p.tag} />
      <View style={{ flexDirection: wide ? 'row' : 'column', gap: 12 }}>
        <View style={{ flex: wide ? 1 : undefined, gap: 6 }}>
          {p.started ? (
            <>
              <Text style={{ fontSize: 13, fontWeight: '700', color: colors.muted }}>Starts</Text>
              <Text style={{ fontSize: 16 }}>{`Started ${md(v.start)}.`}</Text>
            </>
          ) : (
            <Field label="Starts" value={v.start} onChangeText={(t) => set({ start: t })} placeholder="YYYY-MM-DD" autoCapitalize="none" maxLength={10} accessibilityLabel="Starts" />
          )}
          {!p.started && /^\d{4}-\d{2}-\d{2}$/.test(v.start) ? <Text style={{ fontSize: 13, color: colors.muted }}>{dmd(v.start)}</Text> : null}
        </View>
        <View style={{ flex: wide ? 2 : undefined, gap: 6 }}>
          <Text style={{ fontSize: 13, fontWeight: '700', color: colors.muted }}>Ends by</Text>
          {p.rolling ? (
            <Text style={{ fontSize: 13, color: colors.muted }}>No end date (rolling blocks). This program runs in 4-week blocks with no end. Pick an end to plan it.</Text>
          ) : null}
          {seg}
          {v.mode === 'end' && !p.rolling ? (
            <>
              <Field value={v.end} onChangeText={(t) => set({ end: t })} placeholder="YYYY-MM-DD" autoCapitalize="none" maxLength={10} accessibilityLabel="End date" />
              {/^\d{4}-\d{2}-\d{2}$/.test(v.end) ? <Text style={{ fontSize: 13, color: colors.muted }}>{dmd(v.end)}</Text> : null}
            </>
          ) : null}
          {v.mode === 'weeks' && !p.rolling ? (
            <Row style={{ gap: 8 }}>
              <Stepper value={v.weeks} min={1} max={52} onChange={(n) => set({ weeks: n })} />
              <Text style={{ fontSize: 15 }}>{v.weeks === 1 ? 'week' : 'weeks'}</Text>
            </Row>
          ) : null}
          {p.calendarState === 'loading' ? <Text style={{ fontSize: 13, color: colors.muted }}>Checking your calendar…</Text> : null}
          {p.calendarState === 'error' ? <Text style={{ fontSize: 13, color: colors.muted }}>Couldn&apos;t load your calendar. You can still pick an end date.</Text> : null}
          {p.calendarState !== 'loading' && p.calendarState !== 'error' && chips.length ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {chips.map((c) => {
                const on = !p.rolling && end === c.date;
                return (
                  <Pressable
                    key={c.date}
                    accessibilityRole="button"
                    accessibilityState={{ selected: on }}
                    onPress={() => set({ mode: 'end', end: c.date, ...(v.endTypePicked ? {} : { endType: 'season', endTypePicked: true }) })}
                    style={{ minHeight: 44, justifyContent: 'center', paddingHorizontal: 12, borderRadius: 22, borderWidth: 1, borderStyle: 'dashed', borderColor: on ? colors.ink : colors.muted, backgroundColor: on ? colors.raised : colors.card }}
                  >
                    <Text style={{ fontSize: 13, fontWeight: on ? '700' : '400' }}>{`${on ? '✓ ' : ''}Suggested: ${c.label}`}</Text>
                  </Pressable>
                );
              })}
            </View>
          ) : null}
          {p.calendarState !== 'loading' && p.calendarState !== 'error' && !chips.some((c) => c.kind === 'match') ? (
            <Row style={{ flexWrap: 'wrap', gap: 4 }}>
              <Text style={{ fontSize: 13, color: colors.muted }}>Add your first match in Calendar and Approach Strength can suggest an end date.</Text>
              {p.onOpenCalendar ? (
                <Text accessibilityRole="link" onPress={p.onOpenCalendar} style={{ fontSize: 13, fontWeight: '700', textDecorationLine: 'underline', minHeight: 44, paddingVertical: 12 }}>Open Calendar</Text>
              ) : null}
            </Row>
          ) : null}
        </View>
      </View>
      {!p.rolling && /^\d{4}-\d{2}-\d{2}$/.test(v.start) && /^\d{4}-\d{2}-\d{2}$/.test(end) && !err ? <Text style={{ fontSize: 13, color: colors.ink }}>{lengthLine(v.start, end)}</Text> : null}
      {err ? <Text accessibilityRole="alert" style={{ fontSize: 13, color: colors.errorText }}>{err}</Text> : null}
      {p.phaseLine ? <Text style={{ fontSize: 13, color: colors.muted }}>{p.phaseLine}</Text> : null}
      <Text style={{ fontSize: 15, fontWeight: '600', marginTop: 4 }}>What happens at the end?</Text>
      <View accessibilityRole="radiogroup" accessibilityLabel="What happens at the end?" style={{ gap: 8 }}>
        {END_TYPES.map((t) => (
          <OptionCard key={t} title={END_TYPE_TEXT[t].title} subtitle={END_TYPE_TEXT[t].line} selected={v.endType === t} onPress={() => set({ endType: t, endTypePicked: true })} />
        ))}
      </View>
    </Card>
  );
}

/** F58: the length card's end date (from either form). */
export const endOf = (v: LengthValue) => (v.mode === 'weeks' ? endFromWeeks(v.start, v.weeks) : v.end);
/** F58e: an input error that disables Build ("Fix the program dates above."). */
export function lengthError(v: LengthValue, isNew: boolean, todayKey: string): string | null {
  const end = endOf(v);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v.start) || !/^\d{4}-\d{2}-\d{2}$/.test(end)) return 'Fix the program dates above.';
  return dateError(v.start, end, isNew, todayKey) ? 'Fix the program dates above.' : null;
}

/* ---------- F59 Plan card ---------- */
const KIND_WORD: Record<Exclude<DayKind, 'off'>, string> = { room: 'Weight room', home: 'Home', mobility: 'Mobility' };
/** F59d Days column: "Weight room Tue Thu · Home Sat · Mobility Mon" (phone: "2 weight room · 1 home · 1 mobility"). */
export function daysText(kinds: DayKind[], wide: boolean, express = false): string {
  const parts = (['room', 'home', 'mobility'] as const)
    .map((k) => {
      const days = kinds.map((x, i) => (x === k ? WEEKDAYS[i] : null)).filter(Boolean) as string[];
      if (!days.length) return '';
      const base = wide ? `${KIND_WORD[k]} ${days.join(' ')}` : `${days.length} ${k === 'room' ? 'weight room' : KIND_WORD[k].toLowerCase()}`;
      return k === 'room' && express ? `${base} · Express` : base;
    })
    .filter(Boolean);
  return parts.join(' · ');
}

/** F59c markers for a row (text chips). */
export function markersOf(r: PlanRow, scheduledTests: string[]): { text: string; test?: string; scheduled?: boolean }[] {
  const out: { text: string; test?: string; scheduled?: boolean }[] = [];
  if (r.breakLabel) return [{ text: `Break · ${r.breakLabel}` }];
  if (r.deload) out.push({ text: 'Deload' });
  if (r.taper) out.push({ text: 'Taper · −30% volume' });
  if (r.restore) out.push({ text: 'Restore week' });
  const scheduled = scheduledTests.find((d) => d >= r.start && d <= r.end);
  if (scheduled) out.push({ text: `Testing day · ${dmd(scheduled)}`, test: scheduled, scheduled: true });
  else if (r.testDate) out.push({ text: `Testing day suggested · ${dmd(r.testDate)}`, test: r.testDate });
  return out;
}

export function PlanCard(p: {
  plan: Plan | null;
  input: Pick<PlanInput, 'start' | 'end' | 'endType' | 'events'> | null;
  kinds: DayKind[];
  express?: boolean;
  state: 'preview' | 'built' | 'changes' | 'error';
  /** Rows from the built plan, to tag "Changed" rows in a preview of changes. */
  builtRows?: PlanRow[] | null;
  todayKey: string;
  /** Testing days already scheduled on this team's calendar. */
  scheduledTests: string[];
  onTest?: (date: string, scheduled: boolean) => void;
  onWeek?: (row: PlanRow) => void;
  /** Rolling program (no end date): the F59a rolling line only. */
  rolling?: string | null;
}) {
  const { width } = useWindowDimensions();
  const wide = width >= 900;
  const current = p.plan?.rows.find((r) => p.todayKey >= r.start && p.todayKey <= r.end);
  const startedYet = !!p.plan && p.todayKey >= p.plan.rows[0].start;
  const [open, setOpen] = useState<boolean | null>(null);
  const isOpen = open ?? (p.state !== 'built' || !startedYet);
  const header =
    p.state === 'preview'
      ? 'Plan · Preview: not built yet'
      : p.state === 'changes'
        ? 'Plan · Preview of changes'
        : current?.block
          ? `Plan · ${blockWeekLabel(current)}`
          : `Plan · ${p.plan?.weeks ?? 0} week${p.plan?.weeks === 1 ? '' : 's'}`;
  if (p.rolling) {
    return (
      <Card>
        <Text accessibilityRole="header" style={{ fontSize: 17, fontWeight: '700' }}>Plan</Text>
        <Text style={{ fontSize: 16 }}>{p.rolling}</Text>
      </Card>
    );
  }
  const changed = (r: PlanRow) => {
    if (p.state !== 'changes' || !p.builtRows || r.end < p.todayKey) return false;
    if (r.start <= p.todayKey) return false;
    const b = p.builtRows.find((x) => x.start === r.start);
    return !b || b.block !== r.block || b.weekInBlock !== r.weekInBlock || b.blockWeeks !== r.blockWeeks || b.deload !== r.deload || b.taper !== r.taper || b.testDate !== r.testDate;
  };
  let lastPhase: string | null = null;
  return (
    <Card style={{ gap: 8 }}>
      <Pressable accessibilityRole="button" accessibilityState={{ expanded: isOpen }} onPress={() => setOpen(!isOpen)} style={{ minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text accessibilityRole="header" style={{ fontSize: 17, fontWeight: '700', flex: 1 }}>{header}</Text>
        <Text style={{ fontSize: 16, color: colors.muted }}>{isOpen ? '▴' : '▾'}</Text>
      </Pressable>
      {p.state === 'error' ? <Text style={{ fontSize: 13, color: colors.muted }}>Couldn&apos;t preview the plan. You can still build; we&apos;ll try again.</Text> : null}
      {p.plan && p.input ? (
        <View accessibilityLiveRegion={p.state === 'built' ? undefined : 'polite'}>
          <Text style={{ fontSize: 16, color: p.state === 'error' ? colors.muted : colors.ink }}>{summaryLine(p.plan, p.input)}</Text>
        </View>
      ) : null}
      {p.plan?.breaks.length ? (
        <Text style={{ fontSize: 13, color: colors.muted }}>{`Includes ${p.plan.breaks.map((b) => `${b.label}, ${rangeLabel(b.start, b.end)}`).join('; ')}.`}</Text>
      ) : null}
      {isOpen && p.plan
        ? p.plan.rows.map((r, i) => {
            const prev = p.plan!.rows[i - 1];
            const boundary = !!prev && prev.block !== r.block;
            const past = r.end < p.todayKey;
            const now = current === r;
            const marks = markersOf(r, p.scheduledTests);
            const phaseHeader = p.plan!.spans && r.phase !== lastPhase ? r.phase : null;
            lastPhase = r.phase;
            const days = r.breakLabel ? '' : daysText(p.kinds, wide, p.express);
            const blockText = r.breakLabel ? 'Paused' : blockWeekLabel(r);
            const name = `Week ${r.week}, ${rangeLabel(r.start, r.end)}, ${blockText.replace(' · ', ', ')}${marks.length ? `, ${marks.map((m) => m.text).join(', ')}` : ''}${days ? `, ${days}` : ''}`;
            const tone = past ? colors.muted : colors.ink;
            return (
              <View key={r.start}>
                {phaseHeader ? (
                  <Text style={{ fontSize: 12, fontWeight: '700', color: colors.muted, marginTop: 8, textTransform: 'uppercase' }}>
                    {phaseHeader === 'pre' && p.plan!.firstPractice
                      ? `Preseason · from ${md(p.plan!.firstPractice)} (first practice)`
                      : phaseHeader === 'in' && p.plan!.firstMatch
                        ? `In-season · from ${md(p.plan!.firstMatch)} (first match)`
                        : PHASE_NAME[phaseHeader as 'off']}
                  </Text>
                ) : null}
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${name}${now ? ', This week' : ''}`}
                  onPress={() => p.onWeek?.(r)}
                  style={{
                    minHeight: 56,
                    paddingVertical: 8,
                    paddingHorizontal: 6,
                    gap: 4,
                    borderTopWidth: 1,
                    borderTopColor: boundary ? colors.muted : colors.line,
                    backgroundColor: now ? colors.raised : 'transparent',
                    flexDirection: wide ? 'row' : 'column',
                    alignItems: wide ? 'center' : 'stretch',
                  }}
                >
                  {wide ? (
                    <>
                      <Text style={{ width: 48, fontVariant: ['tabular-nums'], color: tone }}>{`${r.week}`}</Text>
                      <Text style={{ width: 140, fontVariant: ['tabular-nums'], color: tone }}>{rangeLabel(r.start, r.end)}</Text>
                      <Text style={{ width: 220, color: tone }}>
                        <Text style={{ fontWeight: '700', color: tone }}>{r.breakLabel ? 'Paused' : r.block ? blockText.split(' · ')[0] : ''}</Text>
                        {r.block && !r.breakLabel ? ` · ${blockText.split(' · ')[1]}` : ''}
                      </Text>
                    </>
                  ) : (
                    <Row style={{ justifyContent: 'space-between' }}>
                      <Text style={{ fontWeight: '700', color: tone }}>{`${r.week} · ${rangeLabel(r.start, r.end)}`}</Text>
                      {now ? <Text style={{ fontSize: 12, fontWeight: '700' }}>This week</Text> : null}
                    </Row>
                  )}
                  {!wide ? <Text style={{ color: tone }}>{blockText}</Text> : null}
                  <View style={{ flex: wide ? 1 : undefined, flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
                    {wide && now ? <Text style={{ fontSize: 12, fontWeight: '700' }}>This week</Text> : null}
                    {marks.map((m) =>
                      m.test && p.onTest ? (
                        <Pressable key={m.text} accessibilityRole="button" accessibilityLabel={m.text} onPress={() => p.onTest!(m.test!, !!m.scheduled)} style={{ minHeight: 44, justifyContent: 'center' }}>
                          <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, borderWidth: 1, borderStyle: m.scheduled ? 'solid' : 'dotted', borderColor: colors.muted }}>
                            <Text style={{ fontSize: 12, fontWeight: '600', color: colors.muted }}>{m.text}</Text>
                          </View>
                        </Pressable>
                      ) : (
                        <StatusChip key={m.text} label={m.text} />
                      ),
                    )}
                    {changed(r) ? <Text style={{ fontSize: 12, fontWeight: '700' }}>Changed</Text> : null}
                  </View>
                  {days ? <Text style={{ flex: wide ? 1 : undefined, fontSize: 13, color: colors.muted }}>{days}</Text> : null}
                </Pressable>
              </View>
            );
          })
        : null}
    </Card>
  );
}

/** F59g "Program ended" banner (coach Team screen and builder). */
export function EndedBanner({ text, onBuild, onNotNow }: { text: string; onBuild: () => void; onNotNow: () => void }) {
  return (
    <Card style={{ borderLeftWidth: 3, borderLeftColor: colors.ink, gap: 8 }}>
      <Text accessibilityRole="text" style={{ fontSize: 15 }}>{`ⓘ ${text}`}</Text>
      <Row style={{ gap: 8, flexWrap: 'wrap' }}>
        <Button small title="Build the next one" onPress={onBuild} />
        <Button small kind="ghost" title="Not now" onPress={onNotNow} />
      </Row>
    </Card>
  );
}

/** F59g: "Not now" hides the banner for 7 days (device only). */
export const snoozeUntil = (todayKey: string) => dateKey(addDays(fromKey(todayKey), 7));
/** F59g: the Monday after the end date. */
export const mondayAfter = (endKey: string) => {
  const d = fromKey(endKey);
  return dateKey(addDays(d, 7 - weekdayOf(d)));
};
