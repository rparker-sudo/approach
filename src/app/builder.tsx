import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Body, Button, Card, Chip, ChipRow, Field, H2, Label, Screen , Row, Stepper, Text, Toggle, colors } from '../components/ui';
import { LiftDayPicker, WeekEditor } from '../components/week';
import EquipmentPicker from '../components/EquipmentPicker';
import { ALL_EQUIPMENT } from '../lib/exercises';
import { generateProgram, liftDayCap, pickLiftDays, recommendedTotal, weekSummary } from '../lib/generator';
import { LEVEL_NAME } from '../lib/athlete';
import { WEEKDAYS , EXPERIENCE, PHASES, POSITIONS } from '../lib/types';
import { useStore } from '../lib/store';
import { ALL, teamProgramId, useTeams } from '../lib/team';
import type { DayType, Equipment, Experience, Phase, ProgramPosition } from '../lib/types';
import { goBack } from '../lib/nav';
import WeekSetupCard from '../components/WeekSetupCard';
import { FLAGS } from '../lib/flags';
import { setupFromProgram, type DayKind } from '../lib/homeV3';
import { sourceOf } from '../lib/source';
import { showAlert } from '../lib/dialog';
import { addDays, dateKey, mondayOf, today as todayDate } from '../lib/calendar';
import { weekdayIndex } from '../lib/util';
import { defaultEndType, endFromWeeks, nextMonday, planTimeline, programEnded, seasonDates, weeksBetween, endedLine, md, rollingLine, planOf } from '../lib/planner';
import { EndedBanner, endOf, lengthError, mondayAfter, PlanCard, ProgramLengthCard, snoozeUntil, type LengthValue } from '../components/PlannerCards';
import { planWeek } from '../lib/generatorV3';

/** F57b: "Phases come from your calendar: off-season until Jan 4, preseason until Jan 26." */
function phasesLine(s: { firstPractice?: string; firstMatch?: string }): string {
  const parts: string[] = [];
  if (s.firstPractice) parts.push(`off-season until ${md(s.firstPractice)}`);
  if (s.firstMatch) parts.push(`${s.firstPractice ? 'preseason' : 'off-season'} until ${md(s.firstMatch)}`);
  return `Phases come from your calendar: ${parts.join(', ')}.`;
}

export default function Builder() {
  const { data } = useStore();
  if (!data.profile) return null;
  return <BuilderForm />;
}

function BuilderForm() {
  const { programId, teamId, groupKey: groupParam } = useLocalSearchParams<{ programId?: string; teamId?: string; groupKey?: string }>();
  const { data, saveProgram, setProfile, mutate } = useStore();
  const { teams, groups, members, coachExtras } = useTeams();
  const profile = data.profile!;
  const coach = profile.role === 'coach';
  const team = teams.find((t) => t.id === teamId);
  const groupKey = groupParam ?? (programId ? data.programs.find((p) => p.id === programId)?.groupKey : undefined) ?? ALL;
  const group = team ? (groups[team.id] ?? []).find((g) => g.id === groupKey) : undefined;
  const existing = data.programs.find((p) => p.id === (programId ?? (teamId ? teamProgramId(teamId, groupKey) : undefined)));
  // A position group pre-fills its position (e.g. Middles → Middle Blocker); mixed groups use All positions.
  const hintPositions = (group?.positionHint ?? '').split(',').filter(Boolean) as ProgramPosition[];
  const groupPosition: ProgramPosition = hintPositions.length === 1 ? hintPositions[0] : 'All positions';

  const [name, setName] = useState(existing?.name ?? '');
  const [position, setPosition] = useState<ProgramPosition>(existing?.position ?? (team ? groupPosition : profile.position));
  const [phase, setPhase] = useState<Phase>(existing?.phase ?? profile.phase);
  const [experience, setExperience] = useState<Experience>(existing?.experience ?? profile.experience);
  const [week, setWeekState] = useState<DayType[]>(existing?.volleyballWeek ?? profile.volleyballWeek);
  const [liftDays, setLiftDaysState] = useState<number[]>(() => {
    const cap = liftDayCap(existing?.experience ?? profile.experience, existing?.phase ?? profile.phase);
    const start = existing
      ? existing.liftSchedule.map((s, i) => (s && !existing.sessions.find((x) => x.id === s)?.mobility ? i : -1)).filter((i) => i >= 0)
      : profile.liftDays?.length
        ? profile.liftDays
        : pickLiftDays(week, Math.min(profile.liftDaysPerWeek, cap));
    // G2: plans made before the caps rebuild within them (best days kept).
    return start.length > cap ? pickLiftDays(week, cap, start) : start;
  });
  const cap = liftDayCap(experience, phase);
  // Until the user taps a day, changing the volleyball week re-suggests lift days.
  const [equipment, setEquipment] = useState<Equipment[]>(existing?.equipment ?? profile.equipment ?? ALL_EQUIPMENT);
  const [daysTouched, setDaysTouched] = useState(!!existing || !!profile.liftDays?.length);
  const setLiftDays = (d: number[]) => {
    setDaysTouched(true);
    setLiftDaysState(d);
  };
  const setWeek = (w: DayType[]) => {
    setWeekState(w);
    if (!daysTouched) setLiftDaysState(pickLiftDays(w, liftDays.length || 2));
  };
  const positionChoices: ProgramPosition[] = team || coach ? ['All positions', ...POSITIONS] : POSITIONS;
  // v2.2 pass 3 (F19a): school + home week for team programs.
  const [homeMode, setHomeMode] = useState(!!existing?.weightRoomDays);
  const [roomDays, setRoomDays] = useState<number[]>(existing?.weightRoomDays ?? [1, 3]);
  const [total, setTotal] = useState(() => (existing?.weightRoomDays ? existing.liftSchedule.filter((sid) => sid && !existing.sessions.find((x) => x.id === sid)?.light && !existing.sessions.find((x) => x.id === sid)?.mobility).length : 4));
  const [homeJumps, setHomeJumps] = useState(!!existing?.homeJumps);
  // 2.4.1 Part D (UX F56): team programs set each weekday's kind before the build.
  // Keyed on the team id (route or program) so the card restores "As built" even before the team list has loaded.
  const setupTeamId = team?.id ?? teamId ?? existing?.teamId;
  const weekSetup = !!setupTeamId && FLAGS.generatorV3 && !existing?.general;
  const asBuilt = existing && weekSetup ? setupFromProgram(existing) : null;
  const [kinds, setKinds] = useState<DayKind[]>(() => asBuilt ?? WEEKDAYS.map((_, i) => (liftDays.includes(i) ? 'room' : 'off')));
  const [sessionMinutes, setSessionMinutes] = useState<number | null>(existing?.sessionMinutes ?? null);
  const [supersets, setSupersets] = useState<boolean | null>(existing?.supersets ?? null);
  // 2.4.2 Part A (UX F57–F59): program length, plan preview, one Build. Team (volleyball) and personal programs; not trainer.
  const planner = FLAGS.plannerV3 && FLAGS.generatorV3 && !existing?.general && (weekSetup || (!team && !existing?.teamId));
  const todayKey = dateKey(todayDate());
  const ownEvents = (setupTeamId ? data.teamCalendars?.[setupTeamId]?.events ?? existing?.events ?? [] : existing?.events ?? []).filter((e) => !e.teamName);
  const initialLength = (): LengthValue => {
    const start = existing?.blockStart && existing.endDate ? existing.blockStart : existing?.blockStart && existing.blockStart >= todayKey ? existing.blockStart : nextMonday(todayDate());
    const end = existing?.endDate ?? endFromWeeks(start, 8);
    return { start, mode: existing?.endDate ? 'end' : 'weeks', end, weeks: existing?.endDate ? Math.min(52, weeksBetween(start, end)) : 8, endType: existing?.endType ?? defaultEndType(ownEvents, start), endTypePicked: !!existing?.endType };
  };
  const [length, setLengthState] = useState<LengthValue>(initialLength);
  const [lengthTouched, setLengthTouched] = useState(false);
  const setLength = (v: LengthValue) => {
    setLengthTouched(true);
    setLengthState(v);
  };
  const rolling = planner && !!existing && !existing.endDate && !lengthTouched;
  const started = planner && !!existing?.endDate && !!existing.blockStart && existing.blockStart <= todayKey;
  const season = seasonDates(ownEvents, length.start);
  const calendarPhases = planner && !!setupTeamId && !!(season.firstMatch || season.firstPractice);
  const endKey = endOf(length);
  const planInput = planner && !rolling && !lengthError(length, !existing, todayKey)
    ? { start: length.start, end: endKey, endType: length.endType, phase, events: ownEvents, liftDays: (weekSetup ? kinds.map((k, i) => (k === 'room' ? i : -1)) : liftDays).filter((i) => i >= 0) }
    : null;
  const plan = planInput ? planTimeline(planInput) : null;
  // F57b: with season dates on the calendar, each week's phase comes from the calendar; the program's phase is the first week's.
  const builtPhase: Phase = calendarPhases && plan ? plan.rows[0].phase : phase;
  const builtPlan = existing?.endDate ? planOf(existing) : null;
  const ended = planner && !!existing && programEnded(existing, todayKey);
  const busy = false;
  const [showFewer, setShowFewer] = useState(false);
  const jumpsAllowed = phase === 'off' || phase === 'pre';
  const supersetsOn = supersets ?? phase === 'in';
  const input = () => ({
    name: name || (team ? `${group ? group.name : team.name} – ${PHASES.find((p) => p.id === phase)!.label}` : ''),
    forName: team?.name,
    author: coach ? profile.name : existing?.author,
    position,
    phase,
    experience,
    volleyballWeek: week,
    liftDaysPerWeek: weekSetup ? Math.max(1, kinds.filter((k) => k === 'room' || k === 'home').length) : homeMode ? Math.min(total, cap) : liftDays.length,
    ...(weekSetup ? { kinds, homeJumps } : homeMode ? { weightRoomDays: roomDays, homeJumps } : { liftDays }),
    equipment,
    ...(supersets != null ? { supersets } : {}),
    ...(planInput ? { phase: builtPhase, start: planInput.start, endDate: planInput.end, endType: planInput.endType, planEvents: ownEvents } : {}),
  });
  const preview = team && homeMode && !weekSetup ? weekSummary(generateProgram(input())) : null;
  const fewer = team && preview?.beginners ? (members[team.id] ?? []).filter((m) => (m.level ?? 2) === 1) : [];

  // F59g: "Not now" hides the ended banner for 7 days, on this device only; "Build the next one" pre-fills a new program.
  const snoozeKey = setupTeamId ?? existing?.id ?? '';
  const snoozed = !!data.endedSnooze?.[snoozeKey] && data.endedSnooze[snoozeKey] > todayKey;
  const snooze = () => mutate((d) => ({ ...d, endedSnooze: { ...(d.endedSnooze ?? {}), [snoozeKey]: snoozeUntil(todayKey) } }));
  const [next, setNextState] = useState(false);
  const setNext = (v: boolean) => {
    setNextState(v);
    if (v && existing?.endDate) {
      const start = mondayAfter(existing.endDate);
      setLength({ start, mode: 'weeks', end: endFromWeeks(start, 8), weeks: 8, endType: defaultEndType(ownEvents, start), endTypePicked: false });
    }
  };
  const changedAny = !!existing && (lengthTouched || (asBuilt ? asBuilt.some((k, i) => k !== kinds[i]) : false) || (sessionMinutes ?? null) !== (existing.sessionMinutes ?? null));
  const buildReason = weekSetup && kinds.every((k) => k === 'off') ? 'Pick at least one day.' : planner && !rolling ? lengthError(length, !existing || next, todayKey) : null;
  const cancelChanges = () => {
    setLengthState(initialLength());
    setLengthTouched(false);
    if (asBuilt) setKinds(asBuilt);
    setSessionMinutes(existing?.sessionMinutes ?? null);
  };

  function build() {
    if (planner && existing) {
      // F57a (D-068.5): Approach Strength's sessions are rebuilt; sessions the coach edited keep their edits.
      showAlert('Rebuild from these settings?', "Approach Strength's sessions are rebuilt. Sessions you've edited keep your edits.", [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Rebuild', onPress: buildNow },
      ]);
      return;
    }
    if (weekSetup && existing) {
      showAlert('Rebuild the week from these days?', "Approach Strength's sessions are rebuilt. Sessions you've edited keep your edits.", [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Rebuild', onPress: buildNow },
      ]);
      return;
    }
    buildNow();
  }

  function buildNow() {
    const generated0 = generateProgram(input());
    // F56f / known conflict 5: on a rebuild, a session the coach edited ('coach') keeps its edits when its day keeps its kind;
    // and the change starts with the next week that hasn't started (this week's remaining days keep the old sessions).
    let generated = generated0;
    if ((weekSetup || planner) && existing) {
      const sessions = [...generated0.sessions];
      const liftSchedule = [...generated0.liftSchedule];
      const old = existing.liftSchedule;
      (weekSetup ? kinds : setupFromProgram(generated0)).forEach((k, i) => {
        const prev = existing.sessions.find((x) => x.id === old[i]);
        if (prev && (asBuilt ?? setupFromProgram(existing))[i] === k && sourceOf(existing, prev) === 'coach') {
          const replaced = liftSchedule[i];
          liftSchedule[i] = prev.id;
          if (!sessions.some((x) => x.id === prev.id)) sessions.push(prev);
          if (replaced && !liftSchedule.includes(replaced)) sessions.splice(sessions.findIndex((x) => x.id === replaced), 1);
        }
      });
      const monday = mondayOf(new Date());
      const keep: Record<string, string | null> = {};
      for (let i = weekdayIndex(new Date()); i < 7; i++) {
        const key = dateKey(addDays(monday, i));
        if (old[i] !== liftSchedule[i]) keep[key] = old[i];
      }
      for (const id of Object.values(keep)) {
        const prev = id ? existing.sessions.find((x) => x.id === id) : null;
        if (prev && !sessions.some((x) => x.id === prev.id)) sessions.push(prev);
      }
      generated = { ...generated0, sessions, liftSchedule, overrides: keep };
    }
    let program = existing ? { ...generated, id: existing.id } : generated;
    if (weekSetup) program = { ...program, ...(sessionMinutes != null ? { sessionMinutes } : { sessionMinutes: undefined }) };
    if (existing) {
      // Keep the season calendar. Date choices that pointed at old sessions go back to automatic; chosen rest days stay.
      const overrides = { ...Object.fromEntries(Object.entries(existing.overrides ?? {}).filter(([, v]) => v === null)), ...(program.overrides ?? {}) };
      program = { ...program, events: existing.events, overrides, lightDates: existing.lightDates, customExercises: existing.customExercises, minutesByWeekday: existing.minutesByWeekday, levelAdjust: existing.levelAdjust, levelAdjustOffFor: existing.levelAdjustOffFor };
    }
    if (team) {
      // The coach's working copy of the team workout. Posting sends it to the roster.
      const cal = data.teamCalendars?.[team.id];
      program = {
        ...program,
        id: teamProgramId(team.id, groupKey),
        teamId: team.id,
        teamName: team.name,
        groupKey,
        groupName: group?.name,
        postedAt: existing?.postedAt,
        unposted: true,
        events: cal?.events ?? existing?.events ?? [],
        lightDates: existing?.lightDates,
      };
    }
    if (!team && existing?.teamId) {
      // The team list hasn't loaded yet: keep the program's own team fields.
      program = { ...program, id: existing.id, teamId: existing.teamId, teamName: existing.teamName, groupKey: existing.groupKey, groupName: existing.groupName, postedAt: existing.postedAt, unposted: true, events: existing.events };
    }
    saveProgram(program, !coach);
    if (coach) setProfile({ ...profile, equipment });
    if (!coach) {
      setProfile({ ...profile, position: position === 'All positions' ? profile.position : position, phase, experience, volleyballWeek: week, liftDaysPerWeek: liftDays.length, liftDays, equipment });
    }
    goBack();
    if (coach && !existing && !team) router.push(`/program/${program.id}`);
    if (planner && plan) {
      // F57a success line (no toast component in the app; shown as a short alert).
      const perWeek = program.liftSchedule.filter(Boolean).length;
      showAlert(`Program built: ${plan.weeks} week${plan.weeks === 1 ? '' : 's'}, ${perWeek} session${perWeek === 1 ? '' : 's'} a week.`);
    }
  }

  return (
    <Screen>
      {existing && !weekSetup ? (
        <Card>
          <Body>
            Rebuilding replaces the sessions in this program with a fresh plan. Any exercise changes you made by hand will be
            lost.
          </Body>
        </Card>
      ) : null}

      <Field
        label="Program name (optional)"
        placeholder={team ? `${group ? group.name : team.name} – ${PHASES.find((p) => p.id === phase)!.label}` : `${PHASES.find((p) => p.id === phase)!.label} – ${position}`}
        value={name}
        onChangeText={setName}
      />
      {team ? (
        <Body muted>
          Building the workout for {group ? `${group.name} (${team.name})` : `${team.name} (whole team)`}. You&apos;ll post it to the roster next.
        </Body>
      ) : null}

      <Label>Position</Label>
      <ChipRow>
        {positionChoices.map((p) => (
          <Chip key={p} label={p} selected={position === p} onPress={() => setPosition(p)} />
        ))}
      </ChipRow>

      {calendarPhases ? null : (
        <>
          {/* F57b: with plannerV3 and no season dates on the team calendar, the chips stay as the whole plan's phase. */}
          <Label>{planner && setupTeamId ? 'Time of year (no season dates on your calendar)' : 'Time of year'}</Label>
          <ChipRow>
            {PHASES.map((p) => (
              <Chip key={p.id} label={p.label} selected={phase === p.id} onPress={() => setPhase(p.id)} />
            ))}
          </ChipRow>
          <Body muted style={{ fontSize: 13 }}>{PHASES.find((p) => p.id === phase)!.blurb}</Body>
          {planner && setupTeamId ? <Body muted style={{ fontSize: 13 }}>The whole plan uses this phase. Add your first practice or match in Calendar to plan by date.</Body> : null}
        </>
      )}

      <Label>Lifting experience</Label>
      <ChipRow>
        {EXPERIENCE.map((e) => (
          <Chip key={e.id} label={e.label} selected={experience === e.id} onPress={() => setExperience(e.id)} />
        ))}
      </ChipRow>

      <Card>
        <H2>Volleyball week</H2>
        <WeekEditor value={week} onChange={setWeek} />
      </Card>

      <Card>
        <H2>What&apos;s in your gym?</H2>
        <EquipmentPicker value={equipment} onChange={setEquipment} />
      </Card>

      {ended && existing?.endDate && !snoozed ? (
        <EndedBanner
          text={endedLine(team?.name ?? existing.teamName ?? existing.name, existing.endDate)}
          onBuild={() => setNext(true)}
          onNotNow={() => snooze()}
        />
      ) : null}
      {planner ? (
        <ProgramLengthCard
          value={length}
          onChange={setLength}
          events={ownEvents}
          isNew={!existing || next}
          started={started && !next}
          rolling={rolling}
          tag={next ? 'From your last program' : existing && !lengthTouched ? 'As built' : null}
          todayKey={todayKey}
          phaseLine={next ? `Next phase: ${PHASES.find((x) => x.id === builtPhase)!.label} (from your calendar).` : calendarPhases ? phasesLine(season) : null}
          onOpenCalendar={existing ? () => router.push({ pathname: '/calendar', params: { programId: existing.id } }) : undefined}
        />
      ) : null}
      {weekSetup ? (
        <WeekSetupCard
          numbered={planner}
          kinds={kinds}
          onChange={setKinds}
          asBuilt={asBuilt}
          week={week}
          events={data.teamCalendars?.[setupTeamId!]?.events ?? existing?.events ?? []}
          phase={phase}
          homeJumps={homeJumps}
          onHomeJumps={setHomeJumps}
          sessionMinutes={sessionMinutes}
          onSessionMinutes={setSessionMinutes}
          minutesByWeekday={existing?.minutesByWeekday}
          input={input()}
          otherTeamAthletes={coachExtras[setupTeamId!]?.followingOther?.length ?? 0}
          onBuild={build}
        />
      ) : null}
      {planner && weekSetup ? (
        <>
          {buildReason ? <Text style={{ fontSize: 13, color: colors.muted }}>{buildReason}</Text> : null}
          {existing && changedAny ? <Text style={{ fontSize: 13, color: colors.muted }}>Changes apply from the next week that hasn&apos;t started.</Text> : null}
          <Button large title={busy ? 'Building your program…' : existing ? (changedAny ? 'Rebuild program' : 'Rebuild program') : 'Build program'} icon="wand.and.stars" disabled={!!buildReason || busy} onPress={build} />
          {existing && changedAny ? (
            <Text accessibilityRole="button" onPress={cancelChanges} style={{ fontSize: 13, textDecorationLine: 'underline', minHeight: 44, paddingVertical: 12 }}>
              Cancel changes
            </Text>
          ) : null}
          <PlanCard
            plan={plan ?? builtPlan}
            input={planInput ?? (existing?.endDate ? { start: existing.blockStart ?? existing.createdAt.slice(0, 10), end: existing.endDate, endType: existing.endType ?? 'none', events: ownEvents } : null)}
            kinds={kinds}
            state={!existing ? 'preview' : changedAny ? 'changes' : 'built'}
            builtRows={builtPlan?.rows ?? null}
            todayKey={todayKey}
            scheduledTests={ownEvents.filter((e) => e.test).map((e) => e.date)}
            onTest={existing ? (date) => router.push({ pathname: '/calendar', params: { programId: existing.id, date } }) : undefined}
            rolling={rolling && existing?.block ? rollingLine(planWeek(existing, todayDate()).block, planWeek(existing, todayDate()).week) : null}
          />
        </>
      ) : null}
      {team && !weekSetup ? (
        <ChipRow>
          <Chip label="Weight room only" selected={!homeMode} onPress={() => setHomeMode(false)} />
          <Chip label="Weight room + home" selected={homeMode} onPress={() => setHomeMode(true)} />
        </ChipRow>
      ) : null}

      {weekSetup ? null : team && homeMode ? (
        <Card>
          <H2>Week setup</H2>
          <Label>Weight room days</Label>
          <ChipRow>
            {WEEKDAYS.map((d, i) => (
              <Chip key={d} label={d} selected={roomDays.includes(i)} onPress={() => setRoomDays(roomDays.includes(i) ? roomDays.filter((x) => x !== i) : [...roomDays, i].sort())} />
            ))}
          </ChipRow>
          <Row style={{ justifyContent: 'space-between' }}>
            <Label>Training days per week</Label>
            <Stepper value={total} min={1} max={6} onChange={setTotal} />
          </Row>
          <Button
            small
            kind="ghost"
            title="Recommend for me"
            onPress={() => setTotal(Math.min(recommendedTotal(phase, roomDays), cap))}
          />
          {total > cap ? <Text style={{ fontSize: 13, color: colors.muted }}>{`Max ${cap} full lift days for this level and time of year.`}</Text> : null}
          <Row style={{ justifyContent: 'space-between', minHeight: 44 }}>
            <Text style={{ fontSize: 15, flex: 1 }}>Jumps at home</Text>
            {/* 2.4.0 F19a: always available; the phase note is the description. */}
            <Toggle accessibilityLabel="Jumps at home" value={homeJumps} onValueChange={setHomeJumps} />
          </Row>
          <Text style={{ fontSize: 13, color: colors.muted }}>
            {`Approach Strength adds level 1 jumps (up to 20 contacts) to home sessions in off-season and preseason.${jumpsAllowed ? '' : ' Not added at this time of year.'} Athletes see: Clear space, no low ceilings, sneakers on.`}
          </Text>
          <Row style={{ justifyContent: 'space-between', minHeight: 44 }}>
            <Text style={{ fontSize: 15, flex: 1 }}>Save time with supersets</Text>
            <Toggle accessibilityLabel="Save time with supersets" value={supersetsOn} onValueChange={(v) => setSupersets(v)} />
          </Row>
          <Text style={{ fontSize: 13, color: colors.muted }}>
            {`Pairs exercises only until the session fits about ${phase === 'off' ? 60 : phase === 'pre' ? 50 : phase === 'in' ? 40 : 45} min (home: 30).`}
          </Text>
          {preview ? <Text style={{ fontSize: 16, fontWeight: '600' }}>{preview.line}</Text> : null}
          {preview?.beginners ? (
            <>
              <Text style={{ fontSize: 13 }}>{preview.beginners}</Text>
              <Text accessibilityRole="button" onPress={() => setShowFewer(!showFewer)} style={{ fontSize: 13, textDecorationLine: 'underline' }}>
                Who gets fewer days?
              </Text>
              {showFewer
                ? fewer.length
                  ? fewer.map((m) => <Text key={m.userId} style={{ fontSize: 13, color: colors.muted }}>{`${m.name} · ${LEVEL_NAME[m.level ?? 1]} · Lift-day limit for their level`}</Text>)
                  : <Text style={{ fontSize: 13, color: colors.muted }}>No beginners on the roster right now.</Text>
                : null}
            </>
          ) : null}
        </Card>
      ) : (
        <Card>
          <H2>Lift days</H2>
          <LiftDayPicker week={week} value={liftDays} onChange={setLiftDays} cap={cap} />
        </Card>
      )}

      {weekSetup ? null : <Button
        title={existing ? 'Rebuild program' : team ? 'Build team workout' : 'Build program'}
        icon="wand.and.stars"
        disabled={(homeMode ? total < 1 : liftDays.length === 0) || (planner && !rolling && !!lengthError(length, !existing, todayKey))}
        onPress={build}
      />}
      {planner && !weekSetup ? (
        <PlanCard
          plan={plan ?? builtPlan}
          input={planInput}
          kinds={WEEKDAYS.map((_, i) => (liftDays.includes(i) ? 'room' : 'off'))}
          state={!existing ? 'preview' : lengthTouched ? 'changes' : 'built'}
          builtRows={builtPlan?.rows ?? null}
          todayKey={todayKey}
          scheduledTests={[]}
          rolling={rolling && existing?.block ? rollingLine(planWeek(existing, todayDate()).block, planWeek(existing, todayDate()).week) : null}
        />
      ) : null}
    </Screen>
  );
}
